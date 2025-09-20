const puppeteer = require('puppeteer');

async function testRealJsonSchema() {
  console.log('🚀 DÉBUT TEST RÉEL UTILISATEUR JSONSCHEMA');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Aller à la page d'accueil
    console.log('📍 Navigation vers http://localhost:5501/');
    await page.goto('http://localhost:5501/');
    await page.waitForSelector('body', { timeout: 10000 });
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-1-homepage.png' });

    // 2. Chercher le lien vers test-user
    console.log('🔍 Recherche du lien test-user');
    await page.waitForSelector('a[href*="test-user"]', { timeout: 5000 });

    // 3. Cliquer sur test-user pour aller à l'éditeur
    console.log('👆 Clic sur test-user');
    await page.click('a[href*="test-user"]');
    await page.waitForNavigation();
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-2-test-user-page.png' });

    // Attendre que la page se charge complètement
    await page.waitForTimeout(2000);

    // 4. Chercher l'éditeur de schéma et le bouton "Ajouter"
    console.log('🔍 Recherche du bouton ajouter propriété');
    const addButtons = await page.$$('button');
    let addButton = null;

    for (const button of addButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Ajouter') || text.includes('+')) {
        addButton = button;
        console.log(`✅ Bouton trouvé: "${text}"`);
        break;
      }
    }

    if (!addButton) {
      console.log('❌ Bouton ajouter non trouvé. Contenu de la page:');
      const content = await page.content();
      console.log(content.substring(0, 1000));
      throw new Error('Bouton ajouter non trouvé');
    }

    // 5. Cliquer sur le bouton ajouter
    console.log('👆 Clic sur bouton ajouter');
    await addButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-3-apres-clic-ajouter.png' });

    // 6. Remplir le nom de la propriété
    console.log('✏️ Saisie du nom de propriété');
    const nameInput = await page.$('input[type="text"]');
    if (nameInput) {
      await nameInput.type('ma_reference_test');
    }

    // 7. Sélectionner le type jsonschema
    console.log('🔽 Sélection du type jsonschema');
    const typeSelect = await page.$('select');
    if (typeSelect) {
      await typeSelect.select('jsonschema');
      console.log('✅ Type jsonschema sélectionné');
    }

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-4-formulaire-rempli.png' });

    // 8. Valider l'ajout
    const validateButtons = await page.$$('button');
    for (const button of validateButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Ajouter') || text.includes('Valider') || text.includes('OK')) {
        console.log('👆 Clic sur bouton de validation');
        await button.click();
        break;
      }
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-5-propriete-ajoutee.png' });

    // 9. Chercher le bouton "Configurer"
    console.log('🔍 Recherche du bouton Configurer');
    const allButtons = await page.$$('button');
    let configurerButton = null;

    for (const button of allButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Configurer') || text.includes('→') || text.includes('Config')) {
        configurerButton = button;
        console.log(`✅ Bouton Configurer trouvé: "${text}"`);
        break;
      }
    }

    if (!configurerButton) {
      console.log('❌ PROBLÈME: Bouton Configurer non trouvé!');

      // Lister tous les boutons présents
      console.log('📋 Liste de tous les boutons présents:');
      for (const button of allButtons) {
        const text = await page.evaluate(el => el.textContent, button);
        console.log(`- "${text}"`);
      }

      throw new Error('Bouton Configurer non trouvé');
    }

    // 10. Cliquer sur le bouton Configurer
    console.log('👆 Clic sur bouton Configurer');
    await configurerButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-6-apres-clic-configurer.png' });

    // 11. Vérifier si une nouvelle colonne s'est ouverte
    console.log('🔍 Vérification ouverture colonne de configuration');
    const colonnes = await page.$$('.property-column, .column');
    console.log(`📊 Nombre de colonnes détectées: ${colonnes.length}`);

    if (colonnes.length >= 2) {
      console.log('✅ SUCCÈS: Colonne de configuration ouverte!');
    } else {
      console.log('❌ ÉCHEC: Aucune colonne de configuration ouverte');
    }

    // 12. Vérifier les erreurs console
    const errors = await page.evaluate(() => {
      return window.errors || [];
    });

    if (errors.length > 0) {
      console.log('⚠️ Erreurs JavaScript détectées:');
      errors.forEach(error => console.log(`- ${error}`));
    }

    console.log('✅ TEST TERMINÉ');

  } catch (error) {
    console.error('❌ ERREUR DURANT LE TEST:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-error.png' });
  } finally {
    await browser.close();
  }
}

// Capturer les erreurs console
console.log('🚀 Démarrage du test réel utilisateur...');
testRealJsonSchema().catch(console.error);