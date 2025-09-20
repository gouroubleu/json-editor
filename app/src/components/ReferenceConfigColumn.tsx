import { component$, type PropFunction, $, useStore, useTask$ } from '@builder.io/qwik';
import type { SchemaProperty, AvailableSchema } from '../routes/types';
import './PropertyColumn.scss';
import './ReferenceConfigColumn.scss';

type ReferenceConfigColumnProps = {
  property: SchemaProperty;
  columnIndex: number;
  onGoBack$: PropFunction<(columnIndex: number) => void>;
  onUpdateProperty$: PropFunction<(propertyId: string, updates: Partial<SchemaProperty>) => Promise<void>>;
  availableSchemas: AvailableSchema[];
};

export const ReferenceConfigColumn = component$<ReferenceConfigColumnProps>((props) => {
  // Store réactif pour les métadonnées de référence
  const refMetadata = useStore((props.property as any).$refMetadata || {});

  // Synchroniser le store avec les changements de propriété
  useTask$(({ track }) => {
    const property = track(() => props.property);
    const newMetadata = (property as any).$refMetadata || {};

    // Mettre à jour le store si les métadonnées ont changé
    Object.assign(refMetadata, newMetadata);
  });

  const handleUpdateReference = $(async (updates: any) => {
    // Mettre à jour le store réactif local immédiatement
    Object.assign(refMetadata, updates);

    // Préparer les métadonnées complètes
    const updatedMetadata = { ...refMetadata };

    // Mettre à jour aussi la description si nécessaire
    let description = props.property.description;
    if (updates.title !== undefined || updates.schemaName !== undefined) {
      const title = updates.title !== undefined ? updates.title : updatedMetadata.title;
      const schemaName = updates.schemaName !== undefined ? updates.schemaName : updatedMetadata.schemaName;
      description = title ? `${title}` : `Référence vers ${schemaName}`;
    }

    // Mettre à jour les propriétés avec les nouvelles métadonnées
    await props.onUpdateProperty$(props.property.id!, {
      ...(description !== props.property.description && { description }),
      // Forcer la mise à jour des métadonnées personnalisées
      $refMetadata: updatedMetadata
    } as any);
  });

  return (
    <div class="property-column">
      {/* En-tête de colonne */}
      <div class="column-header">
        <button class="back-btn" onClick$={() => props.onGoBack$(props.columnIndex)}>
          ← Retour
        </button>
        <h3 class="column-title">{props.property.name} (référence)</h3>
      </div>

      {/* Configuration de la référence */}
      <div class="properties-list">
        {/* Schema référencé */}
        <label class="config-label">Schema référencé</label>
        <select
          class="property-type"
          value={refMetadata.schemaName || ''}
          onChange$={async (event) => {
            const schemaName = (event.target as HTMLSelectElement).value;

            // Auto-générer un titre si pas défini
            let title = refMetadata.title;
            if (!title && schemaName) {
              const schema = props.availableSchemas?.find(s => s.name === schemaName);
              title = schema?.title || schemaName;
            }

            await handleUpdateReference({ schemaName, title });
          }}
        >
          <option value="">Sélectionner un schema...</option>
          {props.availableSchemas?.map(schema => (
            <option key={schema.name} value={schema.name}>
              {schema.title} ({schema.name})
            </option>
          ))}
        </select>

        {/* Séparateur */}
        <hr class="config-separator" />

        {/* Options */}
        <label class="config-label">Options</label>
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={refMetadata.multiple || false}
            onChange$={async (event) => {
              const multiple = (event.target as HTMLInputElement).checked;
              await handleUpdateReference({ multiple });
            }}
          />
          <span>Multiple (array du schema référencé)</span>
        </label>

        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={props.property.required || false}
            onChange$={async (event) => {
              const required = (event.target as HTMLInputElement).checked;
              await props.onUpdateProperty$(props.property.id!, { required });
            }}
          />
          <span>Propriété requise</span>
        </label>

        {/* Séparateur */}
        <hr class="config-separator" />

        {/* Affichage */}
        <label class="config-label">Affichage</label>

        <label class="field-label">Titre personnalisé</label>
        <input
          class="property-name"
          type="text"
          value={refMetadata.title || ''}
          onInput$={async (event) => {
            const title = (event.target as HTMLInputElement).value;
            await handleUpdateReference({ title });
          }}
          placeholder="Titre pour l'affichage (optionnel)"
        />

        <label class="field-label">Description</label>
        <textarea
          class="description-input"
          value={props.property.description || ''}
          onInput$={async (event) => {
            const description = (event.target as HTMLTextAreaElement).value;
            await props.onUpdateProperty$(props.property.id!, { description });
          }}
          placeholder="Description de cette propriété"
        />

        {/* Informations du schema référencé */}
        {refMetadata.schemaName && (
          <>
            <hr class="config-separator" />
            <label class="config-label">Informations du schema</label>
            {(() => {
              const schema = props.availableSchemas?.find(s => s.name === refMetadata.schemaName);
              return schema ? (
                <div class="schema-info">
                  <div><strong>Nom:</strong> {schema.name}</div>
                  <div><strong>Titre:</strong> {schema.title}</div>
                  <div><strong>Description:</strong> {schema.description}</div>
                  {schema.version && <div><strong>Version:</strong> {schema.version}</div>}
                </div>
              ) : (
                <div class="schema-warning">⚠️ Schema non trouvé</div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
});