import { $, useComputed$, useSignal } from '@builder.io/qwik';
import { useSchemaEditor } from '../schema-editor-context';
import { localStorageService, type DraftSchema } from '../../localStorage';

/**
 * Hook pour la gestion avancée des brouillons
 */
export const useDraftManager = () => {
  const { store, actions } = useSchemaEditor();
  const draftsHistory = useSignal<DraftSchema[]>([]);

  // Informations sur le brouillon actuel
  const draftInfo = useComputed$(() => {
    return {
      hasUnsavedChanges: store.draft.hasUnsavedChanges,
      lastSaved: store.draft.lastSaved,
      isEditMode: store.draft.isEditMode,
      originalSchemaId: store.draft.originalSchemaId,
      autoSaveEnabled: store.draft.autoSaveEnabled
    };
  });

  // Charger l'historique des brouillons
  const loadDraftsHistory = $(async () => {
    try {
      const history = localStorageService.loadDraftsList();
      draftsHistory.value = history;
      return history;
    } catch (error) {
      console.warn('Erreur lors du chargement de l\'historique des brouillons:', error);
      return [];
    }
  });

  // Sauvegarder le brouillon actuel
  const saveDraft = $(async (showNotification = true) => {
    try {
      await actions.saveDraft();
      if (showNotification) {
        actions.showNotification('Brouillon sauvegardé', 'success', 2000);
      }
      await loadDraftsHistory();
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du brouillon:', error);
      if (showNotification) {
        actions.showNotification('Erreur lors de la sauvegarde du brouillon', 'error');
      }
      return { success: false, error };
    }
  });

  // Charger un brouillon spécifique
  const loadDraft = $(async (draft?: DraftSchema) => {
    try {
      if (draft) {
        // Charger un brouillon spécifique
        store.current.schemaInfo = draft.schemaInfo;
        store.current.properties = draft.properties;
        store.draft.hasUnsavedChanges = true;
        store.draft.isEditMode = draft.isEditing || false;
        store.draft.originalSchemaId = draft.originalId || null;
      } else {
        // Charger le dernier brouillon
        await actions.loadDraft();
      }

      actions.showNotification('Brouillon chargé', 'info', 2000);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors du chargement du brouillon:', error);
      actions.showNotification('Erreur lors du chargement du brouillon', 'error');
      return { success: false, error };
    }
  });

  // Supprimer le brouillon actuel
  const clearDraft = $(async (showNotification = true) => {
    try {
      await actions.clearDraft();
      if (showNotification) {
        actions.showNotification('Brouillon supprimé', 'info', 2000);
      }
      await loadDraftsHistory();
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression du brouillon:', error);
      if (showNotification) {
        actions.showNotification('Erreur lors de la suppression du brouillon', 'error');
      }
      return { success: false, error };
    }
  });

  // Vérifier s'il y a des changements non sauvegardés
  const hasUnsavedChanges = $(() => {
    return store.draft.hasUnsavedChanges;
  });

  // Créer un nouveau brouillon à partir de l'état actuel
  const createDraftFromCurrent = $(() => {
    const draft: DraftSchema = {
      schemaInfo: { ...store.current.schemaInfo },
      properties: JSON.parse(JSON.stringify(store.current.properties)),
      lastSaved: new Date().toISOString(),
      isEditing: store.draft.isEditMode,
      originalId: store.draft.originalSchemaId || undefined
    };
    return draft;
  });

  // Comparer deux brouillons
  const compareDrafts = $(async (draft1: DraftSchema, draft2: DraftSchema) => {
    const differences = {
      schemaInfo: {} as Record<string, { old: any; new: any }>,
      properties: {
        added: [] as string[],
        removed: [] as string[],
        modified: [] as string[]
      }
    };

    // Comparer les informations du schéma
    Object.keys(draft1.schemaInfo).forEach(key => {
      const key1 = draft1.schemaInfo[key as keyof typeof draft1.schemaInfo];
      const key2 = draft2.schemaInfo[key as keyof typeof draft2.schemaInfo];
      if (key1 !== key2) {
        differences.schemaInfo[key] = { old: key1, new: key2 };
      }
    });

    // Comparer les propriétés (simple comparaison par nom)
    const props1Names = new Set(draft1.properties.map(p => p.name));
    const props2Names = new Set(draft2.properties.map(p => p.name));

    props2Names.forEach(name => {
      if (!props1Names.has(name)) {
        differences.properties.added.push(name);
      }
    });

    props1Names.forEach(name => {
      if (!props2Names.has(name)) {
        differences.properties.removed.push(name);
      }
    });

    // Pour les propriétés modifiées, on pourrait faire une comparaison plus détaillée
    // mais pour simplifier, on considère qu'une propriété est modifiée si elle existe
    // dans les deux drafts mais que le JSON stringifié est différent
    props1Names.forEach(name => {
      if (props2Names.has(name)) {
        const prop1 = draft1.properties.find(p => p.name === name);
        const prop2 = draft2.properties.find(p => p.name === name);
        if (prop1 && prop2 && JSON.stringify(prop1) !== JSON.stringify(prop2)) {
          differences.properties.modified.push(name);
        }
      }
    });

    return differences;
  });

  // Restaurer un brouillon avec confirmation si il y a des changements
  const restoreDraft = $(async (draft: DraftSchema, force = false) => {
    if (!force && store.draft.hasUnsavedChanges) {
      const proceed = confirm(
        'Il y a des changements non sauvegardés. Voulez-vous vraiment charger ce brouillon ?'
      );
      if (!proceed) {
        return { success: false, cancelled: true };
      }
    }

    return await loadDraft(draft);
  });

  return {
    draftInfo,
    draftsHistory: draftsHistory.value,
    loadDraftsHistory,
    saveDraft,
    loadDraft,
    clearDraft,
    hasUnsavedChanges,
    createDraftFromCurrent,
    compareDrafts,
    restoreDraft
  };
};