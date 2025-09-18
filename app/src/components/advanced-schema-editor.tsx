import { component$, useSignal, useStore, $ } from '@builder.io/qwik';
import { Form } from '@builder.io/qwik-city';
import { JsonSchema } from '../routes/types';

type AdvancedSchemaEditorProps = {
  schema: JsonSchema | null;
  updateAction: any;
  onCancel: () => void;
}

type Property = {
  type: string;
  title: string;
  description: string;
  required: boolean;
  // Additional property-specific fields
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  format?: string;
}

export const AdvancedSchemaEditor = component$<AdvancedSchemaEditorProps>(({ schema, updateAction, onCancel }) => {
  const formData = useStore({
    id: schema?.id || '',
    name: schema?.name || '',
    title: schema?.title || '',
    description: schema?.description || '',
    type: schema?.type || 'object',
    additionalProperties: schema?.additionalProperties ?? true
  });

  // Convert properties to editable format
  const properties = useStore<Record<string, Property>>(
    Object.entries(schema?.properties || {}).reduce((acc, [key, prop]: [string, any]) => {
      acc[key] = {
        type: prop.type || 'string',
        title: prop.title || key,
        description: prop.description || '',
        required: schema?.required?.includes(key) || false,
        minLength: prop.minLength,
        maxLength: prop.maxLength,
        minimum: prop.minimum,
        maximum: prop.maximum,
        enum: prop.enum,
        format: prop.format
      };
      return acc;
    }, {} as Record<string, Property>)
  );

  const newPropertyName = useSignal('');
  const newPropertyType = useSignal('string');

  const handleAddProperty = $(() => {
    const name = newPropertyName.value.trim();
    if (!name || properties[name]) return;

    properties[name] = {
      type: newPropertyType.value,
      title: name,
      description: '',
      required: false
    };

    newPropertyName.value = '';
    newPropertyType.value = 'string';
  });

  const handleRemoveProperty = $((propertyName: string) => {
    delete properties[propertyName];
    properties[propertyName] = undefined as any; // Force reactivity
  });

  const handlePropertyChange = $((propertyName: string, field: keyof Property, value: any) => {
    if (properties[propertyName]) {
      properties[propertyName] = {
        ...properties[propertyName],
        [field]: value
      };
    }
  });

  const convertToJsonSchema = () => {
    const jsonProperties: Record<string, any> = {};
    const required: string[] = [];

    Object.entries(properties).forEach(([name, prop]) => {
      if (!prop) return; // Skip deleted properties
      
      const jsonProp: any = {
        type: prop.type,
        title: prop.title,
        description: prop.description
      };

      // Add type-specific fields
      if (prop.type === 'string') {
        if (prop.minLength) jsonProp.minLength = prop.minLength;
        if (prop.maxLength) jsonProp.maxLength = prop.maxLength;
        if (prop.format) jsonProp.format = prop.format;
        if (prop.enum && prop.enum.length > 0) {
          jsonProp.enum = prop.enum.filter(v => v.trim());
        }
      } else if (prop.type === 'number' || prop.type === 'integer') {
        if (prop.minimum !== undefined) jsonProp.minimum = prop.minimum;
        if (prop.maximum !== undefined) jsonProp.maximum = prop.maximum;
      }

      if (prop.required) {
        required.push(name);
      }

      jsonProperties[name] = jsonProp;
    });

    return {
      properties: jsonProperties,
      required
    };
  };

  const handleSubmit = $(() => {
    if (!formData.name.trim()) {
      alert('Schema name is required');
      return;
    }

    const { properties: jsonProperties, required } = convertToJsonSchema();

    const formElement = document.createElement('form');
    formElement.style.display = 'none';
    document.body.appendChild(formElement);

    // Add hidden inputs for all form data
    const fields = {
      id: formData.id,
      name: formData.name,
      title: formData.title,
      description: formData.description,
      type: formData.type,
      properties: JSON.stringify(jsonProperties),
      required: JSON.stringify(required),
      additionalProperties: formData.additionalProperties.toString()
    };

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value || '';
      formElement.appendChild(input);
    });

    // Submit via the action
    formElement.action = updateAction.actionPath;
    formElement.method = 'POST';
    formElement.submit();
  });

  const renderPropertyEditor = (propertyName: string, property: Property) => {
    if (!property) return null;

    return (
      <div key={propertyName} class="property-editor card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <strong>{propertyName}</strong>
            <span class="badge bg-secondary ms-2">{property.type}</span>
            {property.required && <span class="badge bg-danger ms-1">required</span>}
          </h6>
          <button
            type="button"
            onClick$={() => handleRemoveProperty(propertyName)}
            class="btn btn-sm btn-outline-danger"
          >
            Remove
          </button>
        </div>
        
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Title</label>
              <input
                type="text"
                value={property.title}
                onInput$={(e: any) => handlePropertyChange(propertyName, 'title', e.target.value)}
                class="form-control form-control-sm"
              />
            </div>
            
            <div class="col-md-6">
              <label class="form-label">Type</label>
              <select
                value={property.type}
                onChange$={(e: any) => handlePropertyChange(propertyName, 'type', e.target.value)}
                class="form-control form-control-sm"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="integer">Integer</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
                <option value="object">Object</option>
              </select>
            </div>
            
            <div class="col-12">
              <label class="form-label">Description</label>
              <input
                type="text"
                value={property.description}
                onInput$={(e: any) => handlePropertyChange(propertyName, 'description', e.target.value)}
                class="form-control form-control-sm"
              />
            </div>

            {/* Type-specific fields */}
            {property.type === 'string' && (
              <>
                <div class="col-md-3">
                  <label class="form-label">Min Length</label>
                  <input
                    type="number"
                    value={property.minLength || ''}
                    onInput$={(e: any) => handlePropertyChange(propertyName, 'minLength', parseInt(e.target.value) || undefined)}
                    class="form-control form-control-sm"
                  />
                </div>
                <div class="col-md-3">
                  <label class="form-label">Max Length</label>
                  <input
                    type="number"
                    value={property.maxLength || ''}
                    onInput$={(e: any) => handlePropertyChange(propertyName, 'maxLength', parseInt(e.target.value) || undefined)}
                    class="form-control form-control-sm"
                  />
                </div>
                <div class="col-md-3">
                  <label class="form-label">Format</label>
                  <select
                    value={property.format || ''}
                    onChange$={(e: any) => handlePropertyChange(propertyName, 'format', e.target.value || undefined)}
                    class="form-control form-control-sm"
                  >
                    <option value="">Default</option>
                    <option value="email">Email</option>
                    <option value="date">Date</option>
                    <option value="textarea">Textarea</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label">Enum (comma separated)</label>
                  <input
                    type="text"
                    value={property.enum?.join(', ') || ''}
                    onInput$={(e: any) => {
                      const values = e.target.value.split(',').map((v: string) => v.trim()).filter((v: string) => v);
                      handlePropertyChange(propertyName, 'enum', values.length > 0 ? values : undefined);
                    }}
                    class="form-control form-control-sm"
                    placeholder="option1, option2, option3"
                  />
                </div>
              </>
            )}

            {(property.type === 'number' || property.type === 'integer') && (
              <>
                <div class="col-md-6">
                  <label class="form-label">Minimum</label>
                  <input
                    type="number"
                    value={property.minimum ?? ''}
                    onInput$={(e: any) => handlePropertyChange(propertyName, 'minimum', e.target.value ? parseFloat(e.target.value) : undefined)}
                    class="form-control form-control-sm"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Maximum</label>
                  <input
                    type="number"
                    value={property.maximum ?? ''}
                    onInput$={(e: any) => handlePropertyChange(propertyName, 'maximum', e.target.value ? parseFloat(e.target.value) : undefined)}
                    class="form-control form-control-sm"
                  />
                </div>
              </>
            )}

            <div class="col-12">
              <div class="form-check">
                <input
                  type="checkbox"
                  checked={property.required}
                  onChange$={(e: any) => handlePropertyChange(propertyName, 'required', e.target.checked)}
                  class="form-check-input"
                  id={`required-${propertyName}`}
                />
                <label class="form-check-label" for={`required-${propertyName}`}>
                  Required field
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div class="advanced-schema-editor">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3>{schema ? 'Edit Schema' : 'Create Schema'}</h3>
        <button onClick$={onCancel} class="btn btn-outline-secondary">
          ← Back to List
        </button>
      </div>

      <div class="row">
        <div class="col-md-4">
          <div class="card">
            <div class="card-header">
              <h5>Schema Information</h5>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onInput$={(e: any) => formData.name = e.target.value}
                  class="form-control"
                  required
                />
              </div>

              <div class="mb-3">
                <label class="form-label">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onInput$={(e: any) => formData.title = e.target.value}
                  class="form-control"
                />
              </div>

              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea
                  value={formData.description}
                  onInput$={(e: any) => formData.description = e.target.value}
                  class="form-control"
                  rows={3}
                />
              </div>

              <div class="mb-3">
                <label class="form-label">Type</label>
                <select
                  value={formData.type}
                  onChange$={(e: any) => formData.type = e.target.value}
                  class="form-control"
                >
                  <option value="object">Object</option>
                  <option value="array">Array</option>
                </select>
              </div>

              <div class="form-check mb-3">
                <input
                  type="checkbox"
                  checked={formData.additionalProperties}
                  onChange$={(e: any) => formData.additionalProperties = e.target.checked}
                  class="form-check-input"
                  id="additionalProperties"
                />
                <label class="form-check-label" for="additionalProperties">
                  Allow additional properties
                </label>
              </div>

              <div class="d-grid gap-2">
                <button onClick$={handleSubmit} class="btn btn-primary">
                  {schema ? 'Update' : 'Create'} Schema
                </button>
                <button onClick$={onCancel} class="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-8">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5>Properties ({Object.keys(properties).filter(key => properties[key]).length})</h5>
            </div>
            <div class="card-body">
              {/* Add Property Form */}
              <div class="add-property-form card bg-light mb-3">
                <div class="card-body">
                  <h6>Add New Property</h6>
                  <div class="row g-2">
                    <div class="col-md-6">
                      <input
                        type="text"
                        value={newPropertyName.value}
                        onInput$={(e: any) => newPropertyName.value = e.target.value}
                        class="form-control form-control-sm"
                        placeholder="Property name"
                      />
                    </div>
                    <div class="col-md-4">
                      <select
                        value={newPropertyType.value}
                        onChange$={(e: any) => newPropertyType.value = e.target.value}
                        class="form-control form-control-sm"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="integer">Integer</option>
                        <option value="boolean">Boolean</option>
                        <option value="array">Array</option>
                        <option value="object">Object</option>
                      </select>
                    </div>
                    <div class="col-md-2">
                      <button
                        onClick$={handleAddProperty}
                        class="btn btn-success btn-sm w-100"
                        disabled={!newPropertyName.value.trim()}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Properties List */}
              <div class="properties-list">
                {Object.keys(properties).filter(key => properties[key]).length === 0 && (
                  <div class="text-center text-muted py-4">
                    No properties defined. Add your first property above.
                  </div>
                )}

                {Object.entries(properties)
                  .filter(([_, prop]) => prop)
                  .map(([propertyName, property]) => renderPropertyEditor(propertyName, property))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});