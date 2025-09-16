import { RequestHandler } from '@builder.io/qwik-city';
import { fileSystemService } from '../../../services/file-system';
import { Entity } from '../../../types';

export const onGet: RequestHandler = async ({ json, params }) => {
  try {
    const entities = await fileSystemService.listEntities();
    const entity = entities.find(e => e.id === params.id);
    
    if (!entity) {
      json(404, { error: 'Entity not found' });
      return;
    }
    
    json(200, entity);
  } catch (error) {
    json(500, { error: 'Failed to load entity' });
  }
};

export const onPut: RequestHandler = async ({ json, params, parseBody }) => {
  try {
    const body = await parseBody();
    const entities = await fileSystemService.listEntities();
    const existingEntity = entities.find(e => e.id === params.id);
    
    if (!existingEntity) {
      json(404, { error: 'Entity not found' });
      return;
    }

    const updatedEntity: Entity = {
      ...existingEntity,
      ...body,
      id: params.id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    await fileSystemService.saveEntity(updatedEntity);
    json(200, updatedEntity);
  } catch (error) {
    json(500, { error: 'Failed to update entity' });
  }
};

export const onDelete: RequestHandler = async ({ json, params }) => {
  try {
    await fileSystemService.deleteEntity(params.id);
    json(204, {});
  } catch (error) {
    json(500, { error: 'Failed to delete entity' });
  }
};