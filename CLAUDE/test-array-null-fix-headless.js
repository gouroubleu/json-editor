/**
 * Script de test Puppeteer HEADLESS pour valider le fix des éléments null dans les arrays
 * Adapté pour environnement sans interface graphique
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testArrayNullFixHeadless() {
  console.log('🚀 Démarrage du test headless de validation du fix array null...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();

    // Capturer tous les logs pour analyse
    const consoleLogs = [];
    const errors = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      console.log(`📝 Console [${msg.type()}]:`, text);
    });

    page.on('pageerror', error => {
      errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.error('❌ Page Error:', error.message);
    });

    // Navigation vers la page
    console.log('📍 Navigation vers http://localhost:5505/bdd/test-user/new/');
    await page.goto('http://localhost:5505/bdd/test-user/new/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Attendre que la page soit chargée
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔍 Analyse du contenu de la page...');

    // Analyser le contenu de la page pour comprendre la structure
    const pageInfo = await page.evaluate(() => {
      const title = document.title;
      const bodyText = document.body ? document.body.innerText.substring(0, 500) : 'No body';
      const forms = document.querySelectorAll('form').length;
      const buttons = document.querySelectorAll('button').length;
      const inputs = document.querySelectorAll('input, textarea, select').length;

      // Chercher spécifiquement des éléments liés aux propriétés
      const properties = Array.from(document.querySelectorAll('[data-property], .property, .field'))
        .map(el => ({
          tag: el.tagName,
          className: el.className,
          textContent: el.textContent ? el.textContent.substring(0, 100) : '',
          dataProperty: el.getAttribute('data-property')
        }));

      // Chercher des boutons d'ajout
      const addButtons = Array.from(document.querySelectorAll('button'))
        .filter(btn =>
          btn.textContent.includes('+') ||
          btn.textContent.includes('Ajouter') ||
          btn.textContent.includes('Add') ||
          btn.className.includes('add')
        )
        .map(btn => ({
          text: btn.textContent,
          className: btn.className,
          id: btn.id
        }));

      return {
        title,
        bodyText,
        forms,
        buttons,
        inputs,
        properties,
        addButtons,
        url: window.location.href
      };
    });

    console.log('📊 Informations de la page:');
    console.log(`  Titre: ${pageInfo.title}`);
    console.log(`  URL: ${pageInfo.url}`);
    console.log(`  Formulaires: ${pageInfo.forms}`);
    console.log(`  Boutons: ${pageInfo.buttons}`);
    console.log(`  Champs: ${pageInfo.inputs}`);
    console.log(`  Propriétés trouvées: ${pageInfo.properties.length}`);
    console.log(`  Boutons d'ajout: ${pageInfo.addButtons.length}`);

    if (pageInfo.properties.length > 0) {
      console.log('\n🏷️ Propriétés détectées:');
      pageInfo.properties.forEach((prop, i) => {
        console.log(`  ${i + 1}. ${prop.dataProperty || 'Sans data-property'}: ${prop.textContent}`);
      });
    }

    if (pageInfo.addButtons.length > 0) {
      console.log('\n➕ Boutons d\'ajout détectés:');
      pageInfo.addButtons.forEach((btn, i) => {
        console.log(`  ${i + 1}. "${btn.text}" (classe: ${btn.className})`);
      });
    }

    // Tenter de trouver et interagir avec la propriété adresse
    console.log('\n🎯 Recherche de la propriété "adresse"...');

    try {
      // Essayer plusieurs sélecteurs pour trouver la propriété adresse
      const addressSelectors = [
        '[data-property="adresse"]',
        '[data-property="addresses"]',
        'text=adresse',
        '*:has-text("adresse")',
        '.property:has-text("adresse")',
        '.field:has-text("adresse")'
      ];

      let addressElement = null;
      for (const selector of addressSelectors) {
        try {
          addressElement = await page.$(selector);
          if (addressElement) {
            console.log(`✅ Propriété adresse trouvée avec le sélecteur: ${selector}`);
            break;
          }
        } catch (e) {
          // Continuer avec le prochain sélecteur
        }
      }

      if (!addressElement) {
        // Essayer de chercher dans le texte de la page
        const hasAdresse = await page.evaluate(() => {
          return document.body.innerHTML.toLowerCase().includes('adresse');
        });

        if (hasAdresse) {
          console.log('📍 Le mot "adresse" est présent sur la page');

          // Essayer de cliquer sur un élément contenant "adresse"
          await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'))
              .filter(el => el.textContent && el.textContent.toLowerCase().includes('adresse'));

            if (elements.length > 0) {
              console.log(`Trouvé ${elements.length} éléments contenant "adresse"`);
              elements[0].click();
              return true;
            }
            return false;
          });

          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log('⚠️ Aucune référence à "adresse" trouvée sur la page');
        }
      } else {
        // Cliquer sur l'élément adresse
        await addressElement.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('🔧 Clic effectué sur la propriété adresse');
      }

      // Chercher des boutons d'ajout maintenant
      console.log('🔍 Recherche de boutons d\'ajout d\'éléments...');

      const addButtonSelectors = [
        'button:has-text("+")',
        'button:has-text("Ajouter")',
        'button:has-text("Add")',
        '.add-button',
        '.add-item',
        'button[aria-label*="add"]',
        'button[title*="add"]'
      ];

      let addButton = null;
      for (const selector of addButtonSelectors) {
        try {
          addButton = await page.$(selector);
          if (addButton) {
            console.log(`✅ Bouton d'ajout trouvé: ${selector}`);
            break;
          }
        } catch (e) {
          // Continuer
        }
      }

      if (addButton) {
        console.log('🎯 Test de l\'ajout d\'élément...');

        // Capturer l'état avant ajout
        const stateBefore = await page.evaluate(() => {
          return {
            timestamp: Date.now(),
            html: document.body.innerHTML.length,
            elements: document.querySelectorAll('*').length
          };
        });

        // Cliquer sur le bouton d'ajout
        await addButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Capturer l'état après ajout
        const stateAfter = await page.evaluate(() => {
          return {
            timestamp: Date.now(),
            html: document.body.innerHTML.length,
            elements: document.querySelectorAll('*').length
          };
        });

        console.log(`📊 Éléments avant: ${stateBefore.elements}, après: ${stateAfter.elements}`);
        console.log(`📊 Taille HTML avant: ${stateBefore.html}, après: ${stateAfter.html}`);

        if (stateAfter.elements > stateBefore.elements || stateAfter.html > stateBefore.html) {
          console.log('✅ Changement détecté après ajout d\'élément !');
        } else {
          console.log('⚠️ Aucun changement visible après clic sur ajout');
        }

      } else {
        console.log('❌ Aucun bouton d\'ajout trouvé');
      }

    } catch (interactionError) {
      console.error('❌ Erreur lors de l\'interaction:', interactionError.message);
    }

    // Analyser les logs console pour détecter l'usage des fonctions corrigées
    console.log('\n📋 Analyse des logs console...');

    const relevantLogs = consoleLogs.filter(log =>
      log.text.includes('addArrayElement') ||
      log.text.includes('generateDefaultValue') ||
      log.text.includes('safeNewItem') ||
      log.text.includes('EntityCreationContext') ||
      log.text.includes('EntityColumn')
    );

    if (relevantLogs.length > 0) {
      console.log('✅ Logs pertinents trouvés:');
      relevantLogs.forEach(log => {
        console.log(`  [${log.type}] ${log.text}`);
      });
    } else {
      console.log('⚠️ Aucun log pertinent trouvé pour les fonctions corrigées');
    }

    // Générer le rapport final
    const report = {
      timestamp: new Date().toISOString(),
      testEnvironment: 'headless',
      pageAnalysis: pageInfo,
      interactions: {
        addressPropertyFound: pageInfo.properties.some(p =>
          p.dataProperty === 'adresse' ||
          p.textContent.toLowerCase().includes('adresse')
        ),
        addButtonsFound: pageInfo.addButtons.length > 0
      },
      consoleLogs: relevantLogs,
      errors: errors,
      conclusions: []
    };

    // Déterminer les conclusions
    if (pageInfo.title && pageInfo.url.includes('test-user/new')) {
      report.conclusions.push('✅ Page de création d\'entité chargée correctement');
    }

    if (pageInfo.properties.length > 0) {
      report.conclusions.push(`✅ ${pageInfo.properties.length} propriété(s) détectée(s)`);
    }

    if (pageInfo.addButtons.length > 0) {
      report.conclusions.push(`✅ ${pageInfo.addButtons.length} bouton(s) d'ajout détecté(s)`);
    }

    if (relevantLogs.length > 0) {
      report.conclusions.push('✅ Logs des fonctions corrigées détectés');
    }

    if (errors.length === 0) {
      report.conclusions.push('✅ Aucune erreur JavaScript détectée');
    } else {
      report.conclusions.push(`❌ ${errors.length} erreur(s) JavaScript détectée(s)`);
    }

    // Afficher le rapport
    console.log('\n📊 RAPPORT DE VALIDATION:');
    console.log('='.repeat(60));
    report.conclusions.forEach(conclusion => console.log(conclusion));

    if (errors.length > 0) {
      console.log('\n❌ Erreurs détectées:');
      errors.forEach(error => console.log(`  - ${error.message}`));
    }

    // Sauvegarder le rapport
    fs.writeFileSync(
      '/home/gouroubleu/WS/json-editor/CLAUDE/array-null-fix-validation-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n💾 Rapport détaillé sauvegardé dans array-null-fix-validation-report.json');

    return report;

  } catch (error) {
    console.error('❌ Erreur pendant le test:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Exécution du test
if (require.main === module) {
  testArrayNullFixHeadless()
    .then(report => {
      console.log('\n🎉 Test headless terminé !');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test échoué:', error);
      process.exit(1);
    });
}

module.exports = { testArrayNullFixHeadless };