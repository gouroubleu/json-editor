// Point d'entrée principal pour le contexte des entités BDD
// Exports centralisés pour faciliter l'importation dans les composants

// ===== EXPORTS PRINCIPAUX =====

// Provider et contexte
export { EntityProvider, EntityContext } from './provider';

// Types principaux
export type {
  EntityContextValue,
  EntityContextState,
  EntityContextActions,
  EntityContextConfig,
  EntityProviderProps
} from './types';

// Types d'interface utilisateur
export type {
  EntityUIState,
  PaginationState,
  EntityLoadingState,
  EntityNotification,
  EntityNotificationAction,
  PendingConfirmation
} from './types';

// Types pour les composants
export type {
  EntityListProps,
  EntityEditorProps,
  EntitySummaryProps
} from './types';

// Types utilitaires
export type {
  EntityNotificationOptions,
  SearchOptions
} from './types';

// Hooks spécialisés
export {
  useEntityContext,
  useEntitySummaries,
  useEntityList,
  useCurrentEntity,
  useEntityUI,
  useEntityNotifications,
  useEntityForm,
  useEntitySearch,
  usePagination,
  useEntityFilters,
  useEntityLoading,
  useEntityActions,
  useSchemaIntegration
} from './hooks';

// Utilitaires
export {
  validateSchemaName,
  validateEntityDataBasic,
  formatEntityForDisplay,
  formatValueForDisplay,
  filtersToQueryParams,
  queryParamsToFilters,
  getEntityUrl,
  getSchemaEntitiesUrl,
  parseEntityUrl,
  compareEntities,
  deepEqual,
  deepClone,
  searchInEntity,
  searchInObject,
  calculatePagination,
  generatePageRange,
  entitiesToCSV,
  generateExportFilename,
  debounce,
  throttle
} from './utils';

// ===== TYPES DE COMPATIBILITÉ =====

// Re-export des types de base pour éviter les imports multiples
export type {
  EntityData,
  EntitySummary,
  EntityListResponse,
  EntityFilters,
  CreateEntityRequest,
  UpdateEntityRequest,
  EntityValidationResult,
  MigrationResult,
  EntityMetadata
} from '../types';

// ===== CONSTANTES ET CONFIGURATIONS =====

/**
 * Configuration par défaut pour le contexte des entités
 */
export const DEFAULT_ENTITY_CONFIG: EntityContextConfig = {
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100
  },
  notifications: {
    maxNotifications: 5,
    defaultDuration: 5000
  },
  validation: {
    enableRealTime: true,
    debounceTime: 300
  },
  ui: {
    defaultView: 'summary',
    defaultPanel: 'properties',
    autoExpandSummaries: false
  }
};

/**
 * Tailles de page prédéfinies pour la pagination
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/**
 * Types de vues disponibles
 */
export const VIEW_TYPES = ['summary', 'list', 'editor', 'viewer'] as const;

/**
 * Types de panels disponibles
 */
export const PANEL_TYPES = ['properties', 'validation', 'history'] as const;

/**
 * Types de notifications
 */
export const NOTIFICATION_TYPES = ['success', 'error', 'warning', 'info'] as const;

/**
 * Formats d'export supportés
 */
export const EXPORT_FORMATS = ['json', 'csv'] as const;

// ===== UTILITAIRES D'INITIALISATION =====

/**
 * Crée une configuration par défaut avec des overrides optionnels
 */
export const createEntityConfig = (
  overrides?: Partial<EntityContextConfig>
): EntityContextConfig => {
  return {
    ...DEFAULT_ENTITY_CONFIG,
    ...overrides,
    pagination: {
      ...DEFAULT_ENTITY_CONFIG.pagination,
      ...overrides?.pagination
    },
    notifications: {
      ...DEFAULT_ENTITY_CONFIG.notifications,
      ...overrides?.notifications
    },
    validation: {
      ...DEFAULT_ENTITY_CONFIG.validation,
      ...overrides?.validation
    },
    ui: {
      ...DEFAULT_ENTITY_CONFIG.ui,
      ...overrides?.ui
    }
  };
};

/**
 * Valide une configuration d'entité
 */
export const validateEntityConfig = (
  config: Partial<EntityContextConfig>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (config.pagination) {
    if (config.pagination.defaultPageSize && config.pagination.defaultPageSize <= 0) {
      errors.push('La taille de page par défaut doit être positive');
    }
    if (config.pagination.maxPageSize && config.pagination.maxPageSize <= 0) {
      errors.push('La taille de page maximale doit être positive');
    }
    if (
      config.pagination.defaultPageSize &&
      config.pagination.maxPageSize &&
      config.pagination.defaultPageSize > config.pagination.maxPageSize
    ) {
      errors.push('La taille de page par défaut ne peut pas dépasser la taille maximale');
    }
  }

  if (config.notifications) {
    if (config.notifications.maxNotifications && config.notifications.maxNotifications <= 0) {
      errors.push('Le nombre maximum de notifications doit être positif');
    }
    if (config.notifications.defaultDuration && config.notifications.defaultDuration <= 0) {
      errors.push('La durée par défaut des notifications doit être positive');
    }
  }

  if (config.validation) {
    if (config.validation.debounceTime && config.validation.debounceTime < 0) {
      errors.push('Le temps de debounce doit être positif ou nul');
    }
  }

  if (config.ui) {
    if (config.ui.defaultView && !VIEW_TYPES.includes(config.ui.defaultView as any)) {
      errors.push(`Vue par défaut invalide: ${config.ui.defaultView}`);
    }
    if (config.ui.defaultPanel && !PANEL_TYPES.includes(config.ui.defaultPanel as any)) {
      errors.push(`Panel par défaut invalide: ${config.ui.defaultPanel}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ===== HELPERS POUR LES COMPOSANTS =====

/**
 * Crée des props par défaut pour EntityProvider
 */
export const createEntityProviderProps = (
  schemaContext: any,
  config?: Partial<EntityContextConfig>
): EntityProviderProps => {
  return {
    schemaContext,
    config: config ? createEntityConfig(config) : DEFAULT_ENTITY_CONFIG
  };
};

/**
 * Vérifie si une entité correspond aux filtres
 */
export const entityMatchesFilters = (
  entity: EntityData,
  filters: EntityFilters
): boolean => {
  if (filters.schemaName && entity.schemaName !== filters.schemaName) {
    return false;
  }

  if (filters.version && entity.version !== filters.version) {
    return false;
  }

  if (filters.search) {
    return searchInEntity(entity, filters.search);
  }

  return true;
};

/**
 * Trie les entités selon différents critères
 */
export const sortEntities = (
  entities: EntityData[],
  sortBy: 'createdAt' | 'updatedAt' | 'schemaName' | 'version' = 'updatedAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): EntityData[] => {
  return [...entities].sort((a, b) => {
    let valueA: any;
    let valueB: any;

    switch (sortBy) {
      case 'createdAt':
      case 'updatedAt':
        valueA = new Date(a[sortBy]).getTime();
        valueB = new Date(b[sortBy]).getTime();
        break;
      case 'schemaName':
      case 'version':
        valueA = a[sortBy];
        valueB = b[sortBy];
        break;
      default:
        return 0;
    }

    if (valueA < valueB) {
      return sortOrder === 'asc' ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortOrder === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

/**
 * Groupe les entités par schéma
 */
export const groupEntitiesBySchema = (
  entities: EntityData[]
): Record<string, EntityData[]> => {
  return entities.reduce((groups, entity) => {
    const schemaName = entity.schemaName;
    if (!groups[schemaName]) {
      groups[schemaName] = [];
    }
    groups[schemaName].push(entity);
    return groups;
  }, {} as Record<string, EntityData[]>);
};

/**
 * Calcule des statistiques sur les entités
 */
export const calculateEntityStats = (entities: EntityData[]): {
  total: number;
  bySchema: Record<string, number>;
  byVersion: Record<string, number>;
  avgAgeInDays: number;
  oldestEntity?: EntityData;
  newestEntity?: EntityData;
} => {
  if (entities.length === 0) {
    return {
      total: 0,
      bySchema: {},
      byVersion: {},
      avgAgeInDays: 0
    };
  }

  const bySchema: Record<string, number> = {};
  const byVersion: Record<string, number> = {};
  let totalAgeInMs = 0;
  let oldestEntity = entities[0];
  let newestEntity = entities[0];

  const now = Date.now();

  for (const entity of entities) {
    // Comptage par schéma
    bySchema[entity.schemaName] = (bySchema[entity.schemaName] || 0) + 1;

    // Comptage par version
    byVersion[entity.version] = (byVersion[entity.version] || 0) + 1;

    // Calcul de l'âge
    const createdAt = new Date(entity.createdAt).getTime();
    totalAgeInMs += now - createdAt;

    // Entité la plus ancienne
    if (createdAt < new Date(oldestEntity.createdAt).getTime()) {
      oldestEntity = entity;
    }

    // Entité la plus récente
    if (createdAt > new Date(newestEntity.createdAt).getTime()) {
      newestEntity = entity;
    }
  }

  const avgAgeInMs = totalAgeInMs / entities.length;
  const avgAgeInDays = avgAgeInMs / (1000 * 60 * 60 * 24);

  return {
    total: entities.length,
    bySchema,
    byVersion,
    avgAgeInDays,
    oldestEntity,
    newestEntity
  };
};

// ===== VALIDATION ET TYPES GUARDS =====

/**
 * Vérifie si un objet est une EntityData valide
 */
export const isEntityData = (obj: any): obj is EntityData => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.version === 'string' &&
    typeof obj.schemaName === 'string' &&
    typeof obj.data === 'object' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
};

/**
 * Vérifie si un objet est un EntitySummary valide
 */
export const isEntitySummary = (obj: any): obj is EntitySummary => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.schemaName === 'string' &&
    typeof obj.currentSchemaVersion === 'string' &&
    typeof obj.totalEntities === 'number' &&
    typeof obj.entitiesByVersion === 'object' &&
    typeof obj.outdatedEntities === 'number' &&
    typeof obj.canAutoMigrate === 'boolean'
  );
};

/**
 * Vérifie si un objet est un EntityFilters valide
 */
export const isEntityFilters = (obj: any): obj is EntityFilters => {
  if (!obj || typeof obj !== 'object') return false;

  const validKeys = ['schemaName', 'version', 'search', 'limit', 'offset'];
  const objKeys = Object.keys(obj);

  // Vérifier que toutes les clés sont valides
  if (!objKeys.every(key => validKeys.includes(key))) return false;

  // Vérifier les types
  if (obj.schemaName !== undefined && typeof obj.schemaName !== 'string') return false;
  if (obj.version !== undefined && typeof obj.version !== 'string') return false;
  if (obj.search !== undefined && typeof obj.search !== 'string') return false;
  if (obj.limit !== undefined && typeof obj.limit !== 'number') return false;
  if (obj.offset !== undefined && typeof obj.offset !== 'number') return false;

  return true;
};

// ===== EXPORTS POUR BACKWARDS COMPATIBILITY =====

// Alias pour compatibilité avec d'anciennes versions
export const EntityContextProvider = EntityProvider;
export type EntityContextType = EntityContextValue;