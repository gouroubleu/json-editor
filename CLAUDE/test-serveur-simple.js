/**
 * Test simple pour vérifier que le serveur fonctionne
 */

const puppeteer = require('puppeteer');

async function testServeurSimple() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('🎯 Test serveur simple...');

    // Test page d'accueil
    await page.goto('http://localhost:5501/', {
      waitUntil: 'networkidle0',
      timeout: 15000
    });

    console.log('✅ Page d\'accueil: OK');

    // Test page schemas
    await page.goto('http://localhost:5501/bdd/test-user/', {
      waitUntil: 'networkidle0',
      timeout: 15000
    });

    console.log('✅ Page test-user: OK');

    // Test mode création (devrait fonctionner)
    await page.goto('http://localhost:5501/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 15000
    });

    console.log('✅ Mode création: OK');

    // Test mode édition (notre problème)
    try {
      await page.goto('http://localhost:5501/bdd/test-user/entity_mfqm0qvi_ainoph/edit/', {
        waitUntil: 'networkidle0',
        timeout: 15000
      });
      console.log('✅ Mode édition: OK');
    } catch (error) {
      console.log('❌ Mode édition: TIMEOUT');
      console.log('Erreur:', error.message);
    }

    await browser.close();
    return { success: true };

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await browser.close();
    return { error: error.message };
  }
}

testServeurSimple().then(result => {
  console.log('\n📋 Résultat test serveur:', result);
}).catch(console.error);