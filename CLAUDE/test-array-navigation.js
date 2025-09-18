/**
 * TEST SPÉCIFIQUE - Navigation dans les arrays
 */

const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 TEST SPÉCIFIQUE - Navigation dans les arrays');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  // Capturer TOUS les logs
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`🖥️  ${type.toUpperCase()}: ${text}`);
  });

  try {
    await page.goto('http://localhost:5503/bdd/test-user/new', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    console.log('1️⃣ Navigation vers array "adresse"...');
    await page.evaluate(() => {
      const fieldItems = document.querySelectorAll('.field-item');
      for (let item of fieldItems) {
        const nameSpan = item.querySelector('.field-name');
        if (nameSpan && nameSpan.textContent.includes('adresse')) {
          const arrowButton = item.querySelector('button[title="Explorer"]');
          if (arrowButton) {
            console.log('Cliquant sur adresse');
            arrowButton.click();
            return;
          }
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Analyser la colonne 2 (array)
    const arrayAnalysis = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];

        // Chercher les éléments d'array
        const arrayItems = arrayColumn.querySelectorAll('.array-item');
        const addButton = arrayColumn.querySelector('button[title="Ajouter un nouvel élément"]');

        return {
          hasArrayItems: arrayItems.length > 0,
          arrayItemsCount: arrayItems.length,
          hasAddButton: !!addButton,
          columnTitle: arrayColumn.querySelector('.column-title')?.textContent || 'Sans titre'
        };
      }
      return null;
    });

    console.log('📊 ANALYSE COLONNE ARRAY:', arrayAnalysis);

    if (arrayAnalysis && !arrayAnalysis.hasArrayItems && arrayAnalysis.hasAddButton) {
      console.log('2️⃣ Array vide détecté, ajout d\'un élément...');

      await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        if (columns.length >= 2) {
          const arrayColumn = columns[1];
          const addButton = arrayColumn.querySelector('button[title="Ajouter un nouvel élément"]') ||
                           arrayColumn.querySelector('.btn-primary');
          if (addButton) {
            console.log('Cliquant sur ajouter élément');
            addButton.click();
          }
        }
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Re-analyser après ajout
      const newAnalysis = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        const result = [];

        columns.forEach((column, index) => {
          const columnInfo = {
            index,
            title: column.querySelector('.column-title')?.textContent || 'Sans titre',
            level: column.querySelector('.column-level')?.textContent || 'Niveau inconnu',
            isArray: !!column.querySelector('.array-container'),
            arrayItems: [],
            fields: []
          };

          if (columnInfo.isArray) {
            const arrayItems = column.querySelectorAll('.array-item');
            arrayItems.forEach((item, idx) => {
              const arrowBtn = item.querySelector('button[title="Explorer cet élément"]');
              const preview = item.querySelector('.array-item-preview')?.textContent || 'Pas de preview';
              columnInfo.arrayItems.push({
                index: idx,
                hasArrow: !!arrowBtn,
                preview: preview
              });
            });
          } else {
            const fieldItems = column.querySelectorAll('.field-item');
            fieldItems.forEach(item => {
              const name = item.querySelector('.field-name')?.textContent || 'Sans nom';
              const hasArrow = !!item.querySelector('button[title="Explorer"]');
              columnInfo.fields.push({ name, hasArrow });
            });
          }

          result.push(columnInfo);
        });

        return result;
      });

      console.log('\n📋 STRUCTURE APRÈS AJOUT ÉLÉMENT:');
      newAnalysis.forEach(col => {
        console.log(`   Colonne ${col.index}: ${col.title} (${col.level})`);
        if (col.isArray) {
          console.log('   Type: Array');
          col.arrayItems.forEach(item => {
            console.log(`      [${item.index}]: ${item.preview} ${item.hasArrow ? '→' : ''}`);
          });
        } else {
          col.fields.forEach(field => {
            console.log(`      • ${field.name} ${field.hasArrow ? '→' : ''}`);
          });
        }
      });

      // Tester navigation vers élément d'array
      if (newAnalysis.length >= 2 && newAnalysis[1].arrayItems.length > 0 && newAnalysis[1].arrayItems[0].hasArrow) {
        console.log('3️⃣ Navigation vers premier élément d\'array...');

        await page.evaluate(() => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 2) {
            const arrayColumn = columns[1];
            const firstArrayItem = arrayColumn.querySelector('.array-item');
            if (firstArrayItem) {
              const arrowBtn = firstArrayItem.querySelector('button[title="Explorer cet élément"]');
              if (arrowBtn) {
                console.log('Cliquant sur élément d\'array');
                arrowBtn.click();
              }
            }
          }
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Vérifier colonne 3
        const finalColumns = await page.$$('.entity-column');
        console.log(`\n✅ RÉSULTAT FINAL: ${finalColumns.length} colonnes`);

        if (finalColumns.length >= 3) {
          console.log('🎉 SUCCÈS! Navigation niveau 3 fonctionnelle!');

          // Analyser la colonne 3
          const column3Analysis = await page.evaluate(() => {
            const columns = document.querySelectorAll('.entity-column');
            if (columns.length >= 3) {
              const col3 = columns[2];
              const fields = [];
              const fieldItems = col3.querySelectorAll('.field-item');
              fieldItems.forEach(item => {
                const name = item.querySelector('.field-name')?.textContent || 'Sans nom';
                const type = item.querySelector('.field-type')?.textContent || 'Type inconnu';
                const hasArrow = !!item.querySelector('button[title="Explorer"]');
                fields.push({ name, type, hasArrow });
              });
              return {
                title: col3.querySelector('.column-title')?.textContent || 'Sans titre',
                fields
              };
            }
            return null;
          });

          if (column3Analysis) {
            console.log(`   Colonne 3: ${column3Analysis.title}`);
            column3Analysis.fields.forEach(field => {
              console.log(`      • ${field.name} (${field.type}) ${field.hasArrow ? '→' : ''}`);
            });
          }
        }
      }
    }

  } catch (error) {
    console.error('🚨 Erreur:', error);
  } finally {
    await browser.close();
  }
})();