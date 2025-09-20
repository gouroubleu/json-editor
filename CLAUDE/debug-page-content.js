#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function debugPageContent() {
  console.log('🔍 Debug contenu de la page');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    console.log('🌐 Navigation vers http://localhost:5503/bdd/test-user/new/');
    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Analyser le contenu de la page
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,

        // Compter les éléments
        inputsCount: document.querySelectorAll('input').length,
        buttonsCount: document.querySelectorAll('button').length,
        fieldsCount: document.querySelectorAll('.field-item').length,
        columnsCount: document.querySelectorAll('.entity-column').length,

        // Lister tous les inputs
        inputs: Array.from(document.querySelectorAll('input')).map(input => ({
          type: input.type,
          name: input.name,
          value: input.value,
          placeholder: input.placeholder,
          id: input.id,
          className: input.className
        })),

        // Lister tous les boutons
        buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          title: btn.title,
          className: btn.className
        })),

        // Lister les champs
        fieldItems: Array.from(document.querySelectorAll('.field-item')).map(field => {
          const nameEl = field.querySelector('.field-name');
          const inputEl = field.querySelector('input, select, textarea');
          return {
            name: nameEl?.textContent?.trim(),
            hasInput: !!inputEl,
            hasButton: !!field.querySelector('button')
          };
        })
      };
    });

    console.log('📊 ANALYSE DE LA PAGE:');
    console.log(`📋 Title: ${pageInfo.title}`);
    console.log(`📋 URL: ${pageInfo.url}`);
    console.log(`📋 Inputs: ${pageInfo.inputsCount}`);
    console.log(`📋 Boutons: ${pageInfo.buttonsCount}`);
    console.log(`📋 Champs (.field-item): ${pageInfo.fieldsCount}`);
    console.log(`📋 Colonnes: ${pageInfo.columnsCount}`);

    console.log('\n📝 INPUTS TROUVÉS:');
    pageInfo.inputs.forEach((input, i) => {
      console.log(`  ${i}: ${JSON.stringify(input)}`);
    });

    console.log('\n🔘 BOUTONS TROUVÉS:');
    pageInfo.buttons.forEach((btn, i) => {
      console.log(`  ${i}: ${JSON.stringify(btn)}`);
    });

    console.log('\n📄 CHAMPS TROUVÉS:');
    pageInfo.fieldItems.forEach((field, i) => {
      console.log(`  ${i}: ${JSON.stringify(field)}`);
    });

    // Sauvegarder
    const fs = require('fs').promises;
    await fs.writeFile('CLAUDE/debug-page-analysis.json', JSON.stringify(pageInfo, null, 2));
    console.log('\n📄 Analyse sauvegardée');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
  } finally {
    await browser.close();
  }
}

// Exécution
if (require.main === module) {
  debugPageContent().catch(console.error);
}