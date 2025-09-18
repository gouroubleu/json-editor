/**
 * Exemples de migration vers le nouveau contexte SchemaEditor
 *
 * Ce fichier contient des exemples concrets montrant comment migrer
 * les composants existants vers le nouveau système de contexte.
 */

import { component$, useStore, $ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import {
  useSchemaEditorContext,
  useSchemaActions,
  useSchemaState,
  useSchemaNotifications
} from './schema-editor-context';
import type { SchemaProperty, SchemaInfo, JsonSchemaType } from '../types';

// ========================================================================================
// EXEMPLE 1: Migration d'une page principale (index.tsx)
// ========================================================================================

// AVANT - Ancien pattern avec useStore et handlers locaux
export const SchemaListPageOLD = component$(() => {
  const nav = useNavigate();

  // État local dispersé
  const savedSchemas = useStore([]);
  const uiState = useStore({
    notification: { show: false, type: 'success', message: '' },
    loading: false
  });

  // Handlers individuels
  const handleDelete = $(async (schemaId: string) => {
    // Logique de suppression locale
    uiState.loading = true;
    try {
      // ... logique de suppression
      // Recharger manuellement
      // ... logique de notification
    } finally {
      uiState.loading = false;
    }
  });

  const handleRefresh = $(async () => {
    uiState.loading = true;
    // ... logique de rechargement
    uiState.loading = false;
  });

  return (
    <div>
      {/* Interface complexe avec état local */}
      <button onClick$={handleRefresh} disabled={uiState.loading}>
        Actualiser
      </button>
      {/* ... reste de l'interface */}
    </div>
  );
});

// APRÈS - Nouveau pattern avec contexte
export const SchemaListPageNEW = component$(() => {
  const nav = useNavigate();

  // Récupération de l'état et des actions via le contexte
  const { schemas, loading } = useSchemaState();
  const { deleteSchema, refreshSchemas } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  // Handlers simplifiés - la logique est dans le contexte
  const handleDelete = $(async (schemaId: string, schemaName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le schéma "${schemaName}" ?`)) {
      const result = await deleteSchema(schemaId);
      if (result.success) {
        showNotification('success', result.message);
      } else {
        showNotification('error', result.message);
      }
    }
  });

  const handleRefresh = $(async () => {
    await refreshSchemas();
    showNotification('success', 'Liste rafraîchie');
  });

  return (
    <div>
      {/* Interface simplifiée */}
      <button onClick$={handleRefresh} disabled={loading}>
        Actualiser
      </button>
      {/* ... reste de l'interface */}
    </div>
  );
});

// ========================================================================================
// EXEMPLE 2: Migration d'un formulaire de création (new/index.tsx)
// ========================================================================================

// AVANT - État local complexe avec auto-save manuel
export const CreateSchemaPageOLD = component$(() => {
  const nav = useNavigate();

  // État local dispersé
  const schemaInfo = useStore<SchemaInfo>({
    name: '',
    title: '',
    description: '',
    type: 'object'
  });
  const properties = useStore<SchemaProperty[]>([]);
  const uiState = useStore({
    generatedJson: '',
    validationErrors: [],
    isValid: true,
    hasUnsavedChanges: false,
    autoSaveTimer: null as any
  });

  // Auto-save manuel complexe
  // eslint-disable-next-line qwik/no-use-visible-task
  // useVisibleTask$(({ track }) => {
  //   track(() => schemaInfo.name);
  //   track(() => properties.length);
  //   // Logique d'auto-save manuelle...
  // });

  const handleSave = $(async () => {
    // Logique de sauvegarde locale complexe
    try {
      // ... validation
      // ... sauvegarde
      // ... nettoyage
      // ... redirection
    } catch (error) {
      // ... gestion d'erreur
    }
  });

  return (
    <div>
      {/* Formulaire avec gestion manuelle */}
      <input
        value={schemaInfo.name}
        onInput$={(e) => schemaInfo.name = (e.target as HTMLInputElement).value}
      />
      <button onClick$={handleSave}>Sauvegarder</button>
    </div>
  );
});

// APRÈS - Utilisation du contexte avec auto-save intégré
export const CreateSchemaPageNEW = component$(() => {
  const nav = useNavigate();

  // Récupération de l'état et des actions via le contexte
  const { currentSchema, currentProperties, validationState } = useSchemaState();
  const {
    updateSchemaInfo,
    addProperty,
    removeProperty,
    saveCurrentSchema,
    startEditing
  } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  // Initialiser un nouveau schéma à l'ouverture
  startEditing(null); // null = nouveau schéma

  const handleSave = $(async () => {
    const result = await saveCurrentSchema();
    if (result.success) {
      showNotification('success', result.message);
      setTimeout(() => nav('/'), 1500);
    } else {
      showNotification('error', result.message);
    }
  });

  return (
    <div>
      {/* Formulaire simplifié - l'auto-save est automatique */}
      <input
        value={currentSchema.name}
        onInput$={(e) => updateSchemaInfo({
          name: (e.target as HTMLInputElement).value
        })}
      />
      <button
        onClick$={handleSave}
        disabled={!validationState.isValid}
      >
        Sauvegarder
      </button>
    </div>
  );
});

// ========================================================================================
// EXEMPLE 3: Migration d'un composant enfant avec props drilling
// ========================================================================================

// AVANT - Props drilling complexe
type PropertyEditorOLDProps = {
  property: SchemaProperty;
  onUpdate: (updates: Partial<SchemaProperty>) => Promise<void>;
  onRemove: () => Promise<void>;
  onAddChild: (name: string, type: JsonSchemaType) => Promise<void>;
  validationErrors: string[];
  isValid: boolean;
  // ... beaucoup d'autres props...
};

export const PropertyEditorOLD = component$<PropertyEditorOLDProps>((props) => {
  return (
    <div>
      <input
        value={props.property.name}
        onInput$={(e) => props.onUpdate({
          name: (e.target as HTMLInputElement).value
        })}
      />
      <button onClick$={() => props.onRemove()}>
        Supprimer
      </button>
      {/* ... interface complexe avec tous les props */}
    </div>
  );
});

// APRÈS - Utilisation directe du contexte
type PropertyEditorNEWProps = {
  propertyId: string; // Seul l'ID est nécessaire
};

export const PropertyEditorNEW = component$<PropertyEditorNEWProps>((props) => {
  // Récupération directe depuis le contexte
  const { currentProperties, validationState } = useSchemaState();
  const { updateProperty, removeProperty } = useSchemaActions();

  // Trouver la propriété par son ID
  const property = currentProperties.find(p => p.id === props.propertyId);

  if (!property) return null;

  return (
    <div>
      <input
        value={property.name}
        onInput$={(e) => updateProperty(props.propertyId, {
          name: (e.target as HTMLInputElement).value
        })}
      />
      <button onClick$={() => removeProperty(props.propertyId)}>
        Supprimer
      </button>
      {/* Interface simplifiée - pas besoin de props */}
    </div>
  );
});

// ========================================================================================
// EXEMPLE 4: Migration des notifications
// ========================================================================================

// AVANT - Notifications locales dans chaque composant
export const ComponentWithNotificationsOLD = component$(() => {
  const notificationState = useStore({
    show: false,
    type: 'success' as 'success' | 'error' | 'info',
    message: ''
  });

  const showNotification = $(async (type: string, message: string) => {
    notificationState.show = true;
    notificationState.type = type as any;
    notificationState.message = message;

    setTimeout(() => {
      notificationState.show = false;
    }, 3000);
  });

  const handleAction = $(async () => {
    try {
      // ... action
      await showNotification('success', 'Action réussie');
    } catch (error) {
      await showNotification('error', 'Erreur');
    }
  });

  return (
    <div>
      <button onClick$={handleAction}>Action</button>

      {/* Notification locale */}
      {notificationState.show && (
        <div class={`notification ${notificationState.type}`}>
          {notificationState.message}
        </div>
      )}
    </div>
  );
});

// APRÈS - Notifications centralisées
export const ComponentWithNotificationsNEW = component$(() => {
  const { showNotification } = useSchemaNotifications();

  const handleAction = $(async () => {
    try {
      // ... action
      showNotification('success', 'Action réussie');
    } catch (error) {
      showNotification('error', 'Erreur');
    }
  });

  return (
    <div>
      <button onClick$={handleAction}>Action</button>
      {/* Pas besoin de notification locale - c'est géré par le contexte */}
    </div>
  );
});

// ========================================================================================
// EXEMPLE 5: Migration des formulaires complexes
// ========================================================================================

// AVANT - Gestion manuelle de l'état du formulaire
export const SchemaFormOLD = component$(() => {
  const formData = useStore({
    name: '',
    title: '',
    description: '',
    type: 'object' as JsonSchemaType
  });

  const validationErrors = useStore<string[]>([]);

  const validateForm = $(() => {
    validationErrors.splice(0, validationErrors.length);

    if (!formData.name.trim()) {
      validationErrors.push('Le nom est requis');
    }

    // ... autres validations

    return validationErrors.length === 0;
  });

  const handleSubmit = $(async () => {
    if (await validateForm()) {
      // ... soumission
    }
  });

  return (
    <form>
      <input
        value={formData.name}
        onInput$={(e) => formData.name = (e.target as HTMLInputElement).value}
      />

      {validationErrors.map(error => (
        <div key={error} class="error">{error}</div>
      ))}

      <button type="button" onClick$={handleSubmit}>
        Sauvegarder
      </button>
    </form>
  );
});

// APRÈS - Utilisation du contexte avec validation intégrée
export const SchemaFormNEW = component$(() => {
  const { currentSchema, validationState } = useSchemaState();
  const { updateSchemaInfo, saveCurrentSchema } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  const handleSubmit = $(async () => {
    if (validationState.isValid) {
      const result = await saveCurrentSchema();
      if (result.success) {
        showNotification('success', result.message);
      } else {
        showNotification('error', result.message);
      }
    }
  });

  return (
    <form>
      <input
        value={currentSchema.name}
        onInput$={(e) => updateSchemaInfo({
          name: (e.target as HTMLInputElement).value
        })}
      />

      {/* Erreurs de validation du contexte */}
      {validationState.errors.map(error => (
        <div key={error} class="error">{error}</div>
      ))}

      <button
        type="button"
        onClick$={handleSubmit}
        disabled={!validationState.isValid}
      >
        Sauvegarder
      </button>
    </form>
  );
});

// ========================================================================================
// EXEMPLE 6: Migration des listes avec actions
// ========================================================================================

// AVANT - Gestion manuelle des listes et actions
export const SchemaListOLD = component$(() => {
  const schemas = useStore<any[]>([]);
  const loading = useStore({ value: false });

  const loadSchemas = $(async () => {
    loading.value = true;
    try {
      // ... chargement
      schemas.splice(0, schemas.length, /* ...nouveaux schémas */);
    } finally {
      loading.value = false;
    }
  });

  const deleteSchema = $(async (id: string) => {
    loading.value = true;
    try {
      // ... suppression
      await loadSchemas(); // Recharger manuellement
    } finally {
      loading.value = false;
    }
  });

  return (
    <div>
      {loading.value && <div>Chargement...</div>}

      {schemas.map(schema => (
        <div key={schema.id}>
          <span>{schema.name}</span>
          <button onClick$={() => deleteSchema(schema.id)}>
            Supprimer
          </button>
        </div>
      ))}
    </div>
  );
});

// APRÈS - Utilisation du contexte avec état et actions intégrés
export const SchemaListNEW = component$(() => {
  const { schemas, loading } = useSchemaState();
  const { deleteSchema } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  const handleDelete = $(async (id: string, name: string) => {
    if (confirm(`Supprimer ${name} ?`)) {
      const result = await deleteSchema(id);
      if (result.success) {
        showNotification('success', result.message);
        // La liste se recharge automatiquement
      } else {
        showNotification('error', result.message);
      }
    }
  });

  return (
    <div>
      {loading && <div>Chargement...</div>}

      {schemas.map(schema => (
        <div key={schema.id}>
          <span>{schema.name}</span>
          <button onClick$={() => handleDelete(schema.id, schema.name)}>
            Supprimer
          </button>
        </div>
      ))}
    </div>
  );
});