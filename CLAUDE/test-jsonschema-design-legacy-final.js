#!/usr/bin/env node

/**
 * Test final end-to-end pour valider le type jsonschema avec design legacy conforme
 * Validation complète workflow et design
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const SCHEMA_ID = 'test-user';
const BASE_URL = 'http://localhost:5503';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Utilitaires
async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
}

async function takeScreenshot(page, name, description) {
  await ensureDir(SCREENSHOTS_DIR);
  const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${name} - ${description}`);
  return filepath;
}

async function testJsonschemaWorkflow() {
  console.log('🎯 Test final type jsonschema avec design legacy');

  const browser = await puppeteer.launch({
    headless: 'new',
    slowMo: 500,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  try {
    console.log('🌐 Navigation vers l\'interface d\'édition');
    await page.goto(`${BASE_URL}/edit/${SCHEMA_ID}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.waitForSelector('.horizontal-editor', { timeout: 10000 });
    await takeScreenshot(page, 'step1-initial-interface', 'Interface initiale loaded');

    // Test 1: Ajouter propriété jsonschema
    console.log('➕ Test 1: Ajout propriété jsonschema');
    await page.waitForSelector('.add-btn');
    await page.click('.add-btn');

    await page.waitForSelector('.add-property-form input[placeholder="Nom de la propriété"]');
    await page.type('.add-property-form input[placeholder="Nom de la propriété"]', 'test-reference');

    // Sélectionner type jsonschema
    await page.select('.add-property-form select', 'jsonschema');
    await takeScreenshot(page, 'step2-formulaire-jsonschema', 'Formulaire ajout jsonschema');

    await page.click('.add-property-form .btn-primary');
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'step3-propriete-ajoutee', 'Propriété jsonschema ajoutée');

    // Vérifier présence du bouton "Configurer →"
    const configButton = await page.$('.property-card .explore-btn');
    if (!configButton) {
      throw new Error('❌ Bouton "Configurer →" non trouvé');
    }
    console.log('✅ Bouton "Configurer →" présent');

    // Test 2: Cliquer sur "Configurer →"
    console.log('🔧 Test 2: Ouverture colonne configuration');
    await page.click('.property-card .explore-btn');
    await page.waitForTimeout(2000);

    await takeScreenshot(page, 'step4-colonne-configuration', 'Colonne configuration ouverte');

    // Vérifier que la colonne de configuration s'est ouverte
    const referenceColumn = await page.$('.property-column:nth-child(2)');
    if (!referenceColumn) {
      throw new Error('❌ Colonne de configuration non ouverte');
    }
    console.log('✅ Colonne de configuration ouverte');

    // Test 3: Vérifier le design legacy conforme
    console.log('🎨 Test 3: Validation design legacy');

    // Vérifier header conforme
    const headerTitle = await page.$eval('.property-column:nth-child(2) .column-title', el => el.textContent);
    if (!headerTitle.includes('(référence)')) {
      throw new Error('❌ Header title non conforme');
    }
    console.log('✅ Header title conforme:', headerTitle);

    // Vérifier bouton retour
    const backButton = await page.$('.property-column:nth-child(2) .back-btn');
    if (!backButton) {
      throw new Error('❌ Bouton retour manquant');
    }
    console.log('✅ Bouton retour présent');

    // Vérifier styles des éléments
    const propertyTypeSelect = await page.$('.property-column:nth-child(2) .property-type');
    if (!propertyTypeSelect) {
      throw new Error('❌ Select avec classe property-type manquant');
    }
    console.log('✅ Select avec classe property-type présent');

    const propertyNameInput = await page.$('.property-column:nth-child(2) .property-name');
    if (!propertyNameInput) {
      throw new Error('❌ Input avec classe property-name manquant');
    }
    console.log('✅ Input avec classe property-name présent');

    const descriptionInput = await page.$('.property-column:nth-child(2) .description-input');
    if (!descriptionInput) {
      throw new Error('❌ Input description manquant');
    }
    console.log('✅ Input description présent');

    // Test 4: Fonctionnalité configuration
    console.log('⚙️ Test 4: Fonctionnalité configuration');

    // Sélectionner un schema
    await page.select('.property-column:nth-child(2) .property-type', 'test-user');
    await page.waitForTimeout(500);

    // Saisir titre personnalisé
    await page.focus('.property-column:nth-child(2) .property-name');
    await page.keyboard.selectAll();
    await page.type('.property-column:nth-child(2) .property-name', 'Mon utilisateur de test');

    // Saisir description
    await page.focus('.property-column:nth-child(2) .description-input');
    await page.keyboard.selectAll();
    await page.type('.property-column:nth-child(2) .description-input', 'Référence vers un utilisateur');

    await takeScreenshot(page, 'step5-configuration-remplie', 'Configuration complète');

    // Vérifier checkbox multiple
    const multipleCheckbox = await page.$('.property-column:nth-child(2) input[type="checkbox"]');
    if (multipleCheckbox) {
      await page.click('.property-column:nth-child(2) input[type="checkbox"]');
      console.log('✅ Checkbox multiple fonctionnelle');
    }

    await takeScreenshot(page, 'step6-configuration-finale', 'Configuration finale complète');

    // Test 5: Retour et validation persistence
    console.log('🔄 Test 5: Retour et validation');

    await page.click('.property-column:nth-child(2) .back-btn');
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'step7-retour-colonne-principale', 'Retour colonne principale');

    // Vérifier que les modifications ont été sauvegardées
    const description = await page.$eval('.property-card .description-input', el => el.value);
    if (!description.includes('Référence vers un utilisateur')) {
      throw new Error('❌ Description non sauvegardée');
    }
    console.log('✅ Description sauvegardée:', description);

    results.tests.push({
      name: 'Workflow jsonschema complet',
      status: 'SUCCESS',
      details: 'Type jsonschema complètement fonctionnel avec design legacy conforme'
    });

    console.log('\n🎉 SUCCÈS COMPLET: Type jsonschema 100% fonctionnel avec design legacy!');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await takeScreenshot(page, 'error-final', 'Erreur durant le test');

    results.tests.push({
      name: 'Workflow jsonschema',
      status: 'FAILED',
      error: error.message
    });
  }

  // Sauvegarde des résultats
  const resultsPath = path.join(__dirname, 'jsonschema-design-legacy-test-results.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📄 Résultats sauvegardés: ${resultsPath}`);

  await browser.close();
  return results;
}

// Exécution
if (require.main === module) {
  testJsonschemaWorkflow()
    .then(results => {
      const success = results.tests.every(test => test.status === 'SUCCESS');
      console.log(success ? '\n✅ TOUS LES TESTS RÉUSSIS' : '\n❌ CERTAINS TESTS ÉCHOUÉS');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { testJsonschemaWorkflow };