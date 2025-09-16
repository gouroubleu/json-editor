import { RequestHandler } from '@builder.io/qwik-city';
import { fileSystemService } from '../../../services/file-system';
import { JsonSchema } from '../../../types';

export const onGet: RequestHandler = async ({ json, params }) => {
  try {
    const schemas = await fileSystemService.listSchemas();
    const schema = schemas.find(s => s.id === params.id);
    
    if (!schema) {
      json(404, { error: 'Schema not found' });
      return;
    }
    
    json(200, schema);
  } catch (error) {
    json(500, { error: 'Failed to load schema' });
  }
};

export const onPut: RequestHandler = async ({ json, params, parseBody }) => {
  try {
    const body = await parseBody();
    const schemas = await fileSystemService.listSchemas();
    const existingSchema = schemas.find(s => s.id === params.id);
    
    if (!existingSchema) {
      json(404, { error: 'Schema not found' });
      return;
    }

    const updatedSchema: JsonSchema = {
      ...existingSchema,
      ...body,
      id: params.id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    await fileSystemService.saveSchema(updatedSchema);
    json(200, updatedSchema);
  } catch (error) {
    json(500, { error: 'Failed to update schema' });
  }
};

export const onDelete: RequestHandler = async ({ json, params }) => {
  try {
    await fileSystemService.deleteSchema(params.id);
    json(204, {});
  } catch (error) {
    json(500, { error: 'Failed to delete schema' });
  }
};