#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testFinalValidation() {
  console.log('🎯 Test validation finale avec attente DOM');

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

    // Navigation vers hhh
    const fieldItems = await page.$$('.field-item');
    const hhhContainer = fieldItems[6];
    const exploreButton = await hhhContainer.$('button[title="Explorer"]');
    await exploreButton.click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Ajouter un élément
    const addButton = await page.$('.entity-column:nth-child(2) .btn-primary');
    await addButton.click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Naviguer vers l'élément
    const arrayItemButton = await page.$('.array-item .btn[title="Explorer cet élément"]');
    await arrayItemButton.click();

    // Attendre que la navigation soit complète et que les schémas soient résolus
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 secondes pour être sûr

    // Attendre spécifiquement que des champs spécifiques apparaissent
    try {
      await page.waitForSelector('.field-name', { timeout: 5000 });
      console.log('✅ Champs détectés');
    } catch (error) {
      console.log('⚠️ Pas de champs spécifiques détectés');
    }

    await page.screenshot({ path: 'CLAUDE/screenshots/test-final-validation.png', fullPage: true });

    // Analyser le contenu final
    const finalAnalysis = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');

      if (columns.length < 3) {
        return { error: `Seulement ${columns.length} colonnes trouvées` };
      }

      const thirdColumn = columns[2];
      const fieldNames = Array.from(thirdColumn.querySelectorAll('.field-name')).map(el => el.textContent.trim());
      const inputs = Array.from(thirdColumn.querySelectorAll('input')).map(input => ({
        type: input.type,
        placeholder: input.placeholder
      }));

      return {
        columnsCount: columns.length,
        thirdColumnTitle: thirdColumn.querySelector('.column-title')?.textContent?.trim(),
        fieldNames,
        inputs,
        hasUserFields: fieldNames.some(name => ['id', 'nom', 'email', 'age'].some(expected => name.includes(expected)))
      };
    });

    console.log('📊 ANALYSE FINALE:');
    console.log(JSON.stringify(finalAnalysis, null, 2));

    const success = finalAnalysis.hasUserFields && finalAnalysis.columnsCount >= 3;
    console.log(success ? '🎉 TEST RÉUSSI !' : '❌ TEST ÉCHOUÉ');

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
  testFinalValidation().catch(console.error);
}