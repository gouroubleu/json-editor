// Hooks spécialisés pour utiliser le contexte des entités BDD
import { useContext, useSignal, useTask$, $ } from '@builder.io/qwik';
import type { Signal } from '@builder.io/qwik';
import { EntityContext } from './provider';
import type {
  EntityContextValue,
  EntityData,
  EntitySummary,
  EntityFilters,
  CreateEntityRequest,
  UpdateEntityRequest,
  EntityValidationResult,
  PaginationState,
  EntityUIState,
  EntityNotification
} from './types';

// ===== HOOK PRINCIPAL =====

/**
 * Hook principal pour accéder au contexte des entités
 */
export const useEntityContext = (): EntityContextValue => {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntityContext doit être utilisé à l\'intérieur d\'un EntityProvider');
  }
  return context;
};

// ===== HOOKS SPÉCIALISÉS POUR L'ÉTAT =====

/**
 * Hook pour accéder aux résumés d'entités
 */
export const useEntitySummaries = () => {
  const { state, actions, signals } = useEntityContext();

  return {
    summaries: signals.summariesSignal,
    isLoading: useSignal(state.loading.isLoadingSummaries),
    expandedSummaries: useSignal(state.ui.expandedSummaries),
    loadAll: actions.summaries.loadAll,
    refresh: actions.summaries.refresh,
    expandSummary: actions.summaries.expandSummary,
    collapseSummary: actions.summaries.collapseSummary,
    toggleSummary: actions.summaries.toggleSummary,
    expandAll: actions.summaries.expandAll,
    collapseAll: actions.summaries.collapseAll,
    migrateSchema: actions.summaries.migrateSchema
  };
};

/**
 * Hook pour accéder à la liste des entités
 */
export const useEntityList = () => {
  const { state, actions, signals } = useEntityContext();

  return {
    entities: signals.entitiesSignal,
    isLoading: useSignal(state.loading.isLoadingEntities),
    pagination: signals.paginationSignal,
    filters: signals.filtersSignal,
    loadList: actions.entities.loadList,
    nextPage: actions.entities.nextPage,
    prevPage: actions.entities.prevPage,
    goToPage: actions.entities.goToPage,
    setPageSize: actions.entities.setPageSize,
    applyFilters: actions.filters.applyFilters,
    clearFilters: actions.filters.clearFilters
  };
};

/**
 * Hook pour accéder à l'entité courante
 */
export const useCurrentEntity = () => {
  const { state, actions, signals } = useEntityContext();

  return {
    currentEntity: signals.currentEntitySignal,
    selectedEntityId: useSignal(state.ui.selectedEntityId),
    editMode: useSignal(state.ui.editMode),
    isLoading: useSignal(
      state.loading.isLoadingEntities ||
      state.loading.isCreating ||
      state.loading.isUpdating
    ),
    select: actions.entities.select,
    selectForEdit: actions.entities.selectForEdit,
    selectForView: actions.entities.selectForView,
    create: actions.entities.create,
    update: actions.entities.update,
    delete: actions.entities.delete,
    duplicate: actions.entities.duplicate,
    validate: actions.entities.validateCurrent
  };
};

/**
 * Hook pour accéder à l'état de l'UI
 */
export const useEntityUI = () => {
  const { state, actions, signals } = useEntityContext();

  return {
    uiState: signals.uiStateSignal,
    activeView: useSignal(state.ui.activeView),
    selectedSchemaName: useSignal(state.ui.selectedSchemaName),
    sidebarCollapsed: useSignal(state.ui.sidebarCollapsed),
    showFilters: useSignal(state.ui.showFilters),
    validationEnabled: useSignal(state.ui.validationEnabled),
    pendingConfirmation: useSignal(state.ui.pendingConfirmation),
    setActiveView: actions.ui.setActiveView,
    setEditMode: actions.ui.setEditMode,
    selectSchema: actions.ui.selectSchema,
    toggleSidebar: actions.ui.toggleSidebar,
    toggleFilters: actions.ui.toggleFilters,
    toggleValidation: actions.ui.toggleValidation,
    showConfirmation: actions.ui.showConfirmation,
    hideConfirmation: actions.ui.hideConfirmation,
    confirmPending: actions.ui.confirmPending,
    cancelPending: actions.ui.cancelPending
  };
};

/**
 * Hook pour accéder aux notifications
 */
export const useEntityNotifications = () => {
  const { actions, signals } = useEntityContext();

  return {
    notifications: signals.notificationsSignal,
    success: actions.notifications.success,
    error: actions.notifications.error,
    warning: actions.notifications.warning,
    info: actions.notifications.info,
    dismiss: actions.notifications.dismiss,
    dismissAll: actions.notifications.dismissAll,
    dismissByEntity: actions.notifications.dismissByEntity,
    dismissBySchema: actions.notifications.dismissBySchema
  };
};

// ===== HOOKS FONCTIONNELS AVANCÉS =====

/**
 * Hook pour la gestion d'un formulaire d'entité
 */
export const useEntityForm = (
  schemaName?: string,
  entityId?: string,
  mode: 'create' | 'edit' = 'create'
) => {
  const { actions } = useEntityContext();

  // État local du formulaire
  const formData = useSignal<Record<string, any>>({});
  const validation = useSignal<EntityValidationResult>({ isValid: true, errors: [] });
  const isSubmitting = useSignal(false);
  const hasChanges = useSignal(false);

  // Chargement initial
  useTask$(async ({ track }) => {
    track(() => schemaName);
    track(() => entityId);
    track(() => mode);

    if (!schemaName) return;

    if (mode === 'create') {
      // Générer les valeurs par défaut pour une nouvelle entité
      const defaultValues = await actions.utils.generateDefaultValues(schemaName);
      formData.value = defaultValues;
      hasChanges.value = false;
    } else if (mode === 'edit' && entityId) {
      // Charger l'entité existante
      const entity = await actions.entities.loadById(entityId);
      if (entity) {
        formData.value = { ...entity.data };
        hasChanges.value = false;
      }
    }
  });

  // Validation en temps réel
  const validateForm = $(async () => {
    if (!schemaName) return;

    const result = await actions.entities.validate(formData.value, schemaName);
    validation.value = result;
    return result;
  });

  // Mise à jour d'un champ
  const updateField = $((fieldName: string, value: any) => {
    formData.value = {
      ...formData.value,
      [fieldName]: value
    };
    hasChanges.value = true;

    // Validation en temps réel si activée
    if (validation.value.isValid || validation.value.errors.length > 0) {
      validateForm();
    }
  });

  // Soumission du formulaire
  const submitForm = $(async (): Promise<boolean> => {
    if (!schemaName) return false;

    isSubmitting.value = true;

    try {
      // Validation finale
      const isValid = await validateForm();
      if (!isValid.isValid) {
        return false;
      }

      let result;
      if (mode === 'create') {
        result = await actions.entities.create({
          schemaName,
          data: formData.value
        });
      } else if (entityId) {
        result = await actions.entities.update(entityId, {
          data: formData.value
        });
      } else {
        return false;
      }

      if (result.success) {
        hasChanges.value = false;
        return true;
      }

      return false;

    } finally {
      isSubmitting.value = false;
    }
  });

  // Reset du formulaire
  const resetForm = $(async () => {
    if (!schemaName) return;

    if (mode === 'create') {
      const defaultValues = await actions.utils.generateDefaultValues(schemaName);
      formData.value = defaultValues;
    } else if (entityId) {
      const entity = await actions.entities.loadById(entityId);
      if (entity) {
        formData.value = { ...entity.data };
      }
    }

    hasChanges.value = false;
    validation.value = { isValid: true, errors: [] };
  });

  return {
    formData,
    validation,
    isSubmitting,
    hasChanges,
    updateField,
    validateForm,
    submitForm,
    resetForm
  };
};

/**
 * Hook pour la gestion de la recherche d'entités
 */
export const useEntitySearch = () => {
  const { actions, state } = useEntityContext();

  const searchResults = useSignal<EntityData[]>([]);
  const isSearching = useSignal(false);
  const searchQuery = useSignal('');

  const search = $(async (query: string, options?: {
    schemaName?: string;
    limit?: number;
    fuzzy?: boolean;
  }) => {
    if (query.trim().length < 2) {
      searchResults.value = [];
      return;
    }

    isSearching.value = true;
    searchQuery.value = query;

    try {
      const results = await actions.utils.searchEntities(query, options);
      searchResults.value = results;
    } finally {
      isSearching.value = false;
    }
  });

  const clearSearch = $(() => {
    searchResults.value = [];
    searchQuery.value = '';
  });

  return {
    searchResults,
    isSearching,
    searchQuery,
    search,
    clearSearch
  };
};

/**
 * Hook pour la gestion de la pagination
 */
export const usePagination = () => {
  const { state, actions, signals } = useEntityContext();

  const pagination = signals.paginationSignal;

  // Informations calculées
  const totalPages = useSignal(1);
  const canGoNext = useSignal(false);
  const canGoPrev = useSignal(false);

  useTask$(({ track }) => {
    track(() => state.pagination);

    const { totalCount, pageSize, currentPage, hasMore } = state.pagination;
    totalPages.value = Math.ceil(totalCount / pageSize);
    canGoNext.value = hasMore;
    canGoPrev.value = currentPage > 1;
  });

  return {
    pagination,
    totalPages,
    canGoNext,
    canGoPrev,
    nextPage: actions.entities.nextPage,
    prevPage: actions.entities.prevPage,
    goToPage: actions.entities.goToPage,
    setPageSize: actions.entities.setPageSize
  };
};

/**
 * Hook pour la gestion des filtres
 */
export const useEntityFilters = () => {
  const { state, actions, signals } = useEntityContext();

  const filters = signals.filtersSignal;
  const hasActiveFilters = useSignal(false);

  useTask$(({ track }) => {
    track(() => state.filters);

    const { schemaName, version, search } = state.filters;
    hasActiveFilters.value = !!(schemaName || version || search);
  });

  return {
    filters,
    hasActiveFilters,
    setSchemaName: actions.filters.setSchemaName,
    setVersion: actions.filters.setVersion,
    setSearchQuery: actions.filters.setSearchQuery,
    setFilters: actions.filters.setFilters,
    clearFilters: actions.filters.clearFilters,
    applyFilters: actions.filters.applyFilters
  };
};

/**
 * Hook pour la gestion du loading state
 */
export const useEntityLoading = () => {
  const { state, signals } = useEntityContext();

  // État de chargement global
  const isLoading = signals.loadingSignal;

  // États de chargement spécifiques
  const loadingStates = useSignal({
    summaries: state.loading.isLoadingSummaries,
    entities: state.loading.isLoadingEntities,
    creating: state.loading.isCreating,
    updating: state.loading.isUpdating,
    deleting: state.loading.isDeleting,
    migrating: state.loading.isMigrating,
    validating: state.loading.isValidating
  });

  useTask$(({ track }) => {
    track(() => state.loading);

    loadingStates.value = {
      summaries: state.loading.isLoadingSummaries,
      entities: state.loading.isLoadingEntities,
      creating: state.loading.isCreating,
      updating: state.loading.isUpdating,
      deleting: state.loading.isDeleting,
      migrating: state.loading.isMigrating,
      validating: state.loading.isValidating
    };
  });

  return {
    isLoading,
    loadingStates
  };
};

/**
 * Hook pour les actions rapides sur les entités
 */
export const useEntityActions = () => {
  const { actions } = useEntityContext();

  const quickActions = {
    // Navigation rapide
    viewEntity: $(async (entityId: string) => {
      await actions.entities.selectForView(entityId);
    }),

    editEntity: $(async (entityId: string) => {
      await actions.entities.selectForEdit(entityId);
    }),

    // Actions avec confirmation
    deleteEntityWithConfirm: $((entityId: string, entityName?: string) => {
      actions.ui.showConfirmation({
        type: 'delete',
        title: 'Supprimer l\'entité',
        message: `Êtes-vous sûr de vouloir supprimer l'entité ${entityName || entityId} ? Cette action est irréversible.`,
        entityId,
        onConfirm: () => actions.entities.delete(entityId)
      });
    }),

    migrateSchemaWithConfirm: $((schemaName: string) => {
      actions.ui.showConfirmation({
        type: 'migrate',
        title: 'Migrer les entités',
        message: `Migrer toutes les entités du schéma "${schemaName}" vers la dernière version ?`,
        schemaName,
        onConfirm: () => actions.summaries.migrateSchema(schemaName)
      });
    }),

    // Navigation intelligente
    navigateToSchema: $(async (schemaName: string) => {
      await actions.utils.navigateToSchema(schemaName);
    }),

    navigateBack: actions.utils.navigateBack,

    // Export rapide
    exportSchemaEntities: $(async (schemaName: string, format: 'json' | 'csv' = 'json') => {
      const content = await actions.utils.exportEntities(schemaName, format);

      // Créer et télécharger le fichier
      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${schemaName}-entities.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    })
  };

  return {
    ...quickActions,
    // Actions directes du contexte
    create: actions.entities.create,
    update: actions.entities.update,
    delete: actions.entities.delete,
    duplicate: actions.entities.duplicate,
    validate: actions.entities.validate
  };
};

/**
 * Hook pour l'intégration avec le SchemaEditor
 */
export const useSchemaIntegration = () => {
  const { schemaContext } = useEntityContext();

  if (!schemaContext) {
    console.warn('SchemaContext non disponible dans EntityContext');
    return {
      schemas: useSignal([]),
      schemaLoading: useSignal(false),
      schemaActions: null
    };
  }

  // Signaux du contexte parent
  const schemas = schemaContext.signals?.currentSchemaSignal || useSignal([]);
  const schemaLoading = schemaContext.signals?.loadingSignal || useSignal(false);

  return {
    schemas,
    schemaLoading,
    schemaActions: schemaContext.actions?.schemas
  };
};