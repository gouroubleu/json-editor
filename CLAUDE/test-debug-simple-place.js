const puppeteer = require('puppeteer');

async function testDebugSimplePlace() {
  console.log('🔍 TEST DEBUG SIMPLE - Logs complets pour "place"');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Capturer TOUS les logs console
    const allLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push(text);

      // Imprimer en temps réel les logs qui contiennent des mots-clés importants
      if (text.includes('place') || text.includes('PLACE') || text.includes('generateDefaultValue') || text.includes('GÉNÉRATION') || text.includes('VALEUR GÉNÉRÉE') || text.includes('KEY=') || text.includes('TYPE:') || text.includes('JSON:') || text.includes('SCHEMA TYPE:') || text.includes('HAS PROPERTIES:') || text.includes('TYPE NON RECONNU') || text.includes('📊 OBJECT') || text.includes('📊 SWITCH')) {
        console.log('🔍 LOG TEMPS RÉEL:', text);
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

      console.log('4️⃣ Test de clic sur bouton "place"...');
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
              }
            }
          }
        }
        return { success: false };
      });

      console.log(`   Résultat clic: ${JSON.stringify(clickResult)}`);

      await new Promise(resolve => setTimeout(resolve, 3000));

      const finalColumns = await page.$$('.entity-column');
      console.log(`   🎯 FINAL: ${finalColumns.length} colonnes`);

      // Montrer TOUS les logs qui contiennent 'place' ou 'generateDefaultValue'
      console.log('\n📋 TOUS LES LOGS PERTINENTS:');
      const relevantLogs = allLogs.filter(log =>
        log.includes('place') ||
        log.includes('PLACE') ||
        log.includes('generateDefaultValue') ||
        log.includes('GÉNÉRATION') ||
        log.includes('VALEUR GÉNÉRÉE') ||
        log.includes('📊') ||
        log.includes('CAS OBJECT')
      );

      relevantLogs.forEach((log, idx) => {
        console.log(`   ${idx + 1}: ${log}`);
      });

      if (relevantLogs.length === 0) {
        console.log('   ❌ Aucun log pertinent trouvé!');
        console.log('   📋 Premiers 10 logs:');
        allLogs.slice(0, 10).forEach((log, idx) => {
          console.log(`     ${idx + 1}: ${log}`);
        });
      }
    }

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testDebugSimplePlace();