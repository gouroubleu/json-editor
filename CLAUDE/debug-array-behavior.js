/**
 * Debug spécifique du comportement des arrays
 * Test sur le champ "adresse" de test-user
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugArrayBehavior() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1600, height: 1200 }
  });

  const page = await browser.newPage();

  // Capturer les logs de debug
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🔧') || text.includes('addArrayElement') || text.includes('removeArrayElement')) {
      logs.push(text);
      console.log('🔧 LOG:', text);
    }
  });

  const results = {
    timestamp: new Date().toISOString(),
    steps: [],
    logs: [],
    success: false
  };

  try {
    console.log('🚀 Debug Array - Chargement page...');

    await page.goto('http://localhost:5501/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Étape 1: Trouver et cliquer sur le champ adresse
    console.log('📍 Étape 1: Navigation vers le champ adresse...');

    const step1 = await page.evaluate(() => {
      const fieldElements = Array.from(document.querySelectorAll('.field-name'));
      const adresseField = fieldElements.find(el => el.textContent.includes('adresse'));

      if (!adresseField) {
        return { success: false, error: 'Champ adresse introuvable' };
      }

      const fieldContainer = adresseField.closest('.field-item');
      const navigateButton = fieldContainer?.querySelector('button[title="Explorer"]');

      if (!navigateButton) {
        return { success: false, error: 'Bouton navigation adresse introuvable' };
      }

      navigateButton.click();
      return { success: true, message: 'Navigation vers adresse effectuée' };
    });

    results.steps.push({ step: 1, name: 'Navigation adresse', result: step1 });
    console.log('📊 Résultat étape 1:', step1);

    if (!step1.success) {
      throw new Error(`Étape 1 échouée: ${step1.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Étape 2: Analyser l'état initial du tableau
    console.log('📍 Étape 2: Analyse état initial du tableau...');

    const step2 = await page.evaluate(() => {
      const arrayItems = document.querySelectorAll('.array-item');
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      return {
        success: true,
        initialItemCount: arrayItems.length,
        addButtonsCount: addButtons.length,
        arrayItems: Array.from(arrayItems).map((item, index) => ({
          index,
          preview: item.querySelector('.array-item-preview')?.textContent?.substring(0, 50),
          hasDeleteButton: !!item.querySelector('button[title="Supprimer cet élément"]')
        }))
      };
    });

    results.steps.push({ step: 2, name: 'État initial', result: step2 });
    console.log('📊 Résultat étape 2:', step2);

    // Étape 3: Ajouter un élément
    console.log('📍 Étape 3: Ajout d\'un élément...');

    const step3 = await page.evaluate(() => {
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      if (addButtons.length === 0) {
        return { success: false, error: 'Aucun bouton d\'ajout trouvé' };
      }

      // Cliquer sur le premier bouton d'ajout trouvé
      addButtons[0].click();
      return { success: true, message: 'Clic sur bouton d\'ajout effectué' };
    });

    results.steps.push({ step: 3, name: 'Ajout élément', result: step3 });
    console.log('📊 Résultat étape 3:', step3);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Étape 4: Analyser l'état après ajout
    console.log('📍 Étape 4: Analyse après ajout...');

    const step4 = await page.evaluate(() => {
      const arrayItems = document.querySelectorAll('.array-item');

      return {
        success: true,
        newItemCount: arrayItems.length,
        arrayItems: Array.from(arrayItems).map((item, index) => ({
          index,
          preview: item.querySelector('.array-item-preview')?.textContent?.substring(0, 50),
          hasDeleteButton: !!item.querySelector('button[title="Supprimer cet élément"]'),
          isTemporary: item.classList.contains('temporary-item')
        }))
      };
    });

    results.steps.push({ step: 4, name: 'État après ajout', result: step4 });
    console.log('📊 Résultat étape 4:', step4);

    // Étape 5: Tenter de supprimer le premier élément
    console.log('📍 Étape 5: Test suppression premier élément...');

    const step5 = await page.evaluate(() => {
      const arrayItems = document.querySelectorAll('.array-item');
      if (arrayItems.length === 0) {
        return { success: false, error: 'Aucun élément à supprimer' };
      }

      const firstItem = arrayItems[0];
      const deleteButton = firstItem.querySelector('button[title="Supprimer cet élément"]');

      if (!deleteButton) {
        return { success: false, error: 'Bouton suppression premier élément introuvable' };
      }

      deleteButton.click();
      return { success: true, message: 'Clic suppression premier élément effectué' };
    });

    results.steps.push({ step: 5, name: 'Suppression premier élément', result: step5 });
    console.log('📊 Résultat étape 5:', step5);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Étape 6: Analyser l'état final
    console.log('📍 Étape 6: Analyse état final...');

    const step6 = await page.evaluate(() => {
      const arrayItems = document.querySelectorAll('.array-item');

      return {
        success: true,
        finalItemCount: arrayItems.length,
        arrayItems: Array.from(arrayItems).map((item, index) => ({
          index,
          preview: item.querySelector('.array-item-preview')?.textContent?.substring(0, 50),
          hasDeleteButton: !!item.querySelector('button[title="Supprimer cet élément"]')
        }))
      };
    });

    results.steps.push({ step: 6, name: 'État final', result: step6 });
    console.log('📊 Résultat étape 6:', step6);

    // Analyse des comportements
    const initialCount = step2.result.initialItemCount;
    const afterAddCount = step4.result.newItemCount;
    const finalCount = step6.result.finalItemCount;

    console.log('\n📈 ANALYSE DES COMPORTEMENTS:');
    console.log(`   Initial: ${initialCount} éléments`);
    console.log(`   Après ajout: ${afterAddCount} éléments`);
    console.log(`   Final: ${finalCount} éléments`);

    results.analysis = {
      addBehavior: afterAddCount > initialCount ? 'WORKING' : 'BROKEN',
      removeBehavior: finalCount < afterAddCount ? 'WORKING' : 'BROKEN',
      expectedFlow: initialCount < afterAddCount && finalCount < afterAddCount
    };

    results.success = results.analysis.expectedFlow;

  } catch (error) {
    console.error('❌ Erreur debug:', error.message);
    results.steps.push({ step: 'ERROR', name: 'Erreur générale', result: { success: false, error: error.message } });
  }

  results.logs = logs;

  // Sauvegarder les résultats
  fs.writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/debug-array-results.json', JSON.stringify(results, null, 2));

  await browser.close();

  return results;
}

// Exécution
debugArrayBehavior().then(results => {
  console.log('\n🎯 CONCLUSION DEBUG ARRAY:');
  if (results.success) {
    console.log('✅ Comportement array CORRECT');
  } else {
    console.log('❌ PROBLÈMES détectés dans le comportement array');
    console.log('📋 Analyse:', results.analysis);
  }
}).catch(console.error);