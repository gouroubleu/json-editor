// Contexte principal pour l'EntityEditor avec architecture Qwik
import { createContextId } from '@builder.io/qwik';
import type { EntityEditorContextValue } from './types';

/**
 * Context ID pour l'EntityEditor
 * Utilisé avec useContext() et useContextProvider()
 */
export const EntityEditorContextId = createContextId<EntityEditorContextValue>('entity-editor-context');

/**
 * Clés pour le stockage local (cache persistant et brouillons)
 */
export const ENTITY_STORAGE_KEYS = {
  CACHE: 'entity-editor-cache',
  DRAFTS: 'entity-editor-drafts',
  CONFIG: 'entity-editor-config',
  UI_STATE: 'entity-editor-ui-state',
  NAVIGATION: 'entity-editor-navigation',
  FAVORITES: 'entity-editor-favorites',
  RECENT: 'entity-editor-recent'
} as const;

/**
 * Configuration par défaut du contexte EntityEditor
 */
export const DEFAULT_ENTITY_CONFIG = {
  cache: {
    ttl: 15 * 60 * 1000, // 15 minutes
    maxSize: 100, // 100 entités en cache
    enablePersistence: true,
    preloadStrategies: {
      enableSchemaPreload: true,
      enableRelatedEntitiesPreload: false,
      maxPreloadSize: 20
    }
  },
  drafts: {
    autoSaveEnabled: true,
    autoSaveInterval: 10000, // 10 secondes
    maxDrafts: 20,
    retentionDays: 7,
    enableChangeTracking: true
  },
  notifications: {
    maxNotifications: 8,
    defaultDuration: 6000, // 6 secondes
    enableSound: false,
    enableMigrationAlerts: true,
    enableValidationAlerts: true,
    migrationAlertThreshold: 5 // Alert si 5+ entités obsolètes
  },
  ui: {
    defaultView: 'summary' as const,
    defaultPanel: 'form' as const,
    enableValidation: true,
    debounceTime: 500, // millisecondes
    enableHorizontalNavigation: true,
    maxRecentEntities: 10,
    enableAutoSave: true
  },
  validation: {
    defaultMode: 'lenient' as const,
    validateOnChange: true,
    validateOnSave: true,
    batchValidationChunkSize: 50,
    enableValidationCache: true,
    validationCacheTTL: 5 * 60 * 1000 // 5 minutes
  },
  navigation: {
    maxHistorySize: 50,
    enableBreadcrumbs: true,
    enableHorizontalNavigation: true,
    preloadAdjacentEntities: true
  }
} as const;

/**
 * État initial du contexte EntityEditor
 */
export const INITIAL_ENTITY_STATE = {
  currentEntity: {
    entityInfo: {
      version: '1.0',
      schemaName: ''
    },
    data: {},
    schemaName: '',
    schemaVersion: '1.0',
    isValid: true,
    validationErrors: [],
    validationWarnings: [],
    isDirty: false,
    hasUnsavedChanges: false,
    isNew: true
  },
  entities: [],
  summaries: [],
  availableSchemas: [],
  ui: {
    selectedSchemaName: null,
    selectedEntityId: null,
    activeView: 'summary' as const,
    editMode: 'view' as const,
    activePanel: 'form' as const,
    searchQuery: '',
    filters: {},
    expandedSections: new Set<string>(),
    navigationPath: [],
    showValidationErrors: true,
    showOnlyErrors: false,
    autoSaveEnabled: DEFAULT_ENTITY_CONFIG.ui.enableAutoSave,
    horizontalView: false,
    sidebarCollapsed: false,
    detailsPanelCollapsed: false
  },
  cache: {
    lastSync: null,
    cachedEntities: new Map(),
    cachedLists: new Map(),
    invalidationQueue: [],
    maxCacheSize: DEFAULT_ENTITY_CONFIG.cache.maxSize,
    ttl: DEFAULT_ENTITY_CONFIG.cache.ttl,
    cacheHits: 0,
    cacheMisses: 0
  },
  drafts: {
    drafts: new Map(),
    autoSaveEnabled: DEFAULT_ENTITY_CONFIG.drafts.autoSaveEnabled,
    autoSaveInterval: DEFAULT_ENTITY_CONFIG.drafts.autoSaveInterval,
    lastAutoSave: null,
    maxDrafts: DEFAULT_ENTITY_CONFIG.drafts.maxDrafts,
    draftRetentionDays: DEFAULT_ENTITY_CONFIG.drafts.retentionDays
  },
  loading: {
    isLoading: false,
    isLoadingSummaries: false,
    isLoadingEntities: false,
    isSaving: false,
    isValidating: false,
    isMigrating: false,
    loadingOperations: new Map(),
    batchOperations: new Map()
  },
  notifications: {
    notifications: [],
    maxNotifications: DEFAULT_ENTITY_CONFIG.notifications.maxNotifications,
    migrationAlerts: [],
    validationAlerts: []
  },
  navigation: {
    history: [],
    currentIndex: -1,
    horizontalNavigation: {
      currentEntityIndex: 0,
      totalEntitiesInSchema: 0,
      enabledForSchema: false
    },
    breadcrumbs: [],
    recentEntities: [],
    favoriteEntities: []
  },
  validation: {
    isValidationEnabled: DEFAULT_ENTITY_CONFIG.ui.enableValidation,
    validationMode: DEFAULT_ENTITY_CONFIG.validation.defaultMode,
    validationCache: new Map(),
    validateOnChange: DEFAULT_ENTITY_CONFIG.validation.validateOnChange,
    validateOnSave: DEFAULT_ENTITY_CONFIG.validation.validateOnSave,
    showValidationSummary: true,
    batchValidationStatus: {
      isRunning: false,
      totalEntities: 0,
      validatedCount: 0,
      validCount: 0,
      invalidCount: 0,
      errors: []
    }
  }
} as const;

/**
 * Types pour les événements du contexte EntityEditor
 */
export interface EntityEditorEvent {
  type: string;
  payload?: any;
  timestamp: string;
  entityId?: string;
  schemaName?: string;
}

export interface EntityEditorEventMap {
  // Événements d'entités
  'entity:created': { entityId: string; schemaName: string; data: any };
  'entity:updated': { entityId: string; data: any; changes: any[] };
  'entity:deleted': { entityId: string; schemaName: string };
  'entity:selected': { entityId: string | null };
  'entity:migrated': { entityId: string; fromVersion: string; toVersion: string };

  // Événements de schémas
  'schema:selected': { schemaName: string | null };
  'schema:entities-loaded': { schemaName: string; count: number };
  'schema:migration-needed': { schemaName: string; outdatedCount: number };

  // Événements d'interface
  'ui:view-changed': { view: string };
  'ui:mode-changed': { mode: string };
  'ui:filter-changed': { filters: any };

  // Événements de données
  'data:field-updated': { path: string; value: any; entityId: string };
  'data:validated': { entityId: string; result: any };
  'data:draft-saved': { draftId: string; entityId: string };

  // Événements de navigation
  'navigation:entity-changed': { from: string | null; to: string | null };
  'navigation:history-updated': { historySize: number };

  // Événements de cache
  'cache:invalidated': { entityId?: string; schemaName?: string };
  'cache:hit': { entityId: string };
  'cache:miss': { entityId: string };

  // Événements de notification
  'notification:added': { notification: any };
  'notification:migration-alert': { alert: any };
  'notification:validation-alert': { alert: any };
}

/**
 * Utilitaires pour les IDs uniques
 */
export const generateEntityId = (): string => {
  return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateDraftId = (entityId?: string): string => {
  const base = entityId ? `edit_${entityId}` : `new_${Date.now()}`;
  return `draft_${base}_${Math.random().toString(36).substr(2, 5)}`;
};

export const generateOperationId = (type: string): string => {
  return `op_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
};

/**
 * Utilitaires pour la validation des noms et données
 */
export const validateEntityData = (data: Record<string, any>, schema: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Les données de l\'entité doivent être un objet');
    return { isValid: false, errors };
  }

  // Validation basique - peut être étendue
  if (schema?.required && Array.isArray(schema.required)) {
    for (const requiredField of schema.required) {
      if (!data.hasOwnProperty(requiredField) || data[requiredField] === null || data[requiredField] === undefined) {
        errors.push(`Le champ '${requiredField}' est requis`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Utilitaires pour la comparaison des entités
 */
export const entitiesEqual = (entity1: any, entity2: any): boolean => {
  if (!entity1 || !entity2) return entity1 === entity2;
  return JSON.stringify(entity1.data) === JSON.stringify(entity2.data);
};

export const calculateEntityChanges = (original: any, current: any): any[] => {
  const changes: any[] = [];

  // Implémentation basique - peut être améliorée avec une librairie comme diff
  if (JSON.stringify(original) !== JSON.stringify(current)) {
    changes.push({
      type: 'modified',
      path: 'root',
      oldValue: original,
      newValue: current,
      timestamp: new Date().toISOString()
    });
  }

  return changes;
};

/**
 * Utilitaires pour le stockage local spécialisé pour les entités
 */
export const entityStorage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Erreur lors de la lecture du localStorage pour ${key}:`, error);
      return defaultValue;
    }
  },

  set: (key: string, value: any): void => {
    if (typeof window === 'undefined') return;

    try {
      // Limitation de taille pour éviter de surcharger le localStorage
      const serialized = JSON.stringify(value);
      if (serialized.length > 5 * 1024 * 1024) { // 5MB limit
        console.warn(`Données trop volumineuses pour le localStorage (${key})`);
        return;
      }
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.warn(`Erreur lors de l'écriture dans le localStorage pour ${key}:`, error);
    }
  },

  remove: (key: string): void => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Erreur lors de la suppression du localStorage pour ${key}:`, error);
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;

    try {
      Object.values(ENTITY_STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Erreur lors du nettoyage du localStorage EntityEditor:', error);
    }
  },

  // Utilitaires spécialisés pour les entités
  saveDraft: (draftId: string, draft: any): void => {
    const drafts = entityStorage.get(ENTITY_STORAGE_KEYS.DRAFTS, {});
    drafts[draftId] = {
      ...draft,
      savedAt: new Date().toISOString()
    };
    entityStorage.set(ENTITY_STORAGE_KEYS.DRAFTS, drafts);
  },

  loadDraft: (draftId: string): any | null => {
    const drafts = entityStorage.get(ENTITY_STORAGE_KEYS.DRAFTS, {});
    return drafts[draftId] || null;
  },

  deleteDraft: (draftId: string): void => {
    const drafts = entityStorage.get(ENTITY_STORAGE_KEYS.DRAFTS, {});
    delete drafts[draftId];
    entityStorage.set(ENTITY_STORAGE_KEYS.DRAFTS, drafts);
  },

  saveRecentEntity: (entityId: string, schemaName: string, title: string): void => {
    const recent = entityStorage.get(ENTITY_STORAGE_KEYS.RECENT, []);
    const newEntry = {
      entityId,
      schemaName,
      title,
      lastAccessed: new Date().toISOString()
    };

    // Supprimer les entrées existantes pour cette entité
    const filtered = recent.filter((item: any) => item.entityId !== entityId);

    // Ajouter la nouvelle entrée au début
    filtered.unshift(newEntry);

    // Limiter à 10 entrées récentes
    const limited = filtered.slice(0, 10);

    entityStorage.set(ENTITY_STORAGE_KEYS.RECENT, limited);
  },

  saveFavorites: (favorites: string[]): void => {
    entityStorage.set(ENTITY_STORAGE_KEYS.FAVORITES, favorites);
  },

  loadFavorites: (): string[] => {
    return entityStorage.get(ENTITY_STORAGE_KEYS.FAVORITES, []);
  }
};

/**
 * Utilitaires pour les notifications spécialisées
 */
export const createEntityNotification = (
  type: 'success' | 'error' | 'warning' | 'info' | 'migration' | 'validation',
  title: string,
  message: string,
  duration?: number,
  entityId?: string,
  schemaName?: string,
  actions?: any[]
) => ({
  id: generateEntityId(),
  type,
  title,
  message,
  timestamp: new Date().toISOString(),
  duration: duration ?? DEFAULT_ENTITY_CONFIG.notifications.defaultDuration,
  entityId,
  schemaName,
  actions
});

export const createMigrationAlert = (
  schemaName: string,
  outdatedCount: number,
  fromVersion: string,
  toVersion: string,
  canAutoMigrate: boolean,
  severity: 'info' | 'warning' | 'critical' = 'warning'
) => ({
  id: generateEntityId(),
  schemaName,
  outdatedCount,
  fromVersion,
  toVersion,
  canAutoMigrate,
  severity,
  createdAt: new Date().toISOString()
});

export const createValidationAlert = (
  entityId: string,
  schemaName: string,
  errorCount: number,
  warningCount: number,
  isBlockingEdit: boolean = false
) => ({
  id: generateEntityId(),
  entityId,
  schemaName,
  errorCount,
  warningCount,
  lastValidated: new Date().toISOString(),
  isBlockingEdit
});

/**
 * Debounce utility optimisé pour les entités
 */
export const debounceEntity = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): T => {
  let timeout: NodeJS.Timeout;
  let result: any;

  return ((...args: any[]) => {
    const later = () => {
      timeout = null!;
      if (!immediate) result = func.apply(null, args);
    };

    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) result = func.apply(null, args);
    return result;
  }) as T;
};

/**
 * Utilitaires pour la navigation et l'historique
 */
export const createNavigationEntry = (
  entityId: string | undefined,
  schemaName: string,
  view: string,
  title: string
) => ({
  entityId,
  schemaName,
  view,
  title,
  timestamp: new Date().toISOString()
});

export const createBreadcrumbItem = (
  label: string,
  path: string,
  action?: () => void,
  isActive: boolean = false
) => ({
  label,
  path,
  action,
  isActive
});

/**
 * Utilitaires pour la manipulation de données JSON
 */
export const getValueByPath = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

export const setValueByPath = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
};

export const deleteValueByPath = (obj: any, path: string): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => current?.[key], obj);
  if (target && typeof target === 'object') {
    delete target[lastKey];
  }
};

/**
 * Utilitaires pour la gestion des erreurs
 */
export const createEntityError = (message: string, code?: string, context?: any) => ({
  message,
  code,
  context,
  timestamp: new Date().toISOString()
});

export const formatValidationError = (error: any, path: string): string => {
  if (typeof error === 'string') return error;
  if (error.message) return `${path}: ${error.message}`;
  return `Erreur de validation à ${path}`;
};