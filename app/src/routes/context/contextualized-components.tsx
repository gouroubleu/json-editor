/**
 * Versions contextualisées des composants principaux
 *
 * Ce fichier contient des versions refactorisées des composants existants
 * qui utilisent le nouveau contexte SchemaEditor au lieu de l'état local.
 */

import { component$, $ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import {
  useSchemaState,
  useSchemaActions,
  useSchemaNotifications
} from './schema-editor-context';
import type { JsonSchemaType } from '../types';

// ========================================================================================
// PAGE PRINCIPALE CONTEXTUALISÉE (remplace src/routes/index.tsx)
// ========================================================================================

export const SchemaEditorMainPage = component$(() => {
  const nav = useNavigate();

  // Récupération de l'état depuis le contexte
  const { schemas, loading, statistics } = useSchemaState();
  const { deleteSchema, refreshSchemas, copySchemaToClipboard } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  // Handler simplifié pour la suppression
  const handleDelete = $(async (schemaId: string, schemaName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le schéma "${schemaName}" ? Cette action est irréversible.`)) {
      const result = await deleteSchema(schemaId);
      if (result.success) {
        showNotification('success', result.message);
      } else {
        showNotification('error', result.message);
      }
    }
  });

  // Handler simplifié pour la copie
  const handleCopySchema = $(async (schema: any) => {
    const result = await copySchemaToClipboard(schema);
    if (result.success) {
      showNotification('success', result.message);
    } else {
      showNotification('error', result.message);
    }
  });

  // Handler pour le rafraîchissement
  const handleRefresh = $(async () => {
    await refreshSchemas();
    showNotification('success', 'Liste rafraîchie');
  });

  return (
    <div class="page-schema-editor">
      {/* Header */}
      <div class="header">
        <h1 class="title">Gestionnaire de Schémas JSON</h1>
        <p class="subtitle">Créez, éditez et gérez vos schémas JSON</p>

        <div class="header-actions">
          <button
            class="btn btn-info btn-large"
            onClick$={() => nav('/bdd/')}
            title="Accéder aux entités basées sur vos schémas"
          >
            🗃️ Base de Données
          </button>

          <button
            class="btn btn-primary btn-large"
            onClick$={() => nav('/new/')}
          >
            ➕ Nouveau Schéma
          </button>
        </div>
      </div>

      {/* Statistiques depuis le contexte */}
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-number">{statistics.totalSchemas}</div>
          <div class="stat-label">Schémas créés</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{statistics.modifiedToday}</div>
          <div class="stat-label">Modifiés aujourd'hui</div>
        </div>
      </div>

      {/* Section des schémas */}
      <div class="schemas-section">
        <div class="section-header">
          <h2 class="section-title">Vos Schémas</h2>
          <div class="section-actions">
            <button
              class="btn btn-secondary"
              onClick$={handleRefresh}
              disabled={loading}
            >
              🔄 {loading ? 'Actualisation...' : 'Actualiser'}
            </button>
          </div>
        </div>

        {schemas.length === 0 ? (
          <div class="empty-state">
            <div class="empty-icon">📄</div>
            <h3 class="empty-title">Aucun schéma créé</h3>
            <p class="empty-description">
              Commencez par créer votre premier schéma JSON pour structurer vos données.
            </p>
            <button
              class="btn btn-primary"
              onClick$={() => nav('/new/')}
            >
              Créer mon premier schéma
            </button>
          </div>
        ) : (
          <div class="schemas-grid">
            {schemas.map((schema) => (
              <div key={schema.id} class="schema-card">
                <div class="card-header">
                  <h3 class="card-title">{schema.name}</h3>
                  <div class="card-badges">
                    <span class="badge type-badge">
                      {schema.schema.type || 'object'}
                    </span>
                    {schema.version && (
                      <span class={`badge version-badge ${schema.versionInfo?.changeType || 'patch'}`}>
                        v{schema.version}
                      </span>
                    )}
                  </div>
                </div>

                <div class="card-content">
                  {schema.schema.description && (
                    <p class="card-description">
                      {schema.schema.description.length > 100
                        ? `${schema.schema.description.substring(0, 100)}...`
                        : schema.schema.description
                      }
                    </p>
                  )}

                  <div class="card-metadata">
                    <div class="metadata-item">
                      <span class="metadata-label">Propriétés:</span>
                      <span class="metadata-value">
                        {schema.schema.properties ? Object.keys(schema.schema.properties).length : 0}
                      </span>
                    </div>
                    <div class="metadata-item">
                      <span class="metadata-label">Version:</span>
                      <span class="metadata-value">
                        {schema.version || '1.0.0'}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="card-actions">
                  <button
                    class="btn btn-primary btn-sm"
                    onClick$={() => nav(`/edit/${schema.id}/`)}
                    title="Éditer le schéma"
                  >
                    ✏️ Éditer
                  </button>

                  <button
                    class="btn btn-success btn-sm"
                    onClick$={() => nav(`/bdd/${schema.name}/`)}
                    title="Voir les entités basées sur ce schéma"
                  >
                    🗃️ Entités
                  </button>

                  <button
                    class="btn btn-secondary btn-sm"
                    onClick$={() => handleCopySchema(schema)}
                    title="Copier le JSON Schema"
                  >
                    📋 Copier
                  </button>

                  <button
                    class="btn btn-danger btn-sm"
                    onClick$={() => handleDelete(schema.id, schema.name)}
                    title="Supprimer le schéma"
                    disabled={loading}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// ========================================================================================
// PAGE DE CRÉATION CONTEXTUALISÉE (remplace src/routes/new/index.tsx)
// ========================================================================================

export const CreateSchemaPage = component$(() => {
  const nav = useNavigate();

  // Récupération de l'état et des actions depuis le contexte
  const { currentSchema, currentProperties, validationState, draftState } = useSchemaState();
  const {
    startEditing,
    updateSchemaInfo,
    addProperty,
    removeProperty,
    updateProperty,
    updatePropertyType,
    updateArrayItemType,
    saveCurrentSchema,
    restoreDraft,
    clearDraft
  } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  // Initialiser un nouveau schéma
  startEditing(null); // null = nouveau schéma

  // Handler pour ajouter une propriété
  const handleAddProperty = $(async (
    parentId: string | null,
    name: string,
    type: JsonSchemaType,
    required: boolean,
    description: string
  ) => {
    const result = await addProperty(parentId, name, type, required, description);
    if (!result.success && result.error) {
      showNotification('error', result.error);
    }
  });

  // Handler pour sauvegarder
  const handleSave = $(async () => {
    const result = await saveCurrentSchema();
    if (result.success) {
      showNotification('success', result.message);
      setTimeout(() => nav('/'), 1500);
    } else {
      showNotification('error', result.message);
    }
  });

  // Handler pour restaurer le brouillon
  const handleRestoreDraft = $(async () => {
    const result = await restoreDraft();
    if (result.success) {
      showNotification('success', 'Brouillon restauré avec succès');
    }
  });

  return (
    <div class="new-schema-page">
      {/* Modal de restauration de brouillon */}
      {draftState.hasDraft && draftState.showModal && (
        <div class="modal-overlay">
          <div class="modall">
            <div class="modal-header">
              <h2>Brouillon détecté</h2>
            </div>
            <div class="modal-content">
              <p>Nous avons trouvé un brouillon non sauvegardé. Voulez-vous le restaurer ?</p>
            </div>
            <div class="modal-actions">
              <button
                class="btn btn-primary"
                onClick$={handleRestoreDraft}
              >
                Restaurer le brouillon
              </button>
              <button
                class="btn btn-secondary"
                onClick$={() => clearDraft()}
              >
                Ignorer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Éditeur horizontal contextuel */}
      <ContextualHorizontalSchemaEditor
        onAddProperty$={handleAddProperty}
        onSave$={handleSave}
      />
    </div>
  );
});

// ========================================================================================
// PAGE D'ÉDITION CONTEXTUALISÉE (remplace src/routes/edit/[id]/index.tsx)
// ========================================================================================

type EditSchemaPageProps = {
  schemaId: string;
};

export const EditSchemaPage = component$<EditSchemaPageProps>((props) => {
  const nav = useNavigate();

  // Récupération de l'état et des actions depuis le contexte
  const { currentSchema, currentProperties, validationState, draftState } = useSchemaState();
  const {
    startEditing,
    updateSchemaInfo,
    addProperty,
    removeProperty,
    updateProperty,
    saveCurrentSchema,
    restoreDraft,
    clearDraft
  } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  // Charger le schéma pour édition
  startEditing(props.schemaId);

  // Handler pour sauvegarder les modifications
  const handleUpdate = $(async () => {
    const result = await saveCurrentSchema();
    if (result.success) {
      showNotification('success', result.message);
      setTimeout(() => nav('/'), 1500);
    } else {
      showNotification('error', result.message);
    }
  });

  // Handler pour restaurer le brouillon
  const handleRestoreDraft = $(async () => {
    const result = await restoreDraft();
    if (result.success) {
      showNotification('success', 'Modifications restaurées avec succès');
    }
  });

  return (
    <div class="edit-schema-page">
      {/* Modal pour les modifications non sauvegardées */}
      {draftState.hasDraft && draftState.showModal && (
        <div class="modal-overlay">
          <div class="modall">
            <div class="modal-header">
              <h2>⚠️ Modifications non sauvegardées détectées</h2>
            </div>
            <div class="modal-content">
              <p>Nous avons trouvé des modifications non sauvegardées pour ce schéma.</p>
              <p><strong>Voulez-vous restaurer ces modifications ?</strong></p>
            </div>
            <div class="modal-actions">
              <button
                class="btn btn-primary"
                onClick$={handleRestoreDraft}
              >
                ✅ Restaurer les modifications
              </button>
              <button
                class="btn btn-danger"
                onClick$={() => clearDraft()}
              >
                ❌ Ignorer et reprendre du schéma original
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Éditeur horizontal contextuel */}
      <ContextualHorizontalSchemaEditor
        onSave$={handleUpdate}
      />
    </div>
  );
});

// ========================================================================================
// COMPOSANT HORIZONTAL CONTEXTUALISÉ
// ========================================================================================

type ContextualHorizontalSchemaEditorProps = {
  onAddProperty$?: (
    parentId: string | null,
    name: string,
    type: JsonSchemaType,
    required: boolean,
    description: string
  ) => Promise<void>;
  onSave$: () => Promise<void>;
};

export const ContextualHorizontalSchemaEditor = component$<ContextualHorizontalSchemaEditorProps>((props) => {
  // Récupération de l'état depuis le contexte
  const {
    currentSchema,
    currentProperties,
    validationState,
    generatedJson,
    autoSaveState
  } = useSchemaState();
  const {
    updateSchemaInfo,
    addProperty,
    removeProperty,
    updateProperty,
    updatePropertyType,
    updateArrayItemType,
    copyJsonToClipboard
  } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  // Handler pour copier le JSON
  const handleCopyJson = $(async () => {
    const result = await copyJsonToClipboard();
    if (result.success) {
      showNotification('success', result.message);
    } else {
      showNotification('error', result.message);
    }
  });

  return (
    <div class="horizontal-schema-editor-contextual">
      {/* En-tête avec informations du schéma */}
      <div class="editor-header">
        <div class="schema-info">
          <input
            type="text"
            placeholder="Nom du schéma"
            value={currentSchema.name}
            onInput$={(e) => updateSchemaInfo({
              name: (e.target as HTMLInputElement).value
            })}
            class="schema-name-input"
          />

          <input
            type="text"
            placeholder="Titre (optionnel)"
            value={currentSchema.title}
            onInput$={(e) => updateSchemaInfo({
              title: (e.target as HTMLInputElement).value
            })}
            class="schema-title-input"
          />

          <textarea
            placeholder="Description du schéma"
            value={currentSchema.description}
            onInput$={(e) => updateSchemaInfo({
              description: (e.target as HTMLTextAreaElement).value
            })}
            class="schema-description-input"
          />
        </div>

        <div class="editor-actions">
          {/* Statut d'auto-save */}
          {autoSaveState.isActive && (
            <div class="auto-save-status">
              <span class="auto-save-indicator">●</span>
              Sauvegarde automatique: {autoSaveState.lastSaved || 'en cours...'}
            </div>
          )}

          <button
            class="btn btn-secondary"
            onClick$={handleCopyJson}
          >
            📋 Copier JSON
          </button>

          <button
            class="btn btn-primary"
            onClick$={props.onSave$}
            disabled={!validationState.isValid}
          >
            💾 Sauvegarder
          </button>
        </div>
      </div>

      {/* Validation errors */}
      {validationState.errors.length > 0 && (
        <div class="validation-errors">
          <h4>Erreurs de validation :</h4>
          <ul>
            {validationState.errors.map((error, index) => (
              <li key={index} class="error-item">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Éditeur de propriétés contextuel */}
      <ContextualPropertyEditor />

      {/* Prévisualisation JSON */}
      <div class="json-preview">
        <h3>Schéma JSON généré</h3>
        <pre class="json-code">
          <code>{generatedJson}</code>
        </pre>
      </div>
    </div>
  );
});

// ========================================================================================
// ÉDITEUR DE PROPRIÉTÉS CONTEXTUALISÉ
// ========================================================================================

export const ContextualPropertyEditor = component$(() => {
  const { currentProperties } = useSchemaState();
  const { addProperty, removeProperty, updateProperty } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  const handleAddProperty = $(async () => {
    const result = await addProperty(
      null, // parentId pour propriété racine
      'nouvelle_propriete',
      'string',
      false,
      ''
    );

    if (!result.success && result.error) {
      showNotification('error', result.error);
    }
  });

  return (
    <div class="contextual-property-editor">
      <div class="properties-header">
        <h3>Propriétés du schéma</h3>
        <button
          class="btn btn-primary btn-sm"
          onClick$={handleAddProperty}
        >
          ➕ Ajouter une propriété
        </button>
      </div>

      <div class="properties-list">
        {currentProperties.length === 0 ? (
          <div class="empty-properties">
            <p>Aucune propriété définie. Commencez par en ajouter une.</p>
          </div>
        ) : (
          currentProperties.map((property) => (
            <ContextualPropertyItem
              key={property.id}
              propertyId={property.id}
            />
          ))
        )}
      </div>
    </div>
  );
});

// ========================================================================================
// ÉLÉMENT DE PROPRIÉTÉ CONTEXTUALISÉ
// ========================================================================================

type ContextualPropertyItemProps = {
  propertyId: string;
};

export const ContextualPropertyItem = component$<ContextualPropertyItemProps>((props) => {
  const { currentProperties } = useSchemaState();
  const { updateProperty, removeProperty } = useSchemaActions();

  // Trouver la propriété par son ID
  const property = currentProperties.find(p => p.id === props.propertyId);

  if (!property) return null;

  return (
    <div class="contextual-property-item">
      <div class="property-basic-info">
        <input
          type="text"
          value={property.name}
          onInput$={(e) => updateProperty(props.propertyId, {
            name: (e.target as HTMLInputElement).value
          })}
          placeholder="Nom de la propriété"
          class="property-name-input"
        />

        <select
          value={property.type}
          onChange$={(e) => updateProperty(props.propertyId, {
            type: (e.target as HTMLSelectElement).value as JsonSchemaType
          })}
          class="property-type-select"
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="integer">Integer</option>
          <option value="boolean">Boolean</option>
          <option value="array">Array</option>
          <option value="object">Object</option>
        </select>

        <label class="property-required">
          <input
            type="checkbox"
            checked={property.required}
            onChange$={(e) => updateProperty(props.propertyId, {
              required: (e.target as HTMLInputElement).checked
            })}
          />
          Requis
        </label>

        <button
          class="btn btn-danger btn-sm"
          onClick$={() => removeProperty(props.propertyId)}
        >
          🗑️
        </button>
      </div>

      <textarea
        value={property.description || ''}
        onInput$={(e) => updateProperty(props.propertyId, {
          description: (e.target as HTMLTextAreaElement).value
        })}
        placeholder="Description de la propriété"
        class="property-description-input"
      />

      {/* Propriétés spécifiques au type */}
      {property.type === 'string' && (
        <div class="type-specific-props">
          <input
            type="number"
            value={property.minLength || ''}
            onInput$={(e) => updateProperty(props.propertyId, {
              minLength: parseInt((e.target as HTMLInputElement).value) || undefined
            })}
            placeholder="Longueur minimale"
          />
          <input
            type="number"
            value={property.maxLength || ''}
            onInput$={(e) => updateProperty(props.propertyId, {
              maxLength: parseInt((e.target as HTMLInputElement).value) || undefined
            })}
            placeholder="Longueur maximale"
          />
        </div>
      )}

      {(property.type === 'number' || property.type === 'integer') && (
        <div class="type-specific-props">
          <input
            type="number"
            value={property.minimum || ''}
            onInput$={(e) => updateProperty(props.propertyId, {
              minimum: parseFloat((e.target as HTMLInputElement).value) || undefined
            })}
            placeholder="Valeur minimale"
          />
          <input
            type="number"
            value={property.maximum || ''}
            onInput$={(e) => updateProperty(props.propertyId, {
              maximum: parseFloat((e.target as HTMLInputElement).value) || undefined
            })}
            placeholder="Valeur maximale"
          />
        </div>
      )}
    </div>
  );
});