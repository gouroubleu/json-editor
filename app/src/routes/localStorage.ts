import type { SchemaProperty, SchemaInfo } from './types';

export type DraftSchema = {
  schemaInfo: SchemaInfo;
  properties: SchemaProperty[];
  lastSaved: string;
  isEditing?: boolean;
  originalId?: string;
};

// Clés pour localStorage
const DRAFT_KEY = 'schema-editor-draft';
const DRAFTS_LIST_KEY = 'schema-editor-drafts-list';

export const localStorageService = {
  // Sauvegarder un brouillon
  saveDraft(draft: DraftSchema): void {
    if (typeof window === 'undefined') return;
    
    try {
      const draftWithTimestamp = {
        ...draft,
        lastSaved: new Date().toISOString()
      };
      
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftWithTimestamp));
      
      // Ajouter à la liste des brouillons pour l'historique
      this.addToDraftsList(draftWithTimestamp);
    } catch (error) {
      console.warn('Erreur sauvegarde localStorage:', error);
    }
  },

  // Charger le dernier brouillon
  loadDraft(): DraftSchema | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (!stored) return null;
      
      return JSON.parse(stored) as DraftSchema;
    } catch (error) {
      console.warn('Erreur chargement localStorage:', error);
      return null;
    }
  },

  // Supprimer le brouillon courant
  clearDraft(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.warn('Erreur suppression localStorage:', error);
    }
  },

  // Ajouter à l'historique des brouillons
  addToDraftsList(draft: DraftSchema): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(DRAFTS_LIST_KEY);
      const drafts = stored ? JSON.parse(stored) : [];
      
      // Garder seulement les 5 derniers brouillons
      const updatedDrafts = [draft, ...drafts.slice(0, 4)];
      
      localStorage.setItem(DRAFTS_LIST_KEY, JSON.stringify(updatedDrafts));
    } catch (error) {
      console.warn('Erreur sauvegarde historique:', error);
    }
  },

  // Charger l'historique des brouillons
  loadDraftsList(): DraftSchema[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(DRAFTS_LIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Erreur chargement historique:', error);
      return [];
    }
  },

  // Vérifier s'il y a un brouillon non sauvegardé
  hasDraft(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      return localStorage.getItem(DRAFT_KEY) !== null;
    } catch {
      return false;
    }
  },

  // Sauvegarder spécifiquement pour une édition
  saveEditDraft(schemaId: string, draft: DraftSchema): void {
    if (typeof window === 'undefined') return;
    
    try {
      const editDraft = {
        ...draft,
        isEditing: true,
        originalId: schemaId,
        lastSaved: new Date().toISOString()
      };
      
      localStorage.setItem(`${DRAFT_KEY}-edit-${schemaId}`, JSON.stringify(editDraft));
    } catch (error) {
      console.warn('Erreur sauvegarde brouillon édition:', error);
    }
  },

  // Charger le brouillon d'édition
  loadEditDraft(schemaId: string): DraftSchema | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(`${DRAFT_KEY}-edit-${schemaId}`);
      if (!stored) return null;
      
      return JSON.parse(stored) as DraftSchema;
    } catch (error) {
      console.warn('Erreur chargement brouillon édition:', error);
      return null;
    }
  },

  // Supprimer le brouillon d'édition
  clearEditDraft(schemaId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(`${DRAFT_KEY}-edit-${schemaId}`);
    } catch (error) {
      console.warn('Erreur suppression brouillon édition:', error);
    }
  }
};