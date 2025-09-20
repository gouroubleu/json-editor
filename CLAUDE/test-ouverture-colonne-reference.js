const puppeteer = require('puppeteer');

async function testOuvertureColonneReference() {
  console.log('🚀 TEST OUVERTURE COLONNE RÉFÉRENCE JSONSCHEMA');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Navigation vers éditeur de schéma
    console.log('📍 Navigation vers /edit/test-user');
    await page.goto('http://localhost:5501/edit/test-user');
    await page.waitForSelector('.property-column', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-colonne-1-initial.png' });

    // 2. Analyser l'état initial
    console.log('📊 ÉTAT INITIAL');
    const initialColumns = await page.$$('.property-column');
    console.log(`Colonnes initiales: ${initialColumns.length}`);

    const initialProperties = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.property-card'));
      return cards.map((card, i) => {
        const name = card.querySelector('.property-name')?.value || 'N/A';
        const type = card.querySelector('.property-type')?.value || 'N/A';
        const hasBtn = !!card.querySelector('.explore-btn');
        return { index: i, name, type, hasBtn };
      });
    });

    console.log('Properties existantes:');
    initialProperties.forEach(p => {
      console.log(`  [${p.index}] ${p.name} (${p.type}) - Btn: ${p.hasBtn ? '✅' : '❌'}`);
    });

    // 3. Ajouter une propriété jsonschema
    console.log('\n➕ AJOUT PROPRIÉTÉ JSONSCHEMA');
    await page.click('.property-column .add-btn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const nameInput = await page.$('.add-property-form input[type="text"]');
    const typeSelect = await page.$('.add-property-form select');

    await nameInput.type('test_reference_config');
    await typeSelect.select('jsonschema');

    await page.click('.add-property-form button.btn-primary');
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-colonne-2-propriete-ajoutee.png' });

    // 4. Vérifier que la propriété est créée
    const newProperties = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.property-card'));
      return cards.map((card, i) => {
        const name = card.querySelector('.property-name')?.value || 'N/A';
        const type = card.querySelector('.property-type')?.value || 'N/A';
        const hasBtn = !!card.querySelector('.explore-btn');
        return { index: i, name, type, hasBtn };
      });
    });

    console.log('\nPropriétés après ajout:');
    newProperties.forEach(p => {
      console.log(`  [${p.index}] ${p.name} (${p.type}) - Btn: ${p.hasBtn ? '✅' : '❌'}`);
    });

    // 5. Trouver et cliquer sur le bouton Configurer de la propriété jsonschema
    console.log('\n🎯 CLIC SUR CONFIGURER JSONSCHEMA');

    const jsonschemaCard = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.property-card'));
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const name = card.querySelector('.property-name')?.value || '';
        const type = card.querySelector('.property-type')?.value || '';
        if (name.includes('test_reference_config') && type === 'jsonschema') {
          return i;
        }
      }
      return -1;
    });

    if (jsonschemaCard === -1) {
      throw new Error('Propriété jsonschema non trouvée');
    }

    console.log(`✅ Propriété jsonschema trouvée à l'index ${jsonschemaCard}`);

    // Cliquer sur le bouton Configurer de cette propriété spécifique
    const cards = await page.$$('.property-card');
    const targetCard = cards[jsonschemaCard];
    const configBtn = await targetCard.$('.explore-btn');

    if (!configBtn) {
      throw new Error('Bouton Configurer non trouvé sur la propriété jsonschema');
    }

    console.log('🎯 Clic sur bouton Configurer...');
    await configBtn.click();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Attendre plus longtemps

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-colonne-3-apres-clic.png' });

    // 6. Analyser ce qui s'est passé après le clic
    console.log('\n🔍 ANALYSE APRÈS CLIC CONFIGURER');

    const columnsAfter = await page.$$('.property-column');
    console.log(`Colonnes après clic: ${columnsAfter.length}`);

    if (columnsAfter.length > initialColumns.length) {
      console.log('✅ Nouvelle colonne créée!');

      // Analyser le contenu de la nouvelle colonne
      const lastColumn = columnsAfter[columnsAfter.length - 1];
      const columnContent = await page.evaluate(col => {
        const title = col.querySelector('h3, .column-title')?.textContent || 'Pas de titre';
        const hasReferenceElements = {
          schemaSelect: !!col.querySelector('select'),
          multipleCheckbox: !!col.querySelector('input[type="checkbox"]'),
          titleInput: !!col.querySelector('input[type="text"]'),
          backButton: !!col.querySelector('.back-btn')
        };

        return {
          title,
          hasReferenceElements,
          textContent: col.textContent.substring(0, 500)
        };
      }, lastColumn);

      console.log(`📋 Titre de la nouvelle colonne: "${columnContent.title}"`);
      console.log('🔧 Éléments de configuration:');
      Object.entries(columnContent.hasReferenceElements).forEach(([key, value]) => {
        console.log(`   ${key}: ${value ? '✅' : '❌'}`);
      });

      console.log('\n📄 Contenu textuel:');
      console.log(columnContent.textContent);

      if (columnContent.title.includes('test_reference_config') ||
          columnContent.hasReferenceElements.schemaSelect ||
          columnContent.textContent.includes('Schéma') ||
          columnContent.textContent.includes('Référence')) {
        console.log('🎉 SUCCÈS: ReferenceConfigColumn s\'affiche!');
        return { success: true, message: 'Colonne de référence ouverte correctement' };
      } else {
        console.log('❌ PROBLÈME: Ce n\'est pas ReferenceConfigColumn');
        return { success: false, message: 'Mauvaise colonne ouverte', content: columnContent };
      }
    } else {
      console.log('❌ PROBLÈME: Aucune nouvelle colonne créée');

      // Vérifier si il y a eu des erreurs console
      const logs = await page.evaluate(() => {
        return window.console?._logs || [];
      });

      if (logs.length > 0) {
        console.log('📝 Logs console:', logs);
      }

      return { success: false, message: 'Aucune colonne créée' };
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-colonne-error.png' });
    return { success: false, message: `Erreur: ${error.message}` };
  } finally {
    await browser.close();
  }
}

testOuvertureColonneReference()
  .then(result => {
    console.log('\n=== RÉSULTAT TEST COLONNE RÉFÉRENCE ===');
    console.log(`Succès: ${result.success ? '🎉' : '❌'}`);
    console.log(`Message: ${result.message}`);

    if (result.success) {
      console.log('\n🎉 LA COLONNE DE RÉFÉRENCE S\'OUVRE CORRECTEMENT!');
    } else {
      console.log('\n❌ PROBLÈME AVEC L\'OUVERTURE DE LA COLONNE DE RÉFÉRENCE');
      if (result.content) {
        console.log('Contenu détecté:', JSON.stringify(result.content, null, 2));
      }
    }
  })
  .catch(console.error);