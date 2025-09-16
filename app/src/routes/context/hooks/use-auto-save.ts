import { $, useSignal, useTask$ } from '@builder.io/qwik';
import { useSchemaEditor } from '../provider';

export interface AutoSaveOptions {
  enabled?: boolean;
  delay?: number; // en millisecondes
  showNotifications?: boolean;
}

/**
 * Hook pour la gestion de l'auto-sauvegarde
 */
export const useAutoSave = (options: AutoSaveOptions = {}) => {
  const { state, actions } = useSchemaEditor();
  const {
    enabled = true,
    delay = 2000,
    showNotifications = false
  } = options;

  const lastSaveTime = useSignal<number>(0);
  const saveTimer = useSignal<NodeJS.Timeout | null>(null);

  // Task pour gérer l'auto-save
  useTask$(async ({ track, cleanup }) => {
    // Tracker les changements dans l'état
    track(() => state.currentSchema.schemaInfo);
    track(() => state.currentSchema.properties);

    if (!enabled || !state.drafts.autoSaveEnabled) {
      return;
    }

    // Nettoyer le timer précédent
    if (saveTimer.value) {
      clearTimeout(saveTimer.value);
    }

    // Créer un nouveau timer
    const timerId = setTimeout(async () => {
      try {
        await actions.drafts.triggerAutoSave();
        lastSaveTime.value = Date.now();

        if (showNotifications) {
          actions.notifications.info('Brouillon sauvegardé automatiquement', '', 2000);
        }
      } catch (error) {
        console.warn('Erreur lors de l\'auto-save:', error);
        if (showNotifications) {
          actions.notifications.warning('Erreur', 'Erreur lors de la sauvegarde automatique', 3000);
        }
      }
    }, delay);

    saveTimer.value = timerId;

    // Cleanup du timer
    cleanup(() => {
      if (timerId) {
        clearTimeout(timerId);
      }
    });
  });

  // Actions pour contrôler l'auto-save
  const enableAutoSave = $(() => {
    state.drafts.autoSaveEnabled = true;
  });

  const disableAutoSave = $(() => {
    state.drafts.autoSaveEnabled = false;
    if (saveTimer.value) {
      clearTimeout(saveTimer.value);
      saveTimer.value = null;
    }
  });

  const forceSave = $(async () => {
    if (saveTimer.value) {
      clearTimeout(saveTimer.value);
      saveTimer.value = null;
    }

    try {
      await actions.drafts.triggerAutoSave();
      lastSaveTime.value = Date.now();

      if (showNotifications) {
        actions.notifications.success('Brouillon sauvegardé', '', 2000);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde forcée:', error);
      if (showNotifications) {
        actions.notifications.error('Erreur', 'Erreur lors de la sauvegarde');
      }
      return { success: false, error };
    }
  });

  return {
    isAutoSaveEnabled: state.drafts.autoSaveEnabled,
    hasUnsavedChanges: false, // TODO: Implémenter la détection des changements
    lastSaveTime: lastSaveTime.value,
    enableAutoSave,
    disableAutoSave,
    forceSave
  };
};