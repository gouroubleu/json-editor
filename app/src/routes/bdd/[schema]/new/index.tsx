import { component$, useStyles$, $ } from '@builder.io/qwik';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { createEntity, generateDefaultValue } from '../../services';
import { loadSchemas } from '../../../services';
import type { CreateEntityRequest, EntityData } from '../../types';
import { EntityCreationProvider, useEntityCreation } from '../../context/entity-creation-context';
import { ContextualHorizontalEntityViewer } from '../components/ContextualHorizontalEntityViewer';
import { validateEntityData } from '../../utils/validation';
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

// Composant intérieur qui utilise le contexte
const NewEntityPageContent = component$(() => {
  const nav = useNavigate();
  const { store, actions } = useEntityCreation();

  const handleSave = $(async () => {
    try {
      actions.setSaving(true);

      // VALIDATION AVANT SAUVEGARDE
      const validation = validateEntityData(store.state.entity.data, store.state.schema);

      if (!validation.isValid) {
        actions.showNotification(`Erreurs de validation:\n${validation.errors.join('\n')}`, 'error');
        return;
      }

      console.log('🐛 DEBUG - Données à sauvegarder:', {
        schemaName: store.state.schemaName,
        data: store.state.entity.data,
        hasData: Object.keys(store.state.entity.data).length > 0
      });

      const request: CreateEntityRequest = {
        schemaName: store.state.schemaName,
        data: store.state.entity.data
      };

      const result = await createEntity(request);

      console.log('🐛 DEBUG - Résultat création:', result);

      if (result.success) {
        actions.showNotification('Entité créée avec succès', 'success');

        // Marquer comme sauvegardé
        store.state.modifications.hasChanges = false;
        store.state.modifications.originalData = JSON.stringify(store.state.entity.data);

        // Rediriger vers la liste des entités après création
        setTimeout(() => {
          nav(`/bdd/${store.state.schemaName}/`);
        }, 1500);
      } else {
        actions.showNotification(result.message, 'error');
      }
    } catch (error) {
      console.error('Erreur création:', error);
      actions.showNotification('Erreur lors de la création de l\'entité', 'error');
    } finally {
      actions.setSaving(false);
    }
  });

  const handleCancel = $(() => {
    if (store.state.modifications.hasChanges) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment annuler ?');
      if (!confirmed) return;
    }

    nav(`/bdd/${store.state.schemaName}/`);
  });

  const handleGoBack = $(() => {
    if (store.state.modifications.hasChanges) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?');
      if (!confirmed) return;
    }

    nav(`/bdd/${store.state.schemaName}/`);
  });

  return (
    <div class="entity-new-page">
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

  const entityData = useNewEntityLoader();

  return (
    <EntityCreationProvider
      entity={entityData.value.entity}
      schema={entityData.value.schema}
      schemaName={entityData.value.schemaName}
      schemaTitle={entityData.value.schemaTitle}
      schemaVersion={entityData.value.schemaVersion}
    >
      <NewEntityPageContent />
    </EntityCreationProvider>
  );
});