// Provider principal pour le contexte des entités BDD
import {
  component$,
  createContextId,
  useContextProvider,
  useStore,
  useSignal,
  useTask$,
  $,
  type Signal
} from '@builder.io/qwik';
import type {
  EntityContextValue,
  EntityContextState,
  EntityContextActions,
  EntityContextConfig,
  EntityProviderProps,
  EntityNotificationOptions,
  SearchOptions,
  PendingConfirmation
} from './types';
import type {
  EntityData,
  EntitySummary,
  EntityFilters,
  CreateEntityRequest,
  UpdateEntityRequest,
  EntityValidationResult,
  MigrationResult
} from '../types';
import {
  getEntitiesSummary,
  listEntities,
  createEntity,
  updateEntity,
  deleteEntity,
  getEntity,
  migrateSchemaEntities,
  generateDefaultValue
} from '../services';
import { loadSchemas } from '../../services';

// Création du contexte
export const EntityContext = createContextId<EntityContextValue>('entity-context');

// Configuration par défaut
const defaultConfig: EntityContextConfig = {
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

// Utilitaires pour les IDs uniques
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2)}`;

export const EntityProvider = component$<EntityProviderProps>(({
  config = {},
  schemaContext,
  children
}) => {
  // Configuration fusionnée
  const configSignal = useSignal<EntityContextConfig>({
    ...defaultConfig,
    ...config
  });

  // État principal du contexte
  const state = useStore<EntityContextState>({
    summaries: [],
    entities: [],
    pagination: {
      totalCount: 0,
      currentPage: 1,
      pageSize: configSignal.value.pagination.defaultPageSize,
      hasMore: false,
      offset: 0
    },
    currentEntity: null,
    ui: {
      activeView: configSignal.value.ui.defaultView,
      editMode: 'view',
      selectedSchemaName: null,
      selectedEntityId: null,
      sidebarCollapsed: false,
      activePanel: configSignal.value.ui.defaultPanel,
      searchQuery: '',
      showFilters: false,
      expandedSummaries: new Set<string>(),
      validationEnabled: configSignal.value.validation.enableRealTime,
      showValidationErrors: false,
      pendingConfirmation: null
    },
    loading: {
      isLoadingSummaries: false,
      isLoadingEntities: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isMigrating: false,
      isValidating: false,
      loadingOperations: new Map()
    },
    notifications: [],
    filters: {
      limit: configSignal.value.pagination.defaultPageSize,
      offset: 0
    }
  });

  // Signaux dérivés pour l'optimisation
  const summariesSignal = useSignal<EntitySummary[]>([]);
  const entitiesSignal = useSignal<EntityData[]>([]);
  const currentEntitySignal = useSignal<EntityData | null>(null);
  const uiStateSignal = useSignal(state.ui);
  const loadingSignal = useSignal(false);
  const notificationsSignal = useSignal([]);
  const filtersSignal = useSignal(state.filters);
  const paginationSignal = useSignal(state.pagination);

  // Mise à jour des signaux dérivés
  useTask$(({ track }) => {
    track(() => state.summaries);
    summariesSignal.value = [...state.summaries];
  });

  useTask$(({ track }) => {
    track(() => state.entities);
    entitiesSignal.value = [...state.entities];
  });

  useTask$(({ track }) => {
    track(() => state.currentEntity);
    currentEntitySignal.value = state.currentEntity;
  });

  useTask$(({ track }) => {
    track(() => state.ui);
    uiStateSignal.value = { ...state.ui };
  });

  useTask$(({ track }) => {
    track(() => state.loading);
    loadingSignal.value = Object.values(state.loading).some(loading =>
      typeof loading === 'boolean' ? loading : false
    );
  });

  useTask$(({ track }) => {
    track(() => state.notifications);
    notificationsSignal.value = [...state.notifications];
  });

  useTask$(({ track }) => {
    track(() => state.filters);
    filtersSignal.value = { ...state.filters };
  });

  useTask$(({ track }) => {
    track(() => state.pagination);
    paginationSignal.value = { ...state.pagination };
  });

  // === ACTIONS POUR LES RÉSUMÉS ===
  const summariesActions = {
    loadAll: $(async () => {
      state.loading.isLoadingSummaries = true;
      try {
        const summaries = await getEntitiesSummary();
        state.summaries = summaries;
      } catch (error) {
        console.error('Erreur chargement résumés:', error);
        notificationActions.error('Erreur', 'Impossible de charger les résumés d\'entités');
      } finally {
        state.loading.isLoadingSummaries = false;
      }
    }),

    refresh: $(async () => {
      await summariesActions.loadAll();
    }),

    expandSummary: $((schemaName: string) => {
      state.ui.expandedSummaries.add(schemaName);
    }),

    collapseSummary: $((schemaName: string) => {
      state.ui.expandedSummaries.delete(schemaName);
    }),

    toggleSummary: $((schemaName: string) => {
      if (state.ui.expandedSummaries.has(schemaName)) {
        state.ui.expandedSummaries.delete(schemaName);
      } else {
        state.ui.expandedSummaries.add(schemaName);
      }
    }),

    expandAll: $(() => {
      state.summaries.forEach(summary => {
        state.ui.expandedSummaries.add(summary.schemaName);
      });
    }),

    collapseAll: $(() => {
      state.ui.expandedSummaries.clear();
    }),

    migrateSchema: $(async (schemaName: string): Promise<MigrationResult> => {
      state.loading.isMigrating = true;
      try {
        const result = await migrateSchemaEntities(schemaName);
        if (result.success) {
          notificationActions.success('Migration réussie', result.message);
          await summariesActions.refresh();
        } else {
          notificationActions.error('Erreur de migration', result.message);
        }
        return result;
      } catch (error) {
        const errorMsg = 'Erreur lors de la migration des entités';
        notificationActions.error('Erreur', errorMsg);
        return { success: false, message: errorMsg };
      } finally {
        state.loading.isMigrating = false;
      }
    })
  };

  // === ACTIONS POUR LES ENTITÉS ===
  const entitiesActions = {
    loadList: $(async (filters?: EntityFilters) => {
      state.loading.isLoadingEntities = true;
      try {
        const finalFilters = { ...state.filters, ...filters };
        const response = await listEntities(finalFilters);

        state.entities = response.entities;
        state.pagination.totalCount = response.totalCount;
        state.pagination.hasMore = response.hasMore;
      } catch (error) {
        console.error('Erreur chargement entités:', error);
        notificationActions.error('Erreur', 'Impossible de charger les entités');
      } finally {
        state.loading.isLoadingEntities = false;
      }
    }),

    loadById: $(async (entityId: string): Promise<EntityData | null> => {
      try {
        const entity = await getEntity(entityId);
        return entity;
      } catch (error) {
        console.error('Erreur chargement entité:', error);
        notificationActions.error('Erreur', 'Impossible de charger l\'entité');
        return null;
      }
    }),

    create: $(async (request: CreateEntityRequest) => {
      state.loading.isCreating = true;
      try {
        const result = await createEntity(request);
        if (result.success) {
          notificationActions.success('Succès', 'Entité créée avec succès');
          await entitiesActions.loadList();
          await summariesActions.refresh();
        } else {
          notificationActions.error('Erreur de création', result.message);
        }
        return result;
      } catch (error) {
        const errorMsg = 'Erreur lors de la création de l\'entité';
        notificationActions.error('Erreur', errorMsg);
        return { success: false, message: errorMsg };
      } finally {
        state.loading.isCreating = false;
      }
    }),

    update: $(async (entityId: string, request: UpdateEntityRequest) => {
      state.loading.isUpdating = true;
      try {
        const result = await updateEntity(entityId, request);
        if (result.success) {
          notificationActions.success('Succès', 'Entité mise à jour avec succès');
          await entitiesActions.loadList();
          if (state.currentEntity?.id === entityId) {
            state.currentEntity = await entitiesActions.loadById(entityId);
          }
        } else {
          notificationActions.error('Erreur de mise à jour', result.message);
        }
        return result;
      } catch (error) {
        const errorMsg = 'Erreur lors de la mise à jour de l\'entité';
        notificationActions.error('Erreur', errorMsg);
        return { success: false, message: errorMsg };
      } finally {
        state.loading.isUpdating = false;
      }
    }),

    delete: $(async (entityId: string) => {
      state.loading.isDeleting = true;
      try {
        const result = await deleteEntity(entityId);
        if (result.success) {
          notificationActions.success('Succès', 'Entité supprimée avec succès');
          await entitiesActions.loadList();
          await summariesActions.refresh();
          if (state.currentEntity?.id === entityId) {
            state.currentEntity = null;
            state.ui.selectedEntityId = null;
          }
        } else {
          notificationActions.error('Erreur de suppression', result.message);
        }
        return result;
      } catch (error) {
        const errorMsg = 'Erreur lors de la suppression de l\'entité';
        notificationActions.error('Erreur', errorMsg);
        return { success: false, message: errorMsg };
      } finally {
        state.loading.isDeleting = false;
      }
    }),

    duplicate: $(async (entityId: string) => {
      state.loading.isCreating = true;
      try {
        const entity = await entitiesActions.loadById(entityId);
        if (!entity) {
          throw new Error('Entité source introuvable');
        }

        const result = await createEntity({
          schemaName: entity.schemaName,
          data: { ...entity.data }
        });

        if (result.success) {
          notificationActions.success('Succès', 'Entité dupliquée avec succès');
          await entitiesActions.loadList();
          await summariesActions.refresh();
        } else {
          notificationActions.error('Erreur de duplication', result.message);
        }

        return {
          success: result.success,
          message: result.message,
          newEntityId: result.entityId
        };
      } catch (error) {
        const errorMsg = 'Erreur lors de la duplication de l\'entité';
        notificationActions.error('Erreur', errorMsg);
        return { success: false, message: errorMsg };
      } finally {
        state.loading.isCreating = false;
      }
    }),

    select: $(async (entityId: string | null) => {
      state.ui.selectedEntityId = entityId;
      if (entityId) {
        state.currentEntity = await entitiesActions.loadById(entityId);
      } else {
        state.currentEntity = null;
      }
    }),

    selectForEdit: $(async (entityId: string) => {
      await entitiesActions.select(entityId);
      state.ui.editMode = 'edit';
      state.ui.activeView = 'editor';
    }),

    selectForView: $(async (entityId: string) => {
      await entitiesActions.select(entityId);
      state.ui.editMode = 'view';
      state.ui.activeView = 'viewer';
    }),

    validate: $(async (entityData: Record<string, any>, schemaName: string): Promise<EntityValidationResult> => {
      state.loading.isValidating = true;
      try {
        // Charger le schéma correspondant
        const schemas = await loadSchemas();
        const schema = schemas.find(s => s.name === schemaName);

        if (!schema) {
          return {
            isValid: false,
            errors: [`Schéma '${schemaName}' introuvable`]
          };
        }

        // Validation simple (la validation complète est dans services.ts)
        const required = schema.schema.required || [];
        const errors: string[] = [];

        for (const field of required) {
          if (!entityData.hasOwnProperty(field) || entityData[field] === null || entityData[field] === undefined) {
            errors.push(`Le champ '${field}' est requis`);
          }
        }

        return {
          isValid: errors.length === 0,
          errors
        };
      } catch (error) {
        return {
          isValid: false,
          errors: ['Erreur lors de la validation']
        };
      } finally {
        state.loading.isValidating = false;
      }
    }),

    validateCurrent: $(async (): Promise<EntityValidationResult> => {
      if (!state.currentEntity) {
        return { isValid: false, errors: ['Aucune entité sélectionnée'] };
      }
      return entitiesActions.validate(state.currentEntity.data, state.currentEntity.schemaName);
    }),

    nextPage: $(async () => {
      if (state.pagination.hasMore) {
        state.pagination.currentPage++;
        state.pagination.offset = (state.pagination.currentPage - 1) * state.pagination.pageSize;
        state.filters.offset = state.pagination.offset;
        await entitiesActions.loadList();
      }
    }),

    prevPage: $(async () => {
      if (state.pagination.currentPage > 1) {
        state.pagination.currentPage--;
        state.pagination.offset = (state.pagination.currentPage - 1) * state.pagination.pageSize;
        state.filters.offset = state.pagination.offset;
        await entitiesActions.loadList();
      }
    }),

    goToPage: $(async (page: number) => {
      const maxPage = Math.ceil(state.pagination.totalCount / state.pagination.pageSize);
      if (page >= 1 && page <= maxPage) {
        state.pagination.currentPage = page;
        state.pagination.offset = (page - 1) * state.pagination.pageSize;
        state.filters.offset = state.pagination.offset;
        await entitiesActions.loadList();
      }
    }),

    setPageSize: $(async (pageSize: number) => {
      const maxPageSize = configSignal.value.pagination.maxPageSize;
      const finalPageSize = Math.min(pageSize, maxPageSize);

      state.pagination.pageSize = finalPageSize;
      state.pagination.currentPage = 1;
      state.pagination.offset = 0;
      state.filters.limit = finalPageSize;
      state.filters.offset = 0;

      await entitiesActions.loadList();
    })
  };

  // === ACTIONS POUR LES FILTRES ===
  const filtersActions = {
    setSchemaName: $((schemaName: string | undefined) => {
      state.filters.schemaName = schemaName;
    }),

    setVersion: $((version: string | undefined) => {
      state.filters.version = version;
    }),

    setSearchQuery: $((query: string) => {
      state.filters.search = query;
      state.ui.searchQuery = query;
    }),

    setLimit: $((limit: number) => {
      state.filters.limit = limit;
    }),

    setOffset: $((offset: number) => {
      state.filters.offset = offset;
    }),

    setFilters: $((filters: Partial<EntityFilters>) => {
      Object.assign(state.filters, filters);
    }),

    clearFilters: $(() => {
      state.filters = {
        limit: configSignal.value.pagination.defaultPageSize,
        offset: 0
      };
      state.ui.searchQuery = '';
      state.pagination.currentPage = 1;
      state.pagination.offset = 0;
    }),

    resetPagination: $(() => {
      state.pagination.currentPage = 1;
      state.pagination.offset = 0;
      state.filters.offset = 0;
    }),

    applyFilters: $(async () => {
      filtersActions.resetPagination();
      await entitiesActions.loadList();
    })
  };

  // === ACTIONS POUR L'UI ===
  const uiActions = {
    setActiveView: $((view: typeof state.ui.activeView) => {
      state.ui.activeView = view;
    }),

    setEditMode: $((mode: typeof state.ui.editMode) => {
      state.ui.editMode = mode;
    }),

    setActivePanel: $((panel: typeof state.ui.activePanel) => {
      state.ui.activePanel = panel;
    }),

    selectSchema: $((schemaName: string | null) => {
      state.ui.selectedSchemaName = schemaName;
      if (schemaName) {
        state.filters.schemaName = schemaName;
      }
    }),

    toggleSidebar: $(() => {
      state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
    }),

    toggleFilters: $(() => {
      state.ui.showFilters = !state.ui.showFilters;
    }),

    toggleValidation: $(() => {
      state.ui.validationEnabled = !state.ui.validationEnabled;
    }),

    showValidationErrors: $((show: boolean) => {
      state.ui.showValidationErrors = show;
    }),

    showConfirmation: $((confirmation: Parameters<typeof uiActions.showConfirmation>[0]) => {
      state.ui.pendingConfirmation = {
        ...confirmation,
        onCancel: confirmation.onCancel || (() => uiActions.hideConfirmation())
      } as PendingConfirmation;
    }),

    hideConfirmation: $(() => {
      state.ui.pendingConfirmation = null;
    }),

    confirmPending: $(() => {
      if (state.ui.pendingConfirmation) {
        state.ui.pendingConfirmation.onConfirm();
        state.ui.pendingConfirmation = null;
      }
    }),

    cancelPending: $(() => {
      if (state.ui.pendingConfirmation) {
        state.ui.pendingConfirmation.onCancel();
        state.ui.pendingConfirmation = null;
      }
    })
  };

  // === ACTIONS POUR LES NOTIFICATIONS ===
  const notificationActions = {
    success: $((title: string, message: string, options?: EntityNotificationOptions): string => {
      const id = generateId();
      const notification = {
        id,
        type: 'success' as const,
        title,
        message,
        timestamp: new Date().toISOString(),
        duration: options?.duration ?? configSignal.value.notifications.defaultDuration,
        entityId: options?.entityId,
        schemaName: options?.schemaName,
        actions: options?.actions
      };

      state.notifications.unshift(notification);

      // Limiter le nombre de notifications
      if (state.notifications.length > configSignal.value.notifications.maxNotifications) {
        state.notifications.splice(configSignal.value.notifications.maxNotifications);
      }

      // Auto-dismiss si une durée est définie
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => notificationActions.dismiss(id), notification.duration);
      }

      return id;
    }),

    error: $((title: string, message: string, options?: EntityNotificationOptions): string => {
      const id = generateId();
      const notification = {
        id,
        type: 'error' as const,
        title,
        message,
        timestamp: new Date().toISOString(),
        duration: options?.duration,
        entityId: options?.entityId,
        schemaName: options?.schemaName,
        actions: options?.actions
      };

      state.notifications.unshift(notification);

      if (state.notifications.length > configSignal.value.notifications.maxNotifications) {
        state.notifications.splice(configSignal.value.notifications.maxNotifications);
      }

      if (notification.duration && notification.duration > 0) {
        setTimeout(() => notificationActions.dismiss(id), notification.duration);
      }

      return id;
    }),

    warning: $((title: string, message: string, options?: EntityNotificationOptions): string => {
      const id = generateId();
      const notification = {
        id,
        type: 'warning' as const,
        title,
        message,
        timestamp: new Date().toISOString(),
        duration: options?.duration ?? configSignal.value.notifications.defaultDuration,
        entityId: options?.entityId,
        schemaName: options?.schemaName,
        actions: options?.actions
      };

      state.notifications.unshift(notification);

      if (state.notifications.length > configSignal.value.notifications.maxNotifications) {
        state.notifications.splice(configSignal.value.notifications.maxNotifications);
      }

      if (notification.duration && notification.duration > 0) {
        setTimeout(() => notificationActions.dismiss(id), notification.duration);
      }

      return id;
    }),

    info: $((title: string, message: string, options?: EntityNotificationOptions): string => {
      const id = generateId();
      const notification = {
        id,
        type: 'info' as const,
        title,
        message,
        timestamp: new Date().toISOString(),
        duration: options?.duration ?? configSignal.value.notifications.defaultDuration,
        entityId: options?.entityId,
        schemaName: options?.schemaName,
        actions: options?.actions
      };

      state.notifications.unshift(notification);

      if (state.notifications.length > configSignal.value.notifications.maxNotifications) {
        state.notifications.splice(configSignal.value.notifications.maxNotifications);
      }

      if (notification.duration && notification.duration > 0) {
        setTimeout(() => notificationActions.dismiss(id), notification.duration);
      }

      return id;
    }),

    dismiss: $((id: string) => {
      const index = state.notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        state.notifications.splice(index, 1);
      }
    }),

    dismissAll: $(() => {
      state.notifications.length = 0;
    }),

    dismissByEntity: $((entityId: string) => {
      state.notifications = state.notifications.filter(n => n.entityId !== entityId);
    }),

    dismissBySchema: $((schemaName: string) => {
      state.notifications = state.notifications.filter(n => n.schemaName !== schemaName);
    })
  };

  // === ACTIONS UTILITAIRES ===
  const utilsActions = {
    generateDefaultValues: $(async (schemaName: string): Promise<Record<string, any>> => {
      try {
        const schemas = await loadSchemas();
        const schema = schemas.find(s => s.name === schemaName);

        if (!schema) {
          throw new Error(`Schéma '${schemaName}' introuvable`);
        }

        return generateDefaultValue(schema.schema);
      } catch (error) {
        console.error('Erreur génération valeurs par défaut:', error);
        return {};
      }
    }),

    getSchemaValidation: $(async (schemaName: string) => {
      try {
        const schemas = await loadSchemas();
        const schema = schemas.find(s => s.name === schemaName);

        if (!schema) {
          return { isValid: false, errors: [`Schéma '${schemaName}' introuvable`] };
        }

        return { isValid: true, errors: [] };
      } catch (error) {
        return { isValid: false, errors: ['Erreur lors de la validation du schéma'] };
      }
    }),

    navigateToEntity: $(async (entityId: string) => {
      await entitiesActions.selectForView(entityId);
    }),

    navigateToSchema: $(async (schemaName: string) => {
      uiActions.selectSchema(schemaName);
      uiActions.setActiveView('list');
      filtersActions.setSchemaName(schemaName);
      await filtersActions.applyFilters();
    }),

    navigateBack: $(() => {
      if (state.ui.activeView === 'editor' || state.ui.activeView === 'viewer') {
        uiActions.setActiveView('list');
      } else if (state.ui.activeView === 'list') {
        uiActions.setActiveView('summary');
      }
    }),

    searchEntities: $(async (query: string, options?: SearchOptions): Promise<EntityData[]> => {
      try {
        const searchFilters: EntityFilters = {
          search: query,
          schemaName: options?.schemaName,
          limit: options?.limit || 50
        };

        const response = await listEntities(searchFilters);
        return response.entities;
      } catch (error) {
        console.error('Erreur recherche entités:', error);
        return [];
      }
    }),

    exportEntities: $(async (schemaName?: string, format: 'json' | 'csv' = 'json'): Promise<string> => {
      try {
        const filters: EntityFilters = schemaName ? { schemaName } : {};
        const response = await listEntities(filters);

        if (format === 'json') {
          return JSON.stringify(response.entities, null, 2);
        } else {
          // Conversion CSV simplifiée
          if (response.entities.length === 0) return '';

          const headers = ['id', 'schemaName', 'version', 'createdAt', 'updatedAt', 'data'];
          const csv = [
            headers.join(','),
            ...response.entities.map(entity =>
              headers.map(header =>
                header === 'data' ?
                  `"${JSON.stringify(entity.data).replace(/"/g, '""')}"` :
                  `"${(entity as any)[header] || ''}"`
              ).join(',')
            )
          ].join('\n');

          return csv;
        }
      } catch (error) {
        console.error('Erreur export entités:', error);
        return '';
      }
    }),

    reset: $(() => {
      // Reset de l'état
      state.entities = [];
      state.currentEntity = null;
      state.notifications = [];
      state.ui.selectedEntityId = null;
      state.ui.selectedSchemaName = null;
      state.ui.activeView = configSignal.value.ui.defaultView;
      state.ui.editMode = 'view';
      filtersActions.clearFilters();
    }),

    clearCache: $(() => {
      // Ici on pourrait implémenter un cache plus sophistiqué
      // Pour l'instant, on reset juste l'état
      utilsActions.reset();
    })
  };

  // Assemblage des actions
  const actions: EntityContextActions = {
    summaries: summariesActions,
    entities: entitiesActions,
    filters: filtersActions,
    ui: uiActions,
    notifications: notificationActions,
    utils: utilsActions
  };

  // Valeur du contexte
  const contextValue: EntityContextValue = {
    state,
    actions,
    config: configSignal,
    schemaContext,
    signals: {
      summariesSignal,
      entitiesSignal,
      currentEntitySignal,
      uiStateSignal,
      loadingSignal,
      notificationsSignal,
      filtersSignal,
      paginationSignal
    }
  };

  // Initialisation au montage
  useTask$(async () => {
    await summariesActions.loadAll();
  });

  // Fournir le contexte
  useContextProvider(EntityContext, contextValue);

  return <>{children}</>;
});