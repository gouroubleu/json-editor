const puppeteer = require('puppeteer');

async function testAjoutManuel() {
  console.log('🔍 TEST AJOUT MANUEL - Version simple');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔧') || text.includes('DEBUG') || text.includes('addArrayElement')) {
        console.log(`🖥️  ${text}`);
      }
    });

    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    await page.waitForSelector('.entity-column', { timeout: 5000 });
    console.log('✅ Page chargée');

    // Étape 1: Cliquer sur → pour adresse
    console.log('1️⃣ Navigation vers adresse array...');
    await page.click('div[q\\:key="adresse"] .field-actions button[title="Explorer"]');
    await new Promise(resolve => setTimeout(resolve, 2000));

    let columns = await page.$$('.entity-column');
    console.log(`📊 Colonnes après navigation: ${columns.length}`);

    if (columns.length >= 2) {
      // Analyser le contenu de la colonne array
      console.log('2️⃣ Analyse du contenu de la colonne array...');

      const arrayAnalysis = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        if (columns.length >= 2) {
          const arrayColumn = columns[1];

          return {
            title: arrayColumn.querySelector('.column-title')?.textContent,
            hasAddButton: !!arrayColumn.querySelector('button[title*="Ajouter"], .add-button'),
            arrayItems: arrayColumn.querySelectorAll('.array-item').length,
            buttons: Array.from(arrayColumn.querySelectorAll('button')).map(btn => ({
              title: btn.title,
              text: btn.textContent.trim(),
              classList: Array.from(btn.classList)
            }))
          };
        }
        return null;
      });

      console.log('📋 ANALYSE COLONNE ARRAY:');
      console.log(`   Titre: ${arrayAnalysis.title}`);
      console.log(`   Éléments existants: ${arrayAnalysis.arrayItems}`);
      console.log(`   Bouton d'ajout trouvé: ${arrayAnalysis.hasAddButton ? '✅' : '❌'}`);
      console.log(`   Boutons disponibles: ${arrayAnalysis.buttons.length}`);

      arrayAnalysis.buttons.forEach((btn, idx) => {
        console.log(`     ${idx + 1}. "${btn.text}" (${btn.title})`);
      });

      // Test navigation sur élément existant pour comparaison
      console.log('3️⃣ Test navigation élément existant...');
      const existingNavTest = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        if (columns.length >= 2) {
          const arrayColumn = columns[1];
          const firstItem = arrayColumn.querySelector('.array-item button[title*="Explorer"]');
          if (firstItem) {
            firstItem.click();
            return { success: true, itemType: 'existing' };
          }
        }
        return { success: false };
      });

      if (existingNavTest.success) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        columns = await page.$$('.entity-column');
        console.log(`   → Navigation existant OK: ${columns.length} colonnes`);

        if (columns.length >= 3) {
          // Tester la navigation vers "place" sur élément existant
          console.log('4️⃣ Test navigation "place" sur élément existant...');
          const placeNavExisting = await page.evaluate(() => {
            const columns = document.querySelectorAll('.entity-column');
            if (columns.length >= 3) {
              const col3 = columns[2];
              const placeField = col3.querySelector('div[q\\:key="place"] button[title="Explorer"]');
              if (placeField) {
                placeField.click();
                return { clicked: true, hasPlaceButton: true };
              } else {
                return {
                  clicked: false,
                  hasPlaceButton: false,
                  fields: Array.from(col3.querySelectorAll('.field-item .field-name')).map(f => f.textContent)
                };
              }
            }
            return { clicked: false };
          });

          console.log(`   Bouton place trouvé: ${placeNavExisting.hasPlaceButton ? '✅' : '❌'}`);

          if (placeNavExisting.hasPlaceButton) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const finalColumns = await page.$$('.entity-column');
            console.log(`   → Navigation "place" OK: ${finalColumns.length} colonnes`);
            console.log('✅ NAVIGATION EXISTANTE FONCTIONNE!');
          } else {
            console.log('❌ Problème: Pas de bouton → pour "place" sur élément existant');
            console.log(`   Champs trouvés: ${placeNavExisting.fields?.join(', ')}`);
          }

          // Maintenant revenir et tester l'ajout manuel
          console.log('5️⃣ Retour pour test ajout manuel...');
          await page.goto('http://localhost:5503/bdd/test-user/new/', {
            waitUntil: 'networkidle0'
          });

          await page.click('div[q\\:key="adresse"] .field-actions button[title="Explorer"]');
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Chercher et cliquer bouton d'ajout
          const addResult = await page.evaluate(() => {
            const columns = document.querySelectorAll('.entity-column');
            if (columns.length >= 2) {
              const arrayColumn = columns[1];

              // Chercher tous les boutons possibles
              const addButtons = [
                arrayColumn.querySelector('button[title*="Ajouter"]'),
                arrayColumn.querySelector('button:contains("Ajouter")'),
                arrayColumn.querySelector('.add-button'),
                arrayColumn.querySelector('.array-add-button')
              ];

              for (let btn of addButtons) {
                if (btn) {
                  btn.click();
                  return { clicked: true, buttonText: btn.textContent.trim() };
                }
              }

              // Si pas trouvé, chercher dans tout le HTML
              const allButtons = arrayColumn.querySelectorAll('button');
              for (let btn of allButtons) {
                const text = btn.textContent.toLowerCase();
                if (text.includes('ajouter') || text.includes('add') || text.includes('+')) {
                  btn.click();
                  return { clicked: true, buttonText: btn.textContent.trim() };
                }
              }
            }
            return { clicked: false };
          });

          if (addResult.clicked) {
            console.log(`6️⃣ Élément ajouté via: "${addResult.buttonText}"`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Analyser les éléments après ajout
            const postAddAnalysis = await page.evaluate(() => {
              const columns = document.querySelectorAll('.entity-column');
              if (columns.length >= 2) {
                const arrayColumn = columns[1];
                const arrayItems = arrayColumn.querySelectorAll('.array-item');

                return {
                  totalItems: arrayItems.length,
                  lastItem: arrayItems.length > 0 ? {
                    hasExploreButton: !!arrayItems[arrayItems.length - 1].querySelector('button[title*="Explorer"]'),
                    properties: Array.from(arrayItems[arrayItems.length - 1].querySelectorAll('.field-item .field-name')).map(f => f.textContent)
                  } : null
                };
              }
              return { totalItems: 0 };
            });

            console.log(`   Total éléments après ajout: ${postAddAnalysis.totalItems}`);

            if (postAddAnalysis.lastItem) {
              console.log(`   Dernier élément - bouton Explorer: ${postAddAnalysis.lastItem.hasExploreButton ? '✅' : '❌'}`);
              console.log(`   Propriétés: ${postAddAnalysis.lastItem.properties.join(', ')}`);

              if (postAddAnalysis.lastItem.hasExploreButton) {
                console.log('7️⃣ Test navigation sur nouvel élément...');
                const newNavTest = await page.evaluate(() => {
                  const columns = document.querySelectorAll('.entity-column');
                  if (columns.length >= 2) {
                    const arrayColumn = columns[1];
                    const lastItem = arrayColumn.querySelector('.array-item:last-child button[title*="Explorer"]');
                    if (lastItem) {
                      lastItem.click();
                      return true;
                    }
                  }
                  return false;
                });

                if (newNavTest) {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  const newColumns = await page.$$('.entity-column');
                  console.log(`   → Navigation nouvel élément: ${newColumns.length} colonnes`);

                  if (newColumns.length >= 3) {
                    console.log('✅ NAVIGATION NOUVEL ÉLÉMENT FONCTIONNE!');

                    // Test final: navigation vers "place" sur nouvel élément
                    const newPlaceTest = await page.evaluate(() => {
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

                    if (newPlaceTest) {
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      const ultimateColumns = await page.$$('.entity-column');
                      console.log(`   → Navigation "place" nouvel élément: ${ultimateColumns.length} colonnes`);

                      if (ultimateColumns.length >= 4) {
                        console.log('🎉 SUCCÈS TOTAL! Navigation complète fonctionne sur nouveaux éléments!');
                      } else {
                        console.log('❌ PROBLÈME: Pas de colonne 4 pour "place" sur nouvel élément');
                      }
                    } else {
                      console.log('❌ PROBLÈME: Pas de bouton → pour "place" sur nouvel élément');
                    }
                  } else {
                    console.log('❌ PROBLÈME: Navigation nouvel élément ne génère pas niveau 3');
                  }
                } else {
                  console.log('❌ PROBLÈME: Impossible de cliquer sur le nouvel élément');
                }
              } else {
                console.log('❌ PROBLÈME: Nouvel élément n\'a pas de bouton Explorer');
              }
            }
          } else {
            console.log('❌ PROBLÈME: Bouton d\'ajout non trouvé');
          }
        }
      } else {
        console.log('❌ Navigation élément existant échouée');
      }
    } else {
      console.log('❌ Pas de colonne array générée');
    }

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testAjoutManuel();