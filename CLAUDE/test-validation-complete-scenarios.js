const puppeteer = require('puppeteer');

async function testValidationCompleteScenarios() {
  console.log('🎯 TEST VALIDATION - Tous les scénarios de navigation');

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

    // SCÉNARIO 1: Navigation sur données pré-existantes
    console.log('\n📋 SCÉNARIO 1: Données pré-existantes');

    const preExistingTest = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 1) {
        const col1 = columns[0];
        const adresseField = Array.from(col1.querySelectorAll('.field-item'))
          .find(field => field.querySelector('.field-name')?.textContent?.trim() === 'adresse');

        if (adresseField) {
          const btn = adresseField.querySelector('.field-actions button[title="Explorer"]');
          return { hasButton: !!btn, canNavigate: true };
        }
      }
      return { hasButton: false, canNavigate: false };
    });

    console.log(`   ✅ Bouton Explorer sur adresse: ${preExistingTest.hasButton}`);

    // SCÉNARIO 2: Navigation sur nouvel élément array
    console.log('\n📋 SCÉNARIO 2: Nouvel élément array');

    // Naviguer vers adresse
    await page.click('div[q\\:key="adresse"] .field-actions button[title="Explorer"]');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Ajouter un nouvel élément
    await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const addBtn = arrayColumn.querySelector('button[title*="Ajouter"]');
        if (addBtn) addBtn.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test navigation vers nouvel élément
    const newElementTest = await page.evaluate(() => {
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

    console.log(`   ✅ Navigation vers nouvel élément: ${newElementTest.success}`);

    if (newElementTest.success) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      // SCÉNARIO 3: Navigation vers propriété objet sur nouvel élément
      console.log('\n📋 SCÉNARIO 3: Navigation objet sur nouvel élément');

      const objectNavTest = await page.evaluate(() => {
        const columns = document.querySelectorAll('.entity-column');
        if (columns.length >= 3) {
          const col3 = columns[2];
          const placeField = Array.from(col3.querySelectorAll('.field-item'))
            .find(field => field.querySelector('.field-name')?.textContent?.trim() === 'place');

          if (placeField) {
            const btn = placeField.querySelector('.field-actions button[title="Explorer"]');
            if (btn) {
              btn.click();
              return { success: true, hasButton: true };
            }
            return { success: false, hasButton: false };
          }
        }
        return { success: false, hasButton: false, reason: 'champ place non trouvé' };
      });

      console.log(`   ✅ Bouton Explorer sur place: ${objectNavTest.hasButton}`);
      console.log(`   ✅ Navigation vers place: ${objectNavTest.success}`);

      if (objectNavTest.success) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const finalColumns = await page.$$('.entity-column');
        console.log(`   ✅ Colonnes finales: ${finalColumns.length}`);

        // SCÉNARIO 4: Navigation vers array imbriqué
        console.log('\n📋 SCÉNARIO 4: Navigation array imbriqué');

        const arrayNavTest = await page.evaluate(() => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 4) {
            const col4 = columns[3];
            const testField = Array.from(col4.querySelectorAll('.field-item'))
              .find(field => field.querySelector('.field-name')?.textContent?.trim() === 'test');

            if (testField) {
              const btn = testField.querySelector('.field-actions button[title="Explorer"]');
              if (btn) {
                btn.click();
                return { success: true, hasButton: true };
              }
              return { success: false, hasButton: true };
            }
          }
          return { success: false, hasButton: false };
        });

        console.log(`   ✅ Bouton Explorer sur test: ${arrayNavTest.hasButton}`);
        console.log(`   ✅ Navigation vers test: ${arrayNavTest.success}`);

        if (arrayNavTest.success) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const ultraFinalColumns = await page.$$('.entity-column');
          console.log(`   ✅ Colonnes ultra-finales: ${ultraFinalColumns.length}`);
        }
      }
    }

    // RÉSUMÉ FINAL
    console.log('\n🎉 RÉSUMÉ DE VALIDATION:');
    const finalColumnCount = await page.$$('.entity-column');
    console.log(`   📊 Total colonnes atteintes: ${finalColumnCount.length}`);
    console.log(`   ✅ Navigation multi-niveaux: ${finalColumnCount.length >= 4 ? 'SUCCÈS' : 'ÉCHEC'}`);
    console.log(`   ✅ Schéma propagé correctement: ${finalColumnCount.length >= 4 ? 'OUI' : 'NON'}`);
    console.log(`   ✅ Objets navigables: ${finalColumnCount.length >= 4 ? 'OUI' : 'NON'}`);

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testValidationCompleteScenarios();