// Types pour le contexte des entités BDD
import type { Signal } from '@builder.io/qwik';
import type {
  EntityData,
  EntitySummary,
  EntityListResponse,
  EntityFilters,
  CreateEntityRequest,
  UpdateEntityRequest,
  EntityValidationResult,
  MigrationResult
} from '../types';
import type { SchemaEditorContextValue } from '../../context/types';

// ===== ÉTATS DU CONTEXTE ENTITÉS =====

export interface EntityContextState {
  // Liste des résumés d'entités par schéma
  summaries: EntitySummary[];

  // Entités actuellement chargées
  entities: EntityData[];

  // Métadonnées de pagination
  pagination: PaginationState;

  // Entité actuellement sélectionnée/éditée
  currentEntity: EntityData | null;

  // État de l'interface utilisateur
  ui: EntityUIState;

  // États de chargement
  loading: EntityLoadingState;

  // Notifications spécifiques aux entités
  notifications: EntityNotification[];

  // Filtres actifs
  filters: EntityFilters;
}

export interface PaginationState {
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  offset: number;
}

export interface EntityUIState {
  // Vue active
  activeView: 'summary' | 'list' | 'editor' | 'viewer';

  // Mode d'édition
  editMode: 'create' | 'edit' | 'view';

  // Schéma sélectionné pour créer/lister des entités
  selectedSchemaName: string | null;

  // Entité sélectionnée pour édition
  selectedEntityId: string | null;

  // Sidebar et panels
  sidebarCollapsed: boolean;
  activePanel: 'properties' | 'validation' | 'history';

  // Recherche et filtres
  searchQuery: string;
  showFilters: boolean;

  // États d'expansion
  expandedSummaries: Set<string>;

  // Validation en temps réel
  validationEnabled: boolean;
  showValidationErrors: boolean;

  // Confirmations
  pendingConfirmation: PendingConfirmation | null;
}

export interface PendingConfirmation {
  type: 'delete' | 'migrate' | 'overwrite';
  title: string;
  message: string;
  entityId?: string;
  schemaName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface EntityLoadingState {
  // États globaux
  isLoadingSummaries: boolean;
  isLoadingEntities: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isMigrating: boolean;
  isValidating: boolean;

  // Opérations spécifiques avec ID
  loadingOperations: Map<string, EntityLoadingOperation>;
}

export interface EntityLoadingOperation {
  id: string;
  type: 'load' | 'create' | 'update' | 'delete' | 'migrate' | 'validate';
  entityId?: string;
  schemaName?: string;
  message: string;
  progress?: number;
  startTime: string;
}

export interface EntityNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  duration?: number;
  entityId?: string;
  schemaName?: string;
  actions?: EntityNotificationAction[];
}

export interface EntityNotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

// ===== ACTIONS DU CONTEXTE ENTITÉS =====

export interface EntityContextActions {
  // === GESTION DES RÉSUMÉS ===
  summaries: {
    // Chargement
    loadAll: () => Promise<void>;
    refresh: () => Promise<void>;

    // Navigation
    expandSummary: (schemaName: string) => void;
    collapseSummary: (schemaName: string) => void;
    toggleSummary: (schemaName: string) => void;
    expandAll: () => void;
    collapseAll: () => void;

    // Actions groupées
    migrateSchema: (schemaName: string) => Promise<MigrationResult>;
  };

  // === GESTION DES ENTITÉS ===
  entities: {
    // CRUD operations
    loadList: (filters?: EntityFilters) => Promise<void>;
    loadById: (entityId: string) => Promise<EntityData | null>;
    create: (request: CreateEntityRequest) => Promise<{ success: boolean; message: string; entityId?: string }>;
    update: (entityId: string, request: UpdateEntityRequest) => Promise<{ success: boolean; message: string }>;
    delete: (entityId: string) => Promise<{ success: boolean; message: string }>;
    duplicate: (entityId: string) => Promise<{ success: boolean; message: string; newEntityId?: string }>;

    // Sélection et navigation
    select: (entityId: string | null) => Promise<void>;
    selectForEdit: (entityId: string) => Promise<void>;
    selectForView: (entityId: string) => Promise<void>;

    // Validation
    validate: (entityData: Record<string, any>, schemaName: string) => Promise<EntityValidationResult>;
    validateCurrent: () => Promise<EntityValidationResult>;

    // Navigation par pages
    nextPage: () => Promise<void>;
    prevPage: () => Promise<void>;
    goToPage: (page: number) => Promise<void>;
    setPageSize: (pageSize: number) => Promise<void>;
  };

  // === GESTION DES FILTRES ===
  filters: {
    // Configuration des filtres
    setSchemaName: (schemaName: string | undefined) => void;
    setVersion: (version: string | undefined) => void;
    setSearchQuery: (query: string) => void;
    setLimit: (limit: number) => void;
    setOffset: (offset: number) => void;

    // Actions groupées
    setFilters: (filters: Partial<EntityFilters>) => void;
    clearFilters: () => void;
    resetPagination: () => void;

    // Application
    applyFilters: () => Promise<void>;
  };

  // === GESTION DE L'UI ===
  ui: {
    // Navigation
    setActiveView: (view: EntityUIState['activeView']) => void;
    setEditMode: (mode: EntityUIState['editMode']) => void;
    setActivePanel: (panel: EntityUIState['activePanel']) => void;

    // Sélection
    selectSchema: (schemaName: string | null) => void;

    // Interface
    toggleSidebar: () => void;
    toggleFilters: () => void;

    // Validation
    toggleValidation: () => void;
    showValidationErrors: (show: boolean) => void;

    // Confirmations
    showConfirmation: (confirmation: Omit<PendingConfirmation, 'onConfirm' | 'onCancel'> & {
      onConfirm: () => void;
      onCancel?: () => void;
    }) => void;
    hideConfirmation: () => void;
    confirmPending: () => void;
    cancelPending: () => void;
  };

  // === GESTION DES NOTIFICATIONS ===
  notifications: {
    // Ajout de notifications
    success: (title: string, message: string, options?: EntityNotificationOptions) => string;
    error: (title: string, message: string, options?: EntityNotificationOptions) => string;
    warning: (title: string, message: string, options?: EntityNotificationOptions) => string;
    info: (title: string, message: string, options?: EntityNotificationOptions) => string;

    // Gestion
    dismiss: (id: string) => void;
    dismissAll: () => void;
    dismissByEntity: (entityId: string) => void;
    dismissBySchema: (schemaName: string) => void;
  };

  // === ACTIONS UTILITAIRES ===
  utils: {
    // Génération de valeurs par défaut
    generateDefaultValues: (schemaName: string) => Promise<Record<string, any>>;

    // Validation de schéma
    getSchemaValidation: (schemaName: string) => Promise<{ isValid: boolean; errors: string[] }>;

    // Navigation intelligente
    navigateToEntity: (entityId: string) => Promise<void>;
    navigateToSchema: (schemaName: string) => Promise<void>;
    navigateBack: () => void;

    // Recherche avancée
    searchEntities: (query: string, options?: SearchOptions) => Promise<EntityData[]>;

    // Export/Import
    exportEntities: (schemaName?: string, format?: 'json' | 'csv') => Promise<string>;

    // Reset
    reset: () => void;
    clearCache: () => void;
  };
}

// ===== TYPES AUXILIAIRES =====

export interface EntityNotificationOptions {
  duration?: number;
  entityId?: string;
  schemaName?: string;
  actions?: EntityNotificationAction[];
}

export interface SearchOptions {
  schemaName?: string;
  includeData?: boolean;
  limit?: number;
  fuzzy?: boolean;
}

// ===== INTÉGRATION AVEC SCHEMA EDITOR =====

export interface EntityContextConfig {
  // Configuration de la pagination
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };

  // Configuration des notifications
  notifications: {
    maxNotifications: number;
    defaultDuration: number;
  };

  // Configuration de la validation
  validation: {
    enableRealTime: boolean;
    debounceTime: number;
  };

  // Configuration de l'UI
  ui: {
    defaultView: EntityUIState['activeView'];
    defaultPanel: EntityUIState['activePanel'];
    autoExpandSummaries: boolean;
  };
}

export interface EntityContextValue {
  // État réactif
  state: EntityContextState;

  // Actions
  actions: EntityContextActions;

  // Configuration
  config: Signal<EntityContextConfig>;

  // Référence au contexte parent SchemaEditor
  schemaContext: SchemaEditorContextValue;

  // Signaux dérivés pour l'optimisation
  signals: {
    summariesSignal: Signal<EntitySummary[]>;
    entitiesSignal: Signal<EntityData[]>;
    currentEntitySignal: Signal<EntityData | null>;
    uiStateSignal: Signal<EntityUIState>;
    loadingSignal: Signal<boolean>;
    notificationsSignal: Signal<EntityNotification[]>;
    filtersSignal: Signal<EntityFilters>;
    paginationSignal: Signal<PaginationState>;
  };
}

// ===== TYPES DE PROPS POUR LES COMPOSANTS =====

export interface EntityProviderProps {
  // Configuration optionnelle
  config?: Partial<EntityContextConfig>;

  // Référence au contexte SchemaEditor
  schemaContext: SchemaEditorContextValue;

  // Enfants
  children?: any;
}

export interface EntityListProps {
  schemaName?: string;
  filters?: Partial<EntityFilters>;
  onEntitySelect?: (entity: EntityData) => void;
  onEntityEdit?: (entity: EntityData) => void;
  onEntityDelete?: (entity: EntityData) => void;
}

export interface EntityEditorProps {
  entityId?: string;
  schemaName?: string;
  mode?: 'create' | 'edit' | 'view';
  onSave?: (entity: EntityData) => void;
  onCancel?: () => void;
  onDelete?: (entityId: string) => void;
}

export interface EntitySummaryProps {
  summary: EntitySummary;
  onExpand?: (schemaName: string) => void;
  onCollapse?: (schemaName: string) => void;
  onMigrate?: (schemaName: string) => void;
  onViewEntities?: (schemaName: string) => void;
}

// Export de compatibilité
export type {
  EntityData,
  EntitySummary,
  EntityListResponse,
  EntityFilters,
  CreateEntityRequest,
  UpdateEntityRequest,
  EntityValidationResult,
  MigrationResult
} from '../types';