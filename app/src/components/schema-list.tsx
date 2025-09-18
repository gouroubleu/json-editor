import { component$, useSignal, $ } from '@builder.io/qwik';
import { Form } from '@builder.io/qwik-city';
import { JsonSchema } from '../routes/types';
// import { AdvancedSchemaEditor } from './advanced-schema-editor';

type SchemaListProps = {
  schemas: JsonSchema[];
  createAction: any;
  updateAction: any;
  deleteAction: any;
}

export const SchemaList = component$<SchemaListProps>(({ schemas, createAction, updateAction, deleteAction }) => {
  const showCreateForm = useSignal(false);
  const editingSchema = useSignal<JsonSchema | null>(null);

  const handleToggleCreateForm = $(() => {
    showCreateForm.value = !showCreateForm.value;
    editingSchema.value = null;
  });

  const handleEdit = $((schema: JsonSchema) => {
    editingSchema.value = schema;
    showCreateForm.value = false;
  });

  const handleDelete = $((schema: JsonSchema) => {
    if (confirm(`Are you sure you want to delete schema "${schema.name}"?`)) {
      // Create a form to submit delete action
      const form = document.createElement('form');
      form.style.display = 'none';
      form.method = 'POST';
      form.action = deleteAction.actionPath;
      
      const idInput = document.createElement('input');
      idInput.type = 'hidden';
      idInput.name = 'id';
      idInput.value = schema.id;
      form.appendChild(idInput);
      
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    }
  });

  const handleCancelEdit = $(() => {
    editingSchema.value = null;
    showCreateForm.value = false;
  });

  // Show simple edit form
  if (editingSchema.value) {
    const currentSchema = editingSchema.value;
    return (
      <div class="schema-edit-form">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h3>Edit Schema: {currentSchema.name}</h3>
          <button onClick$={handleCancelEdit} class="btn btn-outline-secondary">
            ← Back to List
          </button>
        </div>

        <Form action={updateAction} class="card p-4">
          <input type="hidden" name="id" value={currentSchema.id} />
          
          <div class="mb-3">
            <label class="form-label">Name *</label>
            <input
              type="text"
              name="name"
              class="form-control"
              value={currentSchema.name}
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Title</label>
            <input
              type="text"
              name="title"
              class="form-control"
              value={currentSchema.title || ''}
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea
              name="description"
              class="form-control"
              rows={3}
              value={currentSchema.description || ''}
            />
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" onClick$={handleCancelEdit} class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Update Schema
            </button>
          </div>
        </Form>
      </div>
    );
  }

  // Show simple create form
  if (showCreateForm.value) {
    return (
      <div class="schema-create-form">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h3>Create New Schema (Simple)</h3>
          <button onClick$={handleToggleCreateForm} class="btn btn-outline-secondary">
            ← Back to List
          </button>
        </div>

        <Form action={createAction} class="card p-4">
          <div class="mb-3">
            <label class="form-label">Name *</label>
            <input
              type="text"
              name="name"
              class="form-control"
              placeholder="e.g., user, product, order"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Title</label>
            <input
              type="text"
              name="title"
              class="form-control"
              placeholder="Human readable title"
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea
              name="description"
              class="form-control"
              rows={3}
              placeholder="Schema description"
            />
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" onClick$={handleToggleCreateForm} class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Create Schema
            </button>
          </div>
        </Form>
      </div>
    );
  }

  return (
    <div class="schema-list">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3>JSON Schemas ({schemas?.length || 0})</h3>
        <button onClick$={handleToggleCreateForm} class="btn btn-primary">
          Create Schema
        </button>
      </div>

      {createAction.value?.success && (
        <div class="alert alert-success">
          Schema "{createAction.value.schema?.name}" created successfully!
        </div>
      )}

      {updateAction.value?.success && (
        <div class="alert alert-success">
          Schema "{updateAction.value.schema?.name}" updated successfully!
        </div>
      )}

      {deleteAction.value?.success && (
        <div class="alert alert-success">
          Schema deleted successfully!
        </div>
      )}

      {(createAction.value?.error || updateAction.value?.error || deleteAction.value?.error) && (
        <div class="alert alert-danger">
          Error: {createAction.value?.error || updateAction.value?.error || deleteAction.value?.error}
        </div>
      )}

      {(!schemas || schemas.length === 0) && (
        <div class="alert alert-info">
          No schemas found. Create your first schema to get started.
        </div>
      )}

      {schemas && schemas.length > 0 && (
        <div class="table-responsive">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Description</th>
                <th>Type</th>
                <th>Properties</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schemas.map((schema: JsonSchema) => (
                <tr key={schema.id}>
                  <td>
                    <strong>{schema.name}</strong>
                  </td>
                  <td>{schema.title || '-'}</td>
                  <td>
                    {schema.description ? (
                      <span title={schema.description}>
                        {schema.description.length > 50 
                          ? `${schema.description.substring(0, 50)}...`
                          : schema.description
                        }
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <span class="badge bg-secondary">{schema.type}</span>
                  </td>
                  <td>
                    <span class="badge bg-info">
                      {Object.keys(schema.properties || {}).length} properties
                    </span>
                  </td>
                  <td>
                    {new Date(schema.updatedAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button
                        onClick$={() => handleEdit(schema)}
                        class="btn btn-outline-primary"
                        title="Edit"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick$={() => handleDelete(schema)}
                        class="btn btn-outline-danger"
                        title="Delete"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});