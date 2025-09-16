/**
 * Exemples d'intégration pratique du contexte SchemaEditor
 *
 * Ce fichier montre comment intégrer concrètement le nouveau contexte
 * dans les composants existants avec des exemples prêts à l'emploi.
 */

import { component$, $ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import {
  useSchemaState,
  useSchemaActions,
  useSchemaNotifications,
  SchemaEditorProvider
} from './schema-editor-context';
import { MigrationWrapper, usePropertyHandlers, useSchemaHandlers } from './migration-patterns';

// ========================================================================================
// EXEMPLE COMPLET D'INTÉGRATION - PAGE PRINCIPALE
// ========================================================================================

/**
 * Exemple d'intégration complète pour remplacer src/routes/bo/schemaEditor/index.tsx
 */
export const IntegratedSchemaListPage = component$(() => {
  const nav = useNavigate();

  // Récupération simple de l'état et des actions
  const { schemas, loading, statistics } = useSchemaState();
  const { deleteSchema, refreshSchemas } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  // Handlers simplifiés grâce au contexte
  const { handleDelete, handleCopy } = useSchemaHandlers();

  const handleRefresh = $(async () => {
    await refreshSchemas();
    showNotification('success', 'Liste rafraîchie');
  });

  return (
    <div class="integrated-schema-list">
      {/* Header avec statistiques automatiques */}
      <div class="header">
        <h1>Gestionnaire de Schémas JSON</h1>
        <div class="stats">
          <span>Total: {statistics.totalSchemas}</span>
          <span>Modifiés aujourd'hui: {statistics.modifiedToday}</span>
        </div>
        <div class="actions">
          <button onClick$={() => nav('/bo/schemaEditor/new/')}>
            ➕ Nouveau Schéma
          </button>
          <button onClick$={handleRefresh} disabled={loading}>
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Liste des schémas */}
      <div class="schemas-grid">
        {schemas.map((schema) => (
          <div key={schema.id} class="schema-card">
            <h3>{schema.name}</h3>
            <p>{schema.schema.description}</p>
            <div class="card-actions">
              <button onClick$={() => nav(`/bo/schemaEditor/edit/${schema.id}/`)}>
                ✏️ Éditer
              </button>
              <button onClick$={() => handleCopy(schema)}>
                📋 Copier
              </button>
              <button onClick$={() => handleDelete(schema.id, schema.name)}>
                🗑️ Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ========================================================================================
// EXEMPLE D'INTÉGRATION - ÉDITEUR DE PROPRIÉTÉS
// ========================================================================================

/**
 * Exemple d'éditeur de propriétés intégré au contexte
 * Remplace les composants PropertyColumn, PropertyTree, etc.
 */
export const IntegratedPropertyEditor = component$(() => {
  const { currentProperties, validationState } = useSchemaState();
  const { addProperty, removeProperty, updateProperty } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  // Handlers simplifiés avec le contexte
  const { handleAddProperty, handleRemoveProperty, handleUpdateProperty } = usePropertyHandlers();

  const handleQuickAdd = $(async () => {
    const result = await handleAddProperty(
      null, // parentId
      'nouvelle_propriete',
      'string',
      false,
      'Description de la nouvelle propriété'
    );

    if (result.success) {
      showNotification('success', 'Propriété ajoutée');
    }
  });

  return (
    <div class="integrated-property-editor">
      <div class="editor-header">
        <h3>Propriétés du schéma</h3>
        <button class="btn btn-primary" onClick$={handleQuickAdd}>
          ➕ Ajouter une propriété
        </button>
      </div>

      {/* Erreurs de validation automatiques */}
      {validationState.errors.length > 0 && (
        <div class="validation-errors">
          {validationState.errors.map((error, index) => (
            <div key={index} class="error">{error}</div>
          ))}
        </div>
      )}

      {/* Liste des propriétés */}
      <div class="properties-list">
        {currentProperties.length === 0 ? (
          <div class="empty-state">
            <p>Aucune propriété définie</p>
            <button onClick$={handleQuickAdd}>Ajouter la première propriété</button>
          </div>
        ) : (
          currentProperties.map((property) => (
            <IntegratedPropertyItem
              key={property.id}
              propertyId={property.id}
            />
          ))
        )}
      </div>
    </div>
  );
});

/**
 * Composant pour un élément de propriété individuel
 */
type IntegratedPropertyItemProps = {
  propertyId: string;
};

export const IntegratedPropertyItem = component$<IntegratedPropertyItemProps>((props) => {
  const { currentProperties } = useSchemaState();
  const { updateProperty, removeProperty } = useSchemaActions();

  // Trouver la propriété par son ID (automatiquement synchronisée)
  const property = currentProperties.find(p => p.id === props.propertyId);

  if (!property) return null;

  const handleUpdate = $(async (updates: Partial<typeof property>) => {
    await updateProperty(props.propertyId, updates);
  });

  const handleRemove = $(async () => {
    if (confirm(`Supprimer la propriété "${property.name}" ?`)) {
      await removeProperty(props.propertyId);
    }
  });

  return (
    <div class="integrated-property-item">
      <div class="property-row">
        <input
          type="text"
          value={property.name}
          onInput$={(e) => handleUpdate({
            name: (e.target as HTMLInputElement).value
          })}
          placeholder="Nom de la propriété"
        />

        <select
          value={property.type}
          onChange$={(e) => handleUpdate({
            type: (e.target as HTMLSelectElement).value as any
          })}
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="array">Array</option>
          <option value="object">Object</option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={property.required}
            onChange$={(e) => handleUpdate({
              required: (e.target as HTMLInputElement).checked
            })}
          />
          Requis
        </label>

        <button class="btn btn-danger btn-sm" onClick$={handleRemove}>
          🗑️
        </button>
      </div>

      <textarea
        value={property.description || ''}
        onInput$={(e) => handleUpdate({
          description: (e.target as HTMLTextAreaElement).value
        })}
        placeholder="Description de la propriété"
      />
    </div>
  );
});

// ========================================================================================
// EXEMPLE D'INTÉGRATION - FORMULAIRE DE CRÉATION/ÉDITION
// ========================================================================================

/**
 * Formulaire intégré pour création et édition de schémas
 * Remplace les pages new/index.tsx et edit/[id]/index.tsx
 */
type IntegratedSchemaFormProps = {
  mode: 'create' | 'edit';
  schemaId?: string;
};

export const IntegratedSchemaForm = component$<IntegratedSchemaFormProps>((props) => {
  const nav = useNavigate();

  const { currentSchema, validationState, autoSaveState } = useSchemaState();
  const { startEditing, updateSchemaInfo, saveCurrentSchema } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  // Initialiser le mode d'édition
  if (props.mode === 'create') {
    startEditing(null); // Nouveau schéma
  } else if (props.schemaId) {
    startEditing(props.schemaId); // Édition
  }

  const handleSave = $(async () => {
    if (!validationState.isValid) {
      showNotification('error', 'Veuillez corriger les erreurs avant de sauvegarder');
      return;
    }

    const result = await saveCurrentSchema();
    if (result.success) {
      showNotification('success', result.message);
      setTimeout(() => nav('/bo/schemaEditor/'), 1500);
    } else {
      showNotification('error', result.message);
    }
  });

  return (
    <div class="integrated-schema-form">
      <div class="form-header">
        <h1>{props.mode === 'create' ? 'Nouveau Schéma' : 'Éditer Schéma'}</h1>

        {/* Indicateur d'auto-save */}
        {autoSaveState.isActive && (
          <div class="auto-save-indicator">
            <span class="indicator">●</span>
            Auto-sauvegarde: {autoSaveState.lastSaved || 'en cours...'}
          </div>
        )}
      </div>

      {/* Informations du schéma */}
      <div class="schema-info-section">
        <h2>Informations générales</h2>

        <div class="form-group">
          <label>Nom du schéma *</label>
          <input
            type="text"
            value={currentSchema.name}
            onInput$={(e) => updateSchemaInfo({
              name: (e.target as HTMLInputElement).value
            })}
            placeholder="mon_schema"
          />
        </div>

        <div class="form-group">
          <label>Titre</label>
          <input
            type="text"
            value={currentSchema.title}
            onInput$={(e) => updateSchemaInfo({
              title: (e.target as HTMLInputElement).value
            })}
            placeholder="Titre du schéma"
          />
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea
            value={currentSchema.description}
            onInput$={(e) => updateSchemaInfo({
              description: (e.target as HTMLTextAreaElement).value
            })}
            placeholder="Description du schéma et de son utilisation"
          />
        </div>
      </div>

      {/* Éditeur de propriétés intégré */}
      <div class="properties-section">
        <h2>Propriétés</h2>
        <IntegratedPropertyEditor />
      </div>

      {/* Actions */}
      <div class="form-actions">
        <button
          class="btn btn-secondary"
          onClick$={() => nav('/bo/schemaEditor/')}
        >
          Annuler
        </button>

        <button
          class="btn btn-primary"
          onClick$={handleSave}
          disabled={!validationState.isValid}
        >
          💾 {props.mode === 'create' ? 'Créer' : 'Mettre à jour'}
        </button>
      </div>

      {/* Aperçu JSON en temps réel */}
      <JsonPreviewPanel />
    </div>
  );
});

// ========================================================================================
// COMPOSANTS UTILITAIRES INTÉGRÉS
// ========================================================================================

/**
 * Panneau d'aperçu JSON avec actions intégrées
 */
export const JsonPreviewPanel = component$(() => {
  const { generatedJson, validationState } = useSchemaState();
  const { copyJsonToClipboard } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  const handleCopy = $(async () => {
    const result = await copyJsonToClipboard();
    if (result.success) {
      showNotification('success', 'JSON copié dans le presse-papier');
    } else {
      showNotification('error', 'Erreur lors de la copie');
    }
  });

  return (
    <div class="json-preview-panel">
      <div class="preview-header">
        <h3>Aperçu JSON</h3>
        <div class="preview-actions">
          <span class={`validation-status ${validationState.isValid ? 'valid' : 'invalid'}`}>
            {validationState.isValid ? '✅ Valide' : '❌ Invalide'}
          </span>
          <button
            class="btn btn-secondary btn-sm"
            onClick$={handleCopy}
            disabled={!validationState.isValid}
          >
            📋 Copier
          </button>
        </div>
      </div>

      <pre class="json-code">
        <code>{generatedJson}</code>
      </pre>

      {validationState.errors.length > 0 && (
        <div class="validation-errors">
          <h4>Erreurs de validation :</h4>
          <ul>
            {validationState.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

/**
 * Indicateur de statut global de l'application
 */
export const AppStatusIndicator = component$(() => {
  const { loading, autoSaveState } = useSchemaState();

  return (
    <div class="app-status-indicator">
      {loading && (
        <div class="status-item loading">
          <span class="spinner">⟳</span>
          Chargement...
        </div>
      )}

      {autoSaveState.isActive && (
        <div class="status-item auto-save">
          <span class="indicator">●</span>
          Auto-save actif
        </div>
      )}
    </div>
  );
});

// ========================================================================================
// EXEMPLE D'INTÉGRATION COMPLÈTE DANS UNE PAGE
// ========================================================================================

/**
 * Exemple d'une page complète utilisant le contexte
 * Cette page peut remplacer entièrement les pages existantes
 */
export const CompleteIntegratedPage = component$(() => {
  return (
    <SchemaEditorProvider>
      <div class="complete-integrated-page">
        {/* Indicateur de statut global */}
        <AppStatusIndicator />

        {/* Contenu principal */}
        <div class="page-content">
          <IntegratedSchemaListPage />
        </div>

        {/* Les notifications sont gérées automatiquement par le provider */}
      </div>
    </SchemaEditorProvider>
  );
});

/**
 * Exemple pour la page de création
 */
export const CreatePageIntegrated = component$(() => {
  return (
    <SchemaEditorProvider>
      <div class="create-page-integrated">
        <IntegratedSchemaForm mode="create" />
      </div>
    </SchemaEditorProvider>
  );
});

/**
 * Exemple pour la page d'édition
 */
type EditPageIntegratedProps = {
  schemaId: string;
};

export const EditPageIntegrated = component$<EditPageIntegratedProps>((props) => {
  return (
    <SchemaEditorProvider>
      <div class="edit-page-integrated">
        <IntegratedSchemaForm mode="edit" schemaId={props.schemaId} />
      </div>
    </SchemaEditorProvider>
  );
});

// ========================================================================================
// MIGRATION PROGRESSIVE - WRAPPER HYBRIDE
// ========================================================================================

/**
 * Wrapper pour migration progressive qui permet de tester les nouveaux composants
 * tout en gardant les anciens en fallback
 */
type HybridMigrationWrapperProps = {
  useNewComponents: boolean;
  oldComponent: any;
  newComponent: any;
  componentProps?: any;
};

export const HybridMigrationWrapper = component$<HybridMigrationWrapperProps>((props) => {
  if (props.useNewComponents) {
    return (
      <SchemaEditorProvider>
        <div class="new-component-wrapper">
          <div class="migration-banner">
            ✨ Utilisation des nouveaux composants avec contexte
          </div>
          <props.newComponent {...props.componentProps} />
        </div>
      </SchemaEditorProvider>
    );
  }

  return (
    <div class="old-component-wrapper">
      <div class="migration-banner">
        ⚠️ Utilisation des anciens composants (mode de compatibilité)
      </div>
      <props.oldComponent {...props.componentProps} />
    </div>
  );
});

// ========================================================================================
// EXEMPLES D'UTILISATION DANS LES ROUTES
// ========================================================================================

/**
 * Exemple d'intégration dans src/routes/bo/schemaEditor/index.tsx
 */
export const RouteIndexExample = component$(() => {
  // Option 1: Migration complète
  return <CompleteIntegratedPage />;

  // Option 2: Migration progressive
  // return (
  //   <HybridMigrationWrapper
  //     useNewComponents={true}
  //     newComponent={IntegratedSchemaListPage}
  //     oldComponent={OriginalSchemaListPage}
  //   />
  // );
});

/**
 * Exemple d'intégration dans src/routes/bo/schemaEditor/new/index.tsx
 */
export const RouteNewExample = component$(() => {
  return <CreatePageIntegrated />;
});

/**
 * Exemple d'intégration dans src/routes/bo/schemaEditor/edit/[id]/index.tsx
 */
export const RouteEditExample = component$(() => {
  // Dans un vrai routeur, schemaId viendrait des params
  const schemaId = 'example-schema-id';
  return <EditPageIntegrated schemaId={schemaId} />;
});