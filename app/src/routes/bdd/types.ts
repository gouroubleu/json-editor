// Types pour la gestion des entités BDD

export type EntityData = {
  id: string;
  version: string; // Version du schéma utilisée pour créer cette entité
  schemaName: string; // Nom du schéma de référence
  data: Record<string, any>; // Données de l'entité conformes au schéma
  createdAt: string;
  updatedAt: string;
};

export type EntityMetadata = {
  totalCount: number;
  byVersion: Record<string, number>; // Compteur par version de schéma
  latestVersion: string; // Dernière version disponible du schéma
  outdatedCount: number; // Nombre d'entités avec une version obsolète
};

export type EntitySummary = {
  schemaName: string;
  schemaTitle?: string;
  schemaDescription?: string;
  currentSchemaVersion: string;
  totalEntities: number;
  entitiesByVersion: Record<string, number>;
  outdatedEntities: number;
  canAutoMigrate: boolean;
};

export type MigrationResult = {
  success: boolean;
  message: string;
  migratedCount?: number;
  errors?: string[];
};

export type EntityValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
};

// Type pour la création/édition d'entité
export type CreateEntityRequest = {
  schemaName: string;
  data: Record<string, any>;
};

export type UpdateEntityRequest = {
  data: Record<string, any>;
  updateVersion?: boolean; // Si true, met à jour vers la dernière version du schéma
};

// Type pour les filtres de recherche
export type EntityFilters = {
  schemaName?: string;
  version?: string;
  search?: string; // Recherche dans les données
  limit?: number;
  offset?: number;
};

export type EntityListResponse = {
  entities: EntityData[];
  totalCount: number;
  hasMore: boolean;
};