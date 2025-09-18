const puppeteer = require('puppeteer');

async function testNavigationReal() {
  console.log('🚀 TEST NAVIGATION RÉELLE - Boutons existants');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  try {
    console.log('📍 Navigation vers: http://localhost:5503/bdd/test-user/new');
    await page.goto('http://localhost:5503/bdd/test-user/new', { waitUntil: 'networkidle0' });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 1. Vérifier colonnes
    const columns = await page.$$('.column');
    console.log(`📊 Colonnes trouvées: ${columns.length}`);

    if (columns.length === 0) {
      console.log('❌ Aucune colonne trouvée');
      return;
    }

    // 2. Chercher tous les boutons de navigation dans la première colonne
    const navigationButtons = await page.$$('.column:first-child button[title*="Naviguer"]');
    console.log(`🔍 Boutons de navigation trouvés: ${navigationButtons.length}`);

    if (navigationButtons.length === 0) {
      // Essayer de trouver n'importe quel bouton avec "→"
      const arrowButtons = await page.$$('.column:first-child button');
      console.log(`🔍 Boutons totaux dans première colonne: ${arrowButtons.length}`);

      for (let i = 0; i < Math.min(arrowButtons.length, 5); i++) {
        const button = arrowButtons[i];
        const buttonText = await page.evaluate(el => el.textContent, button);
        const buttonTitle = await page.evaluate(el => el.getAttribute('title'), button);
        console.log(`   - Bouton ${i}: "${buttonText}" (title: "${buttonTitle}")`);

        // Si c'est un bouton avec →, testons-le
        if (buttonText && buttonText.includes('→')) {
          console.log(`✅ BOUTON → TROUVÉ! Test du clic...`);

          await button.click();
          console.log('🖱️ CLIC EFFECTUÉ');

          await new Promise(resolve => setTimeout(resolve, 1000));

          // Vérifier les nouvelles colonnes
          const newColumns = await page.$$('.column');
          console.log(`📊 Colonnes après clic: ${newColumns.length}`);

          if (newColumns.length > columns.length) {
            console.log('🎉 SUCCÈS! Nouvelle colonne générée!');

            // Test niveau 3
            const level2Buttons = await page.$$('.column:nth-child(2) button');
            console.log(`🔍 Boutons niveau 2: ${level2Buttons.length}`);

            // Chercher un bouton → en niveau 2
            for (let j = 0; j < Math.min(level2Buttons.length, 3); j++) {
              const btn = level2Buttons[j];
              const btnText = await page.evaluate(el => el.textContent, btn);
              if (btnText && btnText.includes('→')) {
                console.log(`✅ BOUTON → NIVEAU 2 TROUVÉ! Test...`);
                await btn.click();
                await new Promise(resolve => setTimeout(resolve, 1000));

                const finalColumns = await page.$$('.column');
                console.log(`📊 Colonnes finales: ${finalColumns.length}`);

                if (finalColumns.length > newColumns.length) {
                  console.log('🎉 SUCCÈS NIVEAU 3! Colonne 3 générée!');
                } else {
                  console.log('❌ ÉCHEC: Colonne 3 non générée');
                }
                break;
              }
            }

          } else {
            console.log('❌ ÉCHEC: Aucune nouvelle colonne générée');
          }
          break;
        }
      }
    } else {
      // Utiliser le premier bouton de navigation trouvé
      console.log(`✅ BOUTON NAVIGATION TROUVÉ! Test du clic...`);

      await navigationButtons[0].click();
      console.log('🖱️ CLIC EFFECTUÉ');

      await new Promise(resolve => setTimeout(resolve, 1000));

      const newColumns = await page.$$('.column');
      console.log(`📊 Colonnes après clic: ${newColumns.length}`);

      if (newColumns.length > columns.length) {
        console.log('🎉 SUCCÈS! Nouvelle colonne générée!');
      } else {
        console.log('❌ ÉCHEC: Aucune nouvelle colonne générée');
      }
    }

    // 3. Screenshot final
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/test-navigation-real.png',
      fullPage: true
    });
    console.log('📸 Screenshot sauvegardé');

  } catch (error) {
    console.error('❌ ERREUR:', error);
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/error-navigation-real.png',
      fullPage: true
    });
  }

  await browser.close();
}

// Exécuter le test
testNavigationReal().catch(console.error);