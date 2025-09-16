// Exemple complet d'utilisation du SchemaEditorContext
import { component$, $ } from '@builder.io/qwik';
import {
  useSchemas,
  useCurrentSchema,
  useProperties,
  useNotifications,
  useValidation,
  useDrafts,
  useUI,
  useFileOperations,
  useKeyboardShortcuts
} from './hooks';

/**
 * Composant principal démontrant l'utilisation du contexte
 */
export const SchemaEditorExample = component$(() => {
  return (
    <div class="schema-editor-app">
      <div class="sidebar">
        <SchemaListPanel />
        <DraftPanel />
      </div>
      <div class="main-content">
        <SchemaEditor />
      </div>
      <div class="side-panel">
        <NotificationPanel />
        <ValidationPanel />
      </div>
    </div>
  );
});

/**
 * Panel de liste des schémas avec recherche et filtres
 */
const SchemaListPanel = component$(() => {
  const { schemas, count, isLoading, actions: schemaActions } = useSchemas();
  const { ui, actions: uiActions } = useUI();
  const { actions: notificationActions } = useNotifications();

  const createNewSchema$ = $(async () => {
    const name = prompt('Nom du nouveau schéma:');
    if (!name) return;

    try {
      const result = await schemaActions.create(
        {
          name,
          title: name,
          description: '',
          type: 'object'
        },
        []
      );

      if (result.success) {
        await schemaActions.select(name);
        uiActions.setEditMode('edit');
      }
    } catch (error) {
      notificationActions.error(
        'Erreur de création',
        'Impossible de créer le nouveau schéma'
      );
    }
  });

  return (
    <div class="schema-list-panel">
      <div class="panel-header">
        <h2>Schémas ({count.value})</h2>
        <button onClick$={createNewSchema$} class="btn-primary">
          Nouveau
        </button>
      </div>

      <div class="search-section">
        <input
          type="search"
          value={ui.value.searchQuery}
          onInput$={(e) => uiActions.setSearchQuery(
            (e.target as HTMLInputElement).value
          )}
          placeholder="Rechercher..."
          class="search-input"
        />
      </div>

      <div class="filters">
        <select
          value={ui.value.filters.type || ''}
          onChange$={(e) => uiActions.setFilters({
            type: (e.target as HTMLSelectElement).value as 'object' | 'array' | undefined
          })}
        >
          <option value="">Tous les types</option>
          <option value="object">Objet</option>
          <option value="array">Tableau</option>
        </select>
      </div>

      {isLoading.value ? (
        <div class="loading">Chargement des schémas...</div>
      ) : (
        <div class="schema-list">
          {schemas.value.map(schema => (
            <SchemaItem
              key={schema.name}
              schema={schema}
              onSelect={() => schemaActions.select(schema.name)}
              onDelete={() => schemaActions.delete(schema.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Item de schéma dans la liste
 */
interface SchemaItemProps {
  schema: any;
  onSelect: () => void;
  onDelete: () => void;
}

const SchemaItem = component$<SchemaItemProps>((props) => {
  const { selectedSchema } = useCurrentSchema();
  const { downloadSchema } = useFileOperations();
  const { actions: notificationActions } = useNotifications();

  const isSelected = selectedSchema.value?.name === props.schema.name;

  const handleExport$ = $(async (e: Event) => {
    e.stopPropagation();
    try {
      await downloadSchema(props.schema.name, 'json');
    } catch (error) {
      notificationActions.error(
        'Erreur d\'export',
        'Impossible d\'exporter le schéma'
      );
    }
  });

  const handleDelete$ = $(async (e: Event) => {
    e.stopPropagation();
    if (confirm(`Supprimer le schéma "${props.schema.name}" ?`)) {
      props.onDelete();
    }
  });

  return (
    <div
      class={`schema-item ${isSelected ? 'selected' : ''}`}
      onClick$={props.onSelect}
    >
      <div class="schema-info">
        <h3>{props.schema.schema.title || props.schema.name}</h3>
        <p class="description">{props.schema.schema.description || 'Aucune description'}</p>
        <div class="metadata">
          <span class="type">{props.schema.schema.type}</span>
          <span class="version">v{props.schema.version}</span>
          <span class="date">
            {new Date(props.schema.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div class="schema-actions">
        <button onClick$={handleExport$} title="Exporter">
          📄
        </button>
        <button onClick$={handleDelete$} title="Supprimer" class="btn-danger">
          🗑️
        </button>
      </div>
    </div>
  );
});

/**
 * Panel des brouillons
 */
const DraftPanel = component$(() => {
  const { drafts, count, isAutoSaveEnabled, actions } = useDrafts();
  const { actions: notificationActions } = useNotifications();

  const toggleAutoSave$ = $(async () => {
    if (isAutoSaveEnabled.value) {
      actions.disableAutoSave();
      notificationActions.info('Auto-save désactivé', '');
    } else {
      actions.enableAutoSave();
      notificationActions.info('Auto-save activé', 'Sauvegarde toutes les 30 secondes');
    }
  });

  return (
    <div class="draft-panel">
      <div class="panel-header">
        <h3>Brouillons ({count.value})</h3>
        <button onClick$={toggleAutoSave$} class="btn-toggle">
          {isAutoSaveEnabled.value ? '⏸️' : '▶️'}
        </button>
      </div>

      <div class="draft-list">
        {drafts.value.map(draft => (
          <div key={draft.name} class="draft-item">
            <div class="draft-info">
              <span class="name">{draft.name}</span>
              <span class="date">
                {new Date(draft.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <div class="draft-actions">
              <button
                onClick$={() => actions.restoreFromDraft(draft.name)}
                title="Restaurer"
              >
                ↩️
              </button>
              <button
                onClick$={() => actions.delete(draft.name)}
                title="Supprimer"
                class="btn-danger"
              >
                ❌
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Éditeur principal de schéma
 */
const SchemaEditor = component$(() => {
  const { currentSchema, isSelected } = useCurrentSchema();
  const { properties, actions: propertyActions } = useProperties();
  const { validate, isValidating } = useValidation();
  const shortcuts = useKeyboardShortcuts();

  // Attacher les raccourcis clavier
  const handleKeyboard$ = $((e: KeyboardEvent) => {
    shortcuts.save(e);
    shortcuts.new(e);
    shortcuts.escape(e);
    shortcuts.search(e);
  });

  if (!isSelected.value) {
    return (
      <div class="schema-editor-empty">
        <h2>Aucun schéma sélectionné</h2>
        <p>Sélectionnez un schéma dans la liste ou créez-en un nouveau.</p>
      </div>
    );
  }

  return (
    <div
      class="schema-editor"
      onKeyDown$={handleKeyboard$}
      tabIndex={0}
    >
      <div class="editor-header">
        <h1>{currentSchema.value.schemaInfo.title}</h1>
        <div class="editor-actions">
          <button
            onClick$={validate}
            disabled={isValidating.value}
            class="btn-secondary"
          >
            {isValidating.value ? 'Validation...' : 'Valider'}
          </button>
        </div>
      </div>

      <div class="editor-content">
        <SchemaInfoEditor />
        <PropertyTreeEditor />
      </div>
    </div>
  );
});

/**
 * Éditeur des informations du schéma
 */
const SchemaInfoEditor = component$(() => {
  const { currentSchema } = useCurrentSchema();

  return (
    <div class="schema-info-editor">
      <h3>Informations générales</h3>
      <div class="form-group">
        <label>Nom</label>
        <input
          type="text"
          value={currentSchema.value.schemaInfo.name}
          readOnly
        />
      </div>
      <div class="form-group">
        <label>Titre</label>
        <input
          type="text"
          value={currentSchema.value.schemaInfo.title}
          onInput$={(e) => {
            currentSchema.value.schemaInfo.title = (e.target as HTMLInputElement).value;
          }}
        />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea
          value={currentSchema.value.schemaInfo.description}
          onInput$={(e) => {
            currentSchema.value.schemaInfo.description = (e.target as HTMLTextAreaElement).value;
          }}
        />
      </div>
    </div>
  );
});

/**
 * Éditeur d'arbre de propriétés
 */
const PropertyTreeEditor = component$(() => {
  const { properties, actions } = useProperties();

  const addProperty$ = $(async () => {
    const name = prompt('Nom de la propriété:');
    if (!name) return;

    actions.add({
      name,
      type: 'string',
      required: false,
      description: ''
    });
  });

  return (
    <div class="property-tree-editor">
      <div class="section-header">
        <h3>Propriétés</h3>
        <button onClick$={addProperty$} class="btn-primary">
          Ajouter
        </button>
      </div>

      <div class="property-tree">
        {properties.value.map(property => (
          <PropertyNode
            key={property.id}
            property={property}
            level={0}
          />
        ))}
      </div>
    </div>
  );
});

/**
 * Nœud de propriété dans l'arbre
 */
interface PropertyNodeProps {
  property: any;
  level: number;
}

const PropertyNode = component$<PropertyNodeProps>((props) => {
  const { expandedProperties, selectedPropertyId, actions } = useProperties();

  const isExpanded = expandedProperties.value.includes(props.property.id || '');
  const isSelected = selectedPropertyId === props.property.id;

  return (
    <div
      class={`property-node level-${props.level} ${isSelected ? 'selected' : ''}`}
      style={{ marginLeft: `${props.level * 20}px` }}
    >
      <div class="property-header">
        <button
          onClick$={() => actions.toggleExpansion(props.property.id)}
          class="expand-btn"
        >
          {isExpanded ? '▼' : '▶'}
        </button>

        <span class="property-name">{props.property.name}</span>
        <span class="property-type">{props.property.type}</span>

        {props.property.required && (
          <span class="required">*</span>
        )}

        <div class="property-actions">
          <button
            onClick$={() => actions.selectProperty(props.property.id)}
            title="Modifier"
          >
            ✏️
          </button>
          <button
            onClick$={() => actions.delete(props.property.id)}
            title="Supprimer"
            class="btn-danger"
          >
            🗑️
          </button>
        </div>
      </div>

      {isExpanded && props.property.properties && (
        <div class="property-children">
          {props.property.properties.map((childProperty: any) => (
            <PropertyNode
              key={childProperty.id}
              property={childProperty}
              level={props.level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Panel de notifications
 */
const NotificationPanel = component$(() => {
  const { notifications, hasNotifications, actions } = useNotifications();

  if (!hasNotifications.value) return null;

  return (
    <div class="notification-panel">
      <div class="panel-header">
        <h3>Notifications</h3>
        <button onClick$={() => actions.dismissAll()}>
          Tout effacer
        </button>
      </div>

      <div class="notification-list">
        {notifications.value.map(notification => (
          <div
            key={notification.id}
            class={`notification ${notification.type}`}
          >
            <div class="notification-content">
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>
            <button
              onClick$={() => actions.dismiss(notification.id)}
              class="dismiss-btn"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Panel de validation
 */
const ValidationPanel = component$(() => {
  const { isValid, errors, hasErrors, validate, enabled } = useValidation();

  return (
    <div class="validation-panel">
      <div class="panel-header">
        <h3>Validation</h3>
        <div class={`status ${isValid.value ? 'valid' : 'invalid'}`}>
          {isValid.value ? '✅' : '❌'}
        </div>
      </div>

      {enabled.value && (
        <div class="validation-content">
          {hasErrors.value ? (
            <div class="errors">
              <h4>Erreurs détectées:</h4>
              <ul>
                {errors.value.map((error, index) => (
                  <li key={index} class="error-item">{error}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div class="success">
              Schéma valide ✅
            </div>
          )}

          <button onClick$={validate} class="btn-primary">
            Revalider
          </button>
        </div>
      )}
    </div>
  );
});

export default SchemaEditorExample;