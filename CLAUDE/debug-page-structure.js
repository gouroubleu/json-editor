const puppeteer = require('puppeteer');

async function debugPageStructure() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('📝 Navigation vers la page...');
    await page.goto('http://localhost:5502/bdd/test-user/new', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('📋 Titre de la page:', await page.title());
    console.log('📋 URL actuelle:', page.url());

    // Récupérer le HTML de la page
    const bodyContent = await page.evaluate(() => {
      return {
        bodyHTML: document.body.innerHTML.substring(0, 2000),
        classes: Array.from(document.body.classList),
        hasSchemaEditor: !!document.querySelector('.horizontal-schema-editor'),
        hasPropertyColumn: !!document.querySelector('.property-column'),
        availableClasses: Array.from(document.querySelectorAll('*')).map(el => el.className).filter(c => c).slice(0, 20)
      };
    });

    console.log('📋 Body classes:', bodyContent.classes);
    console.log('📋 Has schema editor:', bodyContent.hasSchemaEditor);
    console.log('📋 Has property column:', bodyContent.hasPropertyColumn);
    console.log('📋 Available classes (sample):', bodyContent.availableClasses);

    // Capturer une capture d'écran
    await page.screenshot({ path: 'CLAUDE/debug-page-structure.png', fullPage: true });
    console.log('📸 Screenshot sauvegardée: debug-page-structure.png');

    // Vérifier les erreurs console
    const errors = await page.evaluate(() => {
      return window.console_errors || [];
    });

    if (errors.length > 0) {
      console.log('❌ Erreurs console:', errors);
    }

    // Récupérer les sélecteurs disponibles
    const selectors = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const uniqueSelectors = new Set();

      allElements.forEach(el => {
        if (el.className) {
          el.className.split(' ').forEach(cls => {
            if (cls.trim()) uniqueSelectors.add('.' + cls.trim());
          });
        }
        if (el.id) {
          uniqueSelectors.add('#' + el.id);
        }
      });

      return Array.from(uniqueSelectors).slice(0, 50);
    });

    console.log('📋 Sélecteurs disponibles (sample):', selectors);

    // Vérifier s'il y a des erreurs de network
    const responses = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type']
      });
    });

    await page.reload({ waitUntil: 'networkidle0' });
    console.log('📋 Responses (sample):', responses.slice(0, 10));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await page.screenshot({ path: 'CLAUDE/debug-page-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

debugPageStructure().catch(console.error);