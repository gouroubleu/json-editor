const puppeteer = require('puppeteer');

async function testClicConfigurerPrecise() {
  console.log('🚀 TEST CLIC CONFIGURER JSONSCHEMA - PRÉCIS');

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

    await nameInput.type('ma_propriete_jsonschema_unique');
    await typeSelect.select('jsonschema');

    // Valider
    const submitBtn = await addForm.$('button.btn-primary');
    await submitBtn.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-precise-1-propriete-creee.png' });

    // 2. Trouver SPÉCIFIQUEMENT le bouton Configurer de la propriété jsonschema
    console.log('🎯 RECHERCHE DU BON BOUTON CONFIGURER');

    const propertyCards = await page.$$('.property-card');
    let jsonschemaButton = null;
    let jsonschemaPropertyName = '';

    for (let i = 0; i < propertyCards.length; i++) {
      const card = propertyCards[i];

      const cardInfo = await page.evaluate((cardEl) => {
        const nameEl = cardEl.querySelector('.property-name, input[value]');
        const typeEl = cardEl.querySelector('.property-type, select');
        const exploreBtn = cardEl.querySelector('.explore-btn');

        return {
          name: nameEl ? (nameEl.value || nameEl.textContent || '').trim() : 'N/A',
          type: typeEl ? (typeEl.value || typeEl.textContent || '').trim() : 'N/A',
          hasExploreBtn: !!exploreBtn
        };
      }, card);

      console.log(`[${i}] "${cardInfo.name}" (${cardInfo.type}) - Bouton: ${cardInfo.hasExploreBtn ? '✅' : '❌'}`);

      // Chercher la propriété jsonschema qu'on vient de créer
      if (cardInfo.name.includes('ma_propriete_jsonschema_unique') && cardInfo.type === 'jsonschema') {
        jsonschemaButton = await card.$('.explore-btn');
        jsonschemaPropertyName = cardInfo.name;
        console.log(`✅ PROPRIÉTÉ JSONSCHEMA TROUVÉE: "${cardInfo.name}"`);
        break;
      }
    }

    if (!jsonschemaButton) {
      console.log('❌ BOUTON CONFIGURER DE LA PROPRIÉTÉ JSONSCHEMA NON TROUVÉ');
      throw new Error('Bouton Configurer jsonschema non trouvé');
    }

    // 3. Cliquer sur le BON bouton Configurer
    console.log(`🎯 CLIC SUR BOUTON CONFIGURER DE: "${jsonschemaPropertyName}"`);
    await jsonschemaButton.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-precise-2-apres-bon-clic.png' });

    // 4. Analyser le contenu de la nouvelle colonne
    console.log('🔍 ANALYSE DU CONTENU DE LA COLONNE JSONSCHEMA');

    const columns = await page.$$('.property-column');
    console.log(`📊 Nombre de colonnes: ${columns.length}`);

    if (columns.length > 1) {
      const lastColumn = columns[columns.length - 1];

      const columnContent = await page.evaluate(col => {
        const title = col.querySelector('h3, h2, .column-title')?.textContent || 'Pas de titre';

        // Chercher spécifiquement les éléments de ReferenceConfigColumn
        const hasSchemaSelect = !!col.querySelector('select[name*="schema"], select[id*="schema"], label:contains("Schéma")');
        const hasMultipleCheckbox = !!col.querySelector('input[type="checkbox"][name*="multiple"], label:contains("Multiple")');
        const hasTitleField = !!col.querySelector('input[name*="title"], input[placeholder*="titre"]');

        // Analyser les labels et champs
        const labels = Array.from(col.querySelectorAll('label')).map(l => l.textContent?.trim() || '');
        const inputs = Array.from(col.querySelectorAll('input')).map(inp => ({
          type: inp.type,
          name: inp.name || 'N/A',
          placeholder: inp.placeholder || 'N/A'
        }));
        const selects = Array.from(col.querySelectorAll('select')).map(sel => ({
          name: sel.name || 'N/A',
          options: Array.from(sel.options).map(opt => opt.text)
        }));

        return {
          title,
          hasSchemaSelect,
          hasMultipleCheckbox,
          hasTitleField,
          labels,
          inputs,
          selects,
          textContent: col.textContent?.substring(0, 500) || ''
        };
      }, lastColumn);

      console.log('📋 CONTENU DE LA COLONNE:');
      console.log(`   Titre: "${columnContent.title}"`);
      console.log(`   A sélecteur schéma: ${columnContent.hasSchemaSelect ? '✅' : '❌'}`);
      console.log(`   A checkbox multiple: ${columnContent.hasMultipleCheckbox ? '✅' : '❌'}`);
      console.log(`   A champ titre: ${columnContent.hasTitleField ? '✅' : '❌'}`);
      console.log(`   Labels: ${columnContent.labels.join(', ')}`);
      console.log(`   Inputs (${columnContent.inputs.length}):`, columnContent.inputs);
      console.log(`   Selects (${columnContent.selects.length}):`, columnContent.selects);

      // Vérifier si c'est bien ReferenceConfigColumn
      const isReferenceConfig = columnContent.title.includes(jsonschemaPropertyName) ||
                               columnContent.labels.some(l => l.includes('Schéma') || l.includes('Référence')) ||
                               columnContent.hasSchemaSelect;

      if (isReferenceConfig) {
        console.log('✅ SUCCÈS: ReferenceConfigColumn s\'affiche correctement!');
        return { success: true, message: 'ReferenceConfigColumn affiché correctement', content: columnContent };
      } else {
        console.log('❌ PROBLÈME: Ce n\'est toujours pas ReferenceConfigColumn');
        console.log('📄 Contenu:', columnContent.textContent);
        return { success: false, message: 'Mauvaise colonne affichée', content: columnContent };
      }
    } else {
      console.log('❌ PROBLÈME: Aucune nouvelle colonne créée');
      return { success: false, message: 'Pas de nouvelle colonne' };
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-precise-error.png' });
    return { success: false, message: `Erreur: ${error.message}` };
  } finally {
    await browser.close();
  }
}

testClicConfigurerPrecise()
  .then(result => {
    console.log('\n=== RÉSULTAT FINAL ===');
    console.log(`Succès: ${result.success ? '🎉' : '❌'}`);
    console.log(`Message: ${result.message}`);

    if (result.success) {
      console.log('\n🎉 JSONSCHEMA CONFIGURER FONCTIONNE CORRECTEMENT!');
    } else {
      console.log('\n❌ PROBLÈME AVEC LA CONFIGURATION JSONSCHEMA');
    }
  })
  .catch(console.error);