const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    // Lancer le navigateur
    browser = await puppeteer.launch({
      headless: false, // Visible pour debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Activer les logs de console
    page.on('console', msg => {
      console.log('🖥️ BROWSER LOG:', msg.type(), '-', msg.text());
    });

    // Naviguer vers la page
    console.log('📍 Navigation vers la page test-user/new...');
    await page.goto('http://localhost:5505/bdd/test-user/new/', {
      waitUntil: 'networkidle2'
    });

    // Attendre que la page soit chargée
    await page.waitForSelector('.field-item[q\\:key="adresse"]');
    console.log('✅ Propriété adresse trouvée');

    // Localiser la flèche de la propriété adresse
    const adresseButton = await page.$('.field-item[q\\:key="adresse"] .field-actions button');
    if (!adresseButton) {
      throw new Error('❌ Bouton flèche adresse non trouvé');
    }
    console.log('✅ Bouton flèche adresse trouvé');

    // Prendre une capture avant le clic
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/before-click.png' });
    console.log('📸 Capture avant clic sauvegardée');

    // Cliquer sur la flèche
    console.log('🖱️ Clic sur la flèche adresse...');
    await adresseButton.click();

    // Attendre un peu pour que l'UI se mette à jour
    await page.waitForTimeout(1000);

    // Prendre une capture après le clic
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/after-click.png' });
    console.log('📸 Capture après clic sauvegardée');

    // Vérifier si une nouvelle colonne est apparue
    const columns = await page.$$('.entity-column');
    console.log(`📊 Nombre de colonnes après clic: ${columns.length}`);

    // Chercher la colonne adresse
    const adresseColumn = await page.$('.entity-column:nth-child(2)');
    if (adresseColumn) {
      const columnTitle = await adresseColumn.$eval('.column-title', el => el.textContent);
      console.log(`📋 Titre de la nouvelle colonne: "${columnTitle}"`);

      // Chercher les boutons d'ajout d'éléments
      const addButtons = await adresseColumn.$$('button');
      console.log(`🔘 Nombre de boutons dans la colonne adresse: ${addButtons.length}`);

      for (let i = 0; i < addButtons.length; i++) {
        const buttonText = await addButtons[i].evaluate(el => el.textContent);
        console.log(`🔘 Bouton ${i + 1}: "${buttonText}"`);
      }
    } else {
      console.log('❌ Aucune nouvelle colonne détectée');
    }

    // Vérifier l'état JSON actuel
    const jsonButton = await page.$('button:has-text("👁️ Voir JSON")');
    if (jsonButton) {
      await jsonButton.click();
      await page.waitForTimeout(500);
      console.log('👁️ Bouton JSON cliqué pour vérifier l\\'état');
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();