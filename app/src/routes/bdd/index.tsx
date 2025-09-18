import { component$, useSignal, useStyles$, useTask$, $ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { getEntitiesSummary, migrateSchemaEntities } from './services';
import type { EntitySummary } from './types';
import STYLES from './index.scss?inline';

export default component$(() => {
  useStyles$(STYLES);
  
  const nav = useNavigate();
  const entitiesSummary = useSignal<EntitySummary[]>([]);
  const loading = useSignal(true);
  const uiState = useSignal({
    notification: { show: false, type: 'success', message: '' }
  });

  // Charger le résumé des entités au démarrage
  useTask$(async () => {
    try {
      loading.value = true;
      const summary = await getEntitiesSummary();
      entitiesSummary.value = summary;
    } catch (error) {
      console.error('Erreur chargement résumé:', error);
    } finally {
      loading.value = false;
    }
  });

  const handleSchemaClick = $((schemaName: string) => {
    nav(`/bdd/${schemaName}/`);
  });

  const handleCreateEntity = $((schemaName: string) => {
    nav(`/bdd/${schemaName}/new/`);
  });

  const refreshData = $(async () => {
    loading.value = true;
    try {
      const summary = await getEntitiesSummary();
      entitiesSummary.value = summary;
    } catch (error) {
      console.error('Erreur refresh:', error);
    } finally {
      loading.value = false;
    }
  });

  const showNotification = $((type: 'success' | 'error' | 'warning', message: string) => {
    uiState.value = {
      ...uiState.value,
      notification: { show: true, type, message }
    };
    
    setTimeout(() => {
      uiState.value = {
        ...uiState.value,
        notification: { show: false, type: 'success', message: '' }
      };
    }, 3000);
  });

  const handleMigrateSchema = $(async (schemaName: string) => {
    try {
      const result = await migrateSchemaEntities(schemaName);
      
      if (result.success) {
        await showNotification('success', result.message);
        // Rafraîchir les données pour voir les changements
        await refreshData();
      } else {
        await showNotification('error', result.message);
      }
    } catch (error) {
      console.error('Erreur migration:', error);
      await showNotification('error', 'Erreur lors de la migration des entités');
    }
  });

  return (
    <div class="page-bdd">
      {/* Header */}
      <div class="header">
        <div class="header-content">
          <h1 class="title">Base de Données - Entités</h1>
          <p class="subtitle">Gérez vos entités basées sur les schémas JSON</p>
        </div>
        <div class="header-actions">
          <button
            class="btn btn-secondary"
            onClick$={refreshData}
            disabled={loading.value}
          >
            {loading.value ? '⏳ Chargement...' : '🔄 Actualiser'}
          </button>
          
          <button
            class="btn btn-info"
            onClick$={() => nav('/')}
            title="Retour à la gestion des schémas JSON"
          >
            📋 JSON Schemas
          </button>
        </div>
      </div>

      {/* Statistiques globales */}
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-number">
            {entitiesSummary.value.length}
          </div>
          <div class="stat-label">Schémas avec entités</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">
            {entitiesSummary.value.reduce((total, s) => total + s.totalEntities, 0)}
          </div>
          <div class="stat-label">Total entités</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">
            {entitiesSummary.value.reduce((total, s) => total + s.outdatedEntities, 0)}
          </div>
          <div class="stat-label">Entités obsolètes</div>
        </div>
      </div>

      {/* Liste des schémas */}
      <div class="schemas-section">
        <div class="section-header">
          <h2 class="section-title">Entités par Schéma</h2>
        </div>

        {loading.value ? (
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Chargement des entités...</p>
          </div>
        ) : entitiesSummary.value.length === 0 ? (
          <div class="empty-state">
            <div class="empty-icon">🗃️</div>
            <h3 class="empty-title">Aucune entité créée</h3>
            <p class="empty-description">
              Créez votre première entité basée sur un schéma JSON pour commencer.
            </p>
            <button
              class="btn btn-primary"
              onClick$={() => nav('/')}
            >
              Voir les schémas disponibles
            </button>
          </div>
        ) : (
          <div class="schemas-grid">
            {entitiesSummary.value.map((summary) => (
              <div key={summary.schemaName} class="schema-card">
                <div class="card-header">
                  <h3 class="card-title">{summary.schemaTitle || summary.schemaName}</h3>
                  <div class="card-badges">
                    <span class="badge version-badge">
                      v{summary.currentSchemaVersion}
                    </span>
                    {summary.outdatedEntities > 0 && (
                      <span class="badge warning-badge">
                        {summary.outdatedEntities} obsolètes
                      </span>
                    )}
                  </div>
                </div>

                <div class="card-content">
                  {summary.schemaDescription && (
                    <p class="card-description">
                      {summary.schemaDescription.length > 120 
                        ? `${summary.schemaDescription.substring(0, 120)}...`
                        : summary.schemaDescription
                      }
                    </p>
                  )}
                  
                  <div class="card-stats">
                    <div class="stat-item">
                      <span class="stat-value">{summary.totalEntities}</span>
                      <span class="stat-label">entités</span>
                    </div>
                    {Object.keys(summary.entitiesByVersion).length > 1 && (
                      <div class="stat-item">
                        <span class="stat-value">{Object.keys(summary.entitiesByVersion).length}</span>
                        <span class="stat-label">versions</span>
                      </div>
                    )}
                    {summary.outdatedEntities > 0 && (
                      <div class="stat-item warning">
                        <span class="stat-value">{summary.outdatedEntities}</span>
                        <span class="stat-label">à migrer</span>
                      </div>
                    )}
                  </div>

                  {Object.keys(summary.entitiesByVersion).length > 0 && (
                    <div class="versions-breakdown">
                      <div class="breakdown-header">Répartition par version:</div>
                      <div class="versions-list">
                        {Object.entries(summary.entitiesByVersion)
                          .sort(([a], [b]) => b.localeCompare(a))
                          .map(([version, count]) => (
                            <span 
                              key={version} 
                              class={`version-tag ${version === summary.currentSchemaVersion ? 'current' : 'old'}`}
                            >
                              v{version}: {count}
                            </span>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>

                <div class="card-actions">
                  <button
                    class="btn btn-primary btn-sm"
                    onClick$={() => handleSchemaClick(summary.schemaName)}
                    title="Voir toutes les entités"
                  >
                    📋 Voir entités ({summary.totalEntities})
                  </button>
                  
                  <button
                    class="btn btn-success btn-sm"
                    onClick$={() => handleCreateEntity(summary.schemaName)}
                    title="Créer une nouvelle entité"
                  >
                    ➕ Nouvelle entité
                  </button>
                  
                  {summary.canAutoMigrate && summary.outdatedEntities > 0 && (
                    <button
                      class="btn btn-warning btn-sm"
                      onClick$={() => handleMigrateSchema(summary.schemaName)}
                      title="Migrer les entités obsolètes"
                    >
                      🔄 Migrer ({summary.outdatedEntities})
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification */}
      {uiState.value.notification.show && (
        <div class={`notification ${uiState.value.notification.type}`}>
          {uiState.value.notification.message}
        </div>
      )}
    </div>
  );
});