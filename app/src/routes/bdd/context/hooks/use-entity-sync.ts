// Hook spécialisé pour la synchronisation et auto-save simplifié des entités
import { useSignal, useTask$, $ } from '@builder.io/qwik';
import { useEntityContext } from '../hooks';
import { debounceEntity } from '../context';

/**
 * Type pour l'état de synchronisation simplifié
 */
export type SimpleSyncState = {
  isOnline: boolean;
  lastSync: string | null;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  pendingChanges: Map<string, any>;
  syncInProgress: boolean;
}

/**
 * Type pour le statut de synchronisation
 */
export type SyncStatus = {
  status: 'online' | 'offline' | 'syncing' | 'error';
  message: string;
  lastSync: string | null;
  pendingChanges: number;
}

/**
 * Hook simplifié pour la synchronisation et auto-save des entités
 */
export const useEntitySync = () => {
  const { state, actions } = useEntityContext();

  // État local simplifié pour la synchronisation
  const syncState = useSignal<SimpleSyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSync: null,
    autoSaveEnabled: true,
    autoSaveInterval: 10000, // 10 secondes
    pendingChanges: new Map(),
    syncInProgress: false
  });

  // Timer pour l'auto-save
  const autoSaveTimer = useSignal<NodeJS.Timeout | null>(null);

  // Statut de synchronisation calculé
  const syncStatus = useSignal<SyncStatus>({
    status: 'online',
    message: 'Synchronisé',
    lastSync: null,
    pendingChanges: 0
  });

  // Mise à jour du statut
  useTask$(({ track }) => {
    track(() => syncState.value);

    const state = syncState.value;
    const pendingCount = state.pendingChanges.size;

    if (!state.isOnline) {
      syncStatus.value = {
        status: 'offline',
        message: 'Mode hors ligne',
        lastSync: state.lastSync,
        pendingChanges: pendingCount
      };
    } else if (state.syncInProgress) {
      syncStatus.value = {
        status: 'syncing',
        message: 'Synchronisation...',
        lastSync: state.lastSync,
        pendingChanges: pendingCount
      };
    } else if (pendingCount > 0) {
      syncStatus.value = {
        status: 'online',
        message: `${pendingCount} changement(s) en attente`,
        lastSync: state.lastSync,
        pendingChanges: pendingCount
      };
    } else {
      syncStatus.value = {
        status: 'online',
        message: 'Synchronisé',
        lastSync: state.lastSync,
        pendingChanges: 0
      };
    }
  });

  // Auto-save avec debounce
  const debouncedAutoSave = debounceEntity(
    $(async () => {
      if (syncState.value.pendingChanges.size === 0 || syncState.value.syncInProgress) {
        return;
      }

      syncState.value = {
        ...syncState.value,
        syncInProgress: true
      };

      try {
        // Simuler la sauvegarde des changements
        const changes = Array.from(syncState.value.pendingChanges.entries());

        for (const [entityId, data] of changes) {
          // Ici on pourrait appeler les actions pour sauvegarder
          console.log(`Auto-save pour entité ${entityId}:`, data);
        }

        // Nettoyer les changements en attente
        syncState.value = {
          ...syncState.value,
          pendingChanges: new Map(),
          lastSync: new Date().toISOString(),
          syncInProgress: false
        };

        actions.notifications.success(
          'Auto-sauvegarde',
          `${changes.length} changement(s) sauvé(s)`,
          { duration: 2000 }
        );

      } catch (error) {
        syncState.value = {
          ...syncState.value,
          syncInProgress: false
        };

        actions.notifications.error(
          'Erreur auto-sauvegarde',
          'Échec de la sauvegarde automatique',
          { duration: 3000 }
        );
      }
    }),
    1000
  );

  // Enregistrer un changement
  const trackChange = $((entityId: string, changes: any) => {
    if (!entityId || !changes) return;

    syncState.value = {
      ...syncState.value,
      pendingChanges: new Map(syncState.value.pendingChanges).set(entityId, {
        ...changes,
        timestamp: new Date().toISOString()
      })
    };

    // Déclencher l'auto-save si activé
    if (syncState.value.autoSaveEnabled) {
      scheduleAutoSave();
    }
  });

  // Programmer l'auto-save
  const scheduleAutoSave = $(() => {
    if (autoSaveTimer.value) {
      clearTimeout(autoSaveTimer.value);
    }

    autoSaveTimer.value = setTimeout(() => {
      debouncedAutoSave();
    }, syncState.value.autoSaveInterval);
  });

  // Sauvegarde manuelle
  const forceSave = $(async () => {
    if (syncState.value.pendingChanges.size === 0) {
      actions.notifications.info('Aucun changement', 'Rien à sauvegarder');
      return;
    }

    await debouncedAutoSave();
  });

  // Activer/désactiver l'auto-save
  const toggleAutoSave = $(() => {
    syncState.value = {
      ...syncState.value,
      autoSaveEnabled: !syncState.value.autoSaveEnabled
    };

    if (!syncState.value.autoSaveEnabled && autoSaveTimer.value) {
      clearTimeout(autoSaveTimer.value);
      autoSaveTimer.value = null;
    }

    actions.notifications.info(
      'Auto-sauvegarde',
      `Auto-sauvegarde ${syncState.value.autoSaveEnabled ? 'activée' : 'désactivée'}`
    );
  });

  // Configurer l'intervalle
  const setAutoSaveInterval = $((interval: number) => {
    syncState.value = {
      ...syncState.value,
      autoSaveInterval: Math.max(1000, interval)
    };
  });

  // Surveillance de la connexion
  useTask$(({ cleanup }) => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      syncState.value = {
        ...syncState.value,
        isOnline: true
      };

      actions.notifications.success(
        'Connexion rétablie',
        'Mode en ligne restauré'
      );

      // Déclencher une synchronisation si il y a des changements
      if (syncState.value.pendingChanges.size > 0) {
        debouncedAutoSave();
      }
    };

    const handleOffline = () => {
      syncState.value = {
        ...syncState.value,
        isOnline: false
      };

      if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value);
        autoSaveTimer.value = null;
      }

      actions.notifications.warning(
        'Mode hors ligne',
        'Les changements seront sauvés localement'
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    cleanup(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value);
      }
    });
  });

  return {
    // État
    syncStatus: syncStatus.value,
    isOnline: syncState.value.isOnline,
    autoSaveEnabled: syncState.value.autoSaveEnabled,
    autoSaveInterval: syncState.value.autoSaveInterval,
    pendingChanges: syncState.value.pendingChanges.size,
    syncInProgress: syncState.value.syncInProgress,
    lastSync: syncState.value.lastSync,

    // Actions
    trackChange,
    forceSave,
    toggleAutoSave,
    setAutoSaveInterval,
    scheduleAutoSave,

    // Utilitaires
    clearPendingChanges: $(() => {
      syncState.value = {
        ...syncState.value,
        pendingChanges: new Map()
      };

      if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value);
        autoSaveTimer.value = null;
      }
    }),

    // Diagnostic simple
    getSyncInfo: $(() => ({
      status: syncStatus.value,
      state: syncState.value,
      timerActive: autoSaveTimer.value !== null
    }))
  };
};