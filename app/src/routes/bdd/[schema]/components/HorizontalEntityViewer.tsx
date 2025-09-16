import { component$, useStore, useSignal, useComputed$, useTask$, type PropFunction, $ } from '@builder.io/qwik';
import type { EntityData } from '../../types';
import { EntityColumn } from './EntityColumn';

type HorizontalEntityViewerProps = {
  entity: EntityData;
  schema: any;
  schemaName: string;
  schemaTitle: string;
  schemaVersion: string;
  isOutdated: boolean;
  isReadOnly: boolean;
  hasModifications?: boolean;
  loading?: boolean;
  updateVersionOption?: boolean;
  updateVersion?: boolean;
  onDataChange$?: PropFunction<(newData: Record<string, any>) => void>;
  onSave$?: PropFunction<() => Promise<void>>;
  onEdit$?: PropFunction<() => void>;
  onCancel$?: PropFunction<() => void>;
  onGoBack$: PropFunction<() => void>;
  onUpdateVersionChange$?: PropFunction<(value: boolean) => void>;
};

// Store global pour les données d'entité réactives
const globalEntityDataStore = { value: {} as any };

// Hook pour accéder aux données d'entité réactives
export const useReactiveEntityData = () => {
  const localSignal = useSignal(globalEntityDataStore.value);

  // Synchroniser avec le store global
  useTask$(({ track }) => {
    track(() => globalEntityDataStore.value);
    localSignal.value = { ...globalEntityDataStore.value };
  });

  return localSignal;
};

export const HorizontalEntityViewer = component$<HorizontalEntityViewerProps>((props) => {
  const uiState = useStore({
    selectedPath: [] as string[], // Chemin des propriétés sélectionnées pour navigation
    expandedColumns: 1, // Nombre de colonnes visibles
    showJsonPreview: false
  });

  const forceUpdateSignal = useSignal(0);

  // Synchroniser le store global avec les props
  globalEntityDataStore.value = props.entity.data;
  
  // Utiliser useComputed pour recalculer les colonnes quand les données ou le chemin changent
  const columns = useComputed$(() => {
    // Tracker explicitement les changements de données et du chemin
    forceUpdateSignal.value; // Force tracking of update signal
    const entityData = JSON.parse(JSON.stringify(props.entity.data)); // Force deep tracking
    const selectedPath = [...uiState.selectedPath]; // Force tracking
    console.log('🔧 HorizontalEntityViewer - useComputed$ triggered:', {
      entityData: JSON.stringify(entityData),
      selectedPath,
      forceUpdate: forceUpdateSignal.value
    });
    const cols: Array<{
      data: any;
      schema: any;
      path: string[];
      parentName: string;
      level: number;
      isArray?: boolean;
      arrayIndex?: number;
    }> = [];

    // Première colonne : données racine
    cols.push({
      data: entityData,
      schema: props.schema,
      path: [],
      parentName: props.schemaTitle || 'Entité',
      level: 0
    });

    // Colonnes suivantes basées sur le chemin sélectionné
    let currentData = entityData;
    let currentSchema = props.schema;
    
    for (let i = 0; i < uiState.selectedPath.length; i++) {
      const key = uiState.selectedPath[i];
      
      if (!currentData || !currentSchema) break;

      // Gérer les objets
      if (typeof currentData[key] === 'object' && !Array.isArray(currentData[key]) && currentData[key] !== null) {
        const nextData = currentData[key];
        const nextSchema = currentSchema.properties?.[key];
        
        if (nextSchema) {
          cols.push({
            data: nextData,
            schema: nextSchema,
            path: [...uiState.selectedPath.slice(0, i + 1)],
            parentName: key,
            level: i + 1
          });
          
          currentData = nextData;
          currentSchema = nextSchema;
        }
      }
      // Gérer les tableaux
      else if (Array.isArray(currentData[key])) {
        const arraySchema = currentSchema.properties?.[key];

        if (arraySchema) {
          // Pour les tableaux, on montre une colonne avec les index
          // CORRECTION: Utiliser currentData[key] directement depuis entityData
          const freshArrayData = currentData[key];
          cols.push({
            data: freshArrayData,
            schema: arraySchema,
            path: [...selectedPath.slice(0, i + 1)],
            parentName: `${key} (${freshArrayData.length} élément${freshArrayData.length !== 1 ? 's' : ''})`,
            level: i + 1,
            isArray: true
          });
          
          // CORRECTION: Vérifier s'il y a un index d'array sélectionné à la position suivante
          // Soit il y a encore du contenu après (cas normal), soit on est à la fin du chemin (cas corrigé)
          if (i + 1 <= selectedPath.length) {
            const arrayIndex = parseInt(selectedPath[i + 1]);
            if (!isNaN(arrayIndex) && arrayIndex < freshArrayData.length) {
              const itemData = freshArrayData[arrayIndex];
              const itemSchema = arraySchema.items;
              
              // Créer une colonne d'édition pour l'élément d'array sélectionné
              // Même pour les éléments primitifs ou objets simples
              if (itemSchema) {
                cols.push({
                  data: itemData,
                  schema: itemSchema,
                  path: [...selectedPath.slice(0, i + 2)],
                  parentName: `${key}[${arrayIndex}]`,
                  level: i + 2,
                  arrayIndex: arrayIndex
                });
                
                // Si l'élément est un objet ET qu'on a encore du chemin à parcourir, continuer
                if (typeof itemData === 'object' && itemData !== null && i + 2 < selectedPath.length) {
                  currentData = itemData;
                  currentSchema = itemSchema;
                }
                i++; // Skip the array index in the next iteration
              }
            }
          }
        }
      }
    }

    return cols;
  });

  const handlePropertySelect = $((key: string, columnIndex: number) => {
    // Construire le nouveau chemin
    const newPath = [...uiState.selectedPath.slice(0, columnIndex), key];
    
    // Vérifier si cette propriété peut avoir des enfants
    const currentColumn = columns.value[columnIndex];
    const value = currentColumn.data[key];
    
    if (value && (typeof value === 'object' || Array.isArray(value))) {
      uiState.selectedPath = newPath;
      uiState.expandedColumns = Math.max(uiState.expandedColumns, columnIndex + 2);
    }
  });

  const handleArrayItemSelect = $((arrayIndex: number, columnIndex: number) => {
    // Ajouter l'index du tableau au chemin
    const newPath = [...uiState.selectedPath.slice(0, columnIndex), arrayIndex.toString()];
    uiState.selectedPath = newPath;
    uiState.expandedColumns = Math.max(uiState.expandedColumns, columnIndex + 2);
  });

  const handleGoBack = $((columnIndex: number) => {
    console.log('🔧 HorizontalEntityViewer - handleGoBack appelé:', {
      columnIndex,
      currentPath: uiState.selectedPath,
      currentExpandedColumns: uiState.expandedColumns,
      totalColumns: columns.value.length,
      allColumns: columns.value.map((col, i) => ({
        index: i,
        level: col.level,
        path: col.path,
        parentName: col.parentName
      }))
    });
    
    // LOGIQUE SIMPLIFIÉE: Fermer CETTE colonne et toutes celles qui suivent
    // Pour fermer la colonne à l'index N, on garde seulement les N premières colonnes
    // Donc on affiche les colonnes 0 à N-1 (N colonnes au total)
    
    // Trouver le bon path length basé sur la colonne précédente
    let newPathLength = 0;
    if (columnIndex > 0) {
      const previousColumn = columns.value[columnIndex - 1];
      if (previousColumn) {
        newPathLength = previousColumn.path.length;
      }
    }
    
    const newPath = uiState.selectedPath.slice(0, newPathLength);
    uiState.selectedPath = newPath;
    uiState.expandedColumns = columnIndex; // Afficher seulement les colonnes 0 à columnIndex-1
    
    console.log('🔧 HorizontalEntityViewer - Après handleGoBack:', {
      newPath: uiState.selectedPath,
      newExpandedColumns: uiState.expandedColumns,
      newPathLength,
      previousColumn: columnIndex > 0 ? columns.value[columnIndex - 1] : null
    });
  });

  const handleDataChange = $((path: string[], newValue: any) => {
    if (!props.onDataChange$ || props.isReadOnly) return;
    
    console.log('🔧 HorizontalEntityViewer - handleDataChange appelé:', { path, newValue });
    
    // Cloner les données actuelles
    const newData = JSON.parse(JSON.stringify(props.entity.data));
    
    // Naviguer jusqu'au bon endroit et modifier la valeur
    let current = newData;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (current[key] === undefined) {
        // CORRECTION: Déterminer le type selon le prochain élément du path
        const nextKey = path[i + 1];
        const isNextKeyArrayIndex = !isNaN(parseInt(nextKey));
        current[key] = isNextKeyArrayIndex ? [] : {};
      }
      current = current[key];
    }
    
    if (path.length > 0) {
      current[path[path.length - 1]] = newValue;
    } else {
      // Si path est vide, remplacer les données racine
      Object.assign(newData, newValue);
    }
    
    console.log('🔧 HorizontalEntityViewer - Nouvelles données:', newData);

    // Mettre à jour les données - le useComputed$ se déclenchera automatiquement
    props.onDataChange$(newData);
    console.log('🔧 HorizontalEntityViewer - onDataChange$ appelé');

    // Mettre à jour le store global IMMÉDIATEMENT
    globalEntityDataStore.value = newData;

    // Force re-computation
    forceUpdateSignal.value++;
  });

  const getEntityDisplayName = () => {
    const data = props.entity.data;
    // Pour les nouvelles entités sans ID
    if (!props.entity.id) {
      return data.title || data.name || data.libelle || 'Nouvelle entité';
    }
    return data.title || data.name || data.libelle || `Entité ${props.entity.id.slice(-6)}`;
  };

  const isNewEntity = !props.entity.id || props.entity.id === '';

  return (
    <div 
      class="horizontal-entity-viewer" 
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
            onClick$={props.onGoBack$}
          >
            ← Retour à la liste
          </button>
        </div>

        {/* Informations de l'entité */}
        <div class="entity-info-section">
          <h2 class="section-title">
            {isNewEntity ? 'Création d\'une nouvelle entité' : (props.isReadOnly ? 'Détails de l\'entité' : 'Édition de l\'entité')}
          </h2>
          
          <div class="info-group">
            <label class="info-label">Nom affiché</label>
            <div class="info-value">{getEntityDisplayName()}</div>
          </div>

          {!isNewEntity && (
            <div class="info-group">
              <label class="info-label">ID</label>
              <div class="info-value font-mono">{props.entity.id}</div>
            </div>
          )}

          <div class="info-group">
            <label class="info-label">Schéma</label>
            <div class="info-value">{props.schemaTitle} ({props.schemaName})</div>
          </div>

          <div class="info-group">
            <label class="info-label">Version</label>
            <div class="info-value">
              <span class={`version-badge ${props.isOutdated ? 'outdated' : 'current'}`}>
                v{props.entity.version || props.schemaVersion}
              </span>
              {props.isOutdated && !isNewEntity && (
                <div class="outdated-warning">
                  <span class="warning-text">⚠️ Version obsolète</span>
                  <div class="current-version">Actuelle: v{props.schemaVersion}</div>
                </div>
              )}
            </div>
          </div>

          {!isNewEntity && (
            <>
              <div class="info-group">
                <label class="info-label">Créé le</label>
                <div class="info-value">{new Date(props.entity.createdAt).toLocaleString('fr-FR')}</div>
              </div>

              <div class="info-group">
                <label class="info-label">Modifié le</label>
                <div class="info-value">{new Date(props.entity.updatedAt).toLocaleString('fr-FR')}</div>
              </div>
            </>
          )}
        </div>

        {/* Options de mise à jour de version */}
        {props.updateVersionOption && !props.isReadOnly && (
          <div class="version-update-section" style="padding: 1rem; border-top: 1px solid #e9ecef; border-bottom: 1px solid #e9ecef;">
            <label class="checkbox-label">
              <input
                type="checkbox"
                checked={props.updateVersion}
                onChange$={(e) => {
                  const target = e.target as HTMLInputElement;
                  props.onUpdateVersionChange$?.(target.checked);
                }}
              />
              <span class="checkbox-text">
                Migrer vers la version {props.schemaVersion}
              </span>
            </label>
            <div class="help-text">
              Cette option met à jour l'entité vers la dernière version du schéma lors de la sauvegarde.
            </div>
          </div>
        )}

        {/* Indicateur de modifications */}
        {props.hasModifications !== undefined && (
          <div class="modification-status-section" style="padding: 1rem; border-bottom: 1px solid #e9ecef;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <div style={`width: 8px; height: 8px; border-radius: 50%; background: ${props.hasModifications ? '#ffc107' : '#28a745'};`}></div>
              <span style="font-weight: 500; font-size: 0.9rem;">
                {isNewEntity ? 
                  (props.hasModifications ? '✏️ Données saisies' : '📝 Prêt pour la création') :
                  (props.hasModifications ? '⚠️ Modifications non sauvegardées' : '✅ Tous les changements sauvegardés')
                }
              </span>
            </div>
          </div>
        )}

        {/* Actions principales */}
        <div class="main-actions-section" style="padding: 1rem;">
          <div class="actions" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <button
              class="btn btn-info"
              onClick$={() => uiState.showJsonPreview = !uiState.showJsonPreview}
              style="width: 100%; padding: 0.75rem;"
            >
              {uiState.showJsonPreview ? '👁️ Masquer JSON' : '👁️ Voir JSON'}
            </button>
            
            {props.isReadOnly && props.onEdit$ ? (
              <button
                class="btn btn-primary"
                onClick$={props.onEdit$}
                style="width: 100%; padding: 0.75rem;"
              >
                ✏️ Modifier
              </button>
            ) : (
              <>
                <button
                  class="btn btn-secondary"
                  onClick$={props.onCancel$}
                  disabled={props.loading}
                  style="width: 100%; padding: 0.75rem;"
                >
                  ❌ Annuler
                </button>
                
                <button
                  class={`btn ${isNewEntity ? 'btn-primary' : (props.hasModifications ? 'btn-warning' : 'btn-success')}`}
                  onClick$={props.onSave$}
                  disabled={props.loading}
                  style="width: 100%; padding: 0.75rem;"
                >
                  {props.loading ? (isNewEntity ? '⏳ Création...' : '⏳ Sauvegarde...') : 
                   isNewEntity ? '✨ Créer l\'entité' :
                   props.hasModifications ? '⚠️ Sauvegarder les modifications' : '💾 Sauvegarder'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Aperçu JSON conditionnel */}
      {uiState.showJsonPreview && (
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; max-width: 800px; background: white; border: 2px solid #007bff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 9999;">
          <div class="json-preview-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="margin: 0; color: #007bff; font-size: 1.5rem;">📋 Données JSON</h3>
              <button 
                onClick$={() => uiState.showJsonPreview = false}
                style="background: #dc3545; color: white; border: none; border-radius: 50%; padding: 0.75rem; cursor: pointer; font-weight: bold; font-size: 1.2rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"
                title="Fermer l'aperçu"
              >
                ✕
              </button>
            </div>
            
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 1rem;">
              <pre style="margin: 0; overflow-x: auto; white-space: pre-wrap; max-height: 500px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 0.9rem; line-height: 1.4;">
                {JSON.stringify(props.entity.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Overlay pour l'aperçu JSON */}
      {uiState.showJsonPreview && (
        <div 
          style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9998;"
          onClick$={() => uiState.showJsonPreview = false}
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
            width: `${columns.value.length * 350}px`,
            minWidth: '100%',
            display: 'flex',
            height: '100%'
          }}
        >
          {columns.value.map((column, columnIndex) => (
            <EntityColumn
              key={`column-${columnIndex}-${column.path.join('-')}`}
              data={column.data}
              schema={column.schema}
              path={column.path}
              parentName={column.parentName}
              level={column.level}
              isArray={column.isArray}
              arrayIndex={column.arrayIndex}
              selectedPath={uiState.selectedPath}
              columnIndex={columnIndex}
              isReadOnly={props.isReadOnly}
              onSelectProperty$={handlePropertySelect}
              onSelectArrayItem$={handleArrayItemSelect}
              onGoBack$={handleGoBack}
              onDataChange$={handleDataChange}
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
          🏠 {props.schemaTitle}
        </button>
        
        {uiState.selectedPath.map((pathItem, index) => {
          const isArrayIndex = !isNaN(parseInt(pathItem));
          const displayName = isArrayIndex ? `[${pathItem}]` : pathItem;
          
          return (
            <button
              key={`${pathItem}-${index}`}
              class={`breadcrumb-item ${index === uiState.selectedPath.length - 1 ? 'active' : ''}`}
              onClick$={$((_, e) => { 
                const target = e.currentTarget as HTMLButtonElement;
                const index = parseInt(target.dataset.index || '0'); 
                handleGoBack(index + 1); 
              })} 
              data-index={index}
            >
              → {displayName}
            </button>
          );
        })}
      </div>
    </div>
  );
});