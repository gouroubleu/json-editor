const puppeteer = require('puppeteer');

async function verifierBoutonExplorer() {
  console.log('🔍 VÉRIFICATION - Présence bouton Explorer sur nouveaux éléments');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    await page.goto('http://localhost:5504/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    await page.waitForSelector('.entity-column', { timeout: 5000 });

    console.log('1️⃣ Navigation vers adresse array...');
    await page.click('div[q\\:key="adresse"] .field-actions button[title="Explorer"]');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // État AVANT ajout
    console.log('2️⃣ État AVANT ajout d\'élément...');
    const avantAjout = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const items = Array.from(arrayColumn.querySelectorAll('.array-item'));

        return {
          totalItems: items.length,
          items: items.map((item, idx) => {
            const exploreBtn = item.querySelector('button[title="Explorer cet élément"]');
            const temporaryBadge = item.querySelector('.temporary-badge');

            return {
              index: idx,
              hasExploreButton: !!exploreBtn,
              isTemporary: !!temporaryBadge,
              buttonHTML: exploreBtn ? exploreBtn.outerHTML : 'N/A',
              itemClasses: Array.from(item.classList)
            };
          })
        };
      }
      return { totalItems: 0, items: [] };
    });

    console.log('📋 AVANT AJOUT:');
    console.log(`   Éléments existants: ${avantAjout.totalItems}`);
    avantAjout.items.forEach(item => {
      console.log(`   Item ${item.index}: Explorer=${item.hasExploreButton ? '✅' : '❌'} Temporaire=${item.isTemporary ? '✅' : '❌'}`);
    });

    // Ajout d'élément
    console.log('3️⃣ Ajout d\'un nouvel élément...');
    await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const addBtn = arrayColumn.querySelector('button[title*="Ajouter"]');
        if (addBtn) {
          addBtn.click();
          return true;
        }
      }
      return false;
    });

    await new Promise(resolve => setTimeout(resolve, 3000)); // Attendre plus longtemps

    // État APRÈS ajout
    console.log('4️⃣ État APRÈS ajout d\'élément...');
    const apresAjout = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const items = Array.from(arrayColumn.querySelectorAll('.array-item'));

        return {
          totalItems: items.length,
          items: items.map((item, idx) => {
            const exploreBtn = item.querySelector('button[title="Explorer cet élément"]');
            const temporaryBadge = item.querySelector('.temporary-badge');
            const allButtons = Array.from(item.querySelectorAll('button'));

            return {
              index: idx,
              hasExploreButton: !!exploreBtn,
              isTemporary: !!temporaryBadge,
              totalButtons: allButtons.length,
              buttonTitles: allButtons.map(btn => btn.title || btn.textContent.trim()),
              itemClasses: Array.from(item.classList),
              exploreButtonHTML: exploreBtn ? exploreBtn.outerHTML.substring(0, 100) + '...' : 'ABSENT'
            };
          })
        };
      }
      return { totalItems: 0, items: [] };
    });

    console.log('📋 APRÈS AJOUT:');
    console.log(`   Éléments total: ${apresAjout.totalItems}`);
    apresAjout.items.forEach(item => {
      console.log(`   Item ${item.index}: Explorer=${item.hasExploreButton ? '✅' : '❌'} Temporaire=${item.isTemporary ? '✅' : '❌'}`);
      console.log(`     Boutons (${item.totalButtons}): ${item.buttonTitles.join(', ')}`);
      if (!item.hasExploreButton) {
        console.log(`     ❌ PROBLÈME: Bouton Explorer MANQUANT!`);
      }
    });

    // Test de clic spécifique
    if (apresAjout.totalItems > avantAjout.totalItems) {
      const nouvelIndex = apresAjout.totalItems - 1;
      const nouvelItem = apresAjout.items[nouvelIndex];

      console.log(`5️⃣ Test clic sur nouvel élément (index ${nouvelIndex})...`);

      if (nouvelItem.hasExploreButton) {
        console.log(`   ✅ Bouton Explorer présent, test de clic...`);

        const clickResult = await page.evaluate((index) => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 2) {
            const arrayColumn = columns[1];
            const items = Array.from(arrayColumn.querySelectorAll('.array-item'));

            if (index < items.length) {
              const targetItem = items[index];
              const exploreBtn = targetItem.querySelector('button[title="Explorer cet élément"]');

              if (exploreBtn) {
                console.log('🎯 Clic sur bouton Explorer...');
                exploreBtn.click();
                return { success: true, message: 'Clic effectué' };
              } else {
                return { success: false, message: 'Bouton Explorer non trouvé au moment du clic' };
              }
            }
          }
          return { success: false, message: 'Élément non trouvé' };
        }, nouvelIndex);

        console.log(`   Résultat clic: ${clickResult.success ? '✅' : '❌'} ${clickResult.message}`);

        if (clickResult.success) {
          await new Promise(resolve => setTimeout(resolve, 2000));

          const colonnesApresClic = await page.$$('.entity-column');
          console.log(`   → Colonnes après clic: ${colonnesApresClic.length}`);

          if (colonnesApresClic.length >= 3) {
            console.log('   ✅ Navigation réussie vers niveau 3!');

            // Vérification finale : bouton → pour "place"
            const placeCheck = await page.evaluate(() => {
              const columns = document.querySelectorAll('.entity-column');
              if (columns.length >= 3) {
                const col3 = columns[2];
                const placeField = col3.querySelector('div[q\\:key="place"]');

                if (placeField) {
                  const placeButton = placeField.querySelector('button[title="Explorer"]');
                  return {
                    placeFieldExists: true,
                    hasPlaceButton: !!placeButton,
                    allFieldsInCol3: Array.from(col3.querySelectorAll('.field-item .field-name')).map(f => ({
                      name: f.textContent,
                      hasButton: !!f.closest('.field-item').querySelector('button[title="Explorer"]')
                    }))
                  };
                } else {
                  return {
                    placeFieldExists: false,
                    hasPlaceButton: false,
                    allFieldsInCol3: Array.from(col3.querySelectorAll('.field-item .field-name')).map(f => ({
                      name: f.textContent,
                      hasButton: !!f.closest('.field-item').querySelector('button[title="Explorer"]')
                    }))
                  };
                }
              }
              return { placeFieldExists: false, hasPlaceButton: false, allFieldsInCol3: [] };
            });

            console.log('6️⃣ Vérification propriété "place" en niveau 3:');
            console.log(`   Champ "place" trouvé: ${placeCheck.placeFieldExists ? '✅' : '❌'}`);
            console.log(`   Bouton → pour "place": ${placeCheck.hasPlaceButton ? '✅' : '❌'}`);
            console.log('   Tous les champs niveau 3:');
            placeCheck.allFieldsInCol3.forEach(field => {
              console.log(`     - ${field.name}: ${field.hasButton ? '✅→' : '❌'}`);
            });

            if (!placeCheck.hasPlaceButton) {
              console.log('   ❌ PROBLÈME CONFIRMÉ: "place" n\'a pas de bouton → sur nouvel élément!');
            }
          } else {
            console.log('   ❌ Pas de niveau 3 généré après clic');
          }
        }
      } else {
        console.log(`   ❌ PROBLÈME MAJEUR: Nouvel élément n'a PAS de bouton Explorer!`);
      }
    }

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

verifierBoutonExplorer();