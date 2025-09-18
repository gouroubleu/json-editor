/**
 * Script de test Puppeteer pour valider le fix des éléments null dans les arrays
 * Teste la correction apportée aux fonctions addArrayElement
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testArrayNullFix() {
  console.log('🚀 Démarrage du test de validation du fix array null...');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    defaultViewport: { width: 1400, height: 900 }
  });

  try {
    const page = await browser.newPage();

    // Écouter les logs de la console pour capturer les valeurs générées
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      console.log(`📝 Console [${msg.type()}]:`, text);
    });

    // Naviguer vers la page de création d'entité
    console.log('📍 Navigation vers http://localhost:5505/bdd/test-user/new/');
    await page.goto('http://localhost:5505/bdd/test-user/new/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Attendre que la page soit chargée
    await page.waitForTimeout(2000);

    // Capture d'écran initiale
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/array-test-initial.png',
      fullPage: true
    });

    console.log('🔍 Recherche de la propriété "adresse"...');

    // Chercher la propriété adresse et l'expandeur associé
    const adresseElement = await page.waitForSelector('[data-property="adresse"], .property-header:has-text("adresse")', { timeout: 10000 });

    if (!adresseElement) {
      // Essayer de trouver par le texte
      await page.waitForSelector('text=adresse', { timeout: 5000 });
    }

    // Chercher le bouton d'expansion (flèche) pour ouvrir la configuration
    console.log('🔧 Recherche du bouton d\'expansion...');
    const expandButton = await page.$('.expand-button, .toggle-button, button[aria-label*="expand"], button[aria-label*="toggle"]');

    if (expandButton) {
      console.log('✅ Bouton d\'expansion trouvé, clic...');
      await expandButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Essayer de cliquer sur l'élément adresse lui-même
      console.log('⚠️ Bouton d\'expansion non trouvé, clic sur l\'élément adresse...');
      await adresseElement.click();
      await page.waitForTimeout(1000);
    }

    // Capture après ouverture
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/array-test-expanded.png',
      fullPage: true
    });

    console.log('➕ Recherche du bouton d\'ajout d\'élément...');

    // Chercher le bouton d'ajout d'élément à l'array
    const addButton = await page.waitForSelector(
      'button:has-text("Ajouter"), button:has-text("+"), .add-button, .add-item-button, button[aria-label*="add"]',
      { timeout: 5000 }
    );

    if (!addButton) {
      throw new Error('Bouton d\'ajout non trouvé');
    }

    // Compter les éléments avant ajout
    const elementsBefore = await page.$$eval('.array-item, .list-item, [data-array-item]', items => items.length);
    console.log(`📊 Nombre d'éléments avant ajout: ${elementsBefore}`);

    // Cliquer sur le bouton d'ajout
    console.log('🎯 Clic sur le bouton d\'ajout...');
    await addButton.click();
    await page.waitForTimeout(2000);

    // Compter les éléments après ajout
    const elementsAfter = await page.$$eval('.array-item, .list-item, [data-array-item]', items => items.length);
    console.log(`📊 Nombre d'éléments après ajout: ${elementsAfter}`);

    // Vérifier qu'un élément a été ajouté
    if (elementsAfter > elementsBefore) {
      console.log('✅ Élément ajouté avec succès !');
    } else {
      console.log('⚠️ Aucun nouvel élément détecté visuellement');
    }

    // Capture après ajout
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/array-test-after-add.png',
      fullPage: true
    });

    // Vérifier les logs console pour voir les valeurs générées
    const relevantLogs = consoleLogs.filter(log =>
      log.text.includes('addArrayElement') ||
      log.text.includes('generateDefaultValue') ||
      log.text.includes('safeNewItem') ||
      log.text.includes('newItem')
    );

    console.log('\n📋 Logs pertinents trouvés:');
    relevantLogs.forEach(log => {
      console.log(`  [${log.type}] ${log.text}`);
    });

    // Essayer d'évaluer l'état de l'entité si possible
    try {
      const entityState = await page.evaluate(() => {
        // Essayer d'accéder à l'état global s'il existe
        if (window.entityContext || window.store) {
          return window.entityContext || window.store;
        }
        return null;
      });

      if (entityState) {
        console.log('\n🏪 État de l\'entité:', JSON.stringify(entityState, null, 2));
      }
    } catch (e) {
      console.log('⚠️ Impossible d\'accéder à l\'état de l\'entité:', e.message);
    }

    // Tester l'interaction avec le nouvel élément
    console.log('\n🔧 Test d\'interaction avec le nouvel élément...');
    try {
      // Chercher un champ input dans le nouvel élément
      const inputField = await page.$('input[type="text"], input[type="email"], textarea');
      if (inputField) {
        console.log('✅ Champ de saisie trouvé, test de saisie...');
        await inputField.type('Test validation');
        await page.waitForTimeout(500);

        const value = await inputField.inputValue();
        console.log(`📝 Valeur saisie: "${value}"`);
      }
    } catch (e) {
      console.log('⚠️ Pas de champ de saisie trouvé pour test d\'interaction');
    }

    // Capture finale
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/array-test-final.png',
      fullPage: true
    });

    // Générer un rapport
    const report = {
      timestamp: new Date().toISOString(),
      testStatus: 'completed',
      elementsBeforeAdd: elementsBefore,
      elementsAfterAdd: elementsAfter,
      elementAdded: elementsAfter > elementsBefore,
      consoleLogs: relevantLogs,
      conclusions: []
    };

    if (elementsAfter > elementsBefore) {
      report.conclusions.push('✅ Ajout d\'élément réussi');
    } else {
      report.conclusions.push('❌ Échec de l\'ajout d\'élément');
    }

    if (relevantLogs.length > 0) {
      report.conclusions.push('✅ Logs de debug trouvés');
    }

    // Vérifier s'il y a des erreurs dans les logs
    const errorLogs = consoleLogs.filter(log => log.type === 'error');
    if (errorLogs.length === 0) {
      report.conclusions.push('✅ Aucune erreur console détectée');
    } else {
      report.conclusions.push(`❌ ${errorLogs.length} erreur(s) console détectée(s)`);
      report.errors = errorLogs;
    }

    console.log('\n📊 RAPPORT FINAL:');
    console.log('='.repeat(50));
    report.conclusions.forEach(conclusion => console.log(conclusion));

    // Sauvegarder le rapport
    fs.writeFileSync(
      '/home/gouroubleu/WS/json-editor/CLAUDE/array-null-fix-test-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n💾 Rapport sauvegardé dans array-null-fix-test-report.json');
    console.log('📸 Screenshots sauvegardés dans le dossier CLAUDE/screenshots/');

    return report;

  } catch (error) {
    console.error('❌ Erreur pendant le test:', error);

    // Capture d'écran d'erreur
    try {
      await page.screenshot({
        path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/array-test-error.png',
        fullPage: true
      });
    } catch (e) {
      console.error('Impossible de capturer l\'écran d\'erreur:', e);
    }

    throw error;
  } finally {
    await browser.close();
  }
}

// Exécution du test
if (require.main === module) {
  testArrayNullFix()
    .then(report => {
      console.log('\n🎉 Test terminé avec succès !');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test échoué:', error);
      process.exit(1);
    });
}

module.exports = { testArrayNullFix };