const puppeteer = require('puppeteer');

async function debugBoutonExplorer() {
  console.log('🔍 DEBUG - Recherche bouton Explorer après ajout');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔧 RENDER')) {
        console.log(`🖥️  ${text}`);
      }
    });

    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    await page.waitForSelector('.entity-column', { timeout: 5000 });

    console.log('1️⃣ Navigation vers adresse array...');
    await page.click('div[q\\:key="adresse"] .field-actions button[title="Explorer"]');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Analyser l'état AVANT ajout
    console.log('2️⃣ Analyse AVANT ajout...');
    const beforeAdd = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const arrayItems = Array.from(arrayColumn.querySelectorAll('.array-item'));

        return {
          itemsCount: arrayItems.length,
          items: arrayItems.map((item, idx) => {
            const exploreButtons = item.querySelectorAll('button[title*="Explorer"]');
            return {
              index: idx,
              hasExploreButton: exploreButtons.length > 0,
              exploreButtonsCount: exploreButtons.length,
              allButtons: Array.from(item.querySelectorAll('button')).map(btn => btn.title || btn.textContent.trim())
            };
          })
        };
      }
      return { itemsCount: 0, items: [] };
    });

    console.log('📋 AVANT AJOUT:');
    console.log(`   Éléments: ${beforeAdd.itemsCount}`);
    beforeAdd.items.forEach((item, idx) => {
      console.log(`   Item ${idx}: Explorer=${item.hasExploreButton ? '✅' : '❌'} (${item.exploreButtonsCount} boutons)`);
      console.log(`     Boutons: ${item.allButtons.join(', ')}`);
    });

    console.log('3️⃣ Ajout d\'un nouvel élément...');
    await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const addBtn = arrayColumn.querySelector('button[title*="Ajouter"]');
        if (addBtn) addBtn.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 3000)); // Attendre plus longtemps

    // Analyser l'état APRÈS ajout
    console.log('4️⃣ Analyse APRÈS ajout...');
    const afterAdd = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const arrayItems = Array.from(arrayColumn.querySelectorAll('.array-item'));

        return {
          itemsCount: arrayItems.length,
          items: arrayItems.map((item, idx) => {
            const exploreButtons = item.querySelectorAll('button[title*="Explorer"]');
            const hasTemporaryClass = item.classList.contains('temporary-item');
            return {
              index: idx,
              hasExploreButton: exploreButtons.length > 0,
              exploreButtonsCount: exploreButtons.length,
              isTemporary: hasTemporaryClass,
              allButtons: Array.from(item.querySelectorAll('button')).map(btn => ({
                title: btn.title,
                text: btn.textContent.trim(),
                classList: Array.from(btn.classList)
              })),
              itemHTML: item.innerHTML.substring(0, 200) // Premier 200 chars pour debug
            };
          })
        };
      }
      return { itemsCount: 0, items: [] };
    });

    console.log('📋 APRÈS AJOUT:');
    console.log(`   Éléments: ${afterAdd.itemsCount}`);
    afterAdd.items.forEach((item, idx) => {
      console.log(`   Item ${idx}: Explorer=${item.hasExploreButton ? '✅' : '❌'} (${item.exploreButtonsCount} boutons) Temporaire=${item.isTemporary ? '✅' : '❌'}`);
      console.log(`     Boutons:`);
      item.allButtons.forEach(btn => {
        console.log(`       - "${btn.text}" (title: "${btn.title}")`);
      });
    });

    // Test de clic spécifique sur chaque bouton Explorer
    if (afterAdd.itemsCount > 1) {
      console.log('5️⃣ Test de clic sur chaque bouton Explorer...');

      for (let i = 0; i < afterAdd.itemsCount; i++) {
        const item = afterAdd.items[i];
        if (item.hasExploreButton) {
          console.log(`   Test clic sur item ${i}...`);

          const clickResult = await page.evaluate((itemIndex) => {
            const columns = document.querySelectorAll('.entity-column');
            if (columns.length >= 2) {
              const arrayColumn = columns[1];
              const arrayItems = Array.from(arrayColumn.querySelectorAll('.array-item'));

              if (itemIndex < arrayItems.length) {
                const targetItem = arrayItems[itemIndex];
                const exploreBtn = targetItem.querySelector('button[title*="Explorer"]');

                if (exploreBtn) {
                  exploreBtn.click();
                  return { success: true, itemIndex };
                } else {
                  return { success: false, reason: 'Bouton non trouvé', itemIndex };
                }
              } else {
                return { success: false, reason: 'Item index hors limite', itemIndex };
              }
            }
            return { success: false, reason: 'Colonne non trouvée', itemIndex };
          }, i);

          console.log(`     Résultat item ${i}: ${clickResult.success ? 'SUCCÈS' : 'ÉCHEC'} ${!clickResult.success ? '(' + clickResult.reason + ')' : ''}`);

          if (clickResult.success) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const columnsAfterClick = await page.$$('.entity-column');
            console.log(`     → Colonnes après clic: ${columnsAfterClick.length}`);

            if (columnsAfterClick.length >= 3) {
              console.log(`     ✅ Navigation réussie vers niveau 3 depuis item ${i}!`);
              break; // Arrêter au premier succès
            } else {
              console.log(`     ❌ Pas de niveau 3 depuis item ${i}`);
            }
          }
        } else {
          console.log(`   Item ${i}: Pas de bouton Explorer`);
        }
      }
    }

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

debugBoutonExplorer();