const puppeteer = require('puppeteer');

async function testNavigationDebug() {
  console.log('🔍 DEBUG NAVIGATION - Logs détaillés');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  // Écouter les logs de la console pour voir les fonctions appelées
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('navigateToProperty') || text.includes('calculateColumns') || text.includes('NAVIGATE') || text.includes('🟡') || text.includes('🔧')) {
      console.log('🟡 CONSOLE:', text);
    }
  });

  try {
    console.log('📍 Navigation vers: http://localhost:5503/bdd/test-user/new');
    await page.goto('http://localhost:5503/bdd/test-user/new', { waitUntil: 'networkidle0' });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 1. État initial
    const initialColumns = await page.$$('.column');
    console.log(`📊 Colonnes initiales: ${initialColumns.length}`);

    // 2. Trouver tous les éléments avec des boutons →
    const fieldElements = await page.$$('.field-item');
    console.log(`📋 Éléments field-item trouvés: ${fieldElements.length}`);

    for (let i = 0; i < Math.min(fieldElements.length, 3); i++) {
      const field = fieldElements[i];

      // Obtenir les infos du champ
      const fieldText = await page.evaluate(el => el.textContent, field);
      const arrowButton = await field.$('button');

      if (arrowButton) {
        const buttonText = await page.evaluate(el => el.textContent, arrowButton);
        console.log(`📝 Champ ${i}: "${fieldText.slice(0, 50)}..." - Bouton: "${buttonText}"`);

        if (buttonText && buttonText.includes('→')) {
          console.log(`✅ CHAMP NAVIGABLE TROUVÉ! Test du clic...`);

          console.log('🟡 AVANT CLIC - Attendre les logs...');
          await new Promise(resolve => setTimeout(resolve, 500));

          await arrowButton.click();
          console.log('🖱️ CLIC EFFECTUÉ - Attendre les logs...');

          // Attendre pour voir les logs
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Vérifier les nouvelles colonnes
          const newColumns = await page.$$('.column');
          console.log(`📊 Colonnes après clic: ${newColumns.length}`);

          if (newColumns.length > initialColumns.length) {
            console.log('🎉 SUCCÈS! Nouvelle colonne générée!');
          } else {
            console.log('❌ ÉCHEC: Aucune nouvelle colonne générée');
            console.log('🔍 Analysons pourquoi...');

            // Vérifier si les données ont changé dans le contexte
            const storeInfo = await page.evaluate(() => {
              // Chercher dans les éléments DOM pour des indices
              const columns = document.querySelectorAll('.column');
              return {
                columnsInDOM: columns.length,
                firstColumnContent: columns[0] ? columns[0].textContent.slice(0, 100) : 'N/A'
              };
            });
            console.log('📊 Info store:', storeInfo);
          }
          break;
        }
      }
    }

    // 3. Screenshot final
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/debug-navigation.png',
      fullPage: true
    });
    console.log('📸 Screenshot sauvegardé');

  } catch (error) {
    console.error('❌ ERREUR:', error);
  }

  console.log('⏸️ Attendre 3 secondes pour voir tous les logs...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  await browser.close();
}

// Exécuter le test
testNavigationDebug().catch(console.error);