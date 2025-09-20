const puppeteer = require('puppeteer');

async function testValidationSchemaEditor() {
  console.log('🚀 TEST VALIDATION ÉDITEUR DE SCHÉMA JSONSCHEMA');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Aller sur l'éditeur de schéma test-user
    console.log('📍 Navigation vers éditeur de schéma /edit/test-user');
    await page.goto('http://localhost:5501/edit/test-user');
    await page.waitForSelector('.property-column, .horizontal-schema-editor', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-schema-1-loaded.png' });
    console.log('✅ Éditeur de schéma chargé');

    // 2. Chercher le bouton Ajouter dans l'éditeur de schéma
    console.log('➕ Recherche bouton Ajouter propriété');

    const buttons = await page.$$('button');
    let addButtonFound = false;

    console.log('📋 Boutons disponibles:');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      console.log(`  - "${text}"`);

      if (text.includes('Ajouter') || text.includes('➕')) {
        console.log(`✅ Clic sur bouton Ajouter: "${text}"`);
        await btn.click();
        addButtonFound = true;
        break;
      }
    }

    if (!addButtonFound) {
      console.log('❌ Bouton Ajouter non trouvé dans l\'éditeur de schéma');
      throw new Error('Bouton Ajouter non trouvé');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-schema-2-formulaire.png' });

    // 3. Remplir le formulaire avec propriété jsonschema
    console.log('✏️ Création propriété jsonschema');

    // Nom de la propriété
    const nameInputs = await page.$$('input[type="text"]');
    if (nameInputs.length > 0) {
      await nameInputs[0].click({ clickCount: 3 });
      await nameInputs[0].type('ma_reference_schema');
      console.log('✅ Nom saisi: ma_reference_schema');
    }

    // Sélection du type jsonschema
    const selects = await page.$$('select');
    if (selects.length > 0) {
      await selects[0].select('jsonschema');
      console.log('✅ Type jsonschema sélectionné');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-schema-3-formulaire-rempli.png' });

    // 4. Valider le formulaire
    console.log('✅ Validation du formulaire');
    const submitButtons = await page.$$('button');
    for (const btn of submitButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Ajouter') && !text.includes('propriété') && !text.includes('Ajouter une')) {
        console.log(`✅ Validation avec: "${text}"`);
        await btn.click();
        break;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-schema-4-apres-ajout.png' });

    // 5. VÉRIFICATION CRITIQUE: Bouton Configurer présent ?
    console.log('🔍 VÉRIFICATION BOUTON CONFIGURER');

    const properties = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.property-card'));
      return cards.map((card, index) => {
        const nameEl = card.querySelector('.property-name') || card.querySelector('input');
        const typeEl = card.querySelector('.property-type') || card.querySelector('select');
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
      console.log(`[${prop.index}] "${prop.name}" (${prop.type}) - Bouton: ${prop.hasExploreBtn ? `"${prop.exploreText}"` : '❌ AUCUN'}`);
    });

    // 6. Chercher la propriété jsonschema ajoutée
    const jsonschemaProperty = properties.find(prop =>
      prop.name.includes('ma_reference_schema') || prop.type === 'jsonschema'
    );

    if (jsonschemaProperty) {
      console.log('✅ PROPRIÉTÉ JSONSCHEMA TROUVÉE!');
      console.log(`📋 Détails: ${jsonschemaProperty.name} (${jsonschemaProperty.type})`);

      if (jsonschemaProperty.hasExploreBtn) {
        console.log('🎉 SUCCÈS: BOUTON CONFIGURER PRÉSENT!');
        console.log(`🎯 Texte du bouton: "${jsonschemaProperty.exploreText}"`);

        // 7. Tester le clic sur le bouton Configurer
        console.log('🎯 TEST CLIC BOUTON CONFIGURER');
        const exploreBtn = await page.$('.property-card .explore-btn');
        if (exploreBtn) {
          await exploreBtn.click();
          await new Promise(resolve => setTimeout(resolve, 2000));

          await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-schema-5-apres-clic.png' });

          // Vérifier qu'une nouvelle colonne s'est ouverte
          const columnsAfter = await page.$$('.property-column');
          console.log(`📊 Colonnes après clic: ${columnsAfter.length}`);

          if (columnsAfter.length > 1) {
            console.log('🎉 PARFAIT: COLONNE DE CONFIGURATION JSONSCHEMA OUVERTE!');
            console.log('✅ FIX VALIDÉ - WORKFLOW JSONSCHEMA COMPLÈTEMENT FONCTIONNEL');
            return { success: true, message: 'Fix validé avec succès - jsonschema avec bouton Configurer fonctionnel et workflow complet' };
          } else {
            console.log('❌ Problème: Bouton présent mais clic sans effet');
            return { success: false, message: 'Bouton Configurer présent mais clic sans effet' };
          }
        }
      } else {
        console.log('❌ ÉCHEC: BOUTON CONFIGURER TOUJOURS ABSENT');
        return { success: false, message: 'Propriété jsonschema créée mais bouton Configurer absent - FIX NON FONCTIONNEL' };
      }
    } else {
      console.log('❌ PROPRIÉTÉ JSONSCHEMA NON TROUVÉE');
      console.log('🔍 Debug toutes propriétés:', properties);
      return { success: false, message: 'Propriété jsonschema non créée' };
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-schema-error.png' });
    return { success: false, message: `Erreur: ${error.message}` };
  } finally {
    await browser.close();
  }
}

testValidationSchemaEditor()
  .then(result => {
    console.log('\n=== RÉSULTAT FINAL DU TEST ===');
    console.log(`Succès: ${result.success ? '✅ OUI' : '❌ NON'}`);
    console.log(`Message: ${result.message}`);

    if (result.success) {
      console.log('\n🎉 LE FIX JSONSCHEMA EST VALIDÉ ET FONCTIONNEL!');
    } else {
      console.log('\n❌ LE FIX JSONSCHEMA N\'EST PAS ENCORE COMPLET');
    }

    process.exit(result.success ? 0 : 1);
  })
  .catch(console.error);