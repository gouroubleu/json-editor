import { JsonSchema, Entity } from '../types';
import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const SCHEMAS_PATH = join(process.cwd(), 'serverMedias/schemas');
const ENTITIES_PATH = join(process.cwd(), 'serverMedias/entities');

export class FileSystemService {
  
  private async ensureDir(path: string) {
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }

  // Schema operations
  async listSchemas(): Promise<JsonSchema[]> {
    try {
      await this.ensureDir(SCHEMAS_PATH);
      const files = await readdir(SCHEMAS_PATH);
      const schemas: JsonSchema[] = [];
      
      for (const file of files.filter(f => f.endsWith('.json'))) {
        try {
          const content = await readFile(join(SCHEMAS_PATH, file), 'utf-8');
          const schema = JSON.parse(content) as JsonSchema;
          schemas.push(schema);
        } catch (error) {
          console.error(`Error reading schema ${file}:`, error);
        }
      }
      
      return schemas.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('Error listing schemas:', error);
      return [];
    }
  }

  async saveSchema(schema: JsonSchema): Promise<void> {
    try {
      await this.ensureDir(SCHEMAS_PATH);
      const filePath = join(SCHEMAS_PATH, `${schema.id}.json`);
      await writeFile(filePath, JSON.stringify(schema, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving schema:', error);
      throw new Error(`Failed to save schema: ${error}`);
    }
  }

  async deleteSchema(id: string): Promise<void> {
    try {
      const filePath = join(SCHEMAS_PATH, `${id}.json`);
      await unlink(filePath);
    } catch (error) {
      console.error('Error deleting schema:', error);
      throw new Error(`Failed to delete schema: ${error}`);
    }
  }

  // Entity operations
  async listEntities(schemaId?: string): Promise<Entity[]> {
    try {
      await this.ensureDir(ENTITIES_PATH);
      const files = await readdir(ENTITIES_PATH);
      const entities: Entity[] = [];
      
      for (const file of files.filter(f => f.endsWith('.json'))) {
        try {
          const content = await readFile(join(ENTITIES_PATH, file), 'utf-8');
          const entity = JSON.parse(content) as Entity;
          
          if (!schemaId || entity.schemaId === schemaId) {
            entities.push(entity);
          }
        } catch (error) {
          console.error(`Error reading entity ${file}:`, error);
        }
      }
      
      return entities.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('Error listing entities:', error);
      return [];
    }
  }

  async saveEntity(entity: Entity): Promise<void> {
    try {
      await this.ensureDir(ENTITIES_PATH);
      const filePath = join(ENTITIES_PATH, `${entity.id}.json`);
      await writeFile(filePath, JSON.stringify(entity, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving entity:', error);
      throw new Error(`Failed to save entity: ${error}`);
    }
  }

  async deleteEntity(id: string): Promise<void> {
    try {
      const filePath = join(ENTITIES_PATH, `${id}.json`);
      await unlink(filePath);
    } catch (error) {
      console.error('Error deleting entity:', error);
      throw new Error(`Failed to delete entity: ${error}`);
    }
  }
}

export const fileSystemService = new FileSystemService();