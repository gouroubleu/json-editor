#!/usr/bin/env node

/**
 * Test pour analyser le problème d'ajout d'entités jsonschema
 */

const puppeteer = require('puppeteer');

async function debugJsonschemaEntities() {
  console.log('🎯 Debug ajout entités jsonschema');

  const browser = await puppeteer.launch({
    headless: false, // Visible pour debug
    slowMo: 1000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    console.log('🌐 Navigation vers http://localhost:5503/bdd/test-user/new/');
    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: 'CLAUDE/screenshots/debug-entite-initial.png', fullPage: true });
    console.log('📸 Screenshot page initiale');

    // Chercher la propriété hhh
    console.log('🔍 Recherche propriété hhh...');

    // Attendre et chercher les boutons avec la flèche
    await page.waitForSelector('[data-testid="explore-btn"], .explore-btn, button:has-text("→")', { timeout: 5000 });

    const exploreButtons = await page.$$('[data-testid="explore-btn"], .explore-btn, button');
    console.log(`📋 Trouvé ${exploreButtons.length} boutons potentiels`);

    // Chercher le bon bouton pour hhh
    let hhhButton = null;
    for (const btn of exploreButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      const parent = await page.evaluateHandle(el => el.closest('.property-item, .field-container, [data-field], div'), btn);
      const parentText = await page.evaluate(el => el.textContent, parent);

      console.log(`📋 Bouton: "${text}" - Parent: "${parentText?.substring(0, 50)}..."`);

      if (parentText && parentText.toLowerCase().includes('hhh')) {
        hhhButton = btn;
        console.log('✅ Bouton hhh trouvé!');
        break;
      }
    }

    if (!hhhButton) {
      // Essayer une approche différente
      const allElements = await page.$$('*');
      for (const el of allElements.slice(0, 100)) { // Limiter pour éviter la surcharge
        const text = await page.evaluate(element => element.textContent, el);
        if (text && text.includes('hhh')) {
          console.log(`📋 Élément contenant 'hhh': ${text.substring(0, 100)}`);
          const button = await el.$('button, [role="button"]');
          if (button) {
            hhhButton = button;
            console.log('✅ Bouton hhh trouvé via recherche étendue!');
            break;
          }
        }
      }
    }

    if (hhhButton) {
      console.log('🖱️ Clic sur le bouton hhh...');
      await hhhButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      await page.screenshot({ path: 'CLAUDE/screenshots/debug-apres-clic-hhh.png', fullPage: true });
      console.log('📸 Screenshot après clic sur hhh');

      // Analyser ce qui s'affiche
      const currentUrl = page.url();
      console.log(`📋 URL actuelle: ${currentUrl}`);

      // Chercher les formulaires affichés
      const forms = await page.$$('form, .form, .add-form, .entity-form');
      console.log(`📋 Formulaires trouvés: ${forms.length}`);

      for (let i = 0; i < forms.length; i++) {
        const formHTML = await page.evaluate(form => form.outerHTML.substring(0, 200), forms[i]);
        console.log(`📋 Formulaire ${i}: ${formHTML}...`);
      }

      // Chercher les champs de saisie
      const inputs = await page.$$('input[type="text"], input[type="email"], input[type="number"], select, textarea');
      console.log(`📋 Champs de saisie trouvés: ${inputs.length}`);

      for (let i = 0; i < Math.min(inputs.length, 10); i++) {
        const inputInfo = await page.evaluate(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
          id: input.id,
          className: input.className
        }), inputs[i]);
        console.log(`📋 Champ ${i}:`, inputInfo);
      }

      // Vérifier si on peut ajouter un élément
      const addButtons = await page.$$('button:has-text("Ajouter"), .add-btn, [data-testid="add-btn"]');
      console.log(`📋 Boutons d'ajout trouvés: ${addButtons.length}`);

      if (addButtons.length > 0) {
        console.log('🖱️ Clic sur bouton ajouter...');
        await addButtons[0].click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        await page.screenshot({ path: 'CLAUDE/screenshots/debug-formulaire-ajout.png', fullPage: true });
        console.log('📸 Screenshot formulaire d\'ajout');

        // Analyser le formulaire d'ajout
        const addInputs = await page.$$('input[type="text"], input[type="email"], input[type="number"], select, textarea');
        console.log(`📋 Champs dans formulaire d'ajout: ${addInputs.length}`);

        const expectedFields = ['id', 'nom', 'email', 'age']; // Champs du schéma user
        const foundFields = [];

        for (const input of addInputs) {
          const inputInfo = await page.evaluate(inp => ({
            name: inp.name,
            placeholder: inp.placeholder,
            id: inp.id,
            type: inp.type
          }), input);

          foundFields.push(inputInfo);
          console.log(`📋 Champ formulaire:`, inputInfo);
        }

        // Vérifier si les champs correspondent au schéma user
        const hasUserFields = expectedFields.some(field =>
          foundFields.some(found =>
            found.name?.includes(field) ||
            found.placeholder?.toLowerCase().includes(field) ||
            found.id?.includes(field)
          )
        );

        console.log(`📋 Champs attendus du schéma user: ${expectedFields.join(', ')}`);
        console.log(`📋 Formulaire correspond au schéma user: ${hasUserFields ? 'OUI' : 'NON'}`);

        if (!hasUserFields) {
          console.log('❌ PROBLÈME: Le formulaire ne correspond pas au schéma user référencé');
          console.log('🔧 Il faut implémenter le chargement du schéma référencé');
        } else {
          console.log('✅ Le formulaire semble correspondre au schéma user');
        }
      }

      // Sauvegarder l'analyse
      const analysis = {
        timestamp: new Date().toISOString(),
        url: currentUrl,
        formsFound: forms.length,
        inputsFound: inputs.length,
        addButtonsFound: addButtons.length,
        expectedUserFields: expectedFields,
        foundFields: foundFields,
        hasCorrectSchema: addButtons.length > 0 ? !expectedFields.some(field =>
          !foundFields.some(found =>
            found.name?.includes(field) ||
            found.placeholder?.toLowerCase().includes(field) ||
            found.id?.includes(field)
          )
        ) : false
      };

      const fs = require('fs').promises;
      await fs.writeFile('CLAUDE/debug-jsonschema-entities-analysis.json', JSON.stringify(analysis, null, 2));
      console.log('📄 Analyse sauvegardée');

      return analysis;

    } else {
      console.log('❌ Impossible de trouver le bouton pour la propriété hhh');

      // Debug: lister tous les éléments visibles
      const pageContent = await page.content();
      const fs = require('fs').promises;
      await fs.writeFile('CLAUDE/debug-page-content.html', pageContent);
      console.log('📄 Contenu de la page sauvegardé pour debug');

      return null;
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: 'CLAUDE/screenshots/error-debug-entities.png', fullPage: true });
    return null;
  } finally {
    await browser.close();
  }
}

// Exécution
if (require.main === module) {
  debugJsonschemaEntities()
    .then(result => {
      if (result) {
        console.log('\n📊 ANALYSE TERMINÉE');
        console.log(`Schéma correct: ${result.hasCorrectSchema ? 'OUI' : 'NON'}`);
      } else {
        console.log('\n❌ ANALYSE ÉCHOUÉE');
      }
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}