const puppeteer = require('puppeteer');

async function debugAddPropertyForm() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('📝 Navigation vers l\'éditeur de schéma...');
    await page.goto('http://localhost:5502/new', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('📋 URL actuelle:', page.url());

    // Vérifier s'il y a des éléments liés aux propriétés
    const elements = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const formElements = [];
      const buttonElements = [];
      const inputElements = [];

      allElements.forEach(el => {
        if (el.tagName === 'FORM' || el.className.includes('form')) {
          formElements.push({
            tag: el.tagName,
            className: el.className,
            textContent: el.textContent?.substring(0, 100)
          });
        }

        if (el.tagName === 'BUTTON') {
          buttonElements.push({
            className: el.className,
            textContent: el.textContent?.trim(),
            onclick: el.onclick?.toString()
          });
        }

        if (el.tagName === 'INPUT') {
          inputElements.push({
            type: el.type,
            placeholder: el.placeholder,
            className: el.className,
            name: el.name
          });
        }
      });

      return {
        forms: formElements.slice(0, 10),
        buttons: buttonElements.slice(0, 20),
        inputs: inputElements.slice(0, 20),
        hasAddBtn: !!document.querySelector('.add-btn'),
        hasPropertyColumn: !!document.querySelector('.property-column'),
        hasSchemaEditor: !!document.querySelector('.horizontal-schema-editor'),
        availableSelectors: Array.from(new Set(
          allElements.map(el => el.className.split(' ')).flat().filter(c => c.trim())
        )).slice(0, 50)
      };
    });

    console.log('📋 Forms trouvés:', elements.forms);
    console.log('📋 Buttons trouvés:', elements.buttons);
    console.log('📋 Inputs trouvés:', elements.inputs);
    console.log('📋 Has add button:', elements.hasAddBtn);
    console.log('📋 Has property column:', elements.hasPropertyColumn);
    console.log('📋 Has schema editor:', elements.hasSchemaEditor);
    console.log('📋 Available selectors:', elements.availableSelectors);

    // Essayer de cliquer sur un bouton d'ajout si disponible
    if (elements.hasAddBtn) {
      console.log('🖱️ Clic sur le bouton d\'ajout...');
      await page.click('.add-btn');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Capturer l'état après le clic
      const afterClick = await page.evaluate(() => {
        return {
          forms: Array.from(document.querySelectorAll('form, .form, .add-property-form')).map(el => ({
            className: el.className,
            textContent: el.textContent?.substring(0, 200)
          })),
          inputs: Array.from(document.querySelectorAll('input')).map(el => ({
            type: el.type,
            placeholder: el.placeholder,
            className: el.className,
            visible: el.offsetParent !== null
          })),
          visibleInputs: Array.from(document.querySelectorAll('input:not([style*="display: none"]):not([hidden])')).length
        };
      });

      console.log('📋 Après clic - Forms:', afterClick.forms);
      console.log('📋 Après clic - Inputs:', afterClick.inputs);
      console.log('📋 Après clic - Inputs visibles:', afterClick.visibleInputs);

      await page.screenshot({ path: 'CLAUDE/debug-after-add-click.png', fullPage: true });
      console.log('📸 Screenshot après clic sauvegardée');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await page.screenshot({ path: 'CLAUDE/debug-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

debugAddPropertyForm().catch(console.error);