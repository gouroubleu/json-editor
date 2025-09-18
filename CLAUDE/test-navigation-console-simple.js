const puppeteer = require('puppeteer');

async function testNavigationConsoleSimple() {
  console.log('🔍 TEST NAVIGATION SIMPLE avec logs console');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Capturer les logs console importants
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔧 NAVIGATE') || text.includes('calculateColumns')) {
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
      await new Promise(resolve => setTimeout(resolve, 3000));

      let columns = await page.$$('.entity-column');
      console.log(`📊 Niveau 3: ${columns.length} colonnes`);

      if (columns.length >= 3) {
        console.log('4️⃣ Navigation vers "place"...');

        const clickResult = await page.evaluate(() => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 3) {
            const col3 = columns[2];
            const allFields = Array.from(col3.querySelectorAll('.field-item'));

            for (let field of allFields) {
              const fieldName = field.querySelector('.field-name');
              if (fieldName && fieldName.textContent.trim() === 'place') {
                const btn = field.querySelector('.field-actions button[title="Explorer"]');
                if (btn) {
                  btn.click();
                  return { success: true };
                } else {
                  return { success: false, reason: 'Pas de bouton Explorer' };
                }
              }
            }
            return { success: false, reason: 'Champ place non trouvé' };
          }
          return { success: false, reason: 'Pas assez de colonnes' };
        });

        console.log(`   Résultat clic: ${JSON.stringify(clickResult)}`);

        if (clickResult.success) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          columns = await page.$$('.entity-column');
          console.log(`📊 Après clic place: ${columns.length} colonnes`);

          if (columns.length >= 4) {
            console.log('✅ SUCCÈS! Niveau 4 atteint!');
          } else {
            console.log('❌ Toujours à 3 colonnes après clic sur place');
          }
        }
      }
    }

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testNavigationConsoleSimple();