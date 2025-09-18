const puppeteer = require('puppeteer');

async function testAjoutManuel() {
  console.log('🔍 TEST AJOUT MANUEL D\'ÉLÉMENT');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Capturer les logs de debug
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔧') || text.includes('DEBUG') || text.includes('addArrayElement')) {
        console.log(`🖥️  ${text}`);
      }
    });

    console.log('📍 Navigation vers page de création...');
    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    await page.waitForSelector('.entity-column', { timeout: 5000 });
    console.log('✅ Page chargée');

    // Étape 1: Cliquer sur → pour adresse (array)
    console.log('1️⃣ Clic sur → pour adresse (array)...');
    const adresseButton = await page.$('div[q\\:key="adresse"] .field-actions button[title="Explorer"]');
    if (adresseButton) {
      await adresseButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Vérifier qu'on a la colonne array
    let columns = await page.$$('.entity-column');
    console.log(`📊 Colonnes après navigation adresse: ${columns.length}`);

    if (columns.length >= 2) {
      console.log('2️⃣ Recherche du bouton "Ajouter un élément"...');

      // Chercher le bouton d'ajout dans la colonne array
      const addElementButton = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        if (columns.length >= 2) {
          const arrayColumn = columns[1];

          // Chercher différents sélecteurs possibles
          const buttons = [
            arrayColumn.querySelector('button[title*="Ajouter"]'),
            arrayColumn.querySelector('button:contains("Ajouter")'),
            arrayColumn.querySelector('.add-button'),
            arrayColumn.querySelector('button[title*="ajouter"]'),
            arrayColumn.querySelector('button')
          ];

          for (let btn of buttons) {
            if (btn) {
              console.log('🎯 Bouton trouvé:', btn.title || btn.textContent);
              return {
                found: true,
                title: btn.title || btn.textContent,
                classList: Array.from(btn.classList)
              };
            }
          }
        }
        return { found: false };
      });

      if (addElementButton.found) {
        console.log(`✅ Bouton d'ajout trouvé: "${addElementButton.title}"`);

        console.log('3️⃣ Clic sur le bouton d\'ajout...');
        await page.evaluate(() => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 2) {
            const arrayColumn = columns[1];
            const btn = arrayColumn.querySelector('button[title*="Ajouter"], button:contains("Ajouter"), .add-button, button[title*="ajouter"], button');
            if (btn) btn.click();
          }
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Analyser les éléments après ajout
        console.log('4️⃣ Analyse des éléments après ajout...');
        const analysisResult = await page.evaluate(() => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 2) {
            const arrayColumn = columns[1];
            const arrayItems = arrayColumn.querySelectorAll('.array-item');

            const analysis = {
              itemCount: arrayItems.length,
              items: []
            };

            arrayItems.forEach((item, idx) => {
              const itemData = {
                index: idx,
                hasExploreButton: !!item.querySelector('button[title*="Explorer"]'),
                hasProperties: [],
                rawHTML: item.innerHTML.substring(0, 200) // Premier 200 chars pour debug
              };

              // Chercher les propriétés visibles
              const fieldItems = item.querySelectorAll('.field-item');
              fieldItems.forEach(field => {
                const fieldName = field.querySelector('.field-name')?.textContent;
                const hasButton = !!field.querySelector('button[title="Explorer"]');
                if (fieldName) {
                  itemData.hasProperties.push({
                    name: fieldName,
                    navigable: hasButton
                  });
                }
              });

              analysis.items.push(itemData);
            });

            return analysis;
          }
          return { itemCount: 0, items: [] };
        });

        console.log('📋 ANALYSE DES ÉLÉMENTS:');
        console.log(`   Nombre d'éléments: ${analysisResult.itemCount}`);

        analysisResult.items.forEach((item, idx) => {
          console.log(`   Élément ${idx}:`);
          console.log(`     - Bouton Explorer: ${item.hasExploreButton ? '✅' : '❌'}`);
          console.log(`     - Propriétés: ${item.hasProperties.length}`);
          item.hasProperties.forEach(prop => {
            console.log(`       * ${prop.name}: ${prop.navigable ? '→' : '📝'}`);
          });
        });

        // Test navigation sur le nouvel élément
        if (analysisResult.itemCount > 0) {
          console.log('5️⃣ Test navigation sur nouvel élément...');

          const navigationTest = await page.evaluate(() => {
            const columns = document.querySelectorAll('.entity-column');
            if (columns.length >= 2) {
              const arrayColumn = columns[1];
              const lastItem = arrayColumn.querySelector('.array-item:last-child');
              if (lastItem) {
                const exploreBtn = lastItem.querySelector('button[title*="Explorer"]');
                if (exploreBtn) {
                  exploreBtn.click();
                  return { clicked: true, element: 'array-item' };
                }
              }
            }
            return { clicked: false };
          });

          if (navigationTest.clicked) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const finalColumns = await page.$$('.entity-column');
            console.log(`   → Colonnes après navigation: ${finalColumns.length}`);

            if (finalColumns.length >= 3) {
              console.log('✅ NAVIGATION RÉUSSIE vers niveau 3!');

              // Test navigation vers "place"
              console.log('6️⃣ Test navigation vers "place"...');
              const placeTest = await page.evaluate(() => {
                const columns = document.querySelectorAll('.entity-column');
                if (columns.length >= 3) {
                  const col3 = columns[2];
                  const placeField = col3.querySelector('div[q\\:key="place"] button[title="Explorer"]');
                  if (placeField) {
                    placeField.click();
                    return true;
                  }
                }
                return false;
              });

              if (placeTest) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const superFinalColumns = await page.$$('.entity-column');
                console.log(`   → Colonnes après "place": ${superFinalColumns.length}`);

                if (superFinalColumns.length >= 4) {
                  console.log('🎉 PARFAIT! Navigation complète fonctionne!');
                } else {
                  console.log('❌ PROBLÈME: Pas de colonne 4 après clic sur "place"');
                }
              } else {
                console.log('❌ PROBLÈME: Bouton → pour "place" non trouvé');
              }
            } else {
              console.log('❌ PROBLÈME: Pas de navigation vers niveau 3');
            }
          } else {
            console.log('❌ PROBLÈME: Impossible de cliquer sur le nouvel élément');
          }
        }

      } else {
        console.log('❌ Bouton d\'ajout non trouvé dans la colonne array');

        // Debug: montrer le contenu de la colonne array
        const columnContent = await page.evaluate(() => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 2) {
            const arrayColumn = columns[1];
            return {
              title: arrayColumn.querySelector('.column-title')?.textContent,
              content: arrayColumn.innerHTML.substring(0, 500)
            };
          }
          return null;
        });

        if (columnContent) {
          console.log('🔍 CONTENU COLONNE ARRAY:');
          console.log(`   Titre: ${columnContent.title}`);
          console.log(`   HTML: ${columnContent.content}...`);
        }
      }
    } else {
      console.log('❌ Pas de colonne array générée');
    }

    // Pause pour inspection manuelle
    console.log('⏸️ Pause pour inspection (5 secondes)...');
    await new Promise(resolve => setTimeout(resolve(5000);

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testAjoutManuel();