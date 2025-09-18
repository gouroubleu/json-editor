import { component$, useStore, useSignal, useStyles$, useVisibleTask$, $ } from '@builder.io/qwik';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { createEntity, generateDefaultValue } from '../../services';
import { loadSchemas } from '../../../services';
import type { CreateEntityRequest, EntityData } from '../../types';
import { HorizontalEntityViewer } from '../../components/HorizontalEntityViewer';
import HORIZONTAL_STYLES from '../../../../components/HorizontalSchemaEditor.scss?inline';
import COLUMN_STYLES from '../../../../components/PropertyColumn.scss?inline';
import COMMON_STYLES from '../../../../components/CommonStyles.scss?inline';
import ENTITY_STYLES from '../components/EntityViewer.scss?inline';

export const useNewEntityLoader = routeLoader$(async (requestEvent) => {
  const schemaName = requestEvent.params.schema;
  
  try {
    // Charger le schéma correspondant
    const schemas = await loadSchemas.call(requestEvent);
    const schema = schemas.find(s => s.name === schemaName);
    if (!schema) {
      throw requestEvent.error(404, 'Schéma introuvable');
    }
    
    // Créer une entité avec données par défaut pour la création (pas d'ID = nouveau)
    const defaultData = generateDefaultValue(schema.schema);
    const emptyEntity: EntityData = {
      id: '', // Pas d'ID = indique que c'est une nouvelle entité
      schemaName,
      version: schema.version || '1.0',
      data: defaultData || {},
      createdAt: '', // Pas de dates = nouvelle entité
      updatedAt: ''
    };
    
    return {
      entity: emptyEntity,
      schema: schema.schema,
      schemaName,
      schemaTitle: schema.schema.title || schemaName,
      schemaVersion: schema.version || '1.0'
    };
    
  } catch (error) {
    throw requestEvent.error(404, 'Schéma introuvable');
  }
});

export default component$(() => {
  useStyles$(HORIZONTAL_STYLES);
  useStyles$(COLUMN_STYLES);
  useStyles$(COMMON_STYLES);
  useStyles$(ENTITY_STYLES);
  
  const nav = useNavigate();
  const entityData = useNewEntityLoader();
  
  // État modifiable de l'entité (commence vide)
  const editableEntity = useStore<EntityData>({
    ...entityData.value.entity,
    data: { ...entityData.value.entity.data } // Clone profond des données
  });
  
  const uiState = useStore({
    notification: { show: false, type: 'success', message: '' },
    hasModifications: false,
    loading: false
  });

  const originalData = useSignal(JSON.stringify(entityData.value.entity.data));

  // Détecter les modifications
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => JSON.stringify(editableEntity.data));
    
    const currentData = JSON.stringify(editableEntity.data);
    uiState.hasModifications = currentData !== originalData.value;
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
      
      console.log('🐛 DEBUG - Données à sauvegarder:', {
        schemaName: entityData.value.schemaName,
        data: editableEntity.data,
        hasData: Object.keys(editableEntity.data).length > 0
      });
      
      const request: CreateEntityRequest = {
        schemaName: entityData.value.schemaName,
        data: editableEntity.data
      };
      
      const result = await createEntity(request);
      
      console.log('🐛 DEBUG - Résultat création:', result);
      
      if (result.success) {
        await showNotification('success', 'Entité créée avec succès');
        uiState.hasModifications = false;
        
        // Rediriger vers la liste des entités après création
        setTimeout(() => {
          nav(`/bdd/${entityData.value.schemaName}/`);
        }, 1500);
      } else {
        await showNotification('error', result.message);
      }
    } catch (error) {
      console.error('Erreur création:', error);
      await showNotification('error', 'Erreur lors de la création de l\'entité');
    } finally {
      uiState.loading = false;
    }
  });

  const handleCancel = $(() => {
    if (uiState.hasModifications) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment annuler ?');
      if (!confirmed) return;
    }
    
    nav(`/bdd/${entityData.value.schemaName}/`);
  });

  const handleGoBack = $(() => {
    if (uiState.hasModifications) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?');
      if (!confirmed) return;
    }
    
    nav(`/bdd/${entityData.value.schemaName}/`);
  });

  const handleDataChange = $((newData: Record<string, any>) => {
    console.log('🐛 DEBUG - handleDataChange parent appelé avec:', newData);
    console.log('🐛 DEBUG - editableEntity.data avant:', JSON.stringify(editableEntity.data));
    // CORRECTION: Mettre à jour les propriétés au lieu de remplacer l'objet
    Object.assign(editableEntity.data, newData);
    console.log('🐛 DEBUG - editableEntity.data après:', JSON.stringify(editableEntity.data));
  });

  return (
    <div class="entity-new-page">
      <HorizontalEntityViewer
        entity={editableEntity}
        schema={entityData.value.schema}
        schemaName={entityData.value.schemaName}
        schemaTitle={entityData.value.schemaTitle}
        schemaVersion={entityData.value.schemaVersion}
        isOutdated={false}
        isReadOnly={false}
        hasModifications={uiState.hasModifications}
        loading={uiState.loading}
        onDataChange$={handleDataChange}
        onSave$={handleSave}
        onCancel$={handleCancel}
        onGoBack$={handleGoBack}
        updateVersionOption={false}
        updateVersion={false}
        onUpdateVersionChange$={() => {}}
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