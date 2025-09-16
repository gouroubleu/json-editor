import { RequestHandler } from '@builder.io/qwik-city';
import { fileSystemService } from '../../services/file-system';
import { JsonSchema } from '../../types';
// Simple UUID generator
const generateId = () => {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const schemas = await fileSystemService.listSchemas();
    json(200, schemas);
  } catch (error) {
    json(500, { error: 'Failed to load schemas' });
  }
};

export const onPost: RequestHandler = async ({ json, parseBody }) => {
  try {
    const body = await parseBody();
    const now = new Date().toISOString();
    
    const schema: JsonSchema = {
      id: generateId(),
      name: body.name,
      title: body.title,
      description: body.description,
      type: body.type || 'object',
      properties: body.properties || {},
      required: body.required || [],
      additionalProperties: body.additionalProperties ?? true,
      createdAt: now,
      updatedAt: now
    };

    await fileSystemService.saveSchema(schema);
    json(201, schema);
  } catch (error) {
    json(500, { error: 'Failed to create schema' });
  }
};