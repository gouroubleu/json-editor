import { component$, useStore, useSignal, useStyles$, $ } from '@builder.io/qwik';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { getEntity } from '../../services';
import { loadSchemas } from '../../../services';
import type { EntityData } from '../../types';
import { HorizontalEntityViewer } from '../components/HorizontalEntityViewer';
import HORIZONTAL_STYLES from '../../../../components/HorizontalSchemaEditor.scss?inline';
import COLUMN_STYLES from '../../../../components/PropertyColumn.scss?inline';
import COMMON_STYLES from '../../../../components/CommonStyles.scss?inline';
import ENTITY_STYLES from '../components/EntityViewer.scss?inline';

export const useEntityData = routeLoader$(async (requestEvent) => {
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
  const entityData = useEntityData();
  
  const uiState = useStore({
    notification: { show: false, type: 'success', message: '' }
  });

  const showNotification = $((type: 'success' | 'error' | 'warning', message: string) => {
    uiState.notification = { show: true, type, message };
    
    setTimeout(() => {
      uiState.notification = { show: false, type: 'success', message: '' };
    }, 3000);
  });

  const handleEdit = $(() => {
    nav(`/bdd/${entityData.value.schemaName}/${entityData.value.entity.id}/edit/`);
  });

  const handleGoBack = $(() => {
    nav(`/bdd/${entityData.value.schemaName}/`);
  });

  const isOutdated = entityData.value.entity.version !== entityData.value.schemaVersion;

  return (
    <div class="entity-view-page">
      <HorizontalEntityViewer
        entity={entityData.value.entity}
        schema={entityData.value.schema}
        schemaName={entityData.value.schemaName}
        schemaTitle={entityData.value.schemaTitle}
        schemaVersion={entityData.value.schemaVersion}
        isOutdated={isOutdated}
        isReadOnly={true}
        onEdit$={handleEdit}
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