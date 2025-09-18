/**
 * Patterns de migration réutilisables
 *
 * Ce fichier contient des patterns, hooks et utilitaires pour faciliter
 * la migration des composants existants vers le nouveau contexte.
 */

import { component$, useStore, useSignal, $, type PropFunction } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import {
  useSchemaState,
  useSchemaActions,
  useSchemaNotifications
} from './schema-editor-context';
import type { SchemaProperty, SchemaInfo, JsonSchemaType } from '../types';

// ========================================================================================
// HOOKS DE MIGRATION POUR FACILITER LA TRANSITION
// ========================================================================================

/**
 * Hook pour migrer progressivement un composant
 * Permet d'utiliser soit l'ancien état local soit le nouveau contexte
 */
export const useMigrationMode = (useContext: boolean = true) => {
  // État local de fallback (pour migration progressive)
  const localState = useStore({
    schemas: [],
    loading: false,
    currentSchema: { name: '', title: '', description: '', type: 'object' as JsonSchemaType },
    currentProperties: [] as SchemaProperty[],
    validationErrors: [] as string[]
  });

  const localNotification = useStore({
    show: false,
    type: 'success' as 'success' | 'error' | 'info',
    message: ''
  });

  // État depuis le contexte
  const contextState = useContext ? {
    schemas: useSchemaState().schemas,
    loading: useSchemaState().loading,
    currentSchema: useSchemaState().currentSchema,
    currentProperties: useSchemaState().currentProperties,
    validationErrors: useSchemaState().validationState.errors
  } : null;

  const contextActions = useContext ? useSchemaActions() : null;
  const contextNotifications = useContext ? useSchemaNotifications() : null;

  // Actions locales de fallback
  const localActions = {
    updateSchemaInfo: $((updates: Partial<SchemaInfo>) => {
      Object.assign(localState.currentSchema, updates);
    }),
    addProperty: $((parentId: string | null, name: string, type: JsonSchemaType) => {
      // Logique locale simplifiée
      localState.currentProperties.push({
        id: `prop_${Date.now()}`,
        name,
        type,
        required: false,
        description: ''
      });
    }),
    showNotification: $((type: 'success' | 'error' | 'info', message: string) => {
      localNotification.show = true;
      localNotification.type = type;
      localNotification.message = message;
      setTimeout(() => {
        localNotification.show = false;
      }, 3000);
    })
  };

  return {
    // État unifié
    state: useContext && contextState ? contextState : localState,

    // Actions unifiées
    actions: useContext && contextActions ? contextActions : localActions,

    // Notifications unifiées
    notifications: useContext && contextNotifications ? contextNotifications : {
      showNotification: localActions.showNotification,
      notificationState: localNotification
    },

    // Flag pour savoir quel mode est utilisé
    isUsingContext: useContext && !!contextState
  };
};

/**
 * Hook pour convertir un ancien handler useStore vers le contexte
 */
export const useLegacyHandler = <T extends any[]>(
  legacyHandler: (...args: T) => void | Promise<void>,
  contextHandler?: (...args: T) => void | Promise<void>,
  useContext: boolean = true
) => {
  return useContext && contextHandler ? contextHandler : legacyHandler;
};

/**
 * Hook pour gérer la transition des notifications
 */
export const useNotificationTransition = (useContext: boolean = true) => {
  const localNotification = useStore({
    show: false,
    type: 'success' as 'success' | 'error' | 'info',
    message: ''
  });

  const contextNotifications = useContext ? useSchemaNotifications() : null;

  const showNotification = $((type: 'success' | 'error' | 'info', message: string) => {
    if (useContext && contextNotifications) {
      contextNotifications.showNotification(type, message);
    } else {
      localNotification.show = true;
      localNotification.type = type;
      localNotification.message = message;
      setTimeout(() => {
        localNotification.show = false;
      }, 3000);
    }
  });

  return {
    showNotification,
    notificationState: useContext ? null : localNotification,
    isUsingContext: useContext && !!contextNotifications
  };
};

// ========================================================================================
// COMPOSANTS DE MIGRATION WRAPPÉS
// ========================================================================================

/**
 * Wrapper qui permet de migrer progressivement un composant
 * Utilise le contexte si disponible, sinon l'état local
 */
type MigrationWrapperProps = {
  useContext?: boolean;
  children: any;
  fallbackComponent?: any;
};

export const MigrationWrapper = component$<MigrationWrapperProps>((props) => {
  const { state, actions, notifications, isUsingContext } = useMigrationMode(props.useContext);

  // Si on utilise le contexte, on affiche les enfants normalement
  if (isUsingContext) {
    return <>{props.children}</>;
  }

  // Sinon, on affiche le composant de fallback ou les enfants avec l'état local
  return (
    <div class="migration-fallback">
      {props.fallbackComponent || props.children}

      {/* Notifications locales si pas de contexte */}
      {notifications.notificationState?.show && (
        <div class={`notification ${notifications.notificationState.type}`}>
          {notifications.notificationState.message}
        </div>
      )}
    </div>
  );
});

/**
 * Composant de transition pour les formulaires
 * Facilite la migration des formulaires avec validation
 */
type FormMigrationWrapperProps = {
  useContext?: boolean;
  onSubmit$: PropFunction<() => Promise<void>>;
  validationErrors?: string[];
  children: any;
};

export const FormMigrationWrapper = component$<FormMigrationWrapperProps>((props) => {
  const { state, notifications } = useMigrationMode(props.useContext);

  const errors = props.validationErrors ||
                 (props.useContext ? state.validationErrors : []);

  return (
    <form onSubmit$={(e) => {
      e.preventDefault();
      props.onSubmit$();
    }}>
      {/* Erreurs de validation */}
      {errors.length > 0 && (
        <div class="validation-errors">
          <h4>Erreurs de validation :</h4>
          <ul>
            {errors.map((error, index) => (
              <li key={index} class="error-item">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {props.children}
    </form>
  );
});

/**
 * Wrapper pour les listes avec actions (CRUD)
 * Facilite la migration des composants de liste
 */
type ListMigrationWrapperProps = {
  useContext?: boolean;
  items?: any[];
  loading?: boolean;
  onRefresh$?: PropFunction<() => Promise<void>>;
  renderItem: (item: any, actions: any) => any;
  emptyState?: any;
};

export const ListMigrationWrapper = component$<ListMigrationWrapperProps>((props) => {
  const { state, actions, notifications } = useMigrationMode(props.useContext);

  const items = props.items || state.schemas || [];
  const loading = props.loading ?? state.loading;

  const handleRefresh = $(async () => {
    if (props.onRefresh$) {
      await props.onRefresh$();
    } else if (actions.refreshSchemas) {
      await actions.refreshSchemas();
      notifications.showNotification?.('success', 'Liste rafraîchie');
    }
  });

  return (
    <div class="list-migration-wrapper">
      <div class="list-header">
        <button
          class="btn btn-secondary"
          onClick$={handleRefresh}
          disabled={loading}
        >
          🔄 {loading ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {loading && <div class="loading-indicator">Chargement...</div>}

      {!loading && items.length === 0 ? (
        props.emptyState || (
          <div class="empty-state">
            <p>Aucun élément trouvé</p>
          </div>
        )
      ) : (
        <div class="list-items">
          {items.map((item) =>
            props.renderItem(item, {
              onDelete: actions.deleteSchema,
              onEdit: (id: string) => actions.startEditing?.(id),
              showNotification: notifications.showNotification
            })
          )}
        </div>
      )}
    </div>
  );
});

// ========================================================================================
// PATTERNS DE MIGRATION SPÉCIFIQUES
// ========================================================================================

/**
 * Pattern pour migrer un composant avec état local vers le contexte
 */
export const createMigratedComponent = <T extends Record<string, any>>(
  OriginalComponent: any,
  options: {
    useContext?: boolean;
    stateMapping?: (contextState: any, localState: any) => T;
    actionsMapping?: (contextActions: any, localActions: any) => any;
  } = {}
) => {
  return component$((props: any) => {
    const { state, actions, notifications, isUsingContext } = useMigrationMode(options.useContext);

    // Mapper l'état si nécessaire
    const mappedState = options.stateMapping ?
      options.stateMapping(state, state) : state;

    // Mapper les actions si nécessaire
    const mappedActions = options.actionsMapping ?
      options.actionsMapping(actions, actions) : actions;

    return (
      <OriginalComponent
        {...props}
        state={mappedState}
        actions={mappedActions}
        notifications={notifications}
        isUsingContext={isUsingContext}
      />
    );
  });
};

/**
 * Pattern pour migrer les handlers de propriétés
 */
export const usePropertyHandlers = (useContext: boolean = true) => {
  const { actions } = useMigrationMode(useContext);

  return {
    handleAddProperty: $(async (
      parentId: string | null,
      name: string,
      type: JsonSchemaType,
      required: boolean = false,
      description: string = ''
    ) => {
      if (actions.addProperty) {
        return await actions.addProperty(parentId, name, type, required, description);
      }
      // Fallback local
      console.log('Adding property:', { parentId, name, type, required, description });
      return { success: true };
    }),

    handleRemoveProperty: $(async (propertyId: string) => {
      if (actions.removeProperty) {
        return await actions.removeProperty(propertyId);
      }
      // Fallback local
      console.log('Removing property:', propertyId);
      return { success: true };
    }),

    handleUpdateProperty: $(async (propertyId: string, updates: Partial<SchemaProperty>) => {
      if (actions.updateProperty) {
        return await actions.updateProperty(propertyId, updates);
      }
      // Fallback local
      console.log('Updating property:', propertyId, updates);
      return { success: true };
    })
  };
};

/**
 * Pattern pour migrer les handlers de schéma
 */
export const useSchemaHandlers = (useContext: boolean = true) => {
  const nav = useNavigate();
  const { actions, notifications } = useMigrationMode(useContext);

  return {
    handleSave: $(async (redirectPath?: string) => {
      if (actions.saveCurrentSchema) {
        const result = await actions.saveCurrentSchema();
        if (result.success) {
          notifications.showNotification?.('success', result.message);
          if (redirectPath) {
            setTimeout(() => nav(redirectPath), 1500);
          }
        } else {
          notifications.showNotification?.('error', result.message);
        }
        return result;
      }
      // Fallback local
      console.log('Saving schema');
      return { success: true, message: 'Schéma sauvegardé' };
    }),

    handleDelete: $(async (schemaId: string, schemaName: string) => {
      if (confirm(`Êtes-vous sûr de vouloir supprimer le schéma "${schemaName}" ?`)) {
        if (actions.deleteSchema) {
          const result = await actions.deleteSchema(schemaId);
          if (result.success) {
            notifications.showNotification?.('success', result.message);
          } else {
            notifications.showNotification?.('error', result.message);
          }
          return result;
        }
        // Fallback local
        console.log('Deleting schema:', schemaId);
        return { success: true, message: 'Schéma supprimé' };
      }
      return { success: false, message: 'Suppression annulée' };
    }),

    handleCopy: $(async (schema: any) => {
      if (actions.copySchemaToClipboard) {
        const result = await actions.copySchemaToClipboard(schema);
        if (result.success) {
          notifications.showNotification?.('success', result.message);
        } else {
          notifications.showNotification?.('error', result.message);
        }
        return result;
      }
      // Fallback local
      console.log('Copying schema:', schema);
      return { success: true, message: 'Schéma copié' };
    })
  };
};

// ========================================================================================
// UTILITAIRES DE MIGRATION
// ========================================================================================

/**
 * Vérifie si le contexte est disponible et fonctionnel
 */
export const useContextAvailability = () => {
  try {
    const state = useSchemaState();
    const actions = useSchemaActions();
    const notifications = useSchemaNotifications();

    return {
      isAvailable: !!(state && actions && notifications),
      state: !!state,
      actions: !!actions,
      notifications: !!notifications
    };
  } catch (error) {
    return {
      isAvailable: false,
      state: false,
      actions: false,
      notifications: false
    };
  }
};

/**
 * Hook pour logger les migrations en développement
 */
export const useMigrationLogger = (componentName: string, useContext: boolean = true) => {
  const availability = useContextAvailability();

  // En développement seulement
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    console.log(`[Migration] ${componentName}:`, {
      useContext,
      contextAvailable: availability.isAvailable,
      mode: useContext && availability.isAvailable ? 'context' : 'local'
    });
  }

  return {
    logAction: (action: string, data?: any) => {
      if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
        console.log(`[Migration] ${componentName}.${action}:`, data);
      }
    }
  };
};

/**
 * Composant de debug pour visualiser l'état de migration
 */
export const MigrationDebugPanel = component$(() => {
  const availability = useContextAvailability();
  const isDev = typeof window !== 'undefined' && window.location?.hostname === 'localhost';

  if (!isDev) return null;

  return (
    <div class="migration-debug-panel" style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#f0f0f0',
      border: '1px solid #ccc',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <h4>Migration Debug</h4>
      <div>Context Available: {availability.isAvailable ? '✅' : '❌'}</div>
      <div>State: {availability.state ? '✅' : '❌'}</div>
      <div>Actions: {availability.actions ? '✅' : '❌'}</div>
      <div>Notifications: {availability.notifications ? '✅' : '❌'}</div>
    </div>
  );
});

// ========================================================================================
// EXEMPLE D'UTILISATION DES PATTERNS
// ========================================================================================

/**
 * Exemple d'un composant migré utilisant les patterns
 */
export const ExampleMigratedComponent = component$(() => {
  const { state, isUsingContext } = useMigrationMode(true);
  const { handleSave, handleDelete } = useSchemaHandlers(true);
  const { logAction } = useMigrationLogger('ExampleComponent');

  logAction('component_rendered', { isUsingContext });

  return (
    <div>
      <h2>Exemple de composant migré</h2>
      <p>Mode: {isUsingContext ? 'Contexte' : 'Local'}</p>
      <p>Schémas: {state.schemas?.length || 0}</p>

      <button onClick$={() => handleSave('/')}>
        Sauvegarder et retourner
      </button>

      <MigrationDebugPanel />
    </div>
  );
});