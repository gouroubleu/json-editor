const puppeteer = require('puppeteer');

async function testFinalSimple() {
  console.log('🚀 TEST FINAL SIMPLE - APRÈS REDÉMARRAGE SERVEUR');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Aller directement sur /edit/test-user
    console.log('📍 Navigation vers /edit/test-user (serveur redémarré)');
    await page.goto('http://localhost:5501/edit/test-user');
    await page.waitForSelector('.property-column', { timeout: 10000 });

    // 2. Attendre le chargement
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Analyser les propriétés existantes
    console.log('📊 VÉRIFICATION PROPRIÉTÉS EXISTANTES:');

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
          exploreText: exploreBtn ? exploreBtn.textContent : null
        };
      });
    });

    properties.forEach((prop, i) => {
      console.log(`[${i}] ${prop.name} (${prop.type}) - Bouton: ${prop.hasExploreBtn ? prop.exploreText : 'AUCUN'}`);
    });

    // 4. Ajouter une propriété jsonschema et vérifier immédiatement
    console.log('➕ AJOUT PROPRIÉTÉ JSONSCHEMA');

    // Cliquer sur ajouter
    await page.click('.add-btn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Remplir le formulaire
    await page.type('input[type="text"]', 'test_jsonschema_final');
    await page.select('select', 'jsonschema');

    // Valider
    await page.click('button.btn-primary');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. VÉRIFIER LA NOUVELLE PROPRIÉTÉ
    console.log('🔍 VÉRIFICATION NOUVELLE PROPRIÉTÉ:');

    const newProperties = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.property-card'));
      return cards.map(card => {
        const nameInput = card.querySelector('.property-name');
        const typeSelect = card.querySelector('.property-type');
        const exploreBtn = card.querySelector('.explore-btn');

        return {
          name: nameInput ? nameInput.value : 'N/A',
          type: typeSelect ? typeSelect.value : 'N/A',
          hasExploreBtn: !!exploreBtn,
          exploreText: exploreBtn ? exploreBtn.textContent : null
        };
      });
    });

    const jsonschemaProps = newProperties.filter(prop =>
      prop.name.includes('test_jsonschema') || prop.type === 'jsonschema'
    );

    console.log('🎯 PROPRIÉTÉS JSONSCHEMA TROUVÉES:');
    jsonschemaProps.forEach((prop, i) => {
      console.log(`[${i}] ${prop.name} (${prop.type}) - Bouton: ${prop.hasExploreBtn ? `"${prop.exploreText}"` : '❌ AUCUN BOUTON'}`);
    });

    if (jsonschemaProps.length > 0 && jsonschemaProps.some(prop => prop.hasExploreBtn)) {
      console.log('✅ SUCCÈS: Propriété jsonschema a un bouton Configurer!');

      // Test de clic
      const exploreBtn = await page.$('.property-card .explore-btn');
      if (exploreBtn) {
        console.log('🎯 TEST CLIC BOUTON CONFIGURER');
        await exploreBtn.click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        const columns = await page.$$('.property-column');
        console.log(`📊 Colonnes après clic: ${columns.length}`);

        if (columns.length > 1) {
          console.log('✅ PARFAIT: Nouvelle colonne ouverte!');
        } else {
          console.log('❌ Problème: Aucune nouvelle colonne');
        }
      }
    } else {
      console.log('❌ ÉCHEC: Propriété jsonschema sans bouton Configurer');
    }

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-final-result.png' });

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-final-error.png' });
  } finally {
    await browser.close();
  }
}

testFinalSimple().catch(console.error);