const puppeteer = require('puppeteer');

async function testNavigationCompleteFinale() {
  console.log('🎯 TEST FINAL - Navigation complète niveau 5 sur NOUVEL élément');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

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

    console.log('3️⃣ Navigation vers NOUVEL élément (temporaire)...');
    const navElement = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const items = Array.from(arrayColumn.querySelectorAll('.array-item'));

        // Chercher l'élément temporaire (dernier ajouté)
        const tempItem = items.find(item => item.querySelector('.temporary-badge'));
        if (tempItem) {
          const exploreBtn = tempItem.querySelector('button[title="Explorer cet élément"]');
          if (exploreBtn) {
            exploreBtn.click();
            return { success: true, isTemporary: true };
          }
        }
      }
      return { success: false };
    });

    if (!navElement.success) {
      console.log('❌ Impossible de naviguer vers le nouvel élément');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    let columns = await page.$$('.entity-column');
    console.log(`📊 Niveau 3 atteint: ${columns.length} colonnes`);

    if (columns.length >= 3) {
      console.log('4️⃣ Navigation vers "place" (niveau 4)...');

      const placeNav = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        if (columns.length >= 3) {
          const col3 = columns[2];

          // Chercher le champ "place" de plusieurs façons
          let placeButton = null;

          // Méthode 1: par q:key
          const placeFieldByKey = col3.querySelector('div[q\\:key="place"] button[title="Explorer"]');
          if (placeFieldByKey) {
            placeButton = placeFieldByKey;
          } else {
            // Méthode 2: chercher par nom de champ
            const fieldItems = col3.querySelectorAll('.field-item');
            for (let field of fieldItems) {
              const fieldName = field.querySelector('.field-name');
              if (fieldName && fieldName.textContent.trim() === 'place') {
                const btn = field.querySelector('button[title="Explorer"]');
                if (btn) {
                  placeButton = btn;
                  break;
                }
              }
            }
          }

          if (placeButton) {
            console.log('🎯 Bouton "place" trouvé, clic...');
            placeButton.click();
            return { success: true, method: placeFieldByKey ? 'q:key' : 'field-name' };
          } else {
            // Debug: lister tous les champs
            const allFields = Array.from(col3.querySelectorAll('.field-item')).map(field => {
              const name = field.querySelector('.field-name')?.textContent || 'UNKNOWN';
              const hasBtn = !!field.querySelector('button[title="Explorer"]');
              return { name, hasBtn };
            });

            return {
              success: false,
              availableFields: allFields,
              placeFieldByKeyExists: !!placeFieldByKey,
              col3HTML: col3.innerHTML.substring(0, 200)
            };
          }
        }
        return { success: false };
      });

      if (placeNav.success) {
        console.log(`   ✅ Navigation "place" réussie (méthode: ${placeNav.method})`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        columns = await page.$$('.entity-column');
        console.log(`📊 Niveau 4 atteint: ${columns.length} colonnes`);

        if (columns.length >= 4) {
          console.log('5️⃣ Navigation vers "test" (niveau 5)...');

          const testNav = await page.evaluate(() => {
            const columns = document.querySelectorAll('.entity-column');
            if (columns.length >= 4) {
              const col4 = columns[3];

              // Chercher le champ "test"
              const fieldItems = col4.querySelectorAll('.field-item');
              for (let field of fieldItems) {
                const fieldName = field.querySelector('.field-name');
                if (fieldName && fieldName.textContent.trim() === 'test') {
                  const btn = field.querySelector('button[title="Explorer"]');
                  if (btn) {
                    console.log('🎯 Bouton "test" trouvé, clic...');
                    btn.click();
                    return { success: true };
                  }
                }
              }

              return {
                success: false,
                availableFields: Array.from(col4.querySelectorAll('.field-item .field-name')).map(f => f.textContent)
              };
            }
            return { success: false };
          });

          if (testNav.success) {
            console.log('   ✅ Navigation "test" réussie');

            await new Promise(resolve => setTimeout(resolve, 2000));

            const finalColumns = await page.$$('.entity-column');
            console.log(`📊 Niveau 5 atteint: ${finalColumns.length} colonnes`);

            if (finalColumns.length >= 5) {
              console.log('🎉 SUCCÈS COMPLET! Navigation niveau 5 sur nouvel élément!');

              // Structure finale
              const structure = await page.evaluate(() => {
                const columns = document.querySelectorAll('.entity-column');
                return Array.from(columns).map((col, idx) => ({
                  index: idx,
                  title: col.querySelector('.column-title')?.textContent,
                  level: col.querySelector('.column-level')?.textContent
                }));
              });

              console.log('\n📊 STRUCTURE FINALE:');
              structure.forEach(col => {
                console.log(`   Colonne ${col.index}: ${col.title} (${col.level})`);
              });

              console.log('\n✅ CONCLUSION: La navigation fonctionne PARFAITEMENT sur les nouveaux éléments!');
              console.log('✅ Le problème a été RÉSOLU!');

            } else {
              console.log('❌ Pas de niveau 5 atteint');
            }
          } else {
            console.log('❌ Navigation "test" échouée');
            console.log(`   Champs disponibles niveau 4: ${testNav.availableFields?.join(', ')}`);
          }
        } else {
          console.log('❌ Pas de niveau 4 atteint');
        }
      } else {
        console.log('❌ Navigation "place" échouée');
        console.log(`   Champs disponibles: ${placeNav.availableFields?.map(f => `${f.name}(${f.hasBtn ? '→' : '✗'})`).join(', ')}`);
        console.log(`   placeFieldByKey existe: ${placeNav.placeFieldByKeyExists}`);
      }
    } else {
      console.log('❌ Pas de niveau 3 atteint');
    }

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testNavigationCompleteFinale();