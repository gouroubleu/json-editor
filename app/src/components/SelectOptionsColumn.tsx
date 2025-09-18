import { component$, useStore, type PropFunction, $ } from '@builder.io/qwik';
import type { SchemaProperty, SelectOption } from '../routes/types';

type SelectOptionsColumnProps = {
  selectProperty: SchemaProperty;
  parentName: string;
  onUpdateProperty$: PropFunction<(propertyId: string, updates: Partial<SchemaProperty>) => Promise<void>>;
  onGoBack$: PropFunction<() => void>;
};

export const SelectOptionsColumn = component$<SelectOptionsColumnProps>((props) => {
  const localState = useStore({
    newKey: '',
    newValue: ''
  });

  const handleAddOption = $(async () => {
    if (!localState.newKey.trim() || !localState.newValue.trim()) return;

    const currentOptions = props.selectProperty.selectOptions || [];
    const newOptions: SelectOption[] = [...currentOptions, {
      key: localState.newKey.trim(),
      value: localState.newValue.trim()
    }];

    await props.onUpdateProperty$(props.selectProperty.id!, { selectOptions: newOptions });
    localState.newKey = '';
    localState.newValue = '';
  });

  const handleUpdateOption = $(async (index: number, field: 'key' | 'value', newValue: string) => {
    const currentOptions = props.selectProperty.selectOptions || [];
    const updatedOptions = [...currentOptions];
    updatedOptions[index] = { ...updatedOptions[index], [field]: newValue };

    await props.onUpdateProperty$(props.selectProperty.id!, { selectOptions: updatedOptions });
  });

  const handleRemoveOption = $(async (index: number) => {
    const currentOptions = props.selectProperty.selectOptions || [];
    const updatedOptions = currentOptions.filter((_, i) => i !== index);

    await props.onUpdateProperty$(props.selectProperty.id!, { selectOptions: updatedOptions });
  });

  const options = props.selectProperty.selectOptions || [];


  return (
    <div class="property-column">
      {/* En-tête de colonne */}
      <div class="column-header">
        <button class="back-btn" onClick$={() => props.onGoBack$()}>
          ← Retour
        </button>
        <h3 class="column-title">{props.parentName}</h3>
        <div class="subtitle" style="font-size: 0.9rem; color: #666; margin-top: 0.25rem;">
          Gérer les options de sélection
        </div>
      </div>

      {/* Formulaire d'ajout d'option */}
      <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
          <input
            class="input"
            type="text"
            value={localState.newKey}
            onInput$={(event) => {
              localState.newKey = (event.target as HTMLInputElement).value;
            }}
            placeholder="Clé (ID technique)..."
            style="flex: 1;"
          />
          <input
            class="input"
            type="text"
            value={localState.newValue}
            onInput$={(event) => {
              localState.newValue = (event.target as HTMLInputElement).value;
            }}
            placeholder="Valeur (affichage)..."
            onKeyDown$={(event) => {
              if (event.key === 'Enter') {
                handleAddOption();
              }
            }}
            style="flex: 1;"
          />
        </div>
        <button
          class="btn btn-primary"
          onClick$={handleAddOption}
          disabled={!localState.newKey.trim() || !localState.newValue.trim()}
          style="width: 100%; padding: 0.5rem;"
        >
          ➕ Ajouter option
        </button>
      </div>

      {/* Liste des options existantes */}
      <div class="properties-list">
        {options.length === 0 && (
          <div class="empty-state">
            Aucune option définie. Ajoutez votre première option ci-dessus.
          </div>
        )}

        {options.map((option, index) => (
          <div key={index} style="padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px; margin-bottom: 0.5rem; background: white;">
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
              <span style="color: #6c757d; font-size: 0.9rem; min-width: 20px; font-weight: bold;">{index + 1}.</span>
              <span style="color: #6c757d; font-size: 0.8rem; min-width: 30px;">Key:</span>
              <input
                class="input"
                type="text"
                value={option.key}
                onInput$={async (event) => {
                  const newValue = (event.target as HTMLInputElement).value;
                  await handleUpdateOption(index, 'key', newValue);
                }}
                placeholder="key"
                style="flex: 1; margin: 0; font-family: monospace;"
              />
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span style="min-width: 20px;"></span>
              <span style="color: #6c757d; font-size: 0.8rem; min-width: 30px;">Val:</span>
              <input
                class="input"
                type="text"
                value={option.value}
                onInput$={async (event) => {
                  const newValue = (event.target as HTMLInputElement).value;
                  await handleUpdateOption(index, 'value', newValue);
                }}
                placeholder="valeur affichée"
                style="flex: 1; margin: 0;"
              />
              <button
                class="delete-btn"
                onClick$={() => handleRemoveOption(index)}
                title="Supprimer cette option"
                style="padding: 0.25rem 0.5rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
});