import { server$ } from '@builder.io/qwik-city';
import type { SchemaProperty, SchemaInfo, JsonSchemaOutput, VersionedSchema } from './types';
import { createNewVersion, getCurrentSchemaVersion } from './services/versioning';

// Fonction récursive pour construire un schéma de propriété
const buildPropertySchema = (prop: SchemaProperty): any => {
  const propSchema: any = {
    type: prop.type,
    description: prop.description
  };

  // Contraintes spécifiques par type
  if (prop.type === 'string') {
    if (prop.minLength !== undefined) propSchema.minLength = prop.minLength;
    if (prop.maxLength !== undefined) propSchema.maxLength = prop.maxLength;
    if (prop.format) propSchema.format = prop.format;
    if (prop.enum && prop.enum.length > 0) {
      propSchema.enum = prop.enum.filter(v => v.trim());
    }
  }

  // Gestion du type select (conversion vers JSON Schema standard)
  if (prop.type === 'select') {
    propSchema.type = 'string';
    if (prop.selectOptions && prop.selectOptions.length > 0) {
      propSchema.enum = prop.selectOptions.map(opt => opt.value);
    }
  }

  // Gestion du type jsonschema (génération $ref)
  if (prop.type === 'jsonschema') {
    if (prop.$refMetadata?.schemaName) {
      const schemaRef = prop.$refMetadata.schemaVersion
        ? `#/definitions/${prop.$refMetadata.schemaName}_v${prop.$refMetadata.schemaVersion}`
        : `#/definitions/${prop.$refMetadata.schemaName}`;

      if (prop.$refMetadata.multiple) {
        propSchema.type = 'array';
        propSchema.items = { $ref: schemaRef };
      } else {
        propSchema.$ref = schemaRef;
        delete propSchema.type;
      }
    }
  }

  if (prop.type === 'number' || prop.type === 'integer') {
    if (prop.minimum !== undefined) propSchema.minimum = prop.minimum;
    if (prop.maximum !== undefined) propSchema.maximum = prop.maximum;
  }

  // Gestion des objets imbriqués
  if (prop.type === 'object' && prop.properties && prop.properties.length > 0) {
    propSchema.properties = {};
    const required: string[] = [];

    prop.properties.forEach(childProp => {
      propSchema.properties[childProp.name] = buildPropertySchema(childProp);
      if (childProp.required) {
        required.push(childProp.name);
      }
    });

    if (required.length > 0) {
      propSchema.required = required;
    }
  }

  // Gestion des arrays
  if (prop.type === 'array' && prop.items) {
    if (prop.items.type === 'object' && prop.items.properties && prop.items.properties.length > 0) {
      propSchema.items = {
        type: 'object',
        properties: {},
        required: []
      };

      const itemRequired: string[] = [];
      prop.items.properties.forEach(itemProp => {
        propSchema.items.properties[itemProp.name] = buildPropertySchema(itemProp);
        if (itemProp.required) {
          itemRequired.push(itemProp.name);
        }
      });

      if (itemRequired.length > 0) {
        propSchema.items.required = itemRequired;
      }
    } else {
      // Array de types primitifs
      propSchema.items = {
        type: prop.items.type
      };
    }
  }

  return propSchema;
};

// Server function pour générer le JSON Schema
export const generateJsonSchema = server$(async function(
  schemaInfo: SchemaInfo, 
  properties: SchemaProperty[]
): Promise<JsonSchemaOutput> {
  const schema: JsonSchemaOutput = {
    type: schemaInfo.type,
    title: schemaInfo.title || schemaInfo.name,
    description: schemaInfo.description
  };

  if (schemaInfo.type === 'object') {
    schema.properties = {};
    const required: string[] = [];

    properties.forEach(prop => {
      schema.properties![prop.name] = buildPropertySchema(prop);
      
      if (prop.required) {
        required.push(prop.name);
      }
    });

    if (required.length > 0) {
      schema.required = required;
    }
  } else if (schemaInfo.type === 'array') {
    // Pour les arrays au niveau racine
    if (properties.length > 0) {
      schema.items = {
        type: 'object',
        properties: {},
        required: []
      };

      const itemRequired: string[] = [];
      properties.forEach(prop => {
        (schema.items as any).properties[prop.name] = buildPropertySchema(prop);
        if (prop.required) {
          itemRequired.push(prop.name);
        }
      });

      if (itemRequired.length > 0) {
        (schema.items as any).required = itemRequired;
      }
    } else {
      schema.items = {
        type: 'object',
        properties: {}
      };
    }
  }

  return schema;
});

// Server function pour valider un JSON Schema
export const validateJsonSchema = server$(async function(schema: JsonSchemaOutput): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Validation basique
  if (!schema.type) {
    errors.push('Le type de schéma est requis');
  }

  if (schema.type === 'object') {
    if (!schema.properties || Object.keys(schema.properties).length === 0) {
      errors.push('Un objet doit avoir au moins une propriété');
    }
  }

  // Vérifier que les champs required existent dans properties
  if (schema.required && schema.properties) {
    schema.required.forEach(field => {
      if (!schema.properties![field]) {
        errors.push(`Le champ requis '${field}' n'existe pas dans les propriétés`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
});

// Server function pour sauvegarder un schéma dans serverMedias/schemas avec versioning
export const saveSchema = server$(async function(
  name: string, 
  schema: JsonSchemaOutput
): Promise<{ success: boolean; message: string; version?: string }> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const schemasDir = path.join(process.cwd(), '..', 'serverMedias', 'schemas');
    const filePath = path.join(schemasDir, `${name}.json`);
    
    // Vérifier que le dossier existe
    await fs.mkdir(schemasDir, { recursive: true });
    
    // Créer une nouvelle version
    const versionResult = await createNewVersion.call(this, name, schema);
    
    if (!versionResult.success || !versionResult.versionedSchema) {
      return {
        success: false,
        message: versionResult.message
      };
    }
    
    // Sauvegarder le fichier avec la nouvelle version
    await fs.writeFile(filePath, JSON.stringify(versionResult.versionedSchema, null, 2), 'utf8');
    
    return {
      success: true,
      message: `Schéma '${name}' sauvegardé avec succès - ${versionResult.message}`,
      version: versionResult.versionedSchema.version
    };
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    return {
      success: false,
      message: `Erreur lors de la sauvegarde: ${error}`
    };
  }
});

// Server function pour mettre à jour un schéma existant avec versioning
export const updateSchema = server$(async function(
  originalId: string,
  name: string,
  schema: JsonSchemaOutput
): Promise<{ success: boolean; message: string; version?: string }> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const schemasDir = path.join(process.cwd(), '..', 'serverMedias', 'schemas');
    const originalFilePath = path.join(schemasDir, `${originalId}.json`);
    
    // Vérifier que le schéma original existe
    let originalSchema;
    try {
      await fs.access(originalFilePath);
      const content = await fs.readFile(originalFilePath, 'utf8');
      originalSchema = JSON.parse(content);
    } catch (error) {
      return {
        success: false,
        message: 'Schéma original non trouvé'
      };
    }
    
    // Si le nom a changé, créer un nouveau schéma avec versioning
    if (name !== originalId) {
      const newFilePath = path.join(schemasDir, `${name}.json`);
      
      // Vérifier que le nouveau nom n'existe pas déjà
      try {
        await fs.access(newFilePath);
        return {
          success: false,
          message: 'Un schéma avec ce nom existe déjà'
        };
      } catch (error) {
        // C'est normal que le fichier n'existe pas
      }
      
      // Créer une nouvelle version pour le nouveau nom
      const versionResult = await createNewVersion.call(this, name, schema);
      
      if (!versionResult.success || !versionResult.versionedSchema) {
        return {
          success: false,
          message: versionResult.message
        };
      }
      
      // Préserver les métadonnées de création
      versionResult.versionedSchema.createdAt = originalSchema.createdAt;
      
      await fs.writeFile(newFilePath, JSON.stringify(versionResult.versionedSchema, null, 2), 'utf8');
      
      // Supprimer l'ancien fichier
      await fs.unlink(originalFilePath);
      
      return {
        success: true,
        message: `Schéma renommé '${name}' avec succès - ${versionResult.message}`,
        version: versionResult.versionedSchema.version
      };
    } else {
      // Mettre à jour le schéma existant avec versioning
      const versionResult = await createNewVersion.call(this, name, schema);
      
      if (!versionResult.success || !versionResult.versionedSchema) {
        return {
          success: false,
          message: versionResult.message
        };
      }
      
      // Préserver les métadonnées de création
      versionResult.versionedSchema.createdAt = originalSchema.createdAt;
      
      await fs.writeFile(originalFilePath, JSON.stringify(versionResult.versionedSchema, null, 2), 'utf8');
      
      return {
        success: true,
        message: `Schéma '${name}' mis à jour avec succès - ${versionResult.message}`,
        version: versionResult.versionedSchema.version
      };
    }
  } catch (error) {
    console.error('Erreur mise à jour:', error);
    return {
      success: false,
      message: `Erreur lors de la mise à jour: ${error}`
    };
  }
});

// Server function pour charger les schémas depuis serverMedias/schemas avec informations de version
export const loadSchemas = server$(async function(): Promise<Array<{
  name: string;
  schema: JsonSchemaOutput;
  createdAt: string;
  updatedAt: string;
  version?: string;
  versionInfo?: any;
}>> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const schemasDir = path.join(process.cwd(), '..', 'serverMedias', 'schemas');
    const schemas: any[] = [];
    
    // Vérifier que le dossier existe
    try {
      const files = await fs.readdir(schemasDir);
      
      for (const file of files) {
        if (file.endsWith('.json') && !file.startsWith('.')) {
          const filePath = path.join(schemasDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const schemaData = JSON.parse(content);
          
          // Si c'est un schéma versionné
          if (schemaData.version && schemaData.versionInfo && schemaData.schema) {
            schemas.push({
              name: schemaData.name,
              schema: schemaData.schema, // schemaData.schema contient déjà type, title, description, properties, required, etc.
              createdAt: schemaData.createdAt,
              updatedAt: schemaData.updatedAt,
              version: schemaData.version,
              versionInfo: schemaData.versionInfo
            });
          } else {
            // Ancien format de schéma, le convertir
            schemas.push({
              name: schemaData.name,
              schema: {
                type: schemaData.type,
                title: schemaData.title,
                description: schemaData.description,
                properties: schemaData.properties,
                required: schemaData.required,
                additionalProperties: schemaData.additionalProperties,
                version: '1.0'
              },
              createdAt: schemaData.createdAt,
              updatedAt: schemaData.updatedAt,
              version: '1.0',
              versionInfo: {
                version: '1.0',
                createdAt: schemaData.createdAt,
                changeType: 'major',
                changeDescription: 'Version initiale (migration)'
              }
            });
          }
        }
      }
    } catch (error) {
      console.log('Dossier schemas non trouvé ou vide');
    }
    
    return schemas.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Erreur chargement schemas:', error);
    return [];
  }
});

// Server function pour supprimer un schéma et toutes ses versions
export const deleteSchema = server$(async function(
  name: string
): Promise<{ success: boolean; message: string }> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const schemasDir = path.join(process.cwd(), '..', 'serverMedias', 'schemas');
    const filePath = path.join(schemasDir, `${name}.json`);
    const versionsDir = path.join(schemasDir, 'versions', name);
    
    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      
      // Supprimer aussi le dossier des versions s'il existe
      try {
        await fs.access(versionsDir);
        await fs.rm(versionsDir, { recursive: true, force: true });
      } catch (error) {
        // Le dossier versions n'existe peut-être pas, c'est normal
      }
      
      return {
        success: true,
        message: `Schéma '${name}' et toutes ses versions supprimés avec succès`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Schéma non trouvé'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Erreur lors de la suppression: ${error}`
    };
  }
});