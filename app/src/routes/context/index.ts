/**
 * Point d'entrée pour le contexte SchemaEditor
 *
 * Ce module exporte tous les éléments nécessaires pour utiliser le contexte SchemaEditor
 * dans l'application Qwik.
 */

// ===== EXPORTS PRINCIPAUX DU CONTEXTE =====

// Provider et contexte principal
export {
  SchemaEditorProvider,
  useSchemaEditor,
  SchemaEditorContext
} from './provider';

// ===== EXPORTS DES TYPES =====

// Types principaux du contexte
export type {
  SchemaEditorContextState,
  SchemaEditorActions,
  SchemaEditorContextValue,
  SchemaEditorContextConfig,
  LoadedSchema,
  UIState,
  CacheState,
  DraftsState,
  LoadingState,
  NotificationState,
  AppNotification,
  NotificationAction,
  SchemaDraft,
  SchemaFilters,
  PropertyChange,
  CacheStats,
  CachedSchemaEntry,
  LoadingOperation
} from './types';

// Types de base réexportés pour la compatibilité
export type {
  SchemaProperty,
  SchemaInfo,
  JsonSchemaOutput,
  VersionedSchema,
  SchemaEditorState,
  JsonSchemaType
} from '../types';

export type {
  DraftSchema
} from '../localStorage';

// ===== EXPORTS DES HOOKS SPÉCIALISÉS =====

// Hooks principaux
export {
  useSchemaEditorContext,
  useSchemas,
  useSchemaValidation,
  useSchemaProperties,
  usePropertyNavigation,
  useSchemaCache,
  useDraftManager,
  useNotifications,
  useSchemaEditorUI,
  useSchemaImportExport,
  useSchemaSynchronization
} from './hooks';

// Types des options pour les hooks
export type {
  AutoSaveOptions,
  ValidationOptions,
  CacheOptions
} from './hooks';

// ===== EXPORTS DES UTILITAIRES =====

// Utilitaires de conversion
export {
  jsonSchemaToProperties,
  propertiesToJsonSchema,
  cloneProperties,
  cloneProperty,
  findPropertyByPath,
  findPropertyById,
  getPropertyPath,
  validateProperty,
  validateProperties,
  getMaxDepth,
  countProperties,
  flattenProperties,
  filterProperties,
  generatePropertyId,
  createEmptyProperty,
  createObjectProperty,
  createArrayProperty,
  isValidJsonSchemaType,
  hasChildren,
  isLeafProperty,
  formatPropertyName,
  generatePropertyDescription
} from './utils';

// Constantes utilitaires
export {
  SCHEMA_CONSTANTS,
  PROPERTY_TYPES,
  STRING_FORMATS
} from './utils';

// ===== CONSTANTES DE CONFIGURATION =====

export const SCHEMA_EDITOR_CONSTANTS = {
  // Configuration par défaut du cache
  DEFAULT_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  DEFAULT_CACHE_MAX_SIZE: 50,

  // Configuration par défaut des brouillons
  DEFAULT_AUTO_SAVE_DELAY: 2000, // 2 secondes
  DEFAULT_MAX_DRAFTS: 10,

  // Configuration par défaut des notifications
  DEFAULT_NOTIFICATION_DURATION: 5000, // 5 secondes
  DEFAULT_MAX_NOTIFICATIONS: 5,

  // Configuration par défaut de l'UI
  DEFAULT_DEBOUNCE_TIME: 300, // 300ms
  DEFAULT_VALIDATION_DEBOUNCE: 500, // 500ms

  // Limites et seuils
  MAX_HISTORY_SIZE: 20,
  SYNC_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  CACHE_CLEANUP_INTERVAL: 60 * 1000, // 1 minute

  // Identifiants de stockage
  STORAGE_KEYS: {
    DRAFT: 'schema-editor-draft',
    DRAFTS_LIST: 'schema-editor-drafts-list',
    CONFIG: 'schema-editor-config',
    CACHE: 'schema-editor-cache'
  }
} as const;

// ===== TYPES UTILITAIRES POUR L'UTILISATION =====

/**
 * Options de configuration pour l'initialisation du SchemaEditor
 */
export interface SchemaEditorInitOptions {
  // Configuration du cache
  cache?: {
    ttl?: number;
    maxSize?: number;
    enablePersistence?: boolean;
  };

  // Configuration des brouillons
  drafts?: {
    autoSaveEnabled?: boolean;
    autoSaveInterval?: number;
    maxDrafts?: number;
  };

  // Configuration des notifications
  notifications?: {
    maxNotifications?: number;
    defaultDuration?: number;
    enableSound?: boolean;
  };

  // Configuration de l'UI
  ui?: {
    defaultView?: UIState['activeView'];
    defaultPanel?: UIState['activePanel'];
    enableValidation?: boolean;
    debounceTime?: number;
  };
}

/**
 * Options pour les hooks avec des configurations communes
 */
export interface SchemaEditorHookOptions {
  autoSave?: boolean;
  autoSaveDelay?: number;
  enableNotifications?: boolean;
  enableValidation?: boolean;
  debounceTime?: number;
}

/**
 * Type pour les gestionnaires d'événements du SchemaEditor
 */
export interface SchemaEditorEventHandlers {
  onSchemaCreated?: (schema: LoadedSchema) => void;
  onSchemaUpdated?: (schema: LoadedSchema) => void;
  onSchemaDeleted?: (schemaName: string) => void;
  onValidationError?: (errors: string[]) => void;
  onDraftSaved?: (draft: SchemaDraft) => void;
  onNotification?: (notification: AppNotification) => void;
}

/**
 * Résultat d'une opération asynchrone du SchemaEditor
 */
export interface SchemaEditorOperationResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  version?: string;
}

// ===== FONCTIONS UTILITAIRES PUBLIQUES =====

/**
 * Crée une configuration par défaut pour le SchemaEditor
 */
export const createDefaultConfig = (
  overrides?: Partial<SchemaEditorInitOptions>
): SchemaEditorContextConfig => {
  return {
    cache: {
      ttl: overrides?.cache?.ttl ?? SCHEMA_EDITOR_CONSTANTS.DEFAULT_CACHE_TTL,
      maxSize: overrides?.cache?.maxSize ?? SCHEMA_EDITOR_CONSTANTS.DEFAULT_CACHE_MAX_SIZE,
      enablePersistence: overrides?.cache?.enablePersistence ?? true
    },
    drafts: {
      autoSaveEnabled: overrides?.drafts?.autoSaveEnabled ?? true,
      autoSaveInterval: overrides?.drafts?.autoSaveInterval ?? SCHEMA_EDITOR_CONSTANTS.DEFAULT_AUTO_SAVE_DELAY,
      maxDrafts: overrides?.drafts?.maxDrafts ?? SCHEMA_EDITOR_CONSTANTS.DEFAULT_MAX_DRAFTS
    },
    notifications: {
      maxNotifications: overrides?.notifications?.maxNotifications ?? SCHEMA_EDITOR_CONSTANTS.DEFAULT_MAX_NOTIFICATIONS,
      defaultDuration: overrides?.notifications?.defaultDuration ?? SCHEMA_EDITOR_CONSTANTS.DEFAULT_NOTIFICATION_DURATION,
      enableSound: overrides?.notifications?.enableSound ?? false
    },
    ui: {
      defaultView: overrides?.ui?.defaultView ?? 'list',
      defaultPanel: overrides?.ui?.defaultPanel ?? 'properties',
      enableValidation: overrides?.ui?.enableValidation ?? true,
      debounceTime: overrides?.ui?.debounceTime ?? SCHEMA_EDITOR_CONSTANTS.DEFAULT_DEBOUNCE_TIME
    }
  };
};

/**
 * Valide une configuration du SchemaEditor
 */
export const validateConfig = (config: SchemaEditorContextConfig): string[] => {
  const errors: string[] = [];

  // Validation du cache
  if (config.cache.ttl <= 0) {
    errors.push('Le TTL du cache doit être positif');
  }
  if (config.cache.maxSize <= 0) {
    errors.push('La taille maximale du cache doit être positive');
  }

  // Validation des brouillons
  if (config.drafts.autoSaveInterval <= 0) {
    errors.push('L\'intervalle d\'auto-sauvegarde doit être positif');
  }
  if (config.drafts.maxDrafts <= 0) {
    errors.push('Le nombre maximum de brouillons doit être positif');
  }

  // Validation des notifications
  if (config.notifications.maxNotifications <= 0) {
    errors.push('Le nombre maximum de notifications doit être positif');
  }
  if (config.notifications.defaultDuration <= 0) {
    errors.push('La durée par défaut des notifications doit être positive');
  }

  // Validation de l'UI
  if (config.ui.debounceTime < 0) {
    errors.push('Le temps de débounce ne peut pas être négatif');
  }

  return errors;
};

/**
 * Crée un schéma de propriété vierge avec des valeurs par défaut intelligentes
 */
export const createEmptySchema = (name: string = 'nouveau-schema'): {
  schemaInfo: SchemaInfo;
  properties: SchemaProperty[];
} => {
  return {
    schemaInfo: {
      name,
      title: name.charAt(0).toUpperCase() + name.slice(1),
      description: `Schéma ${name} créé automatiquement`,
      type: 'object'
    },
    properties: []
  };
};

// ===== VERSION ET MÉTADONNÉES =====

export const SCHEMA_EDITOR_VERSION = '1.0.0';
export const SCHEMA_EDITOR_AUTHOR = 'SchemaEditor Context Team';

/**
 * Informations sur la version du contexte SchemaEditor
 */
export const getSchemaEditorInfo = () => ({
  version: SCHEMA_EDITOR_VERSION,
  author: SCHEMA_EDITOR_AUTHOR,
  features: [
    'Gestion complète des schémas JSON',
    'Cache intelligent avec TTL',
    'Auto-sauvegarde des brouillons',
    'Système de notifications',
    'Validation en temps réel',
    'Import/Export JSON et YAML',
    'Navigation dans l\'arbre des propriétés',
    'Hooks spécialisés pour tous les cas d\'usage'
  ],
  constants: SCHEMA_EDITOR_CONSTANTS
});

// ===== EXPORT PAR DÉFAUT =====

/**
 * Export par défaut pour une utilisation simplifiée
 */
export default {
  Provider: SchemaEditorProvider,
  useContext: useSchemaEditor,
  hooks: {
    useSchemas,
    useSchemaValidation,
    useSchemaProperties,
    usePropertyNavigation,
    useSchemaCache,
    useDraftManager,
    useNotifications,
    useSchemaEditorUI,
    useSchemaImportExport,
    useSchemaSynchronization
  },
  utils: {
    jsonSchemaToProperties,
    propertiesToJsonSchema,
    cloneProperties,
    validateProperty,
    validateProperties,
    createEmptyProperty,
    createObjectProperty,
    createArrayProperty,
    generatePropertyId
  },
  constants: SCHEMA_EDITOR_CONSTANTS,
  createDefaultConfig,
  validateConfig,
  createEmptySchema,
  getSchemaEditorInfo
};