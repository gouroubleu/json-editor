import { component$, useSignal, $ } from '@builder.io/qwik';
import { Form } from '@builder.io/qwik-city';
import { Entity, JsonSchema } from '../routes/types';

type EntityListProps = {
  entities: Entity[];
  schemas: JsonSchema[];
  createAction: any;
}

export const EntityList = component$<EntityListProps>(({ entities, schemas, createAction }) => {
  const showCreateForm = useSignal(false);

  const handleToggleForm = $(() => {
    showCreateForm.value = !showCreateForm.value;
  });

  if (showCreateForm.value) {
    return (
      <div class="entity-create-form">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h3>Create New Entity</h3>
          <button onClick$={handleToggleForm} class="btn btn-outline-secondary">
            ← Back to List
          </button>
        </div>

        <Form action={createAction} class="card p-4">
          <div class="mb-3">
            <label class="form-label">Schema *</label>
            <select name="schemaId" class="form-control" required>
              <option value="">Select a schema...</option>
              {schemas?.map((schema: JsonSchema) => (
                <option key={schema.id} value={schema.id}>
                  {schema.title || schema.name} - {schema.description || 'No description'}
                </option>
              ))}
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label">Data (JSON)</label>
            <textarea
              name="data"
              class="form-control"
              rows={10}
              placeholder='{"key": "value"}'
              defaultValue="{}"
            />
            <small class="form-text text-muted">
              Enter the entity data as JSON. Must conform to the selected schema.
            </small>
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" onClick$={handleToggleForm} class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Create Entity
            </button>
          </div>
        </Form>
      </div>
    );
  }

  return (
    <div class="entity-list">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3>Entities ({entities?.length || 0})</h3>
        <button onClick$={handleToggleForm} class="btn btn-primary" disabled={!schemas || schemas.length === 0}>
          Create Entity
        </button>
      </div>

      {(!schemas || schemas.length === 0) && (
        <div class="alert alert-warning">
          Please create a schema first before adding entities.
        </div>
      )}

      {createAction.value?.success && (
        <div class="alert alert-success">
          Entity created successfully!
        </div>
      )}

      {createAction.value?.error && (
        <div class="alert alert-danger">
          Error: {createAction.value.error}
        </div>
      )}

      {(!entities || entities.length === 0) && schemas && schemas.length > 0 && (
        <div class="alert alert-info">
          No entities found. Create your first entity to get started.
        </div>
      )}

      {entities && entities.length > 0 && (
        <div class="row">
          {entities.map((entity: Entity) => {
            const schema = schemas?.find(s => s.id === entity.schemaId);
            return (
              <div key={entity.id} class="col-md-6 col-lg-4 mb-3">
                <div class="card">
                  <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">Entity #{entity.id.substring(0, 8)}</h6>
                  </div>
                  <div class="card-body">
                    <p class="small text-muted mb-2">
                      Schema: {schema?.name || 'Unknown'} ({entity.schemaId.substring(0, 8)}...)
                    </p>
                    
                    <div class="entity-data">
                      {Object.keys(entity.data).length === 0 ? (
                        <p class="text-muted small">No data</p>
                      ) : (
                        <div class="small">
                          {Object.entries(entity.data).slice(0, 3).map(([key, value]) => (
                            <div key={key} class="mb-1">
                              <strong>{key}:</strong> {
                                typeof value === 'object' 
                                  ? JSON.stringify(value).substring(0, 30) + '...'
                                  : String(value).substring(0, 30) + (String(value).length > 30 ? '...' : '')
                              }
                            </div>
                          ))}
                          {Object.keys(entity.data).length > 3 && (
                            <div class="text-muted">
                              ... and {Object.keys(entity.data).length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div class="mt-2 pt-2 border-top small text-muted">
                      Updated: {new Date(entity.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});