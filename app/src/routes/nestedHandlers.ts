import { $ } from '@builder.io/qwik';
import type { SchemaProperty, JsonSchemaType } from './types';
import {
  createNewProperty,
  addPropertyToParent,
  removePropertyById,
  togglePropertyExpanded,
  validatePropertyNameInContext,
  findPropertyById
} from './utils';

// Handler pour ajouter une propriété enfant
export const handleAddNestedProperty = $(async (
  properties: SchemaProperty[],
  parentId: string | null,
  name: string,
  type: JsonSchemaType,
  required: boolean = false,
  description: string = '',
  fullProperty?: SchemaProperty
) => {
  // Valider le nom dans le contexte
  const validation = validatePropertyNameInContext(properties, parentId, name);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  // Utiliser la propriété complète si fournie, sinon créer une nouvelle
  const newProperty = fullProperty ? { ...fullProperty } : createNewProperty(name, type);
  if (!fullProperty) {
    newProperty.required = required;
    newProperty.description = description;
  }



  // Ajouter au parent approprié
  const success = addPropertyToParent(properties, parentId, newProperty);
  
  if (success) {
    // Si le parent existe, s'assurer qu'il est expandé
    if (parentId) {
      const parent = findPropertyById(properties, parentId);
      if (parent) {
        parent.isExpanded = true;
      }
    }
    return { success: true, propertyId: newProperty.id };
  }

  return { success: false, error: 'Impossible d\'ajouter la propriété' };
});

// Handler pour supprimer une propriété
export const handleRemoveNestedProperty = $(async (
  properties: SchemaProperty[],
  propertyId: string
) => {
  const success = removePropertyById(properties, propertyId);
  return { success };
});

// Handler pour toggle l'expansion d'une propriété
export const handleToggleExpanded = $(async (
  properties: SchemaProperty[],
  propertyId: string
) => {
  const success = togglePropertyExpanded(properties, propertyId);
  return { success };
});

// Handler pour mettre à jour le type d'une propriété
export const handleUpdatePropertyType = $(async (
  properties: SchemaProperty[],
  propertyId: string,
  newType: JsonSchemaType
) => {
  const property = findPropertyById(properties, propertyId);
  if (!property) {
    return { success: false, error: 'Propriété non trouvée' };
  }

  const oldType = property.type;
  property.type = newType;

  // Nettoyer les propriétés spécifiques à l'ancien type
  if (oldType === 'object') {
    delete property.properties;
  }
  if (oldType === 'array') {
    delete property.items;
  }

  // Initialiser les propriétés pour le nouveau type
  if (newType === 'object') {
    property.properties = [];
    property.isExpanded = true;
  }
  if (newType === 'array') {
    property.items = {
      type: 'string',
      properties: []
    };
    property.isExpanded = true;
  }

  // Nettoyer les contraintes non applicables
  if (newType !== 'string' && newType !== 'select') {
    delete property.minLength;
    delete property.maxLength;
    delete property.format;
    delete property.enum;
  }

  // Initialiser enum pour le type select si nécessaire
  if (newType === 'select' && !property.enum) {
    property.enum = ['Option 1', 'Option 2'];
  }
  if (newType !== 'number' && newType !== 'integer') {
    delete property.minimum;
    delete property.maximum;
  }

  return { success: true };
});

// Handler pour mettre à jour le type des items d'un array
export const handleUpdateArrayItemType = $(async (
  properties: SchemaProperty[],
  arrayPropertyId: string,
  newItemType: JsonSchemaType
) => {
  const arrayProperty = findPropertyById(properties, arrayPropertyId);
  if (!arrayProperty || arrayProperty.type !== 'array' || !arrayProperty.items) {
    return { success: false, error: 'Propriété array non trouvée' };
  }

  const oldItemType = arrayProperty.items.type;
  arrayProperty.items.type = newItemType;

  // Si on passe d'objet à autre chose, nettoyer les propriétés
  if (oldItemType === 'object' && newItemType !== 'object') {
    arrayProperty.items.properties = [];
  }

  // Si on passe à objet, initialiser les propriétés
  if (newItemType === 'object' && oldItemType !== 'object') {
    arrayProperty.items.properties = [];
  }

  return { success: true };
});

// Handler pour mettre à jour une propriété
export const handleUpdateProperty = $(async (
  properties: SchemaProperty[],
  propertyId: string,
  updates: Partial<SchemaProperty>
) => {
  const property = findPropertyById(properties, propertyId);
  if (!property) {
    return { success: false, error: 'Propriété non trouvée' };
  }

  // Valider le nom si il a changé
  if (updates.name && updates.name !== property.name) {
    const parentId = getParentId(properties, propertyId);
    const validation = validatePropertyNameInContext(properties, parentId, updates.name, propertyId);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }
  }

  // Appliquer les mises à jour
  Object.assign(property, updates);

  return { success: true };
});

// Fonction utilitaire pour trouver le parent d'une propriété
const getParentId = (properties: SchemaProperty[], childId: string): string | null => {
  for (const property of properties) {
    // Vérifier dans les propriétés d'objets
    if (property.properties?.some(p => p.id === childId)) {
      return property.id!;
    }
    
    // Vérifier dans les propriétés des items d'arrays
    if (property.items?.properties?.some(p => p.id === childId)) {
      return property.id!;
    }

    // Recherche récursive
    const foundInObject = property.properties && getParentId(property.properties, childId);
    if (foundInObject) return foundInObject;

    const foundInArray = property.items?.properties && getParentId(property.items.properties, childId);
    if (foundInArray) return foundInArray;
  }
  return null;
};