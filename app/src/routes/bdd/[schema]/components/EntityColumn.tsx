import { component$, useStore, useTask$, type PropFunction, $ } from '@builder.io/qwik';
import { generateDefaultValue } from '../../services';

type EntityColumnProps = {
  data: any;
  schema: any;
  path: string[];
  parentName: string;
  level: number;
  isArray?: boolean;
  arrayIndex?: number;
  selectedPath: string[];
  columnIndex: number;
  isReadOnly: boolean;
  onSelectProperty$: PropFunction<(key: string, columnIndex: number) => void>;
  onSelectArrayItem$: PropFunction<(arrayIndex: number, columnIndex: number) => void>;
  onGoBack$: PropFunction<(columnIndex: number) => void>;
  onDataChange$?: PropFunction<(path: string[], newValue: any) => void>;
};

export const EntityColumn = component$<EntityColumnProps>((props) => {

  const uiState = useStore({
    editingField: null as string | null,
    editValue: '' as any,
    showJsonEditor: {} as Record<string, boolean>, // Pour masquer/afficher les textareas JSON par champ
    cachedData: props.data // Cache local des données
  });

  // Synchroniser le cache avec les props
  useTask$(({ track }) => {
    track(() => props.data);
    uiState.cachedData = props.data;
  });



  const handleStartEdit = $((key: string, currentValue: any) => {
    if (props.isReadOnly) return;
    
    uiState.editingField = key;
    uiState.editValue = currentValue;
  });

  const handleSaveEdit = $((key: string) => {
    if (!props.onDataChange$) return;
    
    const fieldPath = [...props.path, key];
    const fieldSchema = props.schema.properties?.[key];
    const currentValue = props.data[key];
    
    console.log('🔧 EntityColumn - handleSaveEdit appelé:', {
      key,
      fieldPath,
      editValue: uiState.editValue,
      currentPropsData: currentValue,
      fieldSchema: fieldSchema?.type,
      inferredType: currentValue !== null ? typeof currentValue : 'null'
    });
    
    // Convertir la valeur selon le type du schéma OU le type inféré de la valeur actuelle
    let convertedValue = uiState.editValue;
    const targetType = fieldSchema?.type || (currentValue !== null && currentValue !== undefined ? typeof currentValue : 'string');
    
    switch (targetType) {
      case 'number':
        convertedValue = parseFloat(uiState.editValue);
        if (isNaN(convertedValue)) convertedValue = 0;
        break;
      case 'integer':
        convertedValue = parseInt(uiState.editValue, 10);
        if (isNaN(convertedValue)) convertedValue = 0;
        break;
      case 'boolean':
        convertedValue = uiState.editValue === 'true' || uiState.editValue === true;
        break;
      case 'array':
        try {
          convertedValue = JSON.parse(uiState.editValue);
          if (!Array.isArray(convertedValue)) convertedValue = [];
        } catch {
          convertedValue = [];
        }
        break;
      case 'object':
        try {
          convertedValue = JSON.parse(uiState.editValue);
          if (typeof convertedValue !== 'object' || convertedValue === null) convertedValue = {};
        } catch {
          convertedValue = {};
        }
        break;
      case 'string':
      default:
        convertedValue = String(uiState.editValue);
        break;
    }
    
    console.log('🔧 EntityColumn - convertedValue:', convertedValue, 'targetType:', targetType);
    
    // Sauvegarder la valeur localement avant de notifier le parent
    uiState.localData[key] = convertedValue;
    
    props.onDataChange$(fieldPath, convertedValue);
    uiState.editingField = null;
    
    console.log('🔧 EntityColumn - Après onDataChange, props.data[key]:', props.data[key]);
  });

  // Nouvelle fonction pour sauvegarder les modifications d'un élément d'array individuel
  const handleSaveArrayItemEdit = $(() => {
    if (!props.onDataChange$ || props.arrayIndex === undefined) return;
    
    console.log('🔧 EntityColumn - handleSaveArrayItemEdit appelé:', {
      arrayIndex: props.arrayIndex,
      editValue: uiState.editValue,
      currentData: props.data,
      schema: props.schema,
      path: props.path
    });
    
    // Convertir la valeur selon le type du schéma de l'item
    let convertedValue = uiState.editValue;
    const targetType = props.schema.type || (props.data !== null && props.data !== undefined ? typeof props.data : 'string');
    
    switch (targetType) {
      case 'number':
        convertedValue = parseFloat(uiState.editValue);
        if (isNaN(convertedValue)) convertedValue = 0;
        break;
      case 'integer':
        convertedValue = parseInt(uiState.editValue, 10);
        if (isNaN(convertedValue)) convertedValue = 0;
        break;
      case 'boolean':
        convertedValue = uiState.editValue === 'true' || uiState.editValue === true;
        break;
      case 'string':
      default:
        convertedValue = String(uiState.editValue);
        break;
    }
    
    console.log('🔧 EntityColumn - Array item convertedValue:', convertedValue, 'targetType:', targetType);
    
    // Pour un élément d'array, le path doit inclure l'index
    const itemPath = [...props.path];
    
    // Notifier le parent avec le nouveau value pour cet index spécifique
    props.onDataChange$(itemPath, convertedValue);
    uiState.editingField = null;
    
    console.log('🔧 EntityColumn - Après array item save');
  });

  const handleCancelEdit = $(() => {
    uiState.editingField = null;
    uiState.editValue = '';
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

  const getFieldIcon = (type?: string, value?: any) => {
    // Si on a un type explicite, l'utiliser
    if (type) {
      switch (type) {
        case 'string': return '📝';
        case 'number': return '🔢';
        case 'integer': return '🔢';
        case 'boolean': return '☑️';
        case 'array': return '📋';
        case 'object': return '📁';
        default: return '📄';
      }
    }
    
    // Si pas de type, inférer à partir de la valeur
    if (value !== null && value !== undefined) {
      if (typeof value === 'string') return '📝';
      if (typeof value === 'number') return '🔢';
      if (typeof value === 'boolean') return '☑️';
      if (Array.isArray(value)) return '📋';
      if (typeof value === 'object') return '📁';
    }
    
    return '📄';
  };

  const canExpand = (value: any) => {
    return value !== null && value !== undefined && (typeof value === 'object' || Array.isArray(value));
  };

  const renderField = (key: string, value: any, schema: any) => {
    const fieldSchema = schema.properties?.[key];
    const isRequired = schema.required?.includes(key);
    const canExpanded = canExpand(value);
    
    // Déterminer si on peut éditer ce champ directement
    const isPrimitiveValue = (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null ||
      value === undefined
    );
    
    const isEditableComplex = (
      Array.isArray(value) ||
      (typeof value === 'object' && value !== null && Object.keys(value).length === 0)
    );
    
    const canEdit = !props.isReadOnly && (isPrimitiveValue || isEditableComplex);

    // NOUVEAU: Fonction pour sauvegarder directement lors du changement
    const handleDirectSave = $((newValue: any) => {
      if (!props.onDataChange$) return;
      
      const fieldPath = [...props.path, key];
      const targetType = fieldSchema?.type || (value !== null && value !== undefined ? typeof value : 'string');
      
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
      
      // Notifier le parent directement - pas de cache local


      props.onDataChange$(fieldPath, convertedValue);
    });

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
                onClick$={() => props.onSelectProperty$(key, props.columnIndex)}
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
            // NOUVEAU: Input direct sans mode édition - UTILISE props.data pour la réactivité
            <div class="direct-edit-container">
              {fieldSchema?.type === 'boolean' ? (
                <select
                  class="direct-edit-input"
                  value={String(props.data[key])}
                  onChange$={(e) => {
                    const target = e.target as HTMLSelectElement;
                    handleDirectSave(target.value === 'true');
                  }}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : fieldSchema?.enum ? (
                <select
                  class="direct-edit-input"
                  value={String(props.data[key])}
                  onChange$={(e) => {
                    const target = e.target as HTMLSelectElement;
                    handleDirectSave(target.value);
                  }}
                >
                  {fieldSchema.enum.map((option: any) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (fieldSchema?.type === 'array') ? (
                // Pour les arrays : bouton pour afficher/masquer le JSON
                <div class="array-json-container">
                  <button
                    class="btn btn-xs btn-outline"
                    onClick$={() => {
                      const wasHidden = !uiState.showJsonEditor[key];
                      uiState.showJsonEditor[key] = !uiState.showJsonEditor[key];

                      // Simple toggle - pas de cache
                    }}
                  >
                    {uiState.showJsonEditor[key] ? '📄 Masquer JSON' : '📝 Éditer en JSON'}
                  </button>
                  
                  {uiState.showJsonEditor[key] && (
                    <textarea
                      class="direct-edit-textarea"
                      value={(() => {
                        const val = props.data[key];
                        if (val === null || val === undefined) return '';
                        if (fieldSchema?.type === 'array' || fieldSchema?.type === 'object') return JSON.stringify(val, null, 2);
                        return String(val);
                      })()}
                      onChange$={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        handleDirectSave(target.value);
                      }}
                      rows={4}
                      placeholder="Entrez un array JSON valide..."
                    />
                  )}
                </div>
              ) : (fieldSchema?.type === 'object') ? (
                // Pour les objects : textarea toujours visible
                <textarea
                  class="direct-edit-textarea"
                  value={(() => {
                    const val = props.data[key];
                    if (val === null || val === undefined) return '';
                    if (fieldSchema?.type === 'array' || fieldSchema?.type === 'object') return JSON.stringify(val, null, 2);
                    return String(val);
                  })()}
                  onChange$={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    handleDirectSave(target.value);
                  }}
                  rows={4}
                  placeholder="Entrez un object JSON valide..."
                />
              ) : (
                <input
                  class="direct-edit-input"
                  type={(() => {
                    const editType = fieldSchema?.type || typeof props.data[key];
                    return (editType === 'number' || editType === 'integer') ? 'number' : 'text';
                  })()}
                  value={(() => {
                    const val = props.data[key];
                    if (val === null || val === undefined) return '';
                    return String(val);
                  })()}
                  onChange$={(e) => {
                    const target = e.target as HTMLInputElement;
                    handleDirectSave(target.value);
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
            // Pour les valeurs non-éditables (objets complexes, readonly, etc.)
            <div 
              class={`value-display ${canExpanded ? 'expandable' : ''}`}
              onClick$={() => canExpanded ? props.onSelectProperty$(key, props.columnIndex) : undefined}
            >
              {getValueDisplay(value)}
            </div>
          )}
        </div>

        {/* Validation info */}
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
    console.log('🔧 EntityColumn - handleAddArrayItem appelé:', {
      path: props.path,
      currentData: props.data,
      arrayLength: props.data?.length || 0,
      schema: props.schema
    });

    // Ajouter un nouvel élément vide basé sur le schéma de l'item
    const newItem = generateDefaultValue(props.schema.items);
    const newArray = [...props.data, newItem];
    const fieldPath = [...props.path];

    console.log('🔧 EntityColumn - Nouvel élément créé:', newItem);
    console.log('🔧 EntityColumn - Nouveau tableau:', newArray);

    // Sauvegarder les nouvelles données
    props.onDataChange$?.(fieldPath, newArray);

    // Navigation automatique vers le nouvel élément ajouté
    const newItemIndex = newArray.length - 1; // Index du nouvel élément (dernier)
    console.log('🔧 EntityColumn - Navigation vers l\'élément index:', newItemIndex);

    // Déclencher la sélection du nouvel élément pour naviguer automatiquement
    props.onSelectArrayItem$?.(newItemIndex, props.columnIndex);
  });
  
  const handleRemoveArrayItem = $((index: number) => {
    console.log('🔧 EntityColumn - handleRemoveArrayItem appelé:', {
      index,
      path: props.path,
      currentArray: props.data
    });
    
    // Supprimer cet élément du tableau
    const newArray = props.data.filter((_: any, i: number) => i !== index);
    const fieldPath = [...props.path];
    
    console.log('🔧 EntityColumn - Tableau après suppression:', newArray);
    
    props.onDataChange$?.(fieldPath, newArray);
  });

  const renderArrayItems = (arrayData: any[], arraySchema: any) => {
    return arrayData.map((item, index) => (
      <div key={index} class="array-item">
        <div class="array-item-header">
          <span class="array-index">[{index}]</span>
          <span class="array-item-type">{typeof item}</span>
          <div class="array-item-actions">
            <button
              class="btn btn-xs btn-outline"
              onClick$={() => props.onSelectArrayItem$(index, props.columnIndex)}
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
          onClick$={() => props.onSelectArrayItem$(index, props.columnIndex)}
        >
          {getValueDisplay(item)}
        </div>
      </div>
    ));
  };

  return (
    <div class="entity-column" style={{ width: '350px', minWidth: '350px' }}>
      {/* Header de la colonne */}
      <div class="column-header">
        {props.level > 0 && (
          <button
            class="back-button"
            onClick$={() => props.onGoBack$(props.columnIndex)}
          >
            ←
          </button>
        )}
        <h3 class="column-title">{props.parentName}</h3>
        <span class="column-level">Niveau {props.level}</span>
      </div>

      {/* Contenu de la colonne */}
      <div class="column-content">
        {props.isArray ? (
          <div class="array-container">
            <div class="array-header">
              <div class="array-info">
                <span class="array-icon">📋</span>
                <span class="array-count">{Array.isArray(uiState.cachedData) ? uiState.cachedData.length : 0} élément{(Array.isArray(uiState.cachedData) ? uiState.cachedData.length : 0) !== 1 ? 's' : ''}</span>
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
              {Array.isArray(uiState.cachedData) && uiState.cachedData.length > 0 ? (
                <>
                  {renderArrayItems(props.data, props.schema)}
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
        ) : props.arrayIndex !== undefined ? (
          // Cas spécial: édition d'un élément d'array individuel - MÊME PATTERN QUE LES OBJETS
          <div class="object-container">
            {/* Si l'élément est un objet, afficher ses propriétés */}
            {typeof props.data === 'object' && props.data !== null && !Array.isArray(props.data) ? (
              <div class="object-fields">
                {/* Propriétés définies dans le schéma */}
                {props.schema.properties && Object.keys(props.schema.properties).map((key) => {
                  const value = props.data[key];
                  return renderField(key, value, props.schema);
                })}

                {/* Propriétés supplémentaires dans les données */}
                {Object.entries(props.data)
                  .filter(([key]) => !props.schema.properties?.[key])
                  .map(([key, value]) => {
                    return renderField(key, value, props.schema);
                  })}
              </div>
            ) : (
              // Élément primitif - input direct sans mode édition
              <div class="object-fields">
                <div class="field-item">
                  <div class="field-header">
                    <div class="field-info">
                      <span class="field-icon">{getFieldIcon(props.schema.type, props.data)}</span>
                      <span class="field-name">Valeur</span>
                      <span class="field-type">{props.schema.type || typeof props.data}</span>
                    </div>
                  </div>

                  <div class="field-value">
                    {!props.isReadOnly ? (
                      // NOUVEAU: Input direct pour éléments primitifs d'array
                      <div class="direct-edit-container">
                        {props.schema.type === 'boolean' ? (
                          <select
                            class="direct-edit-input"
                            value={String(props.data)}
                            onChange$={(e) => {
                              const target = e.target as HTMLSelectElement;
                              const newValue = target.value === 'true';
                              const itemPath = [...props.path];
                              props.onDataChange$(itemPath, newValue);
                            }}
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : props.schema.enum ? (
                          <select
                            class="direct-edit-input"
                            value={String(props.data)}
                            onChange$={(e) => {
                              const target = e.target as HTMLSelectElement;
                              const itemPath = [...props.path];
                              props.onDataChange$(itemPath, target.value);
                            }}
                          >
                            {props.schema.enum.map((option: any) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            class="direct-edit-input"
                            type={(() => {
                              const editType = props.schema.type || typeof props.data;
                              return (editType === 'number' || editType === 'integer') ? 'number' : 'text';
                            })()}
                            value={(() => {
                              const val = props.data;
                              if (val === null || val === undefined) return '';
                              return String(val);
                            })()}
                            onChange$={(e) => {
                              const target = e.target as HTMLInputElement;
                              let convertedValue: any = target.value;
                              
                              // Conversion selon le type
                              const targetType = props.schema.type || typeof props.data;
                              switch (targetType) {
                                case 'number':
                                  convertedValue = parseFloat(target.value);
                                  if (isNaN(convertedValue)) convertedValue = 0;
                                  break;
                                case 'integer':
                                  convertedValue = parseInt(target.value, 10);
                                  if (isNaN(convertedValue)) convertedValue = 0;
                                  break;
                                default:
                                  convertedValue = target.value;
                                  break;
                              }
                              
                              const itemPath = [...props.path];
                              props.onDataChange$(itemPath, convertedValue);
                            }}
                            min={props.schema.minimum}
                            max={props.schema.maximum}
                            step={props.schema.type === 'integer' ? '1' : 'any'}
                            placeholder={`Entrez ${props.schema.type || 'une valeur'}...`}
                          />
                        )}
                      </div>
                    ) : (
                      // Mode readonly
                      <div class="value-display">
                        {getValueDisplay(props.data)}
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
              {props.schema.properties && Object.keys(props.schema.properties).map((key) => {
                // Utiliser directement les props - réactivité native Qwik
                const value = props.data[key];
                return renderField(key, value, props.schema);
              })}
              
              {/* Afficher les propriétés supplémentaires dans les données qui ne sont pas dans le schéma */}
              {Object.entries(props.data)
                .filter(([key]) => !props.schema.properties?.[key])
                .map(([key, value]) => {
                  return renderField(key, value, props.schema);
                })}
            </div>
            
            {(!props.schema.properties || Object.keys(props.schema.properties).length === 0) && Object.keys(props.data).length === 0 && (
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