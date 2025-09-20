const puppeteer = require('puppeteer');

async function testDirectEditJsonSchema() {
  console.log('🚀 TEST DIRECT EDIT JSONSCHEMA');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Aller directement sur /edit/test-user
    console.log('📍 Navigation directe vers /edit/test-user');
    await page.goto('http://localhost:5501/edit/test-user');
    await page.waitForSelector('body', { timeout: 10000 });
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-direct-1-editor.png' });

    console.log('✅ Page éditeur chargée');

    // 2. Attendre que l'éditeur soit complètement chargé
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Chercher le bouton "Ajouter"
    console.log('🔍 Recherche du bouton Ajouter propriété');
    const buttons = await page.$$('button');

    let addButton = null;
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      console.log(`Bouton trouvé: "${text}"`);
      if (text.includes('Ajouter') || text.includes('+')) {
        addButton = button;
        console.log(`✅ Bouton Ajouter sélectionné: "${text}"`);
        break;
      }
    }

    if (!addButton) {
      console.log('❌ Aucun bouton Ajouter trouvé');
      // Capturer le contenu pour debug
      const content = await page.content();
      console.log('Page content (premiers 2000 chars):');
      console.log(content.substring(0, 2000));
      throw new Error('Bouton Ajouter non trouvé');
    }

    // 4. Cliquer sur Ajouter
    console.log('👆 Clic sur bouton Ajouter');
    await addButton.click();
    await new Promise(resolve => setTimeout(resolve, 1500));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-direct-2-apres-add.png' });

    // 5. Remplir le formulaire
    console.log('✏️ Remplissage du formulaire');

    // Trouver et remplir le champ nom
    const nameInput = await page.$('input[type="text"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 }); // Sélectionner tout
      await nameInput.type('ma_propriete_jsonschema');
      console.log('✅ Nom saisi');
    }

    // Trouver et sélectionner le type
    const typeSelect = await page.$('select');
    if (typeSelect) {
      await typeSelect.select('jsonschema');
      console.log('✅ Type jsonschema sélectionné');
    }

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-direct-3-formulaire-rempli.png' });

    // 6. Valider le formulaire
    console.log('✅ Validation du formulaire');
    const validateButtons = await page.$$('button');
    for (const button of validateButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Ajouter') && !text.includes('propriété')) {
        console.log('👆 Clic validation');
        await button.click();
        break;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-direct-4-propriete-ajoutee.png' });

    // 7. ÉTAPE CRITIQUE: Chercher le bouton Configurer
    console.log('🔍 RECHERCHE CRITIQUE DU BOUTON CONFIGURER');

    const allElements = await page.$$('*');
    let configurerFound = false;

    for (const element of allElements) {
      const text = await page.evaluate(el => el.textContent || '', element);
      const tagName = await page.evaluate(el => el.tagName, element);

      if (text.includes('Configurer') || text.includes('→') || text.includes('Config')) {
        console.log(`✅ ÉLÉMENT CONFIGURER TROUVÉ: <${tagName}> "${text}"`);
        configurerFound = true;

        // Essayer de cliquer
        try {
          await element.click();
          console.log('✅ CLIC SUR CONFIGURER RÉUSSI');
          await new Promise(resolve => setTimeout(resolve, 2000));
          await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-direct-5-apres-configurer.png' });

          // Vérifier si de nouvelles colonnes sont apparues
          const colonnes = await page.$$('.property-column, .column, [class*="column"]');
          console.log(`📊 Nombre de colonnes après clic: ${colonnes.length}`);

        } catch (error) {
          console.log(`❌ Erreur lors du clic: ${error.message}`);
        }
        break;
      }
    }

    if (!configurerFound) {
      console.log('❌ AUCUN BOUTON CONFIGURER TROUVÉ');

      // Debug: lister tous les éléments contenant du texte
      console.log('📋 Tous les éléments avec du texte:');
      for (const element of allElements.slice(0, 50)) { // Limiter à 50 pour éviter le spam
        const text = await page.evaluate(el => el.textContent?.trim() || '', element);
        const tagName = await page.evaluate(el => el.tagName, element);
        if (text && text.length > 0 && text.length < 100) {
          console.log(`<${tagName}> "${text}"`);
        }
      }
    }

    // 8. Vérifier les erreurs console
    const logs = await page.evaluate(() => {
      return window.console._logs || [];
    });

    if (logs.length > 0) {
      console.log('📝 Logs console:', logs);
    }

    console.log('✅ TEST TERMINÉ');

  } catch (error) {
    console.error('❌ ERREUR DURANT LE TEST:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-direct-error.png' });
  } finally {
    await browser.close();
  }
}

testDirectEditJsonSchema().catch(console.error);