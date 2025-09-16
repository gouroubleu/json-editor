import {
  component$,
  createContextId,
  useContext,
  useContextProvider,
  useStore,
  useSignal,
  Slot,
  $,
  type Signal
} from '@builder.io/qwik';
import type {
  SchemaEditorContextState,
  SchemaEditorActions,
  SchemaEditorContextValue,
  LoadedSchema,
  UIState,
  CacheState,
  DraftsState,
  LoadingState,
  NotificationState,
  AppNotification,
  SchemaDraft,
  SchemaEditorContextConfig,
  CacheStats
} from './types';
import type {
  SchemaProperty,
  SchemaInfo,
  JsonSchemaOutput,
  SchemaEditorState
} from '../types';
import {
  generateJsonSchema,
  validateJsonSchema,
  saveSchema,
  updateSchema,
  loadSchemas,
  deleteSchema
} from '../services';
import { localStorageService } from '../localStorage';

// Contexte Qwik
export const SchemaEditorContext = createContextId<SchemaEditorContextValue>('schema-editor-context');

// Configuration par défaut
const defaultConfig: SchemaEditorContextConfig = {
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 50,
    enablePersistence: true
  },
  drafts: {
    autoSaveEnabled: true,
    autoSaveInterval: 2000, // 2 secondes
    maxDrafts: 10
  },
  notifications: {
    maxNotifications: 5,
    defaultDuration: 5000, // 5 secondes
    enableSound: false
  },
  ui: {
    defaultView: 'list',
    defaultPanel: 'properties',
    enableValidation: true,
    debounceTime: 300
  }
};

// État initial
const createInitialState = (): SchemaEditorContextState => ({
  currentSchema: {
    schemaInfo: {
      name: '',
      title: '',
      description: '',
      type: 'object'
    },
    properties: [],
    isValid: true,
    errors: []
  },
  schemas: [],
  ui: {
    selectedSchemaName: null,
    selectedPropertyId: null,
    expandedProperties: new Set(),
    editMode: 'create',
    activeView: 'list',
    searchQuery: '',
    filters: {},
    sidebarCollapsed: false,
    activePanel: 'properties',
    validationEnabled: true,
    showValidationErrors: false
  },
  cache: {
    lastSync: null,
    cachedSchemas: new Map(),
    invalidationQueue: [],
    maxCacheSize: 50,
    ttl: 5 * 60 * 1000
  },
  drafts: {
    drafts: new Map(),
    autoSaveEnabled: true,
    autoSaveInterval: 2000,
    lastAutoSave: null
  },
  loading: {
    isLoading: false,
    isLoadingSchemas: false,
    isSaving: false,
    isValidating: false,
    isGenerating: false,
    loadingOperations: new Map()
  },
  notifications: {
    notifications: [],
    maxNotifications: 5
  }
});

// Utilitaires pour IDs uniques
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Provider principal
export const SchemaEditorProvider = component$(() => {
  const state = useStore<SchemaEditorContextState>(createInitialState());
  const config = useSignal<SchemaEditorContextConfig>(defaultConfig);

  // Signaux dérivés
  const currentSchemaSignal = useSignal<SchemaEditorState>(state.currentSchema);
  const uiStateSignal = useSignal<UIState>(state.ui);
  const loadingSignal = useSignal<boolean>(state.loading.isLoading);
  const notificationsSignal = useSignal<AppNotification[]>(state.notifications.notifications);
  const draftsSignal = useSignal<SchemaDraft[]>([]);

  // ===== ACTIONS NOTIFICATIONS =====
  const addNotification = (notification: Omit<AppNotification, 'id' | 'timestamp'>) => {
    const id = generateId();
    const newNotification: AppNotification = {
      ...notification,
      id,
      timestamp: new Date().toISOString()
    };

    state.notifications.notifications.push(newNotification);

    // Limiter le nombre de notifications
    if (state.notifications.notifications.length > state.notifications.maxNotifications) {
      state.notifications.notifications.shift();
    }

    // Auto-dismiss si durée spécifiée
    if (notification.duration) {
      setTimeout(() => {
        const index = state.notifications.notifications.findIndex(n => n.id === id);
        if (index > -1) {
          state.notifications.notifications.splice(index, 1);
        }
      }, notification.duration);
    }

    return id;
  };

  // ===== ACTIONS PRINCIPALES =====
  const actions: SchemaEditorActions = {
    // === GESTION DES SCHÉMAS ===
    schemas: {
      loadAll: $(async () => {
        state.loading.isLoadingSchemas = true;
        try {
          const schemas = await loadSchemas();
          state.schemas = schemas;
          state.cache.lastSync = new Date().toISOString();
        } catch (error) {
          addNotification({
            type: 'error',
            title: 'Erreur de chargement',
            message: 'Impossible de charger les schémas'
          });
        } finally {
          state.loading.isLoadingSchemas = false;
        }
      }),

      loadById: $(async (name: string) => {
        const cached = state.cache.cachedSchemas.get(name);
        if (cached && (Date.now() - new Date(cached.timestamp).getTime()) < state.cache.ttl) {
          cached.accessCount++;
          cached.lastAccessed = new Date().toISOString();
          return cached.schema;
        }

        const schema = state.schemas.find(s => s.name === name);
        if (schema) {
          // Mettre en cache
          state.cache.cachedSchemas.set(name, {
            schema,
            timestamp: new Date().toISOString(),
            accessCount: 1,
            lastAccessed: new Date().toISOString(),
            isDirty: false
          });
        }
        return schema || null;
      }),

      create: $(async (schemaInfo: SchemaInfo, properties: SchemaProperty[]) => {
        state.loading.isSaving = true;
        try {
          const schema = await generateJsonSchema(schemaInfo, properties);
          const result = await saveSchema(schemaInfo.name, schema);

          if (result.success) {
            addNotification({
              type: 'success',
              title: 'Schéma créé',
              message: result.message,
              duration: 3000
            });

            // Recharger la liste
            await actions.schemas.loadAll();

            // Nettoyer le brouillon
            localStorageService.clearDraft();
          } else {
            addNotification({
              type: 'error',
              title: 'Erreur de création',
              message: result.message
            });
          }

          return result;
        } catch (error) {
          const message = 'Erreur lors de la création du schéma';
          addNotification({
            type: 'error',
            title: 'Erreur',
            message
          });
          return { success: false, message };
        } finally {
          state.loading.isSaving = false;
        }
      }),

      update: $(async (originalName: string, name: string, schemaInfo: SchemaInfo, properties: SchemaProperty[]) => {
        state.loading.isSaving = true;
        try {
          const schema = await generateJsonSchema(schemaInfo, properties);
          const result = await updateSchema(originalName, name, schema);

          if (result.success) {
            addNotification({
              type: 'success',
              title: 'Schéma mis à jour',
              message: result.message,
              duration: 3000
            });

            // Invalider le cache
            state.cache.cachedSchemas.delete(originalName);
            if (originalName !== name) {
              state.cache.cachedSchemas.delete(name);
            }

            // Recharger la liste
            await actions.schemas.loadAll();

            // Nettoyer le brouillon d'édition
            localStorageService.clearEditDraft(originalName);
          } else {
            addNotification({
              type: 'error',
              title: 'Erreur de mise à jour',
              message: result.message
            });
          }

          return result;
        } catch (error) {
          const message = 'Erreur lors de la mise à jour du schéma';
          addNotification({
            type: 'error',
            title: 'Erreur',
            message
          });
          return { success: false, message };
        } finally {
          state.loading.isSaving = false;
        }
      }),

      delete: $(async (name: string) => {
        state.loading.isLoading = true;
        try {
          const result = await deleteSchema(name);

          if (result.success) {
            addNotification({
              type: 'success',
              title: 'Schéma supprimé',
              message: result.message,
              duration: 3000
            });

            // Nettoyer le cache
            state.cache.cachedSchemas.delete(name);

            // Recharger la liste
            await actions.schemas.loadAll();

            // Si c'était le schéma sélectionné, déselectionner
            if (state.ui.selectedSchemaName === name) {
              state.ui.selectedSchemaName = null;
            }
          } else {
            addNotification({
              type: 'error',
              title: 'Erreur de suppression',
              message: result.message
            });
          }

          return result;
        } catch (error) {
          const message = 'Erreur lors de la suppression du schéma';
          addNotification({
            type: 'error',
            title: 'Erreur',
            message
          });
          return { success: false, message };
        } finally {
          state.loading.isLoading = false;
        }
      }),

      duplicate: $(async (originalName: string, newName: string) => {
        const originalSchema = await actions.schemas.loadById(originalName);
        if (!originalSchema) {
          return { success: false, message: 'Schéma original non trouvé' };
        }

        // Créer une copie avec le nouveau nom
        const duplicatedSchema = { ...originalSchema.schema };
        duplicatedSchema.title = newName;

        return await saveSchema(newName, duplicatedSchema);
      }),

      select: $(async (name: string | null) => {
        state.ui.selectedSchemaName = name;

        if (name) {
          const schema = await actions.schemas.loadById(name);
          if (schema) {
            // Charger le schéma dans l'éditeur si nécessaire
            // Cette logique peut être étendue selon les besoins
          }
        }
      }),

      selectProperty: $((propertyId: string | null) => {
        state.ui.selectedPropertyId = propertyId;
      }),

      validate: $(async (schema?: JsonSchemaOutput) => {
        state.loading.isValidating = true;
        try {
          const schemaToValidate = schema || await generateJsonSchema(
            state.currentSchema.schemaInfo,
            state.currentSchema.properties
          );

          const result = await validateJsonSchema(schemaToValidate);

          // Mettre à jour l'état de validation
          state.currentSchema.isValid = result.isValid;
          state.currentSchema.errors = result.errors;

          return result;
        } catch (error) {
          return {
            isValid: false,
            errors: ['Erreur lors de la validation']
          };
        } finally {
          state.loading.isValidating = false;
        }
      }),

      generateSchema: $(async (schemaInfo: SchemaInfo, properties: SchemaProperty[]) => {
        state.loading.isGenerating = true;
        try {
          const schema = await generateJsonSchema(schemaInfo, properties);
          return schema;
        } finally {
          state.loading.isGenerating = false;
        }
      })
    },

    // === GESTION DES PROPRIÉTÉS ===
    properties: {
      add: $((property: Omit<SchemaProperty, 'id'>, parentId?: string) => {
        const newProperty: SchemaProperty = {
          ...property,
          id: generateId()
        };

        if (parentId) {
          // Ajouter à une propriété parent
          const findAndAddToParent = (props: SchemaProperty[]): boolean => {
            for (const prop of props) {
              if (prop.id === parentId) {
                if (!prop.properties) prop.properties = [];
                prop.properties.push(newProperty);
                return true;
              }
              if (prop.properties && findAndAddToParent(prop.properties)) {
                return true;
              }
            }
            return false;
          };
          findAndAddToParent(state.currentSchema.properties);
        } else {
          // Ajouter au niveau racine
          state.currentSchema.properties.push(newProperty);
        }

        // Auto-save
        if (state.drafts.autoSaveEnabled) {
          actions.drafts.triggerAutoSave();
        }
      }),

      update: $((propertyId: string, updates: Partial<SchemaProperty>) => {
        const findAndUpdate = (props: SchemaProperty[]): boolean => {
          for (const prop of props) {
            if (prop.id === propertyId) {
              Object.assign(prop, updates);
              return true;
            }
            if (prop.properties && findAndUpdate(prop.properties)) {
              return true;
            }
          }
          return false;
        };

        findAndUpdate(state.currentSchema.properties);

        // Auto-save
        if (state.drafts.autoSaveEnabled) {
          actions.drafts.triggerAutoSave();
        }
      }),

      delete: $((propertyId: string) => {
        const findAndDelete = (props: SchemaProperty[]): boolean => {
          for (let i = 0; i < props.length; i++) {
            if (props[i].id === propertyId) {
              props.splice(i, 1);
              return true;
            }
            if (props[i].properties && findAndDelete(props[i].properties!)) {
              return true;
            }
          }
          return false;
        };

        findAndDelete(state.currentSchema.properties);

        // Auto-save
        if (state.drafts.autoSaveEnabled) {
          actions.drafts.triggerAutoSave();
        }
      }),

      move: $((propertyId: string, newIndex: number, parentId?: string) => {
        // Implémentation du déplacement de propriétés
        // Cette logique peut être complexe selon la structure souhaitée
      }),

      duplicate: $((propertyId: string) => {
        const findAndDuplicate = (props: SchemaProperty[]): boolean => {
          for (let i = 0; i < props.length; i++) {
            if (props[i].id === propertyId) {
              const duplicate = { ...props[i], id: generateId(), name: `${props[i].name}_copy` };
              props.splice(i + 1, 0, duplicate);
              return true;
            }
            if (props[i].properties && findAndDuplicate(props[i].properties!)) {
              return true;
            }
          }
          return false;
        };

        findAndDuplicate(state.currentSchema.properties);
      }),

      expand: $((propertyId: string) => {
        state.ui.expandedProperties.add(propertyId);
      }),

      collapse: $((propertyId: string) => {
        state.ui.expandedProperties.delete(propertyId);
      }),

      toggleExpansion: $((propertyId: string) => {
        if (state.ui.expandedProperties.has(propertyId)) {
          state.ui.expandedProperties.delete(propertyId);
        } else {
          state.ui.expandedProperties.add(propertyId);
        }
      }),

      expandAll: $(() => {
        const addAllIds = (props: SchemaProperty[]) => {
          props.forEach(prop => {
            if (prop.id) state.ui.expandedProperties.add(prop.id);
            if (prop.properties) addAllIds(prop.properties);
          });
        };
        addAllIds(state.currentSchema.properties);
      }),

      collapseAll: $(() => {
        state.ui.expandedProperties.clear();
      }),

      search: $((query: string) => {
        // Implémentation de la recherche
        const results: SchemaProperty[] = [];
        const searchInProps = (props: SchemaProperty[]) => {
          props.forEach(prop => {
            if (prop.name.toLowerCase().includes(query.toLowerCase()) ||
                prop.description.toLowerCase().includes(query.toLowerCase())) {
              results.push(prop);
            }
            if (prop.properties) searchInProps(prop.properties);
          });
        };
        searchInProps(state.currentSchema.properties);
        return results;
      }),

      filter: $((predicate: (property: SchemaProperty) => boolean) => {
        const results: SchemaProperty[] = [];
        const filterProps = (props: SchemaProperty[]) => {
          props.forEach(prop => {
            if (predicate(prop)) {
              results.push(prop);
            }
            if (prop.properties) filterProps(prop.properties);
          });
        };
        filterProps(state.currentSchema.properties);
        return results;
      })
    },

    // === GESTION DU CACHE ===
    cache: {
      invalidate: $((schemaName?: string) => {
        if (schemaName) {
          state.cache.cachedSchemas.delete(schemaName);
        } else {
          state.cache.cachedSchemas.clear();
        }
      }),

      invalidateAll: $(() => {
        state.cache.cachedSchemas.clear();
      }),

      refresh: $(async (schemaName: string) => {
        state.cache.cachedSchemas.delete(schemaName);
        await actions.schemas.loadById(schemaName);
      }),

      setTTL: $((ttl: number) => {
        state.cache.ttl = ttl;
      }),

      setMaxSize: $((maxSize: number) => {
        state.cache.maxCacheSize = maxSize;
      }),

      cleanup: $(() => {
        const now = Date.now();
        for (const [key, entry] of state.cache.cachedSchemas.entries()) {
          if (now - new Date(entry.timestamp).getTime() > state.cache.ttl) {
            state.cache.cachedSchemas.delete(key);
          }
        }
      }),

      clearExpired: $(() => {
        actions.cache.cleanup();
      }),

      getStats: $(() => {
        const entries = Array.from(state.cache.cachedSchemas.values());
        const totalEntries = entries.length;
        const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
        const avgAccessTime = totalAccess > 0 ? totalAccess / totalEntries : 0;

        return {
          totalEntries,
          totalSizeBytes: 0, // Peut être calculé si nécessaire
          hitRate: 0, // Nécessite un tracking des hits/misses
          missRate: 0,
          avgAccessTime,
          oldestEntry: entries.length > 0 ? entries.reduce((oldest, entry) =>
            new Date(entry.timestamp) < new Date(oldest.timestamp) ? entry : oldest
          ).schema.name : null,
          newestEntry: entries.length > 0 ? entries.reduce((newest, entry) =>
            new Date(entry.timestamp) > new Date(newest.timestamp) ? entry : newest
          ).schema.name : null
        } as CacheStats;
      })
    },

    // === GESTION DES BROUILLONS ===
    drafts: {
      save: $((name: string, schemaInfo: SchemaInfo, properties: SchemaProperty[], originalSchemaName?: string) => {
        const draft: SchemaDraft = {
          name,
          schemaInfo,
          properties,
          originalSchemaName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          autoSaved: false
        };

        state.drafts.drafts.set(name, draft);

        // Sauvegarder aussi dans localStorage
        if (originalSchemaName) {
          localStorageService.saveEditDraft(originalSchemaName, {
            schemaInfo,
            properties,
            lastSaved: new Date().toISOString(),
            isEditing: true,
            originalId: originalSchemaName
          });
        } else {
          localStorageService.saveDraft({
            schemaInfo,
            properties,
            lastSaved: new Date().toISOString()
          });
        }
      }),

      load: $((name: string) => {
        return state.drafts.drafts.get(name) || null;
      }),

      delete: $((name: string) => {
        state.drafts.drafts.delete(name);
      }),

      list: $(() => {
        return Array.from(state.drafts.drafts.values());
      }),

      enableAutoSave: $((interval?: number) => {
        state.drafts.autoSaveEnabled = true;
        if (interval) {
          state.drafts.autoSaveInterval = interval;
        }
      }),

      disableAutoSave: $(() => {
        state.drafts.autoSaveEnabled = false;
      }),

      triggerAutoSave: $(() => {
        if (state.drafts.autoSaveEnabled) {
          actions.drafts.save(
            state.currentSchema.schemaInfo.name || 'draft',
            state.currentSchema.schemaInfo,
            state.currentSchema.properties
          );
          state.drafts.lastAutoSave = new Date().toISOString();
        }
      }),

      restoreFromDraft: $((draftName: string) => {
        const draft = state.drafts.drafts.get(draftName);
        if (draft) {
          state.currentSchema.schemaInfo = draft.schemaInfo;
          state.currentSchema.properties = draft.properties;
        }
      }),

      hasDraft: $((schemaName: string) => {
        return state.drafts.drafts.has(schemaName);
      }),

      getDraftChanges: $((draftName: string, originalSchema?: LoadedSchema) => {
        // Implémentation de la comparaison des changements
        return [];
      })
    },

    // === GESTION DE L'UI ===
    ui: {
      setActiveView: $((view: UIState['activeView']) => {
        state.ui.activeView = view;
      }),

      setActivePanel: $((panel: UIState['activePanel']) => {
        state.ui.activePanel = panel;
      }),

      toggleSidebar: $(() => {
        state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
      }),

      setEditMode: $((mode: UIState['editMode']) => {
        state.ui.editMode = mode;
      }),

      setSearchQuery: $((query: string) => {
        state.ui.searchQuery = query;
      }),

      setFilters: $((filters: Partial<UIState['filters']>) => {
        Object.assign(state.ui.filters, filters);
      }),

      clearFilters: $(() => {
        state.ui.filters = {};
      }),

      toggleValidation: $(() => {
        state.ui.validationEnabled = !state.ui.validationEnabled;
      }),

      showValidationErrors: $((show: boolean) => {
        state.ui.showValidationErrors = show;
      })
    },

    // === GESTION DES NOTIFICATIONS ===
    notifications: {
      success: $((title: string, message: string, duration?: number) => {
        return addNotification({ type: 'success', title, message, duration });
      }),

      error: $((title: string, message: string, actions?: any[]) => {
        return addNotification({ type: 'error', title, message, actions });
      }),

      warning: $((title: string, message: string, duration?: number) => {
        return addNotification({ type: 'warning', title, message, duration });
      }),

      info: $((title: string, message: string, duration?: number) => {
        return addNotification({ type: 'info', title, message, duration });
      }),

      dismiss: $((id: string) => {
        const index = state.notifications.notifications.findIndex(n => n.id === id);
        if (index > -1) {
          state.notifications.notifications.splice(index, 1);
        }
      }),

      dismissAll: $(() => {
        state.notifications.notifications.length = 0;
      }),

      setMaxNotifications: $((max: number) => {
        state.notifications.maxNotifications = max;
      })
    },

    // === ACTIONS UTILITAIRES ===
    utils: {
      exportSchema: $((name: string, format: 'json' | 'yaml') => {
        const schema = state.schemas.find(s => s.name === name);
        if (!schema) return '';

        if (format === 'json') {
          return JSON.stringify(schema.schema, null, 2);
        } else {
          // Implémentation YAML si nécessaire
          return JSON.stringify(schema.schema, null, 2);
        }
      }),

      importSchema: $(async (content: string, format: 'json' | 'yaml') => {
        try {
          let parsedSchema;
          if (format === 'json') {
            parsedSchema = JSON.parse(content);
          } else {
            // Implémentation YAML si nécessaire
            parsedSchema = JSON.parse(content);
          }

          // Validation basique
          if (!parsedSchema.type || !parsedSchema.title) {
            return { success: false, errors: ['Schéma invalide'] };
          }

          const loadedSchema: LoadedSchema = {
            name: parsedSchema.title,
            schema: parsedSchema,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          return { success: true, schema: loadedSchema };
        } catch (error) {
          return { success: false, errors: ['Erreur de parsing'] };
        }
      }),

      reset: $(() => {
        Object.assign(state, createInitialState());
      }),

      clearAllData: $(() => {
        state.schemas.length = 0;
        state.cache.cachedSchemas.clear();
        state.drafts.drafts.clear();
        state.notifications.notifications.length = 0;
        localStorageService.clearDraft();
      }),

      syncWithServer: $(async () => {
        await actions.schemas.loadAll();
      }),

      createBackup: $(async () => {
        // Implémentation du backup
        return generateId();
      }),

      restoreBackup: $(async (backupId: string) => {
        // Implémentation de la restauration
      })
    }
  };

  // Valeur du contexte
  const contextValue: SchemaEditorContextValue = {
    state,
    actions,
    config,
    signals: {
      currentSchemaSignal,
      uiStateSignal,
      loadingSignal,
      notificationsSignal,
      draftsSignal
    }
  };

  // Fournir le contexte
  useContextProvider(SchemaEditorContext, contextValue);

  return <Slot />;
});

// Hook pour utiliser le contexte
export const useSchemaEditor = () => {
  const context = useContext(SchemaEditorContext);
  if (!context) {
    throw new Error('useSchemaEditor must be used within a SchemaEditorProvider');
  }
  return context;
};