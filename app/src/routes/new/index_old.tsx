import { component$, useStore, useSignal, useStyles$, useTask$, useVisibleTask$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { 
  handleAddProperty, 
  handleRemoveProperty, 
  handleGenerateSchema,
  handleCopyToClipboard,
  handleValidatePropertyName,
  handleShowNotification
} from '../handlers';
import {
  handleAutoSave,
  handleRestoreDraft,
  handleCheckDraft,
  handleSaveAndClear,
  handleBeforeUnload
} from './handlers';
import type { SchemaProperty, SchemaInfo } from '../types';
import STYLES from './index.scss?inline';

export default component$(() => {
  useStyles$(STYLES);
  
  // État du schéma
  const schemaInfo = useStore<SchemaInfo>({
    name: '',
    title: '',
    description: '',
    type: 'object'
  });

  // Liste des propriétés
  const properties = useStore<SchemaProperty[]>([]);

  // Nouvelle propriété en cours d'ajout
  const newProperty = useStore<SchemaProperty>({
    name: '',
    type: 'string',
    required: false,
    description: '',
    minLength: undefined,
    maxLength: undefined,
    minimum: undefined,
    maximum: undefined,
    enum: undefined,
    format: undefined
  });

  // État de l'interface
  const uiState = useStore({
    generatedJson: '',
    validationErrors: [] as string[],
    isValid: true,
    notification: { show: false, type: 'success', message: '' },
    propertyNameError: '',
    showDraftModal: false,
    lastSaved: '',
    hasUnsavedChanges: false
  });

  // Indicateur de sauvegarde
  const isSaving = useSignal(false);

  // Restaurer le brouillon au chargement
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const checkAndRestoreDraft = async () => {
      const hasDraft = await handleCheckDraft();
      if (hasDraft) {
        const draft = await handleRestoreDraft();
        if (draft) {
          uiState.showDraftModal = true;
          // Stocker temporairement le brouillon pour restauration
          (window as any).tempDraft = draft;
        }
      }
    };
    
    checkAndRestoreDraft();

    // Gestionnaire beforeunload pour l'auto-save
    const beforeUnload = (e: BeforeUnloadEvent) => {
      const message = handleBeforeUnload(schemaInfo, properties);
      if (message) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', beforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
    };
  });

  // Auto-sauvegarde toutes les 10 secondes s'il y a des changements
  useTask$(({ track, cleanup }) => {
    track(() => schemaInfo.name);
    track(() => schemaInfo.title);
    track(() => schemaInfo.description);
    track(() => schemaInfo.type);
    track(() => properties.length);
    track(() => properties.map(p => `${p.name}-${p.type}-${p.required}`).join(','));

    uiState.hasUnsavedChanges = true;

    const timeoutId = setTimeout(async () => {
      await handleAutoSave(schemaInfo, properties);
      uiState.lastSaved = new Date().toLocaleTimeString();
    }, 10000); // Auto-save après 10 secondes d'inactivité

    cleanup(() => clearTimeout(timeoutId));
  });

  // Génération automatique du schéma à chaque changement
  useTask$(async ({ track }) => {
    track(() => schemaInfo.name);
    track(() => schemaInfo.title);
    track(() => schemaInfo.description);
    track(() => schemaInfo.type);
    track(() => properties.length);
    track(() => properties.map(p => `${p.name}-${p.type}-${p.required}`).join(','));

    if (schemaInfo.name || properties.length > 0) {
      const result = await handleGenerateSchema(schemaInfo, properties);
      uiState.generatedJson = result.json;
      uiState.validationErrors = result.validation.errors;
      uiState.isValid = result.validation.isValid;
    }
  });

  return (
    <div class="page-schema-editor">
      {/* Header avec navigation */}
      <div class="header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <Link href="/" class="btn btn-secondary">
            ← Retour à la liste
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {uiState.lastSaved && (
              <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                Dernière sauvegarde automatique: {uiState.lastSaved}
              </span>
            )}
            {uiState.hasUnsavedChanges && (
              <span style={{ fontSize: '0.85rem', color: '#e74c3c' }}>
                ● Modifications non sauvegardées
              </span>
            )}
          </div>
        </div>
        
        <h1 class="title">Nouveau JSON Schema</h1>
        <p class="subtitle">Créez un nouveau schéma JSON - Sauvegarde automatique activée</p>
      </div>

      {/* Modal de restauration de brouillon */}
      {uiState.showDraftModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            margin: '1rem'
          }}>
            <h3 style={{ marginTop: 0 }}>Brouillon trouvé</h3>
            <p>Vous avez un brouillon non sauvegardé. Voulez-vous le restaurer ?</p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                class="btn btn-secondary"
                onClick$={() => {
                  uiState.showDraftModal = false;
                  delete (window as any).tempDraft;
                }}
              >
                Ignorer
              </button>
              <button
                class="btn btn-primary"
                onClick$={() => {
                  const draft = (window as any).tempDraft;
                  if (draft) {
                    // Restaurer les données
                    Object.assign(schemaInfo, draft.schemaInfo);
                    properties.splice(0, properties.length, ...draft.properties);
                    uiState.lastSaved = new Date(draft.lastSaved).toLocaleTimeString();
                    uiState.hasUnsavedChanges = true;
                  }
                  uiState.showDraftModal = false;
                  delete (window as any).tempDraft;
                }}
              >
                Restaurer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layout principal */}
      <div class="layout">
        {/* Panneau des informations du schéma */}
        <div class="panel info-panel">
          <h2 class="panel-title">Informations du Schéma</h2>
          
          <div class="form-group">
            <label class="label">Nom du schéma *</label>
            <input
              class="input"
              type="text"
              value={schemaInfo.name}
              onInput$={(event) => {
                schemaInfo.name = (event.target as HTMLInputElement).value;
              }}
              placeholder="ex: user, product, order"
            />
          </div>

          <div class="form-group">
            <label class="label">Titre</label>
            <input
              class="input"
              type="text"
              value={schemaInfo.title}
              onInput$={(event) => {
                schemaInfo.title = (event.target as HTMLInputElement).value;
              }}
              placeholder="Titre lisible par un humain"
            />
          </div>

          <div class="form-group">
            <label class="label">Description</label>
            <textarea
              class="textarea"
              value={schemaInfo.description}
              onInput$={(event) => {
                schemaInfo.description = (event.target as HTMLTextAreaElement).value;
              }}
              placeholder="Description détaillée du schéma"
            />
          </div>

          <div class="form-group">
            <label class="label">Type racine</label>
            <select
              class="select"
              value={schemaInfo.type}
              onChange$={(event) => {
                schemaInfo.type = (event.target as HTMLSelectElement).value as 'object' | 'array';
              }}
            >
              <option value="object">Objet</option>
              <option value="array">Tableau</option>
            </select>
          </div>
        </div>

        {/* Panneau des propriétés */}
        <div class="panel properties-panel">
          <h2 class="panel-title">Propriétés ({properties.length})</h2>
          
          {/* Formulaire d'ajout de propriété */}
          <div class="add-property">
            <h3 class="add-title">Ajouter une nouvelle propriété</h3>
            
            <div class="form-row">
              <input
                class={`input ${uiState.propertyNameError ? 'error' : ''}`}
                type="text"
                value={newProperty.name}
                onInput$={async (event) => {
                  const value = (event.target as HTMLInputElement).value;
                  newProperty.name = value;
                  const validation = await handleValidatePropertyName(value, properties);
                  uiState.propertyNameError = validation.error;
                }}
                placeholder="Nom de la propriété"
              />
              
              <select
                class="select"
                value={newProperty.type}
                onChange$={(event) => {
                  newProperty.type = (event.target as HTMLSelectElement).value as any;
                }}
              >
                <option value="string">Texte</option>
                <option value="number">Nombre</option>
                <option value="integer">Entier</option>
                <option value="boolean">Booléen</option>
                <option value="array">Tableau</option>
                <option value="object">Objet</option>
              </select>
              
              <button
                class="btn-add"
                disabled={!newProperty.name.trim() || !!uiState.propertyNameError}
                onClick$={async () => {
                  const isValid = await handleAddProperty(newProperty, properties);
                  if (isValid) {
                    properties.push({ ...newProperty });
                    // Reset du formulaire
                    newProperty.name = '';
                    newProperty.type = 'string';
                    newProperty.required = false;
                    newProperty.description = '';
                    newProperty.minLength = undefined;
                    newProperty.maxLength = undefined;
                    newProperty.minimum = undefined;
                    newProperty.maximum = undefined;
                    newProperty.enum = undefined;
                    newProperty.format = undefined;
                    uiState.propertyNameError = '';
                  }
                }}
              >
                Ajouter
              </button>
            </div>

            {uiState.propertyNameError && (
              <span class="error-message">{uiState.propertyNameError}</span>
            )}

            <div class="form-row">
              <input
                class="input"
                type="text"
                value={newProperty.description}
                onInput$={(event) => {
                  newProperty.description = (event.target as HTMLInputElement).value;
                }}
                placeholder="Description (optionnelle)"
              />
              
              <label class="checkbox-container">
                <input
                  class="checkbox"
                  type="checkbox"
                  checked={newProperty.required}
                  onChange$={(event) => {
                    newProperty.required = (event.target as HTMLInputElement).checked;
                  }}
                />
                Requis
              </label>
            </div>

            {/* Contraintes spécifiques par type */}
            {newProperty.type === 'string' && (
              <div class="constraints-row">
                <input
                  class="input"
                  type="number"
                  value={newProperty.minLength || ''}
                  onInput$={(event) => {
                    const value = (event.target as HTMLInputElement).value;
                    newProperty.minLength = value ? parseInt(value) : undefined;
                  }}
                  placeholder="Longueur min"
                />
                <input
                  class="input"
                  type="number"
                  value={newProperty.maxLength || ''}
                  onInput$={(event) => {
                    const value = (event.target as HTMLInputElement).value;
                    newProperty.maxLength = value ? parseInt(value) : undefined;
                  }}
                  placeholder="Longueur max"
                />
                <select
                  class="select"
                  value={newProperty.format || ''}
                  onChange$={(event) => {
                    const value = (event.target as HTMLSelectElement).value;
                    newProperty.format = value || undefined;
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

            {(newProperty.type === 'number' || newProperty.type === 'integer') && (
              <div class="constraints-row">
                <input
                  class="input"
                  type="number"
                  value={newProperty.minimum ?? ''}
                  onInput$={(event) => {
                    const value = (event.target as HTMLInputElement).value;
                    newProperty.minimum = value ? parseFloat(value) : undefined;
                  }}
                  placeholder="Valeur min"
                />
                <input
                  class="input"
                  type="number"
                  value={newProperty.maximum ?? ''}
                  onInput$={(event) => {
                    const value = (event.target as HTMLInputElement).value;
                    newProperty.maximum = value ? parseFloat(value) : undefined;
                  }}
                  placeholder="Valeur max"
                />
              </div>
            )}
          </div>

          {/* Liste des propriétés */}
          <div class="properties-list">
            {properties.length === 0 && (
              <div class="empty-state">
                Aucune propriété définie. Ajoutez votre première propriété ci-dessus.
              </div>
            )}
            
            {properties.map((prop, index) => (
              <div key={`${prop.name}-${index}`} class="property-item">
                <div class="property-header">
                  <h4 class="property-name">{prop.name}</h4>
                  <button
                    class="btn-remove"
                    onClick$={() => handleRemoveProperty(index, properties)}
                    title="Supprimer la propriété"
                  >
                    ✕
                  </button>
                </div>
                
                <div class="badges">
                  <span class="badge type-badge">{prop.type}</span>
                  {prop.required && <span class="badge required-badge">Requis</span>}
                </div>
                
                {prop.description && (
                  <p class="property-description">{prop.description}</p>
                )}
                
                <div class="constraints">
                  {prop.minLength !== undefined && <span class="constraint">Min: {prop.minLength}</span>}
                  {prop.maxLength !== undefined && <span class="constraint">Max: {prop.maxLength}</span>}
                  {prop.minimum !== undefined && <span class="constraint">Min: {prop.minimum}</span>}
                  {prop.maximum !== undefined && <span class="constraint">Max: {prop.maximum}</span>}
                  {prop.format && <span class="constraint">Format: {prop.format}</span>}
                  {prop.enum && <span class="constraint">Enum: {prop.enum.join(', ')}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panneau de prévisualisation */}
        <div class="panel preview-panel">
          <h2 class="panel-title">Aperçu JSON Schema</h2>
          
          {!uiState.isValid && uiState.validationErrors.length > 0 && (
            <div class="validation-errors">
              {uiState.validationErrors.map((error, index) => (
                <div key={index} class="error-item">{error}</div>
              ))}
            </div>
          )}
          
          <pre class="schema-preview">{uiState.generatedJson || '{\n  "type": "object"\n}'}</pre>
          
          <div class="actions">
            <button
              class="btn btn-primary"
              disabled={!uiState.generatedJson}
              onClick$={async () => {
                const result = await handleCopyToClipboard(uiState.generatedJson);
                await handleShowNotification(result.success ? 'success' : 'error', result.message, uiState);
              }}
            >
              Copier le JSON
            </button>
            
            <button
              class="btn btn-success"
              disabled={!uiState.isValid || !schemaInfo.name.trim() || isSaving.value}
              onClick$={async () => {
                isSaving.value = true;
                const result = await handleSaveAndClear(schemaInfo.name, schemaInfo, properties);
                await handleShowNotification(result.success ? 'success' : 'error', result.message, uiState);
                
                if (result.success) {
                  uiState.hasUnsavedChanges = false;
                  // Redirection après sauvegarde réussie
                  setTimeout(() => {
                    window.location.href = '/';
                  }, 1500);
                }
                
                isSaving.value = false;
              }}
            >
              {isSaving.value ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {uiState.notification.show && (
        <div class={`notification ${uiState.notification.type}`}>
          {uiState.notification.message}
        </div>
      )}
    </div>
  );
});