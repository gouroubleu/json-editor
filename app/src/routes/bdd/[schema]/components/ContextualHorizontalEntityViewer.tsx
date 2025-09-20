import { component$, $ } from '@builder.io/qwik';
import { useEntityCreation } from '../../context/entity-creation-context';
import { ContextualEntityColumn } from './ContextualEntityColumn';
import type { PropFunction } from '@builder.io/qwik';

type ContextualHorizontalEntityViewerProps = {
  isReadOnly: boolean;
  onSave$?: PropFunction<() => Promise<void>>;
  onCancel$?: PropFunction<() => void>;
  onGoBack$: PropFunction<() => void>;
  onEdit$?: PropFunction<() => void>;
};

export const ContextualHorizontalEntityViewer = component$<ContextualHorizontalEntityViewerProps>((props) => {
  const { store, actions } = useEntityCreation();

  const getEntityDisplayName = () => {
    const data = store.state.entity.data;
    // Pour les nouvelles entités sans ID
    if (!store.state.entity.id) {
      return data.title || data.name || data.libelle || 'Nouvelle entité';
    }
    return data.title || data.name || data.libelle || `Entité ${store.state.entity.id.slice(-6)}`;
  };

  const isNewEntity = !store.state.entity.id || store.state.entity.id === '';

  const handleBreadcrumbClick = $((pathIndex: number) => {
    actions.goBack(pathIndex + 1);
  });

  return (
    <div
      class="horizontal-entity-viewer"
      style="height: calc(100vh - 50px);"
    >
      {/* Panneau fixe à gauche */}
      <div
        class="fixed-left-panel"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '400px',
          height: '100%',
          overflow: 'auto',
          borderRight: '1px solid #e9ecef',
          backgroundColor: '#fff',
          zIndex: 10
        }}
      >
        {/* Navigation retour */}
        <div class="back-button-section" style="padding: 1rem; border-bottom: 1px solid #e9ecef;">
          <button
            class="btn btn-secondary w-100"
            onClick$={props.onGoBack$}
          >
            ← Retour à la liste
          </button>
        </div>

        {/* Informations de l'entité */}
        <div class="entity-info-section">
          <h2 class="section-title">
            {isNewEntity ? 'Création d\'une nouvelle entité' : (props.isReadOnly ? 'Détails de l\'entité' : 'Édition de l\'entité')}
          </h2>

          <div class="info-group">
            <label class="info-label">Nom affiché</label>
            <div class="info-value">{getEntityDisplayName()}</div>
          </div>

          {!isNewEntity && (
            <div class="info-group">
              <label class="info-label">ID</label>
              <div class="info-value font-mono">{store.state.entity.id}</div>
            </div>
          )}

          <div class="info-group">
            <label class="info-label">Schéma</label>
            <div class="info-value">{store.state.schemaTitle} ({store.state.schemaName})</div>
          </div>

          <div class="info-group">
            <label class="info-label">Version</label>
            <div class="info-value">
              <span class="version-badge current">
                v{store.state.entity.version || store.state.schemaVersion}
              </span>
            </div>
          </div>

          {!isNewEntity && (
            <>
              <div class="info-group">
                <label class="info-label">Créé le</label>
                <div class="info-value">{new Date(store.state.entity.createdAt).toLocaleString('fr-FR')}</div>
              </div>

              <div class="info-group">
                <label class="info-label">Modifié le</label>
                <div class="info-value">{new Date(store.state.entity.updatedAt).toLocaleString('fr-FR')}</div>
              </div>
            </>
          )}
        </div>

        {/* Indicateur de modifications */}
        <div class="modification-status-section" style="padding: 1rem; border-bottom: 1px solid #e9ecef;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <div style={`width: 8px; height: 8px; border-radius: 50%; background: ${store.state.modifications.hasChanges ? '#ffc107' : '#28a745'};`}></div>
            <span style="font-weight: 500; font-size: 0.9rem;">
              {isNewEntity ?
                (store.state.modifications.hasChanges ? '✏️ Données saisies' : '📝 Prêt pour la création') :
                (store.state.modifications.hasChanges ? '⚠️ Modifications non sauvegardées' : '✅ Tous les changements sauvegardés')
              }
            </span>
          </div>
        </div>

        {/* Actions principales */}
        <div class="main-actions-section" style="padding: 1rem;">
          <div class="actions" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <button
              class="btn btn-info"
              onClick$={() => actions.toggleJsonPreview()}
              style="width: 100%; padding: 0.75rem;"
            >
              {store.ui.showJsonPreview ? '👁️ Masquer JSON' : '👁️ Voir JSON'}
            </button>

            {props.isReadOnly && props.onEdit$ ? (
              <button
                class="btn btn-primary"
                onClick$={props.onEdit$}
                style="width: 100%; padding: 0.75rem;"
              >
                ✏️ Modifier
              </button>
            ) : (
              <>
                <button
                  class="btn btn-secondary"
                  onClick$={props.onCancel$}
                  disabled={store.ui.loading || store.ui.saving}
                  style="width: 100%; padding: 0.75rem;"
                >
                  ❌ Annuler
                </button>

                <button
                  class={`btn ${isNewEntity ? 'btn-primary' : (store.state.modifications.hasChanges ? 'btn-warning' : 'btn-success')}`}
                  onClick$={props.onSave$}
                  disabled={store.ui.loading || store.ui.saving}
                  style="width: 100%; padding: 0.75rem;"
                >
                  {store.ui.saving ? (isNewEntity ? '⏳ Création...' : '⏳ Sauvegarde...') :
                   isNewEntity ? '✨ Créer l\'entité' :
                   store.state.modifications.hasChanges ? '⚠️ Sauvegarder les modifications' : '💾 Sauvegarder'}
                </button>
              </>
            )}

            {!props.isReadOnly && (
              <button
                class="btn btn-outline btn-sm"
                onClick$={() => actions.resetToDefaults()}
                style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;"
                title="Réinitialiser aux valeurs par défaut"
              >
                🔄 Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Aperçu JSON conditionnel */}
      {store.ui.showJsonPreview && (
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; max-width: 800px; background: white; border: 2px solid #007bff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 9999;">
          <div class="json-preview-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="margin: 0; color: #007bff; font-size: 1.5rem;">📋 Données JSON</h3>
              <button
                onClick$={() => actions.toggleJsonPreview()}
                style="background: #dc3545; color: white; border: none; border-radius: 50%; padding: 0.75rem; cursor: pointer; font-weight: bold; font-size: 1.2rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"
                title="Fermer l'aperçu"
              >
                ✕
              </button>
            </div>

            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 1rem;">
              <pre style="margin: 0; overflow-x: auto; white-space: pre-wrap; max-height: 500px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 0.9rem; line-height: 1.4;">
                {actions.exportEntityJson()}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Overlay pour l'aperçu JSON */}
      {store.ui.showJsonPreview && (
        <div
          style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9998;"
          onClick$={() => actions.toggleJsonPreview()}
        ></div>
      )}

      {/* Colonnes dynamiques scrollables */}
      <div
        class="columns-container"
        style={{
          marginLeft: '400px'
        }}
      >
        <div
          class="columns-scroll"
          style={{
            // width: `${store.state.columns.length * 350}px`,
            minWidth: '100%',
            display: 'flex',
            height: '100%'
          }}
        >
          {store.state.columns.map((column, columnIndex) => {
            console.log('🔧 RENDER COLUMN:', { columnIndex, pathJoin: column.path.join('-'), totalColumns: store.state.columns.length });
            return (
              <ContextualEntityColumn
                key={`column-${columnIndex}-${column.path.join('-')}`}
                columnIndex={columnIndex}
                isReadOnly={props.isReadOnly}
              />
            );
          })}
        </div>
      </div>

      {/* Breadcrumb navigation */}
      <div
        class="breadcrumb-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '400px',
          right: 0,
          backgroundColor: '#fff',
          borderTop: '1px solid #e9ecef',
          padding: '0.5rem 1rem',
          zIndex: 100,
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <button
          class={`breadcrumb-item ${store.state.navigation.selectedPath.length === 0 ? 'active' : ''}`}
          onClick$={() => actions.goBack(0)}
        >
          🏠 {store.state.schemaTitle}
        </button>

        {store.state.navigation.selectedPath.map((pathItem, index) => {
          const isArrayIndex = !isNaN(parseInt(pathItem));
          const displayName = isArrayIndex ? `[${pathItem}]` : pathItem;

          return (
            <button
              key={`${pathItem}-${index}`}
              class={`breadcrumb-item ${index === store.state.navigation.selectedPath.length - 1 ? 'active' : ''}`}
              onClick$={() => handleBreadcrumbClick(index)}
            >
              → {displayName}
            </button>
          );
        })}
      </div>

      {/* Notification */}
      {store.ui.notification.show && (
        <div class={`notification ${store.ui.notification.type}`}>
          {store.ui.notification.message}
          <button onClick$={() => actions.hideNotification()}>✕</button>
        </div>
      )}
    </div>
  );
});