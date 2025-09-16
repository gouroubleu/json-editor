import { useComputed$, useSignal, useTask$, $, type Signal } from '@builder.io/qwik';
import { useSchemaEditor } from './provider';
import type {
  SchemaProperty,
  SchemaInfo,
  LoadedSchema,
  SchemaDraft,
  AppNotification,
  CacheStats
} from './types';

// ===== HOOK PRINCIPAL =====

/**
 * Hook principal pour accéder au contexte SchemaEditor
 * Retourne l'état et les actions du contexte
 */
export const useSchemaEditorContext = () => {
  return useSchemaEditor();
};

// ===== HOOKS SPÉCIALISÉS POUR LES SCHÉMAS =====

/**
 * Hook pour la gestion des schémas avec des actions simplifiées
 */
export const useSchemas = () => {
  const { state, actions } = useSchemaEditor();

  const filteredSchemas = useComputed$(() => {
    let schemas = state.schemas;

    // Appliquer les filtres
    if (state.ui.filters.type) {
      schemas = schemas.filter(s => s.schema.type === state.ui.filters.type);
    }

    if (state.ui.filters.hasErrors) {
      // Logique pour filtrer les schémas avec erreurs
      // Cette logique peut être étendue selon les besoins
    }

    // Appliquer la recherche
    if (state.ui.searchQuery) {
      const query = state.ui.searchQuery.toLowerCase();
      schemas = schemas.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.schema.title?.toLowerCase().includes(query) ||
        s.schema.description?.toLowerCase().includes(query)
      );
    }

    return schemas;
  });

  const selectedSchema = useComputed$(() => {
    return state.ui.selectedSchemaName
      ? state.schemas.find(s => s.name === state.ui.selectedSchemaName)
      : null;
  });

  return {
    // État
    schemas: filteredSchemas,
    selectedSchema,
    isLoading: state.loading.isLoadingSchemas,
    searchQuery: state.ui.searchQuery,
    filters: state.ui.filters,

    // Actions
    loadAll: actions.schemas.loadAll,
    loadById: actions.schemas.loadById,
    create: actions.schemas.create,
    update: actions.schemas.update,
    delete: actions.schemas.delete,
    duplicate: actions.schemas.duplicate,
    select: actions.schemas.select,
    validate: actions.schemas.validate,
    generateSchema: actions.schemas.generateSchema,

    // Actions UI
    setSearchQuery: actions.ui.setSearchQuery,
    setFilters: actions.ui.setFilters,
    clearFilters: actions.ui.clearFilters
  };
};

/**
 * Hook pour la validation en temps réel des schémas
 */
export const useSchemaValidation = () => {
  const { state, actions } = useSchemaEditor();

  const validationErrors = useComputed$(() => {
    return state.currentSchema.errors;
  });

  const isValid = useComputed$(() => {
    return state.currentSchema.isValid;
  });

  const validateCurrent = $(() => {
    if (state.ui.validationEnabled) {
      return actions.schemas.validate();
    }
    return Promise.resolve({ isValid: true, errors: [] });
  });

  // Validation automatique lors des changements
  useTask$(({ track }) => {
    track(() => state.currentSchema.properties);
    track(() => state.currentSchema.schemaInfo);

    if (state.ui.validationEnabled) {
      // Débounce la validation
      const timeoutId = setTimeout(() => {
        validateCurrent();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  });

  return {
    // État
    isValid,
    errors: validationErrors,
    isValidating: state.loading.isValidating,
    validationEnabled: state.ui.validationEnabled,

    // Actions
    validate: validateCurrent,
    toggleValidation: actions.ui.toggleValidation,
    showErrors: actions.ui.showValidationErrors
  };
};

// ===== HOOKS POUR LES PROPRIÉTÉS =====

/**
 * Hook pour la gestion des propriétés du schéma actuel
 */
export const useSchemaProperties = () => {
  const { state, actions } = useSchemaEditor();

  const rootProperties = useComputed$(() => {
    return state.currentSchema.properties;
  });

  const selectedProperty = useComputed$(() => {
    if (!state.ui.selectedPropertyId) return null;

    const findProperty = (props: SchemaProperty[]): SchemaProperty | null => {
      for (const prop of props) {
        if (prop.id === state.ui.selectedPropertyId) return prop;
        if (prop.properties) {
          const found = findProperty(prop.properties);
          if (found) return found;
        }
      }
      return null;
    };

    return findProperty(state.currentSchema.properties);
  });

  const expandedProperties = useComputed$(() => {
    return state.ui.expandedProperties;
  });

  return {
    // État
    properties: rootProperties,
    selectedProperty,
    expandedProperties,
    selectedPropertyId: state.ui.selectedPropertyId,

    // Actions CRUD
    add: actions.properties.add,
    update: actions.properties.update,
    delete: actions.properties.delete,
    move: actions.properties.move,
    duplicate: actions.properties.duplicate,

    // Actions navigation
    select: actions.schemas.selectProperty,
    expand: actions.properties.expand,
    collapse: actions.properties.collapse,
    toggleExpansion: actions.properties.toggleExpansion,
    expandAll: actions.properties.expandAll,
    collapseAll: actions.properties.collapseAll,

    // Recherche et filtrage
    search: actions.properties.search,
    filter: actions.properties.filter
  };
};

/**
 * Hook pour la navigation dans l'arbre des propriétés
 */
export const usePropertyNavigation = () => {
  const { state, actions } = useSchemaEditor();

  const getPropertyPath = $((propertyId: string) => {
    const findPath = (props: SchemaProperty[], path: string[] = []): string[] | null => {
      for (const prop of props) {
        const currentPath = [...path, prop.name];
        if (prop.id === propertyId) return currentPath;
        if (prop.properties) {
          const found = findPath(prop.properties, currentPath);
          if (found) return found;
        }
      }
      return null;
    };

    return findPath(state.currentSchema.properties) || [];
  });

  const getPropertyDepth = $((propertyId: string) => {
    const findDepth = (props: SchemaProperty[], depth = 0): number => {
      for (const prop of props) {
        if (prop.id === propertyId) return depth;
        if (prop.properties) {
          const found = findDepth(prop.properties, depth + 1);
          if (found >= 0) return found;
        }
      }
      return -1;
    };

    return findDepth(state.currentSchema.properties);
  });

  const getParentProperty = $((propertyId: string) => {
    const findParent = (props: SchemaProperty[], parent: SchemaProperty | null = null): SchemaProperty | null => {
      for (const prop of props) {
        if (prop.id === propertyId) return parent;
        if (prop.properties) {
          const found = findParent(prop.properties, prop);
          if (found) return found;
        }
      }
      return null;
    };

    return findParent(state.currentSchema.properties);
  });

  const getSiblings = $((propertyId: string) => {
    const parent = getParentProperty(propertyId);
    if (parent && parent.properties) {
      return parent.properties;
    }
    return state.currentSchema.properties;
  });

  return {
    getPropertyPath,
    getPropertyDepth,
    getParentProperty,
    getSiblings,
    expandedProperties: state.ui.expandedProperties
  };
};

// ===== HOOKS POUR LE CACHE =====

/**
 * Hook pour la gestion intelligente du cache
 */
export const useSchemaCache = () => {
  const { state, actions } = useSchemaEditor();

  const cacheStats = useComputed$(() => {
    return actions.cache.getStats();
  });

  const cacheSize = useComputed$(() => {
    return state.cache.cachedSchemas.size;
  });

  const isExpired = $((schemaName: string) => {
    const entry = state.cache.cachedSchemas.get(schemaName);
    if (!entry) return true;

    const now = Date.now();
    const entryTime = new Date(entry.timestamp).getTime();
    return (now - entryTime) > state.cache.ttl;
  });

  // Nettoyage automatique du cache
  useTask$(() => {
    const interval = setInterval(() => {
      actions.cache.clearExpired();
    }, 60000); // Nettoyage toutes les minutes

    return () => clearInterval(interval);
  });

  return {
    // État
    stats: cacheStats,
    size: cacheSize,
    maxSize: state.cache.maxCacheSize,
    ttl: state.cache.ttl,
    lastSync: state.cache.lastSync,

    // Actions
    invalidate: actions.cache.invalidate,
    invalidateAll: actions.cache.invalidateAll,
    refresh: actions.cache.refresh,
    cleanup: actions.cache.cleanup,
    setTTL: actions.cache.setTTL,
    setMaxSize: actions.cache.setMaxSize,

    // Utilitaires
    isExpired
  };
};

// ===== HOOKS POUR LES BROUILLONS =====

/**
 * Hook pour la gestion des brouillons avec auto-save
 */
export const useDraftManager = () => {
  const { state, actions } = useSchemaEditor();

  const currentDraft = useComputed$(() => {
    const name = state.currentSchema.schemaInfo.name;
    return name ? state.drafts.drafts.get(name) : null;
  });

  const hasDraft = useComputed$(() => {
    const name = state.currentSchema.schemaInfo.name;
    return name ? state.drafts.drafts.has(name) : false;
  });

  const draftsList = useComputed$(() => {
    return Array.from(state.drafts.drafts.values()).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });

  // Auto-save automatique
  useTask$(({ track }) => {
    track(() => state.currentSchema.properties);
    track(() => state.currentSchema.schemaInfo);

    if (state.drafts.autoSaveEnabled && state.currentSchema.schemaInfo.name) {
      const timeoutId = setTimeout(() => {
        actions.drafts.triggerAutoSave();
      }, state.drafts.autoSaveInterval);

      return () => clearTimeout(timeoutId);
    }
  });

  return {
    // État
    currentDraft,
    hasDraft,
    drafts: draftsList,
    autoSaveEnabled: state.drafts.autoSaveEnabled,
    autoSaveInterval: state.drafts.autoSaveInterval,
    lastAutoSave: state.drafts.lastAutoSave,

    // Actions
    save: actions.drafts.save,
    load: actions.drafts.load,
    delete: actions.drafts.delete,
    list: actions.drafts.list,
    restore: actions.drafts.restoreFromDraft,
    enableAutoSave: actions.drafts.enableAutoSave,
    disableAutoSave: actions.drafts.disableAutoSave,
    triggerAutoSave: actions.drafts.triggerAutoSave
  };
};

// ===== HOOKS POUR LES NOTIFICATIONS =====

/**
 * Hook pour la gestion des notifications
 */
export const useNotifications = () => {
  const { state, actions } = useSchemaEditor();

  const notifications = useComputed$(() => {
    return state.notifications.notifications;
  });

  const latestNotification = useComputed$(() => {
    const notifs = state.notifications.notifications;
    return notifs.length > 0 ? notifs[notifs.length - 1] : null;
  });

  const errorNotifications = useComputed$(() => {
    return state.notifications.notifications.filter(n => n.type === 'error');
  });

  const hasErrors = useComputed$(() => {
    return errorNotifications.value.length > 0;
  });

  return {
    // État
    notifications,
    latestNotification,
    errorNotifications,
    hasErrors,
    maxNotifications: state.notifications.maxNotifications,

    // Actions
    success: actions.notifications.success,
    error: actions.notifications.error,
    warning: actions.notifications.warning,
    info: actions.notifications.info,
    dismiss: actions.notifications.dismiss,
    dismissAll: actions.notifications.dismissAll,
    setMaxNotifications: actions.notifications.setMaxNotifications
  };
};

// ===== HOOKS POUR L'ÉTAT DE L'UI =====

/**
 * Hook pour la gestion de l'état de l'interface utilisateur
 */
export const useSchemaEditorUI = () => {
  const { state, actions } = useSchemaEditor();

  const isLoading = useComputed$(() => {
    return state.loading.isLoading ||
           state.loading.isLoadingSchemas ||
           state.loading.isSaving ||
           state.loading.isValidating ||
           state.loading.isGenerating;
  });

  const loadingOperations = useComputed$(() => {
    return Array.from(state.loading.loadingOperations.values());
  });

  const currentOperation = useComputed$(() => {
    const ops = loadingOperations.value;
    return ops.length > 0 ? ops[ops.length - 1] : null;
  });

  return {
    // État général
    activeView: state.ui.activeView,
    activePanel: state.ui.activePanel,
    editMode: state.ui.editMode,
    sidebarCollapsed: state.ui.sidebarCollapsed,

    // États de chargement
    isLoading,
    loadingOperations,
    currentOperation,
    isLoadingSchemas: state.loading.isLoadingSchemas,
    isSaving: state.loading.isSaving,
    isValidating: state.loading.isValidating,
    isGenerating: state.loading.isGenerating,

    // Actions navigation
    setActiveView: actions.ui.setActiveView,
    setActivePanel: actions.ui.setActivePanel,
    setEditMode: actions.ui.setEditMode,
    toggleSidebar: actions.ui.toggleSidebar,

    // Actions validation
    toggleValidation: actions.ui.toggleValidation,
    showValidationErrors: actions.ui.showValidationErrors
  };
};

// ===== HOOKS UTILITAIRES =====

/**
 * Hook pour les opérations d'import/export
 */
export const useSchemaImportExport = () => {
  const { actions } = useSchemaEditor();

  const exportToJson = $((schemaName: string) => {
    return actions.utils.exportSchema(schemaName, 'json');
  });

  const exportToYaml = $((schemaName: string) => {
    return actions.utils.exportSchema(schemaName, 'yaml');
  });

  const importFromJson = $((content: string) => {
    return actions.utils.importSchema(content, 'json');
  });

  const importFromYaml = $((content: string) => {
    return actions.utils.importSchema(content, 'yaml');
  });

  return {
    exportToJson,
    exportToYaml,
    importFromJson,
    importFromYaml
  };
};

/**
 * Hook pour les opérations de synchronisation
 */
export const useSchemaSynchronization = () => {
  const { state, actions } = useSchemaEditor();

  const needsSync = useComputed$(() => {
    if (!state.cache.lastSync) return true;

    const lastSyncTime = new Date(state.cache.lastSync).getTime();
    const now = Date.now();
    const syncThreshold = 5 * 60 * 1000; // 5 minutes

    return (now - lastSyncTime) > syncThreshold;
  });

  const syncWithServer = $(async () => {
    await actions.utils.syncWithServer();
  });

  const createBackup = $(async () => {
    return await actions.utils.createBackup();
  });

  const restoreBackup = $(async (backupId: string) => {
    await actions.utils.restoreBackup(backupId);
  });

  return {
    needsSync,
    lastSync: state.cache.lastSync,
    syncWithServer,
    createBackup,
    restoreBackup
  };
};

// ===== TYPES POUR LES OPTIONS DES HOOKS =====

export interface AutoSaveOptions {
  enabled?: boolean;
  interval?: number;
}

export interface ValidationOptions {
  enabled?: boolean;
  debounceTime?: number;
  showErrors?: boolean;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  enablePersistence?: boolean;
}