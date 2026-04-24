import type {
  ReferenceObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

type DataSchema = SchemaObject | ReferenceObject;

export function buildSuccessResponseSchema(
  dataSchema: DataSchema,
  options?: { messageExample?: string; includeMeta?: boolean },
): SchemaObject {
  const includeMeta = options?.includeMeta ?? false;

  return {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: options?.messageExample ?? 'Success' },
      data: dataSchema,
      ...(includeMeta
        ? {
            meta: {
              type: 'object',
              additionalProperties: true,
            },
          }
        : {}),
    },
    required: includeMeta ? ['success', 'message', 'data', 'meta'] : ['success', 'message', 'data'],
  };
}

export function buildNullDataSuccessResponseSchema(messageExample = 'Success'): SchemaObject {
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: messageExample },
    },
    required: ['success', 'message'],
  };
}

export function errorResponseSchema(messageExample: string): SchemaObject {
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      statusCode: { type: 'number', example: 400 },
      message: {
        oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        example: messageExample,
      },
      code: { type: 'string', example: 'BAD_REQUEST' },
    },
    required: ['success', 'statusCode', 'message', 'code'],
  };
}
