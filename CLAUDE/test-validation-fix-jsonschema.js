const puppeteer = require('puppeteer');

async function testValidationFixJsonSchema() {
  console.log('🚀 TEST VALIDATION DU FIX JSONSCHEMA');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Navigation vers /edit/test-user
    console.log('📍 Navigation vers /edit/test-user');
    await page.goto('http://localhost:5501/edit/test-user');
    await page.waitForSelector('.property-column', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-fix-1-page-loaded.png' });

    // 2. Cliquer sur Ajouter
    console.log('➕ Ajout nouvelle propriété');
    await page.click('.add-btn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Remplir le formulaire pour une propriété jsonschema
    console.log('✏️ Création propriété jsonschema');
    await page.type('input[type="text"]', 'test_jsonschema_fix');
    await page.select('select', 'jsonschema');
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-fix-2-formulaire.png' });

    // 4. Valider
    await page.click('button.btn-primary');
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-fix-3-apres-ajout.png' });

    // 5. VÉRIFICATION CRITIQUE : Bouton Configurer présent ?
    console.log('🔍 VÉRIFICATION BOUTON CONFIGURER');

    const properties = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.property-card'));
      return cards.map(card => {
        const nameInput = card.querySelector('.property-name');
        const typeSelect = card.querySelector('.property-type');
        const exploreBtn = card.querySelector('.explore-btn');

        return {
          name: nameInput ? nameInput.value : 'N/A',
          type: typeSelect ? typeSelect.value : 'N/A',
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
      prop.name.includes('test_jsonschema_fix') || prop.type === 'jsonschema'
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

          await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-fix-4-apres-clic.png' });

          // Vérifier nouvelle colonne
          const columns = await page.$$('.property-column');
          console.log(`📊 Colonnes après clic: ${columns.length}`);

          if (columns.length > 1) {
            console.log('✅ PARFAIT: COLONNE DE CONFIGURATION OUVERTE!');
            console.log('🎉 FIX VALIDÉ - JSONSCHEMA FONCTIONNE CORRECTEMENT');
            return { success: true, message: 'Fix validé avec succès' };
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
      return { success: false, message: 'Propriété jsonschema non créée' };
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-fix-error.png' });
    return { success: false, message: `Erreur: ${error.message}` };
  } finally {
    await browser.close();
  }
}

testValidationFixJsonSchema()
  .then(result => {
    console.log('\n=== RÉSULTAT FINAL ===');
    console.log(`Succès: ${result.success}`);
    console.log(`Message: ${result.message}`);
    process.exit(result.success ? 0 : 1);
  })
  .catch(console.error);