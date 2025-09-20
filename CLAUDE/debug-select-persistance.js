const puppeteer = require('puppeteer');

async function debugSelectPersistence() {
  console.log('🔍 DEBUG: Persistance des options select');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();

    // Intercepter les requêtes pour voir les données envoyées
    page.on('request', request => {
      if (request.method() === 'POST' || request.method() === 'PUT') {
        console.log('📤 REQUÊTE:', request.method(), request.url());
        try {
          const postData = request.postData();
          if (postData) {
            const data = JSON.parse(postData);
            console.log('📋 DONNÉES ENVOYÉES:', JSON.stringify(data, null, 2));
          }
        } catch (e) {
          console.log('⚠️ Impossible de parser les données de la requête');
        }
      }
    });

    // Aller sur la page new
    await page.goto('http://localhost:5502/new', { waitUntil: 'networkidle2' });
    console.log('✅ Page chargée');

    // Créer un schéma simple
    await page.waitForSelector('input');
    const nameInput = await page.$('input[placeholder*="nom"], input[placeholder*="Nom"]');
    if (nameInput) {
      await nameInput.type('debug-select-test');
      console.log('✅ Nom du schéma saisi');
    }

    // Ajouter une propriété select
    await page.waitForSelector('button');
    const buttons = await page.$$('button');

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && text.includes('Ajouter')) {
        await button.click();
        console.log('✅ Formulaire d\'ajout ouvert');
        break;
      }
    }

    await page.waitForTimeout(1000);

    // Remplir le formulaire de propriété
    const propertyNameInput = await page.$('input[placeholder*="propriété"]');
    if (propertyNameInput) {
      await propertyNameInput.type('test_select_debug');
      console.log('✅ Nom de propriété saisi');
    }

    // Sélectionner le type select
    const selectElement = await page.$('select');
    if (selectElement) {
      await page.select('select', 'select');
      console.log('✅ Type "select" sélectionné');
    }

    // Ajouter la propriété
    const addPropertyButtons = await page.$$('button');
    for (const button of addPropertyButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && text.includes('Ajouter') && !text.includes('➕')) {
        await button.click();
        console.log('✅ Propriété ajoutée');
        break;
      }
    }

    await page.waitForTimeout(2000);

    // Cliquer sur "Configurer"
    const allButtons = await page.$$('button');
    let configurerClicked = false;

    for (const button of allButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && text.includes('Configurer')) {
        await button.click();
        configurerClicked = true;
        console.log('✅ Clic sur "Configurer" effectué');
        break;
      }
    }

    if (!configurerClicked) {
      throw new Error('❌ Bouton "Configurer" non trouvé');
    }

    await page.waitForTimeout(2000);

    // Vérifier si les options par défaut s'affichent
    console.log('\n🔍 VÉRIFICATION DES OPTIONS PAR DÉFAUT:');

    const pageContent = await page.content();

    if (pageContent.includes('option1') || pageContent.includes('Option 1')) {
      console.log('✅ Options par défaut trouvées dans le HTML');
    } else {
      console.log('❌ Options par défaut MANQUANTES dans le HTML');
    }

    // Essayer d'ajouter une nouvelle option
    console.log('\n🔍 TEST D\'AJOUT D\'OPTION:');

    const keyInput = await page.$('input[placeholder*="Clé"]');
    const valueInput = await page.$('input[placeholder*="Valeur"]');

    if (keyInput && valueInput) {
      await keyInput.type('test_key');
      await valueInput.type('Test Value');
      console.log('✅ Clé et valeur saisies');

      // Cliquer sur ajouter
      const addOptionButtons = await page.$$('button');
      for (const button of addOptionButtons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && text.includes('Ajouter option')) {
          await button.click();
          console.log('✅ Clic sur "Ajouter option"');
          break;
        }
      }

      await page.waitForTimeout(1000);

      // Vérifier si l'option apparaît
      const updatedContent = await page.content();
      if (updatedContent.includes('test_key') && updatedContent.includes('Test Value')) {
        console.log('✅ Nouvelle option affichée dans l\'interface');
      } else {
        console.log('❌ Nouvelle option NON AFFICHÉE');
      }

    } else {
      console.log('❌ Inputs clé/valeur non trouvés');
    }

    // Capturer l'état du localStorage/sessionStorage
    const storageData = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage).map(key => ({
          key,
          value: localStorage.getItem(key)
        })),
        sessionStorage: Object.keys(sessionStorage).map(key => ({
          key,
          value: sessionStorage.getItem(key)
        }))
      };
    });

    console.log('\n🔍 STORAGE DATA:');
    console.log(JSON.stringify(storageData, null, 2));

    return {
      success: true,
      message: 'Debug terminé'
    };

  } catch (error) {
    console.error('❌ ERREUR DEBUG:', error.message);

    // Capturer l'HTML de la page pour debug
    try {
      const html = await page.content();
      require('fs').writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/debug-page-content.html', html);
      console.log('🔍 HTML capturé dans debug-page-content.html');
    } catch (e) {
      console.log('⚠️ Impossible de capturer l\'HTML');
    }

    return {
      success: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// Exécution
debugSelectPersistence()
  .then(result => {
    console.log('\n📊 RÉSULTAT DEBUG:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('💥 ERREUR FATALE:', err);
    process.exit(1);
  });