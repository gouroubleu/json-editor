const puppeteer = require('puppeteer');

async function testDebugConsolePlace() {
  console.log('🔍 TEST DEBUG CONSOLE - Logs pour champ "place"');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Capturer tous les logs console
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('PLACE FIELD DEBUG') || text.includes('key:') || text.includes('value:') || text.includes('canExpanded:') || text.includes('🔴 CLIC FLÈCHE DEBUG') || text.includes('🔧 NAVIGATE TO PROPERTY') || text.includes('🟡 CURRENT DATA') || text.includes('🔧 calculateColumns - Génération') || text.includes('🔧 GÉNÉRATION AUTOMATIQUE') || text.includes('🔧 VALEUR GÉNÉRÉE') || text.includes('📊 generateDefaultValue')) {
        console.log('🔍 CONSOLE:', text);
      }
    });

    await page.goto('http://localhost:5504/bdd/test-user/new/', {
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

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('3️⃣ Navigation vers nouvel élément...');
    const navResult = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const items = Array.from(arrayColumn.querySelectorAll('.array-item'));

        // Chercher l'élément temporaire
        const tempItem = items.find(item => item.querySelector('.temporary-badge'));
        if (tempItem) {
          const exploreBtn = tempItem.querySelector('button[title="Explorer cet élément"]');
          if (exploreBtn) {
            exploreBtn.click();
            return { success: true };
          }
        }
      }
      return { success: false };
    });

    if (navResult.success) {
      console.log('   ✅ Navigation vers niveau 3 réussie');

      await new Promise(resolve => setTimeout(resolve, 3000)); // Attendre plus longtemps

      console.log('4️⃣ Test de clic sur bouton "place"...');

      // Tenter de cliquer sur le bouton "place"
      const clickResult = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        if (columns.length >= 3) {
          const col3 = columns[2];

          // Chercher le champ "place" et son bouton
          const placeField = col3.querySelector('.field-item .field-name')
          const allFields = Array.from(col3.querySelectorAll('.field-item'));

          for (let field of allFields) {
            const fieldName = field.querySelector('.field-name');
            if (fieldName && fieldName.textContent.trim() === 'place') {
              const btn = field.querySelector('.field-actions button[title="Explorer"]');
              if (btn) {
                console.log('🎯 CLIC sur bouton place...');
                btn.click();
                return { success: true, fieldFound: true, buttonFound: true };
              } else {
                return { success: false, fieldFound: true, buttonFound: false };
              }
            }
          }
          return { success: false, fieldFound: false, buttonFound: false };
        }
        return { success: false, error: 'Pas assez de colonnes' };
      });

      console.log(`   Résultat clic: ${JSON.stringify(clickResult)}`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Vérifier le nombre de colonnes après clic
      const finalColumns = await page.$$('.entity-column');
      console.log(`   🎉 RÉSULTAT: ${finalColumns.length} colonnes après clic sur "place"`);

      if (finalColumns.length >= 4) {
        console.log('   ✅ SUCCÈS COMPLET! Niveau 4 atteint!');

        // Vérifier le contenu de la colonne 4
        const col4Content = await page.evaluate(() => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 4) {
            const col4 = columns[3];
            return {
              title: col4.querySelector('.column-title')?.textContent,
              level: col4.querySelector('.column-level')?.textContent,
              fieldCount: col4.querySelectorAll('.field-item').length,
              fields: Array.from(col4.querySelectorAll('.field-item .field-name')).map(f => f.textContent)
            };
          }
          return null;
        });

        console.log('   📊 COLONNE 4:', JSON.stringify(col4Content, null, 2));
      }

      console.log('5️⃣ État final après navigation - Logs console collectés:');

      // Rechercher les logs PLACE FIELD DEBUG
      const placeLogs = consoleLogs.filter(log => log.includes('PLACE FIELD DEBUG'));

      console.log(`📊 Logs trouvés pour PLACE: ${placeLogs.length}`);
      placeLogs.forEach((log, idx) => {
        console.log(`   ${idx + 1}: ${log}`);
      });

      if (placeLogs.length === 0) {
        console.log('❌ PROBLÈME: Aucun log PLACE FIELD DEBUG trouvé!');
        console.log('   → Cela signifie que renderField() n\'est pas appelé pour "place"');

        // Inspecter la structure DOM niveau 3
        const col3Structure = await page.evaluate(() => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 3) {
            const col3 = columns[2];
            return {
              innerHTML: col3.innerHTML.substring(0, 500),
              fieldItems: Array.from(col3.querySelectorAll('.field-item')).map(field => ({
                qKey: field.getAttribute('q:key'),
                fieldName: field.querySelector('.field-name')?.textContent,
                hasButton: !!field.querySelector('button[title="Explorer"]'),
                fullHTML: field.outerHTML.substring(0, 200)
              }))
            };
          }
          return null;
        });

        console.log('🏗️ STRUCTURE COLONNE 3:');
        if (col3Structure) {
          console.log('   Champs trouvés:');
          col3Structure.fieldItems.forEach(field => {
            console.log(`     - ${field.fieldName} (q:key="${field.qKey}") → ${field.hasButton ? '✅' : '❌'}`);
          });
        }
      }

    } else {
      console.log('❌ Navigation vers niveau 3 échouée');
    }

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testDebugConsolePlace();