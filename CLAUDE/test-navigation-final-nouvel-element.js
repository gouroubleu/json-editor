const puppeteer = require('puppeteer');

async function testNavigationFinalNouvelElement() {
  console.log('🔍 TEST FINAL - Navigation complète sur NOUVEL élément');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DEBUG navigateToProperty') || text.includes('🔧 navigateToProperty')) {
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

    console.log('2️⃣ Ajout d\'un nouvel élément...');
    await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const addBtn = arrayColumn.querySelector('button[title*="Ajouter"]');
        if (addBtn) addBtn.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('3️⃣ Navigation vers le NOUVEL élément (index 1)...');
    const navToNewElement = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const arrayItems = Array.from(arrayColumn.querySelectorAll('.array-item'));

        // Chercher spécifiquement l'élément temporaire (index 1)
        if (arrayItems.length >= 2) {
          const newItem = arrayItems[1]; // Le nouveau = index 1
          const exploreBtn = newItem.querySelector('button[title="Explorer cet élément"]');

          if (exploreBtn) {
            console.log('🎯 Clic sur nouvel élément (index 1)...');
            exploreBtn.click();
            return { success: true, index: 1 };
          }
        }
      }
      return { success: false };
    });

    if (!navToNewElement.success) {
      console.log('❌ Impossible de naviguer vers le nouvel élément');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    let columns = await page.$$('.entity-column');
    console.log(`📊 Colonnes après navigation nouvel élément: ${columns.length}`);

    if (columns.length >= 3) {
      console.log('✅ NIVEAU 3 avec nouvel élément! Test navigation "place"...');

      const placeNavigation = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        if (columns.length >= 3) {
          const col3 = columns[2];
          const placeBtn = col3.querySelector('div[q\\:key="place"] button[title="Explorer"]');

          if (placeBtn) {
            console.log('🎯 Clic sur "place" dans nouvel élément...');
            placeBtn.click();
            return true;
          } else {
            // Debug: quels champs sont disponibles ?
            const availableFields = Array.from(col3.querySelectorAll('.field-item .field-name')).map(f => f.textContent);
            console.log('🔍 Champs disponibles:', availableFields);
            return false;
          }
        }
        return false;
      });

      if (placeNavigation) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        columns = await page.$$('.entity-column');
        console.log(`📊 Colonnes après navigation "place": ${columns.length}`);

        if (columns.length >= 4) {
          console.log('✅ NIVEAU 4 avec "place"! Test navigation "test"...');

          const testNavigation = await page.evaluate(() => {
            const columns = document.querySelectorAll('.entity-column');
            if (columns.length >= 4) {
              const col4 = columns[3];
              const testBtn = col4.querySelector('div[q\\:key="test"] button[title="Explorer"]');

              if (testBtn) {
                console.log('🎯 Clic sur "test" dans place...');
                testBtn.click();
                return true;
              } else {
                const availableFields = Array.from(col4.querySelectorAll('.field-item .field-name')).map(f => f.textContent);
                console.log('🔍 Champs niveau 4:', availableFields);
                return false;
              }
            }
            return false;
          });

          if (testNavigation) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const finalColumns = await page.$$('.entity-column');
            console.log(`📊 Colonnes finales: ${finalColumns.length}`);

            if (finalColumns.length >= 5) {
              console.log('🎉 SUCCÈS COMPLET! Navigation niveau 5 sur NOUVEL élément!');

              // Analyse finale
              const finalStructure = await page.evaluate(() => {
                const columns = document.querySelectorAll('.entity-column');
                return Array.from(columns).map((col, idx) => ({
                  index: idx,
                  title: col.querySelector('.column-title')?.textContent,
                  level: col.querySelector('.column-level')?.textContent
                }));
              });

              console.log('\n📊 STRUCTURE FINALE AVEC NOUVEL ÉLÉMENT:');
              finalStructure.forEach(col => {
                console.log(`   Colonne ${col.index}: ${col.title} (${col.level})`);
              });

              console.log('\n✅ CONFIRMATION: La navigation fonctionne PARFAITEMENT sur les éléments ajoutés manuellement!');

            } else {
              console.log('❌ Pas de niveau 5 après "test"');
            }
          } else {
            console.log('❌ Navigation "test" échouée');
          }
        } else {
          console.log('❌ Pas de niveau 4 après "place"');
        }
      } else {
        console.log('❌ Navigation "place" échouée');
      }
    } else {
      console.log('❌ Pas de niveau 3 avec nouvel élément');
    }

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testNavigationFinalNouvelElement();