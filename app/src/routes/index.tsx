import { component$, useSignal, useStyles$, useTask$, $ } from '@builder.io/qwik';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { 
  handleLoadSchemas,
  handleCopyToClipboard,
  handleShowNotification
} from './handlers';
import { deleteSchema, loadSchemas } from './services';
import STYLES from './index.scss?inline';

// RouteLoader pour récupérer les schémas depuis les services
export const useInitialData = routeLoader$(async ({ sharedMap }) => {
  // Utiliser le service loadSchemas au lieu de lire directement le sharedMap
  const schemas = await loadSchemas.call({ sharedMap });
  return {
    savedSchemas: schemas.map(schema => ({
      id: schema.name,
      ...schema
    }))
  };
});

export default component$(() => {
  useStyles$(STYLES);
  
  const nav = useNavigate();
  const initialData = useInitialData();
  
  const savedSchemas = useSignal(initialData.value.savedSchemas);
  const uiState = useSignal({
    notification: { show: false, type: 'success', message: '' },
    loading: false
  });

  // Recharger les schémas périodiquement
  useTask$(async () => {
    const schemas = await handleLoadSchemas();
    savedSchemas.value = schemas.map(schema => ({
      id: schema.name,
      ...schema
    }));
  });

  const handleDelete = $(async (schemaId: string, schemaName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le schéma "${schemaName}" ? Cette action est irréversible.`)) {
      uiState.value.loading = true;
      
      try {
        const result = await deleteSchema(schemaId);
        
        if (result.success) {
          // Recharger la liste
          const schemas = await handleLoadSchemas();
          savedSchemas.value = schemas.map(schema => ({
            id: schema.name,
            ...schema
          }));
          
          await handleShowNotification('success', result.message, uiState.value);
        } else {
          await handleShowNotification('error', result.message, uiState.value);
        }
      } catch (error) {
        await handleShowNotification('error', 'Erreur lors de la suppression', uiState.value);
      } finally {
        uiState.value.loading = false;
      }
    }
  });

  const handleCopySchema = $(async (schema: any) => {
    const schemaJson = JSON.stringify(schema.schema, null, 2);
    const result = await handleCopyToClipboard(schemaJson);
    await handleShowNotification(result.success ? 'success' : 'error', result.message, uiState.value);
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

      {/* Statistiques */}
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-number">{savedSchemas.value.length}</div>
          <div class="stat-label">Schémas créés</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">
            {savedSchemas.value.filter(s => 
              new Date(s.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
            ).length}
          </div>
          <div class="stat-label">Modifiés aujourd'hui</div>
        </div>
      </div>

      {/* Liste des schémas */}
      <div class="schemas-section">
        <div class="section-header">
          <h2 class="section-title">Vos Schémas</h2>
          <div class="section-actions">
            <button
              class="btn btn-secondary"
              onClick$={async () => {
                uiState.value.loading = true;
                const schemas = await handleLoadSchemas();
                savedSchemas.value = schemas.map(schema => ({
                  id: schema.name,
                  ...schema
                }));
                uiState.value.loading = false;
                await handleShowNotification('success', 'Liste rafraîchie', uiState.value);
              }}
              disabled={uiState.value.loading}
            >
              🔄 Actualiser
            </button>
          </div>
        </div>

        {savedSchemas.value.length === 0 ? (
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
            {savedSchemas.value.map((schema) => (
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
                        {schema.versionInfo?.changeDescription && (
                          <span class="version-info" title={schema.versionInfo.changeDescription}>
                            ({schema.versionInfo.changeType})
                          </span>
                        )}
                      </span>
                    </div>
                    <div class="metadata-item">
                      <span class="metadata-label">Créé:</span>
                      <span class="metadata-value">
                        {new Date(schema.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div class="metadata-item">
                      <span class="metadata-label">Modifié:</span>
                      <span class="metadata-value">
                        {new Date(schema.updatedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  {schema.schema.properties && (
                    <div class="properties-preview">
                      <div class="properties-header">Propriétés:</div>
                      <div class="properties-list">
                        {Object.entries(schema.schema.properties)
                          .slice(0, 3)
                          .map(([propName, propDef]) => {
                            const prop = propDef as any;
                            return (
                              <span key={propName} class="property-tag">
                                {propName} ({prop.type})
                              </span>
                            );
                          })
                        }
                        {Object.keys(schema.schema.properties).length > 3 && (
                          <span class="property-tag more">
                            +{Object.keys(schema.schema.properties).length - 3} autres
                          </span>
                        )}
                      </div>
                    </div>
                  )}
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
                    onClick$={$(() => handleCopySchema(schema))}
                    title="Copier le JSON Schema"
                  >
                    📋 Copier
                  </button>
                  
                  <button
                    class="btn btn-danger btn-sm"
                    onClick$={$(() => handleDelete(schema.id, schema.name))}
                    title="Supprimer le schéma"
                    disabled={uiState.value.loading}
                  >
                    🗑️ Supprimer
                  </button>
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