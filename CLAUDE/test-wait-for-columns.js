#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testWaitForColumns() {
  console.log('🎯 Test avec attente des 3 colonnes');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // Activer les logs de console de la page
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔧') || text.includes('✅') || text.includes('❌') || text.includes('FORCE')) {
        console.log('PAGE LOG:', text);
      }
    });

    console.log('🌐 Navigation vers http://localhost:5503/bdd/test-user/new/');
    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 1. Naviguer vers hhh
    console.log('🔍 Étape 1: Navigation vers hhh...');
    const fieldItems = await page.$$('.field-item');
    const hhhContainer = fieldItems[6];
    const exploreButton = await hhhContainer.$('button[title="Explorer"]');
    await exploreButton.click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Ajouter un élément
    console.log('🔍 Étape 2: Ajout d\'un élément...');
    const addButton = await page.$('.entity-column:nth-child(2) .btn-primary');
    await addButton.click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Naviguer vers l'élément ajouté
    console.log('🔍 Étape 3: Navigation vers l\'élément existant...');
    const arrayItemButton = await page.$('.array-item .btn[title="Explorer cet élément"]');
    await arrayItemButton.click();

    // 4. NOUVEAU: Attendre que les 3 colonnes apparaissent réellement dans le DOM
    console.log('⏳ Attente que les 3 colonnes apparaissent dans le DOM...');

    let attempts = 0;
    let columnsFound = false;

    while (attempts < 10 && !columnsFound) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const columnsCount = await page.evaluate(() => {
        return document.querySelectorAll('.entity-column').length;
      });

      console.log(`Tentative ${attempts}: ${columnsCount} colonnes trouvées`);

      if (columnsCount >= 3) {
        columnsFound = true;
        console.log('✅ 3 colonnes détectées dans le DOM !');
      }
    }

    if (!columnsFound) {
      console.log('❌ Timeout: Les 3 colonnes ne sont jamais apparues');
      return false;
    }

    // 5. Analyser le contenu de la 3ème colonne
    const finalAnalysis = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      const thirdColumn = columns[2];

      if (!thirdColumn) {
        return { error: 'Pas de 3ème colonne trouvée' };
      }

      const objectFields = thirdColumn.querySelector('.object-fields');
      const fieldItems = objectFields ? objectFields.querySelectorAll('.field-item') : [];

      return {
        success: true,
        columnsCount: columns.length,
        thirdColumnExists: true,
        objectFieldsExists: !!objectFields,
        fieldItemsCount: fieldItems.length,
        fieldNames: Array.from(fieldItems).map(item => {
          const nameEl = item.querySelector('.field-name');
          return nameEl ? nameEl.textContent.trim() : 'NO_NAME';
        }),
        hasUserFields: Array.from(fieldItems).some(item => {
          const nameEl = item.querySelector('.field-name');
          const name = nameEl ? nameEl.textContent.trim() : '';
          return ['id', 'nom', 'email', 'age'].some(expected => name.includes(expected));
        })
      };
    });

    console.log('\n📊 RÉSULTAT FINAL:');
    console.log(JSON.stringify(finalAnalysis, null, 2));

    await page.screenshot({ path: 'CLAUDE/screenshots/test-wait-for-columns.png', fullPage: true });

    const success = !finalAnalysis.error && finalAnalysis.hasUserFields;
    console.log(success ? '\n🎉 TEST RÉUSSI - Les champs du schéma user s\'affichent !' : '\n❌ TEST ÉCHOUÉ');

    return success;

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Exécution
if (require.main === module) {
  testWaitForColumns().catch(console.error);
}