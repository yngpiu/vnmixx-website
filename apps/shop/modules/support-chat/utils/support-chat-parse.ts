const CHAT_IMAGES_START = '[chat-images]';
const CHAT_IMAGES_END = '[/chat-images]';

/** Encodes text + image URLs for `sendMessage.content` (dashboard format). */
export function buildShopSupportChatMessageContent(
  text: string,
  imageUrls: readonly string[],
): string {
  const trimmed = text.trim();
  if (imageUrls.length === 0) return trimmed;
  return `${CHAT_IMAGES_START}\n${imageUrls.join('\n')}\n${CHAT_IMAGES_END}\n${trimmed}`.trim();
}
const IMAGE_URL_PATTERN = /^(https?:\/\/|blob:|data:image\/)/i;

/** Splits stored message `content` into visible text and image URLs (dashboard format). */
export function parseShopSupportMessageContent(rawContent: string): {
  text: string;
  imageUrls: string[];
} {
  if (!rawContent.includes(CHAT_IMAGES_START)) {
    return { text: rawContent, imageUrls: [] };
  }
  const start = rawContent.indexOf(CHAT_IMAGES_START);
  const end = rawContent.indexOf(CHAT_IMAGES_END);
  if (start === -1 || end === -1 || end <= start) {
    return { text: rawContent, imageUrls: [] };
  }
  const imageBlock = rawContent
    .slice(start + CHAT_IMAGES_START.length, end)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => IMAGE_URL_PATTERN.test(line));
  const text = rawContent.slice(end + CHAT_IMAGES_END.length).trim();
  return { text, imageUrls: imageBlock };
}
