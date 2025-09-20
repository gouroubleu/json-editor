const puppeteer = require('puppeteer');

async function testValidationFixJsonSchemaCorrect() {
  console.log('🚀 TEST VALIDATION DU FIX JSONSCHEMA - URL CORRECTE');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Navigation vers la bonne URL - création d'entité
    console.log('📍 Navigation vers /bdd/test-user/new');
    await page.goto('http://localhost:5501/bdd/test-user/new');
    await page.waitForSelector('.property-column, .horizontal-schema-editor', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-fix-correct-1-page-loaded.png' });

    // 2. Cliquer sur Ajouter propriété
    console.log('➕ Ajout nouvelle propriété');
    const addButton = await page.$('.add-btn');
    if (!addButton) {
      // Chercher d'autres sélecteurs possibles
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Ajouter') || text.includes('+')) {
          await btn.click();
          break;
        }
      }
    } else {
      await addButton.click();
    }
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Remplir le formulaire pour une propriété jsonschema
    console.log('✏️ Création propriété jsonschema');

    // Trouver le champ nom
    const nameInput = await page.$('input[type="text"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 }); // Sélectionner tout
      await nameInput.type('test_jsonschema_validation');
    }

    // Sélectionner le type jsonschema
    const typeSelect = await page.$('select');
    if (typeSelect) {
      await typeSelect.select('jsonschema');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-fix-correct-2-formulaire.png' });

    // 4. Valider le formulaire
    console.log('✅ Validation du formulaire');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Ajouter') && !text.includes('propriété')) {
        await btn.click();
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-fix-correct-3-apres-ajout.png' });

    // 5. VÉRIFICATION CRITIQUE : Bouton Configurer présent ?
    console.log('🔍 VÉRIFICATION BOUTON CONFIGURER');

    const properties = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.property-card'));
      return cards.map(card => {
        const nameInput = card.querySelector('.property-name, input[value]');
        const typeSelect = card.querySelector('.property-type, select');
        const exploreBtn = card.querySelector('.explore-btn, button[text*="→"], button[text*="Configurer"]');

        return {
          name: nameInput ? (nameInput.value || nameInput.textContent || '').trim() : 'N/A',
          type: typeSelect ? (typeSelect.value || typeSelect.textContent || '').trim() : 'N/A',
          hasExploreBtn: !!exploreBtn,
          exploreText: exploreBtn ? exploreBtn.textContent.trim() : null
        };
      });
    });

    console.log('📊 PROPRIÉTÉS APRÈS AJOUT:');
    properties.forEach((prop, i) => {
      console.log(`[${i}] ${prop.name} (${prop.type}) - Bouton: ${prop.hasExploreBtn ? `"${prop.exploreText}"` : '❌ AUCUN'}`);
    });

    // 6. Chercher spécifiquement la propriété jsonschema
    const jsonschemaProperty = properties.find(prop =>
      prop.name.includes('test_jsonschema_validation') || prop.type === 'jsonschema'
    );

    if (jsonschemaProperty) {
      console.log('✅ PROPRIÉTÉ JSONSCHEMA TROUVÉE:', jsonschemaProperty);

      if (jsonschemaProperty.hasExploreBtn) {
        console.log('✅ SUCCÈS: BOUTON CONFIGURER PRÉSENT!');

        // 7. Tester le clic
        console.log('🎯 TEST CLIC BOUTON CONFIGURER');
        const exploreBtn = await page.$('.property-card .explore-btn');
        if (exploreBtn) {
          await exploreBtn.click();
          await new Promise(resolve => setTimeout(resolve, 2000));

          await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-fix-correct-4-apres-clic.png' });

          // Vérifier nouvelle colonne
          const columns = await page.$$('.property-column');
          console.log(`📊 Colonnes après clic: ${columns.length}`);

          if (columns.length > 1) {
            console.log('✅ PARFAIT: COLONNE DE CONFIGURATION OUVERTE!');
            console.log('🎉 FIX VALIDÉ - JSONSCHEMA FONCTIONNE CORRECTEMENT');
            return { success: true, message: 'Fix validé avec succès - workflow jsonschema complet fonctionnel' };
          } else {
            console.log('❌ Problème: Clic sans effet');
            return { success: false, message: 'Bouton présent mais clic sans effet' };
          }
        }
      } else {
        console.log('❌ ÉCHEC: BOUTON CONFIGURER TOUJOURS ABSENT');
        return { success: false, message: 'Bouton Configurer toujours absent après fix' };
      }
    } else {
      console.log('❌ PROPRIÉTÉ JSONSCHEMA NON TROUVÉE');
      console.log('🔍 Debug: toutes les propriétés détectées:', properties);
      return { success: false, message: 'Propriété jsonschema non créée ou non détectée' };
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-fix-correct-error.png' });
    return { success: false, message: `Erreur: ${error.message}` };
  } finally {
    await browser.close();
  }
}

testValidationFixJsonSchemaCorrect()
  .then(result => {
    console.log('\n=== RÉSULTAT FINAL ===');
    console.log(`Succès: ${result.success}`);
    console.log(`Message: ${result.message}`);
    process.exit(result.success ? 0 : 1);
  })
  .catch(console.error);