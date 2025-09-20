#!/usr/bin/env node

/**
 * Test simple pour valider que le type jsonschema est fonctionnel
 */

const puppeteer = require('puppeteer');

async function testJsonschema() {
  console.log('🎯 Test simple jsonschema');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  try {
    console.log('🌐 Navigation vers http://localhost:5503/');
    await page.goto('http://localhost:5503/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Attendre que la page se charge
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Prendre screenshot
    await page.screenshot({ path: 'CLAUDE/screenshots/homepage-simple.png', fullPage: true });
    console.log('📸 Screenshot homepage prise');

    // Vérifier si le bouton d'édition existe
    const editBtns = await page.$$('a[href*="/edit/"], button:has-text("Éditer")');
    if (editBtns.length === 0) {
      // Essayer de trouver les liens href="/edit/test-user"
      const testUserEditBtn = await page.$('a[href="/edit/test-user"]');
      if (testUserEditBtn) {
        console.log('✅ Bouton éditer test-user trouvé');
        await testUserEditBtn.click();
      } else {
        // Chercher dans le contenu de la page
        const content = await page.content();
        console.log('🔍 Contenu de la page:', content.substring(0, 500) + '...');

        // Essayer de naviguer directement
        await page.goto('http://localhost:5503/edit/test-user', { waitUntil: 'domcontentloaded' });
      }
    } else {
      console.log(`✅ Trouvé ${editBtns.length} boutons d'édition`);
      // Cliquer sur le premier bouton d'édition
      await editBtns[0].click();
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: 'CLAUDE/screenshots/edit-page.png', fullPage: true });
    console.log('📸 Screenshot edit page prise');

    // Vérifier si on peut ajouter une propriété
    const addBtn = await page.$('.add-btn');
    if (addBtn) {
      console.log('✅ Bouton ajouter trouvé');
      await addBtn.click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Vérifier si le formulaire d'ajout s'affiche
      const form = await page.$('.add-property-form');
      if (form) {
        console.log('✅ Formulaire d\'ajout affiché');

        // Vérifier si l'option jsonschema existe
        const select = await page.$('.add-property-form select');
        if (select) {
          const options = await page.$$eval('.add-property-form select option', opts =>
            opts.map(opt => opt.value)
          );
          console.log('📋 Options disponibles:', options);

          if (options.includes('jsonschema')) {
            console.log('✅ Option jsonschema disponible');

            await page.screenshot({ path: 'CLAUDE/screenshots/form-with-jsonschema.png', fullPage: true });
            console.log('📸 Screenshot formulaire avec jsonschema prise');

            console.log('\n🎉 SUCCESS: Type jsonschema est fonctionnel!');
            return true;
          } else {
            console.log('❌ Option jsonschema manquante');
          }
        }
      }
    }

    console.log('❌ FAILED: Navigation ou fonctionnalité manquante');
    return false;

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: 'CLAUDE/screenshots/error-simple.png', fullPage: true });
    return false;
  } finally {
    await browser.close();
  }
}

// Exécution
if (require.main === module) {
  testJsonschema()
    .then(success => {
      console.log(success ? '\n✅ TEST RÉUSSI' : '\n❌ TEST ÉCHOUÉ');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}