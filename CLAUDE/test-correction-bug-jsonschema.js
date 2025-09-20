#!/usr/bin/env node

/**
 * Test pour vérifier que le bug de sauvegarde jsonschema → array est corrigé
 */

const puppeteer = require('puppeteer');

async function testBugCorrection() {
  console.log('🎯 Test correction bug jsonschema → array');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  try {
    console.log('🌐 Navigation vers http://localhost:5503/edit/test-user');
    await page.goto('http://localhost:5503/edit/test-user', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Étape 1: Ajouter une propriété jsonschema
    console.log('➕ Ajout propriété jsonschema');
    await page.click('.add-btn');
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.type('.add-property-form input[placeholder="Nom de la propriété"]', 'mon-reference');
    await page.select('.add-property-form select', 'jsonschema');
    await page.click('.add-property-form .btn-primary');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await page.screenshot({ path: 'CLAUDE/screenshots/propriete-jsonschema-ajoutee-bug-test.png', fullPage: true });

    // Étape 2: Configurer la référence
    console.log('⚙️ Configuration de la référence');
    await page.click('.property-card .explore-btn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Sélectionner un schema et activer multiple
    await page.select('.property-column:nth-child(2) .property-type', 'test-user');
    await page.type('.property-column:nth-child(2) .property-name', 'Mes utilisateurs');

    // Activer multiple (array)
    const checkboxes = await page.$$('.property-column:nth-child(2) input[type="checkbox"]');
    if (checkboxes.length > 0) {
      await checkboxes[0].click(); // Premier checkbox = multiple
      console.log('✅ Option "multiple" activée');
    }

    await page.screenshot({ path: 'CLAUDE/screenshots/configuration-multiple-activee.png', fullPage: true });

    // Étape 3: Sauvegarder
    console.log('💾 Sauvegarde du schéma');
    const saveButtons = await page.$$('button');
    let saveButton = null;
    for (const btn of saveButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Sauvegarder')) {
        saveButton = btn;
        break;
      }
    }

    if (saveButton) {
      await saveButton.click();
      console.log('✅ Bouton sauvegarder cliqué');
    } else {
      console.log('❌ Bouton sauvegarder non trouvé');
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: 'CLAUDE/screenshots/apres-sauvegarde.png', fullPage: true });

    // Étape 4: Recharger la page pour vérifier
    console.log('🔄 Rechargement pour vérifier la persistance');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: 'CLAUDE/screenshots/apres-rechargement.png', fullPage: true });

    // Étape 5: Vérifier que la propriété est toujours de type jsonschema
    const propertyCards = await page.$$('.property-card');
    let foundJsonschemaProperty = false;

    for (const card of propertyCards) {
      const nameInput = await card.$('.property-name');
      if (nameInput) {
        const name = await page.evaluate(el => el.value, nameInput);
        if (name === 'mon-reference') {
          const typeSelect = await card.$('.property-type');
          const type = await page.evaluate(el => el.value, typeSelect);

          console.log(`📋 Propriété "${name}" a le type: ${type}`);

          if (type === 'jsonschema') {
            foundJsonschemaProperty = true;
            console.log('✅ Type jsonschema préservé après sauvegarde');

            // Vérifier si on peut toujours configurer
            const configBtn = await card.$('.explore-btn');
            if (configBtn) {
              console.log('✅ Bouton "Configurer →" toujours présent');

              // Tester la configuration
              await configBtn.click();
              await new Promise(resolve => setTimeout(resolve, 1000));

              const configColumn = await page.$('.property-column:nth-child(2)');
              if (configColumn) {
                console.log('✅ Colonne de configuration s\'ouvre correctement');

                // Vérifier que les valeurs sont conservées
                const schemaSelect = await page.$eval('.property-column:nth-child(2) .property-type', el => el.value);
                const titleInput = await page.$eval('.property-column:nth-child(2) .property-name', el => el.value);

                console.log(`📋 Schema sélectionné: ${schemaSelect}`);
                console.log(`📋 Titre: ${titleInput}`);

                if (schemaSelect === 'test-user' && titleInput === 'Mes utilisateurs') {
                  console.log('✅ Configuration préservée après sauvegarde');

                  await page.screenshot({ path: 'CLAUDE/screenshots/configuration-preservee.png', fullPage: true });

                  console.log('\n🎉 SUCCÈS: Bug jsonschema → array CORRIGÉ !');
                  return true;
                } else {
                  console.log('❌ Configuration non préservée');
                }
              } else {
                console.log('❌ Colonne de configuration ne s\'ouvre pas');
              }
            } else {
              console.log('❌ Bouton "Configurer →" manquant après sauvegarde');
            }
          } else {
            console.log(`❌ Type changé en: ${type} (devrait être jsonschema)`);
          }
          break;
        }
      }
    }

    if (!foundJsonschemaProperty) {
      console.log('❌ Propriété jsonschema non trouvée après rechargement');
    }

    return false;

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: 'CLAUDE/screenshots/error-bug-test.png', fullPage: true });
    return false;
  } finally {
    await browser.close();
  }
}

// Exécution
if (require.main === module) {
  testBugCorrection()
    .then(success => {
      console.log(success ? '\n✅ TEST DE BUG RÉUSSI' : '\n❌ TEST DE BUG ÉCHOUÉ');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}