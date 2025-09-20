#!/usr/bin/env node

/**
 * Test pour vérifier la navigation vers un élément existant dans un array jsonschema
 */

const puppeteer = require('puppeteer');

async function testNavigationExistingElement() {
  console.log('🎯 Test navigation vers élément existant');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    console.log('🌐 Navigation vers http://localhost:5503/bdd/test-user/new/');
    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 1. Naviguer vers hhh
    console.log('🔍 Étape 1: Navigation vers hhh...');
    const fieldItems = await page.$$('.field-item');
    const hhhContainer = fieldItems[6]; // hhh est le 7ème champ
    const exploreButton = await hhhContainer.$('button[title="Explorer"]');
    await exploreButton.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ Navigation vers hhh réussie');

    // 2. Ajouter un élément (il devrait avoir le bon schéma)
    console.log('🔍 Étape 2: Ajout d\'un élément...');
    const addButton = await page.$('.entity-column:nth-child(2) .btn-primary');
    await addButton.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ Élément ajouté');

    // 3. Naviguer vers l'élément ajouté
    console.log('🔍 Étape 3: Navigation vers l\'élément existant...');
    const arrayItemButton = await page.$('.array-item .btn[title="Explorer cet élément"]');
    await arrayItemButton.click();
    await new Promise(resolve => setTimeout(resolve, 6000)); // Plus de temps pour la résolution async

    await page.screenshot({ path: 'CLAUDE/screenshots/test-navigation-existing.png', fullPage: true });
    console.log('📸 Screenshot navigation vers élément existant');

    // 4. Analyser le formulaire affiché
    console.log('🔍 Étape 4: Analyse du formulaire...');

    const columns = await page.$$('.entity-column');
    console.log(`📋 Nombre de colonnes: ${columns.length}`);

    if (columns.length < 3) {
      console.log('❌ Navigation échouée - pas assez de colonnes');
      return false;
    }

    // Analyser la 3ème colonne (index 2)
    const thirdColumn = columns[2];

    const analysisResult = await page.evaluate(column => {
      const fieldItems = column.querySelectorAll('.field-item');
      const columnTitle = column.querySelector('.column-title')?.textContent?.trim();

      const fields = Array.from(fieldItems).map(field => {
        const nameEl = field.querySelector('.field-name');
        const typeEl = field.querySelector('.field-type');
        const inputEl = field.querySelector('input, select, textarea');

        return {
          name: nameEl?.textContent?.trim(),
          type: typeEl?.textContent?.trim(),
          hasInput: !!inputEl,
          inputType: inputEl?.type,
          placeholder: inputEl?.placeholder
        };
      });

      return {
        columnTitle,
        fieldsCount: fieldItems.length,
        fields
      };
    }, thirdColumn);

    console.log('📊 ANALYSE COLONNE 3:');
    console.log(`📋 Titre: ${analysisResult.columnTitle}`);
    console.log(`📋 Nombre de champs: ${analysisResult.fieldsCount}`);

    console.log('\n📄 CHAMPS TROUVÉS:');
    analysisResult.fields.forEach((field, i) => {
      console.log(`  ${i}: ${JSON.stringify(field)}`);
    });

    // Vérifier si on a les champs du schéma user
    const expectedUserFields = ['id', 'nom', 'email', 'age'];
    const foundUserFields = analysisResult.fields.filter(field =>
      expectedUserFields.some(expected => field.name?.includes(expected))
    );

    const hasCorrectSchema = foundUserFields.length >= 3; // Au moins 3 des 4 champs
    const isGenericForm = analysisResult.fields.some(field => field.name === 'Valeur');

    console.log('\n📊 RÉSULTATS:');
    console.log(`✅ Champs user trouvés: ${foundUserFields.length}/${expectedUserFields.length}`);
    console.log(`📋 Schéma user correct: ${hasCorrectSchema ? 'OUI' : 'NON'}`);
    console.log(`📋 Formulaire générique: ${isGenericForm ? 'OUI' : 'NON'}`);

    // Sauvegarder l'analyse
    const analysis = {
      timestamp: new Date().toISOString(),
      test: 'navigation-existing-element',
      url: page.url(),
      columnsCount: columns.length,
      thirdColumn: analysisResult,
      expectedUserFields,
      foundUserFields: foundUserFields.map(f => f.name),
      hasCorrectSchema,
      isGenericForm,
      success: hasCorrectSchema && !isGenericForm
    };

    const fs = require('fs').promises;
    await fs.writeFile('CLAUDE/test-navigation-existing-results.json', JSON.stringify(analysis, null, 2));
    console.log('📄 Analyse sauvegardée');

    return analysis.success;

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: 'CLAUDE/screenshots/error-navigation-existing.png', fullPage: true });
    return false;
  } finally {
    await browser.close();
  }
}

// Exécution
if (require.main === module) {
  testNavigationExistingElement()
    .then(success => {
      if (success) {
        console.log('\n🎉 TEST RÉUSSI - Navigation vers élément existant correcte !');
      } else {
        console.log('\n⚠️ TEST ÉCHOUÉ - Navigation vers élément existant à corriger');
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}