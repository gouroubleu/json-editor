/**
 * TEST FINAL - Validation navigation complète niveau 3+
 */

const puppeteer = require('puppeteer');

(async () => {
  console.log('🎯 TEST FINAL - Navigation complète');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🔧') || text.includes('DEBUG navigateToProperty')) {
      console.log(`🖥️  ${msg.type().toUpperCase()}: ${text}`);
    }
  });

  try {
    await page.goto('http://localhost:5503/bdd/test-user/new', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    console.log('1️⃣ Navigation vers "adresse" (array)...');
    await page.click('button[title="Explorer"]'); // Premier bouton explorer
    await new Promise(resolve => setTimeout(resolve, 1500));

    let columns = await page.$$('.entity-column');
    console.log(`   → Colonnes après niveau 1: ${columns.length}`);

    console.log('2️⃣ Navigation vers premier élément d\'array...');
    await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const firstArrayItem = arrayColumn.querySelector('.array-item button[title="Explorer cet élément"]');
        if (firstArrayItem) {
          firstArrayItem.click();
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    columns = await page.$$('.entity-column');
    console.log(`   → Colonnes après niveau 2: ${columns.length}`);

    if (columns.length >= 3) {
      console.log('3️⃣ Recherche propriété navigable niveau 3...');

      const level3Navigation = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        if (columns.length >= 3) {
          const col3 = columns[2];
          const navigableField = col3.querySelector('.field-item button[title="Explorer"]');

          if (navigableField) {
            const fieldName = col3.querySelector('.field-name').textContent;
            navigableField.click();
            return fieldName;
          }
        }
        return null;
      });

      if (level3Navigation) {
        console.log(`   → Navigation vers "${level3Navigation}" niveau 3...`);
        await new Promise(resolve => setTimeout(resolve, 1500));

        columns = await page.$$('.entity-column');
        console.log(`   → Colonnes après niveau 3: ${columns.length}`);

        if (columns.length >= 4) {
          console.log('4️⃣ Test navigation niveau 4...');

          const level4Test = await page.evaluate(() => {
            const columns = document.querySelectorAll('.entity-column');
            if (columns.length >= 4) {
              const col4 = columns[3];
              // Chercher bouton "test" spécifiquement
              const fieldItems = col4.querySelectorAll('.field-item');
              for (let item of fieldItems) {
                const nameSpan = item.querySelector('.field-name');
                if (nameSpan && nameSpan.textContent.includes('test')) {
                  const arrowBtn = item.querySelector('button[title="Explorer"]');
                  if (arrowBtn) {
                    arrowBtn.click();
                    return 'test';
                  }
                }
              }
            }
            return null;
          });

          if (level4Test) {
            console.log(`   → Navigation vers "${level4Test}" niveau 4...`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const finalColumns = await page.$$('.entity-column');
            console.log(`   → Colonnes finales: ${finalColumns.length}`);

            // Analyse finale complète
            const finalAnalysis = await page.evaluate(() => {
              const columns = document.querySelectorAll('.entity-column');
              const analysis = [];

              columns.forEach((col, idx) => {
                const title = col.querySelector('.column-title')?.textContent || 'Sans titre';
                const level = col.querySelector('.column-level')?.textContent || 'Niveau ?';

                analysis.push({
                  index: idx,
                  title: title,
                  level: level
                });
              });

              return analysis;
            });

            console.log('\n📊 STRUCTURE FINALE COMPLÈTE:');
            finalAnalysis.forEach(col => {
              console.log(`   Colonne ${col.index}: ${col.title} (${col.level})`);
            });

            if (finalColumns.length >= 5) {
              console.log('\n🎉🎉 EXCELLENT! Navigation jusqu\'au niveau 5+ !');
            } else if (finalColumns.length >= 4) {
              console.log('\n✅✅ TRÈS BIEN! Navigation jusqu\'au niveau 4 !');
            }
          }
        }
      }
    }

    console.log(`\n📋 RÉSULTAT FINAL: ${columns.length} colonnes générées`);
    console.log(`✅ Navigation multi-niveau: ${columns.length >= 3 ? 'RÉUSSIE' : 'LIMITÉE'}`);

  } catch (error) {
    console.error('🚨 Erreur:', error.message);
  } finally {
    await browser.close();
  }
})();