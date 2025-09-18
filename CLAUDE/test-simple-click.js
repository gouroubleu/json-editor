const puppeteer = require('puppeteer');

async function testSimpleClick() {
  console.log('🔍 TEST SIMPLE CLIC - Analyse basique');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  try {
    console.log('📍 Navigation vers: http://localhost:5503/bdd/test-user/new');
    await page.goto('http://localhost:5503/bdd/test-user/new', { waitUntil: 'networkidle0' });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 1. Vérifier structure page
    const pageTitle = await page.title();
    console.log(`📄 Titre page: ${pageTitle}`);

    // 2. Vérifier colonnes
    const columns = await page.$$('.column');
    console.log(`📊 Colonnes: ${columns.length}`);

    if (columns.length === 0) {
      console.log('❌ Aucune colonne - problème majeur!');
      return;
    }

    // 3. Contenu première colonne
    const firstColumn = columns[0];
    const columnText = await page.evaluate(el => el.textContent, firstColumn);
    console.log(`📝 Contenu première colonne (200 chars): ${columnText.slice(0, 200)}`);

    // 4. Chercher tous les boutons
    const allButtons = await page.$$('button');
    console.log(`🔘 Total boutons: ${allButtons.length}`);

    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      const btn = allButtons[i];
      const btnText = await page.evaluate(el => el.textContent, btn);
      const btnTitle = await page.evaluate(el => el.getAttribute('title'), btn);
      console.log(`   ${i}: "${btnText}" (title: "${btnTitle}")`);
    }

    // 5. Spécialement chercher boutons →
    const arrowButtons = await page.$$eval('button', buttons =>
      buttons.map(btn => ({
        text: btn.textContent,
        title: btn.getAttribute('title'),
        disabled: btn.disabled,
        style: btn.getAttribute('style')
      })).filter(btn => btn.text && btn.text.includes('→'))
    );

    console.log(`🏹 Boutons → trouvés: ${arrowButtons.length}`);
    arrowButtons.forEach((btn, i) => {
      console.log(`   → ${i}: "${btn.text}" (title: "${btn.title}", disabled: ${btn.disabled})`);
    });

    // 6. Test de clic sur le premier bouton →
    if (arrowButtons.length > 0) {
      console.log('✅ Tentative de clic sur premier bouton →...');

      // Attendre et cliquer
      await page.waitForSelector('button:contains("→")', { timeout: 5000 }).catch(() => {
        console.log('⚠️ Selector spécialisé échoué, utilisation méthode alternative');
      });

      // Méthode alternative : évaluer et cliquer
      const clickResult = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const arrowButton = buttons.find(btn => btn.textContent && btn.textContent.includes('→'));

        if (arrowButton) {
          console.log('🎯 Bouton → trouvé en JavaScript, tentative de clic...');
          arrowButton.click();
          return { success: true, buttonText: arrowButton.textContent };
        }
        return { success: false };
      });

      console.log('🖱️ Résultat clic:', clickResult);

      // Attendre et vérifier
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newColumns = await page.$$('.column');
      console.log(`📊 Colonnes après clic: ${newColumns.length}`);

      if (newColumns.length > columns.length) {
        console.log('🎉 SUCCÈS! Navigation fonctionnelle!');
      } else {
        console.log('❌ ÉCHEC: Pas de nouvelle colonne');
      }
    }

    // Screenshot final
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/simple-click-test.png',
      fullPage: true
    });
    console.log('📸 Screenshot sauvegardé');

  } catch (error) {
    console.error('❌ ERREUR:', error);
  }

  await browser.close();
}

// Exécuter le test
testSimpleClick().catch(console.error);