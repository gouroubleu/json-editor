/**
 * DEBUG PROFOND DE addArrayElement EN MODE ÉDITION
 * Capturer tous les logs pour voir ce qui se passe vraiment
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugAddArrayElement() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1600, height: 1200 }
  });

  const page = await browser.newPage();

  // Capturer TOUS les logs console
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push({
      type: msg.type(),
      text: text,
      timestamp: new Date().toISOString()
    });
    console.log(`[${msg.type()}] ${text}`);
  });

  // Capturer les erreurs
  page.on('pageerror', error => {
    logs.push({
      type: 'error',
      text: `PAGE ERROR: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    console.log(`[ERROR] ${error.message}`);
  });

  try {
    console.log('🐛 DEBUG DEEP addArrayElement - Chargement...');

    await page.goto('http://localhost:5501/bdd/test-user/entity_mfqm0qvi_ainoph/edit/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Navigation vers adresse
    console.log('📍 Navigation vers adresse...');
    await page.evaluate(() => {
      console.log('🔧 NAVIGATE TO PROPERTY - CALLED: adresse columnIndex: 0');
      const fieldElements = Array.from(document.querySelectorAll('.field-name'));
      const adresseField = fieldElements.find(el => el.textContent.includes('adresse'));
      const fieldContainer = adresseField?.closest('.field-item');
      const navigateButton = fieldContainer?.querySelector('button[title="Explorer"]');
      navigateButton?.click();
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // État avant ajout + debug des données
    console.log('📍 DEBUG: État des données avant ajout...');

    const debugAvant = await page.evaluate(() => {
      // Accéder au contexte EntityCreation si possible
      const arrayContainer = document.querySelector('.array-container');
      const arrayItems = document.querySelectorAll('.array-item');

      // Analyser le DOM et l'état JavaScript
      const domState = {
        itemsCount: arrayItems.length,
        containerText: arrayContainer?.textContent?.substring(0, 200) || 'N/A'
      };

      // Chercher des indices sur l'état interne
      console.log('🔧 DEBUG AVANT - DOM State:', domState);
      console.log('🔧 DEBUG AVANT - Array items found:', domState.itemsCount);

      return domState;
    });

    console.log('📊 AVANT AJOUT:');
    console.log(`   DOM items: ${debugAvant.itemsCount}`);

    // CLIC SUR AJOUTER avec debug maximum
    console.log('📍 DEBUG: CLIC AJOUTER avec logs détaillés...');

    const clicResult = await page.evaluate(() => {
      console.log('🔧 AVANT CLIC - Recherche boutons ajouter...');

      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      console.log('🔧 AVANT CLIC - Boutons trouvés:', addButtons.length);

      if (addButtons.length === 0) {
        return { error: 'Aucun bouton ajouter trouvé' };
      }

      // État juste avant le clic
      const stateAvantClic = {
        itemsCount: document.querySelectorAll('.array-item').length,
        containerText: document.querySelector('.array-container')?.textContent?.substring(0, 100) || 'N/A'
      };

      console.log('🔧 AVANT CLIC - État DOM:', stateAvantClic);
      console.log('🔧 CLIC SUR BOUTON AJOUTER - DÉBUT');

      // CLIC !
      addButtons[0].click();

      console.log('🔧 CLIC SUR BOUTON AJOUTER - FIN');

      // État immédiat après clic
      const stateApresClic = {
        itemsCount: document.querySelectorAll('.array-item').length,
        containerText: document.querySelector('.array-container')?.textContent?.substring(0, 100) || 'N/A'
      };

      console.log('🔧 APRES CLIC IMMEDIAT - État DOM:', stateApresClic);

      return {
        success: true,
        stateAvantClic,
        stateApresClic
      };
    });

    if (clicResult.error) {
      throw new Error(clicResult.error);
    }

    console.log('📊 RÉSULTAT CLIC:');
    console.log(`   Avant: ${clicResult.stateAvantClic.itemsCount} items`);
    console.log(`   Après: ${clicResult.stateApresClic.itemsCount} items`);

    // Attendre et analyser les logs qui arrivent
    console.log('📍 DEBUG: Attente des logs addArrayElement...');

    await new Promise(resolve => setTimeout(resolve, 6000));

    // État final
    const debugFinal = await page.evaluate(() => {
      const finalState = {
        itemsCount: document.querySelectorAll('.array-item').length,
        containerText: document.querySelector('.array-container')?.textContent?.substring(0, 200) || 'N/A'
      };

      console.log('🔧 DEBUG FINAL - État DOM:', finalState);

      return finalState;
    });

    console.log('📊 ÉTAT FINAL:');
    console.log(`   Items finaux: ${debugFinal.itemsCount}`);

    const rapport = {
      timestamp: new Date().toISOString(),
      debugAvant,
      clicResult,
      debugFinal,
      allLogs: logs,
      problemeIdentifie: debugFinal.itemsCount <= debugAvant.itemsCount
    };

    fs.writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/debug-addArrayElement-rapport.json', JSON.stringify(rapport, null, 2));

    await browser.close();

    // Analyser les logs pour identifier le problème
    console.log('\\n🔍 ANALYSE DES LOGS:');

    const addArrayLogs = logs.filter(log =>
      log.text.includes('addArrayElement') ||
      log.text.includes('EntityCreationContext') ||
      log.text.includes('updateEntityData')
    );

    if (addArrayLogs.length === 0) {
      console.log('❌ AUCUN LOG addArrayElement trouvé !');
      console.log('   La fonction addArrayElement n\'est peut-être pas appelée');
      return { probleme: 'FUNCTION_NOT_CALLED', rapport };
    }

    console.log(`✅ ${addArrayLogs.length} logs addArrayElement trouvés:`);
    addArrayLogs.forEach(log => {
      console.log(`   [${log.type}] ${log.text}`);
    });

    if (debugFinal.itemsCount <= debugAvant.itemsCount) {
      console.log('\\n❌ PROBLÈME PERSISTE après correction useTask$');
      console.log('   Le problème vient d\'ailleurs...');
      return { probleme: 'OTHER_ISSUE', rapport };
    } else {
      console.log('\\n✅ CORRECTION RÉUSSIE !');
      return { success: true, rapport };
    }

  } catch (error) {
    console.error('❌ Erreur debug:', error);
    await browser.close();
    return { error: error.message, logs };
  }
}

// Exécution
debugAddArrayElement().then(result => {
  if (result.error) {
    console.log('\\n🚨 DEBUG ÉCHOUÉ:', result.error);
    process.exit(1);
  } else if (result.probleme) {
    console.log(`\\n❌ PROBLÈME IDENTIFIÉ: ${result.probleme}`);
    console.log('Il faut investiguer plus profondément...');
    process.exit(1);
  } else {
    console.log('\\n✅ PROBLÈME RÉSOLU !');
    process.exit(0);
  }
}).catch(console.error);