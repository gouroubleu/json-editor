import { component$, useSignal, useStyles$, useTask$, $ } from '@builder.io/qwik';
import { useNavigate, routeLoader$ } from '@builder.io/qwik-city';
import { listEntities, deleteEntity } from '../services';
import { loadSchemas } from '../../services';
import type { EntityData, EntityFilters } from '../types';
import STYLES from './index.scss?inline';

export const useSchemaEntitiesLoader = routeLoader$(async (requestEvent) => {
  const schemaName = requestEvent.params.schema;
  
  // Vérifier que le schéma existe
  const schemas = await loadSchemas.call(requestEvent);
  const schema = schemas.find(s => s.name === schemaName);
  
  if (!schema) {
    throw requestEvent.error(404, 'Schéma introuvable');
  }
  
  return {
    schemaName,
    schema: schema.schema,
    schemaVersion: schema.version || '1.0',
    schemaTitle: schema.schema.title || schemaName
  };
});

export default component$(() => {
  useStyles$(STYLES);
  
  const nav = useNavigate();
  const schemaData = useSchemaEntitiesLoader();
  
  const entities = useSignal<EntityData[]>([]);
  const loading = useSignal(true);
  const filters = useSignal<EntityFilters>({
    schemaName: schemaData.value.schemaName,
    limit: 20,
    offset: 0
  });
  const totalCount = useSignal(0);
  const hasMore = useSignal(false);
  
  const uiState = useSignal({
    notification: { show: false, type: 'success', message: '' },
    deleteConfirm: { show: false, entityId: '', entityName: '' }
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

  const loadEntities = $(async (resetOffset = false) => {
    try {
      loading.value = true;
      
      if (resetOffset) {
        filters.value.offset = 0;
      }
      
      const result = await listEntities(filters.value);
      
      if (resetOffset) {
        entities.value = result.entities;
      } else {
        entities.value = [...entities.value, ...result.entities];
      }
      
      totalCount.value = result.totalCount;
      hasMore.value = result.hasMore;
      
    } catch (error) {
      console.error('Erreur chargement entités:', error);
      await showNotification('error', 'Erreur lors du chargement des entités');
    } finally {
      loading.value = false;
    }
  });

  // Charger les entités au démarrage
  useTask$(async () => {
    await loadEntities(true);
  });

  const handleSearch = $(async (searchTerm: string) => {
    filters.value = {
      ...filters.value,
      search: searchTerm || undefined,
      offset: 0
    };
    await loadEntities(true);
  });

  const handleVersionFilter = $(async (version: string) => {
    filters.value = {
      ...filters.value,
      version: version === 'all' ? undefined : version,
      offset: 0
    };
    await loadEntities(true);
  });

  const handleLoadMore = $(async () => {
    if (hasMore.value && !loading.value) {
      filters.value.offset = (filters.value.offset || 0) + (filters.value.limit || 20);
      await loadEntities(false);
    }
  });

  const handleDeleteRequest = $((entityId: string, entityData: Record<string, any>) => {
    const entityName = entityData.title || entityData.name || entityData.libelle || entityId;
    uiState.value = {
      ...uiState.value,
      deleteConfirm: { show: true, entityId, entityName: String(entityName) }
    };
  });

  const confirmDelete = $(async () => {
    const { entityId } = uiState.value.deleteConfirm;
    
    try {
      const result = await deleteEntity(entityId);
      
      if (result.success) {
        entities.value = entities.value.filter(e => e.id !== entityId);
        totalCount.value = Math.max(0, totalCount.value - 1);
        await showNotification('success', 'Entité supprimée avec succès');
      } else {
        await showNotification('error', result.message);
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      await showNotification('error', 'Erreur lors de la suppression');
    }
    
    uiState.value = {
      ...uiState.value,
      deleteConfirm: { show: false, entityId: '', entityName: '' }
    };
  });

  const cancelDelete = $(() => {
    uiState.value = {
      ...uiState.value,
      deleteConfirm: { show: false, entityId: '', entityName: '' }
    };
  });

  // Extraire les versions disponibles des entités
  const availableVersions = entities.value.reduce((versions: string[], entity) => {
    if (!versions.includes(entity.version)) {
      versions.push(entity.version);
    }
    return versions;
  }, []).sort((a, b) => b.localeCompare(a));

  return (
    <div class="schema-entities-page">
      {/* Header */}
      <div class="page-header">
        <div class="header-content">
          <div class="breadcrumb">
            <button class="breadcrumb-link" onClick$={() => nav('/bo/schemaEditor/bdd/')}>
              ← Base de Données
            </button>
          </div>
          <h1 class="page-title">{schemaData.value.schemaTitle}</h1>
          <div class="page-meta">
            <span class="version-badge">v{schemaData.value.schemaVersion}</span>
            <span class="entity-count">{totalCount.value} entité{totalCount.value > 1 ? 's' : ''}</span>
          </div>
        </div>
        
        <div class="header-actions">
          <button
            class="btn btn-primary"
            onClick$={() => nav(`/bo/schemaEditor/bdd/${schemaData.value.schemaName}/new/`)}
          >
            ➕ Nouvelle entité
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div class="filters-section">
        <div class="search-filter">
          <input
            type="text"
            placeholder="Rechercher dans les entités..."
            class="search-input"
            onInput$={(e) => {
              const target = e.target as HTMLInputElement;
              handleSearch(target.value);
            }}
          />
        </div>
        
        {availableVersions.length > 1 && (
          <div class="version-filter">
            <select
              class="version-select"
              onChange$={(e) => {
                const target = e.target as HTMLSelectElement;
                handleVersionFilter(target.value);
              }}
            >
              <option value="all">Toutes les versions</option>
              {availableVersions.map(version => (
                <option key={version} value={version}>
                  Version {version}
                  {version !== schemaData.value.schemaVersion && ' (obsolète)'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Liste des entités */}
      <div class="entities-section">
        {loading.value && entities.value.length === 0 ? (
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Chargement des entités...</p>
          </div>
        ) : entities.value.length === 0 ? (
          <div class="empty-state">
            <div class="empty-icon">📄</div>
            <h3 class="empty-title">Aucune entité trouvée</h3>
            <p class="empty-description">
              {filters.value.search || filters.value.version 
                ? 'Aucune entité ne correspond aux critères de recherche.'
                : 'Créez votre première entité basée sur ce schéma pour commencer.'
              }
            </p>
            {!filters.value.search && !filters.value.version && (
              <button
                class="btn btn-primary"
                onClick$={() => nav(`/bo/schemaEditor/bdd/${schemaData.value.schemaName}/new/`)}
              >
                Créer une entité
              </button>
            )}
          </div>
        ) : (
          <div class="entities-list">
            {entities.value.map((entity) => {
              const isOutdated = entity.version !== schemaData.value.schemaVersion;
              const entityDisplayName = entity.data.title || entity.data.name || entity.data.libelle || `Entité ${entity.id.slice(-6)}`;
              
              return (
                <div key={entity.id} class={`entity-card ${isOutdated ? 'outdated' : ''}`}>
                  <div class="entity-header">
                    <h3 class="entity-title">{String(entityDisplayName)}</h3>
                    <div class="entity-badges">
                      <span class={`version-badge ${isOutdated ? 'outdated' : 'current'}`}>
                        v{entity.version}
                      </span>
                      {isOutdated && (
                        <span class="outdated-badge">Obsolète</span>
                      )}
                    </div>
                  </div>
                  
                  <div class="entity-content">
                    <div class="entity-meta">
                      <span class="meta-item">
                        📅 Créé le {new Date(entity.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                      {entity.updatedAt !== entity.createdAt && (
                        <span class="meta-item">
                          ✏️ Modifié le {new Date(entity.updatedAt).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    
                    {/* Aperçu des données principales */}
                    <div class="entity-preview">
                      {Object.entries(entity.data)
                        .filter(([key]) => !['id', 'createdAt', 'updatedAt'].includes(key))
                        .slice(0, 3)
                        .map(([key, value]) => (
                          <div key={key} class="preview-item">
                            <span class="preview-key">{key}:</span>
                            <span class="preview-value">
                              {typeof value === 'string' 
                                ? (value.length > 50 ? `${value.substring(0, 50)}...` : value)
                                : JSON.stringify(value)
                              }
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                  
                  <div class="entity-actions">
                    <button
                      class="btn btn-secondary btn-sm"
                      onClick$={() => nav(`/bo/schemaEditor/bdd/${schemaData.value.schemaName}/${entity.id}/`)}
                      title="Voir les détails avec interface colonnes"
                    >
                      👁️ Voir
                    </button>
                    
                    <button
                      class="btn btn-primary btn-sm"
                      onClick$={() => nav(`/bo/schemaEditor/bdd/${schemaData.value.schemaName}/${entity.id}/edit/`)}
                      title="Modifier avec interface colonnes"
                    >
                      ✏️ Modifier
                    </button>
                    
                    {isOutdated && (
                      <button
                        class="btn btn-warning btn-sm"
                        title="Migrer vers la dernière version"
                      >
                        🔄 Migrer
                      </button>
                    )}
                    
                    <button
                      class="btn btn-danger btn-sm"
                      onClick$={() => handleDeleteRequest(entity.id, entity.data)}
                      title="Supprimer l'entité"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Bouton "Charger plus" */}
            {hasMore.value && (
              <div class="load-more-section">
                <button
                  class="btn btn-secondary"
                  onClick$={handleLoadMore}
                  disabled={loading.value}
                >
                  {loading.value ? 'Chargement...' : `Charger plus d'entités (${totalCount.value - entities.value.length} restantes)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {uiState.value.deleteConfirm.show && (
        <div class="modal-overlay" onClick$={cancelDelete}>
          <div class="modal-content" onClick$={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h3 class="modal-title">Confirmer la suppression</h3>
            </div>
            
            <div class="modal-body">
              <p>
                Êtes-vous sûr de vouloir supprimer l'entité <strong>{uiState.value.deleteConfirm.entityName}</strong> ?
              </p>
              <p class="warning-text">
                Cette action est irréversible.
              </p>
            </div>
            
            <div class="modal-actions">
              <button class="btn btn-secondary" onClick$={cancelDelete}>
                Annuler
              </button>
              <button class="btn btn-danger" onClick$={confirmDelete}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {uiState.value.notification.show && (
        <div class={`notification ${uiState.value.notification.type}`}>
          {uiState.value.notification.message}
        </div>
      )}
    </div>
  );
});