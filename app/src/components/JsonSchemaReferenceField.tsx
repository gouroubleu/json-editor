import { component$, useStore, useTask$, type PropFunction, $ } from '@builder.io/qwik';
import type { SchemaProperty, AvailableSchema } from '../routes/types';
import { resolveSchemaReference } from '../routes/services';

type JsonSchemaReferenceFieldProps = {
  property: SchemaProperty;
  value: any;
  isReadOnly?: boolean;
  availableSchemas?: AvailableSchema[];
  onValueChange$?: PropFunction<(newValue: any) => void>;
  onOpenSubForm$?: PropFunction<(schemaName: string, value: any) => void>;
};

export const JsonSchemaReferenceField = component$<JsonSchemaReferenceFieldProps>((props) => {
  const state = useStore({
    resolvedSchema: null as any,
    isLoading: false,
    error: null as string | null,
    showSubForm: false,
    selectedValue: null as any
  });

  // Résoudre le schéma référencé
  useTask$(async ({ track }) => {
    const property = track(() => props.property);

    if (property.type === 'jsonschema' && property.$refMetadata?.schemaName) {
      state.isLoading = true;
      state.error = null;

      try {
        const resolved = await resolveSchemaReference(
          property.$refMetadata.schemaName,
          property.$refMetadata.schemaVersion
        );

        if (resolved) {
          state.resolvedSchema = resolved;
        } else {
          state.error = `Schema '${property.$refMetadata.schemaName}' non trouvé`;
        }
      } catch (error) {
        state.error = `Erreur lors de la résolution: ${error}`;
      } finally {
        state.isLoading = false;
      }
    }
  });

  const handleSelectReference = $(async (selectedId: string) => {
    if (!props.property.$refMetadata?.schemaName || !props.onValueChange$) return;

    // Pour l'instant, on stocke juste l'ID de la référence
    // Dans un système complet, on pourrait récupérer l'entité complète
    const newValue = props.property.$refMetadata.multiple
      ? [...(props.value || []), selectedId]
      : selectedId;

    await props.onValueChange$(newValue);
  });

  const handleRemoveReference = $(async (index?: number) => {
    if (!props.onValueChange$) return;

    if (props.property.$refMetadata?.multiple && typeof index === 'number') {
      const newValue = [...(props.value || [])];
      newValue.splice(index, 1);
      await props.onValueChange$(newValue);
    } else {
      await props.onValueChange$(null);
    }
  });

  const handleOpenSubForm = $((referenceValue: any) => {
    if (props.onOpenSubForm$ && props.property.$refMetadata?.schemaName) {
      props.onOpenSubForm$(props.property.$refMetadata.schemaName, referenceValue);
    }
  });

  if (props.property.type !== 'jsonschema') {
    return <div>Composant non applicable pour ce type de propriété</div>;
  }

  const metadata = props.property.$refMetadata;
  if (!metadata?.schemaName) {
    return (
      <div class="jsonschema-field error">
        <span class="error-message">⚠️ Référence JSON Schema non configurée</span>
      </div>
    );
  }

  return (
    <div class="jsonschema-field">
      <div class="reference-header">
        <h4>🔗 {metadata.title || `Référence ${metadata.schemaName}`}</h4>
        <div class="reference-info">
          <span class="schema-name">Schema: {metadata.schemaName}</span>
          {metadata.schemaVersion && <span class="schema-version">v{metadata.schemaVersion}</span>}
          {metadata.multiple && <span class="multiple-badge">Multiple</span>}
        </div>
      </div>

      {state.isLoading && (
        <div class="loading">⏳ Chargement du schéma...</div>
      )}

      {state.error && (
        <div class="error">⚠️ {state.error}</div>
      )}

      {!state.isLoading && !state.error && (
        <div class="reference-content">
          {metadata.multiple ? (
            // Mode multiple (array)
            <div class="multiple-references">
              <div class="current-values">
                {props.value && Array.isArray(props.value) && props.value.length > 0 ? (
                  <ul class="reference-list">
                    {props.value.map((refValue: any, index: number) => (
                      <li key={index} class="reference-item">
                        <span class="reference-display">
                          {typeof refValue === 'object' ? JSON.stringify(refValue) : String(refValue)}
                        </span>
                        <div class="reference-actions">
                          <button
                            class="btn btn-sm btn-info"
                            onClick$={() => handleOpenSubForm(refValue)}
                            disabled={props.isReadOnly}
                          >
                            ✏️ Éditer
                          </button>
                          <button
                            class="btn btn-sm btn-danger"
                            onClick$={() => handleRemoveReference(index)}
                            disabled={props.isReadOnly}
                          >
                            🗑️
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div class="empty-references">Aucune référence</div>
                )}
              </div>

              {!props.isReadOnly && (
                <div class="add-reference">
                  <input
                    class="input"
                    type="text"
                    placeholder={`Ajouter une référence ${metadata.schemaName}...`}
                    onKeyDown$={(event) => {
                      if (event.key === 'Enter') {
                        const input = event.target as HTMLInputElement;
                        if (input.value.trim()) {
                          handleSelectReference(input.value.trim());
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    class="btn btn-primary btn-sm"
                    onClick$={() => handleOpenSubForm({})}
                  >
                    ➕ Nouveau
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Mode simple
            <div class="single-reference">
              {props.value ? (
                <div class="current-reference">
                  <div class="reference-display">
                    {typeof props.value === 'object' ? JSON.stringify(props.value) : String(props.value)}
                  </div>
                  <div class="reference-actions">
                    <button
                      class="btn btn-info btn-sm"
                      onClick$={() => handleOpenSubForm(props.value)}
                      disabled={props.isReadOnly}
                    >
                      ✏️ Éditer
                    </button>
                    <button
                      class="btn btn-danger btn-sm"
                      onClick$={() => handleRemoveReference()}
                      disabled={props.isReadOnly}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <div class="no-reference">
                  <span class="empty-text">Aucune référence sélectionnée</span>
                  {!props.isReadOnly && (
                    <div class="select-reference">
                      <input
                        class="input"
                        type="text"
                        placeholder={`Référence ${metadata.schemaName}...`}
                        onKeyDown$={(event) => {
                          if (event.key === 'Enter') {
                            const input = event.target as HTMLInputElement;
                            if (input.value.trim()) {
                              handleSelectReference(input.value.trim());
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        class="btn btn-primary btn-sm"
                        onClick$={() => handleOpenSubForm({})}
                      >
                        ➕ Nouveau
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Informations sur le schéma résolu */}
          {state.resolvedSchema && (
            <div class="resolved-schema-info">
              <details>
                <summary>ℹ️ Informations du schéma {metadata.schemaName}</summary>
                <div class="schema-details">
                  <div><strong>Titre:</strong> {state.resolvedSchema.title}</div>
                  <div><strong>Description:</strong> {state.resolvedSchema.description}</div>
                  <div><strong>Type:</strong> {state.resolvedSchema.type}</div>
                  {state.resolvedSchema.properties && (
                    <div>
                      <strong>Propriétés:</strong> {Object.keys(state.resolvedSchema.properties).join(', ')}
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      <style>{`
        .jsonschema-field {
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 1rem;
          margin: 0.5rem 0;
        }

        .reference-header h4 {
          margin: 0 0 0.5rem 0;
          color: #495057;
        }

        .reference-info {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .schema-name, .schema-version, .multiple-badge {
          background: #e9ecef;
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.875rem;
        }

        .multiple-badge {
          background: #d4edda;
          color: #155724;
        }

        .reference-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem 0;
        }

        .reference-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          background: #f8f9fa;
        }

        .reference-display {
          font-family: monospace;
          flex: 1;
          margin-right: 0.5rem;
        }

        .reference-actions {
          display: flex;
          gap: 0.25rem;
        }

        .add-reference, .select-reference {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .add-reference input, .select-reference input {
          flex: 1;
        }

        .resolved-schema-info {
          margin-top: 1rem;
          border-top: 1px solid #dee2e6;
          padding-top: 1rem;
        }

        .schema-details {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #6c757d;
        }

        .schema-details > div {
          margin-bottom: 0.25rem;
        }

        .loading, .error, .empty-references, .empty-text {
          color: #6c757d;
          font-style: italic;
          text-align: center;
          padding: 1rem;
        }

        .error {
          color: #dc3545;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
});