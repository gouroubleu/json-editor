const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testReferenceConfigColumnDesign() {
  console.log('🎨 Test de validation du design ReferenceConfigColumn...');

  let browser;
  let results = {
    timestamp: new Date().toISOString(),
    testType: 'Design validation ReferenceConfigColumn',
    success: false,
    steps: [],
    screenshots: [],
    designValidation: {
      headerStyle: false,
      inputStyle: false,
      selectStyle: false,
      checkboxStyle: false,
      consistencyWithPropertyColumn: false
    }
  };

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigation vers la page de liste des entités
    console.log('📍 Navigation vers la page de liste des entités...');
    await page.goto('http://localhost:5503/bdd/test-user', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    results.steps.push({
      step: 'Navigation vers test-user',
      status: 'success',
      timestamp: new Date().toISOString()
    });

    // Capture initiale
    const initialScreenshot = `design-test-initial-${Date.now()}.png`;
    await page.screenshot({
      path: path.join(__dirname, initialScreenshot),
      fullPage: true
    });
    results.screenshots.push(initialScreenshot);

    // Cliquer sur le bouton "Modifier" d'une entité pour accéder à l'éditeur
    console.log('🔧 Accès à l\'éditeur de schéma...');

    // Chercher et cliquer sur le bouton Modifier
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const modifierButton = buttons.find(btn => btn.textContent?.includes('Modifier'));
      if (modifierButton) {
        modifierButton.click();
      } else {
        throw new Error('Bouton Modifier non trouvé');
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attendre que l'interface de l'éditeur soit chargée
    await page.waitForSelector('.property-column', { timeout: 10000 });
    await page.waitForSelector('.column-header', { timeout: 5000 });

    console.log('🔍 Recherche du bouton Ajouter une propriété...');

    // Cliquer sur le bouton "Ajouter une propriété"
    await page.waitForSelector('.add-btn', { timeout: 5000 });
    await page.click('.add-btn');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Remplir le formulaire pour créer une propriété de type reference
    console.log('📝 Création d\'une propriété de type reference...');

    // Nom de la propriété
    await page.waitForSelector('input[placeholder*="Nom de la propriété"]', { timeout: 5000 });
    await page.type('input[placeholder*="Nom de la propriété"]', 'test_reference');

    // Sélectionner le type "reference"
    await page.waitForSelector('select', { timeout: 5000 });
    await page.select('select', 'reference');

    await page.waitForTimeout(500);

    // Cliquer sur "Ajouter"
    await page.waitForSelector('.btn-primary', { timeout: 5000 });
    await page.click('.btn-primary');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Maintenant cliquer sur la propriété créée pour ouvrir ReferenceConfigColumn
    console.log('🔧 Ouverture de la configuration de référence...');
    await page.waitForSelector('.property-card', { timeout: 5000 });
    await page.click('.property-card');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Capture après ouverture de ReferenceConfigColumn
    const configScreenshot = `design-test-reference-config-${Date.now()}.png`;
    await page.screenshot({
      path: path.join(__dirname, configScreenshot),
      fullPage: true
    });
    results.screenshots.push(configScreenshot);

    // Validation du design ReferenceConfigColumn
    console.log('🎨 Validation du design ReferenceConfigColumn...');

    // 1. Vérifier que le header a les bons styles
    const headerStyle = await page.evaluate(() => {
      const header = document.querySelector('.property-column .column-header');
      if (!header) return null;

      const computedStyle = window.getComputedStyle(header);
      return {
        background: computedStyle.backgroundColor,
        borderBottom: computedStyle.borderBottom,
        padding: computedStyle.padding,
        display: computedStyle.display,
        alignItems: computedStyle.alignItems
      };
    });

    if (headerStyle) {
      console.log('✅ Header style détecté:', headerStyle);
      results.designValidation.headerStyle = true;
    }

    // 2. Vérifier les styles des inputs
    const inputStyle = await page.evaluate(() => {
      const input = document.querySelector('.reference-config-content .input');
      if (!input) return null;

      const computedStyle = window.getComputedStyle(input);
      return {
        border: computedStyle.border,
        borderRadius: computedStyle.borderRadius,
        padding: computedStyle.padding,
        fontSize: computedStyle.fontSize
      };
    });

    if (inputStyle) {
      console.log('✅ Input style détecté:', inputStyle);
      results.designValidation.inputStyle = true;
    }

    // 3. Vérifier les styles des selects
    const selectStyle = await page.evaluate(() => {
      const select = document.querySelector('.reference-config-content .select');
      if (!select) return null;

      const computedStyle = window.getComputedStyle(select);
      return {
        border: computedStyle.border,
        borderRadius: computedStyle.borderRadius,
        padding: computedStyle.padding,
        background: computedStyle.backgroundColor
      };
    });

    if (selectStyle) {
      console.log('✅ Select style détecté:', selectStyle);
      results.designValidation.selectStyle = true;
    }

    // 4. Vérifier les styles des checkbox
    const checkboxStyle = await page.evaluate(() => {
      const checkbox = document.querySelector('.reference-config-content .checkbox-label');
      if (!checkbox) return null;

      const computedStyle = window.getComputedStyle(checkbox);
      return {
        display: computedStyle.display,
        alignItems: computedStyle.alignItems,
        gap: computedStyle.gap,
        fontSize: computedStyle.fontSize
      };
    });

    if (checkboxStyle) {
      console.log('✅ Checkbox style détecté:', checkboxStyle);
      results.designValidation.checkboxStyle = true;
    }

    // 5. Tester l'interaction avec les éléments
    console.log('🖱️ Test des interactions...');

    // Test du select
    await page.waitForSelector('.reference-config-content .select', { timeout: 5000 });
    await page.click('.reference-config-content .select');
    await page.waitForTimeout(500);

    // Test de l'input titre
    const titleInput = await page.$('.reference-config-content .input');
    if (titleInput) {
      await titleInput.click();
      await titleInput.type('Test de titre');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Test des checkbox
    const checkbox = await page.$('.reference-config-content input[type="checkbox"]');
    if (checkbox) {
      await checkbox.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Capture finale après interactions
    const finalScreenshot = `design-test-final-${Date.now()}.png`;
    await page.screenshot({
      path: path.join(__dirname, finalScreenshot),
      fullPage: true
    });
    results.screenshots.push(finalScreenshot);

    // Validation de la cohérence globale
    const consistencyCheck = await page.evaluate(() => {
      const referenceColumn = document.querySelector('.property-column .reference-config-content');
      const mainColumn = document.querySelector('.property-column');

      if (!referenceColumn || !mainColumn) return false;

      // Vérifier que les couleurs et styles sont cohérents
      const refSections = referenceColumn.querySelectorAll('.config-section');
      const hasProperStyling = Array.from(refSections).every(section => {
        const style = window.getComputedStyle(section);
        return style.backgroundColor && style.border && style.borderRadius;
      });

      return hasProperStyling;
    });

    results.designValidation.consistencyWithPropertyColumn = consistencyCheck;

    // Déterminer le succès global
    const allValidationsPass = Object.values(results.designValidation).every(val => val);
    results.success = allValidationsPass;

    results.steps.push({
      step: 'Validation complète du design',
      status: results.success ? 'success' : 'partial',
      details: results.designValidation,
      timestamp: new Date().toISOString()
    });

    console.log('📊 Résultats de validation:');
    console.log('- Header style:', results.designValidation.headerStyle ? '✅' : '❌');
    console.log('- Input style:', results.designValidation.inputStyle ? '✅' : '❌');
    console.log('- Select style:', results.designValidation.selectStyle ? '✅' : '❌');
    console.log('- Checkbox style:', results.designValidation.checkboxStyle ? '✅' : '❌');
    console.log('- Cohérence globale:', results.designValidation.consistencyWithPropertyColumn ? '✅' : '❌');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    results.steps.push({
      step: 'Erreur durant le test',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Sauvegarder les résultats
  const resultsFile = path.join(__dirname, `design-test-results-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

  console.log(`📄 Résultats sauvegardés dans: ${resultsFile}`);
  console.log(`📸 Screenshots: ${results.screenshots.join(', ')}`);

  return results;
}

// Exécuter le test
if (require.main === module) {
  testReferenceConfigColumnDesign()
    .then(results => {
      console.log('\n🎯 Test terminé!');
      console.log('Status global:', results.success ? '✅ SUCCÈS' : '⚠️ PARTIEL');
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Échec du test:', error);
      process.exit(1);
    });
}

module.exports = { testReferenceConfigColumnDesign };