import { component$, useStore, useSignal, type PropFunction, $ } from '@builder.io/qwik';
import type { SchemaProperty, SchemaInfo, JsonSchemaType } from '../types';
import { PropertyColumn } from './PropertyColumn';
import { findPropertyById } from '../utils';

type HorizontalSchemaEditorProps = {
  schemaInfo: SchemaInfo;
  properties: SchemaProperty[];
  onUpdateSchemaInfo$: PropFunction<(updates: Partial<SchemaInfo>) => Promise<void>>;
  onAddProperty$: PropFunction<(parentId: string | null, name: string, type: JsonSchemaType, required: boolean, description: string) => Promise<void>>;
  onRemoveProperty$: PropFunction<(propertyId: string) => Promise<void>>;
  onUpdateProperty$: PropFunction<(propertyId: string, updates: Partial<SchemaProperty>) => Promise<void>>;
  onUpdatePropertyType$: PropFunction<(propertyId: string, newType: JsonSchemaType) => Promise<void>>;
  onUpdateArrayItemType$: PropFunction<(arrayPropertyId: string, newItemType: JsonSchemaType) => Promise<void>>;
  generatedJson: string;
  validationErrors: string[];
  isValid: boolean;
  onCopyJson$: PropFunction<() => Promise<void>>;
  onSave$: PropFunction<() => Promise<void>>;
  hasModifications?: boolean;
};

export const HorizontalSchemaEditor = component$<HorizontalSchemaEditorProps>((props) => {
  const uiState = useStore({
    selectedPath: [] as string[], // Chemin des propriétés sélectionnées pour navigation
    expandedColumns: 1 // Nombre de colonnes visibles
  });
  
  const showPreview = useSignal(false);

  // Construire les colonnes basées sur le chemin sélectionné
  const buildColumns = () => {
    const columns: Array<{
      properties: SchemaProperty[];
      parentId: string | null;
      parentName: string;
      level: number;
    }> = [];

    // Première colonne : propriétés racine
    columns.push({
      properties: props.properties,
      parentId: null,
      parentName: 'Racine',
      level: 0
    });

    // Colonnes suivantes basées sur le chemin sélectionné
    let currentProperties = props.properties;
    for (let i = 0; i < uiState.selectedPath.length; i++) {
      const propertyId = uiState.selectedPath[i];
      const property = findPropertyById(currentProperties, propertyId);
      
      if (!property) break;

      let childProperties: SchemaProperty[] = [];
      let parentName = property.name;

      if (property.type === 'object' && property.properties) {
        childProperties = property.properties;
      } else if (property.type === 'array' && property.items?.properties) {
        childProperties = property.items.properties;
        parentName += ' (items)';
      }

      // Seulement créer une colonne si :
      // - C'est un objet (même vide)
      // - C'est un array d'objets (même vide)
      if (property.type === 'object' || (property.type === 'array' && property.items?.type === 'object')) {
        columns.push({
          properties: childProperties,
          parentId: propertyId,
          parentName,
          level: i + 1
        });
      }
    }

    return columns;
  };

  const columns = buildColumns();

  const handlePropertySelect = $((propertyId: string, columnIndex: number) => {
    // Tronquer le chemin au niveau sélectionné et ajouter la nouvelle propriété
    const newPath = [...uiState.selectedPath.slice(0, columnIndex), propertyId];
    
    // Vérifier si la propriété peut avoir des enfants
    const property = findPropertyById(props.properties, propertyId);
    if (property && (property.type === 'object' || (property.type === 'array' && property.items?.type === 'object'))) {
      uiState.selectedPath = newPath;
      uiState.expandedColumns = Math.max(uiState.expandedColumns, columnIndex + 2);
    }
  });

  const handleGoBack = $((columnIndex: number) => {
    uiState.selectedPath = uiState.selectedPath.slice(0, columnIndex);
    uiState.expandedColumns = columnIndex + 1;
  });


  return (
    <div 
      class="horizontal-schema-editor" 
      style="height: calc(100vh - 50px);"
    >
      {/* Panneau fixe à gauche */}
      <div 
        class="fixed-left-panel"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '350px',
          height: '100%',
          overflow: 'auto',
          borderRight: '1px solid #e9ecef',
          backgroundColor: '#fff',
          zIndex: 10
        }}
      >
        {/* Navigation retour */}
        <div class="back-button-section" style="padding: 1rem; border-bottom: 1px solid #e9ecef;">
          <button 
            class="btn btn-secondary w-100"
            onClick$={$(() => window.history.back())}
          >
            ← Retour à la liste
          </button>
        </div>

        {/* Informations du schéma */}
        <div class="schema-info-section">
          <h2 class="section-title">Informations du Schéma</h2>
          
          <div class="form-group">
            <label class="label">Nom du schéma *</label>
            <input
              class="input"
              type="text"
              value={props.schemaInfo.name}
              onInput$={(event) => {
                const name = (event.target as HTMLInputElement).value;
                props.onUpdateSchemaInfo$({ name });
              }}
              placeholder="ex: user, product, order"
            />
          </div>

          <div class="form-group">
            <label class="label">Titre</label>
            <input
              class="input"
              type="text"
              value={props.schemaInfo.title}
              onInput$={(event) => {
                const title = (event.target as HTMLInputElement).value;
                props.onUpdateSchemaInfo$({ title });
              }}
              placeholder="Titre lisible par un humain"
            />
          </div>

          <div class="form-group">
            <label class="label">Description</label>
            <textarea
              class="textarea"
              value={props.schemaInfo.description}
              onInput$={(event) => {
                const description = (event.target as HTMLTextAreaElement).value;
                props.onUpdateSchemaInfo$({ description });
              }}
              placeholder="Description détaillée du schéma"
            />
          </div>

          <div class="form-group">
            <label class="label">Type racine</label>
            <select
              class="select"
              value={props.schemaInfo.type}
              onChange$={(event) => {
                const type = (event.target as HTMLSelectElement).value as 'object' | 'array';
                props.onUpdateSchemaInfo$({ type });
              }}
            >
              <option value="object" selected={props.schemaInfo.type === 'object'}>Objet</option>
              <option value="array" selected={props.schemaInfo.type === 'array'}>Tableau</option>
            </select>
          </div>
        </div>

        {/* Indicateur de statut des modifications */}
        {props.hasModifications !== undefined && (
          <div class="modification-status-section" style="padding: 1rem; border-bottom: 1px solid #e9ecef;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <div style={`width: 8px; height: 8px; border-radius: 50%; background: ${props.hasModifications ? '#ffc107' : '#28a745'};`}></div>
              <span style="font-weight: 500; font-size: 0.9rem;">
                {props.hasModifications ? '⚠️ Modifications non sauvegardées' : '✅ Tous les changements sauvegardés'}
              </span>
            </div>
            {props.hasModifications && (
              <div style="font-size: 0.8rem; color: #856404; margin-top: 0.25rem;">
                Modifications sauvegardées en brouillon à la fermeture
              </div>
            )}
          </div>
        )}

        {/* Actions principales */}
        <div class="main-actions-section" style="padding: 1rem;">
          <div class="preview-actions" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <button
              class="btn btn-primary"
              disabled={!props.generatedJson}
              onClick$={() => props.onCopyJson$()}
              style="width: 100%; padding: 0.75rem;"
            >
              📋 Copier JSON
            </button>
            
            <button
              class="btn btn-info"
              onClick$={() => showPreview.value = !showPreview.value}
              style="width: 100%; padding: 0.75rem;"
            >
              {showPreview.value ? '👁️ Masquer aperçu' : '👁️ Voir aperçu'}
            </button>
            
            <button
              class={`btn ${props.hasModifications ? 'btn-warning' : 'btn-success'}`}
              disabled={!props.isValid || !props.schemaInfo.name.trim()}
              onClick$={() => props.onSave$()}
              style="width: 100%; padding: 0.75rem;"
            >
              {props.hasModifications ? '⚠️ Sauvegarder les modifications' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      {/* Aperçu JSON conditionnel - overlay au-dessus des colonnes */}
      {showPreview.value && (
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; max-width: 800px; background: white; border: 2px solid #007bff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 9999;">
          <div class="json-preview-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="margin: 0; color: #007bff; font-size: 1.5rem;">📋 Aperçu JSON Schema</h3>
              <button 
                onClick$={() => showPreview.value = false}
                style="background: #dc3545; color: white; border: none; border-radius: 50%; padding: 0.75rem; cursor: pointer; font-weight: bold; font-size: 1.2rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"
                title="Fermer l'aperçu"
              >
                ✕
              </button>
            </div>
            
            {!props.isValid && props.validationErrors.length > 0 && (
              <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 1rem; margin-bottom: 1rem;">
                <h4 style="color: #721c24; margin: 0 0 0.5rem 0;">⚠️ Erreurs de validation :</h4>
                {props.validationErrors.map((error, index) => (
                  <div key={index} style="color: #721c24; margin-bottom: 0.25rem;">• {error}</div>
                ))}
              </div>
            )}
            
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 1rem;">
              <pre style="margin: 0; overflow-x: auto; white-space: pre-wrap; max-height: 500px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 0.9rem; line-height: 1.4;">{props.generatedJson || '{\n  "type": "object"\n}'}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Overlay sombre derrière l'aperçu */}
      {showPreview.value && (
        <div 
          style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9998;"
          onClick$={() => showPreview.value = false}
        ></div>
      )}

      {/* Colonnes dynamiques scrollables */}
      <div 
        class="columns-container" 
        style={{
          marginLeft: '350px'
        }}
      >
        <div 
          class="columns-scroll" 
          style={{ 
            width: `${columns.length * 350}px`,
            minWidth: '100%',
            display: 'flex',
            height: '100%'
          }}
        >
          {columns.map((column, columnIndex) => (
            <PropertyColumn
              key={`${column.parentId || 'root'}-${columnIndex}`}
              properties={column.properties}
              parentId={column.parentId}
              parentName={column.parentName}
              level={column.level}
              selectedPath={uiState.selectedPath}
              columnIndex={columnIndex}
              onSelectProperty$={handlePropertySelect}
              onGoBack$={handleGoBack}
              onAddProperty$={props.onAddProperty$}
              onRemoveProperty$={props.onRemoveProperty$}
              onUpdateProperty$={props.onUpdateProperty$}
              onUpdatePropertyType$={props.onUpdatePropertyType$}
              onUpdateArrayItemType$={props.onUpdateArrayItemType$}
            />
          ))}
        </div>
      </div>

      {/* Breadcrumb navigation */}
      <div 
        class="breadcrumb-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '350px',
          right: 0,
          backgroundColor: '#fff',
          borderTop: '1px solid #e9ecef',
          padding: '0.5rem 1rem',
          zIndex: 100,
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <button
          class={`breadcrumb-item ${uiState.selectedPath.length === 0 ? 'active' : ''}`}
          onClick$={$(() => handleGoBack(0))}
        >
          🏠 Racine
        </button>
        
        {uiState.selectedPath.map((propertyId, index) => {
          const property = findPropertyById(props.properties, propertyId);
          return (
            <button
              key={propertyId}
              class={`breadcrumb-item ${index === uiState.selectedPath.length - 1 ? 'active' : ''}`}
              onClick$={$((_, e) => { const index = parseInt(e.target.dataset.index || '0'); handleGoBack(index + 1); })} data-index={index}
            >
              → {property?.name || 'Unknown'}
            </button>
          );
        })}
      </div>
    </div>
  );
});