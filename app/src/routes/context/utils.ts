import type {
  SchemaProperty,
  SchemaInfo,
  JsonSchemaOutput,
  JsonSchemaType
} from '../types';

// ===== UTILITAIRES DE CONVERSION =====

/**
 * Convertit un JSON Schema en propriétés pour l'éditeur
 */
export const jsonSchemaToProperties = (schema: JsonSchemaOutput): SchemaProperty[] => {
  const properties: SchemaProperty[] = [];

  if (schema.type === 'object' && schema.properties) {
    const required = schema.required || [];

    Object.entries(schema.properties).forEach(([name, propSchema]) => {
      const property = parseProperty(name, propSchema, required.includes(name));
      if (property) {
        properties.push(property);
      }
    });
  } else if (schema.type === 'array' && schema.items) {
    // Pour les arrays au niveau racine
    if (typeof schema.items === 'object' && schema.items.properties) {
      const required = (schema.items as any).required || [];

      Object.entries(schema.items.properties).forEach(([name, propSchema]) => {
        const property = parseProperty(name, propSchema, required.includes(name));
        if (property) {
          properties.push(property);
        }
      });
    }
  }

  return properties;
};

/**
 * Parse une propriété individuelle du JSON Schema
 */
const parseProperty = (
  name: string,
  propSchema: any,
  isRequired: boolean = false,
  level: number = 0
): SchemaProperty | null => {
  if (!propSchema || typeof propSchema !== 'object') {
    return null;
  }

  const id = generatePropertyId();
  const type = propSchema.type as JsonSchemaType;

  if (!isValidJsonSchemaType(type)) {
    return null;
  }

  const property: SchemaProperty = {
    id,
    name,
    type,
    required: isRequired,
    description: propSchema.description || '',
    level,
    isExpanded: false
  };

  // Propriétés spécifiques aux strings
  if (type === 'string') {
    if (propSchema.minLength !== undefined) property.minLength = propSchema.minLength;
    if (propSchema.maxLength !== undefined) property.maxLength = propSchema.maxLength;
    if (propSchema.format) property.format = propSchema.format;
    if (propSchema.enum && Array.isArray(propSchema.enum)) {
      property.enum = propSchema.enum.filter(v => typeof v === 'string');
    }
  }

  // Propriétés spécifiques aux numbers/integers
  if (type === 'number' || type === 'integer') {
    if (propSchema.minimum !== undefined) property.minimum = propSchema.minimum;
    if (propSchema.maximum !== undefined) property.maximum = propSchema.maximum;
  }

  // Gestion des objets imbriqués
  if (type === 'object' && propSchema.properties) {
    property.properties = [];
    const required = propSchema.required || [];

    Object.entries(propSchema.properties).forEach(([childName, childSchema]) => {
      const childProperty = parseProperty(
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

  // Gestion des arrays
  if (type === 'array' && propSchema.items) {
    if (typeof propSchema.items === 'object') {
      property.items = {
        type: propSchema.items.type || 'string'
      };

      // Si les items sont des objets
      if (propSchema.items.type === 'object' && propSchema.items.properties) {
        property.items.properties = [];
        const itemRequired = propSchema.items.required || [];

        Object.entries(propSchema.items.properties).forEach(([itemName, itemSchema]) => {
          const itemProperty = parseProperty(
            itemName,
            itemSchema,
            itemRequired.includes(itemName),
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
 * Convertit les propriétés de l'éditeur en JSON Schema
 */
export const propertiesToJsonSchema = (
  schemaInfo: SchemaInfo,
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
      if (schema.properties) {
        schema.properties[prop.name] = buildPropertySchema(prop);
        if (prop.required) {
          required.push(prop.name);
        }
      }
    });

    if (required.length > 0) {
      schema.required = required;
    }
  } else if (schemaInfo.type === 'array') {
    schema.items = {
      type: 'object',
      properties: {},
      required: []
    };

    const itemRequired: string[] = [];
    properties.forEach(prop => {
      if (schema.items && typeof schema.items === 'object' && schema.items.properties) {
        schema.items.properties[prop.name] = buildPropertySchema(prop);
        if (prop.required) {
          itemRequired.push(prop.name);
        }
      }
    });

    if (itemRequired.length > 0 && schema.items && typeof schema.items === 'object') {
      schema.items.required = itemRequired;
    }
  }

  return schema;
};

/**
 * Construit le schéma d'une propriété individuelle
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

// ===== UTILITAIRES DE MANIPULATION =====

/**
 * Clone en profondeur un tableau de propriétés
 */
export const cloneProperties = (properties: SchemaProperty[]): SchemaProperty[] => {
  return properties.map(cloneProperty);
};

/**
 * Clone en profondeur une propriété
 */
export const cloneProperty = (property: SchemaProperty): SchemaProperty => {
  const cloned: SchemaProperty = {
    ...property,
    id: generatePropertyId() // Nouveau ID pour éviter les conflits
  };

  if (property.properties) {
    cloned.properties = property.properties.map(cloneProperty);
  }

  if (property.items && property.items.properties) {
    cloned.items = {
      ...property.items,
      properties: property.items.properties.map(cloneProperty)
    };
  }

  if (property.enum) {
    cloned.enum = [...property.enum];
  }

  return cloned;
};

/**
 * Trouve une propriété par son chemin (path)
 */
export const findPropertyByPath = (
  properties: SchemaProperty[],
  path: string[]
): SchemaProperty | null => {
  if (path.length === 0) return null;

  const [currentName, ...remainingPath] = path;
  const property = properties.find(p => p.name === currentName);

  if (!property) return null;

  if (remainingPath.length === 0) {
    return property;
  }

  if (property.properties) {
    return findPropertyByPath(property.properties, remainingPath);
  }

  if (property.items && property.items.properties) {
    return findPropertyByPath(property.items.properties, remainingPath);
  }

  return null;
};

/**
 * Trouve une propriété par son ID
 */
export const findPropertyById = (
  properties: SchemaProperty[],
  id: string
): SchemaProperty | null => {
  for (const prop of properties) {
    if (prop.id === id) return prop;

    if (prop.properties) {
      const found = findPropertyById(prop.properties, id);
      if (found) return found;
    }

    if (prop.items && prop.items.properties) {
      const found = findPropertyById(prop.items.properties, id);
      if (found) return found;
    }
  }

  return null;
};

/**
 * Obtient le chemin complet d'une propriété
 */
export const getPropertyPath = (
  properties: SchemaProperty[],
  targetId: string,
  currentPath: string[] = []
): string[] | null => {
  for (const prop of properties) {
    const newPath = [...currentPath, prop.name];

    if (prop.id === targetId) {
      return newPath;
    }

    if (prop.properties) {
      const found = getPropertyPath(prop.properties, targetId, newPath);
      if (found) return found;
    }

    if (prop.items && prop.items.properties) {
      const found = getPropertyPath(prop.items.properties, targetId, newPath);
      if (found) return found;
    }
  }

  return null;
};

// ===== UTILITAIRES DE VALIDATION =====

/**
 * Valide une propriété individuelle
 */
export const validateProperty = (property: SchemaProperty): string[] => {
  const errors: string[] = [];

  // Validation du nom
  if (!property.name || property.name.trim() === '') {
    errors.push('Le nom de la propriété est requis');
  } else if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(property.name)) {
    errors.push('Le nom de la propriété doit être un identifiant valide');
  }

  // Validation du type
  if (!isValidJsonSchemaType(property.type)) {
    errors.push('Le type de propriété est invalide');
  }

  // Validations spécifiques aux strings
  if (property.type === 'string') {
    if (property.minLength !== undefined && property.minLength < 0) {
      errors.push('La longueur minimale ne peut pas être négative');
    }
    if (property.maxLength !== undefined && property.maxLength < 0) {
      errors.push('La longueur maximale ne peut pas être négative');
    }
    if (
      property.minLength !== undefined &&
      property.maxLength !== undefined &&
      property.minLength > property.maxLength
    ) {
      errors.push('La longueur minimale ne peut pas être supérieure à la longueur maximale');
    }
  }

  // Validations spécifiques aux numbers
  if (property.type === 'number' || property.type === 'integer') {
    if (
      property.minimum !== undefined &&
      property.maximum !== undefined &&
      property.minimum > property.maximum
    ) {
      errors.push('La valeur minimale ne peut pas être supérieure à la valeur maximale');
    }
  }

  // Validation des propriétés imbriquées
  if (property.properties) {
    property.properties.forEach((childProp, index) => {
      const childErrors = validateProperty(childProp);
      childErrors.forEach(error => {
        errors.push(`Propriété ${index + 1}: ${error}`);
      });
    });
  }

  // Validation des items d'array
  if (property.items && property.items.properties) {
    property.items.properties.forEach((itemProp, index) => {
      const itemErrors = validateProperty(itemProp);
      itemErrors.forEach(error => {
        errors.push(`Item ${index + 1}: ${error}`);
      });
    });
  }

  return errors;
};

/**
 * Valide un tableau de propriétés
 */
export const validateProperties = (properties: SchemaProperty[]): string[] => {
  const errors: string[] = [];
  const nameMap = new Map<string, number>();

  // Vérifier les doublons de noms
  properties.forEach((prop, index) => {
    if (nameMap.has(prop.name)) {
      errors.push(`Nom de propriété dupliqué: '${prop.name}' (positions ${nameMap.get(prop.name)! + 1} et ${index + 1})`);
    } else {
      nameMap.set(prop.name, index);
    }

    // Valider chaque propriété
    const propErrors = validateProperty(prop);
    propErrors.forEach(error => {
      errors.push(`Propriété '${prop.name}': ${error}`);
    });
  });

  return errors;
};

// ===== UTILITAIRES D'ANALYSE =====

/**
 * Calcule la profondeur maximale de l'arbre des propriétés
 */
export const getMaxDepth = (properties: SchemaProperty[]): number => {
  let maxDepth = 0;

  const calculateDepth = (props: SchemaProperty[], depth: number = 0): void => {
    maxDepth = Math.max(maxDepth, depth);

    props.forEach(prop => {
      if (prop.properties) {
        calculateDepth(prop.properties, depth + 1);
      }
      if (prop.items && prop.items.properties) {
        calculateDepth(prop.items.properties, depth + 1);
      }
    });
  };

  calculateDepth(properties);
  return maxDepth;
};

/**
 * Compte le nombre total de propriétés (incluant les imbriquées)
 */
export const countProperties = (properties: SchemaProperty[]): number => {
  let count = properties.length;

  properties.forEach(prop => {
    if (prop.properties) {
      count += countProperties(prop.properties);
    }
    if (prop.items && prop.items.properties) {
      count += countProperties(prop.items.properties);
    }
  });

  return count;
};

/**
 * Obtient toutes les propriétés sous forme de liste plate
 */
export const flattenProperties = (properties: SchemaProperty[]): SchemaProperty[] => {
  const flattened: SchemaProperty[] = [];

  const flatten = (props: SchemaProperty[]): void => {
    props.forEach(prop => {
      flattened.push(prop);
      if (prop.properties) {
        flatten(prop.properties);
      }
      if (prop.items && prop.items.properties) {
        flatten(prop.items.properties);
      }
    });
  };

  flatten(properties);
  return flattened;
};

/**
 * Filtre les propriétés selon un prédicat
 */
export const filterProperties = (
  properties: SchemaProperty[],
  predicate: (property: SchemaProperty) => boolean
): SchemaProperty[] => {
  const filtered: SchemaProperty[] = [];

  const filter = (props: SchemaProperty[]): void => {
    props.forEach(prop => {
      if (predicate(prop)) {
        filtered.push(prop);
      }
      if (prop.properties) {
        filter(prop.properties);
      }
      if (prop.items && prop.items.properties) {
        filter(prop.items.properties);
      }
    });
  };

  filter(properties);
  return filtered;
};

// ===== UTILITAIRES DE GÉNÉRATION =====

/**
 * Génère un ID unique pour une propriété
 */
export const generatePropertyId = (): string => {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Génère une propriété vide avec des valeurs par défaut
 */
export const createEmptyProperty = (type: JsonSchemaType = 'string'): SchemaProperty => {
  return {
    id: generatePropertyId(),
    name: '',
    type,
    required: false,
    description: '',
    level: 0,
    isExpanded: false
  };
};

/**
 * Crée une propriété objet avec des propriétés enfants
 */
export const createObjectProperty = (
  name: string,
  childProperties: SchemaProperty[] = []
): SchemaProperty => {
  return {
    id: generatePropertyId(),
    name,
    type: 'object',
    required: false,
    description: '',
    level: 0,
    isExpanded: true,
    properties: childProperties
  };
};

/**
 * Crée une propriété array avec des items
 */
export const createArrayProperty = (
  name: string,
  itemType: JsonSchemaType = 'string',
  itemProperties: SchemaProperty[] = []
): SchemaProperty => {
  return {
    id: generatePropertyId(),
    name,
    type: 'array',
    required: false,
    description: '',
    level: 0,
    isExpanded: true,
    items: {
      type: itemType,
      properties: itemType === 'object' ? itemProperties : undefined
    }
  };
};

// ===== UTILITAIRES DE VÉRIFICATION =====

/**
 * Vérifie si une valeur est un type JSON Schema valide
 */
export const isValidJsonSchemaType = (type: any): type is JsonSchemaType => {
  return ['string', 'number', 'integer', 'boolean', 'array', 'object'].includes(type);
};

/**
 * Vérifie si une propriété a des enfants
 */
export const hasChildren = (property: SchemaProperty): boolean => {
  return (property.properties && property.properties.length > 0) ||
         (property.items && property.items.properties && property.items.properties.length > 0);
};

/**
 * Vérifie si une propriété est une feuille (sans enfants)
 */
export const isLeafProperty = (property: SchemaProperty): boolean => {
  return !hasChildren(property);
};

// ===== UTILITAIRES DE FORMATAGE =====

/**
 * Formate un nom de propriété pour l'affichage
 */
export const formatPropertyName = (name: string): string => {
  return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

/**
 * Génère une description automatique pour une propriété
 */
export const generatePropertyDescription = (property: SchemaProperty): string => {
  const typeName = property.type;
  const formattedName = formatPropertyName(property.name);

  let description = `${formattedName} de type ${typeName}`;

  if (property.required) {
    description += ' (requis)';
  }

  if (property.type === 'string' && property.format) {
    description += ` au format ${property.format}`;
  }

  if (property.type === 'array' && property.items) {
    description += ` contenant des éléments de type ${property.items.type}`;
  }

  return description;
};

// ===== CONSTANTES UTILITAIRES =====

export const SCHEMA_CONSTANTS = {
  MAX_PROPERTY_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_NESTING_DEPTH: 10,
  DEFAULT_STRING_MAX_LENGTH: 255,
  DEFAULT_ARRAY_MAX_ITEMS: 100
} as const;

export const PROPERTY_TYPES: JsonSchemaType[] = [
  'string',
  'number',
  'integer',
  'boolean',
  'array',
  'object'
] as const;

export const STRING_FORMATS = [
  'email',
  'date',
  'uri',
  'datetime-local'
] as const;