import { $ } from '@builder.io/qwik';
import { localStorageService } from '../../localStorage';
import type { SchemaProperty, SchemaInfo } from '../../types';
import { generateJsonSchema, validateJsonSchema, updateSchema } from '../../services';

// Handler pour l'auto-sauvegarde d'édition
export const handleAutoSave = $(async (
  schemaId: string,
  schemaInfo: SchemaInfo,
  properties: SchemaProperty[]
) => {
  // Sauvegarder seulement s'il y a du contenu modifié
  if (schemaInfo.name.trim() || schemaInfo.description.trim() || properties.length > 0) {
    localStorageService.saveEditDraft(schemaId, {
      schemaInfo,
      properties,
      lastSaved: new Date().toISOString(),
      isEditing: true,
      originalId: schemaId
    });
  }
});

// Handler pour restaurer un brouillon d'édition
export const handleRestoreDraft = $(async (schemaId: string) => {
  return localStorageService.loadEditDraft(schemaId);
});

// Handler pour vérifier s'il y a un brouillon d'édition
export const handleCheckDraft = $(async (schemaId: string) => {
  return localStorageService.loadEditDraft(schemaId) !== null;
});

// Handler pour supprimer le brouillon d'édition après sauvegarde réussie
export const handleClearDraft = $(async (schemaId: string) => {
  localStorageService.clearEditDraft(schemaId);
});

// Handler pour sauvegarder les modifications et nettoyer le brouillon
export const handleSaveAndUpdate = $(async (
  originalId: string,
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
    
    const result = await updateSchema(originalId, name, schema);
    
    if (result.success) {
      // Supprimer le brouillon d'édition après sauvegarde réussie
      localStorageService.clearEditDraft(originalId);
    }
    
    return result;
  } catch (error) {
    return { success: false, message: 'Erreur lors de la sauvegarde des modifications' };
  }
});

// Handler pour afficher une confirmation avant de quitter
export const handleBeforeUnload = $(async (
  schemaId: string,
  schemaInfo: SchemaInfo,
  properties: SchemaProperty[]
) => {
  // Auto-save avant fermeture
  if (schemaInfo.name.trim() || schemaInfo.description.trim() || properties.length > 0) {
    localStorageService.saveEditDraft(schemaId, {
      schemaInfo,
      properties,
      lastSaved: new Date().toISOString(),
      isEditing: true,
      originalId: schemaId
    });
    
    return 'Vous avez des modifications non sauvegardées. Elles seront automatiquement restaurées à votre prochaine visite.';
  }
  
  return null;
});