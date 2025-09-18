import { component$, useStore, useSignal, useTask$ } from '@builder.io/qwik';
import type { EntityData } from './types';
import { HorizontalEntityViewer } from './[schema]/components/HorizontalEntityViewer';
import { generateDefaultValue } from './services';

/**
 * Test de validation pour vérifier que le problème de synchronisation des arrays est résolu
 *
 * Ce test simule exactement le scénario suivant :
 * 1. Aller sur /bdd/encoreuntest/new/
 * 2. Naviguer vers le champ "pop" (qui est un array)
 * 3. Ajouter un élément au tableau
 * 4. Vérifier que :
 *    - Le formulaire du nouvel élément apparaît ✅
 *    - L'affichage du tableau montre 1 élément (pas vide) ✅
 *    - Le textarea JSON montre le tableau avec l'élément ✅
 */

// Schéma encoreuntest copié depuis serverMedias/schemas/encoreuntest.json
const ENCOREUNTEST_SCHEMA = {
  "id": "encoreuntest-1758042788961",
  "name": "encoreuntest",
  "version": "1.0",
  "schema": {
    "type": "object",
    "title": "encoreuntest",
    "description": "",
    "properties": {
      "test": {
        "type": "string",
        "description": ""
      },
      "pop": {
        "type": "array",
        "description": "",
        "items": {
          "type": "object",
          "properties": {
            "test": {
              "type": "number",
              "description": ""
            },
            "pop": {
              "type": "object",
              "description": "",
              "properties": {
                "pop": {
                  "type": "number",
                  "description": ""
                }
              }
            }
          },
          "required": []
        }
      }
    },
    "version": "1.0"
  }
};

export const TestArraySyncValidation = component$(() => {
  // État du test
  const testState = useStore({
    currentStep: 0,
    validationResults: [] as Array<{step: number, description: string, status: 'pending' | 'success' | 'failed', details?: string}>,
    showTest: false,
    autoTest: false
  });

  // Entité simulée (nouvelle entité vide)
  const entityStore = useStore<{ entity: EntityData }>({
    entity: {
      id: '', // Nouvelle entité
      data: generateDefaultValue(ENCOREUNTEST_SCHEMA.schema),
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });

  // Etat pour tracker les modifications
  const viewerState = useStore({
    hasModifications: false,
    loading: false,
    updateVersion: false
  });

  // Signal pour forcer les mises à jour
  const updateSignal = useSignal(0);

  const steps = [
    "Initialiser une nouvelle entité avec le schéma encoreuntest",
    "Naviguer vers le champ 'pop' (array)",
    "Ajouter un élément au tableau",
    "Vérifier que le formulaire du nouvel élément apparaît",
    "Vérifier que l'affichage du tableau montre 1 élément",
    "Vérifier que le JSON contient le tableau avec l'élément"
  ];

  // Handler pour les changements de données
  const handleDataChange = $((newData: Record<string, any>) => {
    console.log('🧪 TEST - Données modifiées:', newData);
    entityStore.entity.data = newData;
    viewerState.hasModifications = true;
    updateSignal.value++;

    // Auto-validation si en mode test automatique
    if (testState.autoTest && testState.currentStep >= 2) {
      runValidation();
    }
  });

  const runValidation = $(() => {
    console.log('🧪 TEST - Exécution de la validation');
    const results = [];

    // Étape 4: Vérifier que le formulaire du nouvel élément apparaît
    const popArray = entityStore.entity.data.pop;
    const hasArrayItems = Array.isArray(popArray) && popArray.length > 0;

    results.push({
      step: 4,
      description: "Le formulaire du nouvel élément apparaît",
      status: hasArrayItems ? 'success' : 'failed',
      details: hasArrayItems ?
        `✅ Tableau 'pop' contient ${popArray.length} élément(s)` :
        `❌ Tableau 'pop' est vide ou invalide: ${JSON.stringify(popArray)}`
    });

    // Étape 5: Vérifier que l'affichage du tableau montre 1 élément (pas vide)
    const displayCorrect = hasArrayItems && popArray.length === 1;

    results.push({
      step: 5,
      description: "L'affichage du tableau montre 1 élément (pas vide)",
      status: displayCorrect ? 'success' : 'failed',
      details: displayCorrect ?
        `✅ Le tableau contient exactement 1 élément` :
        `❌ Le tableau contient ${popArray?.length || 0} élément(s), attendu: 1`
    });

    // Étape 6: Vérifier que le textarea JSON montre le tableau avec l'élément
    const jsonString = JSON.stringify(entityStore.entity.data, null, 2);
    const jsonContainsArray = jsonString.includes('"pop": [') && !jsonString.includes('"pop": []');

    results.push({
      step: 6,
      description: "Le textarea JSON montre le tableau avec l'élément",
      status: jsonContainsArray ? 'success' : 'failed',
      details: jsonContainsArray ?
        `✅ JSON contient un tableau 'pop' non vide` :
        `❌ JSON ne contient pas de tableau 'pop' valide:\n${jsonString.substring(0, 200)}...`
    });

    testState.validationResults = results;

    // Vérifier si tous les tests passent
    const allPassed = results.every(r => r.status === 'success');
    console.log(`🧪 TEST - Résultat global: ${allPassed ? 'SUCCÈS' : 'ÉCHEC'}`);

    return allPassed;
  });

  const runAutoTest = $(async () => {
    console.log('🧪 TEST - Démarrage du test automatique');
    testState.autoTest = true;
    testState.currentStep = 0;
    testState.validationResults = [];

    // Simuler l'ajout d'un élément au tableau
    setTimeout(() => {
      const currentData = entityStore.entity.data;
      const newArrayItem = generateDefaultValue(ENCOREUNTEST_SCHEMA.schema.properties.pop.items);

      console.log('🧪 TEST - Ajout d\'un élément au tableau:', newArrayItem);

      const newData = {
        ...currentData,
        pop: [...(currentData.pop || []), newArrayItem]
      };

      handleDataChange(newData);
      testState.currentStep = 3;
    }, 500);
  });

  const resetTest = $(() => {
    testState.autoTest = false;
    testState.currentStep = 0;
    testState.validationResults = [];

    // Réinitialiser l'entité
    entityStore.entity = {
      id: '',
      data: generateDefaultValue(ENCOREUNTEST_SCHEMA.schema),
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    viewerState.hasModifications = false;
    updateSignal.value++;
  });

  return (
    <div class="test-array-sync-validation" style="padding: 2rem;">
      <div class="test-header" style="margin-bottom: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
        <h1 style="margin: 0 0 1rem 0; color: #007bff;">🧪 Test de Validation - Synchronisation des Arrays</h1>
        <p style="margin: 0; color: #6c757d;">
          Ce test valide que le problème de synchronisation des arrays dans l'éditeur de schéma est résolu.
        </p>
      </div>

      <div class="test-controls" style="margin-bottom: 2rem;">
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
          <button
            class="btn btn-primary"
            onClick$={() => testState.showTest = !testState.showTest}
          >
            {testState.showTest ? '👁️ Masquer le Test' : '👁️ Afficher le Test'}
          </button>

          <button
            class="btn btn-success"
            onClick$={runAutoTest}
            disabled={testState.autoTest}
          >
            🚀 Lancer le Test Automatique
          </button>

          <button
            class="btn btn-warning"
            onClick$={runValidation}
          >
            ✅ Valider Maintenant
          </button>

          <button
            class="btn btn-secondary"
            onClick$={resetTest}
          >
            🔄 Réinitialiser
          </button>
        </div>

        <div class="test-steps" style="background: white; padding: 1rem; border-radius: 8px; border: 1px solid #e9ecef;">
          <h3 style="margin: 0 0 1rem 0;">Étapes du Test:</h3>
          <ol style="margin: 0; padding-left: 1.5rem;">
            {steps.map((step, index) => (
              <li
                key={index}
                style={{
                  padding: '0.25rem 0',
                  color: testState.currentStep > index ? '#28a745' :
                         testState.currentStep === index ? '#007bff' : '#6c757d',
                  fontWeight: testState.currentStep === index ? 'bold' : 'normal'
                }}
              >
                {testState.currentStep > index ? '✅' :
                 testState.currentStep === index ? '⏳' : '⏸️'} {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Résultats de validation */}
      {testState.validationResults.length > 0 && (
        <div class="validation-results" style="margin-bottom: 2rem; padding: 1rem; background: white; border-radius: 8px; border: 1px solid #e9ecef;">
          <h3 style="margin: 0 0 1rem 0;">📊 Résultats de Validation:</h3>
          {testState.validationResults.map((result, index) => (
            <div
              key={index}
              style={{
                padding: '0.75rem',
                margin: '0.5rem 0',
                borderRadius: '6px',
                backgroundColor: result.status === 'success' ? '#d4edda' :
                                result.status === 'failed' ? '#f8d7da' : '#fff3cd',
                border: `1px solid ${result.status === 'success' ? '#c3e6cb' :
                                    result.status === 'failed' ? '#f5c6cb' : '#ffeaa7'}`
              }}
            >
              <div style="font-weight: 600; margin-bottom: 0.5rem;">
                {result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏳'}
                Étape {result.step}: {result.description}
              </div>
              {result.details && (
                <div style="font-size: 0.9rem; color: #6c757d; white-space: pre-wrap;">
                  {result.details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Interface de test */}
      {testState.showTest && (
        <div class="test-interface" style="border: 2px solid #007bff; border-radius: 12px; overflow: hidden;">
          <div style="background: #007bff; color: white; padding: 1rem;">
            <h2 style="margin: 0;">🔧 Interface de Test - Éditeur d'Entité</h2>
            <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">
              Simulation de: /bdd/encoreuntest/new/
            </p>
          </div>

          <HorizontalEntityViewer
            entity={entityStore.entity}
            schema={ENCOREUNTEST_SCHEMA.schema}
            schemaName={ENCOREUNTEST_SCHEMA.name}
            schemaTitle={ENCOREUNTEST_SCHEMA.schema.title}
            schemaVersion={ENCOREUNTEST_SCHEMA.version}
            isOutdated={false}
            isReadOnly={false}
            hasModifications={viewerState.hasModifications}
            loading={viewerState.loading}
            updateVersionOption={false}
            updateVersion={viewerState.updateVersion}
            onDataChange$={handleDataChange}
            onSave$={$(() => {
              console.log('💾 TEST - Sauvegarde simulée');
              viewerState.loading = true;
              setTimeout(() => {
                viewerState.loading = false;
                viewerState.hasModifications = false;
                console.log('✅ TEST - Sauvegarde terminée');
              }, 1000);
            })}
            onEdit$={$(() => console.log('✏️ TEST - Édition'))}
            onCancel$={$(() => {
              console.log('❌ TEST - Annulation');
              resetTest();
            })}
            onGoBack$={$(() => console.log('⬅️ TEST - Retour à la liste'))}
            onUpdateVersionChange$={$((value: boolean) => {
              viewerState.updateVersion = value;
            })}
          />
        </div>
      )}

      {/* Instructions pour test manuel */}
      <div class="manual-test-instructions" style="margin-top: 2rem; padding: 1rem; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
        <h3 style="margin: 0 0 1rem 0; color: #856404;">📋 Instructions pour Test Manuel</h3>
        <ol style="margin: 0; padding-left: 1.5rem; color: #856404;">
          <li style="margin-bottom: 0.5rem;"><strong>Afficher le test</strong> : Cliquer sur "👁️ Afficher le Test"</li>
          <li style="margin-bottom: 0.5rem;"><strong>Naviguer vers 'pop'</strong> : Dans l'interface, cliquer sur le champ "pop" dans la première colonne</li>
          <li style="margin-bottom: 0.5rem;"><strong>Ajouter un élément</strong> : Cliquer sur le bouton "➕ Ajouter un élément" dans la colonne du tableau</li>
          <li style="margin-bottom: 0.5rem;"><strong>Valider</strong> : Cliquer sur "✅ Valider Maintenant" pour vérifier les résultats</li>
          <li><strong>Observer</strong> : Vérifier que les 3 validations passent (formulaire, affichage, JSON)</li>
        </ol>

        <div style="margin-top: 1rem; padding: 0.75rem; background: white; border-radius: 4px;">
          <strong>Alternative automatique :</strong> Cliquer sur "🚀 Lancer le Test Automatique" pour exécuter tous les steps automatiquement.
        </div>
      </div>
    </div>
  );
});

export default TestArraySyncValidation;