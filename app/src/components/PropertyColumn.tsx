import { component$, useStore, type PropFunction, $ } from '@builder.io/qwik';
import type { SchemaProperty, JsonSchemaType, SelectOption } from '../routes/types';
import { createNewProperty } from '../routes/utils';

type PropertyColumnProps = {
  properties: SchemaProperty[];
  parentId: string | null;
  parentName: string;
  level: number;
  selectedPath: string[];
  columnIndex: number;
  onSelectProperty$: PropFunction<(propertyId: string, columnIndex: number) => void>;
  onGoBack$: PropFunction<(columnIndex: number) => void>;
  onAddProperty$: PropFunction<(parentId: string | null, property: SchemaProperty) => Promise<void>>;
  onRemoveProperty$: PropFunction<(propertyId: string) => Promise<void>>;
  onUpdateProperty$: PropFunction<(propertyId: string, updates: Partial<SchemaProperty>) => Promise<void>>;
  onUpdatePropertyType$: PropFunction<(propertyId: string, newType: JsonSchemaType) => Promise<void>>;
  onUpdateArrayItemType$: PropFunction<(arrayPropertyId: string, newItemType: JsonSchemaType) => Promise<void>>;
};

export const PropertyColumn = component$<PropertyColumnProps>((props) => {
  const localState = useStore({
    showAddForm: false,
    newProperty: createNewProperty()
  });

  const handleAddProperty = $(async () => {
    if (!localState.newProperty.name.trim()) return;

    await props.onAddProperty$(
      props.parentId,
      localState.newProperty
    );

    // Reset form
    localState.newProperty = createNewProperty();
    localState.showAddForm = false;
  });

  const canHaveChildren = (property: SchemaProperty) => {
    if (property.type === 'object') {
      return true;
    }
    if (property.type === 'array') {
      // Seulement les arrays d'objets peuvent avoir des enfants
      return property.items?.type === 'object';
    }
    if (property.type === 'select') {
      // Le type select ouvre une colonne pour configurer les options
      return true;
    }
    return false;
  };

  return (
    <div class="property-column">
      {/* En-tête de colonne */}
      <div class="column-header">
        {props.level > 0 && (
          <button class="back-btn" onClick$={() => props.onGoBack$(props.columnIndex)}>
            ← Retour
          </button>
        )}
        <h3 class="column-title">{props.parentName}</h3>
        <button 
          class="add-btn"
          onClick$={() => localState.showAddForm = !localState.showAddForm}
        >
          ➕ Ajouter
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {localState.showAddForm && (
        <div class="add-property-form">
          <div class="form-row">
            <input
              class="input"
              type="text"
              value={localState.newProperty.name}
              onInput$={(event) => {
                localState.newProperty.name = (event.target as HTMLInputElement).value;
              }}
              placeholder="Nom de la propriété"
            />
          </div>

          <div class="form-row">
            <select
              class="select"
              value={localState.newProperty.type}
              onChange$={(event) => {
                const type = (event.target as HTMLSelectElement).value as JsonSchemaType;

                // Créer une nouvelle propriété pour que Qwik détecte le changement
                const newProp = { ...localState.newProperty };
                newProp.type = type;

                // Nettoyer les anciennes propriétés
                delete newProp.properties;
                delete newProp.items;
                delete newProp.selectOptions;

                // Initialiser selon le nouveau type
                if (type === 'object') {
                  newProp.properties = [];
                } else if (type === 'array') {
                  newProp.items = { type: 'string', properties: [] };
                } else if (type === 'select') {
                  newProp.selectOptions = [
                    { key: 'option1', value: 'Option 1' },
                    { key: 'option2', value: 'Option 2' }
                  ];
                }


                // Remplacer l'objet complet
                localState.newProperty = newProp;
              }}
            >
              <option value="string" selected={localState.newProperty.type === 'string'}>String</option>
              <option value="number" selected={localState.newProperty.type === 'number'}>Number</option>
              <option value="integer" selected={localState.newProperty.type === 'integer'}>Integer</option>
              <option value="boolean" selected={localState.newProperty.type === 'boolean'}>Boolean</option>
              <option value="select" selected={localState.newProperty.type === 'select'}>Select</option>
              <option value="array" selected={localState.newProperty.type === 'array'}>Array</option>
              <option value="object" selected={localState.newProperty.type === 'object'}>Object</option>
            </select>

            <label class="checkbox-container">
              <input
                type="checkbox"
                checked={localState.newProperty.required}
                onChange$={(event) => {
                  localState.newProperty.required = (event.target as HTMLInputElement).checked;
                }}
              />
              Requis
            </label>
          </div>

          <div class="form-row">
            <input
              class="input"
              type="text"
              value={localState.newProperty.description}
              onInput$={(event) => {
                localState.newProperty.description = (event.target as HTMLInputElement).value;
              }}
              placeholder="Description (optionnelle)"
            />
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" onClick$={handleAddProperty}>
              Ajouter
            </button>
            <button 
              class="btn btn-secondary"
              onClick$={() => {
                localState.showAddForm = false;
                localState.newProperty = createNewProperty();
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des propriétés */}
      <div class="properties-list">
        {props.properties.length === 0 && !localState.showAddForm && (
          <div class="empty-state">
            Aucune propriété. Cliquez sur "Ajouter" pour commencer.
          </div>
        )}

        {props.properties.map((property) => (
          <div 
            key={property.id}
            class={`property-card ${(props.selectedPath.length > props.columnIndex && props.selectedPath[props.columnIndex] === property.id) ? 'selected' : ''} ${canHaveChildren(property) ? 'expandable' : ''}`}
          >
            <div class="property-main">
              <div class="property-info">
                <input
                  class="property-name"
                  type="text"
                  value={property.name}
                  onInput$={async (event) => {
                    const name = (event.target as HTMLInputElement).value;
                    await props.onUpdateProperty$(property.id!, { name });
                  }}
                  placeholder="Nom de la propriété"
                />

                <select
                  class="property-type"
                  value={property.type}
                  onChange$={async (event) => {
                    const type = (event.target as HTMLSelectElement).value as JsonSchemaType;
                    await props.onUpdatePropertyType$(property.id!, type);
                  }}
                >
                  <option value="string" selected={property.type === 'string'}>String</option>
                  <option value="number" selected={property.type === 'number'}>Number</option>
                  <option value="integer" selected={property.type === 'integer'}>Integer</option>
                  <option value="boolean" selected={property.type === 'boolean'}>Boolean</option>
                  <option value="select" selected={property.type === 'select'}>Select</option>
                  <option value="array" selected={property.type === 'array'}>Array</option>
                  <option value="object" selected={property.type === 'object'}>Object</option>
                </select>
              </div>

              <div class="property-actions">
                <label class="required-toggle">
                  <input
                    type="checkbox"
                    checked={property.required}
                    onChange$={async (event) => {
                      const required = (event.target as HTMLInputElement).checked;
                      await props.onUpdateProperty$(property.id!, { required });
                    }}
                  />
                  <span class="toggle-label">Requis</span>
                </label>

                {canHaveChildren(property) && (
                  <button
                    class="explore-btn"
                    onClick$={() => props.onSelectProperty$(property.id!, props.columnIndex)}
                  >
                    Configurer →
                  </button>
                )}

                <button
                  class="delete-btn"
                  onClick$={() => props.onRemoveProperty$(property.id!)}
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Configuration spéciale pour les arrays */}
            {property.type === 'array' && property.items && (
              <div class="array-config">
                <label class="array-label">Type des éléments:</label>
                <select
                  class="array-type-select"
                  value={property.items.type}
                  onChange$={async (event) => {
                    const itemType = (event.target as HTMLSelectElement).value as JsonSchemaType;
                    await props.onUpdateArrayItemType$(property.id!, itemType);
                  }}
                >
                  <option value="string" selected={property.items.type === 'string'}>String</option>
                  <option value="number" selected={property.items.type === 'number'}>Number</option>
                  <option value="integer" selected={property.items.type === 'integer'}>Integer</option>
                  <option value="boolean" selected={property.items.type === 'boolean'}>Boolean</option>
                  <option value="object" selected={property.items.type === 'object'}>Object</option>
                </select>
              </div>
            )}

            {/* Description */}
            <div class="property-description">
              <input
                class="description-input"
                type="text"
                value={property.description || ''}
                onInput$={async (event) => {
                  const description = (event.target as HTMLInputElement).value;
                  await props.onUpdateProperty$(property.id!, { description });
                }}
                placeholder="Description (optionnelle)"
              />
            </div>

            {/* Contraintes selon le type */}
            {property.type === 'string' && (
              <div class="constraints">
                <input
                  class="constraint-input"
                  type="number"
                  value={property.minLength || ''}
                  onInput$={async (event) => {
                    const value = (event.target as HTMLInputElement).value;
                    const minLength = value ? parseInt(value) : undefined;
                    await props.onUpdateProperty$(property.id!, { minLength });
                  }}
                  placeholder="Min length"
                />
                <input
                  class="constraint-input"
                  type="number"
                  value={property.maxLength || ''}
                  onInput$={async (event) => {
                    const value = (event.target as HTMLInputElement).value;
                    const maxLength = value ? parseInt(value) : undefined;
                    await props.onUpdateProperty$(property.id!, { maxLength });
                  }}
                  placeholder="Max length"
                />
                <select
                  class="constraint-select"
                  value={property.format || ''}
                  onChange$={async (event) => {
                    const format = (event.target as HTMLSelectElement).value || undefined;
                    await props.onUpdateProperty$(property.id!, { format: format as any });
                  }}
                >
                  <option value="" selected={!property.format}>Aucun format</option>
                  <option value="email" selected={property.format === 'email'}>Email</option>
                  <option value="date" selected={property.format === 'date'}>Date</option>
                  <option value="uri" selected={property.format === 'uri'}>URI</option>
                  <option value="datetime-local" selected={property.format === 'datetime-local'}>Date et heure</option>
                </select>
              </div>
            )}

            {(property.type === 'number' || property.type === 'integer') && (
              <div class="constraints">
                <input
                  class="constraint-input"
                  type="number"
                  value={property.minimum ?? ''}
                  onInput$={async (event) => {
                    const value = (event.target as HTMLInputElement).value;
                    const minimum = value ? parseFloat(value) : undefined;
                    await props.onUpdateProperty$(property.id!, { minimum });
                  }}
                  placeholder="Valeur min"
                />
                <input
                  class="constraint-input"
                  type="number"
                  value={property.maximum ?? ''}
                  onInput$={async (event) => {
                    const value = (event.target as HTMLInputElement).value;
                    const maximum = value ? parseFloat(value) : undefined;
                    await props.onUpdateProperty$(property.id!, { maximum });
                  }}
                  placeholder="Valeur max"
                />
              </div>
            )}


            {/* Badges informatifs */}
            <div class="property-badges">
              <span class={`badge type-${property.type}`}>{property.type}</span>
              {property.required && <span class="badge required">Requis</span>}
              {canHaveChildren(property) && (
                <span class="badge children">
                  {property.type === 'object' ? 
                    `${property.properties?.length || 0} props` :
                    `Items: ${property.items?.type || 'string'}`
                  }
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});