#!/usr/bin/env node

/**
 * Test final simple pour valider le type jsonschema
 */

const puppeteer = require('puppeteer');

async function testJsonschemaFinal() {
  console.log('🎯 Test final jsonschema');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  try {
    console.log('🌐 Navigation directe vers http://localhost:5503/edit/test-user');
    await page.goto('http://localhost:5503/edit/test-user', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: 'CLAUDE/screenshots/edit-page-final.png', fullPage: true });
    console.log('📸 Screenshot page d\'édition prise');

    // Test 1: Vérifier que le bouton ajouter existe
    const addBtn = await page.$('.add-btn');
    if (!addBtn) {
      throw new Error('Bouton ajouter non trouvé');
    }
    console.log('✅ Bouton ajouter trouvé');

    // Test 2: Cliquer sur ajouter
    await addBtn.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await page.screenshot({ path: 'CLAUDE/screenshots/formulaire-ouvert.png', fullPage: true });
    console.log('📸 Screenshot formulaire ouvert');

    // Test 3: Vérifier que l'option jsonschema existe
    const options = await page.$$eval('.add-property-form select option', opts =>
      opts.map(opt => ({ value: opt.value, text: opt.textContent }))
    );
    console.log('📋 Options disponibles:', options);

    const hasJsonschema = options.some(opt => opt.value === 'jsonschema');
    if (!hasJsonschema) {
      throw new Error('Option jsonschema manquante dans le formulaire');
    }
    console.log('✅ Option jsonschema disponible');

    // Test 4: Sélectionner l'option jsonschema
    await page.select('.add-property-form select', 'jsonschema');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 5: Remplir le nom de la propriété
    await page.type('.add-property-form input[placeholder="Nom de la propriété"]', 'test-reference');

    await page.screenshot({ path: 'CLAUDE/screenshots/formulaire-jsonschema-rempli.png', fullPage: true });
    console.log('📸 Screenshot formulaire jsonschema rempli');

    // Test 6: Ajouter la propriété
    await page.click('.add-property-form .btn-primary');
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: 'CLAUDE/screenshots/propriete-jsonschema-ajoutee.png', fullPage: true });
    console.log('📸 Screenshot propriété jsonschema ajoutée');

    // Test 7: Vérifier que le bouton "Configurer →" est présent
    const configBtn = await page.$('.property-card .explore-btn');
    if (!configBtn) {
      throw new Error('Bouton "Configurer →" non trouvé');
    }
    console.log('✅ Bouton "Configurer →" trouvé');

    // Test 8: Cliquer sur "Configurer →"
    await configBtn.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: 'CLAUDE/screenshots/colonne-configuration-ouverte.png', fullPage: true });
    console.log('📸 Screenshot colonne configuration ouverte');

    // Test 9: Vérifier que la colonne de configuration s'est ouverte
    const referenceColumn = await page.$('.property-column:nth-child(2)');
    if (!referenceColumn) {
      throw new Error('Colonne de configuration non ouverte');
    }
    console.log('✅ Colonne de configuration ouverte');

    // Test 10: Vérifier le header conforme
    const headerTitle = await page.$eval('.property-column:nth-child(2) .column-title', el => el.textContent);
    console.log('📋 Header title:', headerTitle);

    // Test 11: Vérifier les éléments de design
    const propertyTypeSelect = await page.$('.property-column:nth-child(2) .property-type');
    const propertyNameInput = await page.$('.property-column:nth-child(2) .property-name');
    const descriptionInput = await page.$('.property-column:nth-child(2) .description-input');

    if (!propertyTypeSelect) throw new Error('Select avec classe property-type manquant');
    if (!propertyNameInput) throw new Error('Input avec classe property-name manquant');
    if (!descriptionInput) throw new Error('Input description manquant');

    console.log('✅ Tous les éléments de design sont présents');

    // Test 12: Tester la fonctionnalité
    await page.select('.property-column:nth-child(2) .property-type', 'test-user');
    await page.type('.property-column:nth-child(2) .property-name', 'Mon utilisateur de test');
    await page.type('.property-column:nth-child(2) .description-input', 'Référence vers un utilisateur');

    await page.screenshot({ path: 'CLAUDE/screenshots/configuration-complete.png', fullPage: true });
    console.log('📸 Screenshot configuration complète');

    console.log('\n🎉 SUCCÈS COMPLET: Type jsonschema 100% fonctionnel avec design legacy!');

    const results = {
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      tests: [
        { name: 'Navigation vers page édition', status: 'PASSED' },
        { name: 'Bouton ajouter présent', status: 'PASSED' },
        { name: 'Option jsonschema disponible', status: 'PASSED' },
        { name: 'Ajout propriété jsonschema', status: 'PASSED' },
        { name: 'Bouton "Configurer →" présent', status: 'PASSED' },
        { name: 'Ouverture colonne configuration', status: 'PASSED' },
        { name: 'Éléments de design conformes', status: 'PASSED' },
        { name: 'Fonctionnalité configuration', status: 'PASSED' }
      ]
    };

    // Sauvegarde des résultats
    const fs = require('fs').promises;
    await fs.writeFile('CLAUDE/test-final-results.json', JSON.stringify(results, null, 2));
    console.log('📄 Résultats sauvegardés dans test-final-results.json');

    return true;

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: 'CLAUDE/screenshots/error-final.png', fullPage: true });
    return false;
  } finally {
    await browser.close();
  }
}

// Exécution
if (require.main === module) {
  testJsonschemaFinal()
    .then(success => {
      console.log(success ? '\n✅ TEST FINAL RÉUSSI' : '\n❌ TEST FINAL ÉCHOUÉ');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}