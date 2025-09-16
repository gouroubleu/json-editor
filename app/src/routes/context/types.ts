// Types pour le contexte dynamique du SchemaEditor
import type { Signal } from '@builder.io/qwik';
import type {
  SchemaProperty,
  SchemaInfo,
  JsonSchemaOutput,
  VersionedSchema,
  SchemaEditorState
} from '../types';
import type { DraftSchema } from '../localStorage';

// ===== ÉTATS DU CONTEXTE =====

export interface SchemaEditorContextState {
  // État principal du schéma en cours d'édition
  currentSchema: SchemaEditorState;

  // Liste des schémas chargés avec métadonnées
  schemas: LoadedSchema[];

  // État de l'interface utilisateur
  ui: UIState;

  // Système de cache intelligent
  cache: CacheState;

  // Gestion des brouillons
  drafts: DraftsState;

  // États de chargement et notifications
  loading: LoadingState;
  notifications: NotificationState;
}

export interface LoadedSchema {
  name: string;
  schema: JsonSchemaOutput;
  createdAt: string;
  updatedAt: string;
  version?: string;
  versionInfo?: any;
  // Métadonnées du cache
  lastAccessed?: string;
  isModified?: boolean;
}

export interface UIState {
  // Navigation et sélection
  selectedSchemaName: string | null;
  selectedPropertyId: string | null;

  // États d'expansion des propriétés
  expandedProperties: Set<string>;

  // Mode d'édition
  editMode: 'create' | 'edit' | 'view';

  // Vue active
  activeView: 'list' | 'editor' | 'preview' | 'bdd';

  // Filtres et recherche
  searchQuery: string;
  filters: SchemaFilters;

  // État de la sidebar et panels
  sidebarCollapsed: boolean;
  activePanel: 'properties' | 'preview' | 'history' | 'settings';

  // Validation en temps réel
  validationEnabled: boolean;
  showValidationErrors: boolean;
}

export interface SchemaFilters {
  type?: 'object' | 'array';
  hasErrors?: boolean;
  version?: string;
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface CacheState {
  // Dernière synchronisation
  lastSync: string | null;

  // Schémas en cache avec timestamp
  cachedSchemas: Map<string, CachedSchemaEntry>;

  // Queue des invalidations
  invalidationQueue: string[];

  // Configuration du cache
  maxCacheSize: number;
  ttl: number; // Time To Live en millisecondes
}

export interface CachedSchemaEntry {
  schema: LoadedSchema;
  timestamp: string;
  accessCount: number;
  lastAccessed: string;
  isDirty: boolean;
}

export interface DraftsState {
  // Brouillons par nom de schéma
  drafts: Map<string, SchemaDraft>;

  // Auto-save configuration
  autoSaveEnabled: boolean;
  autoSaveInterval: number;

  // Dernière sauvegarde automatique
  lastAutoSave: string | null;
}

export interface SchemaDraft {
  name: string;
  schemaInfo: SchemaInfo;
  properties: SchemaProperty[];
  originalSchemaName?: string; // Pour les éditions
  createdAt: string;
  updatedAt: string;
  autoSaved: boolean;
}

export interface LoadingState {
  // États de chargement globaux
  isLoading: boolean;
  isLoadingSchemas: boolean;
  isSaving: boolean;
  isValidating: boolean;
  isGenerating: boolean;

  // Chargements spécifiques
  loadingOperations: Map<string, LoadingOperation>;
}

export interface LoadingOperation {
  id: string;
  type: 'load' | 'save' | 'delete' | 'validate' | 'generate';
  message: string;
  progress?: number; // 0-100
  startTime: string;
}

export interface NotificationState {
  notifications: AppNotification[];
  maxNotifications: number;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  duration?: number; // Auto-dismiss après X millisecondes
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

// ===== ACTIONS DU CONTEXTE =====

export interface SchemaEditorActions {
  // === GESTION DES SCHÉMAS ===
  schemas: {
    // CRUD opérations
    loadAll: () => Promise<void>;
    loadById: (name: string) => Promise<LoadedSchema | null>;
    create: (schemaInfo: SchemaInfo, properties: SchemaProperty[]) => Promise<{ success: boolean; message: string; version?: string }>;
    update: (originalName: string, name: string, schemaInfo: SchemaInfo, properties: SchemaProperty[]) => Promise<{ success: boolean; message: string; version?: string }>;
    delete: (name: string) => Promise<{ success: boolean; message: string }>;
    duplicate: (originalName: string, newName: string) => Promise<{ success: boolean; message: string }>;

    // Sélection et navigation
    select: (name: string | null) => Promise<void>;
    selectProperty: (propertyId: string | null) => void;

    // Validation
    validate: (schema?: JsonSchemaOutput) => Promise<{ isValid: boolean; errors: string[] }>;
    generateSchema: (schemaInfo: SchemaInfo, properties: SchemaProperty[]) => Promise<JsonSchemaOutput>;
  };

  // === GESTION DES PROPRIÉTÉS ===
  properties: {
    // CRUD sur les propriétés
    add: (property: Omit<SchemaProperty, 'id'>, parentId?: string) => void;
    update: (propertyId: string, updates: Partial<SchemaProperty>) => void;
    delete: (propertyId: string) => void;
    move: (propertyId: string, newIndex: number, parentId?: string) => void;
    duplicate: (propertyId: string) => void;

    // Navigation dans l'arbre
    expand: (propertyId: string) => void;
    collapse: (propertyId: string) => void;
    toggleExpansion: (propertyId: string) => void;
    expandAll: () => void;
    collapseAll: () => void;

    // Recherche et filtrage
    search: (query: string) => SchemaProperty[];
    filter: (predicate: (property: SchemaProperty) => boolean) => SchemaProperty[];
  };

  // === GESTION DU CACHE ===
  cache: {
    // Gestion manuelle
    invalidate: (schemaName?: string) => void;
    invalidateAll: () => void;
    refresh: (schemaName: string) => Promise<void>;

    // Configuration
    setTTL: (ttl: number) => void;
    setMaxSize: (maxSize: number) => void;

    // Nettoyage
    cleanup: () => void;
    clearExpired: () => void;

    // Statistiques
    getStats: () => CacheStats;
  };

  // === GESTION DES BROUILLONS ===
  drafts: {
    // CRUD brouillons
    save: (name: string, schemaInfo: SchemaInfo, properties: SchemaProperty[], originalSchemaName?: string) => void;
    load: (name: string) => SchemaDraft | null;
    delete: (name: string) => void;
    list: () => SchemaDraft[];

    // Auto-save
    enableAutoSave: (interval?: number) => void;
    disableAutoSave: () => void;
    triggerAutoSave: () => void;

    // Restauration
    restoreFromDraft: (draftName: string) => void;
    hasDraft: (schemaName: string) => boolean;
    getDraftChanges: (draftName: string, originalSchema?: LoadedSchema) => PropertyChange[];
  };

  // === GESTION DE L'UI ===
  ui: {
    // Navigation
    setActiveView: (view: UIState['activeView']) => void;
    setActivePanel: (panel: UIState['activePanel']) => void;
    toggleSidebar: () => void;

    // Mode d'édition
    setEditMode: (mode: UIState['editMode']) => void;

    // Recherche et filtres
    setSearchQuery: (query: string) => void;
    setFilters: (filters: Partial<SchemaFilters>) => void;
    clearFilters: () => void;

    // Validation
    toggleValidation: () => void;
    showValidationErrors: (show: boolean) => void;
  };

  // === GESTION DES NOTIFICATIONS ===
  notifications: {
    // Ajout de notifications
    success: (title: string, message: string, duration?: number) => string;
    error: (title: string, message: string, actions?: NotificationAction[]) => string;
    warning: (title: string, message: string, duration?: number) => string;
    info: (title: string, message: string, duration?: number) => string;

    // Gestion
    dismiss: (id: string) => void;
    dismissAll: () => void;

    // Auto-dismiss
    setMaxNotifications: (max: number) => void;
  };

  // === ACTIONS UTILITAIRES ===
  utils: {
    // Import/Export
    exportSchema: (name: string, format: 'json' | 'yaml') => string;
    importSchema: (content: string, format: 'json' | 'yaml') => Promise<{ success: boolean; schema?: LoadedSchema; errors?: string[] }>;

    // Reset et nettoyage
    reset: () => void;
    clearAllData: () => void;

    // Sync et backup
    syncWithServer: () => Promise<void>;
    createBackup: () => Promise<string>; // Retourne l'ID du backup
    restoreBackup: (backupId: string) => Promise<void>;
  };
}

// ===== TYPES AUXILIAIRES =====

export interface PropertyChange {
  type: 'added' | 'modified' | 'deleted';
  propertyId: string;
  propertyName: string;
  oldValue?: any;
  newValue?: any;
  path: string[];
}

export interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  hitRate: number;
  missRate: number;
  avgAccessTime: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

// ===== CONFIGURATION DU CONTEXTE =====

export interface SchemaEditorContextConfig {
  // Configuration du cache
  cache: {
    ttl: number;
    maxSize: number;
    enablePersistence: boolean;
  };

  // Configuration des brouillons
  drafts: {
    autoSaveEnabled: boolean;
    autoSaveInterval: number;
    maxDrafts: number;
  };

  // Configuration des notifications
  notifications: {
    maxNotifications: number;
    defaultDuration: number;
    enableSound: boolean;
  };

  // Configuration de l'UI
  ui: {
    defaultView: UIState['activeView'];
    defaultPanel: UIState['activePanel'];
    enableValidation: boolean;
    debounceTime: number;
  };
}

// ===== HOOKS ET SIGNAL TYPES =====

export interface SchemaEditorContextValue {
  // État réactif
  state: SchemaEditorContextState;

  // Actions
  actions: SchemaEditorActions;

  // Configuration
  config: Signal<SchemaEditorContextConfig>;

  // Signaux dérivés pour l'optimisation
  signals: {
    currentSchemaSignal: Signal<SchemaEditorState>;
    uiStateSignal: Signal<UIState>;
    loadingSignal: Signal<boolean>;
    notificationsSignal: Signal<AppNotification[]>;
    draftsSignal: Signal<SchemaDraft[]>;
  };
}

// Export des types de base pour la compatibilité
export type { SchemaProperty, SchemaInfo, JsonSchemaOutput, VersionedSchema, SchemaEditorState } from '../types';
export type { DraftSchema } from '../localStorage';