import {
  component$,
  createContextId,
  useContext,
  useContextProvider,
  useStore,
  useTask$,
  useSignal,
  $,
  Slot,
  type Signal
} from '@builder.io/qwik';
import type { EntityData } from '../types';
import { generateDefaultValue } from '../services';

// Types pour le contexte de création d'entité
export interface EntityCreationState {
  // Données de l'entité
  entity: EntityData;

  // Schéma actuel
  schema: any;
  schemaName: string;
  schemaTitle: string;
  schemaVersion: string;

  // Données des colonnes (pour la navigation)
  columns: Array<{
    data: any;
    schema: any;
    path: string[];
    parentName: string;
    level: number;
    isArray?: boolean;
    arrayIndex?: number;
  }>;

  // État de navigation
  navigation: {
    selectedPath: string[];
    expandedColumns: number;
  };

  // État de modification
  modifications: {
    hasChanges: boolean;
    originalData: string; // JSON stringifié des données originales
  };
}

export interface EntityCreationUI {
  loading: boolean;
  saving: boolean;
  validating: boolean;
  showJsonPreview: boolean;
  notification: {
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  };
}

export interface EntityCreationStore {
  state: EntityCreationState;
  ui: EntityCreationUI;
}

export interface EntityCreationActions {
  // Actions sur les données
  updateEntityData: (path: string[], newValue: any) => void;
  addArrayElement: (path: string[], schema: any) => void;
  removeArrayElement: (path: string[], index: number) => void;
  addProperty: (path: string[], key: string, value: any) => void;
  removeProperty: (path: string[], key: string) => void;

  // Actions de navigation
  navigateToProperty: (key: string, columnIndex: number) => void;
  navigateToArrayItem: (arrayIndex: number, columnIndex: number) => void;
  goBack: (columnIndex: number) => void;
  resetNavigation: () => void;

  // Actions d'UI
  showNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  hideNotification: () => void;
  toggleJsonPreview: () => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;

  // Actions de validation
  validateEntity: () => Promise<{ isValid: boolean; errors: string[] }>;

  // Utilitaires
  resetToDefaults: () => void;
  getColumnData: (columnIndex: number) => any;
  hasModifications: () => boolean;
  exportEntityJson: () => string;
}

export interface EntityCreationContextType {
  store: EntityCreationStore;
  actions: EntityCreationActions;
}

// Créer le contexte
export const EntityCreationContext = createContextId<EntityCreationContextType>('entity-creation-context');

// Utilitaires pour la manipulation des données
const deepClone = (obj: any): any => JSON.parse(JSON.stringify(obj));

const getValueAtPath = (data: any, path: string[]): any => {
  let current = data;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
};

const setValueAtPath = (data: any, path: string[], value: any): any => {
  const result = deepClone(data);
  let current = result;

  // Naviguer jusqu'au parent
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] === undefined) {
      // Déterminer le type selon le prochain élément du path
      const nextKey = path[i + 1];
      const isNextKeyArrayIndex = !isNaN(parseInt(nextKey));
      current[key] = isNextKeyArrayIndex ? [] : {};
    }
    current = current[key];
  }

  // Définir la valeur finale
  if (path.length > 0) {
    current[path[path.length - 1]] = value;
  } else {
    // Si path est vide, remplacer les données racine
    Object.assign(result, value);
  }

  return result;
};

const removeValueAtPath = (data: any, path: string[]): any => {
  const result = deepClone(data);
  let current = result;

  // Naviguer jusqu'au parent
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] === undefined) return result;
    current = current[key];
  }

  // Supprimer la propriété
  if (path.length > 0) {
    const key = path[path.length - 1];
    if (Array.isArray(current)) {
      current.splice(parseInt(key), 1);
    } else {
      delete current[key];
    }
  }

  return result;
};

// Fonction pour calculer les colonnes de navigation
const calculateColumns = (
  entityData: any,
  schema: any,
  selectedPath: string[],
  schemaTitle: string
): EntityCreationState['columns'] => {
  const columns: EntityCreationState['columns'] = [];

  // Première colonne : données racine
  columns.push({
    data: entityData,
    schema: schema,
    path: [],
    parentName: schemaTitle || 'Entité',
    level: 0
  });

  // Colonnes suivantes basées sur le chemin sélectionné
  let currentData = entityData;
  let currentSchema = schema;

  for (let i = 0; i < selectedPath.length; i++) {
    const key = selectedPath[i];

    if (!currentData || !currentSchema) break;

    // Gérer les objets
    if (typeof currentData[key] === 'object' && !Array.isArray(currentData[key]) && currentData[key] !== null) {
      const nextData = currentData[key];
      const nextSchema = currentSchema.properties?.[key];

      if (nextSchema) {
        columns.push({
          data: nextData,
          schema: nextSchema,
          path: selectedPath.slice(0, i + 1),
          parentName: key,
          level: i + 1
        });

        currentData = nextData;
        currentSchema = nextSchema;
      }
    }
    // Gérer les tableaux
    else if (Array.isArray(currentData[key])) {
      const arraySchema = currentSchema.properties?.[key];

      if (arraySchema) {
        const freshArrayData = currentData[key];
        columns.push({
          data: freshArrayData,
          schema: arraySchema,
          path: selectedPath.slice(0, i + 1),
          parentName: `${key} (${freshArrayData.length} élément${freshArrayData.length !== 1 ? 's' : ''})`,
          level: i + 1,
          isArray: true
        });

        // Vérifier s'il y a un index d'array sélectionné
        if (i + 1 < selectedPath.length) {
          const arrayIndex = parseInt(selectedPath[i + 1]);
          if (!isNaN(arrayIndex) && arrayIndex < freshArrayData.length) {
            const itemData = freshArrayData[arrayIndex];
            const itemSchema = arraySchema.items;

            if (itemSchema) {
              columns.push({
                data: itemData,
                schema: itemSchema,
                path: selectedPath.slice(0, i + 2),
                parentName: `${key}[${arrayIndex}]`,
                level: i + 2,
                arrayIndex: arrayIndex
              });

              // Si l'élément est un objet ET qu'on a encore du chemin à parcourir, continuer
              if (typeof itemData === 'object' && itemData !== null && i + 2 < selectedPath.length) {
                currentData = itemData;
                currentSchema = itemSchema;
              }
              i++; // Skip the array index in the next iteration
            }
          }
        }
      }
    }
  }

  return columns;
};

// Fonction pour créer l'état initial
const createInitialState = (
  entity: EntityData,
  schema: any,
  schemaName: string,
  schemaTitle: string,
  schemaVersion: string
): EntityCreationState => ({
  entity: deepClone(entity),
  schema,
  schemaName,
  schemaTitle,
  schemaVersion,
  columns: calculateColumns(entity.data, schema, [], schemaTitle),
  navigation: {
    selectedPath: [],
    expandedColumns: 1
  },
  modifications: {
    hasChanges: false,
    originalData: JSON.stringify(entity.data)
  }
});

// Composant Provider
export const EntityCreationProvider = component$<{
  entity: EntityData;
  schema: any;
  schemaName: string;
  schemaTitle: string;
  schemaVersion: string;
}>((props) => {
  const store = useStore<EntityCreationStore>({
    state: createInitialState(
      props.entity,
      props.schema,
      props.schemaName,
      props.schemaTitle,
      props.schemaVersion
    ),
    ui: {
      loading: false,
      saving: false,
      validating: false,
      showJsonPreview: false,
      notification: {
        show: false,
        type: 'success',
        message: ''
      }
    }
  });

  // Signal pour forcer la mise à jour des colonnes
  const forceUpdateSignal = useSignal(0);

  // Fonction utilitaire pour mettre à jour les données et recalculer les colonnes
  const updateEntityDataInternal = $((path: string[], newValue: any) => {
    console.log('🔧 EntityCreationContext - updateEntityData:', { path, newValue });

    const newData = setValueAtPath(store.state.entity.data, path, newValue);
    store.state.entity.data = newData;

    // Recalculer les colonnes
    store.state.columns = calculateColumns(
      newData,
      store.state.schema,
      store.state.navigation.selectedPath,
      store.state.schemaTitle
    );

    // Mettre à jour l'état de modification
    const currentDataStr = JSON.stringify(newData);
    store.state.modifications.hasChanges = currentDataStr !== store.state.modifications.originalData;

    // Forcer la mise à jour
    forceUpdateSignal.value++;

    console.log('🔧 EntityCreationContext - Données mises à jour:', newData);
  });

  // Actions
  const actions: EntityCreationActions = {
    updateEntityData: $((path: string[], newValue: any) => {
      updateEntityDataInternal(path, newValue);
    }),

    addArrayElement: $((path: string[], schema: any) => {
      console.log('🔧 EntityCreationContext - addArrayElement:', { path, schema });

      const currentArray = getValueAtPath(store.state.entity.data, path) || [];
      const newItem = generateDefaultValue(schema.items);
      const newArray = [...currentArray, newItem];

      updateEntityDataInternal(path, newArray);

      // Navigation automatique vers le nouvel élément
      const newItemIndex = newArray.length - 1;
      const newPath = [...store.state.navigation.selectedPath.slice(0, path.length), newItemIndex.toString()];
      store.state.navigation.selectedPath = newPath;
      store.state.navigation.expandedColumns = Math.max(store.state.navigation.expandedColumns, path.length + 2);
    }),

    removeArrayElement: $((path: string[], index: number) => {
      console.log('🔧 EntityCreationContext - removeArrayElement:', { path, index });

      const currentArray = getValueAtPath(store.state.entity.data, path) || [];
      const newArray = currentArray.filter((_: any, i: number) => i !== index);

      updateEntityDataInternal(path, newArray);
    }),

    addProperty: $((path: string[], key: string, value: any) => {
      const currentObject = getValueAtPath(store.state.entity.data, path) || {};
      const newObject = { ...currentObject, [key]: value };
      updateEntityDataInternal(path, newObject);
    }),

    removeProperty: $((path: string[], key: string) => {
      const propertyPath = [...path, key];
      const newData = removeValueAtPath(store.state.entity.data, propertyPath);
      store.state.entity.data = newData;

      // Recalculer les colonnes
      store.state.columns = calculateColumns(
        newData,
        store.state.schema,
        store.state.navigation.selectedPath,
        store.state.schemaTitle
      );

      // Mettre à jour l'état de modification
      const currentDataStr = JSON.stringify(newData);
      store.state.modifications.hasChanges = currentDataStr !== store.state.modifications.originalData;

      forceUpdateSignal.value++;
    }),

    navigateToProperty: $((key: string, columnIndex: number) => {
      const newPath = [...store.state.navigation.selectedPath.slice(0, columnIndex), key];

      // Vérifier si cette propriété peut avoir des enfants
      const currentColumn = store.state.columns[columnIndex];
      const value = currentColumn.data[key];

      if (value && (typeof value === 'object' || Array.isArray(value))) {
        store.state.navigation.selectedPath = newPath;
        store.state.navigation.expandedColumns = Math.max(store.state.navigation.expandedColumns, columnIndex + 2);

        // Recalculer les colonnes
        store.state.columns = calculateColumns(
          store.state.entity.data,
          store.state.schema,
          newPath,
          store.state.schemaTitle
        );
      }
    }),

    navigateToArrayItem: $((arrayIndex: number, columnIndex: number) => {
      const newPath = [...store.state.navigation.selectedPath.slice(0, columnIndex), arrayIndex.toString()];
      store.state.navigation.selectedPath = newPath;
      store.state.navigation.expandedColumns = Math.max(store.state.navigation.expandedColumns, columnIndex + 2);

      // Recalculer les colonnes
      store.state.columns = calculateColumns(
        store.state.entity.data,
        store.state.schema,
        newPath,
        store.state.schemaTitle
      );
    }),

    goBack: $((columnIndex: number) => {
      console.log('🔧 EntityCreationContext - goBack:', { columnIndex });

      let newPathLength = 0;
      if (columnIndex > 0) {
        const previousColumn = store.state.columns[columnIndex - 1];
        if (previousColumn) {
          newPathLength = previousColumn.path.length;
        }
      }

      const newPath = store.state.navigation.selectedPath.slice(0, newPathLength);
      store.state.navigation.selectedPath = newPath;
      store.state.navigation.expandedColumns = columnIndex;

      // Recalculer les colonnes
      store.state.columns = calculateColumns(
        store.state.entity.data,
        store.state.schema,
        newPath,
        store.state.schemaTitle
      );
    }),

    resetNavigation: $(() => {
      store.state.navigation.selectedPath = [];
      store.state.navigation.expandedColumns = 1;
      store.state.columns = calculateColumns(
        store.state.entity.data,
        store.state.schema,
        [],
        store.state.schemaTitle
      );
    }),

    showNotification: $((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
      store.ui.notification = { show: true, type, message };

      setTimeout(() => {
        store.ui.notification = { show: false, type: 'success', message: '' };
      }, 3000);
    }),

    hideNotification: $(() => {
      store.ui.notification = { show: false, type: 'success', message: '' };
    }),

    toggleJsonPreview: $(() => {
      store.ui.showJsonPreview = !store.ui.showJsonPreview;
    }),

    setLoading: $((loading: boolean) => {
      store.ui.loading = loading;
    }),

    setSaving: $((saving: boolean) => {
      store.ui.saving = saving;
    }),

    validateEntity: $(async () => {
      // TODO: Implémenter la validation selon le schéma
      return { isValid: true, errors: [] };
    }),

    resetToDefaults: $(() => {
      const defaultData = generateDefaultValue(store.state.schema);
      store.state.entity.data = defaultData || {};
      store.state.modifications.hasChanges = false;
      store.state.modifications.originalData = JSON.stringify(store.state.entity.data);

      // Reset navigation directly instead of calling actions.resetNavigation()
      store.state.navigation.selectedPath = [];
      store.state.navigation.expandedColumns = 1;
      store.state.columns = calculateColumns(
        store.state.entity.data,
        store.state.schema,
        [],
        store.state.schemaTitle
      );
    }),

    getColumnData: $((columnIndex: number) => {
      return store.state.columns[columnIndex]?.data;
    }),

    hasModifications: $(() => {
      return store.state.modifications.hasChanges;
    }),

    exportEntityJson: $(() => {
      return JSON.stringify(store.state.entity.data, null, 2);
    })
  };

  // Surveiller les changements de props pour mettre à jour le store
  useTask$(({ track }) => {
    track(() => props.entity);
    track(() => props.schema);

    store.state = createInitialState(
      props.entity,
      props.schema,
      props.schemaName,
      props.schemaTitle,
      props.schemaVersion
    );
  });

  // Fournir le contexte
  useContextProvider(EntityCreationContext, { store, actions });

  return <Slot />;
});

// Hook pour utiliser le contexte
export const useEntityCreation = () => {
  const context = useContext(EntityCreationContext);
  if (!context) {
    throw new Error('useEntityCreation must be used within an EntityCreationProvider');
  }
  return context;
};

// Composant de notification
export const EntityCreationNotification = component$(() => {
  const { store, actions } = useEntityCreation();

  if (!store.ui.notification.show) {
    return null;
  }

  return (
    <div class={`notification ${store.ui.notification.type}`}>
      {store.ui.notification.message}
      <button onClick$={() => actions.hideNotification()}>✕</button>
    </div>
  );
});