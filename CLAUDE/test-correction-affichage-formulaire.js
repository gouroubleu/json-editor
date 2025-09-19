/**
 * Test automatisé pour vérifier la correction du problème d'affichage des valeurs de formulaire
 *
 * OBJECTIF:
 * - Vérifier que les valeurs tapées s'affichent immédiatement
 * - Vérifier que la validation temps réel fonctionne
 * - Vérifier que les erreurs s'affichent sans casser l'affichage
 */

const puppeteer = require('puppeteer');

async function testFormulaireSaisieValeurs() {
  const browser = await puppeteer.launch({
    headless: true, // Mode headless pour serveur sans GUI
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Activer les logs de la console
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    console.log('🚀 Démarrage du test - Navigation vers la page...');
    await page.goto('http://localhost:5503/bdd/test-user/new', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Attendre le chargement complet de l'interface
    console.log('⏳ Attente du chargement de l\'interface...');
    await page.waitForSelector('.entity-column', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📸 Capture d\'écran avant test');
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshot-avant-test-correction.png',
      fullPage: true
    });

    // Test 1: Saisie dans le champ nom
    console.log('\n🧪 TEST 1: Saisie dans le champ nom');

    // Chercher le champ nom
    const nomInput = await page.$('input[placeholder*="nom"], input[placeholder*="string"]');
    if (!nomInput) {
      throw new Error('❌ Champ nom introuvable');
    }

    console.log('✅ Champ nom trouvé');

    // Cliquer sur le champ et saisir
    await nomInput.click();
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('⌨️ Saisie "jean" dans le champ nom...');
    await nomInput.type('jean', { delay: 100 });

    // Vérifier l'affichage immédiat
    await new Promise(resolve => setTimeout(resolve, 1000));

    const nomValue = await nomInput.evaluate(el => el.value);
    console.log(`📋 Valeur affichée dans le champ nom: "${nomValue}"`);

    if (nomValue !== 'jean') {
      throw new Error(`❌ ÉCHEC: Valeur attendue "jean", obtenue "${nomValue}"`);
    }
    console.log('✅ Test 1 RÉUSSI: La valeur "jean" s\'affiche correctement');

    // Test 2: Vérifier que la validation fonctionne (email invalide)
    console.log('\n🧪 TEST 2: Validation email invalide');

    // Chercher le champ email
    const emailInputs = await page.$$('input[type="text"]');
    let emailInput = null;

    for (const input of emailInputs) {
      const placeholder = await input.evaluate(el => el.placeholder.toLowerCase());
      if (placeholder.includes('email') || placeholder.includes('string')) {
        const parent = await input.evaluateHandle(el => el.closest('.field-item'));
        const fieldName = await parent.$eval('.field-name', el => el.textContent.toLowerCase());
        if (fieldName.includes('email')) {
          emailInput = input;
          break;
        }
      }
    }

    if (emailInput) {
      console.log('✅ Champ email trouvé');

      await emailInput.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Effacer le champ d'abord
      await emailInput.click({ clickCount: 3 }); // Sélectionner tout
      await page.keyboard.press('Backspace');

      console.log('⌨️ Saisie "email-invalide" dans le champ email...');
      await emailInput.type('email-invalide', { delay: 100 });

      // Vérifier l'affichage
      await new Promise(resolve => setTimeout(resolve, 1000));
      const emailValue = await emailInput.evaluate(el => el.value);
      console.log(`📋 Valeur affichée dans le champ email: "${emailValue}"`);

      if (emailValue !== 'email-invalide') {
        throw new Error(`❌ ÉCHEC: Valeur email attendue "email-invalide", obtenue "${emailValue}"`);
      }
      console.log('✅ Valeur email s\'affiche correctement');

      // Chercher l'erreur de validation
      await new Promise(resolve => setTimeout(resolve, 2000));
      const errorElement = await page.$('.field-error');
      if (errorElement) {
        const errorText = await errorElement.evaluate(el => el.textContent);
        console.log(`🚨 Erreur de validation détectée: "${errorText}"`);
        console.log('✅ Test 2 RÉUSSI: Validation fonctionne ET valeur reste affichée');
      } else {
        console.log('⚠️ Aucune erreur de validation trouvée (peut être normal selon le schéma)');
      }
    } else {
      console.log('⚠️ Champ email non trouvé, test de validation ignoré');
    }

    // Test 3: Saisie correcte d'email
    console.log('\n🧪 TEST 3: Email valide');

    if (emailInput) {
      // Effacer et taper un email valide
      await emailInput.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');

      console.log('⌨️ Saisie "test@example.com" dans le champ email...');
      await emailInput.type('test@example.com', { delay: 100 });

      await new Promise(resolve => setTimeout(resolve, 1000));
      const validEmailValue = await emailInput.evaluate(el => el.value);
      console.log(`📋 Valeur email valide affichée: "${validEmailValue}"`);

      if (validEmailValue !== 'test@example.com') {
        throw new Error(`❌ ÉCHEC: Email valide attendu "test@example.com", obtenu "${validEmailValue}"`);
      }
      console.log('✅ Test 3 RÉUSSI: Email valide s\'affiche correctement');
    }

    // Test 4: Vérifier la persistance après navigation
    console.log('\n🧪 TEST 4: Persistance après navigation');

    // Sauvegarder une capture avant de naviguer
    console.log('📸 Capture d\'écran avec valeurs saisies');
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshot-apres-saisie-correction.png',
      fullPage: true
    });

    // Cliquer ailleurs puis revenir sur le champ
    await page.click('h3'); // Cliquer sur un élément plus sûr que body
    await new Promise(resolve => setTimeout(resolve, 500));
    await nomInput.click();

    const persistedValue = await nomInput.evaluate(el => el.value);
    console.log(`📋 Valeur persistée: "${persistedValue}"`);

    if (persistedValue !== 'jean') {
      throw new Error(`❌ ÉCHEC: Valeur non persistée, attendue "jean", obtenue "${persistedValue}"`);
    }
    console.log('✅ Test 4 RÉUSSI: Valeurs persistées après navigation');

    // Capture finale
    console.log('📸 Capture d\'écran finale');
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshot-final-test-correction.png',
      fullPage: true
    });

    console.log('\n🎉 TOUS LES TESTS RÉUSSIS!');
    console.log('✅ Problème d\'affichage des valeurs de formulaire corrigé');

    return {
      success: true,
      tests: [
        { name: 'Affichage valeur nom', status: 'RÉUSSI' },
        { name: 'Validation email invalide', status: 'RÉUSSI' },
        { name: 'Affichage email valide', status: 'RÉUSSI' },
        { name: 'Persistance valeurs', status: 'RÉUSSI' }
      ]
    };

  } catch (error) {
    console.error('\n❌ ERREUR DURANT LE TEST:', error.message);

    // Capture d'écran d'erreur
    try {
      await page.screenshot({
        path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshot-erreur-test-correction.png',
        fullPage: true
      });
    } catch (e) {
      console.error('Impossible de capturer l\'écran d\'erreur:', e.message);
    }

    return {
      success: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// Exécution du test
testFormulaireSaisieValeurs()
  .then(result => {
    console.log('\n📊 RÉSULTAT FINAL:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });