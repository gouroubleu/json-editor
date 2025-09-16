import { component$, useStyles$, $ } from '@builder.io/qwik';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { updateEntity, loadEntity } from '../../services';
import { loadSchemas } from '../../../services';
import type { UpdateEntityRequest } from '../../types';
import { EntityCreationProvider, useEntityCreation } from '../../context/entity-creation-context';
import { ContextualHorizontalEntityViewer } from '../components/ContextualHorizontalEntityViewer';
import HORIZONTAL_STYLES from '../../../components/HorizontalSchemaEditor.scss?inline';
import COLUMN_STYLES from '../../../components/PropertyColumn.scss?inline';
import COMMON_STYLES from '../../../components/CommonStyles.scss?inline';
import ENTITY_STYLES from '../components/EntityViewer.scss?inline';

export const useEditEntityLoader = routeLoader$(async (requestEvent) => {
  const schemaName = requestEvent.params.schema;
  const entityId = requestEvent.params.id;

  try {
    // Charger le schéma correspondant
    const schemas = await loadSchemas.call(requestEvent);
    const schema = schemas.find(s => s.name === schemaName);
    if (!schema) {
      throw requestEvent.error(404, 'Schéma introuvable');
    }

    // Charger l'entité à éditer
    const entity = await loadEntity(schemaName, entityId);
    if (!entity) {
      throw requestEvent.error(404, 'Entité introuvable');
    }

    // Vérifier si l'entité est obsolète
    const isOutdated = entity.version !== schema.version;

    return {
      entity,
      schema: schema.schema,
      schemaName,
      schemaTitle: schema.schema.title || schemaName,
      schemaVersion: schema.version || '1.0',
      isOutdated
    };

  } catch (error) {
    throw requestEvent.error(404, 'Entité ou schéma introuvable');
  }
});

// Composant intérieur qui utilise le contexte
const EditEntityPageContent = component$<{ isOutdated: boolean }>((props) => {
  const nav = useNavigate();
  const { store, actions } = useEntityCreation();

  const handleSave = $(async () => {
    try {
      actions.setSaving(true);

      console.log('🐛 DEBUG - Données à sauvegarder:', {
        entityId: store.state.entity.id,
        schemaName: store.state.schemaName,
        data: store.state.entity.data,
        hasChanges: store.state.modifications.hasChanges
      });

      const request: UpdateEntityRequest = {
        data: store.state.entity.data,
        updateVersion: props.isOutdated // Mettre à jour la version si obsolète
      };

      const result = await updateEntity(store.state.entity.id, request);

      console.log('🐛 DEBUG - Résultat mise à jour:', result);

      if (result.success) {
        actions.showNotification('Entité mise à jour avec succès', 'success');

        // Marquer comme sauvegardé
        store.state.modifications.hasChanges = false;
        store.state.modifications.originalData = JSON.stringify(store.state.entity.data);

        // Rediriger vers la liste des entités après sauvegarde
        setTimeout(() => {
          nav(`/bo/schemaEditor/bdd/${store.state.schemaName}/`);
        }, 1500);
      } else {
        actions.showNotification(result.message, 'error');
      }
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      actions.showNotification('Erreur lors de la mise à jour de l\'entité', 'error');
    } finally {
      actions.setSaving(false);
    }
  });

  const handleCancel = $(() => {
    if (store.state.modifications.hasChanges) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment annuler ?');
      if (!confirmed) return;
    }

    nav(`/bo/schemaEditor/bdd/${store.state.schemaName}/${store.state.entity.id}`);
  });

  const handleGoBack = $(() => {
    if (store.state.modifications.hasChanges) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?');
      if (!confirmed) return;
    }

    nav(`/bo/schemaEditor/bdd/${store.state.schemaName}/`);
  });

  return (
    <div class="entity-edit-page">
      {props.isOutdated && (
        <div class="version-warning" style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
          ⚠️ Cette entité utilise une version obsolète du schéma. Les modifications seront automatiquement migrées vers la version actuelle lors de la sauvegarde.
        </div>
      )}

      <ContextualHorizontalEntityViewer
        isReadOnly={false}
        onSave$={handleSave}
        onCancel$={handleCancel}
        onGoBack$={handleGoBack}
      />
    </div>
  );
});

export default component$(() => {
  useStyles$(HORIZONTAL_STYLES);
  useStyles$(COLUMN_STYLES);
  useStyles$(COMMON_STYLES);
  useStyles$(ENTITY_STYLES);

  const entityData = useEditEntityLoader();

  return (
    <EntityCreationProvider
      entity={entityData.value.entity}
      schema={entityData.value.schema}
      schemaName={entityData.value.schemaName}
      schemaTitle={entityData.value.schemaTitle}
      schemaVersion={entityData.value.schemaVersion}
    >
      <EditEntityPageContent isOutdated={entityData.value.isOutdated} />
    </EntityCreationProvider>
  );
});