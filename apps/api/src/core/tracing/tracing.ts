/* eslint-disable */
import { Logger } from '@nestjs/common';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const logger = new Logger('OpenTelemetry');

const isTest = process.env.NODE_ENV === 'test';

let sdk: NodeSDK;

if (isTest) {
  // Mock SDK for tests
  sdk = {
    start: () => {
      logger.log('Mock SDK started');
    },
    shutdown: () => {
      logger.log('Mock SDK shut down');
      return Promise.resolve();
    },
  } as unknown as NodeSDK;
} else {
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

  // Using any cast for external library constructors that might have ESM issues in some environments
  const TraceExporter = OTLPTraceExporter as any;
  const traceExporter = new TraceExporter({
    url: otlpEndpoint,
  });

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'vnmixx-api',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
  });

  // Graceful shutdown only for real SDK
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(
        () => logger.log('SDK shut down successfully'),
        (err: unknown) => logger.error('Error shutting down SDK', err),
      )
      .finally(() => process.exit(0));
  });
}

export const otelSDK = sdk;
