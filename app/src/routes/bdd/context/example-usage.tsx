// Exemple d'utilisation complet du contexte EntityEditor avec architecture Qwik
import { component$, useSignal, useTask$ } from '@builder.io/qwik';
import {
  EntityProvider,
  useEntityContext,
  useEntitySummaries,
  useEntityList,
  useCurrentEntity,
  useEntityForm,
  useEntitySync,
  DEFAULT_ENTITY_CONFIG
} from './index';
import type { EntityContextConfig } from './types';

/**
 * Composant principal démontrant l'usage du contexte EntityEditor
 */
export const EntityEditorExample = component$(() => {
  // Simuler un contexte SchemaEditor minimal pour l'exemple
  const mockSchemaContext = {
    state: {
      schemas: [],
      currentSchema: null
    },
    actions: {
      schemas: {
        loadAll: $(() => Promise.resolve()),
        loadById: $((id: string) => Promise.resolve(null))
      }
    },
    signals: {
      currentSchemaSignal: useSignal([]),
      loadingSignal: useSignal(false)
    }
  };

  // Configuration personnalisée pour l'exemple
  const exampleConfig: Partial<EntityContextConfig> = {
    pagination: {
      defaultPageSize: 10,
      maxPageSize: 50
    },
    notifications: {
      maxNotifications: 3,
      defaultDuration: 3000
    },
    validation: {
      enableRealTime: true,
      debounceTime: 500
    }
  };

  return (
    <EntityProvider
      schemaContext={mockSchemaContext as any}
      config={exampleConfig}
    >
      <div class="entity-editor-example" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>📝 Exemple d'utilisation du contexte EntityEditor</h1>

        {/* Informations sur le contexte */}
        <ContextInfo />

        {/* Navigation et vue d'ensemble */}
        <NavigationPanel />

        {/* Vue principale */}
        <MainContent />

        {/* Panneau de synchronisation */}
        <SyncPanel />

        {/* Statistiques */}
        <StatsPanel />
      </div>
    </EntityProvider>
  );
});

/**
 * Informations sur l'état du contexte
 */
const ContextInfo = component$(() => {
  const { state, actions } = useEntityContext();

  return (
    <div class="context-info" style={{
      backgroundColor: '#f8f9fa',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #dee2e6'
    }}>
      <h3>ℹ️ État du contexte</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        <div>
          <strong>Vue active:</strong> {state.ui.activeView}
        </div>
        <div>
          <strong>Mode d'édition:</strong> {state.ui.editMode}
        </div>
        <div>
          <strong>Schéma sélectionné:</strong> {state.ui.selectedSchemaName || 'Aucun'}
        </div>
        <div>
          <strong>Entités chargées:</strong> {state.entities.length}
        </div>
        <div>
          <strong>Résumés:</strong> {state.summaries.length}
        </div>
        <div>
          <strong>Page actuelle:</strong> {state.pagination.currentPage}
        </div>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          onClick$={actions.summaries.loadAll}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Charger les résumés
        </button>

        <button
          onClick$={() => actions.ui.setActiveView('summary')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          📊 Vue résumé
        </button>
      </div>
    </div>
  );
});

/**
 * Panneau de navigation simplifié
 */
const NavigationPanel = component$(() => {
  const { state, actions } = useEntityContext();

  return (
    <div class="navigation-panel" style={{
      backgroundColor: '#e9ecef',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h3>🧭 Navigation</h3>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ marginRight: '10px' }}>Vue:</label>
        <select
          value={state.ui.activeView}
          onChange$={(e) => actions.ui.setActiveView((e.target as HTMLSelectElement).value as any)}
          style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="summary">Résumé</option>
          <option value="list">Liste</option>
          <option value="editor">Éditeur</option>
          <option value="viewer">Visualiseur</option>
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ marginRight: '10px' }}>Mode:</label>
        <select
          value={state.ui.editMode}
          onChange$={(e) => actions.ui.setEditMode((e.target as HTMLSelectElement).value as any)}
          style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="view">Lecture</option>
          <option value="edit">Édition</option>
          <option value="create">Création</option>
        </select>
      </div>

      <div>
        <input
          type="text"
          placeholder="Rechercher des entités..."
          value={state.ui.searchQuery}
          onInput$={(e) => actions.filters.setSearchQuery((e.target as HTMLInputElement).value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            width: '100%',
            maxWidth: '300px'
          }}
        />
      </div>
    </div>
  );
});

/**
 * Contenu principal selon la vue active
 */
const MainContent = component$(() => {
  const { state } = useEntityContext();

  return (
    <div class="main-content" style={{ marginBottom: '20px' }}>
      {state.ui.activeView === 'summary' && <SummaryView />}
      {state.ui.activeView === 'list' && <EntityListView />}
      {state.ui.activeView === 'editor' && <EntityEditorView />}
      {state.ui.activeView === 'viewer' && <EntityViewerView />}
    </div>
  );
});

/**
 * Vue résumé des entités par schéma
 */
const SummaryView = component$(() => {
  const { state, actions } = useEntityContext();

  const handleTestSchemaLoad = $(async () => {
    // Test avec le schéma 'encoreuntest'
    actions.filters.setSchemaName('encoreuntest');
    await actions.filters.applyFilters();
    actions.ui.setActiveView('list');
  });

  return (
    <div class="summary-view" style={{
      backgroundColor: '#fff3cd',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #ffeaa7'
    }}>
      <h3>📋 Résumé des entités</h3>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick$={actions.summaries.refresh}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🔄 Actualiser les résumés
        </button>

        <button
          onClick$={handleTestSchemaLoad}
          style={{
            padding: '10px 20px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🧪 Tester schéma 'encoreuntest'
        </button>
      </div>

      {state.loading.isLoadingSummaries ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>⏳ Chargement des résumés...</p>
        </div>
      ) : state.summaries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
          <p>Aucun résumé disponible. Cliquez sur "Actualiser" pour charger les données.</p>
        </div>
      ) : (
        <div class="summaries-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {state.summaries.map((summary) => (
            <div key={summary.schemaName} style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h4 style={{ marginTop: 0 }}>{summary.schemaName}</h4>
              <div style={{ marginBottom: '10px' }}>
                <div>📊 Total: <strong>{summary.totalEntities}</strong></div>
                <div>🔄 Version: <strong>{summary.currentSchemaVersion}</strong></div>
                {summary.outdatedEntities > 0 && (
                  <div style={{ color: '#dc3545' }}>
                    ⚠️ Obsolètes: <strong>{summary.outdatedEntities}</strong>
                  </div>
                )}
              </div>

              <button
                onClick$={() => {
                  actions.filters.setSchemaName(summary.schemaName);
                  actions.filters.applyFilters();
                  actions.ui.setActiveView('list');
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Voir les entités
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Vue liste des entités
 */
const EntityListView = component$(() => {
  const { state, actions } = useEntityContext();

  useTask$(({ track }) => {
    track(() => state.ui.activeView);
    if (state.ui.activeView === 'list' && state.entities.length === 0) {
      actions.entities.loadList();
    }
  });

  return (
    <div class="entity-list-view" style={{
      backgroundColor: '#d1ecf1',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #bee5eb'
    }}>
      <div class="list-header" style={{ marginBottom: '20px' }}>
        <h3>📝 Liste des entités</h3>
        {state.ui.selectedSchemaName && (
          <p>Schéma: <strong>{state.ui.selectedSchemaName}</strong></p>
        )}
      </div>

      {/* Contrôles de pagination */}
      <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick$={actions.entities.prevPage}
          disabled={state.pagination.currentPage <= 1}
          style={{
            padding: '8px 12px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: state.pagination.currentPage <= 1 ? '#6c757d' : '#007bff',
            color: 'white',
            cursor: state.pagination.currentPage <= 1 ? 'not-allowed' : 'pointer'
          }}
        >
          ← Précédent
        </button>

        <span>
          Page {state.pagination.currentPage} • Total: {state.pagination.totalCount}
        </span>

        <button
          onClick$={actions.entities.nextPage}
          disabled={!state.pagination.hasMore}
          style={{
            padding: '8px 12px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: !state.pagination.hasMore ? '#6c757d' : '#007bff',
            color: 'white',
            cursor: !state.pagination.hasMore ? 'not-allowed' : 'pointer'
          }}
        >
          Suivant →
        </button>
      </div>

      {state.loading.isLoadingEntities ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>⏳ Chargement des entités...</p>
        </div>
      ) : state.entities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
          <p>Aucune entité trouvée.</p>
          <button
            onClick$={() => actions.entities.loadList()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Recharger
          </button>
        </div>
      ) : (
        <div class="entity-list">
          {state.entities.map((entity) => (
            <div key={entity.id} style={{
              backgroundColor: 'white',
              padding: '15px',
              marginBottom: '10px',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>{entity.id.substring(0, 12)}...</strong>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  v{entity.version} • {new Date(entity.updatedAt).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick$={() => actions.entities.selectForView(entity.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  👁️ Voir
                </button>
                <button
                  onClick$={() => actions.entities.selectForEdit(entity.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ffc107',
                    color: 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ✏️ Éditer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Vue éditeur d'entité
 */
const EntityEditorView = component$(() => {
  const { state } = useEntityContext();

  return (
    <div class="entity-editor-view" style={{
      backgroundColor: '#d4edda',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #c3e6cb'
    }}>
      <h3>✏️ Éditeur d'entité</h3>

      {state.currentEntity ? (
        <div>
          <p><strong>ID:</strong> {state.currentEntity.id}</p>
          <p><strong>Schéma:</strong> {state.currentEntity.schemaName}</p>
          <p><strong>Version:</strong> {state.currentEntity.version}</p>

          <div style={{ marginTop: '20px' }}>
            <h4>Données:</h4>
            <pre style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              overflow: 'auto',
              maxHeight: '300px'
            }}>
              {JSON.stringify(state.currentEntity.data, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <p style={{ color: '#6c757d' }}>Aucune entité sélectionnée pour l'édition.</p>
      )}
    </div>
  );
});

/**
 * Vue visualiseur d'entité
 */
const EntityViewerView = component$(() => {
  const { state } = useEntityContext();

  return (
    <div class="entity-viewer-view" style={{
      backgroundColor: '#f8d7da',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #f5c6cb'
    }}>
      <h3>👁️ Visualiseur d'entité</h3>

      {state.currentEntity ? (
        <div>
          <h4>Métadonnées</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px', marginBottom: '20px' }}>
            <strong>ID:</strong> <span>{state.currentEntity.id}</span>
            <strong>Schéma:</strong> <span>{state.currentEntity.schemaName}</span>
            <strong>Version:</strong> <span>{state.currentEntity.version}</span>
            <strong>Créée:</strong> <span>{new Date(state.currentEntity.createdAt).toLocaleString()}</span>
            <strong>Modifiée:</strong> <span>{new Date(state.currentEntity.updatedAt).toLocaleString()}</span>
          </div>

          <h4>Données (lecture seule)</h4>
          <pre style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            {JSON.stringify(state.currentEntity.data, null, 2)}
          </pre>
        </div>
      ) : (
        <p style={{ color: '#6c757d' }}>Aucune entité sélectionnée pour la visualisation.</p>
      )}
    </div>
  );
});

/**
 * Panneau de synchronisation
 */
const SyncPanel = component$(() => {
  const sync = useEntitySync();

  return (
    <div class="sync-panel" style={{
      backgroundColor: '#e2e3e5',
      padding: '15px',
      borderRadius: '8px',
      border: '1px solid #d6d8db',
      marginBottom: '20px'
    }}>
      <h3>🔄 Synchronisation</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' }}>
        <div>
          <strong>État:</strong>
          <span style={{
            marginLeft: '5px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: sync.isOnline ? '#d4edda' : '#f8d7da',
            color: sync.isOnline ? '#155724' : '#721c24',
            fontSize: '12px'
          }}>
            {sync.isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
          </span>
        </div>
        <div>
          <strong>Auto-save:</strong>
          <span style={{ marginLeft: '5px' }}>
            {sync.autoSaveEnabled ? '✅ Activé' : '❌ Désactivé'}
          </span>
        </div>
        <div>
          <strong>Changements:</strong> {sync.pendingChanges}
        </div>
        <div>
          <strong>Dernière sync:</strong>
          <span style={{ fontSize: '12px', marginLeft: '5px' }}>
            {sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString() : 'Jamais'}
          </span>
        </div>
      </div>

      <div>
        <strong>Statut:</strong>
        <span style={{ marginLeft: '10px', fontStyle: 'italic' }}>
          {sync.syncStatus.message}
        </span>
      </div>

      <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
        <button
          onClick$={sync.toggleAutoSave}
          style={{
            padding: '8px 16px',
            backgroundColor: sync.autoSaveEnabled ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {sync.autoSaveEnabled ? 'Désactiver' : 'Activer'} auto-save
        </button>

        <button
          onClick$={sync.forceSave}
          disabled={sync.pendingChanges === 0}
          style={{
            padding: '8px 16px',
            backgroundColor: sync.pendingChanges > 0 ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: sync.pendingChanges > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px'
          }}
        >
          💾 Sauvegarder maintenant
        </button>

        <button
          onClick$={sync.clearPendingChanges}
          disabled={sync.pendingChanges === 0}
          style={{
            padding: '8px 16px',
            backgroundColor: sync.pendingChanges > 0 ? '#ffc107' : '#6c757d',
            color: sync.pendingChanges > 0 ? 'black' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: sync.pendingChanges > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px'
          }}
        >
          🗑️ Effacer changements
        </button>
      </div>
    </div>
  );
});

/**
 * Panneau des statistiques
 */
const StatsPanel = component$(() => {
  const { state } = useEntityContext();

  return (
    <div class="stats-panel" style={{
      backgroundColor: '#fff3cd',
      padding: '15px',
      borderRadius: '8px',
      border: '1px solid #ffeaa7'
    }}>
      <h3>📊 Statistiques</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          <h5 style={{ marginTop: 0 }}>Entités</h5>
          <div>Total chargées: <strong>{state.entities.length}</strong></div>
          <div>Page courante: <strong>{state.pagination.currentPage}</strong></div>
          <div>Total global: <strong>{state.pagination.totalCount}</strong></div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          <h5 style={{ marginTop: 0 }}>Résumés</h5>
          <div>Schémas: <strong>{state.summaries.length}</strong></div>
          <div>Sélectionné: <strong>{state.ui.selectedSchemaName || 'Aucun'}</strong></div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          <h5 style={{ marginTop: 0 }}>Interface</h5>
          <div>Vue: <strong>{state.ui.activeView}</strong></div>
          <div>Mode: <strong>{state.ui.editMode}</strong></div>
          <div>Recherche: <strong>{state.ui.searchQuery || 'Vide'}</strong></div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          <h5 style={{ marginTop: 0 }}>État</h5>
          <div>Chargement: <strong>{state.loading.isLoadingEntities ? 'Oui' : 'Non'}</strong></div>
          <div>Notifications: <strong>{state.notifications.length}</strong></div>
        </div>
      </div>
    </div>
  );
});

export default EntityEditorExample;