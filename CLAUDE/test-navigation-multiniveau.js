const puppeteer = require('puppeteer');

async function testNavigationMultiniveau() {
  console.log('🚀 TEST NAVIGATION MULTI-NIVEAU - Jusqu\'au niveau 5+');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  try {
    console.log('📍 Navigation vers: http://localhost:5503/bdd/test-user/new');
    await page.goto('http://localhost:5503/bdd/test-user/new', { waitUntil: 'networkidle0' });

    await new Promise(resolve => setTimeout(resolve, 3000));

    let currentLevel = 1;
    let maxLevels = 5;

    console.log(`📊 Niveau ${currentLevel}: Démarrage`);

    // Navigation niveau par niveau
    for (let level = 1; level <= maxLevels; level++) {
      console.log(`\n🎯 === NIVEAU ${level} ===`);

      // Vérifier colonnes actuelles
      const columns = await page.$$('.column');
      console.log(`📊 Colonnes disponibles: ${columns.length}`);

      if (columns.length < level) {
        console.log(`❌ Pas assez de colonnes pour niveau ${level}`);
        break;
      }

      // Chercher bouton → dans la dernière colonne
      const targetColumnIndex = level - 1;
      console.log(`🔍 Recherche bouton → dans colonne ${targetColumnIndex}...`);

      const arrowButton = await page.evaluate((columnIndex) => {
        const columns = document.querySelectorAll('.column');
        if (columnIndex >= columns.length) return null;

        const targetColumn = columns[columnIndex];
        const buttons = targetColumn.querySelectorAll('button');

        for (let btn of buttons) {
          if (btn.textContent && btn.textContent.includes('→')) {
            return {
              found: true,
              text: btn.textContent,
              title: btn.getAttribute('title')
            };
          }
        }
        return { found: false };
      }, targetColumnIndex);

      if (arrowButton.found) {
        console.log(`✅ Bouton → trouvé: "${arrowButton.text}" (${arrowButton.title})`);

        // Cliquer sur le bouton
        const clickSuccess = await page.evaluate((columnIndex) => {
          const columns = document.querySelectorAll('.column');
          if (columnIndex >= columns.length) return false;

          const targetColumn = columns[columnIndex];
          const buttons = targetColumn.querySelectorAll('button');

          for (let btn of buttons) {
            if (btn.textContent && btn.textContent.includes('→')) {
              btn.click();
              return true;
            }
          }
          return false;
        }, targetColumnIndex);

        if (clickSuccess) {
          console.log(`🖱️ CLIC NIVEAU ${level} EFFECTUÉ`);

          // Attendre la nouvelle colonne
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Vérifier nouvelles colonnes
          const newColumns = await page.$$('.column');
          console.log(`📊 Nouvelles colonnes: ${newColumns.length}`);

          if (newColumns.length > columns.length) {
            console.log(`🎉 SUCCÈS NIVEAU ${level}! Colonne ${newColumns.length} générée!`);

            // Analyser contenu nouvelle colonne
            if (newColumns.length <= 5) { // Éviter de surcharger
              const newColumnContent = await page.evaluate((colIndex) => {
                const columns = document.querySelectorAll('.column');
                if (colIndex < columns.length) {
                  const content = columns[colIndex].textContent;
                  return content.slice(0, 100);
                }
                return 'N/A';
              }, newColumns.length - 1);

              console.log(`📝 Contenu colonne ${newColumns.length}: "${newColumnContent}..."`);
            }

          } else {
            console.log(`❌ ÉCHEC NIVEAU ${level}: Aucune nouvelle colonne`);
            break;
          }
        } else {
          console.log(`❌ ÉCHEC: Clic impossible niveau ${level}`);
          break;
        }
      } else {
        console.log(`❌ Aucun bouton → disponible niveau ${level}`);
        break;
      }
    }

    // Résultat final
    const finalColumns = await page.$$('.column');
    console.log(`\n🏁 RÉSULTAT FINAL: ${finalColumns.length} colonnes générées`);

    // Résumé détaillé
    console.log('\n📋 RÉSUMÉ NAVIGATION:');
    for (let i = 0; i < finalColumns.length; i++) {
      const colTitle = await page.evaluate((index) => {
        const columns = document.querySelectorAll('.column');
        if (index < columns.length) {
          const titleEl = columns[index].querySelector('.column-title');
          const levelEl = columns[index].querySelector('.column-level');
          return {
            title: titleEl ? titleEl.textContent : 'Sans titre',
            level: levelEl ? levelEl.textContent : 'Niveau ?'
          };
        }
        return { title: 'N/A', level: 'N/A' };
      }, i);

      console.log(`   Colonne ${i}: ${colTitle.title} (${colTitle.level})`);
    }

    // Screenshot final
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/navigation-multiniveau.png',
      fullPage: true
    });
    console.log('\n📸 Screenshot sauvegardé');

    // Test de validation: vérifier que la navigation suit la structure attendue
    if (finalColumns.length >= 5) {
      console.log('\n🎉 VALIDATION COMPLÈTE: Navigation niveau 5+ FONCTIONNELLE!');
    } else if (finalColumns.length >= 3) {
      console.log('\n✅ VALIDATION PARTIELLE: Navigation niveau 3+ fonctionnelle');
    } else {
      console.log('\n⚠️ VALIDATION LIMITÉE: Navigation de base seulement');
    }

  } catch (error) {
    console.error('❌ ERREUR:', error);
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/error-multiniveau.png',
      fullPage: true
    });
  }

  await browser.close();
}

// Exécuter le test
testNavigationMultiniveau().catch(console.error);