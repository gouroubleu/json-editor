// Index des hooks EntityEditor - Point d'entrée pour tous les hooks spécialisés
export { useEntityCache } from './use-entity-cache';
export { useEntityValidation } from './use-entity-validation';
export { useEntityNavigation } from './use-entity-navigation';
export { useEntitySync } from './use-entity-sync';

// Types pour les hooks
export type {
  SimpleSyncState,
  SyncStatus
} from './use-entity-sync';

// Types pour les autres hooks
export type {
  EntityCacheStats,
  CachedEntityEntry,
  EntityValidationResult,
  EntityValidationError,
  EntityValidationWarning,
  EntityNavigationState,
  NavigationEntry,
  HorizontalNavigation,
  BreadcrumbItem,
  RecentEntity
} from '../types';