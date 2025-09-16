// Composant de test pour valider l'intégration du contexte BDD
import { component$, useSignal } from '@builder.io/qwik';
import { EntityProvider } from './provider';
import { useEntityContext, useEntitySummaries, useEntitySync } from './hooks';
import { DEFAULT_ENTITY_CONFIG } from './index';

/**
 * Composant de test interne pour valider les hooks
 */
const TestEntityHooks = component$(() => {
  const entityContext = useEntityContext();
  const summaries = useEntitySummaries();
  const sync = useEntitySync();

  const testResults = useSignal<string[]>([]);

  const runTests = $(async () => {
    const results: string[] = [];

    try {
      // Test 1: Contexte principal
      if (entityContext?.state) {
        results.push('✅ EntityContext accessible');
      } else {
        results.push('❌ EntityContext non accessible');
      }

      // Test 2: Hook summaries
      if (summaries?.summaries) {
        results.push('✅ useEntitySummaries fonctionne');
      } else {
        results.push('❌ useEntitySummaries échoue');
      }

      // Test 3: Hook sync
      if (sync?.syncStatus) {
        results.push('✅ useEntitySync fonctionne');
        results.push(`📊 Status: ${sync.syncStatus.status} - ${sync.syncStatus.message}`);
      } else {
        results.push('❌ useEntitySync échoue');
      }

      // Test 4: Actions disponibles
      if (entityContext?.actions?.summaries?.loadAll) {
        results.push('✅ Actions summaries disponibles');
      } else {
        results.push('❌ Actions summaries manquantes');
      }

      if (entityContext?.actions?.entities?.loadList) {
        results.push('✅ Actions entities disponibles');
      } else {
        results.push('❌ Actions entities manquantes');
      }

      // Test 5: Test du nouveau schéma 'encoreuntest'
      try {
        await entityContext.actions.filters.setSchemaName('encoreuntest');
        await entityContext.actions.filters.applyFilters();
        results.push('✅ Filtrage par schéma "encoreuntest" fonctionne');
      } catch (error) {
        results.push(`❌ Erreur filtrage schéma: ${error.message}`);
      }

      // Test 6: Génération de valeurs par défaut
      try {
        const defaults = await entityContext.actions.utils.generateDefaultValues('encoreuntest');
        if (defaults && typeof defaults === 'object') {
          results.push('✅ Génération valeurs par défaut fonctionne');
          results.push(`📋 Defaults: ${JSON.stringify(defaults).substring(0, 100)}...`);
        } else {
          results.push('❌ Génération valeurs par défaut échoue');
        }
      } catch (error) {
        results.push(`❌ Erreur génération defaults: ${error.message}`);
      }

      testResults.value = results;

    } catch (error) {
      testResults.value = [`❌ Erreur générale: ${error.message}`];
    }
  });

  return (
    <div class="entity-test-container" style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>🧪 Test d'intégration du contexte BDD</h3>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick$={runTests}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Lancer les tests
        </button>
      </div>

      <div class="test-results">
        <h4>Résultats des tests:</h4>
        {testResults.value.length === 0 ? (
          <p style={{ color: '#666' }}>Cliquez sur "Lancer les tests" pour commencer</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {testResults.value.map((result, index) => (
              <li
                key={index}
                style={{
                  padding: '5px 0',
                  fontFamily: 'monospace',
                  color: result.startsWith('✅') ? '#28a745' :
                         result.startsWith('❌') ? '#dc3545' :
                         result.startsWith('📊') || result.startsWith('📋') ? '#17a2b8' : '#333'
                }}
              >
                {result}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <h5>État du contexte:</h5>
        <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify({
            selectedSchema: entityContext?.state?.ui?.selectedSchemaName,
            activeView: entityContext?.state?.ui?.activeView,
            entitiesCount: entityContext?.state?.entities?.length || 0,
            summariesCount: entityContext?.state?.summaries?.length || 0,
            isOnline: sync?.isOnline,
            autoSaveEnabled: sync?.autoSaveEnabled
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
});

/**
 * Composant de test principal avec provider
 */
export const EntityContextTest = component$(() => {
  // Simuler un contexte SchemaEditor minimal
  const mockSchemaContext = {
    state: {
      schemas: [],
      currentSchema: null
    },
    actions: {
      schemas: {
        loadAll: $(() => Promise.resolve()),
        loadById: $((id: string) => Promise.resolve(null))
      }
    },
    signals: {
      currentSchemaSignal: useSignal([]),
      loadingSignal: useSignal(false)
    }
  };

  return (
    <EntityProvider
      schemaContext={mockSchemaContext as any}
      config={DEFAULT_ENTITY_CONFIG}
    >
      <TestEntityHooks />
    </EntityProvider>
  );
});

export default EntityContextTest;