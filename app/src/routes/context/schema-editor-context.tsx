import {
  component$,
  createContextId,
  useContext,
  useContextProvider,
  useStore,
  useSignal,
  useTask$,
  $,
  Slot,
  type Signal,
  type QwikChangeEvent
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import type {
  SchemaProperty,
  SchemaInfo,
  JsonSchemaOutput,
  SchemaEditorState,
  VersionedSchema
} from '../types';
import type { DraftSchema } from '../localStorage';
import { localStorageService } from '../localStorage';
import {
  generateJsonSchema,
  validateJsonSchema,
  saveSchema,
  updateSchema,
  loadSchemas,
  deleteSchema
} from '../services';

// Types pour le contexte
export interface NotificationState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface UIState {
  loading: boolean;
  saving: boolean;
  validating: boolean;
  notification: NotificationState;
}

export interface CacheState {
  schemas: Map<string, VersionedSchema>;
  lastFetch: number;
  cacheDuration: number; // en millisecondes
}

export interface SchemaEditorStore {
  // État du schéma en cours d'édition
  current: SchemaEditorState;

  // État UI
  ui: UIState;

  // Cache des schémas
  cache: CacheState;

  // Gestion des brouillons
  draft: {
    hasUnsavedChanges: boolean;
    lastSaved: string | null;
    autoSaveEnabled: boolean;
    isEditMode: boolean;
    originalSchemaId: string | null;
  };

  // Historique des actions (pour undo/redo)
  history: {
    past: SchemaEditorState[];
    future: SchemaEditorState[];
    maxSize: number;
  };
}

export interface SchemaEditorActions {
  // Actions sur les propriétés
  addProperty: (property: SchemaProperty, parentId?: string) => Promise<void>;
  removeProperty: (propertyId: string) => Promise<void>;
  updateProperty: (propertyId: string, updates: Partial<SchemaProperty>) => Promise<void>;
  moveProperty: (propertyId: string, direction: 'up' | 'down') => Promise<void>;
  duplicateProperty: (propertyId: string) => Promise<void>;

  // Actions sur le schéma
  updateSchemaInfo: (updates: Partial<SchemaInfo>) => Promise<void>;
  generateSchema: () => Promise<JsonSchemaOutput | null>;
  validateSchema: () => Promise<{ isValid: boolean; errors: string[] }>;

  // Actions de sauvegarde
  saveSchema: (name?: string) => Promise<{ success: boolean; message: string; version?: string }>;
  saveDraft: () => Promise<void>;
  loadDraft: () => Promise<void>;
  clearDraft: () => Promise<void>;

  // Actions sur le cache
  loadSchemasList: (force?: boolean) => Promise<VersionedSchema[]>;
  loadSchemaForEditing: (schemaId: string) => Promise<void>;
  deleteSchemaFromCache: (schemaId: string) => Promise<void>;

  // Actions UI
  showNotification: (message: string, type?: NotificationState['type'], duration?: number) => void;
  hideNotification: () => void;
  setLoading: (loading: boolean) => void;

  // Actions historique
  undo: () => void;
  redo: () => void;
  resetHistory: () => void;

  // Actions utilitaires
  resetEditor: () => Promise<void>;
  exportSchema: (format: 'json' | 'typescript') => Promise<string>;
  importSchema: (schemaData: string) => Promise<void>;
}

export interface SchemaEditorContextType {
  store: SchemaEditorStore;
  actions: SchemaEditorActions;
}

// Créer le contexte
export const SchemaEditorContext = createContextId<SchemaEditorContextType>('schema-editor-context');

// Server actions pour optimiser les appels réseau
const serverValidateSchema = server$(async function(schema: JsonSchemaOutput) {
  return await validateJsonSchema(schema);
});

const serverGenerateSchema = server$(async function(schemaInfo: SchemaInfo, properties: SchemaProperty[]) {
  return await generateJsonSchema(schemaInfo, properties);
});

// Utilitaires
const createInitialState = (): SchemaEditorState => ({
  schemaInfo: {
    name: '',
    title: '',
    description: '',
    type: 'object'
  },
  properties: [],
  isValid: false,
  errors: []
});

const createInitialStore = (): SchemaEditorStore => ({
  current: createInitialState(),
  ui: {
    loading: false,
    saving: false,
    validating: false,
    notification: {
      show: false,
      type: 'success',
      message: '',
      duration: 5000
    }
  },
  cache: {
    schemas: new Map(),
    lastFetch: 0,
    cacheDuration: 5 * 60 * 1000 // 5 minutes
  },
  draft: {
    hasUnsavedChanges: false,
    lastSaved: null,
    autoSaveEnabled: true,
    isEditMode: false,
    originalSchemaId: null
  },
  history: {
    past: [],
    future: [],
    maxSize: 20
  }
});

// Fonctions utilitaires pour l'historique
const addToHistory = (store: SchemaEditorStore, state: SchemaEditorState) => {
  store.history.past.push(JSON.parse(JSON.stringify(state)));
  if (store.history.past.length > store.history.maxSize) {
    store.history.past.shift();
  }
  store.history.future = [];
};

const generateUniqueId = () => {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const findPropertyById = (properties: SchemaProperty[], id: string): SchemaProperty | null => {
  for (const prop of properties) {
    if (prop.id === id) return prop;
    if (prop.properties) {
      const found = findPropertyById(prop.properties, id);
      if (found) return found;
    }
    if (prop.items?.properties) {
      const found = findPropertyById(prop.items.properties, id);
      if (found) return found;
    }
  }
  return null;
};

const removePropertyById = (properties: SchemaProperty[], id: string): boolean => {
  for (let i = 0; i < properties.length; i++) {
    if (properties[i].id === id) {
      properties.splice(i, 1);
      return true;
    }
    if (properties[i].properties && removePropertyById(properties[i].properties!, id)) {
      return true;
    }
    if (properties[i].items?.properties && removePropertyById(properties[i].items.properties, id)) {
      return true;
    }
  }
  return false;
};

export const SchemaEditorProvider = component$(() => {
  const store = useStore<SchemaEditorStore>(createInitialStore());

  // Actions
  const actions: SchemaEditorActions = {
    addProperty: $(async (property: SchemaProperty, parentId?: string) => {
      addToHistory(store, store.current);

      const newProperty = {
        ...property,
        id: generateUniqueId()
      };

      if (parentId) {
        const parent = findPropertyById(store.current.properties, parentId);
        if (parent) {
          if (parent.type === 'object') {
            if (!parent.properties) parent.properties = [];
            parent.properties.push(newProperty);
          } else if (parent.type === 'array' && parent.items) {
            if (!parent.items.properties) parent.items.properties = [];
            parent.items.properties.push(newProperty);
          }
        }
      } else {
        store.current.properties.push(newProperty);
      }

      store.draft.hasUnsavedChanges = true;
      if (store.draft.autoSaveEnabled) {
        await actions.saveDraft();
      }
    }),

    removeProperty: $(async (propertyId: string) => {
      addToHistory(store, store.current);

      if (removePropertyById(store.current.properties, propertyId)) {
        store.draft.hasUnsavedChanges = true;
        if (store.draft.autoSaveEnabled) {
          await actions.saveDraft();
        }
      }
    }),

    updateProperty: $(async (propertyId: string, updates: Partial<SchemaProperty>) => {
      addToHistory(store, store.current);

      const property = findPropertyById(store.current.properties, propertyId);
      if (property) {
        Object.assign(property, updates);
        store.draft.hasUnsavedChanges = true;
        if (store.draft.autoSaveEnabled) {
          await actions.saveDraft();
        }
      }
    }),

    moveProperty: $(async (propertyId: string, direction: 'up' | 'down') => {
      addToHistory(store, store.current);

      const moveInArray = (arr: SchemaProperty[]) => {
        const index = arr.findIndex(p => p.id === propertyId);
        if (index === -1) return false;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= arr.length) return false;

        [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
        return true;
      };

      if (moveInArray(store.current.properties)) {
        store.draft.hasUnsavedChanges = true;
        if (store.draft.autoSaveEnabled) {
          await actions.saveDraft();
        }
      }
    }),

    duplicateProperty: $(async (propertyId: string) => {
      const property = findPropertyById(store.current.properties, propertyId);
      if (property) {
        const duplicate = JSON.parse(JSON.stringify(property));
        duplicate.id = generateUniqueId();
        duplicate.name = `${duplicate.name}_copy`;

        await actions.addProperty(duplicate);
      }
    }),

    updateSchemaInfo: $(async (updates: Partial<SchemaInfo>) => {
      addToHistory(store, store.current);

      Object.assign(store.current.schemaInfo, updates);
      store.draft.hasUnsavedChanges = true;

      if (store.draft.autoSaveEnabled) {
        await actions.saveDraft();
      }
    }),

    generateSchema: $(async () => {
      try {
        store.ui.loading = true;
        const schema = await serverGenerateSchema(store.current.schemaInfo, store.current.properties);
        return schema;
      } catch (error) {
        actions.showNotification('Erreur lors de la génération du schéma', 'error');
        return null;
      } finally {
        store.ui.loading = false;
      }
    }),

    validateSchema: $(async () => {
      try {
        store.ui.validating = true;
        const schema = await actions.generateSchema();
        if (!schema) {
          return { isValid: false, errors: ['Impossible de générer le schéma'] };
        }

        const validation = await serverValidateSchema(schema);
        store.current.isValid = validation.isValid;
        store.current.errors = validation.errors;

        return validation;
      } catch (error) {
        const errors = ['Erreur lors de la validation'];
        store.current.isValid = false;
        store.current.errors = errors;
        return { isValid: false, errors };
      } finally {
        store.ui.validating = false;
      }
    }),

    saveSchema: $(async (name?: string) => {
      try {
        store.ui.saving = true;

        const schemaName = name || store.current.schemaInfo.name;
        if (!schemaName.trim()) {
          return { success: false, message: 'Le nom du schéma est requis' };
        }

        const validation = await actions.validateSchema();
        if (!validation.isValid) {
          return {
            success: false,
            message: `Schéma invalide: ${validation.errors.join(', ')}`
          };
        }

        const schema = await actions.generateSchema();
        if (!schema) {
          return { success: false, message: 'Impossible de générer le schéma' };
        }

        let result;
        if (store.draft.isEditMode && store.draft.originalSchemaId) {
          result = await updateSchema(store.draft.originalSchemaId, schemaName, schema);
        } else {
          result = await saveSchema(schemaName, schema);
        }

        if (result.success) {
          store.draft.hasUnsavedChanges = false;
          store.draft.lastSaved = new Date().toISOString();
          actions.clearDraft();
          actions.showNotification(result.message, 'success');

          // Invalider le cache pour forcer le rechargement
          store.cache.lastFetch = 0;
        } else {
          actions.showNotification(result.message, 'error');
        }

        return result;
      } catch (error) {
        const message = 'Erreur lors de la sauvegarde';
        actions.showNotification(message, 'error');
        return { success: false, message };
      } finally {
        store.ui.saving = false;
      }
    }),

    saveDraft: $(async () => {
      const draft: DraftSchema = {
        schemaInfo: store.current.schemaInfo,
        properties: store.current.properties,
        lastSaved: new Date().toISOString(),
        isEditing: store.draft.isEditMode,
        originalId: store.draft.originalSchemaId || undefined
      };

      if (store.draft.isEditMode && store.draft.originalSchemaId) {
        localStorageService.saveEditDraft(store.draft.originalSchemaId, draft);
      } else {
        localStorageService.saveDraft(draft);
      }

      store.draft.lastSaved = draft.lastSaved;
    }),

    loadDraft: $(async () => {
      let draft: DraftSchema | null = null;

      if (store.draft.isEditMode && store.draft.originalSchemaId) {
        draft = localStorageService.loadEditDraft(store.draft.originalSchemaId);
      } else {
        draft = localStorageService.loadDraft();
      }

      if (draft) {
        store.current.schemaInfo = draft.schemaInfo;
        store.current.properties = draft.properties;
        store.draft.lastSaved = draft.lastSaved;
        store.draft.hasUnsavedChanges = true;

        actions.showNotification('Brouillon chargé', 'info');
      }
    }),

    clearDraft: $(async () => {
      if (store.draft.isEditMode && store.draft.originalSchemaId) {
        localStorageService.clearEditDraft(store.draft.originalSchemaId);
      } else {
        localStorageService.clearDraft();
      }

      store.draft.hasUnsavedChanges = false;
      store.draft.lastSaved = null;
    }),

    loadSchemasList: $(async (force = false) => {
      const now = Date.now();
      if (!force && (now - store.cache.lastFetch) < store.cache.cacheDuration) {
        return Array.from(store.cache.schemas.values());
      }

      try {
        store.ui.loading = true;
        const schemas = await loadSchemas();

        // Mettre à jour le cache
        store.cache.schemas.clear();
        schemas.forEach(schema => {
          const versionedSchema: VersionedSchema = {
            id: schema.name,
            name: schema.name,
            version: schema.version || '1.0',
            schema: schema.schema,
            versionInfo: schema.versionInfo || {
              version: schema.version || '1.0',
              createdAt: schema.createdAt,
              changeType: 'major',
              changeDescription: 'Version initiale'
            },
            createdAt: schema.createdAt,
            updatedAt: schema.updatedAt
          };
          store.cache.schemas.set(schema.name, versionedSchema);
        });

        store.cache.lastFetch = now;
        return Array.from(store.cache.schemas.values());
      } catch (error) {
        actions.showNotification('Erreur lors du chargement des schémas', 'error');
        return [];
      } finally {
        store.ui.loading = false;
      }
    }),

    loadSchemaForEditing: $(async (schemaId: string) => {
      try {
        store.ui.loading = true;

        // Vérifier d'abord le cache
        let schema = store.cache.schemas.get(schemaId);

        if (!schema) {
          // Charger depuis le serveur
          await actions.loadSchemasList(true);
          schema = store.cache.schemas.get(schemaId);
        }

        if (!schema) {
          actions.showNotification('Schéma non trouvé', 'error');
          return;
        }

        // Charger un éventuel brouillon d'édition
        const editDraft = localStorageService.loadEditDraft(schemaId);

        if (editDraft) {
          const loadDraft = confirm('Un brouillon d\'édition existe pour ce schéma. Voulez-vous le charger ?');
          if (loadDraft) {
            store.current.schemaInfo = editDraft.schemaInfo;
            store.current.properties = editDraft.properties;
            store.draft.hasUnsavedChanges = true;
          } else {
            // Charger le schéma original
            store.current.schemaInfo = {
              name: schema.name,
              title: schema.schema.title || schema.name,
              description: schema.schema.description || '',
              type: schema.schema.type as 'object' | 'array'
            };
            // Reconstituer les propriétés depuis le schéma JSON
            const { jsonSchemaToProperties } = await import('./schema-converter');
            store.current.properties = jsonSchemaToProperties(schema.schema);
          }
        } else {
          // Charger le schéma original
          store.current.schemaInfo = {
            name: schema.name,
            title: schema.schema.title || schema.name,
            description: schema.schema.description || '',
            type: schema.schema.type as 'object' | 'array'
          };
          // Reconstituer les propriétés depuis le schéma JSON
          const { jsonSchemaToProperties } = await import('./schema-converter');
          store.current.properties = jsonSchemaToProperties(schema.schema);
        }

        store.draft.isEditMode = true;
        store.draft.originalSchemaId = schemaId;
        actions.resetHistory();

        actions.showNotification('Schéma chargé pour édition', 'success');
      } catch (error) {
        actions.showNotification('Erreur lors du chargement du schéma', 'error');
      } finally {
        store.ui.loading = false;
      }
    }),

    deleteSchemaFromCache: $(async (schemaId: string) => {
      try {
        const result = await deleteSchema(schemaId);
        if (result.success) {
          store.cache.schemas.delete(schemaId);
          actions.showNotification(result.message, 'success');
        } else {
          actions.showNotification(result.message, 'error');
        }
        return result;
      } catch (error) {
        actions.showNotification('Erreur lors de la suppression', 'error');
        return { success: false, message: 'Erreur lors de la suppression' };
      }
    }),

    showNotification: $((message: string, type: NotificationState['type'] = 'success', duration = 5000) => {
      store.ui.notification = {
        show: true,
        type,
        message,
        duration
      };

      // Auto-hide après la durée spécifiée
      setTimeout(() => {
        actions.hideNotification();
      }, duration);
    }),

    hideNotification: $(() => {
      store.ui.notification.show = false;
    }),

    setLoading: $((loading: boolean) => {
      store.ui.loading = loading;
    }),

    undo: $(() => {
      if (store.history.past.length > 0) {
        const previous = store.history.past.pop()!;
        store.history.future.push(JSON.parse(JSON.stringify(store.current)));
        store.current = previous;
        store.draft.hasUnsavedChanges = true;
      }
    }),

    redo: $(() => {
      if (store.history.future.length > 0) {
        const next = store.history.future.pop()!;
        store.history.past.push(JSON.parse(JSON.stringify(store.current)));
        store.current = next;
        store.draft.hasUnsavedChanges = true;
      }
    }),

    resetHistory: $(() => {
      store.history.past = [];
      store.history.future = [];
    }),

    resetEditor: $(async () => {
      addToHistory(store, store.current);
      store.current = createInitialState();
      store.draft = {
        hasUnsavedChanges: false,
        lastSaved: null,
        autoSaveEnabled: true,
        isEditMode: false,
        originalSchemaId: null
      };
      actions.resetHistory();
    }),

    exportSchema: $(async (format: 'json' | 'typescript') => {
      const schema = await actions.generateSchema();
      if (!schema) return '';

      if (format === 'json') {
        return JSON.stringify(schema, null, 2);
      } else {
        // TODO: Implémenter l'export TypeScript
        return `// TODO: Export TypeScript\n${JSON.stringify(schema, null, 2)}`;
      }
    }),

    importSchema: $(async (schemaData: string) => {
      try {
        const parsed = JSON.parse(schemaData);
        // TODO: Convertir le schéma JSON en SchemaProperty[]
        actions.showNotification('Import non encore implémenté', 'warning');
      } catch (error) {
        actions.showNotification('Données de schéma invalides', 'error');
      }
    })
  };

  // Auto-save draft périodiquement
  useTask$(async ({ track, cleanup }) => {
    track(() => store.draft.hasUnsavedChanges);

    if (store.draft.hasUnsavedChanges && store.draft.autoSaveEnabled) {
      const timeoutId = setTimeout(async () => {
        await actions.saveDraft();
      }, 2000); // Auto-save après 2 secondes d'inactivité

      cleanup(() => clearTimeout(timeoutId));
    }
  });

  // Fournir le contexte
  useContextProvider(SchemaEditorContext, { store, actions });

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

// Composant de notification (optionnel, peut être utilisé dans l'UI)
export const SchemaEditorNotification = component$(() => {
  const { store, actions } = useSchemaEditor();

  if (!store.ui.notification.show) {
    return null;
  }

  return (
    <div
      class={`notification notification-${store.ui.notification.type}`}
      onClick$={() => actions.hideNotification()}
    >
      <span>{store.ui.notification.message}</span>
      <button onClick$={() => actions.hideNotification()}>✕</button>
    </div>
  );
});