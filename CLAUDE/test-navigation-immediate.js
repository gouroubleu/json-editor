const puppeteer = require('puppeteer');

async function testNavigationImmediate() {
  console.log('🚀 TEST IMMÉDIAT - Navigation flèche →');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  try {
    // 1. Aller sur la page test-user/new
    console.log('📍 Navigation vers: http://localhost:5503/bdd/test-user/new');
    await page.goto('http://localhost:5503/bdd/test-user/new', { waitUntil: 'networkidle0' });

    // 2. Attendre que la page se charge
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Vérifier colonnes initiales
    const initialColumns = await page.$$('.column');
    console.log(`📊 Colonnes initiales: ${initialColumns.length}`);

    // 4. Chercher la flèche → pour naviguer vers adresse
    console.log('🔍 Recherche de la flèche → pour adresse...');
    await page.waitForSelector('[data-property="adresse"]', { timeout: 5000 });

    // 5. Cliquer sur la flèche → pour adresse
    const navigationButton = await page.$('[data-property="adresse"] button[title="Naviguer vers cette propriété"]');
    if (navigationButton) {
      console.log('✅ Flèche → trouvée pour adresse');
      await navigationButton.click();
      console.log('🖱️ CLIC SUR FLÈCHE → ADRESSE EFFECTUÉ');

      // 6. Attendre que la nouvelle colonne apparaisse
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 7. Vérifier si colonne 2 apparaît
      const columnsAfterClick = await page.$$('.column');
      console.log(`📊 Colonnes après clic: ${columnsAfterClick.length}`);

      if (columnsAfterClick.length > initialColumns.length) {
        console.log('🎉 SUCCÈS: Nouvelle colonne générée !');

        // 8. Test navigation niveau 3 - chercher la flèche → dans colonne 2
        console.log('🔍 Test navigation niveau 3...');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Chercher la flèche → dans la colonne 2 pour un objet
        const level2Buttons = await page.$$('.column:nth-child(3) button[title="Naviguer vers cette propriété"]');
        if (level2Buttons.length > 0) {
          console.log(`✅ ${level2Buttons.length} flèche(s) → trouvée(s) en niveau 2`);

          // Cliquer sur la première
          await level2Buttons[0].click();
          console.log('🖱️ CLIC SUR FLÈCHE → NIVEAU 2 EFFECTUÉ');

          await new Promise(resolve => setTimeout(resolve, 1000));

          // Vérifier colonne 3
          const finalColumns = await page.$$('.column');
          console.log(`📊 Colonnes finales: ${finalColumns.length}`);

          if (finalColumns.length > columnsAfterClick.length) {
            console.log('🎉 SUCCÈS NIVEAU 3: Colonne 3 générée !');
          } else {
            console.log('❌ ÉCHEC: Colonne 3 NON générée');
          }
        } else {
          console.log('❌ Aucune flèche → trouvée en niveau 2');
        }

      } else {
        console.log('❌ ÉCHEC: Aucune nouvelle colonne générée');
        console.log('🔍 Analyse du problème...');

        // Debug: chercher les éléments présents
        const properties = await page.$$('[data-property]');
        console.log(`📋 Propriétés trouvées: ${properties.length}`);

        for (let i = 0; i < properties.length; i++) {
          const prop = properties[i];
          const propName = await prop.getAttribute('data-property');
          console.log(`   - Propriété: ${propName}`);
        }
      }

    } else {
      console.log('❌ PROBLÈME: Flèche → non trouvée pour adresse');

      // Debug: lister tous les éléments avec data-property
      const allProps = await page.$$('[data-property]');
      console.log(`📋 Propriétés disponibles: ${allProps.length}`);

      for (let i = 0; i < allProps.length; i++) {
        const prop = allProps[i];
        const propName = await prop.getAttribute('data-property');
        const hasButton = await prop.$('button[title="Naviguer vers cette propriété"]');
        console.log(`   - ${propName}: ${hasButton ? 'HAS BUTTON ✅' : 'NO BUTTON ❌'}`);
      }
    }

    // Screenshot final
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/test-navigation-immediate.png', fullPage: true });
    console.log('📸 Screenshot sauvegardé');

  } catch (error) {
    console.error('❌ ERREUR:', error);
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/error-navigation.png', fullPage: true });
  }

  console.log('\n✅ Test terminé');

  await browser.close();
}

// Exécuter le test
testNavigationImmediate().catch(console.error);