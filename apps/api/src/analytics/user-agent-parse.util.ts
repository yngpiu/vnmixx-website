import { UAParser } from 'ua-parser-js';

const MAX_STORE = 64;

function truncate(value: string, max: number): string {
  const t = value.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export type ParsedUserAgentFields = {
  device: string;
  os: string | null;
  browser: string | null;
};

/**
 * Maps ua-parser device types to dashboard buckets: mobile | tablet | desktop | unknown.
 */
export function parseUserAgentString(userAgent: string | undefined): ParsedUserAgentFields {
  if (userAgent === undefined || userAgent.trim() === '') {
    return { device: 'unknown', os: null, browser: null };
  }
  const parser = new UAParser(userAgent);
  const deviceType = parser.getDevice().type;
  let device: string;
  if (deviceType === 'mobile') {
    device = 'mobile';
  } else if (deviceType === 'tablet') {
    device = 'tablet';
  } else if (deviceType === undefined) {
    device = 'desktop';
  } else {
    device = 'unknown';
  }
  const osRaw = parser.getOS();
  const browserRaw = parser.getBrowser();
  const osName = osRaw.name
    ? `${osRaw.name}${osRaw.version ? ` ${osRaw.version}` : ''}`.trim()
    : null;
  const browserName = browserRaw.name
    ? `${browserRaw.name}${browserRaw.version ? ` ${browserRaw.version}` : ''}`.trim()
    : null;
  return {
    device,
    os: osName ? truncate(osName, MAX_STORE) : null,
    browser: browserName ? truncate(browserName, MAX_STORE) : null,
  };
}
