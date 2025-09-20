/**
 * TEST - Problème bouton Configurer du type jsonschema
 * Test de bout en bout pour identifier pourquoi le bouton ne fonctionne pas
 */

const puppeteer = require('puppeteer');

async function testJsonSchemaConfigurerBouton() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Capturer logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log(`[LOG] ${text}`);
  });

  try {
    console.log('🎯 TEST JSONSCHEMA CONFIGURER BOUTON - Démarrage...');

    // 1. Navigation vers éditeur de schéma
    console.log('📍 ÉTAPE 1: Navigation vers éditeur de schéma...');
    await page.goto('http://localhost:5501/bdd/test-user/schema/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Capture d'écran initiale
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/capture-jsonschema-1-initial.png' });

    // 3. Ajouter une nouvelle propriété
    console.log('📍 ÉTAPE 2: Ajout d\'une nouvelle propriété...');

    const addResult = await page.evaluate(() => {
      // Chercher le bouton "Ajouter une propriété"
      const buttons = Array.from(document.querySelectorAll('button'));
      const addButton = buttons.find(btn =>
        btn.textContent?.includes('Ajouter') &&
        btn.textContent?.includes('propriété')
      );

      if (addButton) {
        console.log('🔧 Cliquant sur Ajouter une propriété');
        addButton.click();
        return { success: true };
      }
      return { success: false, error: 'Bouton Ajouter propriété non trouvé' };
    });

    if (!addResult.success) {
      throw new Error(addResult.error);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Configurer la nouvelle propriété avec type jsonschema
    console.log('📍 ÉTAPE 3: Configuration propriété type jsonschema...');

    const configResult = await page.evaluate(() => {
      // Remplir le nom de la propriété
      const nameInputs = Array.from(document.querySelectorAll('input[placeholder*="nom"], input[placeholder*="Nom"]'));
      const nameInput = nameInputs[nameInputs.length - 1]; // Le plus récent

      if (nameInput) {
        nameInput.value = 'test_jsonschema';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('🔧 Nom de propriété défini: test_jsonschema');
      }

      // Chercher le dropdown du type et sélectionner jsonschema
      const selects = Array.from(document.querySelectorAll('select'));
      const typeSelect = selects.find(select =>
        Array.from(select.options).some(option => option.value === 'jsonschema')
      );

      if (typeSelect) {
        typeSelect.value = 'jsonschema';
        typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('🔧 Type jsonschema sélectionné');
        return { success: true, nameSet: !!nameInput, typeSet: true };
      }

      return { success: false, error: 'Dropdown type jsonschema non trouvé', nameSet: !!nameInput };
    });

    console.log('Configuration result:', configResult);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Capture après sélection du type
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/capture-jsonschema-2-type-selectionne.png' });

    // 6. Chercher le bouton "Configurer"
    console.log('📍 ÉTAPE 4: Recherche et test du bouton Configurer...');

    const configurerInfo = await page.evaluate(() => {
      // Chercher tous les boutons qui pourraient être "Configurer"
      const allButtons = Array.from(document.querySelectorAll('button'));
      const configurerButtons = allButtons.filter(btn =>
        btn.textContent?.includes('Configurer') ||
        btn.textContent?.includes('Configure') ||
        btn.textContent?.includes('→') ||
        btn.title?.includes('Configurer')
      );

      // Chercher aussi les liens ou autres éléments cliquables
      const allClickables = Array.from(document.querySelectorAll('a, span[onclick], div[onclick], .clickable'));
      const configurerLinks = allClickables.filter(el =>
        el.textContent?.includes('Configurer') ||
        el.textContent?.includes('→')
      );

      return {
        buttons: configurerButtons.map(btn => ({
          text: btn.textContent?.trim(),
          className: btn.className,
          disabled: btn.disabled,
          visible: !btn.hidden && btn.style.display !== 'none',
          id: btn.id
        })),
        links: configurerLinks.map(link => ({
          text: link.textContent?.trim(),
          className: link.className,
          tagName: link.tagName
        })),
        totalButtons: allButtons.length,
        totalClickables: allClickables.length
      };
    });

    console.log('📊 ÉLÉMENTS CONFIGURER TROUVÉS:');
    console.log(`   Boutons Configurer: ${configurerInfo.buttons.length}`);
    configurerInfo.buttons.forEach((btn, i) => {
      console.log(`   [${i}] "${btn.text}" (${btn.className}) - visible: ${btn.visible}, disabled: ${btn.disabled}`);
    });

    console.log(`   Liens Configurer: ${configurerInfo.links.length}`);
    configurerInfo.links.forEach((link, i) => {
      console.log(`   [${i}] "${link.text}" (${link.tagName}.${link.className})`);
    });

    // 7. Tenter de cliquer sur le bouton Configurer s'il existe
    if (configurerInfo.buttons.length > 0) {
      console.log('📍 ÉTAPE 5: Clic sur bouton Configurer...');

      const clickResult = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        const configurerButton = allButtons.find(btn =>
          btn.textContent?.includes('Configurer') ||
          btn.textContent?.includes('→')
        );

        if (configurerButton && !configurerButton.disabled) {
          console.log('🔧 Cliquant sur bouton Configurer:', configurerButton.textContent);
          configurerButton.click();
          return { success: true, clicked: true };
        }

        return { success: false, error: 'Bouton Configurer non trouvé ou désactivé' };
      });

      console.log('Click result:', clickResult);

      await new Promise(resolve => setTimeout(resolve, 3000));

      // 8. Capture après clic
      await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/capture-jsonschema-3-apres-configurer.png' });

      // 9. Vérifier si ReferenceConfigColumn est apparu
      const referenceColumnInfo = await page.evaluate(() => {
        // Chercher des éléments spécifiques à ReferenceConfigColumn
        const referenceElements = Array.from(document.querySelectorAll('[class*="reference"], [class*="config"], .schema-selector'));
        const hasReferenceConfig = document.querySelector('.reference-config-column') ||
                                 document.querySelector('[class*="ReferenceConfig"]') ||
                                 referenceElements.length > 0;

        return {
          hasReferenceConfig,
          referenceElements: referenceElements.map(el => ({
            className: el.className,
            tagName: el.tagName,
            text: el.textContent?.slice(0, 50)
          })),
          currentColumns: Array.from(document.querySelectorAll('[class*="column"]')).length
        };
      });

      console.log('📊 RÉFÉRENCE CONFIG INFO:');
      console.log(`   ReferenceConfig visible: ${referenceColumnInfo.hasReferenceConfig}`);
      console.log(`   Colonnes totales: ${referenceColumnInfo.currentColumns}`);
      console.log(`   Éléments référence: ${referenceColumnInfo.referenceElements.length}`);

    } else {
      console.log('❌ Aucun bouton Configurer trouvé !');
    }

    await browser.close();

    return {
      success: true,
      addButtonFound: addResult.success,
      typeConfigured: configResult.success,
      configurerButtonsFound: configurerInfo.buttons.length,
      configurerClicked: configurerInfo.buttons.length > 0
    };

  } catch (error) {
    console.error('❌ Erreur test:', error.message);
    await browser.close();
    return { error: error.message };
  }
}

testJsonSchemaConfigurerBouton().then(result => {
  console.log('\n📋 RÉSUMÉ TEST JSONSCHEMA CONFIGURER:');
  if (result.error) {
    console.log('🚨 ERREUR:', result.error);
  } else {
    console.log(`Ajout propriété: ${result.addButtonFound ? '✅ OK' : '❌ ÉCHEC'}`);
    console.log(`Type jsonschema: ${result.typeConfigured ? '✅ OK' : '❌ ÉCHEC'}`);
    console.log(`Boutons Configurer: ${result.configurerButtonsFound > 0 ? '✅ TROUVÉS' : '❌ AUCUN'}`);
    console.log(`Clic Configurer: ${result.configurerClicked ? '✅ TESTÉ' : '❌ IMPOSSIBLE'}`);
  }
}).catch(console.error);