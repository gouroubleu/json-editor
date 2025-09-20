import type { SchemaProperty, JsonSchemaType, SelectOption } from './types';

// Génère un ID unique pour une propriété
export const generatePropertyId = (): string => {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Ajoute les IDs manquants aux propriétés existantes de manière récursive
export const ensureAllPropertyIds = (props: SchemaProperty[]): void => {
  props.forEach(prop => {
    if (!prop.id) {
      prop.id = generatePropertyId();
    }
    if (prop.properties) {
      ensureAllPropertyIds(prop.properties);
    }
    if (prop.items?.properties) {
      ensureAllPropertyIds(prop.items.properties);
    }
  });
};

// Crée une nouvelle propriété avec des valeurs par défaut
export const createNewProperty = (
  name: string = '',
  type: JsonSchemaType = 'string',
  level: number = 0
): SchemaProperty => {
  const property: SchemaProperty = {
    id: generatePropertyId(),
    name,
    type,
    required: false,
    description: '',
    level,
    isExpanded: false
  };

  // Initialiser les propriétés imbriquées si c'est un object
  if (type === 'object') {
    property.properties = [];
    property.isExpanded = true; // Expandu par défaut pour les nouveaux objets
  }

  // Initialiser la configuration des items si c'est un array
  if (type === 'array') {
    property.items = {
      type: 'string',
      properties: []
    };
    property.isExpanded = true; // Expandu par défaut pour les nouveaux arrays
  }

  // Initialiser les options par défaut pour le type select
  if (type === 'select') {
    property.selectOptions = [
      { key: 'option1', value: 'Option 1' },
      { key: 'option2', value: 'Option 2' }
    ];
  }

  // Initialiser les métadonnées de référence pour le type jsonschema
  if (type === 'jsonschema') {
    property.$refMetadata = {
      schemaName: '',
      title: '',
      multiple: false
    };
  }

  return property;
};

// Trouve une propriété par son ID dans l'arbre
export const findPropertyById = (
  properties: SchemaProperty[],
  id: string
): SchemaProperty | null => {
  for (const property of properties) {
    if (property.id === id) {
      return property;
    }
    
    // Rechercher dans les propriétés imbriquées (objects)
    if (property.properties) {
      const found = findPropertyById(property.properties, id);
      if (found) return found;
    }
    
    // Rechercher dans les propriétés des items (arrays d'objets)
    if (property.items?.properties) {
      const found = findPropertyById(property.items.properties, id);
      if (found) return found;
    }
  }
  
  return null;
};

// Ajoute une propriété à un parent spécifique
export const addPropertyToParent = (
  properties: SchemaProperty[],
  parentId: string | null,
  newProperty: SchemaProperty
): boolean => {
  if (!parentId) {
    // Ajouter au niveau racine
    properties.push(newProperty);
    return true;
  }

  const parent = findPropertyById(properties, parentId);
  if (!parent) return false;

  if (parent.type === 'object' && parent.properties) {
    newProperty.level = (parent.level || 0) + 1;
    parent.properties.push(newProperty);
    return true;
  }

  if (parent.type === 'array' && parent.items) {
    if (!parent.items.properties) {
      parent.items.properties = [];
    }
    newProperty.level = (parent.level || 0) + 1;
    parent.items.properties.push(newProperty);
    return true;
  }

  return false;
};

// Supprime une propriété par son ID
export const removePropertyById = (
  properties: SchemaProperty[],
  id: string
): boolean => {
  // Rechercher au niveau racine
  const index = properties.findIndex(p => p.id === id);
  if (index !== -1) {
    properties.splice(index, 1);
    return true;
  }

  // Rechercher récursivement
  for (const property of properties) {
    // Dans les propriétés d'objects
    if (property.properties) {
      const childIndex = property.properties.findIndex(p => p.id === id);
      if (childIndex !== -1) {
        property.properties.splice(childIndex, 1);
        return true;
      }
      if (removePropertyById(property.properties, id)) {
        return true;
      }
    }

    // Dans les propriétés d'items d'arrays
    if (property.items?.properties) {
      const itemIndex = property.items.properties.findIndex(p => p.id === id);
      if (itemIndex !== -1) {
        property.items.properties.splice(itemIndex, 1);
        return true;
      }
      if (removePropertyById(property.items.properties, id)) {
        return true;
      }
    }
  }

  return false;
};

// Toggle l'état expanded d'une propriété
export const togglePropertyExpanded = (
  properties: SchemaProperty[],
  id: string
): boolean => {
  const property = findPropertyById(properties, id);
  if (property && (property.type === 'object' || property.type === 'array')) {
    property.isExpanded = !property.isExpanded;
    return true;
  }
  return false;
};

// Convertit l'arbre de propriétés en liste plate pour l'affichage
export const flattenPropertiesForDisplay = (
  properties: SchemaProperty[],
  level: number = 0
): Array<SchemaProperty & { canAddChild: boolean; hasChildren: boolean }> => {
  const result: Array<SchemaProperty & { canAddChild: boolean; hasChildren: boolean }> = [];

  for (const property of properties) {
    const hasChildren = (property.type === 'object' && property.properties && property.properties.length > 0) ||
                       (property.type === 'array' && property.items?.properties && property.items.properties.length > 0);
    
    const canAddChild = property.type === 'object' || property.type === 'array';

    result.push({
      ...property,
      level,
      canAddChild,
      hasChildren
    });

    // Ajouter les enfants si expandé
    if (property.isExpanded) {
      if (property.type === 'object' && property.properties) {
        result.push(...flattenPropertiesForDisplay(property.properties, level + 1));
      } else if (property.type === 'array' && property.items?.properties) {
        // Pour les arrays, afficher les propriétés des items
        result.push(...flattenPropertiesForDisplay(property.items.properties, level + 1));
      }
    }
  }

  return result;
};

// Valide qu'un nom de propriété est unique dans son contexte
export const validatePropertyNameInContext = (
  properties: SchemaProperty[],
  parentId: string | null,
  name: string,
  excludeId?: string
): { isValid: boolean; error: string } => {
  if (!name.trim()) {
    return { isValid: false, error: 'Le nom est requis' };
  }
  
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name.trim())) {
    return { 
      isValid: false, 
      error: 'Le nom doit commencer par une lettre et contenir seulement des lettres, chiffres et underscores' 
    };
  }

  let targetProperties: SchemaProperty[];
  
  if (!parentId) {
    // Niveau racine
    targetProperties = properties;
  } else {
    const parent = findPropertyById(properties, parentId);
    if (!parent) {
      return { isValid: false, error: 'Parent non trouvé' };
    }
    
    if (parent.type === 'object' && parent.properties) {
      targetProperties = parent.properties;
    } else if (parent.type === 'array' && parent.items?.properties) {
      targetProperties = parent.items.properties;
    } else {
      return { isValid: false, error: 'Le parent ne peut pas avoir de propriétés enfants' };
    }
  }

  const exists = targetProperties.some(prop => 
    prop.name === name.trim() && prop.id !== excludeId
  );
  
  if (exists) {
    return { isValid: false, error: 'Ce nom existe déjà dans ce contexte' };
  }
  
  return { isValid: true, error: '' };
};