import { server$ } from '@builder.io/qwik-city';
import type { 
  EntityData, 
  EntitySummary, 
  EntityListResponse,
  EntityFilters,
  CreateEntityRequest,
  UpdateEntityRequest,
  EntityValidationResult
} from './types';
import { loadSchemas } from '../services';

// Utilitaire pour générer un ID unique
const generateEntityId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `entity_${timestamp}_${randomStr}`;
};

// Utilitaire pour générer les valeurs par défaut d'un schéma JSON Schema
export const generateDefaultValue = (schema: any): any => {
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  // Si une valeur par défaut est définie dans le schéma, l'utiliser
  if (schema.hasOwnProperty('default')) {
    return schema.default;
  }

  // Si un enum est défini, utiliser la première valeur
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  // Générer selon le type
  switch (schema.type) {
    case 'string':
      return '';
    
    case 'number':
    case 'integer':
      // Si une valeur minimum est définie, l'utiliser, sinon 0
      return schema.minimum !== undefined ? schema.minimum : 0;
    
    case 'boolean':
      return false;
    
    case 'array':
      // Retourner un tableau vide par défaut
      return [];
    
    case 'object':
      // Générer un objet avec toutes les propriétés par défaut
      const defaultObject: Record<string, any> = {};
      
      if (schema.properties && typeof schema.properties === 'object') {
        // Générer les valeurs pour toutes les propriétés définies
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          defaultObject[propName] = generateDefaultValue(propSchema);
        }
      }
      
      return defaultObject;
    
    case null:
    case undefined:
      // Si le type n'est pas défini, essayer de déduire à partir des propriétés
      if (schema.properties) {
        return generateDefaultValue({ ...schema, type: 'object' });
      }
      if (schema.items) {
        return generateDefaultValue({ ...schema, type: 'array' });
      }
      return null;
    
    default:
      // Type non reconnu
      return null;
  }
};

// Utilitaire pour valider une entité contre son schéma
const validateEntityData = (data: Record<string, any>, schema: any): EntityValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validation basique des champs requis
  if (schema.required && Array.isArray(schema.required)) {
    for (const requiredField of schema.required) {
      if (!data.hasOwnProperty(requiredField) || data[requiredField] === null || data[requiredField] === undefined) {
        errors.push(`Le champ '${requiredField}' est requis`);
      }
    }
  }

  // Validation des types de propriétés
  if (schema.properties) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      const fieldDef = fieldSchema as any;
      const value = data[fieldName];

      if (value !== null && value !== undefined) {
        // Validation du type
        const expectedType = fieldDef.type;
        const actualType = typeof value;

        switch (expectedType) {
          case 'string':
            if (actualType !== 'string') {
              errors.push(`Le champ '${fieldName}' doit être une chaîne de caractères`);
            } else {
              // Validation des contraintes string
              if (fieldDef.minLength && value.length < fieldDef.minLength) {
                errors.push(`Le champ '${fieldName}' doit contenir au moins ${fieldDef.minLength} caractères`);
              }
              if (fieldDef.maxLength && value.length > fieldDef.maxLength) {
                errors.push(`Le champ '${fieldName}' ne peut pas dépasser ${fieldDef.maxLength} caractères`);
              }
              if (fieldDef.enum && !fieldDef.enum.includes(value)) {
                errors.push(`Le champ '${fieldName}' doit être l'une des valeurs: ${fieldDef.enum.join(', ')}`);
              }
            }
            break;
          case 'number':
          case 'integer':
            if (actualType !== 'number' || (expectedType === 'integer' && !Number.isInteger(value))) {
              errors.push(`Le champ '${fieldName}' doit être un ${expectedType === 'integer' ? 'entier' : 'nombre'}`);
            } else {
              if (fieldDef.minimum !== undefined && value < fieldDef.minimum) {
                errors.push(`Le champ '${fieldName}' doit être supérieur ou égal à ${fieldDef.minimum}`);
              }
              if (fieldDef.maximum !== undefined && value > fieldDef.maximum) {
                errors.push(`Le champ '${fieldName}' doit être inférieur ou égal à ${fieldDef.maximum}`);
              }
            }
            break;
          case 'boolean':
            if (actualType !== 'boolean') {
              errors.push(`Le champ '${fieldName}' doit être un booléen (true/false)`);
            }
            break;
          case 'array':
            if (!Array.isArray(value)) {
              errors.push(`Le champ '${fieldName}' doit être un tableau`);
            }
            break;
          case 'object':
            if (actualType !== 'object' || Array.isArray(value)) {
              errors.push(`Le champ '${fieldName}' doit être un objet`);
            }
            break;
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Server function pour obtenir le résumé de toutes les entités par schéma
export const getEntitiesSummary = server$(async function(): Promise<EntitySummary[]> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const entitiesDir = path.join(process.cwd(), 'serverMedias', 'entities');
    const summaries: EntitySummary[] = [];
    
    // Charger les schémas disponibles
    const schemas = await loadSchemas.call(this);
    
    // Créer le dossier entities s'il n'existe pas
    await fs.mkdir(entitiesDir, { recursive: true });
    
    // Pour chaque schéma, analyser les entités
    for (const schemaInfo of schemas) {
      const schemaName = schemaInfo.name;
      const schemaEntitiesDir = path.join(entitiesDir, schemaName);
      
      let totalEntities = 0;
      const entitiesByVersion: Record<string, number> = {};
      let outdatedEntities = 0;
      
      try {
        const entityFiles = await fs.readdir(schemaEntitiesDir);
        
        for (const file of entityFiles) {
          if (file.endsWith('.json')) {
            try {
              const entityFilePath = path.join(schemaEntitiesDir, file);
              const entityContent = await fs.readFile(entityFilePath, 'utf8');
              const entity: EntityData = JSON.parse(entityContent);
              
              totalEntities++;
              entitiesByVersion[entity.version] = (entitiesByVersion[entity.version] || 0) + 1;
              
              if (entity.version !== schemaInfo.version) {
                outdatedEntities++;
              }
            } catch (error) {
              console.error(`Erreur lecture entité ${file}:`, error);
            }
          }
        }
      } catch (error) {
        // Dossier n'existe pas encore pour ce schéma
      }
      
      summaries.push({
        schemaName,
        schemaTitle: schemaInfo.schema.title,
        schemaDescription: schemaInfo.schema.description,
        currentSchemaVersion: schemaInfo.version || '1.0',
        totalEntities,
        entitiesByVersion,
        outdatedEntities,
        canAutoMigrate: outdatedEntities > 0 && totalEntities < 1000 // Limitation sécurité
      });
    }
    
    return summaries.sort((a, b) => b.totalEntities - a.totalEntities);
    
  } catch (error) {
    console.error('Erreur récupération résumé entités:', error);
    return [];
  }
});

// Server function pour lister les entités avec filtres
export const listEntities = server$(async function(filters: EntityFilters = {}): Promise<EntityListResponse> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const entitiesDir = path.join(process.cwd(), 'serverMedias', 'entities');
    const entities: EntityData[] = [];
    
    const { schemaName, version, search, limit = 50, offset = 0 } = filters;
    
    if (schemaName) {
      // Lister les entités d'un schéma spécifique
      const schemaEntitiesDir = path.join(entitiesDir, schemaName);
      
      try {
        const entityFiles = await fs.readdir(schemaEntitiesDir);
        
        for (const file of entityFiles) {
          if (file.endsWith('.json')) {
            try {
              const entityFilePath = path.join(schemaEntitiesDir, file);
              const entityContent = await fs.readFile(entityFilePath, 'utf8');
              const entity: EntityData = JSON.parse(entityContent);
              
              // Appliquer les filtres
              if (version && entity.version !== version) continue;
              if (search && !JSON.stringify(entity.data).toLowerCase().includes(search.toLowerCase())) continue;
              
              entities.push(entity);
            } catch (error) {
              console.error(`Erreur lecture entité ${file}:`, error);
            }
          }
        }
      } catch (error) {
        // Dossier n'existe pas
      }
    } else {
      // Lister toutes les entités de tous les schémas
      try {
        const schemaDirs = await fs.readdir(entitiesDir, { withFileTypes: true });
        
        for (const schemaDir of schemaDirs) {
          if (schemaDir.isDirectory()) {
            const schemaEntitiesDir = path.join(entitiesDir, schemaDir.name);
            const entityFiles = await fs.readdir(schemaEntitiesDir);
            
            for (const file of entityFiles) {
              if (file.endsWith('.json')) {
                try {
                  const entityFilePath = path.join(schemaEntitiesDir, file);
                  const entityContent = await fs.readFile(entityFilePath, 'utf8');
                  const entity: EntityData = JSON.parse(entityContent);
                  
                  // Appliquer les filtres
                  if (version && entity.version !== version) continue;
                  if (search && !JSON.stringify(entity.data).toLowerCase().includes(search.toLowerCase())) continue;
                  
                  entities.push(entity);
                } catch (error) {
                  console.error(`Erreur lecture entité ${file}:`, error);
                }
              }
            }
          }
        }
      } catch (error) {
        // Dossier entities n'existe pas
      }
    }
    
    // Trier par date de mise à jour (plus récent en premier)
    entities.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    // Pagination
    const totalCount = entities.length;
    const paginatedEntities = entities.slice(offset, offset + limit);
    
    return {
      entities: paginatedEntities,
      totalCount,
      hasMore: offset + limit < totalCount
    };
    
  } catch (error) {
    console.error('Erreur listage entités:', error);
    return { entities: [], totalCount: 0, hasMore: false };
  }
});

// Server function pour créer une nouvelle entité
export const createEntity = server$(async function(request: CreateEntityRequest): Promise<{ success: boolean; message: string; entityId?: string }> {
  try {
    console.log('🔧 DEBUG SERVER - createEntity appelé avec:', {
      schemaName: request.schemaName,
      data: request.data,
      hasData: Object.keys(request.data).length > 0
    });

    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Charger le schéma correspondant
    const schemas = await loadSchemas.call(this);
    const schema = schemas.find(s => s.name === request.schemaName);
    
    console.log('🔧 DEBUG SERVER - Schéma trouvé:', schema ? 'OUI' : 'NON');
    
    if (!schema) {
      return { success: false, message: `Schéma '${request.schemaName}' introuvable` };
    }
    
    // Générer les données par défaut si aucune donnée n'est fournie ou si les données sont vides
    let entityData = request.data;
    if (!entityData || Object.keys(entityData).length === 0) {
      console.log('🔧 DEBUG SERVER - Génération des valeurs par défaut pour le schéma:', schema.schema);
      entityData = generateDefaultValue(schema.schema);
      console.log('🔧 DEBUG SERVER - Valeurs par défaut générées:', entityData);
    }
    
    // Valider les données contre le schéma
    const validation = validateEntityData(entityData, schema.schema);
    console.log('🔧 DEBUG SERVER - Validation:', {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings
    });
    
    if (!validation.isValid) {
      return { success: false, message: `Données invalides: ${validation.errors.join(', ')}` };
    }
    
    // Créer l'entité
    const entityId = generateEntityId();
    const now = new Date().toISOString();
    
    const entity: EntityData = {
      id: entityId,
      version: schema.version || '1.0',
      schemaName: request.schemaName,
      data: entityData,
      createdAt: now,
      updatedAt: now
    };
    
    // Créer le dossier du schéma s'il n'existe pas
    const entitiesDir = path.join(process.cwd(), 'serverMedias', 'entities');
    const schemaEntitiesDir = path.join(entitiesDir, request.schemaName);
    await fs.mkdir(schemaEntitiesDir, { recursive: true });
    
    // Sauvegarder l'entité
    const entityFilePath = path.join(schemaEntitiesDir, `${entityId}.json`);
    await fs.writeFile(entityFilePath, JSON.stringify(entity, null, 2), 'utf8');
    
    return { success: true, message: 'Entité créée avec succès', entityId };
    
  } catch (error) {
    console.error('Erreur création entité:', error);
    return { success: false, message: `Erreur lors de la création: ${error}` };
  }
});

// Server function pour récupérer une entité par ID
export const getEntity = server$(async function(entityId: string): Promise<EntityData | null> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const entitiesDir = path.join(process.cwd(), 'serverMedias', 'entities');
    
    // Chercher dans tous les dossiers de schémas
    const schemaDirs = await fs.readdir(entitiesDir, { withFileTypes: true });
    
    for (const schemaDir of schemaDirs) {
      if (schemaDir.isDirectory()) {
        const entityFilePath = path.join(entitiesDir, schemaDir.name, `${entityId}.json`);
        
        try {
          await fs.access(entityFilePath);
          const entityContent = await fs.readFile(entityFilePath, 'utf8');
          return JSON.parse(entityContent);
        } catch (error) {
          // Continuer la recherche
        }
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Erreur récupération entité:', error);
    return null;
  }
});

// Server function pour mettre à jour une entité
export const updateEntity = server$(async function(entityId: string, request: UpdateEntityRequest): Promise<{ success: boolean; message: string }> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Récupérer l'entité existante
    const existingEntity = await getEntity.call(this, entityId);
    if (!existingEntity) {
      return { success: false, message: 'Entité introuvable' };
    }
    
    // Charger le schéma
    const schemas = await loadSchemas.call(this);
    const schema = schemas.find(s => s.name === existingEntity.schemaName);
    
    if (!schema) {
      return { success: false, message: `Schéma '${existingEntity.schemaName}' introuvable` };
    }
    
    // Déterminer la version à utiliser
    const targetVersion = request.updateVersion ? (schema.version || '1.0') : existingEntity.version;
    
    // Valider les données contre le schéma
    const validation = validateEntityData(request.data, schema.schema);
    if (!validation.isValid) {
      return { success: false, message: `Données invalides: ${validation.errors.join(', ')}` };
    }
    
    // Mettre à jour l'entité
    const updatedEntity: EntityData = {
      ...existingEntity,
      data: request.data,
      version: targetVersion,
      updatedAt: new Date().toISOString()
    };
    
    // Sauvegarder
    const entitiesDir = path.join(process.cwd(), 'serverMedias', 'entities');
    const entityFilePath = path.join(entitiesDir, existingEntity.schemaName, `${entityId}.json`);
    await fs.writeFile(entityFilePath, JSON.stringify(updatedEntity, null, 2), 'utf8');
    
    return { success: true, message: 'Entité mise à jour avec succès' };
    
  } catch (error) {
    console.error('Erreur mise à jour entité:', error);
    return { success: false, message: `Erreur lors de la mise à jour: ${error}` };
  }
});

// Server function pour migrer les entités d'un schéma vers une nouvelle version
export const migrateSchemaEntities = server$(async function(schemaName: string): Promise<{ success: boolean; message: string; migratedCount?: number }> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Charger le schéma courant
    const schemas = await loadSchemas.call(this);
    const schema = schemas.find(s => s.name === schemaName);
    
    if (!schema) {
      return { success: false, message: `Schéma '${schemaName}' introuvable` };
    }
    
    const currentVersion = schema.version || '1.0';
    const entitiesDir = path.join(process.cwd(), 'serverMedias', 'entities');
    const schemaEntitiesDir = path.join(entitiesDir, schemaName);
    
    let migratedCount = 0;
    
    try {
      const entityFiles = await fs.readdir(schemaEntitiesDir);
      
      for (const file of entityFiles) {
        if (file.endsWith('.json')) {
          try {
            const entityFilePath = path.join(schemaEntitiesDir, file);
            const entityContent = await fs.readFile(entityFilePath, 'utf8');
            const entity: EntityData = JSON.parse(entityContent);
            
            // Migrer seulement si la version est différente
            if (entity.version !== currentVersion) {
              // Valider les données actuelles contre le nouveau schéma
              const validation = validateEntityData(entity.data, schema.schema);
              
              if (validation.isValid) {
                // Mettre à jour la version
                entity.version = currentVersion;
                entity.updatedAt = new Date().toISOString();
                
                // Sauvegarder l'entité mise à jour
                await fs.writeFile(entityFilePath, JSON.stringify(entity, null, 2), 'utf8');
                migratedCount++;
              } else {
                console.warn(`Impossible de migrer l'entité ${entity.id}: ${validation.errors.join(', ')}`);
              }
            }
          } catch (error) {
            console.error(`Erreur migration entité ${file}:`, error);
          }
        }
      }
      
      return { 
        success: true, 
        message: `Migration terminée: ${migratedCount} entité(s) migrée(s)`,
        migratedCount 
      };
      
    } catch (error) {
      return { success: false, message: `Aucune entité trouvée pour le schéma '${schemaName}'` };
    }
    
  } catch (error) {
    console.error('Erreur migration entités:', error);
    return { success: false, message: `Erreur lors de la migration: ${error}` };
  }
});

// Server function pour supprimer une entité
export const deleteEntity = server$(async function(entityId: string): Promise<{ success: boolean; message: string }> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const entitiesDir = path.join(process.cwd(), 'serverMedias', 'entities');
    
    // Chercher et supprimer dans tous les dossiers de schémas
    const schemaDirs = await fs.readdir(entitiesDir, { withFileTypes: true });
    
    for (const schemaDir of schemaDirs) {
      if (schemaDir.isDirectory()) {
        const entityFilePath = path.join(entitiesDir, schemaDir.name, `${entityId}.json`);
        
        try {
          await fs.access(entityFilePath);
          await fs.unlink(entityFilePath);
          return { success: true, message: 'Entité supprimée avec succès' };
        } catch (error) {
          // Continuer la recherche
        }
      }
    }
    
    return { success: false, message: 'Entité introuvable' };
    
  } catch (error) {
    console.error('Erreur suppression entité:', error);
    return { success: false, message: `Erreur lors de la suppression: ${error}` };
  }
});