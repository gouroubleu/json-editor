const puppeteer = require('puppeteer');

async function testValidationSimpleFix() {
  console.log('🚀 TEST VALIDATION SIMPLE DU FIX JSONSCHEMA');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Navigation directe vers une entité existante
    console.log('📍 Navigation vers entité existante');
    await page.goto('http://localhost:5501/bdd/test-user/entity_mfpxrr3y_2ubim8/edit');
    await page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-simple-1-page.png' });

    // 2. Chercher et cliquer sur le bouton Ajouter
    console.log('➕ Recherche bouton Ajouter');

    const buttons = await page.$$('button');
    let addButtonClicked = false;

    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      console.log(`Bouton trouvé: "${text}"`);
      if (text.includes('Ajouter') || text.includes('+') || text.includes('Add')) {
        await btn.click();
        console.log(`✅ Clic sur: "${text}"`);
        addButtonClicked = true;
        break;
      }
    }

    if (!addButtonClicked) {
      console.log('❌ Aucun bouton Ajouter trouvé');
      const content = await page.content();
      console.log('Page content snippet:', content.substring(0, 1000));
      throw new Error('Bouton Ajouter non trouvé');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-simple-2-formulaire-ouvert.png' });

    // 3. Remplir le formulaire
    console.log('✏️ Remplissage formulaire jsonschema');

    // Nom
    const nameInput = await page.$('input[type="text"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('test_jsonschema_final');
      console.log('✅ Nom saisi');
    } else {
      console.log('❌ Champ nom non trouvé');
    }

    // Type
    const typeSelect = await page.$('select');
    if (typeSelect) {
      await typeSelect.select('jsonschema');
      console.log('✅ Type jsonschema sélectionné');
    } else {
      console.log('❌ Select type non trouvé');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-simple-3-formulaire-rempli.png' });

    // 4. Valider
    console.log('✅ Validation');
    const submitButtons = await page.$$('button');
    for (const btn of submitButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Ajouter') && !text.includes('propriété')) {
        await btn.click();
        console.log(`✅ Validation avec: "${text}"`);
        break;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-simple-4-apres-ajout.png' });

    // 5. ANALYSE DES PROPRIÉTÉS
    console.log('🔍 ANALYSE DES PROPRIÉTÉS');

    const allProperties = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.property-card'));
      return cards.map((card, index) => {
        const nameEl = card.querySelector('.property-name') || card.querySelector('input[value]');
        const typeEl = card.querySelector('.property-type') || card.querySelector('select');

        // Chercher tous les boutons dans cette carte
        const buttons = Array.from(card.querySelectorAll('button'));
        const buttonInfo = buttons.map(btn => ({
          text: btn.textContent.trim(),
          className: btn.className
        }));

        return {
          index,
          name: nameEl ? (nameEl.value || nameEl.textContent || '').trim() : 'N/A',
          type: typeEl ? (typeEl.value || typeEl.textContent || '').trim() : 'N/A',
          buttons: buttonInfo,
          hasExploreBtn: buttons.some(btn =>
            btn.textContent.includes('→') ||
            btn.textContent.includes('Configurer') ||
            btn.className.includes('explore')
          )
        };
      });
    });

    console.log('📊 TOUTES LES PROPRIÉTÉS:');
    allProperties.forEach(prop => {
      console.log(`[${prop.index}] "${prop.name}" (${prop.type}) - Boutons: ${prop.buttons.map(b => `"${b.text}"`).join(', ')}`);
      console.log(`   → Bouton explorer: ${prop.hasExploreBtn ? '✅ OUI' : '❌ NON'}`);
    });

    // 6. Focus sur la propriété jsonschema
    const jsonschemaProps = allProperties.filter(prop =>
      prop.name.includes('test_jsonschema') || prop.type === 'jsonschema'
    );

    console.log('\n🎯 PROPRIÉTÉS JSONSCHEMA:');
    jsonschemaProps.forEach(prop => {
      console.log(`✅ "${prop.name}" (${prop.type})`);
      console.log(`   Boutons: ${prop.buttons.map(b => `"${b.text}"`).join(', ')}`);
      console.log(`   Bouton explorer: ${prop.hasExploreBtn ? '✅ OUI' : '❌ NON'}`);
    });

    if (jsonschemaProps.length > 0 && jsonschemaProps.some(p => p.hasExploreBtn)) {
      console.log('🎉 SUCCÈS: PROPRIÉTÉ JSONSCHEMA AVEC BOUTON CONFIGURER!');

      // Test du clic
      const exploreBtn = await page.$('.explore-btn');
      if (exploreBtn) {
        console.log('🎯 Test clic bouton');
        await exploreBtn.click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-simple-5-apres-clic.png' });

        const columnsAfter = await page.$$('.property-column');
        console.log(`📊 Colonnes après clic: ${columnsAfter.length}`);

        if (columnsAfter.length > 1) {
          console.log('🎉 PARFAIT: COLONNE DE CONFIGURATION OUVERTE!');
          return { success: true, message: 'FIX VALIDÉ - jsonschema complètement fonctionnel' };
        }
      }
    } else {
      console.log('❌ ÉCHEC: Pas de propriété jsonschema avec bouton Configurer');
      return { success: false, message: 'Propriété jsonschema créée mais sans bouton Configurer' };
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-simple-error.png' });
    return { success: false, message: `Erreur: ${error.message}` };
  } finally {
    await browser.close();
  }
}

testValidationSimpleFix()
  .then(result => {
    console.log('\n=== RÉSULTAT FINAL ===');
    console.log(`Succès: ${result.success}`);
    console.log(`Message: ${result.message}`);
    process.exit(result.success ? 0 : 1);
  })
  .catch(console.error);