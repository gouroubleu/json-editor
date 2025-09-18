import { component$, useStore, useSignal, useStyles$, useTask$, useVisibleTask$, $ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { 
  handleGenerateSchema,
  handleCopyToClipboard,
  handleShowNotification
} from '../handlers';
import { 
  handleAutoSave,
  handleRestoreDraft,
  handleCheckDraft,
  handleClearDraft,
  handleSaveAndClear,
  handleBeforeUnload
} from './handlers';
import {
  handleAddNestedProperty,
  handleRemoveNestedProperty,
  handleToggleExpanded,
  handleUpdateProperty,
  handleUpdatePropertyType,
  handleUpdateArrayItemType
} from '../nestedHandlers';
import { HorizontalSchemaEditor } from '../../components/HorizontalSchemaEditor';
import { generatePropertyId, ensureAllPropertyIds } from '../utils';
import type { SchemaProperty, SchemaInfo, JsonSchemaType } from '../types';
import HORIZONTAL_STYLES from '../../components/HorizontalSchemaEditor.scss?inline';
import COLUMN_STYLES from '../../components/PropertyColumn.scss?inline';
import COMMON_STYLES from '../../components/CommonStyles.scss?inline';

export default component$(() => {
  useStyles$(HORIZONTAL_STYLES);
  useStyles$(COLUMN_STYLES);
  useStyles$(COMMON_STYLES);
  
  const nav = useNavigate();
  
  // État du schéma avec initialisation des IDs
  const schemaInfo = useStore<SchemaInfo>({
    name: '',
    title: '',
    description: '',
    type: 'object'
  });

  // Liste des propriétés avec IDs
  const properties = useStore<SchemaProperty[]>([]);

  // État de l'interface
  const uiState = useStore({
    generatedJson: '',
    validationErrors: [] as string[],
    isValid: true,
    notification: { show: false, type: 'success', message: '' },
    showDraftModal: false,
    hasUnsavedChanges: false,
    lastSaved: null as string | null,
    autoSaveTimer: null as any
  });


  // Vérifier les brouillons au chargement
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const hasDraft = await handleCheckDraft();
    if (hasDraft) {
      uiState.showDraftModal = true;
    }
  });

  // Auto-save toutes les 10 secondes
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => schemaInfo.name);
    track(() => schemaInfo.title);
    track(() => schemaInfo.description);
    track(() => properties.length);
    track(() => JSON.stringify(properties)); // Track deep changes

    uiState.hasUnsavedChanges = true;

    if (uiState.autoSaveTimer) {
      clearTimeout(uiState.autoSaveTimer);
    }

    uiState.autoSaveTimer = setTimeout(async () => {
      ensureAllPropertyIds(properties);
      await handleAutoSave(schemaInfo, properties);
      uiState.lastSaved = new Date().toLocaleTimeString();
    }, 10000); // 10 secondes
  });

  // Protection avant fermeture
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      const message = handleBeforeUnload(schemaInfo, properties);
      if (message) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);

    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      if (uiState.autoSaveTimer) {
        clearTimeout(uiState.autoSaveTimer);
      }
    };
  });

  // Génération automatique du schéma
  useTask$(async ({ track }) => {
    track(() => schemaInfo.name);
    track(() => schemaInfo.title);
    track(() => schemaInfo.description);
    track(() => schemaInfo.type);
    track(() => JSON.stringify(properties));

    if (schemaInfo.name || properties.length > 0) {
      const result = await handleGenerateSchema(schemaInfo, properties);
      uiState.generatedJson = result.json;
      uiState.validationErrors = result.validation.errors;
      uiState.isValid = result.validation.isValid;
    }
  });

  // Handlers pour l'interface horizontale
  const handleUpdateSchemaInfo = $(async (updates: Partial<SchemaInfo>) => {
    Object.assign(schemaInfo, updates);
  });

  const handleAddProperty = $(async (parentId: string | null, name: string, type: JsonSchemaType, required: boolean, description: string) => {
    ensureAllPropertyIds(properties);
    const result = await handleAddNestedProperty(properties, parentId, name, type, required, description);
    if (!result.success && result.error) {
      await handleShowNotification('error', result.error, uiState);
    }
  });

  const handleRemoveProperty = $(async (propertyId: string) => {
    const result = await handleRemoveNestedProperty(properties, propertyId);
    if (!result.success) {
      await handleShowNotification('error', 'Erreur lors de la suppression', uiState);
    }
  });

  const handleUpdatePropertyWrapper = $(async (propertyId: string, updates: Partial<SchemaProperty>) => {
    const result = await handleUpdateProperty(properties, propertyId, updates);
    if (!result.success && result.error) {
      await handleShowNotification('error', result.error, uiState);
    }
  });

  const handleUpdatePropertyTypeWrapper = $(async (propertyId: string, newType: JsonSchemaType) => {
    const result = await handleUpdatePropertyType(properties, propertyId, newType);
    if (!result.success && result.error) {
      await handleShowNotification('error', result.error, uiState);
    }
  });

  const handleUpdateArrayItemTypeWrapper = $(async (arrayPropertyId: string, newItemType: JsonSchemaType) => {
    const result = await handleUpdateArrayItemType(properties, arrayPropertyId, newItemType);
    if (!result.success && result.error) {
      await handleShowNotification('error', result.error, uiState);
    }
  });

  const handleCopyJson = $(async () => {
    const result = await handleCopyToClipboard(uiState.generatedJson);
    await handleShowNotification(result.success ? 'success' : 'error', result.message, uiState);
  });

  const handleSave = $(async () => {
    console.log('🚀 Début sauvegarde', { name: schemaInfo.name, properties: properties.length });
    
    ensureAllPropertyIds(properties);
    const result = await handleSaveAndClear(schemaInfo.name, schemaInfo, properties);
    
    console.log('📝 Résultat sauvegarde:', result);
    
    await handleShowNotification(result.success ? 'success' : 'error', result.message, uiState);
    
    if (result.success) {
      uiState.hasUnsavedChanges = false;
      console.log('✅ Redirection vers la liste...');
      setTimeout(() => {
        nav('/');
      }, 1500);
    }
  });

  return (
    <div class="new-schema-page">
      {/* Modal de restauration de brouillon */}
      {uiState.showDraftModal && (
        <div class="modal-overlay">
          <div class="modall">
            <div class="modal-header">
              <h2>Brouillon détecté</h2>
            </div>
            <div class="modal-content">
              <p>Nous avons trouvé un brouillon non sauvegardé. Voulez-vous le restaurer ?</p>
            </div>
            <div class="modal-actions">
              <button
                class="btn btn-primary"
                onClick$={$(async () => {
                  const draft = await handleRestoreDraft();
                  if (draft) {
                    Object.assign(schemaInfo, draft.schemaInfo);
                    properties.splice(0, properties.length, ...draft.properties);
                    ensureAllPropertyIds(properties);
                    await handleShowNotification('success', 'Brouillon restauré avec succès', uiState);
                  }
                  uiState.showDraftModal = false;
                })}
              >
                Restaurer le brouillon
              </button>
              <button
                class="btn btn-secondary"
                onClick$={$(async () => {
                  await handleClearDraft();
                  uiState.showDraftModal = false;
                })}
              >
                Ignorer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interface horizontale */}
      <HorizontalSchemaEditor
        schemaInfo={schemaInfo}
        properties={properties}
        onUpdateSchemaInfo$={handleUpdateSchemaInfo}
        onAddProperty$={handleAddProperty}
        onRemoveProperty$={handleRemoveProperty}
        onUpdateProperty$={handleUpdatePropertyWrapper}
        onUpdatePropertyType$={handleUpdatePropertyTypeWrapper}
        onUpdateArrayItemType$={handleUpdateArrayItemTypeWrapper}
        generatedJson={uiState.generatedJson}
        validationErrors={uiState.validationErrors}
        isValid={uiState.isValid}
        onCopyJson$={handleCopyJson}
        onSave$={handleSave}
      />

      {/* Notification */}
      {uiState.notification.show && (
        <div class={`notification ${uiState.notification.type}`}>
          {uiState.notification.message}
        </div>
      )}
    </div>
  );
});