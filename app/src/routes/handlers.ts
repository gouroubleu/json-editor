import { $ } from '@builder.io/qwik';
import { generateJsonSchema, validateJsonSchema, saveSchema, loadSchemas } from './services';
import type { SchemaProperty, SchemaInfo } from './types';

// Handler pour ajouter une propriété
export const handleAddProperty = $((
  newProperty: SchemaProperty,
  properties: SchemaProperty[]
): boolean => {
  if (!newProperty.name.trim()) {
    return false;
  }
  
  // Vérifier que le nom n'existe pas déjà
  const exists = properties.some(prop => prop.name === newProperty.name.trim());
  if (exists) {
    return false;
  }
  
  return true;
});

// Handler pour supprimer une propriété
export const handleRemoveProperty = $((index: number, properties: SchemaProperty[]) => {
  if (index >= 0 && index < properties.length) {
    properties.splice(index, 1);
    return true;
  }
  return false;
});

// Handler pour générer le schéma JSON
export const handleGenerateSchema = $(async (
  schemaInfo: SchemaInfo,
  properties: SchemaProperty[]
) => {
  try {
    const schema = await generateJsonSchema(schemaInfo, properties);
    const validation = await validateJsonSchema(schema);
    
    return {
      schema,
      validation,
      json: JSON.stringify(schema, null, 2)
    };
  } catch (error) {
    return {
      schema: null,
      validation: { isValid: false, errors: ['Erreur lors de la génération du schéma'] },
      json: ''
    };
  }
});

// Handler pour sauvegarder le schéma
export const handleSaveSchema = $(async (
  name: string,
  schemaInfo: SchemaInfo,
  properties: SchemaProperty[]
) => {
  try {
    if (!name.trim()) {
      return { success: false, message: 'Le nom du schéma est requis' };
    }
    
    const schema = await generateJsonSchema(schemaInfo, properties);
    const validation = await validateJsonSchema(schema);
    
    if (!validation.isValid) {
      return { 
        success: false, 
        message: `Schéma invalide: ${validation.errors.join(', ')}` 
      };
    }
    
    return await saveSchema(name, schema);
  } catch (error) {
    return { success: false, message: 'Erreur lors de la sauvegarde' };
  }
});

// Handler pour charger les schémas
export const handleLoadSchemas = $(async () => {
  try {
    return await loadSchemas();
  } catch (error) {
    return [];
  }
});

// Handler pour copier dans le presse-papier
export const handleCopyToClipboard = $(async (text: string) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return { success: true, message: 'Copié dans le presse-papier !' };
    } else {
      // Fallback pour les navigateurs qui ne supportent pas l'API clipboard
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return { success: true, message: 'Copié dans le presse-papier !' };
    }
  } catch (error) {
    return { success: false, message: 'Erreur lors de la copie' };
  }
});

// Handler pour valider un nom de propriété
export const handleValidatePropertyName = $((name: string, properties: SchemaProperty[]) => {
  if (!name.trim()) {
    return { isValid: false, error: 'Le nom est requis' };
  }
  
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name.trim())) {
    return { 
      isValid: false, 
      error: 'Le nom doit commencer par une lettre et contenir seulement des lettres, chiffres et underscores' 
    };
  }
  
  const exists = properties.some(prop => prop.name === name.trim());
  if (exists) {
    return { isValid: false, error: 'Ce nom existe déjà' };
  }
  
  return { isValid: true, error: '' };
});

// Handler pour mettre à jour une propriété
export const handleUpdateProperty = $((
  index: number,
  updates: Partial<SchemaProperty>,
  properties: SchemaProperty[]
) => {
  if (index >= 0 && index < properties.length) {
    properties[index] = { ...properties[index], ...updates };
    return true;
  }
  return false;
});

// Handler pour afficher une notification
export const handleShowNotification = $((
  type: 'success' | 'error',
  message: string,
  uiState: any
) => {
  uiState.notification = { show: true, type, message };
  setTimeout(() => {
    uiState.notification.show = false;
  }, 3000);
});