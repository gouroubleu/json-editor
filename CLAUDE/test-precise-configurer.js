const puppeteer = require('puppeteer');

async function testPreciseConfigurer() {
  console.log('🚀 TEST PRÉCIS BOUTON CONFIGURER');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Aller directement sur /edit/test-user
    console.log('📍 Navigation vers /edit/test-user');
    await page.goto('http://localhost:5501/edit/test-user');
    await page.waitForSelector('.property-column', { timeout: 10000 });
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-precise-1-loaded.png' });

    // 2. Attendre le chargement complet
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Lister toutes les propriétés existantes
    console.log('📋 ANALYSE DES PROPRIÉTÉS EXISTANTES');

    const existingProperties = await page.evaluate(() => {
      const propertyCards = Array.from(document.querySelectorAll('.property-card'));
      return propertyCards.map((card, index) => {
        const nameElement = card.querySelector('.property-name, input[value]');
        const typeElement = card.querySelector('.property-type, select');
        const exploreBtn = card.querySelector('.explore-btn, button[text*="→"], button[text*="Configurer"]');

        return {
          index,
          name: nameElement ? (nameElement.value || nameElement.textContent || '').trim() : 'N/A',
          type: typeElement ? (typeElement.value || typeElement.textContent || '').trim() : 'N/A',
          hasExploreButton: !!exploreBtn,
          exploreButtonText: exploreBtn ? exploreBtn.textContent.trim() : null,
          innerHTML: card.innerHTML.substring(0, 200) + '...'
        };
      });
    });

    console.log('📊 PROPRIÉTÉS TROUVÉES:');
    existingProperties.forEach(prop => {
      console.log(`[${prop.index}] ${prop.name} (${prop.type}) - Bouton explore: ${prop.hasExploreButton} "${prop.exploreButtonText}"`);
    });

    // 4. Ajouter une nouvelle propriété jsonschema
    console.log('➕ AJOUT NOUVELLE PROPRIÉTÉ JSONSCHEMA');

    // Cliquer sur le bouton ajouter
    await page.click('button:contains("Ajouter"), .add-btn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Remplir le formulaire
    await page.type('input[type="text"]', 'test_jsonschema_prop');
    await page.select('select', 'jsonschema');

    // Valider
    const addButtons = await page.$$('button');
    for (const btn of addButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Ajouter') && !text.includes('propriété') && !text.includes('Ajouter une')) {
        await btn.click();
        break;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-precise-2-added.png' });

    // 5. Analyser les propriétés après ajout
    console.log('🔍 ANALYSE APRÈS AJOUT');

    const newProperties = await page.evaluate(() => {
      const propertyCards = Array.from(document.querySelectorAll('.property-card'));
      return propertyCards.map((card, index) => {
        const nameElement = card.querySelector('.property-name, input[value]');
        const typeElement = card.querySelector('.property-type, select');

        // Chercher tous les boutons dans cette carte
        const buttons = Array.from(card.querySelectorAll('button'));
        const buttonsInfo = buttons.map(btn => ({
          text: btn.textContent.trim(),
          className: btn.className,
          disabled: btn.disabled
        }));

        return {
          index,
          name: nameElement ? (nameElement.value || nameElement.textContent || '').trim() : 'N/A',
          type: typeElement ? (typeElement.value || typeElement.textContent || '').trim() : 'N/A',
          buttons: buttonsInfo
        };
      });
    });

    console.log('📊 PROPRIÉTÉS APRÈS AJOUT:');
    newProperties.forEach(prop => {
      console.log(`[${prop.index}] ${prop.name} (${prop.type})`);
      prop.buttons.forEach((btn, btnIndex) => {
        console.log(`  Bouton ${btnIndex}: "${btn.text}" (${btn.className}) ${btn.disabled ? '[DISABLED]' : ''}`);
      });
    });

    // 6. Chercher spécifiquement la propriété jsonschema
    const jsonschemaProperty = newProperties.find(prop =>
      prop.name.includes('test_jsonschema') || prop.type === 'jsonschema'
    );

    if (jsonschemaProperty) {
      console.log('✅ PROPRIÉTÉ JSONSCHEMA TROUVÉE:', jsonschemaProperty);

      const configurerButton = jsonschemaProperty.buttons.find(btn =>
        btn.text.includes('→') ||
        btn.text.includes('Configurer') ||
        btn.text.includes('Config') ||
        btn.className.includes('explore')
      );

      if (configurerButton) {
        console.log('✅ BOUTON CONFIGURER TROUVÉ:', configurerButton);
      } else {
        console.log('❌ AUCUN BOUTON CONFIGURER POUR LA PROPRIÉTÉ JSONSCHEMA');
        console.log('📋 Boutons disponibles:', jsonschemaProperty.buttons);
      }
    } else {
      console.log('❌ PROPRIÉTÉ JSONSCHEMA NON TROUVÉE');
    }

    // 7. Test final : essayer de cliquer sur le bouton configurer s'il existe
    const exploreButton = await page.$('.property-card .explore-btn');
    if (exploreButton) {
      console.log('🎯 TENTATIVE DE CLIC SUR BOUTON EXPLORER');

      await exploreButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-precise-3-apres-clic.png' });

      // Vérifier si de nouvelles colonnes sont apparues
      const columnsAfter = await page.$$('.property-column');
      console.log(`📊 Nombre de colonnes après clic: ${columnsAfter.length}`);

      if (columnsAfter.length > 1) {
        console.log('✅ SUCCÈS: Nouvelle colonne ouverte!');
      } else {
        console.log('❌ ÉCHEC: Aucune nouvelle colonne');
      }
    } else {
      console.log('❌ AUCUN BOUTON EXPLORER TROUVÉ DANS LE DOM');
    }

    console.log('✅ TEST TERMINÉ');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-precise-error.png' });
  } finally {
    await browser.close();
  }
}

testPreciseConfigurer().catch(console.error);