import { component$, type PropFunction } from '@builder.io/qwik';
import type { SchemaProperty, JsonSchemaType } from '../routes/types';
import { flattenPropertiesForDisplay } from '../routes/utils';

type PropertyTreeProps = {
  properties: SchemaProperty[];
  onAddProperty$: PropFunction<(parentId: string | null, name: string, type: JsonSchemaType, required: boolean, description: string) => Promise<void>>;
  onRemoveProperty$: PropFunction<(propertyId: string) => Promise<void>>;
  onToggleExpanded$: PropFunction<(propertyId: string) => Promise<void>>;
  onUpdateProperty$: PropFunction<(propertyId: string, updates: Partial<SchemaProperty>) => Promise<void>>;
  onUpdatePropertyType$: PropFunction<(propertyId: string, newType: JsonSchemaType) => Promise<void>>;
  onUpdateArrayItemType$: PropFunction<(arrayPropertyId: string, newItemType: JsonSchemaType) => Promise<void>>;
};

export const PropertyTree = component$<PropertyTreeProps>(({
  properties,
  onAddProperty$,
  onRemoveProperty$,
  onToggleExpanded$,
  onUpdateProperty$,
  onUpdatePropertyType$,
  onUpdateArrayItemType$
}) => {
  const flattenedProperties = flattenPropertiesForDisplay(properties);

  return (
    <div class="property-tree">
      {flattenedProperties.length === 0 && (
        <div class="empty-state">
          Aucune propriété définie. Utilisez le formulaire ci-dessus pour ajouter votre première propriété.
        </div>
      )}

      {flattenedProperties.map((prop) => (
        <div 
          key={prop.id} 
          class={`property-item level-${prop.level || 0}`}
          style={{ marginLeft: `${(prop.level || 0) * 20}px` }}
        >
          <div class="property-header">
            <div class="property-info">
              {/* Bouton expand/collapse pour les conteneurs */}
              {(prop.type === 'object' || prop.type === 'array') && (
                <button
                  class={`expand-btn ${prop.isExpanded ? 'expanded' : ''}`}
                  onClick$={() => onToggleExpanded$(prop.id!)}
                  title={prop.isExpanded ? 'Réduire' : 'Développer'}
                >
                  {prop.isExpanded ? '▼' : '▶'}
                </button>
              )}

              {/* Nom de la propriété (éditable) */}
              <input
                class="property-name-input"
                type="text"
                value={prop.name}
                onInput$={async (event) => {
                  const newName = (event.target as HTMLInputElement).value;
                  await onUpdateProperty$(prop.id!, { name: newName });
                }}
                placeholder="Nom de la propriété"
              />

              {/* Sélecteur de type */}
              <select
                class="property-type-select"
                value={prop.type}
                onChange$={async (event) => {
                  const newType = (event.target as HTMLSelectElement).value as JsonSchemaType;
                  await onUpdatePropertyType$(prop.id!, newType);
                }}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="integer">Integer</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
                <option value="object">Object</option>
              </select>

              {/* Configuration spéciale pour les arrays */}
              {prop.type === 'array' && prop.items && (
                <div class="array-config">
                  <span class="array-label">Items:</span>
                  <select
                    class="array-item-type-select"
                    value={prop.items.type}
                    onChange$={async (event) => {
                      const newItemType = (event.target as HTMLSelectElement).value as JsonSchemaType;
                      await onUpdateArrayItemType$(prop.id!, newItemType);
                    }}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="integer">Integer</option>
                    <option value="boolean">Boolean</option>
                    <option value="object">Object</option>
                  </select>
                </div>
              )}
            </div>

            <div class="property-actions">
              {/* Checkbox requis */}
              <label class="required-checkbox">
                <input
                  type="checkbox"
                  checked={prop.required}
                  onChange$={async (event) => {
                    const required = (event.target as HTMLInputElement).checked;
                    await onUpdateProperty$(prop.id!, { required });
                  }}
                />
                <span class="checkbox-label">Requis</span>
              </label>

              {/* Bouton ajouter enfant (pour object et array) */}
              {prop.canAddChild && (
                <button
                  class="btn-add-child"
                  onClick$={async () => {
                    const name = prompt('Nom de la nouvelle propriété:');
                    if (name && name.trim()) {
                      await onAddProperty$(prop.id!, name.trim(), 'string', false, '');
                    }
                  }}
                  title="Ajouter une propriété enfant"
                >
                  ➕
                </button>
              )}

              {/* Bouton supprimer */}
              <button
                class="btn-remove"
                onClick$={() => onRemoveProperty$(prop.id!)}
                title="Supprimer la propriété"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Description (éditable) */}
          <div class="property-description-section">
            <input
              class="property-description-input"
              type="text"
              value={prop.description || ''}
              onInput$={async (event) => {
                const description = (event.target as HTMLInputElement).value;
                await onUpdateProperty$(prop.id!, { description });
              }}
              placeholder="Description (optionnelle)"
            />
          </div>

          {/* Contraintes spécifiques au type */}
          {prop.type === 'string' && (
            <div class="property-constraints">
              <input
                class="constraint-input"
                type="number"
                value={prop.minLength || ''}
                onInput$={async (event) => {
                  const value = (event.target as HTMLInputElement).value;
                  const minLength = value ? parseInt(value) : undefined;
                  await onUpdateProperty$(prop.id!, { minLength });
                }}
                placeholder="Min length"
              />
              <input
                class="constraint-input"
                type="number"
                value={prop.maxLength || ''}
                onInput$={async (event) => {
                  const value = (event.target as HTMLInputElement).value;
                  const maxLength = value ? parseInt(value) : undefined;
                  await onUpdateProperty$(prop.id!, { maxLength });
                }}
                placeholder="Max length"
              />
              <select
                class="constraint-select"
                value={prop.format || ''}
                onChange$={async (event) => {
                  const format = (event.target as HTMLSelectElement).value || undefined;
                  await onUpdateProperty$(prop.id!, { format: format as any });
                }}
              >
                <option value="">Aucun format</option>
                <option value="email">Email</option>
                <option value="date">Date</option>
                <option value="uri">URI</option>
                <option value="datetime-local">Date et heure</option>
              </select>
            </div>
          )}

          {(prop.type === 'number' || prop.type === 'integer') && (
            <div class="property-constraints">
              <input
                class="constraint-input"
                type="number"
                value={prop.minimum ?? ''}
                onInput$={async (event) => {
                  const value = (event.target as HTMLInputElement).value;
                  const minimum = value ? parseFloat(value) : undefined;
                  await onUpdateProperty$(prop.id!, { minimum });
                }}
                placeholder="Valeur min"
              />
              <input
                class="constraint-input"
                type="number"
                value={prop.maximum ?? ''}
                onInput$={async (event) => {
                  const value = (event.target as HTMLInputElement).value;
                  const maximum = value ? parseFloat(value) : undefined;
                  await onUpdateProperty$(prop.id!, { maximum });
                }}
                placeholder="Valeur max"
              />
            </div>
          )}

          {/* Badges informatifs */}
          <div class="property-badges">
            <span class={`badge type-badge type-${prop.type}`}>
              {prop.type}
            </span>
            {prop.required && (
              <span class="badge required-badge">Requis</span>
            )}
            {prop.hasChildren && (
              <span class="badge children-badge">
                {prop.type === 'object' && prop.properties ? 
                  `${prop.properties.length} prop${prop.properties.length > 1 ? 's' : ''}` :
                  prop.type === 'array' && prop.items?.properties ? 
                  `${prop.items.properties.length} item prop${prop.items.properties.length > 1 ? 's' : ''}` :
                  ''}
              </span>
            )}
          </div>
        </div>
      ))}

      {/* Bouton pour ajouter une propriété racine */}
      <div class="add-root-property">
        <button
          class="btn btn-secondary"
          onClick$={async () => {
            const name = prompt('Nom de la nouvelle propriété:');
            if (name && name.trim()) {
              await onAddProperty$(null, name.trim(), 'string', false, '');
            }
          }}
        >
          ➕ Ajouter une propriété racine
        </button>
      </div>
    </div>
  );
});