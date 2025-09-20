#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function debugColumnsTiming() {
  console.log('🔍 Debug du timing des colonnes');

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
      if (text.includes('🔧') || text.includes('✅') || text.includes('❌') || text.includes('CONTEXTUAL') || text.includes('FORCE')) {
        console.log('PAGE LOG:', text);
      }
    });

    console.log('🌐 Navigation vers http://localhost:5503/bdd/test-user/new/');
    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Analyser l'état initial
    let state = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      return { step: 'initial', columnsCount: columns.length };
    });
    console.log('ÉTAT INITIAL:', state);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 1. Naviguer vers hhh
    console.log('🔍 Étape 1: Navigation vers hhh...');
    const fieldItems = await page.$$('.field-item');
    const hhhContainer = fieldItems[6];
    const exploreButton = await hhhContainer.$('button[title="Explorer"]');
    await exploreButton.click();

    await new Promise(resolve => setTimeout(resolve, 2000));

    state = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      return { step: 'after_hhh_nav', columnsCount: columns.length };
    });
    console.log('APRÈS NAVIGATION HHH:', state);

    // 2. Ajouter un élément
    console.log('🔍 Étape 2: Ajout d\'un élément...');
    const addButton = await page.$('.entity-column:nth-child(2) .btn-primary');
    await addButton.click();

    await new Promise(resolve => setTimeout(resolve, 2000));

    state = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      return { step: 'after_add_element', columnsCount: columns.length };
    });
    console.log('APRÈS AJOUT ÉLÉMENT:', state);

    // 3. Naviguer vers l'élément ajouté
    console.log('🔍 Étape 3: Navigation vers l\'élément existant...');
    const arrayItemButton = await page.$('.array-item .btn[title="Explorer cet élément"]');
    await arrayItemButton.click();

    // Attendre et vérifier le nombre de colonnes plusieurs fois
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      state = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        return {
          step: `check_${i + 1}`,
          columnsCount: columns.length,
          columnsVisible: Array.from(columns).map((col, index) => ({
            index,
            hasContent: col.innerHTML.length > 100,
            title: col.querySelector('.column-title')?.textContent?.trim() || 'NO_TITLE'
          }))
        };
      });
      console.log(`VÉRIFICATION ${i + 1}:`, JSON.stringify(state, null, 2));

      if (state.columnsCount >= 3) {
        break;
      }
    }

    // Analyse finale détaillée si on a 3 colonnes
    if (state.columnsCount >= 3) {
      const finalAnalysis = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        const thirdColumn = columns[2];

        if (!thirdColumn) return { error: 'Pas de 3ème colonne' };

        const objectFields = thirdColumn.querySelector('.object-fields');
        const fieldItems = objectFields ? objectFields.querySelectorAll('.field-item') : [];

        return {
          thirdColumnExists: true,
          thirdColumnTitle: thirdColumn.querySelector('.column-title')?.textContent?.trim(),
          objectFieldsExists: !!objectFields,
          fieldItemsCount: fieldItems.length,
          fieldNames: Array.from(fieldItems).map(item => {
            const nameEl = item.querySelector('.field-name');
            return nameEl ? nameEl.textContent.trim() : 'NO_NAME';
          }),
          htmlSnippet: thirdColumn.innerHTML.slice(0, 300)
        };
      });

      console.log('\n📊 ANALYSE FINALE DE LA 3ÈME COLONNE:');
      console.log(JSON.stringify(finalAnalysis, null, 2));
    }

    await page.screenshot({ path: 'CLAUDE/screenshots/debug-columns-timing.png', fullPage: true });

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
  } finally {
    await browser.close();
  }
}

// Exécution
if (require.main === module) {
  debugColumnsTiming().catch(console.error);
}