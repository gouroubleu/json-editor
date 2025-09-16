/**
 * Exemple d'utilisation du SchemaEditorProvider
 *
 * Ce fichier montre comment intégrer et utiliser le provider dans une application Qwik
 */

import { component$, useTask$ } from '@builder.io/qwik';
import {
  SchemaEditorProvider,
  useSchemaEditor,
  useSchemaValidation,
  useAutoSave,
  useDraftManager,
  useSchemaCache,
  SchemaEditorNotification
} from './index';

// Composant principal qui wrap l'application avec le provider
export const SchemaEditorApp = component$(() => {
  return (
    <SchemaEditorProvider>
      <div class="schema-editor-app">
        {/* Notification globale */}
        <SchemaEditorNotification />

        {/* Interface principale */}
        <MainEditorInterface />

        {/* Panneau latéral avec fonctionnalités avancées */}
        <SidePanel />
      </div>
    </SchemaEditorProvider>
  );
});

// Interface principale d'édition
const MainEditorInterface = component$(() => {
  const { store, actions } = useSchemaEditor();
  const { isValid } = useSchemaValidation();

  return (
    <div class="main-editor">
      <header class="editor-header">
        <h1>Éditeur de Schéma JSON</h1>
        <div class="schema-info">
          <input
            type="text"
            placeholder="Nom du schéma"
            value={store.current.schemaInfo.name}
            onInput$={(e) => actions.updateSchemaInfo({
              name: (e.target as HTMLInputElement).value
            })}
          />
          <input
            type="text"
            placeholder="Titre"
            value={store.current.schemaInfo.title}
            onInput$={(e) => actions.updateSchemaInfo({
              title: (e.target as HTMLInputElement).value
            })}
          />
          <textarea
            placeholder="Description"
            value={store.current.schemaInfo.description}
            onInput$={(e) => actions.updateSchemaInfo({
              description: (e.target as HTMLTextAreaElement).value
            })}
          />
        </div>
      </header>

      <div class="editor-content">
        <PropertiesEditor />
      </div>

      <footer class="editor-footer">
        <div class="validation-status">
          <span class={`status ${isValid ? 'valid' : 'invalid'}`}>
            {isValid ? '✓ Valide' : '✗ Invalide'}
          </span>
          {store.current.errors.length > 0 && (
            <ul class="errors">
              {store.current.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
        </div>

        <div class="actions">
          <button
            onClick$={() => actions.saveSchema()}
            disabled={store.ui.saving || !isValid}
            class="btn btn-primary"
          >
            {store.ui.saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>

          <button
            onClick$={() => actions.generateSchema()}
            disabled={store.ui.loading}
            class="btn btn-secondary"
          >
            Prévisualiser JSON
          </button>

          <button
            onClick$={() => actions.resetEditor()}
            class="btn btn-outline"
          >
            Nouveau Schéma
          </button>
        </div>
      </footer>
    </div>
  );
});

// Éditeur de propriétés
const PropertiesEditor = component$(() => {
  const { store, actions } = useSchemaEditor();

  return (
    <div class="properties-editor">
      <div class="properties-header">
        <h3>Propriétés</h3>
        <button
          onClick$={() => actions.addProperty({
            name: '',
            type: 'string',
            required: false,
            description: ''
          })}
          class="btn btn-sm btn-primary"
        >
          + Ajouter Propriété
        </button>
      </div>

      <div class="properties-list">
        {store.current.properties.map((property, index) => (
          <PropertyEditor
            key={property.id || index}
            property={property}
            index={index}
          />
        ))}
      </div>
    </div>
  );
});

// Éditeur de propriété individuelle
const PropertyEditor = component$<{
  property: any;
  index: number;
}>(({ property, index }) => {
  const { actions } = useSchemaEditor();

  return (
    <div class="property-editor">
      <div class="property-header">
        <input
          type="text"
          value={property.name}
          placeholder="Nom de la propriété"
          onInput$={(e) => actions.updateProperty(property.id, {
            name: (e.target as HTMLInputElement).value
          })}
        />

        <select
          value={property.type}
          onChange$={(e) => actions.updateProperty(property.id, {
            type: (e.target as HTMLSelectElement).value as any
          })}
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="integer">Integer</option>
          <option value="boolean">Boolean</option>
          <option value="array">Array</option>
          <option value="object">Object</option>
        </select>

        <label class="checkbox">
          <input
            type="checkbox"
            checked={property.required}
            onChange$={(e) => actions.updateProperty(property.id, {
              required: (e.target as HTMLInputElement).checked
            })}
          />
          Requis
        </label>

        <div class="property-actions">
          <button
            onClick$={() => actions.moveProperty(property.id, 'up')}
            disabled={index === 0}
            class="btn btn-sm"
          >
            ↑
          </button>
          <button
            onClick$={() => actions.moveProperty(property.id, 'down')}
            class="btn btn-sm"
          >
            ↓
          </button>
          <button
            onClick$={() => actions.duplicateProperty(property.id)}
            class="btn btn-sm"
          >
            📋
          </button>
          <button
            onClick$={() => actions.removeProperty(property.id)}
            class="btn btn-sm btn-danger"
          >
            🗑️
          </button>
        </div>
      </div>

      <div class="property-details">
        <textarea
          placeholder="Description"
          value={property.description}
          onInput$={(e) => actions.updateProperty(property.id, {
            description: (e.target as HTMLTextAreaElement).value
          })}
        />

        {/* Contraintes spécifiques par type */}
        {property.type === 'string' && (
          <StringConstraints property={property} />
        )}

        {(property.type === 'number' || property.type === 'integer') && (
          <NumberConstraints property={property} />
        )}
      </div>
    </div>
  );
});

// Contraintes pour les strings
const StringConstraints = component$<{ property: any }>(({ property }) => {
  const { actions } = useSchemaEditor();

  return (
    <div class="string-constraints">
      <div class="constraint-row">
        <label>Longueur min:</label>
        <input
          type="number"
          value={property.minLength || ''}
          onInput$={(e) => actions.updateProperty(property.id, {
            minLength: parseInt((e.target as HTMLInputElement).value) || undefined
          })}
        />
      </div>
      <div class="constraint-row">
        <label>Longueur max:</label>
        <input
          type="number"
          value={property.maxLength || ''}
          onInput$={(e) => actions.updateProperty(property.id, {
            maxLength: parseInt((e.target as HTMLInputElement).value) || undefined
          })}
        />
      </div>
      <div class="constraint-row">
        <label>Format:</label>
        <select
          value={property.format || ''}
          onChange$={(e) => actions.updateProperty(property.id, {
            format: (e.target as HTMLSelectElement).value || undefined
          })}
        >
          <option value="">Aucun</option>
          <option value="email">Email</option>
          <option value="date">Date</option>
          <option value="uri">URI</option>
          <option value="datetime-local">DateTime Local</option>
        </select>
      </div>
    </div>
  );
});

// Contraintes pour les numbers
const NumberConstraints = component$<{ property: any }>(({ property }) => {
  const { actions } = useSchemaEditor();

  return (
    <div class="number-constraints">
      <div class="constraint-row">
        <label>Valeur min:</label>
        <input
          type="number"
          value={property.minimum ?? ''}
          onInput$={(e) => actions.updateProperty(property.id, {
            minimum: parseFloat((e.target as HTMLInputElement).value) || undefined
          })}
        />
      </div>
      <div class="constraint-row">
        <label>Valeur max:</label>
        <input
          type="number"
          value={property.maximum ?? ''}
          onInput$={(e) => actions.updateProperty(property.id, {
            maximum: parseFloat((e.target as HTMLInputElement).value) || undefined
          })}
        />
      </div>
    </div>
  );
});

// Panneau latéral avec fonctionnalités avancées
const SidePanel = component$(() => {
  return (
    <div class="side-panel">
      <AutoSavePanel />
      <DraftPanel />
      <CachePanel />
      <HistoryPanel />
    </div>
  );
});

// Panneau auto-save
const AutoSavePanel = component$(() => {
  const {
    isAutoSaveEnabled,
    hasUnsavedChanges,
    enableAutoSave,
    disableAutoSave,
    forceSave
  } = useAutoSave({
    enabled: true,
    delay: 2000,
    showNotifications: true
  });

  return (
    <div class="panel auto-save-panel">
      <h4>Sauvegarde Automatique</h4>
      <div class="panel-content">
        <label class="checkbox">
          <input
            type="checkbox"
            checked={isAutoSaveEnabled}
            onChange$={(e) => {
              if ((e.target as HTMLInputElement).checked) {
                enableAutoSave();
              } else {
                disableAutoSave();
              }
            }}
          />
          Activer l'auto-save
        </label>

        <p class={`status ${hasUnsavedChanges ? 'unsaved' : 'saved'}`}>
          {hasUnsavedChanges ? 'Changements non sauvés' : 'Tout est sauvegardé'}
        </p>

        <button
          onClick$={forceSave}
          disabled={!hasUnsavedChanges}
          class="btn btn-sm btn-primary"
        >
          Sauvegarder maintenant
        </button>
      </div>
    </div>
  );
});

// Panneau de gestion des brouillons
const DraftPanel = component$(() => {
  const {
    draftInfo,
    draftsHistory,
    loadDraftsHistory,
    loadDraft,
    clearDraft
  } = useDraftManager();

  // Charger l'historique au montage du composant
  useTask$(async () => {
    await loadDraftsHistory();
  });

  return (
    <div class="panel draft-panel">
      <h4>Brouillons</h4>
      <div class="panel-content">
        <div class="current-draft">
          <p>Mode: {draftInfo.value.isEditMode ? 'Édition' : 'Création'}</p>
          {draftInfo.value.lastSaved && (
            <p>Dernière sauvegarde: {new Date(draftInfo.value.lastSaved).toLocaleString()}</p>
          )}
        </div>

        <div class="draft-actions">
          <button
            onClick$={() => loadDraft()}
            class="btn btn-sm"
          >
            Charger brouillon
          </button>
          <button
            onClick$={() => clearDraft()}
            class="btn btn-sm btn-outline"
          >
            Supprimer brouillon
          </button>
        </div>

        <div class="drafts-history">
          <h5>Historique</h5>
          {draftsHistory.map((draft, index) => (
            <div key={index} class="draft-item">
              <div class="draft-info">
                <span class="draft-name">{draft.schemaInfo.name || 'Sans nom'}</span>
                <span class="draft-date">{new Date(draft.lastSaved).toLocaleString()}</span>
              </div>
              <button
                onClick$={() => loadDraft(draft)}
                class="btn btn-xs"
              >
                Charger
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Panneau de gestion du cache
const CachePanel = component$(() => {
  const {
    cacheStats,
    syncCache,
    clearCache,
    searchInCache
  } = useSchemaCache();

  return (
    <div class="panel cache-panel">
      <h4>Cache</h4>
      <div class="panel-content">
        <div class="cache-stats">
          <p>Schémas en cache: {cacheStats.value.totalSchemas}</p>
          <p>Taux de succès: {cacheStats.value.cacheHitRate.toFixed(1)}%</p>
          <p class={`cache-status ${cacheStats.value.isExpired ? 'expired' : 'fresh'}`}>
            {cacheStats.value.isExpired ? 'Cache expiré' : 'Cache à jour'}
          </p>
        </div>

        <div class="cache-actions">
          <button
            onClick$={() => syncCache()}
            class="btn btn-sm"
          >
            Synchroniser
          </button>
          <button
            onClick$={() => clearCache()}
            class="btn btn-sm btn-outline"
          >
            Vider le cache
          </button>
        </div>
      </div>
    </div>
  );
});

// Panneau d'historique (undo/redo)
const HistoryPanel = component$(() => {
  const { store, actions } = useSchemaEditor();

  return (
    <div class="panel history-panel">
      <h4>Historique</h4>
      <div class="panel-content">
        <div class="history-info">
          <p>Actions passées: {store.history.past.length}</p>
          <p>Actions futures: {store.history.future.length}</p>
        </div>

        <div class="history-actions">
          <button
            onClick$={() => actions.undo()}
            disabled={store.history.past.length === 0}
            class="btn btn-sm"
          >
            ↶ Annuler
          </button>
          <button
            onClick$={() => actions.redo()}
            disabled={store.history.future.length === 0}
            class="btn btn-sm"
          >
            ↷ Refaire
          </button>
          <button
            onClick$={() => actions.resetHistory()}
            class="btn btn-sm btn-outline"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
});

export default SchemaEditorApp;