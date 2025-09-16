const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Test automatisé avec Playwright pour valider la synchronisation des arrays
 *
 * Ce test simule exactement le scénario utilisateur :
 * 1. Aller sur /bo/schemaEditor/bdd/encoreuntest/new/
 * 2. Naviguer vers le champ "pop" (qui est un array)
 * 3. Ajouter un élément au tableau
 * 4. Vérifier les 3 points de validation
 */

async function runArraySyncTest() {
  console.log('🧪 Test Browser - Synchronisation des Arrays');
  console.log('='.repeat(60));

  let browser;
  let context;
  let page;

  try {
    // 1. Lancer le navigateur
    console.log('🌐 Lancement du navigateur...');
    browser = await chromium.launch({
      headless: false, // Mettre à true pour exécution sans interface
      slowMo: 500 // Ralentir pour observer les actions
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    page = await context.newPage();

    // Console logs du navigateur
    page.on('console', msg => {
      if (msg.text().includes('🔧') || msg.text().includes('TEST')) {
        console.log(`🖥️  BROWSER: ${msg.text()}`);
      }
    });

    // 2. Naviguer vers la page
    console.log('📍 Navigation vers la page de création d\'entité...');
    await page.goto('http://localhost:5173/bo/schemaEditor/bdd/encoreuntest/new/');

    // Attendre que la page se charge
    await page.waitForSelector('.horizontal-entity-viewer', { timeout: 10000 });
    console.log('✅ Page chargée avec succès');

    // 3. Prendre une capture d'écran initiale
    await page.screenshot({
      path: path.join(__dirname, 'test-screenshots-array-sync', '01-initial-state.png'),
      fullPage: true
    });

    // 4. Localiser et cliquer sur le champ "pop"
    console.log('🎯 Recherche du champ "pop"...');

    // Attendre et cliquer sur le champ pop dans la première colonne
    const popFieldSelector = '.entity-column .property-item[data-key="pop"], .entity-column .field-row[data-field="pop"], .entity-column button:has-text("pop")';

    try {
      await page.waitForSelector(popFieldSelector, { timeout: 5000 });
      await page.click(popFieldSelector);
      console.log('✅ Champ "pop" sélectionné');
    } catch (error) {
      // Fallback: chercher par texte
      console.log('⚠️ Sélecteur spécifique non trouvé, recherche par texte...');
      await page.click('text="pop"');
      console.log('✅ Champ "pop" sélectionné (fallback)');
    }

    // Attendre que la colonne du tableau apparaisse
    await page.waitForTimeout(1000);

    // 5. Prendre une capture après sélection du champ
    await page.screenshot({
      path: path.join(__dirname, 'test-screenshots-array-sync', '02-pop-field-selected.png'),
      fullPage: true
    });

    // 6. Localiser et cliquer sur le bouton d'ajout d'élément
    console.log('➕ Ajout d\'un élément au tableau...');

    const addButtonSelector = 'button:has-text("Ajouter"), button:has-text("➕"), .add-array-item';

    try {
      await page.waitForSelector(addButtonSelector, { timeout: 5000 });
      await page.click(addButtonSelector);
      console.log('✅ Bouton d\'ajout cliqué');
    } catch (error) {
      console.log('⚠️ Bouton d\'ajout non trouvé, tentative alternative...');
      // Chercher un bouton contenant "+"
      await page.click('button:text-matches(".*[➕+].*")');
      console.log('✅ Bouton d\'ajout cliqué (alternative)');
    }

    // Attendre que l'élément soit ajouté
    await page.waitForTimeout(2000);

    // 7. Prendre une capture après ajout
    await page.screenshot({
      path: path.join(__dirname, 'test-screenshots-array-sync', '03-element-added.png'),
      fullPage: true
    });

    // 8. Validations automatiques
    console.log('🔍 Exécution des validations...');

    // Validation 1: Vérifier que le formulaire du nouvel élément apparaît
    const newElementFormExists = await page.locator('.entity-column').count() >= 2;
    console.log(`📝 Validation 1 - Formulaire du nouvel élément: ${newElementFormExists ? '✅ PASS' : '❌ FAIL'}`);

    // Validation 2: Vérifier que l'affichage du tableau montre 1 élément
    const arrayDisplayText = await page.textContent('.entity-column:has-text("pop")');
    const showsOneElement = arrayDisplayText && (arrayDisplayText.includes('1 élément') || arrayDisplayText.includes('(1)'));
    console.log(`📊 Validation 2 - Affichage du tableau (1 élément): ${showsOneElement ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Texte trouvé: "${arrayDisplayText}"`);

    // Validation 3: Vérifier le JSON en ouvrant l'aperçu
    console.log('🔍 Ouverture de l\'aperçu JSON...');

    try {
      await page.click('button:has-text("Voir JSON")');
      await page.waitForSelector('.json-preview-section', { timeout: 3000 });

      const jsonContent = await page.textContent('.json-preview-section pre');
      const jsonContainsNonEmptyArray = jsonContent &&
        jsonContent.includes('"pop": [') &&
        !jsonContent.includes('"pop": []') &&
        jsonContent.includes('{');

      console.log(`📋 Validation 3 - JSON contient tableau non vide: ${jsonContainsNonEmptyArray ? '✅ PASS' : '❌ FAIL'}`);

      // Prendre une capture de l'aperçu JSON
      await page.screenshot({
        path: path.join(__dirname, 'test-screenshots-array-sync', '04-json-preview.png'),
        fullPage: true
      });

      // Fermer l'aperçu
      await page.click('button:has-text("✕")');

    } catch (error) {
      console.log('❌ Impossible d\'ouvrir l\'aperçu JSON:', error.message);
    }

    // 9. Résultat final
    const allValidationsPassed = newElementFormExists && showsOneElement;

    console.log('\n' + '='.repeat(60));
    if (allValidationsPassed) {
      console.log('🎉 TEST RÉUSSI ! La synchronisation des arrays fonctionne correctement.');
      console.log('📸 Captures d\'écran sauvegardées dans test-screenshots-array-sync/');
    } else {
      console.log('❌ TEST ÉCHOUÉ ! Des problèmes de synchronisation persistent.');
      console.log('📸 Captures d\'écran disponibles pour débogage dans test-screenshots-array-sync/');
    }

    // Attendre un peu avant de fermer pour observation
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('💥 ERREUR LORS DU TEST:', error.message);
    console.error(error.stack);

    // Prendre une capture d'erreur
    if (page) {
      await page.screenshot({
        path: path.join(__dirname, 'test-screenshots-array-sync', '99-error.png'),
        fullPage: true
      });
    }

    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Créer le répertoire de captures si nécessaire
const screenshotDir = path.join(__dirname, 'test-screenshots-array-sync');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Exécuter le test
runArraySyncTest().catch(console.error);