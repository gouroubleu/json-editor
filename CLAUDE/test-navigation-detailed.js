/**
 * TEST DÉTAILLÉ - Navigation et génération automatique
 */

const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 TEST DÉTAILLÉ - Navigation et génération automatique');

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
    if (text.includes('🔧') || text.includes('🐛') || text.includes('DEBUG')) {
      console.log(`🖥️  ${type.toUpperCase()}: ${text}`);
    }
  });

  try {
    await page.goto('http://localhost:5503/bdd/test-user/new', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    console.log('📊 Analyse des colonnes et propriétés...');

    // Analyser la structure complète
    const analysis = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      const result = { columns: [] };

      columns.forEach((column, index) => {
        const columnData = {
          index,
          title: column.querySelector('.column-title')?.textContent || 'Sans titre',
          level: column.querySelector('.column-level')?.textContent || 'Niveau inconnu',
          fields: []
        };

        const fieldItems = column.querySelectorAll('.field-item');
        fieldItems.forEach(item => {
          const name = item.querySelector('.field-name')?.textContent || 'Sans nom';
          const type = item.querySelector('.field-type')?.textContent || 'Type inconnu';
          const value = item.querySelector('.value-display')?.textContent || item.querySelector('input, select, textarea')?.value || 'Valeur inconnue';
          const hasArrow = !!item.querySelector('button[title="Explorer"]');

          columnData.fields.push({ name, type, value, hasArrow });
        });

        result.columns.push(columnData);
      });

      return result;
    });

    console.log('📋 STRUCTURE INITIALE:');
    analysis.columns.forEach((col, idx) => {
      console.log(`   Colonne ${idx}: ${col.title} (${col.level})`);
      col.fields.forEach(field => {
        console.log(`      • ${field.name} (${field.type}): ${field.value} ${field.hasArrow ? '→' : ''}`);
      });
    });

    // Test navigation "adresse"
    console.log('\n🎯 TEST: Navigation vers "adresse"...');
    await page.evaluate(() => {
      const fieldItems = document.querySelectorAll('.field-item');
      for (let item of fieldItems) {
        const nameSpan = item.querySelector('.field-name');
        if (nameSpan && nameSpan.textContent.includes('adresse')) {
          const arrowButton = item.querySelector('button[title="Explorer"]');
          if (arrowButton) {
            arrowButton.click();
            return;
          }
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Nouvelle analyse après navigation
    const analysisAfter = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      const result = { columns: [] };

      columns.forEach((column, index) => {
        const columnData = {
          index,
          title: column.querySelector('.column-title')?.textContent || 'Sans titre',
          level: column.querySelector('.column-level')?.textContent || 'Niveau inconnu',
          fields: []
        };

        const fieldItems = column.querySelectorAll('.field-item');
        fieldItems.forEach(item => {
          const name = item.querySelector('.field-name')?.textContent || 'Sans nom';
          const type = item.querySelector('.field-type')?.textContent || 'Type inconnu';
          const value = item.querySelector('.value-display')?.textContent || item.querySelector('input, select, textarea')?.value || 'Valeur inconnue';
          const hasArrow = !!item.querySelector('button[title="Explorer"]');

          columnData.fields.push({ name, type, value, hasArrow });
        });

        result.columns.push(columnData);
      });

      return result;
    });

    console.log('\n📋 STRUCTURE APRÈS NAVIGATION ADRESSE:');
    analysisAfter.columns.forEach((col, idx) => {
      console.log(`   Colonne ${idx}: ${col.title} (${col.level})`);
      col.fields.forEach(field => {
        console.log(`      • ${field.name} (${field.type}): ${field.value} ${field.hasArrow ? '→' : ''}`);
      });
    });

    // Chercher une propriété navigable dans la colonne 2
    if (analysisAfter.columns.length >= 2) {
      const navigableInColumn2 = analysisAfter.columns[1].fields.find(f => f.hasArrow);
      if (navigableInColumn2) {
        console.log(`\n🎯 TEST: Navigation vers "${navigableInColumn2.name}" en colonne 2...`);

        await page.evaluate((fieldName) => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 2) {
            const column2 = columns[1];
            const fieldItems = column2.querySelectorAll('.field-item');

            for (let item of fieldItems) {
              const nameSpan = item.querySelector('.field-name');
              if (nameSpan && nameSpan.textContent.includes(fieldName)) {
                const arrowButton = item.querySelector('button[title="Explorer"]');
                if (arrowButton) {
                  arrowButton.click();
                  return;
                }
              }
            }
          }
        }, navigableInColumn2.name);

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Analyse finale
        const finalColumns = await page.$$('.entity-column');
        console.log(`\n✅ RÉSULTAT FINAL: ${finalColumns.length} colonnes générées`);

        if (finalColumns.length >= 3) {
          console.log('🎉 SUCCÈS! Navigation niveau 3+ FONCTIONNELLE!');
        } else {
          console.log('⚠️  Navigation niveau 3 en cours de développement');
        }
      } else {
        console.log('\n⚠️  Aucune propriété navigable en colonne 2');
        console.log('💡 Cela peut être normal si tous les objets sont primitifs');
      }
    }

  } catch (error) {
    console.error('🚨 Erreur:', error);
  } finally {
    await browser.close();
  }
})();