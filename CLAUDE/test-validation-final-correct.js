const puppeteer = require('puppeteer');

async function testValidationFinalCorrect() {
  console.log('🚀 TEST VALIDATION FINAL CORRECT - COLONNE DROITE');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Navigation vers l'éditeur de schéma
    console.log('📍 Navigation vers /edit/test-user');
    await page.goto('http://localhost:5501/edit/test-user');
    await page.waitForSelector('.property-column', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-final-1-loaded.png' });

    // 2. Cliquer sur Ajouter dans la colonne de propriétés (à droite)
    console.log('➕ Clic sur Ajouter propriété dans la colonne de droite');

    // Cibler spécifiquement le bouton Ajouter dans la colonne des propriétés
    const addButton = await page.$('.property-column .add-btn');
    if (addButton) {
      await addButton.click();
      console.log('✅ Bouton Ajouter cliqué');
    } else {
      // Alternative : chercher dans toutes les colonnes
      const buttons = await page.$$('.property-column button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Ajouter') || text.includes('➕')) {
          await btn.click();
          console.log(`✅ Bouton trouvé et cliqué: "${text}"`);
          break;
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-final-2-formulaire-ouvert.png' });

    // 3. Remplir le formulaire dans la colonne de propriétés
    console.log('✏️ Remplissage formulaire propriété jsonschema');

    // Cibler le champ nom dans le formulaire d'ajout (pas dans l'en-tête du schéma)
    const addForm = await page.$('.add-property-form');
    if (addForm) {
      console.log('✅ Formulaire d\'ajout trouvé');

      // Nom de la propriété dans le formulaire
      const nameInput = await addForm.$('input[type="text"]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type('propriete_jsonschema_test');
        console.log('✅ Nom propriété saisi');
      }

      // Type dans le formulaire
      const typeSelect = await addForm.$('select');
      if (typeSelect) {
        await typeSelect.select('jsonschema');
        console.log('✅ Type jsonschema sélectionné');
      }
    } else {
      console.log('❌ Formulaire d\'ajout non trouvé, essai avec sélecteurs génériques');

      // Fallback : tous les inputs/selects dans les colonnes de propriétés
      const propertyInputs = await page.$$('.property-column input[type="text"]');
      const propertySelects = await page.$$('.property-column select');

      if (propertyInputs.length > 1) {
        // Le dernier input pourrait être celui du formulaire d'ajout
        await propertyInputs[propertyInputs.length - 1].click({ clickCount: 3 });
        await propertyInputs[propertyInputs.length - 1].type('propriete_jsonschema_test');
        console.log('✅ Nom saisi (fallback)');
      }

      if (propertySelects.length > 0) {
        // Tester tous les selects pour trouver celui du formulaire
        for (const select of propertySelects) {
          try {
            await select.select('jsonschema');
            console.log('✅ Type jsonschema sélectionné (fallback)');
            break;
          } catch (e) {
            console.log('Select ignoré:', e.message);
          }
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-final-3-formulaire-rempli.png' });

    // 4. Valider le formulaire
    console.log('✅ Validation du formulaire');

    // Chercher le bouton de validation dans le formulaire d'ajout
    let validationClicked = false;

    if (addForm) {
      const formButtons = await addForm.$$('button');
      for (const btn of formButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Ajouter') && !text.includes('propriété')) {
          await btn.click();
          console.log(`✅ Validation: "${text}"`);
          validationClicked = true;
          break;
        }
      }
    }

    if (!validationClicked) {
      // Fallback : chercher dans toute la page
      const allButtons = await page.$$('button');
      for (const btn of allButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text === 'Ajouter' || text.includes('btn-primary')) {
          await btn.click();
          console.log(`✅ Validation (fallback): "${text}"`);
          break;
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-final-4-apres-ajout.png' });

    // 5. VÉRIFICATION CRITIQUE
    console.log('🔍 VÉRIFICATION PROPRIÉTÉ JSONSCHEMA');

    const properties = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.property-card'));
      return cards.map((card, index) => {
        const nameEl = card.querySelector('.property-name, input[value]');
        const typeEl = card.querySelector('.property-type, select');
        const exploreBtn = card.querySelector('.explore-btn');

        return {
          index,
          name: nameEl ? (nameEl.value || nameEl.textContent || '').trim() : 'N/A',
          type: typeEl ? (typeEl.value || typeEl.textContent || '').trim() : 'N/A',
          hasExploreBtn: !!exploreBtn,
          exploreText: exploreBtn ? exploreBtn.textContent.trim() : null
        };
      });
    });

    console.log('📊 PROPRIÉTÉS APRÈS AJOUT:');
    properties.forEach(prop => {
      const status = prop.hasExploreBtn ? '✅' : '❌';
      console.log(`[${prop.index}] "${prop.name}" (${prop.type}) - Bouton: ${status} ${prop.exploreText || 'AUCUN'}`);
    });

    // 6. Chercher la propriété jsonschema
    const jsonschemaProperty = properties.find(prop =>
      prop.name.includes('propriete_jsonschema') || prop.type === 'jsonschema'
    );

    if (jsonschemaProperty) {
      console.log('✅ PROPRIÉTÉ JSONSCHEMA TROUVÉE!');
      console.log(`📋 ${jsonschemaProperty.name} (${jsonschemaProperty.type})`);

      if (jsonschemaProperty.hasExploreBtn) {
        console.log('🎉 SUCCÈS: BOUTON CONFIGURER PRÉSENT!');

        // Test du clic
        console.log('🎯 TEST CLIC BOUTON CONFIGURER');
        const exploreBtn = await page.$('.property-card .explore-btn');
        if (exploreBtn) {
          await exploreBtn.click();
          await new Promise(resolve => setTimeout(resolve, 2000));

          await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-final-5-apres-clic.png' });

          const columnsAfter = await page.$$('.property-column');
          console.log(`📊 Colonnes après clic: ${columnsAfter.length}`);

          if (columnsAfter.length > 1) {
            console.log('🎉 PARFAIT: WORKFLOW JSONSCHEMA COMPLET!');
            return { success: true, message: 'FIX VALIDÉ - jsonschema complètement fonctionnel avec bouton Configurer' };
          }
        }
      } else {
        console.log('❌ BOUTON CONFIGURER ABSENT');
        return { success: false, message: 'Propriété jsonschema créée mais bouton Configurer absent' };
      }
    } else {
      console.log('❌ PROPRIÉTÉ JSONSCHEMA NON TROUVÉE');
      return { success: false, message: 'Propriété jsonschema non créée' };
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-final-error.png' });
    return { success: false, message: `Erreur: ${error.message}` };
  } finally {
    await browser.close();
  }
}

testValidationFinalCorrect()
  .then(result => {
    console.log('\n=== RÉSULTAT FINAL ===');
    console.log(`Succès: ${result.success ? '🎉 OUI' : '❌ NON'}`);
    console.log(`Message: ${result.message}`);

    if (result.success) {
      console.log('\n🎉 LE FIX JSONSCHEMA EST COMPLÈTEMENT VALIDÉ!');
      console.log('✅ Propriété jsonschema créée avec succès');
      console.log('✅ Bouton Configurer présent et fonctionnel');
      console.log('✅ Workflow complet opérationnel');
    } else {
      console.log('\n❌ LE FIX NÉCESSITE ENCORE DES CORRECTIONS');
    }

    process.exit(result.success ? 0 : 1);
  })
  .catch(console.error);