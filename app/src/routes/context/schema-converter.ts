import type { SchemaProperty, JsonSchemaOutput, JsonSchemaType } from '../types';

/**
 * Utilitaires pour convertir entre JSON Schema et SchemaProperty[]
 */

// Générer un ID unique pour les propriétés
const generateUniqueId = () => {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Convertit un JSON Schema en tableau de SchemaProperty
 */
export const jsonSchemaToProperties = (
  schema: JsonSchemaOutput,
  level = 0
): SchemaProperty[] => {
  const properties: SchemaProperty[] = [];

  if (schema.type === 'object' && schema.properties) {
    const required = schema.required || [];

    Object.entries(schema.properties).forEach(([propName, propSchema]) => {
      const property = convertPropertySchema(propName, propSchema, required.includes(propName), level);
      if (property) {
        properties.push(property);
      }
    });
  } else if (schema.type === 'array' && schema.items) {
    // Pour les arrays au niveau racine avec des objets
    if (typeof schema.items === 'object' && schema.items.type === 'object' && schema.items.properties) {
      const itemRequired = schema.items.required || [];

      Object.entries(schema.items.properties).forEach(([propName, propSchema]) => {
        const property = convertPropertySchema(propName, propSchema, itemRequired.includes(propName), level);
        if (property) {
          properties.push(property);
        }
      });
    }
  }

  return properties;
};

/**
 * Convertit une propriété de JSON Schema en SchemaProperty
 */
const convertPropertySchema = (
  name: string,
  propSchema: any,
  isRequired: boolean,
  level: number
): SchemaProperty | null => {
  if (!propSchema || typeof propSchema !== 'object') {
    return null;
  }

  const type = propSchema.type as JsonSchemaType;
  if (!isValidJsonSchemaType(type)) {
    return null;
  }

  const property: SchemaProperty = {
    id: generateUniqueId(),
    name,
    type,
    required: isRequired,
    description: propSchema.description || '',
    level,
    isExpanded: level <= 1 // Expand premier niveau par défaut
  };

  // Contraintes pour les strings
  if (type === 'string') {
    if (propSchema.minLength !== undefined) property.minLength = propSchema.minLength;
    if (propSchema.maxLength !== undefined) property.maxLength = propSchema.maxLength;
    if (propSchema.format) property.format = propSchema.format;
    if (propSchema.enum && Array.isArray(propSchema.enum)) {
      property.enum = propSchema.enum;
    }
  }

  // Contraintes pour les numbers/integers
  if (type === 'number' || type === 'integer') {
    if (propSchema.minimum !== undefined) property.minimum = propSchema.minimum;
    if (propSchema.maximum !== undefined) property.maximum = propSchema.maximum;
  }

  // Propriétés imbriquées pour objects
  if (type === 'object' && propSchema.properties) {
    const required = propSchema.required || [];
    property.properties = [];

    Object.entries(propSchema.properties).forEach(([childName, childSchema]) => {
      const childProperty = convertPropertySchema(
        childName,
        childSchema,
        required.includes(childName),
        level + 1
      );
      if (childProperty) {
        property.properties!.push(childProperty);
      }
    });
  }

  // Configuration pour arrays
  if (type === 'array' && propSchema.items) {
    if (typeof propSchema.items === 'object') {
      const itemType = propSchema.items.type as JsonSchemaType;
      property.items = {
        type: itemType
      };

      // Si l'array contient des objets
      if (itemType === 'object' && propSchema.items.properties) {
        property.items.properties = [];
        const itemRequired = propSchema.items.required || [];

        Object.entries(propSchema.items.properties).forEach(([itemPropName, itemPropSchema]) => {
          const itemProperty = convertPropertySchema(
            itemPropName,
            itemPropSchema,
            itemRequired.includes(itemPropName),
            level + 1
          );
          if (itemProperty) {
            property.items!.properties!.push(itemProperty);
          }
        });
      }
    }
  }

  return property;
};

/**
 * Vérifie si un type est un type JSON Schema valide
 */
const isValidJsonSchemaType = (type: any): type is JsonSchemaType => {
  const validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
  return validTypes.includes(type);
};

/**
 * Convertit un tableau de SchemaProperty en JSON Schema
 * (Utilise la logique existante de services.ts)
 */
export const propertiesToJsonSchema = (
  schemaInfo: { name: string; title: string; description: string; type: 'object' | 'array' },
  properties: SchemaProperty[]
): JsonSchemaOutput => {
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
};

/**
 * Fonction récursive pour construire un schéma de propriété
 * (Réutilise la logique de services.ts)
 */
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

/**
 * Utilitaire pour cloner profondément un tableau de propriétés
 */
export const cloneProperties = (properties: SchemaProperty[]): SchemaProperty[] => {
  return JSON.parse(JSON.stringify(properties));
};

/**
 * Utilitaire pour trouver une propriété par son chemin (ex: "user.address.street")
 */
export const findPropertyByPath = (
  properties: SchemaProperty[],
  path: string
): SchemaProperty | null => {
  const parts = path.split('.');
  let current = properties;
  let property: SchemaProperty | null = null;

  for (const part of parts) {
    property = current.find(p => p.name === part) || null;
    if (!property) return null;

    if (property.properties) {
      current = property.properties;
    } else if (property.items?.properties) {
      current = property.items.properties;
    } else {
      // Dernière partie du chemin
      break;
    }
  }

  return property;
};

/**
 * Utilitaire pour valider une propriété
 */
export const validateProperty = (property: SchemaProperty): string[] => {
  const errors: string[] = [];

  if (!property.name.trim()) {
    errors.push('Le nom de la propriété est requis');
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(property.name)) {
    errors.push('Le nom de la propriété doit être un identifiant valide');
  }

  if (property.type === 'string') {
    if (property.minLength !== undefined && property.maxLength !== undefined) {
      if (property.minLength > property.maxLength) {
        errors.push('La longueur minimale ne peut pas être supérieure à la longueur maximale');
      }
    }
  }

  if (property.type === 'number' || property.type === 'integer') {
    if (property.minimum !== undefined && property.maximum !== undefined) {
      if (property.minimum > property.maximum) {
        errors.push('La valeur minimale ne peut pas être supérieure à la valeur maximale');
      }
    }
  }

  if (property.type === 'object' && (!property.properties || property.properties.length === 0)) {
    errors.push('Un objet doit avoir au moins une propriété');
  }

  if (property.type === 'array' && !property.items) {
    errors.push('Un array doit définir le type de ses éléments');
  }

  return errors;
};

/**
 * Utilitaire pour calculer la profondeur maximale d'un schéma
 */
export const getMaxDepth = (properties: SchemaProperty[]): number => {
  let maxDepth = 0;

  const calculateDepth = (props: SchemaProperty[], currentDepth = 0): number => {
    let depth = currentDepth;

    for (const prop of props) {
      if (prop.properties && prop.properties.length > 0) {
        depth = Math.max(depth, calculateDepth(prop.properties, currentDepth + 1));
      }
      if (prop.items?.properties && prop.items.properties.length > 0) {
        depth = Math.max(depth, calculateDepth(prop.items.properties, currentDepth + 1));
      }
    }

    return depth;
  };

  return calculateDepth(properties);
};

/**
 * Utilitaire pour compter le nombre total de propriétés
 */
export const countProperties = (properties: SchemaProperty[]): number => {
  let count = properties.length;

  for (const prop of properties) {
    if (prop.properties) {
      count += countProperties(prop.properties);
    }
    if (prop.items?.properties) {
      count += countProperties(prop.items.properties);
    }
  }

  return count;
};