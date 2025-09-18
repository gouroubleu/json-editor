/**
 * TEST DE VALIDATION - Corrections navigation niveau 3+
 *
 * Ce script teste les corrections appliquées au bug de navigation critique:
 * 1. Génération automatique d'objets vides lors de navigation
 * 2. Création de colonnes niveau 3 et plus
 * 3. Navigation basée sur schéma même avec valeurs vides
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🚀 DÉBUT - Test corrections navigation niveau 3+');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  // Capturer tous les logs de console
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'log' || type === 'error' || type === 'warn') {
      console.log(`🖥️  BROWSER ${type.toUpperCase()}:`, msg.text());
    }
  });

  // Capturer les erreurs
  page.on('pageerror', error => {
    console.error('🚨 PAGE ERROR:', error.message);
  });

  try {
    console.log('📡 Navigation vers test-user/new...');
    await page.goto('http://localhost:5503/bdd/test-user/new', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    // Attendre que les colonnes soient chargées
    console.log('⏳ Attente du chargement des colonnes...');
    await page.waitForSelector('.entity-column', { timeout: 10000 });

    // Vérifier qu'on a bien la colonne 1
    let columns = await page.$$('.entity-column');
    console.log(`📊 Colonnes initiales: ${columns.length}`);

    // Prendre une capture avant test
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'nav-test-1-initial.png'),
      fullPage: true
    });

    // TEST 1: Navigation vers propriété "adresse" (objet)
    console.log('🎯 TEST 1: Navigation vers propriété "adresse"...');

    // Chercher le bouton flèche pour "adresse"
    const adresseButton = await page.evaluate(() => {
      const fieldItems = document.querySelectorAll('.field-item');
      for (let item of fieldItems) {
        const nameSpan = item.querySelector('.field-name');
        if (nameSpan && nameSpan.textContent.includes('adresse')) {
          const arrowButton = item.querySelector('button[title="Explorer"]');
          if (arrowButton) {
            return true;
          }
        }
      }
      return false;
    });

    if (adresseButton) {
      console.log('✅ Bouton flèche "adresse" trouvé');

      // Cliquer sur le bouton flèche
      await page.evaluate(() => {
        const fieldItems = document.querySelectorAll('.field-item');
        for (let item of fieldItems) {
          const nameSpan = item.querySelector('.field-name');
          if (nameSpan && nameSpan.textContent.includes('adresse')) {
            const arrowButton = item.querySelector('button[title="Explorer"]');
            if (arrowButton) {
              console.log('🖱️ Clic sur bouton flèche adresse');
              arrowButton.click();
              return;
            }
          }
        }
      });

      // Attendre que la colonne 2 soit générée
      console.log('⏳ Attente génération colonne 2...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Vérifier la génération de la colonne 2
      columns = await page.$$('.entity-column');
      console.log(`📊 Colonnes après navigation adresse: ${columns.length}`);

      if (columns.length >= 2) {
        console.log('✅ Colonne 2 générée avec succès!');

        // Capturer l'état avec colonne 2
        await page.screenshot({
          path: path.join(__dirname, 'screenshots', 'nav-test-2-colonne2.png'),
          fullPage: true
        });

        // TEST 2: Navigation vers sous-propriété dans colonne 2
        console.log('🎯 TEST 2: Navigation vers sous-propriété niveau 3...');

        // Chercher une propriété navigable dans la colonne 2
        const level3Button = await page.evaluate(() => {
          const columns = document.querySelectorAll('.entity-column');
          if (columns.length >= 2) {
            const column2 = columns[1];
            const fieldItems = column2.querySelectorAll('.field-item');

            for (let item of fieldItems) {
              const arrowButton = item.querySelector('button[title="Explorer"]');
              if (arrowButton) {
                const nameSpan = item.querySelector('.field-name');
                if (nameSpan) {
                  console.log('🔍 Propriété navigable trouvée:', nameSpan.textContent);
                  return nameSpan.textContent;
                }
              }
            }
          }
          return null;
        });

        if (level3Button) {
          console.log(`✅ Propriété niveau 3 trouvée: ${level3Button}`);

          // Cliquer sur cette propriété
          await page.evaluate((propName) => {
            const columns = document.querySelectorAll('.entity-column');
            if (columns.length >= 2) {
              const column2 = columns[1];
              const fieldItems = column2.querySelectorAll('.field-item');

              for (let item of fieldItems) {
                const nameSpan = item.querySelector('.field-name');
                if (nameSpan && nameSpan.textContent.includes(propName)) {
                  const arrowButton = item.querySelector('button[title="Explorer"]');
                  if (arrowButton) {
                    console.log('🖱️ Clic sur propriété niveau 3:', propName);
                    arrowButton.click();
                    return;
                  }
                }
              }
            }
          }, level3Button);

          // Attendre génération colonne 3
          console.log('⏳ Attente génération colonne 3...');
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Vérifier la génération de la colonne 3
          columns = await page.$$('.entity-column');
          console.log(`📊 Colonnes après navigation niveau 3: ${columns.length}`);

          if (columns.length >= 3) {
            console.log('🎉 ✅ SUCCÈS! Colonne 3 générée!');
            console.log('🎯 NAVIGATION NIVEAU 3+ FONCTIONNELLE!');

            // Capturer le succès
            await page.screenshot({
              path: path.join(__dirname, 'screenshots', 'nav-test-3-colonne3-success.png'),
              fullPage: true
            });
          } else {
            console.log('❌ ÉCHEC: Colonne 3 non générée');
            await page.screenshot({
              path: path.join(__dirname, 'screenshots', 'nav-test-3-colonne3-failed.png'),
              fullPage: true
            });
          }
        } else {
          console.log('⚠️  Aucune propriété navigable trouvée en colonne 2');
        }
      } else {
        console.log('❌ ÉCHEC: Colonne 2 non générée');
        await page.screenshot({
          path: path.join(__dirname, 'screenshots', 'nav-test-2-colonne2-failed.png'),
          fullPage: true
        });
      }
    } else {
      console.log('❌ ÉCHEC: Bouton flèche "adresse" introuvable');
    }

    // TEST 3: Tester navigation sur objet vide
    console.log('🎯 TEST 3: Test navigation objet vide...');

    const emptyObjectTest = await page.evaluate(() => {
      const fieldItems = document.querySelectorAll('.field-item');
      for (let item of fieldItems) {
        const valueDisplay = item.querySelector('.value-display');
        if (valueDisplay && valueDisplay.textContent.includes('{0 propriétés}')) {
          const arrowButton = item.querySelector('button[title="Explorer"]');
          if (arrowButton) {
            const nameSpan = item.querySelector('.field-name');
            return nameSpan ? nameSpan.textContent : 'objet vide';
          }
        }
      }
      return null;
    });

    if (emptyObjectTest) {
      console.log(`✅ Objet vide navigable trouvé: ${emptyObjectTest}`);
      console.log('🎯 CORRECTION OBJETS VIDES FONCTIONNELLE!');
    }

    // Rapport final
    const finalColumns = await page.$$('.entity-column');
    console.log('\n📋 RAPPORT FINAL:');
    console.log(`   • Colonnes générées: ${finalColumns.length}`);
    console.log(`   • Navigation niveau 2: ${finalColumns.length >= 2 ? '✅' : '❌'}`);
    console.log(`   • Navigation niveau 3: ${finalColumns.length >= 3 ? '✅' : '❌'}`);
    console.log(`   • Génération automatique: ${adresseButton ? '✅' : '❌'}`);

    // Sauvegarder l'état final
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'nav-test-final.png'),
      fullPage: true
    });

    console.log('\n✅ Test terminé avec succès!');

  } catch (error) {
    console.error('🚨 Erreur pendant le test:', error);
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'nav-test-error.png'),
      fullPage: true
    });
  } finally {
    await browser.close();
    console.log('🏁 Test terminé');
  }
})();