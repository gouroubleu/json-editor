const puppeteer = require('puppeteer');

async function testValidationEntiteExistante() {
  console.log('🚀 TEST VALIDATION SUR ENTITÉ EXISTANTE');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. D'abord, lister les entités disponibles
    console.log('📍 Navigation vers /bdd/test-user pour lister les entités');
    await page.goto('http://localhost:5501/bdd/test-user');
    await page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-entite-1-liste.png' });

    // 2. Chercher un lien d'édition d'entité
    const editLinks = await page.$$('a[href*="/edit"], button[text*="Modifier"], a[href*="/bdd/test-user/"]');

    if (editLinks.length > 0) {
      console.log(`📄 ${editLinks.length} liens d'édition trouvés, clic sur le premier`);
      await editLinks[0].click();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      // Essayer directement avec une entité existante
      console.log('📍 Tentative directe vers une entité existante');
      await page.goto('http://localhost:5501/bdd/test-user/entity_mfpxrr3y_2ubim8/edit');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-entite-2-edit-page.png' });

    // 3. Attendre que l'éditeur horizontal soit chargé
    await page.waitForSelector('.property-column, .horizontal-schema-editor, .column-header', { timeout: 10000 });
    console.log('✅ Éditeur chargé');

    // 4. Cliquer sur Ajouter propriété
    console.log('➕ Ajout nouvelle propriété');
    const addButton = await page.$('.add-btn, button:contains("Ajouter")');
    if (addButton) {
      await addButton.click();
    } else {
      // Chercher manuellement
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Ajouter') || text.includes('+')) {
          await btn.click();
          console.log(`✅ Clic sur bouton: "${text}"`);
          break;
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Remplir le formulaire pour une propriété jsonschema
    console.log('✏️ Création propriété jsonschema');

    const nameInput = await page.$('input[type="text"], input[placeholder*="nom"], input[placeholder*="Nom"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('ma_propriete_jsonschema_test');
      console.log('✅ Nom saisi');
    }

    const typeSelect = await page.$('select, select[class*="select"]');
    if (typeSelect) {
      await typeSelect.select('jsonschema');
      console.log('✅ Type jsonschema sélectionné');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-entite-3-formulaire.png' });

    // 6. Valider le formulaire
    console.log('✅ Validation du formulaire');
    const submitButtons = await page.$$('button');
    for (const btn of submitButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Ajouter') && !text.includes('propriété') && !text.includes('Ajouter une')) {
        await btn.click();
        console.log(`✅ Clic validation: "${text}"`);
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-entite-4-apres-ajout.png' });

    // 7. VÉRIFICATION : Bouton Configurer présent ?
    console.log('🔍 VÉRIFICATION BOUTON CONFIGURER');

    const properties = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.property-card'));
      return cards.map((card, index) => {
        const nameEl = card.querySelector('.property-name, input[value]');
        const typeEl = card.querySelector('.property-type, select');
        const exploreBtn = card.querySelector('.explore-btn, button[text*="→"], button[text*="Configurer"]');

        return {
          index,
          name: nameEl ? (nameEl.value || nameEl.textContent || '').trim() : 'N/A',
          type: typeEl ? (typeEl.value || typeEl.textContent || '').trim() : 'N/A',
          hasExploreBtn: !!exploreBtn,
          exploreText: exploreBtn ? exploreBtn.textContent.trim() : null,
          cardHTML: card.outerHTML.substring(0, 300) + '...'
        };
      });
    });

    console.log('📊 PROPRIÉTÉS DÉTECTÉES:');
    properties.forEach(prop => {
      console.log(`[${prop.index}] "${prop.name}" (${prop.type}) - Bouton: ${prop.hasExploreBtn ? `"${prop.exploreText}"` : '❌ AUCUN'}`);
    });

    // 8. Chercher la propriété jsonschema
    const jsonschemaProperty = properties.find(prop =>
      prop.name.includes('ma_propriete_jsonschema') ||
      prop.name.includes('jsonschema') ||
      prop.type === 'jsonschema'
    );

    if (jsonschemaProperty) {
      console.log('✅ PROPRIÉTÉ JSONSCHEMA TROUVÉE!');
      console.log('📋 Détails:', jsonschemaProperty);

      if (jsonschemaProperty.hasExploreBtn) {
        console.log('🎉 SUCCÈS: BOUTON CONFIGURER PRÉSENT!');

        // Test du clic
        console.log('🎯 TEST CLIC BOUTON CONFIGURER');
        const exploreBtn = await page.$('.property-card .explore-btn');
        if (exploreBtn) {
          await exploreBtn.click();
          await new Promise(resolve => setTimeout(resolve, 2000));

          await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-entite-5-apres-clic.png' });

          const columns = await page.$$('.property-column');
          console.log(`📊 Colonnes après clic: ${columns.length}`);

          if (columns.length > 1) {
            console.log('🎉 PARFAIT: WORKFLOW JSONSCHEMA FONCTIONNEL!');
            return { success: true, message: 'Fix validé - jsonschema avec bouton Configurer fonctionnel' };
          } else {
            return { success: false, message: 'Bouton présent mais clic sans effet' };
          }
        }
      } else {
        console.log('❌ BOUTON CONFIGURER TOUJOURS ABSENT');
        console.log('🔍 HTML de la carte:', jsonschemaProperty.cardHTML);
        return { success: false, message: 'Propriété jsonschema créée mais sans bouton Configurer' };
      }
    } else {
      console.log('❌ PROPRIÉTÉ JSONSCHEMA NON TROUVÉE');
      console.log('🔍 Debug toutes propriétés:', properties);
      return { success: false, message: 'Propriété jsonschema non créée ou non détectée' };
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-entite-error.png' });
    return { success: false, message: `Erreur: ${error.message}` };
  } finally {
    await browser.close();
  }
}

testValidationEntiteExistante()
  .then(result => {
    console.log('\n=== RÉSULTAT FINAL ===');
    console.log(`Succès: ${result.success}`);
    console.log(`Message: ${result.message}`);
    process.exit(result.success ? 0 : 1);
  })
  .catch(console.error);