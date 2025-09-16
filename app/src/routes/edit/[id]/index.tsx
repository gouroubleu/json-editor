import { component$, useStore, useSignal, useStyles$, useTask$, useVisibleTask$, $ } from '@builder.io/qwik';
import { routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { 
  handleGenerateSchema,
  handleCopyToClipboard,
  handleShowNotification
} from '../../handlers';
import { 
  handleAutoSave,
  handleRestoreDraft,
  handleCheckDraft,
  handleClearDraft,
  handleBeforeUnload
} from './handlers';
import {
  handleAddNestedProperty,
  handleRemoveNestedProperty,
  handleToggleExpanded,
  handleUpdateProperty,
  handleUpdatePropertyType,
  handleUpdateArrayItemType
} from '../../nestedHandlers';
import { updateSchema } from '../../services';
import { HorizontalSchemaEditor } from '../../components/HorizontalSchemaEditor';
import { generatePropertyId, ensureAllPropertyIds } from '../../utils';
import type { SchemaProperty, SchemaInfo, JsonSchemaType } from '../../types';
import HORIZONTAL_STYLES from '../../components/HorizontalSchemaEditor.scss?inline';
import COLUMN_STYLES from '../../components/PropertyColumn.scss?inline';
import COMMON_STYLES from '../../components/CommonStyles.scss?inline';

// Fonction pour convertir un JSON Schema en SchemaProperty[]
const convertJsonSchemaToProperties = (schema: any): SchemaProperty[] => {
  const properties: SchemaProperty[] = [];
  
  if (schema.properties) {
    for (const [propName, propDef] of Object.entries(schema.properties)) {
      const prop = propDef as any;
      
      const schemaProperty: SchemaProperty = {
        id: generatePropertyId(),
        name: propName,
        type: prop.type || 'string',
        required: schema.required?.includes(propName) || false,
        description: prop.description || '',
        minLength: prop.minLength,
        maxLength: prop.maxLength,
        minimum: prop.minimum,
        maximum: prop.maximum,
        enum: prop.enum,
        format: prop.format
      };
      
      // Gérer les objets imbriqués
      if (prop.type === 'object' && prop.properties) {
        schemaProperty.properties = convertJsonSchemaToProperties(prop);
      }
      
      // Gérer les arrays d'objets
      if (prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties) {
        schemaProperty.items = {
          type: 'object',
          properties: convertJsonSchemaToProperties(prop.items)
        };
      } else if (prop.type === 'array' && prop.items?.type) {
        schemaProperty.items = {
          type: prop.items.type
        };
      }
      
      properties.push(schemaProperty);
    }
  }
  
  return properties;
};

export const useSchemaData = routeLoader$(async ({ params }) => {
  const schemaId = params.id;
  
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const schemasDir = path.join(process.cwd(), 'serverMedias', 'schemas');
    const filePath = path.join(schemasDir, `${schemaId}.json`);
    
    // Vérifier que le fichier existe
    await fs.access(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const schemaData = JSON.parse(content);
    
    // Vérifier si c'est un schéma versionné ou ancien format
    let schemaToConvert, schemaInfo;
    
    if (schemaData.version && schemaData.schema && schemaData.versionInfo) {
      // Nouveau format versionné
      schemaToConvert = schemaData.schema;
      schemaInfo = {
        name: schemaData.name || schemaId,
        title: schemaData.schema.title || '',
        description: schemaData.schema.description || '',
        type: schemaData.schema.type || 'object'
      };
    } else {
      // Ancien format
      schemaToConvert = schemaData;
      schemaInfo = {
        name: schemaData.name || schemaId,
        title: schemaData.title || '',
        description: schemaData.description || '',
        type: schemaData.type || 'object'
      };
    }
    
    // Convertir en format SchemaProperty pour HorizontalSchemaEditor
    const properties = convertJsonSchemaToProperties(schemaToConvert);
    
    return {
      id: schemaId,
      schemaInfo: schemaInfo,
      properties: properties,
      originalSchema: schemaData
    };
  } catch (error) {
    throw new Error('Schéma non trouvé');
  }
});

export default component$(() => {
  useStyles$(HORIZONTAL_STYLES);
  useStyles$(COLUMN_STYLES);
  useStyles$(COMMON_STYLES);
  
  const nav = useNavigate();
  const schemaData = useSchemaData();
  
  // État du schéma avec données existantes
  const schemaInfo = useStore<SchemaInfo>({
    name: schemaData.value.schemaInfo.name,
    title: schemaData.value.schemaInfo.title,
    description: schemaData.value.schemaInfo.description,
    type: schemaData.value.schemaInfo.type
  });

  // Liste des propriétés avec données existantes
  const properties = useStore<SchemaProperty[]>(schemaData.value.properties);

  // État de l'interface avec système de brouillon intelligent
  const uiState = useStore({
    generatedJson: '',
    validationErrors: [] as string[],
    isValid: true,
    notification: { show: false, type: 'success', message: '' },
    showDraftModal: false,
    hasModifications: false
  });

  // Données originales pour détecter les modifications
  const originalData = useStore({
    schemaInfo: { ...schemaData.value.schemaInfo },
    properties: JSON.stringify(schemaData.value.properties)
  });

  // Vérifier les brouillons seulement s'il y en a vraiment un
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const hasDraft = await handleCheckDraft(schemaData.value.id);
    if (hasDraft) {
      uiState.showDraftModal = true;
    }
  });

  // Détecter les modifications et activer l'auto-save
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => schemaInfo.name);
    track(() => schemaInfo.title);
    track(() => schemaInfo.description);
    track(() => schemaInfo.type);
    track(() => JSON.stringify(properties));

    // Vérifier s'il y a eu des modifications par rapport aux données originales
    const currentSchemaInfo = {
      name: schemaInfo.name,
      title: schemaInfo.title,
      description: schemaInfo.description,
      type: schemaInfo.type
    };
    
    const hasSchemaInfoChanged = JSON.stringify(currentSchemaInfo) !== JSON.stringify(originalData.schemaInfo);
    const hasPropertiesChanged = JSON.stringify(properties) !== originalData.properties;
    
    const hasModifications = hasSchemaInfoChanged || hasPropertiesChanged;
    
    if (hasModifications !== uiState.hasModifications) {
      uiState.hasModifications = hasModifications;
    }

    // Pas d'auto-save automatique, juste détection des modifications
  });

  // Protection avant fermeture seulement s'il y a des modifications
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (uiState.hasModifications) {
        // Sauvegarder en brouillon avant fermeture
        ensureAllPropertyIds(properties);
        handleAutoSave(schemaData.value.id, schemaInfo, properties);
        
        const message = 'Vous avez des modifications non sauvegardées. Elles seront automatiquement restaurées à votre prochaine visite.';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);

    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
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

  const handleUpdate = $(async () => {
    ensureAllPropertyIds(properties);
    
    // Générer le schéma complet d'abord
    const generatedSchema = await handleGenerateSchema(schemaInfo, properties);
    
    if (!generatedSchema.validation.isValid) {
      await handleShowNotification('error', `Schéma invalide: ${generatedSchema.validation.errors.join(', ')}`, uiState);
      return;
    }
    
    // Utiliser le schéma généré pour la mise à jour
    const result = await updateSchema(schemaData.value.id, schemaInfo.name, generatedSchema.schema);
    
    await handleShowNotification(result.success ? 'success' : 'error', result.message, uiState);
    
    if (result.success) {
      // Nettoyer le brouillon après sauvegarde réussie
      await handleClearDraft(schemaData.value.id);
      uiState.hasModifications = false;
      
      setTimeout(() => {
        nav('/bo/schemaEditor/');
      }, 1500);
    }
  });

  return (
    <div class="edit-schema-page">
      {/* Modal de restauration de brouillon (seulement si modifications précédentes) */}
      {uiState.showDraftModal && (
        <div class="modal-overlay">
          <div class="modall">
            <div class="modal-header">
              <h2>⚠️ Modifications non sauvegardées détectées</h2>
            </div>
            <div class="modal-content">
              <p>Nous avons trouvé des modifications non sauvegardées pour ce schéma lors de votre dernière session d'édition.</p>
              <p><strong>Voulez-vous restaurer ces modifications ?</strong></p>
            </div>
            <div class="modal-actions">
              <button
                class="btn btn-primary"
                onClick$={$(async () => {
                  const draft = await handleRestoreDraft(schemaData.value.id);
                  if (draft) {
                    Object.assign(schemaInfo, draft.schemaInfo);
                    properties.splice(0, properties.length, ...draft.properties);
                    ensureAllPropertyIds(properties);
                    uiState.hasModifications = true;
                    await handleShowNotification('success', 'Modifications restaurées avec succès', uiState);
                  }
                  uiState.showDraftModal = false;
                })}
              >
                ✅ Restaurer les modifications
              </button>
              <button
                class="btn btn-danger"
                onClick$={$(async () => {
                  await handleClearDraft(schemaData.value.id);
                  uiState.showDraftModal = false;
                  await handleShowNotification('info', 'Modifications précédentes ignorées', uiState);
                })}
              >
                ❌ Ignorer et reprendre du schéma original
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
        onSave$={handleUpdate}
        hasModifications={uiState.hasModifications}
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