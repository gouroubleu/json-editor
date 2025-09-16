import { component$ } from '@builder.io/qwik';
import {
  SchemaEditorProvider,
  useSchemas,
  useSchemaProperties,
  useNotifications
} from './index';

/**
 * Test d'intégration simple pour vérifier le bon fonctionnement du contexte
 */
export const SimpleIntegrationTest = component$(() => {
  return (
    <SchemaEditorProvider>
      <TestConsumer />
    </SchemaEditorProvider>
  );
});

const TestConsumer = component$(() => {
  const schemas = useSchemas();
  const properties = useSchemaProperties();
  const notifications = useNotifications();

  return (
    <div class="test-integration">
      <h2>Test d'intégration du contexte SchemaEditor</h2>

      <div class="test-section">
        <h3>État des schémas</h3>
        <p>Nombre de schémas: {schemas.schemas.value.length}</p>
        <p>Chargement: {schemas.isLoading ? 'Oui' : 'Non'}</p>
        <p>Schéma sélectionné: {schemas.selectedSchema.value?.name || 'Aucun'}</p>
      </div>

      <div class="test-section">
        <h3>Propriétés du schéma actuel</h3>
        <p>Nombre de propriétés: {properties.properties.value.length}</p>
        <p>Propriété sélectionnée: {properties.selectedPropertyId || 'Aucune'}</p>
        <p>Propriétés étendues: {properties.expandedProperties.value.size}</p>
      </div>

      <div class="test-section">
        <h3>Notifications</h3>
        <p>Nombre de notifications: {notifications.notifications.value.length}</p>
        <p>Erreurs: {notifications.hasErrors.value ? 'Oui' : 'Non'}</p>
      </div>

      <div class="test-section">
        <h3>Actions de test</h3>
        <button
          onClick$={() => {
            schemas.setSearchQuery('test');
          }}
        >
          Définir recherche "test"
        </button>

        <button
          onClick$={() => {
            properties.add({
              name: 'test-property',
              type: 'string',
              required: false,
              description: 'Propriété de test',
              level: 0,
              isExpanded: false
            });
          }}
        >
          Ajouter propriété de test
        </button>

        <button
          onClick$={() => {
            notifications.info('Test', 'Notification de test');
          }}
        >
          Ajouter notification de test
        </button>
      </div>
    </div>
  );
});

export default SimpleIntegrationTest;