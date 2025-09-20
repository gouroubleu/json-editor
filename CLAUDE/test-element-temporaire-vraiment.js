/**
 * TEST VRAIMENT L'ÉLÉMENT TEMPORAIRE - Interface de saisie
 * Vérifie si on peut vraiment voir et éditer le nouvel élément
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testElementTemporaireVraiment() {
  const browser = await puppeteer.launch({
    headless: true, // Mode headless pour serveur sans display
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1600, height: 1200 }
  });

  const page = await browser.newPage();

  try {
    console.log('🔍 TEST ELEMENT TEMPORAIRE VRAIMENT - Chargement...');

    await page.goto('http://localhost:5501/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Navigation vers adresse
    console.log('📍 Navigation vers adresse...');
    await page.evaluate(() => {
      const fieldElements = Array.from(document.querySelectorAll('.field-name'));
      const adresseField = fieldElements.find(el => el.textContent.includes('adresse'));
      const fieldContainer = adresseField?.closest('.field-item');
      const navigateButton = fieldContainer?.querySelector('button[title="Explorer"]');
      navigateButton?.click();
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // ÉTAPE 1 : État initial très détaillé
    console.log('📍 ÉTAPE 1: Analyse DÉTAILLÉE état initial...');

    const etatInitial = await page.evaluate(() => {
      const arrayContainer = document.querySelector('.array-container');
      const arrayItems = document.querySelectorAll('.array-item');

      const details = Array.from(arrayItems).map((item, index) => {
        const preview = item.querySelector('.array-item-preview')?.textContent || 'N/A';
        const hasInputs = item.querySelectorAll('input, select, textarea').length;
        const hasTemporaryClass = item.classList.contains('temporary-item');
        const hasTemporaryText = item.textContent.includes('Temporaire');
        const hasSaveButton = !!item.querySelector('button[title*="save"], button[title*="Valider"], .save-btn');

        return {
          index,
          preview,
          hasInputs,
          hasTemporaryClass,
          hasTemporaryText,
          hasSaveButton,
          innerHTML: item.innerHTML.substring(0, 500)
        };
      });

      return {
        itemsCount: arrayItems.length,
        details,
        containerText: arrayContainer?.textContent?.substring(0, 300) || 'N/A'
      };
    });

    console.log('📊 ÉTAT INITIAL DÉTAILLÉ:');
    console.log(`   Nombre d'éléments: ${etatInitial.itemsCount}`);
    etatInitial.details.forEach(detail => {
      console.log(`   [${detail.index}] ${detail.preview} - Inputs: ${detail.hasInputs}, Temporaire: ${detail.hasTemporaryText}, Save: ${detail.hasSaveButton}`);
    });

    // ÉTAPE 2 : CLIC AJOUTER et analyse immédiate de l'interface
    console.log('📍 ÉTAPE 2: CLIC AJOUTER + ANALYSE INTERFACE...');

    // Prendre screenshot avant
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshot-avant-clic.png' });

    const resultAjout = await page.evaluate(() => {
      // Clic sur ajouter
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      if (addButtons.length === 0) {
        return { error: 'Aucun bouton ajouter trouvé' };
      }

      addButtons[0].click();
      return { success: true };
    });

    if (resultAjout.error) {
      throw new Error(resultAjout.error);
    }

    // Attendre et analyser plusieurs fois
    const analyses = [];
    const delais = [1000, 2000, 3000, 5000];

    for (const delai of delais) {
      await new Promise(resolve => setTimeout(resolve, delai - (analyses.length > 0 ? delais[analyses.length - 1] : 0)));

      const analyse = await page.evaluate((moment) => {
        const arrayItems = document.querySelectorAll('.array-item');

        const details = Array.from(arrayItems).map((item, index) => {
          const preview = item.querySelector('.array-item-preview')?.textContent || 'N/A';
          const inputs = item.querySelectorAll('input, select, textarea');
          const hasTemporaryClass = item.classList.contains('temporary-item');
          const hasTemporaryText = item.textContent.includes('Temporaire');
          const hasSaveButton = !!item.querySelector('button[title*="save"], button[title*="Valider"], .save-btn, button[title*="✅"]');

          // Chercher différents patterns de boutons de sauvegarde
          const allButtons = Array.from(item.querySelectorAll('button'));
          const saveButtonTexts = allButtons.map(btn => btn.title || btn.textContent).filter(text =>
            text.includes('save') || text.includes('Valider') || text.includes('✅') || text.includes('Enregistrer')
          );

          const inputsDetails = Array.from(inputs).map(input => ({
            type: input.type || input.tagName,
            value: input.value,
            placeholder: input.placeholder || ''
          }));

          return {
            index,
            preview,
            inputsCount: inputs.length,
            inputsDetails,
            hasTemporaryClass,
            hasTemporaryText,
            hasSaveButton,
            saveButtonTexts,
            estEditable: inputs.length > 0,
            innerHTML: item.innerHTML.substring(0, 200)
          };
        });

        return {
          moment,
          itemsCount: arrayItems.length,
          details,
          nouveauxElements: details.filter(d => d.hasTemporaryText || d.hasTemporaryClass),
          elementsEditables: details.filter(d => d.estEditable)
        };
      }, `APRES_${delai}ms`);

      analyses.push(analyse);

      console.log(`📊 ${analyse.moment}:`);
      console.log(`   Total éléments: ${analyse.itemsCount}`);
      console.log(`   Éléments temporaires: ${analyse.nouveauxElements.length}`);
      console.log(`   Éléments éditables: ${analyse.elementsEditables.length}`);

      if (analyse.nouveauxElements.length > 0) {
        console.log('   🔍 DÉTAILS ÉLÉMENTS TEMPORAIRES:');
        analyse.nouveauxElements.forEach(el => {
          console.log(`     [${el.index}] Inputs: ${el.inputsCount}, Save: ${el.hasSaveButton}, Texts: [${el.saveButtonTexts.join(', ')}]`);
        });
      }
    }

    // Screenshot final
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshot-apres-clic.png' });

    // ÉTAPE 3 : Essayer de remplir le nouvel élément (si trouvé)
    const dernierAnalyse = analyses[analyses.length - 1];
    let testSaisie = null;

    if (dernierAnalyse.elementsEditables.length > etatInitial.itemsCount) {
      console.log('📍 ÉTAPE 3: TEST SAISIE DANS NOUVEL ÉLÉMENT...');

      testSaisie = await page.evaluate(() => {
        const arrayItems = document.querySelectorAll('.array-item');
        const dernierItem = arrayItems[arrayItems.length - 1];

        if (!dernierItem) return { error: 'Aucun dernier élément trouvé' };

        const inputs = dernierItem.querySelectorAll('input');
        if (inputs.length === 0) return { error: 'Aucun input dans le dernier élément' };

        // Essayer de remplir le premier input
        const premierInput = inputs[0];
        premierInput.focus();
        premierInput.value = 'TEST_SAISIE_' + Date.now();
        premierInput.dispatchEvent(new Event('input', { bubbles: true }));
        premierInput.dispatchEvent(new Event('change', { bubbles: true }));

        return {
          success: true,
          inputFilled: premierInput.value,
          inputType: premierInput.type || premierInput.tagName
        };
      });

      if (testSaisie?.success) {
        console.log(`✅ Saisie testée: ${testSaisie.inputFilled} dans ${testSaisie.inputType}`);
        await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshot-apres-saisie.png' });
      } else {
        console.log(`❌ Échec saisie: ${testSaisie?.error}`);
      }
    }

    const rapport = {
      timestamp: new Date().toISOString(),
      etatInitial,
      analyses,
      testSaisie,
      screenshots: [
        'screenshot-avant-clic.png',
        'screenshot-apres-clic.png',
        testSaisie?.success ? 'screenshot-apres-saisie.png' : null
      ].filter(Boolean)
    };

    fs.writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/test-element-temporaire-rapport.json', JSON.stringify(rapport, null, 2));

    await browser.close();

    // ANALYSE FINALE
    console.log('\n🎯 ANALYSE FINALE:');
    const finalAnalyse = analyses[analyses.length - 1];

    if (finalAnalyse.nouveauxElements.length === 0) {
      console.log('❌ PROBLÈME: Aucun élément temporaire détecté !');
      console.log('   Le nouvel élément n\'est pas marqué comme temporaire');
      return { probleme: 'NO_TEMPORARY_ELEMENT' };
    }

    if (finalAnalyse.elementsEditables.length <= etatInitial.itemsCount) {
      console.log('❌ PROBLÈME: Nouvel élément non éditable !');
      console.log('   Pas d\'interface de saisie disponible');
      return { probleme: 'NO_EDITABLE_INTERFACE' };
    }

    const nouvelElementEditable = finalAnalyse.nouveauxElements.some(el => el.estEditable);
    if (!nouvelElementEditable) {
      console.log('❌ PROBLÈME: Élément temporaire sans interface !');
      console.log('   Élément temporaire détecté mais pas d\'inputs');
      return { probleme: 'TEMPORARY_NOT_EDITABLE' };
    }

    console.log('✅ ÉLÉMENT TEMPORAIRE DÉTECTÉ ET ÉDITABLE !');
    console.log(`   ${finalAnalyse.nouveauxElements.length} élément(s) temporaire(s)`);
    console.log(`   Interface de saisie disponible`);

    return { success: true, rapport };

  } catch (error) {
    console.error('❌ Erreur test:', error);
    await browser.close();
    return { error: error.message };
  }
}

// Exécution
testElementTemporaireVraiment().then(result => {
  if (result.error) {
    console.log('\n🚨 TEST ÉCHOUÉ:', result.error);
    process.exit(1);
  } else if (result.probleme) {
    console.log(`\n❌ PROBLÈME CONFIRMÉ: ${result.probleme}`);
    console.log('L\'utilisateur a raison - l\'élément temporaire ne fonctionne pas correctement');
    process.exit(1);
  } else {
    console.log('\n✅ ÉLÉMENT TEMPORAIRE FONCTIONNE');
    process.exit(0);
  }
}).catch(console.error);