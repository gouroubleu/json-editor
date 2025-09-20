import { component$, useStore, useSignal, useStyles$, useVisibleTask$, $ } from '@builder.io/qwik';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { getEntity, updateEntity } from '../../../services';
import { loadSchemas } from '../../../../services';
import type { EntityData, UpdateEntityRequest } from '../../../types';
import { EntityCreationProvider, useEntityCreation } from '../../../context/entity-creation-context';
import { ContextualHorizontalEntityViewer } from '../../components/ContextualHorizontalEntityViewer';
import HORIZONTAL_STYLES from '../../../../../components/HorizontalSchemaEditor.scss?inline';
import COLUMN_STYLES from '../../../../../components/PropertyColumn.scss?inline';
import COMMON_STYLES from '../../../../../components/CommonStyles.scss?inline';
import ENTITY_STYLES from '../../components/EntityViewer.scss?inline';

export const useEntityEditData = routeLoader$(async (requestEvent) => {
  const { schema: schemaName, entityId } = requestEvent.params;
  
  try {
    // Charger l'entité
    const entity = await getEntity.call(requestEvent, entityId);
    if (!entity) {
      throw requestEvent.error(404, 'Entité introuvable');
    }
    
    // Charger le schéma correspondant
    const schemas = await loadSchemas.call(requestEvent);
    const schema = schemas.find(s => s.name === schemaName);
    if (!schema) {
      throw requestEvent.error(404, 'Schéma introuvable');
    }
    
    return {
      entity,
      schema: schema.schema,
      schemaName,
      schemaTitle: schema.schema.title || schemaName,
      schemaVersion: schema.version || '1.0'
    };
    
  } catch (error) {
    throw requestEvent.error(404, 'Entité ou schéma introuvable');
  }
});

// Composant intérieur qui utilise le contexte
const EditEntityPageContent = component$(() => {
  const nav = useNavigate();
  const entityData = useEntityEditData();
  const { store, actions } = useEntityCreation();

  const uiState = useStore({
    notification: { show: false, type: 'success', message: '' },
    loading: false,
    updateVersion: false // Option pour migrer vers la nouvelle version
  });

  const originalData = useSignal(JSON.stringify(entityData.value.entity.data));

  // Protection avant fermeture si modifications
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (store.state.modifications.hasChanges) {
        const message = 'Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);
    return () => window.removeEventListener('beforeunload', beforeUnloadHandler);
  });

  const showNotification = $((type: 'success' | 'error' | 'warning', message: string) => {
    uiState.notification = { show: true, type, message };

    setTimeout(() => {
      uiState.notification = { show: false, type: 'success', message: '' };
    }, 3000);
  });

  const handleSave = $(async () => {
    try {
      actions.setSaving(true);
      uiState.loading = true;

      console.log('🐛 DEBUG - Données à modifier:', {
        entityId: entityData.value.entity.id,
        data: store.state.entity.data,
        updateVersion: uiState.updateVersion,
        hasData: Object.keys(store.state.entity.data).length > 0
      });

      const request: UpdateEntityRequest = {
        data: store.state.entity.data,
        updateVersion: uiState.updateVersion
      };

      const result = await updateEntity(entityData.value.entity.id, request);

      console.log('🐛 DEBUG - Résultat modification:', result);

      if (result.success) {
        await showNotification('success', result.message);
        store.state.modifications.hasChanges = false;
        originalData.value = JSON.stringify(store.state.entity.data);

        // Rediriger vers la page de visualisation après sauvegarde
        setTimeout(() => {
          nav(`/bdd/${entityData.value.schemaName}/${entityData.value.entity.id}/`);
        }, 1500);
      } else {
        await showNotification('error', result.message);
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      await showNotification('error', 'Erreur lors de la sauvegarde');
    } finally {
      actions.setSaving(false);
      uiState.loading = false;
    }
  });

  const handleCancel = $(() => {
    if (store.state.modifications.hasChanges) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment annuler ?');
      if (!confirmed) return;
    }

    nav(`/bdd/${entityData.value.schemaName}/${entityData.value.entity.id}/`);
  });

  const handleGoBack = $(() => {
    if (store.state.modifications.hasChanges) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?');
      if (!confirmed) return;
    }

    nav(`/bdd/${entityData.value.schemaName}/`);
  });

  const isOutdated = entityData.value.entity.version !== entityData.value.schemaVersion;

  return (
    <div class="entity-edit-page">
      <ContextualHorizontalEntityViewer
        isReadOnly={false}
        onSave$={handleSave}
        onCancel$={handleCancel}
        onGoBack$={handleGoBack}
      />

      {/* Notification */}
      {uiState.notification.show && (
        <div class={`notification ${uiState.notification.type}`}>
          {uiState.notification.message}
        </div>
      )}
    </div>
  );
});

export default component$(() => {
  useStyles$(HORIZONTAL_STYLES);
  useStyles$(COLUMN_STYLES);
  useStyles$(COMMON_STYLES);
  useStyles$(ENTITY_STYLES);

  const entityData = useEntityEditData();

  return (
    <EntityCreationProvider
      entity={entityData.value.entity}
      schema={entityData.value.schema}
      schemaName={entityData.value.schemaName}
      schemaTitle={entityData.value.schemaTitle}
      schemaVersion={entityData.value.schemaVersion}
    >
      <EditEntityPageContent />
    </EntityCreationProvider>
  );
});