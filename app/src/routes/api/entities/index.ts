import { RequestHandler } from '@builder.io/qwik-city';
import { fileSystemService } from '../../services/file-system';
import { Entity } from '../../types';
// Simple UUID generator
const generateId = () => {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const onGet: RequestHandler = async ({ json, query }) => {
  try {
    const schemaId = query.get('schemaId');
    const entities = await fileSystemService.listEntities(schemaId || undefined);
    json(200, entities);
  } catch (error) {
    json(500, { error: 'Failed to load entities' });
  }
};

export const onPost: RequestHandler = async ({ json, parseBody }) => {
  try {
    const body = await parseBody();
    const now = new Date().toISOString();
    
    const entity: Entity = {
      id: generateId(),
      schemaId: body.schemaId,
      data: body.data || {},
      createdAt: now,
      updatedAt: now
    };

    await fileSystemService.saveEntity(entity);
    json(201, entity);
  } catch (error) {
    json(500, { error: 'Failed to create entity' });
  }
};