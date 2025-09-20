/**
 * Debug simple du contenu de la page
 */

const puppeteer = require('puppeteer');

async function debugPageContent() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('🚀 Debug - Chargement page...');

    await page.goto('http://localhost:5501/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Analyser le contenu de la page
    const pageContent = await page.evaluate(() => {
      // Chercher tous les champs
      const fieldNames = Array.from(document.querySelectorAll('.field-name')).map(el => el.textContent);

      // Chercher tous les boutons
      const buttons = Array.from(document.querySelectorAll('button')).map(btn => btn.textContent);

      // Chercher le texte général de la page
      const hasAdresse = document.body.textContent.includes('adresse');
      const hasPop = document.body.textContent.includes('pop');

      // Structure générale
      const hasEntityColumn = !!document.querySelector('.entity-column');
      const hasPropertyColumn = !!document.querySelector('.property-column');
      const hasFieldItems = document.querySelectorAll('.field-item').length;

      return {
        fieldNames,
        buttons: buttons.slice(0, 10), // Limiter pour éviter le spam
        hasAdresse,
        hasPop,
        hasEntityColumn,
        hasPropertyColumn,
        fieldItemsCount: hasFieldItems,
        url: window.location.href,
        title: document.title
      };
    });

    console.log('📊 CONTENU DE LA PAGE:');
    console.log('   URL:', pageContent.url);
    console.log('   Titre:', pageContent.title);
    console.log('   Champs trouvés:', pageContent.fieldNames);
    console.log('   Boutons (premiers 10):', pageContent.buttons);
    console.log('   Contient "adresse":', pageContent.hasAdresse);
    console.log('   Contient "pop":', pageContent.hasPop);
    console.log('   Entity columns:', pageContent.hasEntityColumn);
    console.log('   Property columns:', pageContent.hasPropertyColumn);
    console.log('   Nombre field-items:', pageContent.fieldItemsCount);

    // Test spécifique pour "pop" s'il existe
    if (pageContent.hasPop) {
      const popTest = await page.evaluate(() => {
        const fieldElements = Array.from(document.querySelectorAll('.field-name'));
        const popField = fieldElements.find(el => el.textContent.includes('pop'));

        if (!popField) {
          return { found: false };
        }

        const fieldContainer = popField.closest('.field-item');
        const selectElement = fieldContainer?.querySelector('select.direct-edit-input');
        const inputElement = fieldContainer?.querySelector('input.direct-edit-input');

        return {
          found: true,
          hasSelect: !!selectElement,
          hasInput: !!inputElement,
          selectOptions: selectElement ? Array.from(selectElement.options).map(opt => opt.textContent) : []
        };
      });

      console.log('🎯 TEST CHAMP POP:', popTest);

      if (popTest.found && popTest.hasSelect) {
        console.log('✅ CORRECTION SELECT VALIDÉE !');
      } else if (popTest.found && popTest.hasInput) {
        console.log('❌ PROBLÈME: Pop reste un input');
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }

  await browser.close();
}

// Exécution
debugPageContent().catch(console.error);