import { $ } from '@builder.io/qwik';
import { localStorageService } from '../localStorage';
import type { SchemaProperty, SchemaInfo } from '../types';
import { generateJsonSchema, validateJsonSchema, saveSchema } from '../services';

// Handler pour l'auto-sauvegarde
export const handleAutoSave = $((
  schemaInfo: SchemaInfo,
  properties: SchemaProperty[]
) => {
  // Sauvegarder seulement s'il y a du contenu
  if (schemaInfo.name.trim() || schemaInfo.description.trim() || properties.length > 0) {
    localStorageService.saveDraft({
      schemaInfo,
      properties,
      lastSaved: new Date().toISOString()
    });
  }
});

// Handler pour restaurer un brouillon
export const handleRestoreDraft = $(() => {
  return localStorageService.loadDraft();
});

// Handler pour vérifier s'il y a un brouillon
export const handleCheckDraft = $(() => {
  return localStorageService.hasDraft();
});

// Handler pour supprimer le brouillon après sauvegarde réussie
export const handleClearDraft = $(() => {
  localStorageService.clearDraft();
});

// Handler pour sauvegarder et nettoyer le brouillon
export const handleSaveAndClear = $(async (
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
    
    const result = await saveSchema(name, schema);
    
    if (result.success) {
      // Supprimer le brouillon après sauvegarde réussie
      localStorageService.clearDraft();
    }
    
    return result;
  } catch (error) {
    return { success: false, message: 'Erreur lors de la sauvegarde' };
  }
});

// Handler pour afficher une confirmation avant de quitter
export const handleBeforeUnload = $((
  schemaInfo: SchemaInfo,
  properties: SchemaProperty[]
) => {
  // Auto-save avant fermeture
  if (schemaInfo.name.trim() || schemaInfo.description.trim() || properties.length > 0) {
    localStorageService.saveDraft({
      schemaInfo,
      properties,
      lastSaved: new Date().toISOString()
    });
    
    return 'Vous avez des modifications non sauvegardées. Elles seront automatiquement restaurées à votre prochaine visite.';
  }
  
  return null;
});