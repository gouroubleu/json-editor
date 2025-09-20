const puppeteer = require('puppeteer');

async function testClicConfigurerJsonschema() {
  console.log('🚀 TEST CLIC CONFIGURER JSONSCHEMA - VERIFICATION CONTENU');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Navigation et création d'une propriété jsonschema
    console.log('📍 Navigation et création propriété jsonschema');
    await page.goto('http://localhost:5501/edit/test-user');
    await page.waitForSelector('.property-column', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Ajouter une propriété jsonschema
    await page.click('.property-column .add-btn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const addForm = await page.$('.add-property-form');
    const nameInput = await addForm.$('input[type="text"]');
    const typeSelect = await addForm.$('select');

    await nameInput.type('test_reference_schema');
    await typeSelect.select('jsonschema');

    // Valider
    const submitBtn = await addForm.$('button.btn-primary');
    await submitBtn.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-clic-1-propriete-creee.png' });

    // 2. Cliquer sur Configurer et analyser ce qui s'affiche
    console.log('🎯 CLIC SUR CONFIGURER - ANALYSE CONTENU');

    const exploreBtn = await page.$('.property-card .explore-btn');
    if (exploreBtn) {
      await exploreBtn.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-clic-2-apres-configurer.png' });

      // 3. Analyser le contenu de la nouvelle colonne
      console.log('🔍 ANALYSE DU CONTENU DE LA COLONNE');

      const columns = await page.$$('.property-column');
      console.log(`📊 Nombre de colonnes: ${columns.length}`);

      if (columns.length > 1) {
        // Analyser la dernière colonne (colonne de configuration)
        const lastColumn = columns[columns.length - 1];

        const columnContent = await page.evaluate(col => {
          return {
            innerHTML: col.innerHTML.substring(0, 1000) + '...',
            textContent: col.textContent.substring(0, 500) + '...',
            hasReferenceConfig: !!col.querySelector('.reference-config-column, [class*="reference"]'),
            hasSchemaSelector: !!col.querySelector('select[name*="schema"], select[id*="schema"]'),
            hasTitle: !!col.querySelector('h3, h2, .column-title'),
            title: col.querySelector('h3, h2, .column-title')?.textContent || 'Pas de titre',
            formElements: Array.from(col.querySelectorAll('input, select, textarea')).map(el => ({
              type: el.tagName.toLowerCase(),
              inputType: el.type || 'N/A',
              name: el.name || 'N/A',
              placeholder: el.placeholder || 'N/A'
            }))
          };
        }, lastColumn);

        console.log('📋 CONTENU DE LA COLONNE DE CONFIGURATION:');
        console.log(`   Titre: "${columnContent.title}"`);
        console.log(`   A ReferenceConfig: ${columnContent.hasReferenceConfig ? '✅' : '❌'}`);
        console.log(`   A Schema Selector: ${columnContent.hasSchemaSelector ? '✅' : '❌'}`);
        console.log(`   Éléments de formulaire: ${columnContent.formElements.length}`);

        columnContent.formElements.forEach((el, i) => {
          console.log(`     [${i}] ${el.type} (${el.inputType}) - ${el.name} - "${el.placeholder}"`);
        });

        console.log('\n📄 HTML SNIPPET:');
        console.log(columnContent.textContent.substring(0, 300));

        // 4. Vérifier si c'est bien ReferenceConfigColumn qui s'affiche
        if (columnContent.hasReferenceConfig || columnContent.title.includes('Référence') || columnContent.title.includes('Schéma')) {
          console.log('✅ SUCCÈS: ReferenceConfigColumn s\'affiche correctement');
          return { success: true, message: 'ReferenceConfigColumn affiché', content: columnContent };
        } else {
          console.log('❌ PROBLÈME: Ce n\'est pas ReferenceConfigColumn qui s\'affiche');
          return { success: false, message: 'Mauvaise colonne affichée', content: columnContent };
        }
      } else {
        console.log('❌ PROBLÈME: Aucune nouvelle colonne créée');
        return { success: false, message: 'Pas de nouvelle colonne' };
      }
    } else {
      console.log('❌ BOUTON CONFIGURER NON TROUVÉ');
      return { success: false, message: 'Bouton Configurer absent' };
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-clic-error.png' });
    return { success: false, message: `Erreur: ${error.message}` };
  } finally {
    await browser.close();
  }
}

testClicConfigurerJsonschema()
  .then(result => {
    console.log('\n=== RÉSULTAT ANALYSE CONFIGURER ===');
    console.log(`Succès: ${result.success ? '✅' : '❌'}`);
    console.log(`Message: ${result.message}`);

    if (result.content) {
      console.log('\n📋 DÉTAILS COLONNE:');
      console.log(JSON.stringify(result.content, null, 2));
    }
  })
  .catch(console.error);