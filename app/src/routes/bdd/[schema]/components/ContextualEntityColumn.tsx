import { component$, useStore, $, useTask$ } from '@builder.io/qwik';
import { useEntityCreation } from '../../context/entity-creation-context';
import { generateDefaultValue } from '../../services';
import { validateField } from '../../utils/validation';

type ContextualEntityColumnProps = {
  columnIndex: number;
  isReadOnly: boolean;
};

export const ContextualEntityColumn = component$<ContextualEntityColumnProps>((props) => {
  const { store, actions } = useEntityCreation();

  const uiState = useStore({
    editingField: null as string | null,
    editValue: '' as any,
    showJsonEditor: {} as Record<string, boolean>,
    fieldErrors: {} as Record<string, string>,
    fieldValues: {} as Record<string, any> // Pour l'affichage des valeurs
  });

  // Obtenir les données de la colonne depuis le contexte
  const column = store.state.columns[props.columnIndex];

  // Initialiser les valeurs de champs avec les données existantes pour éviter la perte d'affichage
  useTask$(({ track }) => {
    track(() => store.state.columns[props.columnIndex]);

    // Obtenir la colonne courante
    const currentColumn = store.state.columns[props.columnIndex];

    // Réinitialiser les valeurs locales quand la colonne change
    if (currentColumn && currentColumn.data && typeof currentColumn.data === 'object' && !Array.isArray(currentColumn.data)) {
      // Copier les valeurs existantes dans fieldValues pour l'affichage initial
      const initialValues: Record<string, any> = {};
      Object.entries(currentColumn.data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          initialValues[key] = value;
        }
      });

      // Seulement mettre à jour si les valeurs ont changé
      if (Object.keys(initialValues).length > 0) {
        uiState.fieldValues = { ...uiState.fieldValues, ...initialValues };
      }
    }
  });
  if (!column) {
    return <div class="column entity-column">Colonne introuvable</div>;
  }

  const handleDirectSave = $((key: string, newValue: any) => {
    if (props.isReadOnly) return;

    const fieldPath = [...column.path, key];
    const fieldSchema = column.schema.properties?.[key];
    const targetType = fieldSchema?.type || (column.data[key] !== null && column.data[key] !== undefined ? typeof column.data[key] : 'string');

    let convertedValue = newValue;
    switch (targetType) {
      case 'number':
        convertedValue = parseFloat(newValue);
        if (isNaN(convertedValue)) convertedValue = 0;
        break;
      case 'integer':
        convertedValue = parseInt(newValue, 10);
        if (isNaN(convertedValue)) convertedValue = 0;
        break;
      case 'boolean':
        convertedValue = newValue === 'true' || newValue === true;
        break;
      case 'array':
        try {
          convertedValue = JSON.parse(newValue);
          if (!Array.isArray(convertedValue)) convertedValue = [];
        } catch {
          convertedValue = [];
        }
        break;
      case 'object':
        try {
          convertedValue = JSON.parse(newValue);
          if (typeof convertedValue !== 'object' || convertedValue === null) convertedValue = {};
        } catch {
          convertedValue = {};
        }
        break;
      case 'string':
      default:
        convertedValue = String(newValue);
        break;
    }

    actions.updateEntityData(fieldPath, convertedValue);
  });

  const validateAndSave = $((key: string, newValue: any) => {
    if (props.isReadOnly) return;

    // ÉTAPE 1: Mettre à jour l'affichage local immédiatement AVANT tout traitement
    // Utiliser une nouvelle référence d'objet pour garantir la réactivité Qwik
    const newFieldValues = { ...uiState.fieldValues };
    newFieldValues[key] = newValue;
    uiState.fieldValues = newFieldValues;

    // ÉTAPE 2: Sauvegarder la valeur (toujours en premier)
    handleDirectSave(key, newValue);

    // ÉTAPE 3: Validation et gestion des erreurs (sans affecter l'affichage)
    const fieldSchema = column.schema.properties?.[key];
    if (fieldSchema) {
      const validation = validateField(newValue, fieldSchema, key);

      // Créer un nouvel objet d'erreurs pour garantir la réactivité
      const newErrors = { ...uiState.fieldErrors };

      if (!validation.isValid) {
        newErrors[key] = validation.errors[0];
      } else {
        // Supprimer l'erreur si validation réussie
        delete newErrors[key];
      }

      uiState.fieldErrors = newErrors;
    }
  });

  const handleArrayItemSave = $((newValue: any) => {
    if (props.isReadOnly || column.arrayIndex === undefined) return;

    const targetType = column.schema.type || (column.data !== null && column.data !== undefined ? typeof column.data : 'string');

    let convertedValue = newValue;
    switch (targetType) {
      case 'number':
        convertedValue = parseFloat(newValue);
        if (isNaN(convertedValue)) convertedValue = 0;
        break;
      case 'integer':
        convertedValue = parseInt(newValue, 10);
        if (isNaN(convertedValue)) convertedValue = 0;
        break;
      case 'boolean':
        convertedValue = newValue === 'true' || newValue === true;
        break;
      case 'string':
      default:
        convertedValue = String(newValue);
        break;
    }

    actions.updateEntityData(column.path, convertedValue);
  });

  const getValueDisplay = (value: any): string => {
    if (value === null || value === undefined) return '(vide)';
    if (typeof value === 'string' && value === '') return '(chaîne vide)';
    if (typeof value === 'boolean') return value ? '✅ true' : '❌ false';
    if (Array.isArray(value)) return `[${value.length} éléments]`;
    if (typeof value === 'object') return `{${Object.keys(value).length} propriétés}`;
    if (typeof value === 'string' && value.length > 50) {
      return `"${value.substring(0, 50)}..."`;
    }
    return String(value);
  };

  // Fonction centralisée pour obtenir la valeur d'affichage d'un champ
  const getFieldDisplayValue = (key: string, originalValue: any): string => {
    // Priorité 1: Valeur en cours de saisie (uiState.fieldValues)
    if (uiState.fieldValues[key] !== undefined) {
      const displayValue = uiState.fieldValues[key];
      if (displayValue === null || displayValue === undefined) return '';
      return String(displayValue);
    }

    // Priorité 2: Valeur originale des données
    if (originalValue === null || originalValue === undefined) return '';
    return String(originalValue);
  };

  const getFieldIcon = (type?: string, value?: any) => {
    if (type) {
      switch (type) {
        case 'string': return '📝';
        case 'number': return '🔢';
        case 'integer': return '🔢';
        case 'boolean': return '☑️';
        case 'select': return '🔽';
        case 'array': return '📋';
        case 'object': return '📁';
        default: return '📄';
      }
    }

    if (value !== null && value !== undefined) {
      if (typeof value === 'string') return '📝';
      if (typeof value === 'number') return '🔢';
      if (typeof value === 'boolean') return '☑️';
      if (Array.isArray(value)) return '📋';
      if (typeof value === 'object') return '📁';
    }

    return '📄';
  };

  const canExpand = (value: any, fieldSchema?: any) => {

    // PRIORITÉ ABSOLUE : Si le schéma définit que c'est navigable, on peut naviguer !
    if (fieldSchema) {
      // Si c'est un objet avec des propriétés définies dans le schéma → NAVIGABLE
      if (fieldSchema.type === 'object' && fieldSchema.properties && Object.keys(fieldSchema.properties).length > 0) {
        console.log('✅ Navigable par SCHÉMA (objet avec propriétés)');
        return true;
      }
      // Si c'est un array avec des items définis → NAVIGABLE
      if (fieldSchema.type === 'array' && fieldSchema.items) {
        console.log('✅ Navigable par SCHÉMA (array avec items)');
        return true;
      }
    }

    // Sinon, vérifier la valeur (mais moins prioritaire)
    const result = value !== null && value !== undefined && (typeof value === 'object' || Array.isArray(value)) &&
           ((Array.isArray(value) && value.length > 0) || (typeof value === 'object' && Object.keys(value).length > 0));

    console.log('🔍 Navigable par DATA:', result);
    return result;
  };

  const renderField = (key: string, value: any, schema: any) => {
    const fieldSchema = schema.properties?.[key];
    const isRequired = schema.required?.includes(key);
    const canExpanded = canExpand(value, fieldSchema);


    // Debug spécifique pour adresse
    if (key === 'adresse') {
      console.log('🚨 DEBUG ADRESSE:', {
        key,
        value,
        fieldSchema,
        canExpanded,
        schemaType: fieldSchema?.type,
        hasItems: !!fieldSchema?.items
      });
    }

    // Debug logs for navigation issue at level 3+
    if (key === 'test' && column.level >= 2) {
      console.log('🐛 DEBUG renderField - key "test" at level', column.level, {
        key,
        value,
        canExpanded,
        valueType: typeof value,
        isArray: Array.isArray(value),
        columnIndex: props.columnIndex,
        columnPath: column.path,
        columnData: column.data
      });
    }

    const isPrimitiveValue = (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null ||
      value === undefined
    );

    const isEditableComplex = (
      Array.isArray(value)
      // SUPPRIMÉ: Les objets ne sont JAMAIS éditables, toujours navigables !
    );

    const canEdit = !props.isReadOnly && (isPrimitiveValue || isEditableComplex);

    return (
      <div key={key} class="field-item">
        <div class="field-header">
          <div class="field-info">
            <span class="field-icon">{getFieldIcon(fieldSchema?.type, value)}</span>
            <span class="field-name">
              {key}
              {isRequired && <span class="required-asterisk">*</span>}
            </span>
            <span class="field-type">{fieldSchema?.type || (value !== null && value !== undefined ? typeof value : 'unknown')}</span>
          </div>

          <div class="field-actions">
            {canExpanded && (
              <button
                class="btn btn-xs btn-outline"
                onClick$={() => actions.navigateToProperty(key, props.columnIndex)}
                title="Explorer"
              >
                →
              </button>
            )}
          </div>
        </div>

        {fieldSchema?.description && (
          <div class="field-description">{fieldSchema.description}</div>
        )}

        <div class="field-value">
          {canEdit ? (
            <div class="direct-edit-container">
              {fieldSchema?.type === 'boolean' ? (
                <select
                  class="direct-edit-input"
                  value={getFieldDisplayValue(key, value)}
                  onChange$={(e) => {
                    const target = e.target as HTMLSelectElement;
                    validateAndSave(key, target.value === 'true');
                  }}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : fieldSchema?.type === 'select' && fieldSchema?.options ? (
                <select
                  class="direct-edit-input"
                  value={getFieldDisplayValue(key, value)}
                  onChange$={(e) => {
                    const target = e.target as HTMLSelectElement;
                    validateAndSave(key, target.value);
                  }}
                >
                  <option value="">Sélectionner...</option>
                  {fieldSchema.options.map((option: any) => (
                    <option key={option.key} value={option.key}>{option.value}</option>
                  ))}
                </select>
              ) : fieldSchema?.enum ? (
                <select
                  class="direct-edit-input"
                  value={getFieldDisplayValue(key, value)}
                  onChange$={(e) => {
                    const target = e.target as HTMLSelectElement;
                    validateAndSave(key, target.value);
                  }}
                >
                  {fieldSchema.enum.map((option: any) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (fieldSchema?.type === 'array') ? (
                <div class="array-json-container">
                  <button
                    class="btn btn-xs btn-outline"
                    onClick$={() => {
                      uiState.showJsonEditor[key] = !uiState.showJsonEditor[key];
                    }}
                  >
                    {uiState.showJsonEditor[key] ? '📄 Masquer JSON' : '📝 Éditer en JSON'}
                  </button>

                  {uiState.showJsonEditor[key] && (
                    <textarea
                      class="direct-edit-textarea"
                      value={(() => {
                        if (value === null || value === undefined) return '';
                        return JSON.stringify(value, null, 2);
                      })()}
                      onChange$={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        validateAndSave(key, target.value);
                      }}
                      rows={4}
                      placeholder="Entrez un array JSON valide..."
                    />
                  )}
                </div>
              ) : (
                <input
                  class="direct-edit-input"
                  type={(() => {
                    const editType = fieldSchema?.type || typeof value;
                    return (editType === 'number' || editType === 'integer') ? 'number' : 'text';
                  })()}
                  value={getFieldDisplayValue(key, value)}
                  onChange$={(e) => {
                    const target = e.target as HTMLInputElement;
                    validateAndSave(key, target.value);
                  }}
                  min={fieldSchema?.minimum}
                  max={fieldSchema?.maximum}
                  minLength={fieldSchema?.minLength}
                  maxLength={fieldSchema?.maxLength}
                  step={fieldSchema?.type === 'integer' ? '1' : 'any'}
                  placeholder={`Entrez ${fieldSchema?.type || 'une valeur'}...`}
                />
              )}
            </div>
          ) : (
            <div
              class={`value-display ${canExpanded ? 'expandable' : ''}`}
              onClick$={() => canExpanded ? actions.navigateToProperty(key, props.columnIndex) : undefined}
            >
              {getValueDisplay(value)}
            </div>
          )}
        </div>

        {/* Affichage des erreurs de validation */}
        {uiState.fieldErrors[key] && (
          <div class="field-error" style="color: #dc3545; font-size: 0.875rem; margin-top: 0.25rem; padding: 0.25rem; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
            ⚠️ {uiState.fieldErrors[key]}
          </div>
        )}

        {fieldSchema && (
          <div class="field-constraints">
            {fieldSchema.minLength && <span class="constraint">Min: {fieldSchema.minLength}</span>}
            {fieldSchema.maxLength && <span class="constraint">Max: {fieldSchema.maxLength}</span>}
            {fieldSchema.minimum !== undefined && <span class="constraint">Min: {fieldSchema.minimum}</span>}
            {fieldSchema.maximum !== undefined && <span class="constraint">Max: {fieldSchema.maximum}</span>}
            {fieldSchema.enum && <span class="constraint">Options: {fieldSchema.enum.join(', ')}</span>}
          </div>
        )}
      </div>
    );
  };

  const handleAddArrayItem = $(() => {
    if (props.isReadOnly) return;

    actions.addArrayElement(column.path, column.schema);
  });

  const handleRemoveArrayItem = $((index: number) => {
    if (props.isReadOnly) return;

    actions.removeArrayElement(column.path, index);
  });

  const handleValidateTemporaryItem = $((index: number) => {
    if (props.isReadOnly) return;

    const currentArray = [...column.data];
    const item = currentArray[index];

    if (item && item._temporary) {
      // Enlever le marqueur temporaire
      delete item._temporary;
      actions.updateEntityData(column.path, currentArray);
    }
  });

  const renderArrayItems = (arrayData: any[]) => {
    return arrayData.map((item, index) => {
      const isTemporary = item && item._temporary === true;

      return (
        <div key={index} class={`array-item ${isTemporary ? 'temporary-item' : ''}`}>
          <div class="array-item-header">
            <span class="array-index">[{index}]</span>
            <span class="array-item-type">{typeof item}</span>
            {isTemporary && <span class="temporary-badge">⏳ Temporaire</span>}
            <div class="array-item-actions">
              {isTemporary && !props.isReadOnly && (
                <button
                  class="btn btn-xs btn-success"
                  onClick$={() => handleValidateTemporaryItem(index)}
                  title="Valider cet élément"
                >
                  ✅
                </button>
              )}
              <button
                class="btn btn-xs btn-outline"
                onClick$={() => actions.navigateToArrayItem(index, props.columnIndex)}
                title="Explorer cet élément"
              >
                →
              </button>
              {!props.isReadOnly && (
                <button
                  class="btn btn-xs btn-danger"
                  onClick$={() => handleRemoveArrayItem(index)}
                  title="Supprimer cet élément"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
          <div
            class="array-item-preview"
            onClick$={() => actions.navigateToArrayItem(index, props.columnIndex)}
          >
            {getValueDisplay(item)}
          </div>
        </div>
      );
    });
  };

  return (
    <div class="column entity-column" style={{ width: '400px', minWidth: '400px' }}>
      {/* Header de la colonne */}
      <div class="column-header">
        {column.level > 0 && (
          <button
            class="back-button"
            onClick$={() => actions.goBack(props.columnIndex)}
          >
            ←
          </button>
        )}
        <h3 class="column-title">{column.parentName}</h3>
        <span class="column-level">Niveau {column.level}</span>
      </div>

      {/* Contenu de la colonne */}
      <div class="column-content">
        {column.isArray ? (
          <div class="array-container">
            <div class="array-header">
              <div class="array-info">
                <span class="array-icon">📋</span>
                <span class="array-count">{Array.isArray(column.data) ? column.data.length : 0} élément{(Array.isArray(column.data) ? column.data.length : 0) !== 1 ? 's' : ''}</span>
              </div>
              {!props.isReadOnly && (
                <div class="array-actions">
                  <button
                    class="btn btn-sm btn-primary"
                    onClick$={handleAddArrayItem}
                    title="Ajouter un nouvel élément"
                  >
                    ➕ Ajouter
                  </button>
                </div>
              )}
            </div>
            <div class="array-items">
              {Array.isArray(column.data) && column.data.length > 0 ? (
                <>
                  {renderArrayItems(column.data)}
                  {!props.isReadOnly && (
                    <div class="add-array-item">
                      <button
                        class="add-item-button"
                        onClick$={handleAddArrayItem}
                      >
                        <span class="add-icon">➕</span>
                        Ajouter un élément
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div class="empty-array">
                  <div class="empty-array-message">
                    <div class="empty-icon">📋</div>
                    <div class="empty-text">Tableau vide</div>
                    {!props.isReadOnly && (
                      <button
                        class="btn btn-sm btn-primary"
                        onClick$={handleAddArrayItem}
                        style="margin-top: 0.5rem;"
                      >
                        ➕ Ajouter un élément
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : column.arrayIndex !== undefined ? (
          // Cas spécial: édition d'un élément d'array individuel
          <div class="object-container">
            {typeof column.data === 'object' && column.data !== null && !Array.isArray(column.data) ? (
              <div class="object-fields">
                {/* Propriétés définies dans le schéma */}
                {column.schema.properties && Object.keys(column.schema.properties).map((key) => {
                  const value = column.data[key];
                  return renderField(key, value, column.schema);
                })}

                {/* Propriétés supplémentaires dans les données */}
                {Object.entries(column.data)
                  .filter(([key]) => !column.schema.properties?.[key])
                  .map(([key, value]) => {
                    return renderField(key, value, column.schema);
                  })}
              </div>
            ) : (
              // Élément primitif
              <div class="object-fields">
                <div class="field-item">
                  <div class="field-header">
                    <div class="field-info">
                      <span class="field-icon">{getFieldIcon(column.schema.type, column.data)}</span>
                      <span class="field-name">Valeur</span>
                      <span class="field-type">{column.schema.type || typeof column.data}</span>
                    </div>
                  </div>

                  <div class="field-value">
                    {!props.isReadOnly ? (
                      <div class="direct-edit-container">
                        {column.schema.type === 'boolean' ? (
                          <select
                            class="direct-edit-input"
                            value={String(column.data)}
                            onChange$={(e) => {
                              const target = e.target as HTMLSelectElement;
                              handleArrayItemSave(target.value === 'true');
                            }}
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : column.schema.type === 'select' && column.schema.options ? (
                          <select
                            class="direct-edit-input"
                            value={String(column.data)}
                            onChange$={(e) => {
                              const target = e.target as HTMLSelectElement;
                              handleArrayItemSave(target.value);
                            }}
                          >
                            <option value="">Sélectionner...</option>
                            {column.schema.options.map((option: any) => (
                              <option key={option.key} value={option.key}>{option.value}</option>
                            ))}
                          </select>
                        ) : column.schema.enum ? (
                          <select
                            class="direct-edit-input"
                            value={String(column.data)}
                            onChange$={(e) => {
                              const target = e.target as HTMLSelectElement;
                              handleArrayItemSave(target.value);
                            }}
                          >
                            {column.schema.enum.map((option: any) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            class="direct-edit-input"
                            type={(() => {
                              const editType = column.schema.type || typeof column.data;
                              return (editType === 'number' || editType === 'integer') ? 'number' : 'text';
                            })()}
                            value={(() => {
                              if (column.data === null || column.data === undefined) return '';
                              return String(column.data);
                            })()}
                            onChange$={(e) => {
                              const target = e.target as HTMLInputElement;
                              handleArrayItemSave(target.value);
                            }}
                            min={column.schema.minimum}
                            max={column.schema.maximum}
                            step={column.schema.type === 'integer' ? '1' : 'any'}
                            placeholder={`Entrez ${column.schema.type || 'une valeur'}...`}
                          />
                        )}
                      </div>
                    ) : (
                      <div class="value-display">
                        {getValueDisplay(column.data)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Cas normal: objet avec propriétés
          <div class="object-container">
            <div class="object-fields">
              {/* Afficher toutes les propriétés définies dans le schéma */}
              {column.schema.properties && Object.keys(column.schema.properties).map((key) => {
                const value = column.data[key];
                return renderField(key, value, column.schema);
              })}

              {/* Afficher les propriétés supplémentaires dans les données qui ne sont pas dans le schéma */}
              {Object.entries(column.data)
                .filter(([key]) => !column.schema.properties?.[key])
                .map(([key, value]) => {
                  return renderField(key, value, column.schema);
                })}
            </div>

            {(!column.schema.properties || Object.keys(column.schema.properties).length === 0) && Object.keys(column.data).length === 0 && (
              <div class="empty-state">
                <div class="empty-icon">📄</div>
                <div class="empty-message">Aucune propriété définie dans le schéma</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});