/**
 * Test de validation des corrections apportées:
 * 1. Champ "pop" doit s'afficher comme select
 * 2. Ajout d'éléments au tableau "adresse" doit fonctionner
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testCorrections() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1600, height: 1200 }
  });

  const page = await browser.newPage();

  // Configuration des logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ ERREUR PAGE:', msg.text());
    } else if (msg.text().includes('🔧')) {
      console.log('🔧 DEBUG:', msg.text());
    }
  });

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    success: 0,
    failed: 0
  };

  try {
    console.log('🚀 Test 1: Vérification du champ select "pop"');

    // Aller sur la page d'édition
    await page.goto('http://localhost:5501/bdd/test-user/entity_mfqm0qvi_ainoph/edit/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Attendre que la page soit chargée
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Prendre une capture d'écran de l'état initial
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-corrections-initial.png', fullPage: true });

    // Test 1: Vérifier que "pop" est bien un select
    console.log('🔍 Test 1a: Recherche du champ pop...');

    const popFieldExists = await page.evaluate(() => {
      // Chercher un élément qui contient "pop" dans le nom de champ
      const fieldElements = Array.from(document.querySelectorAll('.field-name'));
      const popField = fieldElements.find(el => el.textContent.includes('pop'));

      if (!popField) {
        return { found: false, error: 'Champ pop introuvable' };
      }

      // Chercher le select associé dans le parent
      const fieldContainer = popField.closest('.field-item');
      const selectElement = fieldContainer?.querySelector('select.direct-edit-input');
      const inputElement = fieldContainer?.querySelector('input.direct-edit-input');

      return {
        found: true,
        hasSelect: !!selectElement,
        hasInput: !!inputElement,
        selectOptions: selectElement ? Array.from(selectElement.options).map(opt => ({ value: opt.value, text: opt.textContent })) : [],
        fieldHtml: fieldContainer ? fieldContainer.innerHTML.substring(0, 500) : 'N/A'
      };
    });

    console.log('📊 Résultat Test 1a (champ pop):', popFieldExists);

    const test1Success = popFieldExists.found && popFieldExists.hasSelect && !popFieldExists.hasInput;
    results.tests.push({
      name: 'Champ pop est un select',
      success: test1Success,
      details: popFieldExists
    });

    if (test1Success) {
      console.log('✅ Test 1a RÉUSSI: Le champ pop est bien un select');
      results.success++;
    } else {
      console.log('❌ Test 1a ÉCHOUÉ: Le champ pop n\'est pas un select');
      results.failed++;
    }

    // Test 2: Vérifier l'ajout d'éléments au tableau adresse
    console.log('🔍 Test 2a: Recherche du champ adresse...');

    const adresseFieldCheck = await page.evaluate(() => {
      const fieldElements = Array.from(document.querySelectorAll('.field-name'));
      const adresseField = fieldElements.find(el => el.textContent.includes('adresse'));

      if (!adresseField) {
        return { found: false, error: 'Champ adresse introuvable' };
      }

      const fieldContainer = adresseField.closest('.field-item');
      const navigateButton = fieldContainer?.querySelector('button[title="Explorer"]');

      return {
        found: true,
        hasNavigateButton: !!navigateButton,
        fieldType: fieldContainer?.querySelector('.field-type')?.textContent,
        fieldHtml: fieldContainer ? fieldContainer.innerHTML.substring(0, 300) : 'N/A'
      };
    });

    console.log('📊 Résultat Test 2a (champ adresse):', adresseFieldCheck);

    if (adresseFieldCheck.found && adresseFieldCheck.hasNavigateButton) {
      console.log('🔍 Test 2b: Navigation vers le tableau adresse...');

      // Cliquer sur le bouton de navigation du champ adresse
      await page.evaluate(() => {
        const fieldElements = Array.from(document.querySelectorAll('.field-name'));
        const adresseField = fieldElements.find(el => el.textContent.includes('adresse'));
        const fieldContainer = adresseField?.closest('.field-item');
        const navigateButton = fieldContainer?.querySelector('button[title="Explorer"]');

        if (navigateButton) {
          navigateButton.click();
        }
      });

      // Attendre la navigation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Vérifier la présence du bouton d'ajout
      const addButtonCheck = await page.evaluate(() => {
        const addButtons = Array.from(document.querySelectorAll('button'));
        const addButton = addButtons.find(btn =>
          btn.textContent.includes('Ajouter') ||
          btn.textContent.includes('➕')
        );

        return {
          found: !!addButton,
          buttonText: addButton ? addButton.textContent : null,
          arrayContainerExists: !!document.querySelector('.array-container')
        };
      });

      console.log('📊 Résultat Test 2b (bouton ajout):', addButtonCheck);

      if (addButtonCheck.found) {
        console.log('🔍 Test 2c: Test d\'ajout d\'élément...');

        // Cliquer sur le bouton d'ajout
        await page.evaluate(() => {
          const addButtons = Array.from(document.querySelectorAll('button'));
          const addButton = addButtons.find(btn =>
            btn.textContent.includes('Ajouter') ||
            btn.textContent.includes('➕')
          );

          if (addButton) {
            addButton.click();
          }
        });

        // Attendre l'ajout
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Vérifier qu'un élément a été ajouté
        const addElementResult = await page.evaluate(() => {
          const arrayItems = document.querySelectorAll('.array-item');
          return {
            itemCount: arrayItems.length,
            hasItems: arrayItems.length > 0,
            firstItemHtml: arrayItems[0] ? arrayItems[0].innerHTML.substring(0, 200) : null
          };
        });

        console.log('📊 Résultat Test 2c (ajout élément):', addElementResult);

        const test2Success = addElementResult.hasItems;
        results.tests.push({
          name: 'Ajout élément array adresse',
          success: test2Success,
          details: addElementResult
        });

        if (test2Success) {
          console.log('✅ Test 2c RÉUSSI: Élément ajouté au tableau adresse');
          results.success++;
        } else {
          console.log('❌ Test 2c ÉCHOUÉ: Impossible d\'ajouter un élément au tableau');
          results.failed++;
        }
      } else {
        console.log('❌ Test 2b ÉCHOUÉ: Bouton d\'ajout introuvable');
        results.tests.push({
          name: 'Présence bouton ajout array',
          success: false,
          details: addButtonCheck
        });
        results.failed++;
      }
    } else {
      console.log('❌ Test 2a ÉCHOUÉ: Champ adresse non navigable');
      results.tests.push({
        name: 'Champ adresse navigable',
        success: false,
        details: adresseFieldCheck
      });
      results.failed++;
    }

    // Capture finale
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-corrections-final.png', fullPage: true });

  } catch (error) {
    console.error('❌ Erreur pendant le test:', error);
    results.tests.push({
      name: 'Exécution générale',
      success: false,
      details: { error: error.message }
    });
    results.failed++;
  }

  // Résumé des résultats
  const totalTests = results.success + results.failed;
  const successRate = totalTests > 0 ? Math.round((results.success / totalTests) * 100) : 0;

  console.log('\n📊 RÉSUMÉ DES TESTS:');
  console.log(`✅ Réussis: ${results.success}`);
  console.log(`❌ Échoués: ${results.failed}`);
  console.log(`📈 Taux de réussite: ${successRate}%`);

  results.summary = {
    total: totalTests,
    successRate,
    status: successRate >= 100 ? 'TOUS_CORRIGES' : successRate >= 50 ? 'PARTIELLEMENT_CORRIGES' : 'PROBLEMES_PERSISTANTS'
  };

  // Sauvegarder les résultats
  fs.writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/test-corrections-results.json', JSON.stringify(results, null, 2));

  await browser.close();

  return results;
}

// Exécution
testCorrections().then(results => {
  console.log('\n🎯 CONCLUSION:');
  if (results.summary.status === 'TOUS_CORRIGES') {
    console.log('🎉 TOUTES LES CORRECTIONS FONCTIONNENT PARFAITEMENT !');
  } else if (results.summary.status === 'PARTIELLEMENT_CORRIGES') {
    console.log('⚠️ CORRECTIONS PARTIELLES - Certains problèmes persistent');
  } else {
    console.log('🚨 PROBLÈMES PERSISTANTS - Corrections insuffisantes');
  }
}).catch(console.error);