const puppeteer = require('puppeteer');

async function testNavigationCompleteManuel() {
  console.log('🔍 TEST NAVIGATION COMPLÈTE - Élément ajouté manuellement');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔧') || text.includes('DEBUG') || text.includes('navigateToProperty')) {
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
        if (addBtn) {
          console.log('🎯 Bouton ajouter trouvé, clic...');
          addBtn.click();
        } else {
          console.log('❌ Bouton ajouter non trouvé');
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('3️⃣ Navigation vers le nouvel élément...');
    const navToNewElement = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const lastItem = arrayColumn.querySelector('.array-item:last-child button[title*="Explorer"]');
        if (lastItem) {
          console.log('🎯 Nouvel élément trouvé, navigation...');
          lastItem.click();
          return true;
        } else {
          console.log('❌ Nouvel élément sans bouton Explorer');
          return false;
        }
      }
      return false;
    });

    if (!navToNewElement) {
      console.log('❌ Impossible de naviguer vers le nouvel élément');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    let columns = await page.$$('.entity-column');
    console.log(`📊 Colonnes après navigation vers nouvel élément: ${columns.length}`);

    if (columns.length >= 3) {
      console.log('✅ Niveau 3 atteint! Analyse des propriétés...');

      const level3Analysis = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        if (columns.length >= 3) {
          const col3 = columns[2];
          const title = col3.querySelector('.column-title')?.textContent;

          const fields = Array.from(col3.querySelectorAll('.field-item')).map(field => {
            const name = field.querySelector('.field-name')?.textContent;
            const type = field.querySelector('.field-type')?.textContent;
            const hasButton = !!field.querySelector('button[title="Explorer"]');

            return { name, type, hasButton };
          });

          return { title, fields };
        }
        return null;
      });

      console.log(`📋 NIVEAU 3: ${level3Analysis.title}`);
      level3Analysis.fields.forEach(field => {
        const button = field.hasButton ? '✅→' : '❌';
        console.log(`  ${button} ${field.name} (${field.type})`);
      });

      // Test navigation vers "place"
      const placeField = level3Analysis.fields.find(f => f.name === 'place');
      if (placeField && placeField.hasButton) {
        console.log('4️⃣ Navigation vers "place"...');

        const navToPlace = await page.evaluate(() => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 3) {
            const col3 = columns[2];
            const placeBtn = col3.querySelector('div[q\\:key="place"] button[title="Explorer"]');
            if (placeBtn) {
              console.log('🎯 Bouton place trouvé, clic...');
              placeBtn.click();
              return true;
            } else {
              console.log('❌ Bouton place non trouvé');
              return false;
            }
          }
          return false;
        });

        if (navToPlace) {
          await new Promise(resolve => setTimeout(resolve, 2000));

          columns = await page.$$('.entity-column');
          console.log(`📊 Colonnes après navigation vers "place": ${columns.length}`);

          if (columns.length >= 4) {
            console.log('✅ NIVEAU 4 ATTEINT! Analyse...');

            const level4Analysis = await page.evaluate(() => {
              const columns = document.querySelectorAll('.entity-column');
              if (columns.length >= 4) {
                const col4 = columns[3];
                const title = col4.querySelector('.column-title')?.textContent;

                const fields = Array.from(col4.querySelectorAll('.field-item')).map(field => {
                  const name = field.querySelector('.field-name')?.textContent;
                  const type = field.querySelector('.field-type')?.textContent;
                  const hasButton = !!field.querySelector('button[title="Explorer"]');

                  return { name, type, hasButton };
                });

                return { title, fields };
              }
              return null;
            });

            console.log(`📋 NIVEAU 4: ${level4Analysis.title}`);
            level4Analysis.fields.forEach(field => {
              const button = field.hasButton ? '✅→' : '❌';
              console.log(`  ${button} ${field.name} (${field.type})`);
            });

            // Test navigation vers "test"
            const testField = level4Analysis.fields.find(f => f.name === 'test');
            if (testField && testField.hasButton) {
              console.log('5️⃣ Navigation vers "test"...');

              const navToTest = await page.evaluate(() => {
                const columns = document.querySelectorAll('.entity-column');
                if (columns.length >= 4) {
                  const col4 = columns[3];
                  const testBtn = col4.querySelector('div[q\\:key="test"] button[title="Explorer"]');
                  if (testBtn) {
                    console.log('🎯 Bouton test trouvé, clic...');
                    testBtn.click();
                    return true;
                  } else {
                    console.log('❌ Bouton test non trouvé');
                    return false;
                  }
                }
                return false;
              });

              if (navToTest) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                const finalColumns = await page.$$('.entity-column');
                console.log(`📊 Colonnes finales: ${finalColumns.length}`);

                if (finalColumns.length >= 5) {
                  console.log('🎉 SUCCÈS TOTAL! Navigation niveau 5 sur élément ajouté manuellement!');

                  const finalAnalysis = await page.evaluate(() => {
                    const columns = document.querySelectorAll('.entity-column');
                    return Array.from(columns).map((col, idx) => ({
                      index: idx,
                      title: col.querySelector('.column-title')?.textContent,
                      level: col.querySelector('.column-level')?.textContent
                    }));
                  });

                  console.log('\n📊 STRUCTURE FINALE COMPLÈTE:');
                  finalAnalysis.forEach(col => {
                    console.log(`   Colonne ${col.index}: ${col.title} (${col.level})`);
                  });

                } else {
                  console.log('❌ PROBLÈME: Pas de niveau 5 après navigation "test"');
                }
              } else {
                console.log('❌ PROBLÈME: Impossible de cliquer sur "test"');
              }
            } else {
              console.log('❌ PROBLÈME: Champ "test" sans bouton → ou absent');
            }
          } else {
            console.log('❌ PROBLÈME: Pas de niveau 4 après navigation "place"');
          }
        } else {
          console.log('❌ PROBLÈME: Impossible de cliquer sur "place"');
        }
      } else {
        console.log('❌ PROBLÈME: Champ "place" sans bouton → ou absent');
      }
    } else {
      console.log('❌ PROBLÈME: Pas de niveau 3 après navigation vers nouvel élément');
    }

    // Test de comparaison avec élément existant
    console.log('\n6️⃣ COMPARAISON avec élément existant...');
    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'networkidle0'
    });

    await page.click('div[q\\:key="adresse"] .field-actions button[title="Explorer"]');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Navigation vers PREMIER élément (existant)
    await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const firstItem = arrayColumn.querySelector('.array-item:first-child button[title*="Explorer"]');
        if (firstItem) firstItem.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test navigation place sur élément existant
    await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 3) {
        const col3 = columns[2];
        const placeBtn = col3.querySelector('div[q\\:key="place"] button[title="Explorer"]');
        if (placeBtn) placeBtn.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const comparisonColumns = await page.$$('.entity-column');
    console.log(`📊 Colonnes avec élément EXISTANT: ${comparisonColumns.length}`);

    if (comparisonColumns.length >= 4) {
      console.log('✅ Navigation "place" fonctionne sur élément EXISTANT');
    } else {
      console.log('❌ Navigation "place" ne fonctionne PAS sur élément EXISTANT non plus!');
    }

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testNavigationCompleteManuel();