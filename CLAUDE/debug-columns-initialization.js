const puppeteer = require('puppeteer');

async function debugColumnsInit() {
  console.log('🔍 DEBUG - Initialisation des colonnes');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  // Écouter les logs de la console
  page.on('console', msg => {
    if (msg.text().includes('calculateColumns') || msg.text().includes('columns') || msg.text().includes('store.state')) {
      console.log('🟡 CONSOLE:', msg.text());
    }
  });

  try {
    console.log('📍 Navigation vers: http://localhost:5503/bdd/test-user/new');
    await page.goto('http://localhost:5503/bdd/test-user/new', { waitUntil: 'networkidle0' });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 1. Vérifier le nombre de colonnes dans le DOM
    const columns = await page.$$('.column');
    console.log(`📊 Colonnes trouvées dans le DOM: ${columns.length}`);

    // 2. Vérifier les éléments avec data-property
    const properties = await page.$$('[data-property]');
    console.log(`📋 Éléments avec data-property: ${properties.length}`);

    if (properties.length > 0) {
      for (let i = 0; i < Math.min(properties.length, 5); i++) {
        const prop = properties[i];
        const propName = await prop.getAttribute('data-property');
        const hasButton = await prop.$('button');
        console.log(`   - ${propName}: ${hasButton ? 'HAS BUTTON ✅' : 'NO BUTTON ❌'}`);
      }
    }

    // 3. Vérifier les éléments avec class columns-container
    const columnsContainer = await page.$('.columns-container');
    if (columnsContainer) {
      console.log('✅ columns-container trouvé');

      const containerText = await page.evaluate((el) => el.textContent, columnsContainer);
      console.log(`📝 Contenu columns-container (100 premiers caractères): ${containerText.slice(0, 100)}`);
    } else {
      console.log('❌ columns-container NON trouvé');
    }

    // 4. Vérifier les éléments avec class columns-scroll
    const columnsScroll = await page.$('.columns-scroll');
    if (columnsScroll) {
      console.log('✅ columns-scroll trouvé');

      const scrollStyle = await columnsScroll.getAttribute('style');
      console.log(`🎨 Style columns-scroll: ${scrollStyle}`);
    } else {
      console.log('❌ columns-scroll NON trouvé');
    }

    // 5. Injecter du JavaScript pour inspecter le store
    const storeInfo = await page.evaluate(() => {
      // Essayer de trouver le store dans le window ou les éléments
      if (window.store) {
        return {
          hasStore: true,
          columns: window.store.state?.columns?.length || 0,
          entity: window.store.state?.entity?.data || null
        };
      }

      // Essayer de trouver via les éléments DOM
      const contextElement = document.querySelector('[data-qwik-context]');
      if (contextElement) {
        return {
          hasStore: false,
          hasContext: true,
          contextData: contextElement.dataset.qwikContext ? 'present' : 'absent'
        };
      }

      return {
        hasStore: false,
        hasContext: false
      };
    });

    console.log('🔍 Store info:', storeInfo);

    // 6. Screenshot pour voir visuellement
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/debug-columns-init.png',
      fullPage: true
    });
    console.log('📸 Screenshot sauvegardé');

    // 7. Vérifier les erreurs JavaScript
    const jsErrors = await page.evaluate(() => {
      return window.jsErrors || [];
    });

    if (jsErrors.length > 0) {
      console.log('❌ Erreurs JavaScript détectées:', jsErrors);
    } else {
      console.log('✅ Aucune erreur JavaScript détectée');
    }

  } catch (error) {
    console.error('❌ ERREUR:', error);
    await page.screenshot({
      path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots/debug-error.png',
      fullPage: true
    });
  }

  await browser.close();
}

// Exécuter le debug
debugColumnsInit().catch(console.error);