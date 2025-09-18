import { component$, useStore, useSignal, useStyles$, useVisibleTask$, $ } from '@builder.io/qwik';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { getEntity, updateEntity } from '../../../services';
import { loadSchemas } from '../../../../services';
import type { EntityData, UpdateEntityRequest } from '../../../types';
import { HorizontalEntityViewer } from '../../components/HorizontalEntityViewer';
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

export default component$(() => {
  useStyles$(HORIZONTAL_STYLES);
  useStyles$(COLUMN_STYLES);
  useStyles$(COMMON_STYLES);
  useStyles$(ENTITY_STYLES);
  
  const nav = useNavigate();
  const entityData = useEntityEditData();
  
  // État modifiable de l'entité
  const editableEntity = useStore<EntityData>({
    ...entityData.value.entity,
    data: { ...entityData.value.entity.data } // Clone profond des données
  });
  
  const uiState = useStore({
    notification: { show: false, type: 'success', message: '' },
    hasModifications: false,
    loading: false,
    updateVersion: false // Option pour migrer vers la nouvelle version
  });

  const originalData = useSignal(JSON.stringify(entityData.value.entity.data));

  // Détecter les modifications
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => JSON.stringify(editableEntity.data));
    
    const currentData = JSON.stringify(editableEntity.data);
    uiState.hasModifications = currentData !== originalData.value;
  });

  // Protection avant fermeture si modifications
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (uiState.hasModifications) {
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
      uiState.loading = true;
      
      console.log('🐛 DEBUG - Données à modifier:', {
        entityId: editableEntity.id,
        data: editableEntity.data,
        updateVersion: uiState.updateVersion,
        hasData: Object.keys(editableEntity.data).length > 0
      });
      
      const request: UpdateEntityRequest = {
        data: editableEntity.data,
        updateVersion: uiState.updateVersion
      };
      
      const result = await updateEntity(editableEntity.id, request);
      
      console.log('🐛 DEBUG - Résultat modification:', result);
      
      if (result.success) {
        await showNotification('success', result.message);
        uiState.hasModifications = false;
        originalData.value = JSON.stringify(editableEntity.data);
        
        // Rediriger vers la page de visualisation après sauvegarde
        setTimeout(() => {
          nav(`/bdd/${entityData.value.schemaName}/${editableEntity.id}/`);
        }, 1500);
      } else {
        await showNotification('error', result.message);
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      await showNotification('error', 'Erreur lors de la sauvegarde');
    } finally {
      uiState.loading = false;
    }
  });

  const handleCancel = $(() => {
    if (uiState.hasModifications) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment annuler ?');
      if (!confirmed) return;
    }
    
    nav(`/bdd/${entityData.value.schemaName}/${editableEntity.id}/`);
  });

  const handleGoBack = $(() => {
    if (uiState.hasModifications) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?');
      if (!confirmed) return;
    }
    
    nav(`/bdd/${entityData.value.schemaName}/`);
  });

  const handleDataChange = $((newData: Record<string, any>) => {
    console.log('🐛 DEBUG - handleDataChange appelé avec:', newData);
    editableEntity.data = { ...newData };
    console.log('🐛 DEBUG - editableEntity.data mis à jour:', editableEntity.data);
  });

  const isOutdated = editableEntity.version !== entityData.value.schemaVersion;

  return (
    <div class="entity-edit-page">
      <HorizontalEntityViewer
        entity={editableEntity}
        schema={entityData.value.schema}
        schemaName={entityData.value.schemaName}
        schemaTitle={entityData.value.schemaTitle}
        schemaVersion={entityData.value.schemaVersion}
        isOutdated={isOutdated}
        isReadOnly={false}
        hasModifications={uiState.hasModifications}
        loading={uiState.loading}
        onDataChange$={handleDataChange}
        onSave$={handleSave}
        onCancel$={handleCancel}
        onGoBack$={handleGoBack}
        updateVersionOption={isOutdated}
        updateVersion={uiState.updateVersion}
        onUpdateVersionChange$={(value: boolean) => { uiState.updateVersion = value; }}
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