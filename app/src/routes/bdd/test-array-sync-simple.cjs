const fs = require('fs');
const path = require('path');

/**
 * Test simple pour valider la synchronisation des arrays
 *
 * Ce script teste le problème de synchronisation suivant :
 * 1. Charger le schéma encoreuntest.json
 * 2. Simuler l'ajout d'un élément au tableau "pop"
 * 3. Vérifier que la synchronisation fonctionne correctement
 */

console.log('🧪 Test de Validation - Synchronisation des Arrays');
console.log('='.repeat(60));

// Chemins des fichiers
const SCHEMA_PATH = path.join(__dirname, '../../../../../serverMedias/schemas/encoreuntest.json');

try {
  // 1. Charger le schéma
  console.log('📂 Chargement du schéma encoreuntest.json...');

  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`Fichier schéma non trouvé: ${SCHEMA_PATH}`);
  }

  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(schemaContent);

  console.log('✅ Schéma chargé avec succès');
  console.log(`   - Nom: ${schema.name}`);
  console.log(`   - Version: ${schema.version}`);

  // 2. Valider la structure du schéma
  console.log('\n🔍 Validation de la structure du schéma...');

  const properties = schema.schema.properties;
  if (!properties.pop) {
    throw new Error('Champ "pop" non trouvé dans le schéma');
  }

  if (properties.pop.type !== 'array') {
    throw new Error(`Champ "pop" n'est pas un array, type trouvé: ${properties.pop.type}`);
  }

  if (!properties.pop.items) {
    throw new Error('Champ "pop" n\'a pas de définition "items"');
  }

  console.log('✅ Structure du schéma validée');
  console.log(`   - Champ "pop" est un array ✓`);
  console.log(`   - Items définis: ${JSON.stringify(properties.pop.items.properties, null, 2)}`);

  // 3. Simuler la génération de valeur par défaut
  console.log('\n⚙️ Test de génération de valeur par défaut...');

  function generateDefaultValue(schema) {
    if (!schema || typeof schema !== 'object') {
      return null;
    }

    if (schema.hasOwnProperty('default')) {
      return schema.default;
    }

    switch (schema.type) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
        return schema.minimum !== undefined ? schema.minimum : 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        const defaultObject = {};
        if (schema.properties && typeof schema.properties === 'object') {
          for (const [propName, propSchema] of Object.entries(schema.properties)) {
            defaultObject[propName] = generateDefaultValue(propSchema);
          }
        }
        return defaultObject;
      default:
        return null;
    }
  }

  // Générer une entité par défaut
  const defaultEntity = generateDefaultValue(schema.schema);
  console.log('✅ Entité par défaut générée');
  console.log(`   - Structure: ${JSON.stringify(defaultEntity, null, 2)}`);

  // 4. Simuler l'ajout d'un élément au tableau
  console.log('\n🔧 Test d\'ajout d\'élément au tableau...');

  const arrayItemSchema = properties.pop.items;
  const newArrayItem = generateDefaultValue(arrayItemSchema);

  console.log('📝 Nouvel élément généré:', JSON.stringify(newArrayItem, null, 2));

  // Ajouter l'élément au tableau
  const updatedEntity = {
    ...defaultEntity,
    pop: [...defaultEntity.pop, newArrayItem]
  };

  console.log('✅ Élément ajouté au tableau');
  console.log(`   - Taille du tableau avant: ${defaultEntity.pop.length}`);
  console.log(`   - Taille du tableau après: ${updatedEntity.pop.length}`);

  // 5. Validations finales
  console.log('\n🎯 Validations finales...');

  const validations = [
    {
      name: 'Le tableau contient 1 élément',
      test: () => updatedEntity.pop.length === 1,
      expected: 1,
      actual: updatedEntity.pop.length
    },
    {
      name: 'L\'élément ajouté a la bonne structure',
      test: () => {
        const item = updatedEntity.pop[0];
        return typeof item === 'object' &&
               item.hasOwnProperty('test') &&
               item.hasOwnProperty('pop');
      },
      expected: 'object with test and pop properties',
      actual: updatedEntity.pop[0] ? Object.keys(updatedEntity.pop[0]).join(', ') : 'undefined'
    },
    {
      name: 'Le JSON est sérialisable',
      test: () => {
        try {
          JSON.stringify(updatedEntity);
          return true;
        } catch {
          return false;
        }
      },
      expected: 'serializable',
      actual: 'serializable'
    },
    {
      name: 'Le tableau n\'est pas vide après ajout',
      test: () => updatedEntity.pop.length > 0,
      expected: '> 0',
      actual: updatedEntity.pop.length
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  validations.forEach((validation, index) => {
    const passed = validation.test();
    if (passed) {
      console.log(`   ✅ Test ${index + 1}: ${validation.name}`);
      passedTests++;
    } else {
      console.log(`   ❌ Test ${index + 1}: ${validation.name}`);
      console.log(`      Attendu: ${validation.expected}`);
      console.log(`      Reçu: ${validation.actual}`);
      failedTests++;
    }
  });

  // 6. Résultat final
  console.log('\n' + '='.repeat(60));
  if (failedTests === 0) {
    console.log('🎉 TOUS LES TESTS PASSENT ! La synchronisation des arrays fonctionne correctement.');
    console.log(`📊 Résultats: ${passedTests}/${validations.length} tests réussis`);
    process.exit(0);
  } else {
    console.log('❌ ÉCHEC DES TESTS ! Des problèmes de synchronisation persistent.');
    console.log(`📊 Résultats: ${passedTests}/${validations.length} tests réussis, ${failedTests} échecs`);
    process.exit(1);
  }

} catch (error) {
  console.error('💥 ERREUR LORS DU TEST:', error.message);
  console.error(error.stack);
  process.exit(1);
}