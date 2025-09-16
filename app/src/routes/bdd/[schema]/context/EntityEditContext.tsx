import { component$, createContextId, useContextProvider, useStore, useContext, useSignal, useTask$, $ } from '@builder.io/qwik';

// Types
export type EntityEditState = {
  entityData: Record<string, any>;
  schema: any;
  schemaName: string;
  isNew: boolean;
  loading: boolean;
};

export type EntityEditActions = {
  updateData: (newData: Record<string, any>) => Promise<void>;
  updateField: (path: string[], value: any) => Promise<void>;
};

export type EntityEditContextValue = {
  state: EntityEditState;
  actions: EntityEditActions;
  signals: {
    entityDataSignal: any;
    loadingSignal: any;
  };
};

// Context ID
export const EntityEditContextId = createContextId<EntityEditContextValue>('entity-edit-context');

// Provider props
export type EntityEditProviderProps = {
  initialData: Record<string, any>;
  schema: any;
  schemaName: string;
  isNew?: boolean;
  children: any;
};

// Provider
export const EntityEditProvider = component$<EntityEditProviderProps>(({
  initialData,
  schema,
  schemaName,
  isNew = false,
  children
}) => {
  // Main reactive state
  const state = useStore<EntityEditState>({
    entityData: { ...initialData },
    schema,
    schemaName,
    isNew,
    loading: false
  });

  // Derived signals
  const entityDataSignal = useSignal(state.entityData);
  const loadingSignal = useSignal(state.loading);

  // Sync signals with state
  useTask$(({ track }) => {
    track(() => state.entityData);
    entityDataSignal.value = { ...state.entityData };
  });

  useTask$(({ track }) => {
    track(() => state.loading);
    loadingSignal.value = state.loading;
  });

  // Actions
  const actions: EntityEditActions = {
    updateData: $(async (newData: Record<string, any>) => {
      console.log('🔧 EntityEditContext - updateData:', newData);

      // Update state directly - Qwik will handle reactivity
      Object.assign(state.entityData, newData);

      // Force signal update
      entityDataSignal.value = { ...state.entityData };
    }),

    updateField: $(async (path: string[], value: any) => {
      console.log('🔧 EntityEditContext - updateField:', { path, value });

      // Navigate and update
      let current = state.entityData;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (current[key] === undefined) {
          const nextKey = path[i + 1];
          const isNextKeyArrayIndex = !isNaN(parseInt(nextKey));
          current[key] = isNextKeyArrayIndex ? [] : {};
        }
        current = current[key];
      }

      if (path.length > 0) {
        current[path[path.length - 1]] = value;
      }

      // Force reactivity
      state.entityData = { ...state.entityData };
      entityDataSignal.value = { ...state.entityData };
    })
  };

  // Context value
  const contextValue: EntityEditContextValue = {
    state,
    actions,
    signals: {
      entityDataSignal,
      loadingSignal
    }
  };

  // Provide context
  useContextProvider(EntityEditContextId, contextValue);

  return <>{children}</>;
});

// Hook
export const useEntityEdit = (): EntityEditContextValue => {
  const context = useContext(EntityEditContextId);
  if (!context) {
    throw new Error('useEntityEdit must be used within EntityEditProvider');
  }
  return context;
};