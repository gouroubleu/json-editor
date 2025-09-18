import { component$, useStore, useSignal, $ } from '@builder.io/qwik';
import { JsonSchema } from '../routes/types';

type SchemaEditorProps = {
  schema: JsonSchema | null;
  onSave: (schema: any) => void;
  onCancel: () => void;
}

export const SchemaEditor = component$<SchemaEditorProps>(({ schema, onSave, onCancel }) => {
  const formData = useStore({
    name: schema?.name || '',
    title: schema?.title || '',
    description: schema?.description || '',
    type: schema?.type || 'object',
    properties: schema?.properties || {},
    required: schema?.required || [],
    additionalProperties: schema?.additionalProperties ?? true
  });

  const newPropertyName = useSignal('');
  const newPropertyType = useSignal('string');
  const showPreview = useSignal(false);

  const handleAddProperty = $(() => {
    const name = newPropertyName.value.trim();
    if (!name || formData.properties[name]) return;

    formData.properties = {
      ...formData.properties,
      [name]: {
        type: newPropertyType.value,
        title: name,
        description: ''
      }
    };

    newPropertyName.value = '';
    newPropertyType.value = 'string';
  });

  const handleRemoveProperty = $((propertyName: string) => {
    const { [propertyName]: removed, ...rest } = formData.properties;
    formData.properties = rest;
    formData.required = formData.required.filter(req => req !== propertyName);
  });

  const handlePropertyChange = $((propertyName: string, field: string, value: any) => {
    formData.properties = {
      ...formData.properties,
      [propertyName]: {
        ...formData.properties[propertyName],
        [field]: value
      }
    };
  });

  const toggleRequired = $((propertyName: string) => {
    if (formData.required.includes(propertyName)) {
      formData.required = formData.required.filter(req => req !== propertyName);
    } else {
      formData.required = [...formData.required, propertyName];
    }
  });

  const handleSubmit = $(() => {
    if (!formData.name.trim()) {
      alert('Schema name is required');
      return;
    }

    onSave({
      name: formData.name,
      title: formData.title,
      description: formData.description,
      type: formData.type,
      properties: formData.properties,
      required: formData.required,
      additionalProperties: formData.additionalProperties
    });
  });

  return (
    <div class="schema-editor">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3>{schema ? 'Edit Schema' : 'Create Schema'}</h3>
        <button onClick$={onCancel} class="btn btn-outline-secondary">
          ← Back to List
        </button>
      </div>

      {/* Schema Preview */}
      {showPreview.value && (
        <div class="card mb-3">
          <div class="card-header">
            <h5>Schema Preview</h5>
          </div>
          <div class="card-body">
            <pre class="bg-light p-3 rounded">
              <code>{JSON.stringify({
                name: formData.name,
                title: formData.title,
                description: formData.description,
                type: formData.type,
                properties: formData.properties,
                required: formData.required,
                additionalProperties: formData.additionalProperties
              }, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}

      <div class="row">
        <div class="col-md-6">
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
                  placeholder="e.g., user, product, order"
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
                  placeholder="Human readable title"
                />
              </div>

              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea
                  value={formData.description}
                  onInput$={(e: any) => formData.description = e.target.value}
                  class="form-control"
                  rows={3}
                  placeholder="Schema description"
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
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
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
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5>Properties</h5>
              <span class="badge bg-info">{Object.keys(formData.properties).length} properties</span>
            </div>
            <div class="card-body">
              {/* Add Property Form */}
              <div class="row g-2 mb-3">
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
                    class="btn btn-sm btn-success w-100"
                    disabled={!newPropertyName.value.trim()}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Properties List */}
              <div class="properties-list">
                {Object.keys(formData.properties).length === 0 && (
                  <p class="text-muted text-center">No properties defined</p>
                )}

                {Object.entries(formData.properties).map(([propertyName, property]: [string, any]) => (
                  <div key={propertyName} class="property-item border rounded p-2 mb-2">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                      <div class="d-flex align-items-center">
                        <strong>{propertyName}</strong>
                        <span class="badge bg-secondary ms-2">{property.type}</span>
                        {formData.required.includes(propertyName) && (
                          <span class="badge bg-danger ms-1">required</span>
                        )}
                      </div>
                      <button
                        onClick$={() => handleRemoveProperty(propertyName)}
                        class="btn btn-sm btn-outline-danger"
                        title="Remove property"
                      >
                        ×
                      </button>
                    </div>

                    <div class="row g-2">
                      <div class="col-md-6">
                        <input
                          type="text"
                          value={property.title || ''}
                          onInput$={(e: any) => handlePropertyChange(propertyName, 'title', e.target.value)}
                          class="form-control form-control-sm"
                          placeholder="Title"
                        />
                      </div>
                      <div class="col-md-6">
                        <input
                          type="text"
                          value={property.description || ''}
                          onInput$={(e: any) => handlePropertyChange(propertyName, 'description', e.target.value)}
                          class="form-control form-control-sm"
                          placeholder="Description"
                        />
                      </div>
                      <div class="col-12">
                        <div class="form-check form-check-sm">
                          <input
                            type="checkbox"
                            checked={formData.required.includes(propertyName)}
                            onChange$={() => toggleRequired(propertyName)}
                            class="form-check-input"
                            id={`required-${propertyName}`}
                          />
                          <label class="form-check-label" for={`required-${propertyName}`}>
                            Required
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Actions */}
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button onClick$={onCancel} class="btn btn-secondary">
          Cancel
        </button>
        <button 
          onClick$={() => showPreview.value = !showPreview.value}
          class="btn btn-info"
        >
          {showPreview.value ? '👁️ Masquer aperçu' : '👁️ Voir aperçu'}
        </button>
        <button onClick$={handleSubmit} class="btn btn-primary">
          {schema ? 'Update' : 'Create'} Schema
        </button>
      </div>
    </div>
  );
});