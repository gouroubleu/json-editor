import { useSignal, useStore, useVisibleTask$, $ } from '@builder.io/qwik';
import { JsonSchema, Entity } from '../types';

export const useSchemas = () => {
  const schemas = useSignal<JsonSchema[]>([]);
  const loading = useSignal(false);

  const loadSchemas = $(async () => {
    loading.value = true;
    try {
      const response = await fetch('/api/schemas');
      if (response.ok) {
        schemas.value = await response.json();
      }
    } catch (error) {
      console.error('Failed to load schemas:', error);
    } finally {
      loading.value = false;
    }
  });

  const createSchema = $(async (schemaData: Omit<JsonSchema, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schemaData)
      });
      
      if (response.ok) {
        await loadSchemas();
      }
    } catch (error) {
      console.error('Failed to create schema:', error);
    }
  });

  const updateSchema = $(async (id: string, schemaData: Partial<JsonSchema>) => {
    try {
      const response = await fetch(`/api/schemas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schemaData)
      });
      
      if (response.ok) {
        await loadSchemas();
      }
    } catch (error) {
      console.error('Failed to update schema:', error);
    }
  });

  const deleteSchema = $(async (id: string) => {
    try {
      const response = await fetch(`/api/schemas/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadSchemas();
      }
    } catch (error) {
      console.error('Failed to delete schema:', error);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    await loadSchemas();
  });

  return useStore({
    schemas: schemas.value,
    loading: loading.value,
    loadSchemas,
    createSchema,
    updateSchema,
    deleteSchema
  });
};

export const useEntities = (schemaId?: string) => {
  const entities = useSignal<Entity[]>([]);
  const loading = useSignal(false);

  const loadEntities = $(async () => {
    loading.value = true;
    try {
      const url = schemaId ? `/api/entities?schemaId=${schemaId}` : '/api/entities';
      const response = await fetch(url);
      if (response.ok) {
        entities.value = await response.json();
      }
    } catch (error) {
      console.error('Failed to load entities:', error);
    } finally {
      loading.value = false;
    }
  });

  const createEntity = $(async (entityData: Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entityData)
      });
      
      if (response.ok) {
        await loadEntities();
      }
    } catch (error) {
      console.error('Failed to create entity:', error);
    }
  });

  const updateEntity = $(async (id: string, entityData: Partial<Entity>) => {
    try {
      const response = await fetch(`/api/entities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entityData)
      });
      
      if (response.ok) {
        await loadEntities();
      }
    } catch (error) {
      console.error('Failed to update entity:', error);
    }
  });

  const deleteEntity = $(async (id: string) => {
    try {
      const response = await fetch(`/api/entities/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadEntities();
      }
    } catch (error) {
      console.error('Failed to delete entity:', error);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    await loadEntities();
  });

  return useStore({
    entities: entities.value,
    loading: loading.value,
    loadEntities,
    createEntity,
    updateEntity,
    deleteEntity
  });
};