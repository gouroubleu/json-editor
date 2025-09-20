#!/usr/bin/env node

/**
 * Test visuel final pour vérifier les corrections de design
 */

const puppeteer = require('puppeteer');

async function testVisualDesign() {
  console.log('🎯 Test visuel design final');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    console.log('🌐 Navigation vers http://localhost:5503/edit/test-user');
    await page.goto('http://localhost:5503/edit/test-user', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Screenshot de l'interface initiale
    await page.screenshot({ path: 'CLAUDE/screenshots/design-test-initial.png', fullPage: true });
    console.log('📸 Screenshot interface initiale');

    // Trouver et cliquer sur la propriété jsonschema (hhh)
    const propertyCards = await page.$$('.property-card');
    let jsonschemaCard = null;

    for (const card of propertyCards) {
      const nameInput = await card.$('.property-name');
      if (nameInput) {
        const name = await page.evaluate(el => el.value, nameInput);
        if (name === 'hhh') {
          jsonschemaCard = card;
          break;
        }
      }
    }

    if (jsonschemaCard) {
      console.log('✅ Propriété jsonschema trouvée');

      // Cliquer sur "Configurer →"
      const configBtn = await jsonschemaCard.$('.explore-btn');
      if (configBtn) {
        await configBtn.click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('✅ Configuration ouverte');

        // Screenshot avec colonne de configuration
        await page.screenshot({ path: 'CLAUDE/screenshots/design-test-configuration.png', fullPage: true });
        console.log('📸 Screenshot configuration ouverte');

        // Mesurer les hauteurs des headers
        const header0Height = await page.$eval('.property-column:nth-child(1) .column-header', el => el.offsetHeight);
        const header1Height = await page.$eval('.property-column:nth-child(2) .column-header', el => el.offsetHeight);

        console.log(`📏 Hauteur header colonne 0: ${header0Height}px`);
        console.log(`📏 Hauteur header colonne 1: ${header1Height}px`);

        if (header0Height === header1Height) {
          console.log('✅ Headers parfaitement alignés');
        } else {
          console.log(`❌ Headers mal alignés (différence: ${Math.abs(header0Height - header1Height)}px)`);
        }

        // Vérifier les éléments de design
        const tests = [
          {
            name: 'Select schema stylé',
            selector: '.property-column:nth-child(2) .property-type',
            test: async (el) => {
              const styles = await page.evaluate(element => {
                const computed = window.getComputedStyle(element);
                return {
                  border: computed.border,
                  borderRadius: computed.borderRadius,
                  padding: computed.padding,
                  background: computed.backgroundColor
                };
              }, el);
              return styles.border && styles.borderRadius && styles.padding;
            }
          },
          {
            name: 'Input titre stylé',
            selector: '.property-column:nth-child(2) .property-name',
            test: async (el) => {
              const styles = await page.evaluate(element => {
                const computed = window.getComputedStyle(element);
                return {
                  border: computed.border,
                  borderRadius: computed.borderRadius,
                  padding: computed.padding,
                  background: computed.backgroundColor
                };
              }, el);
              return styles.border && styles.borderRadius && styles.padding;
            }
          },
          {
            name: 'Textarea description stylée',
            selector: '.property-column:nth-child(2) .description-input',
            test: async (el) => {
              const styles = await page.evaluate(element => {
                const computed = window.getComputedStyle(element);
                return {
                  border: computed.border,
                  borderRadius: computed.borderRadius,
                  padding: computed.padding,
                  background: computed.backgroundColor
                };
              }, el);
              return styles.border && styles.borderRadius && styles.padding;
            }
          },
          {
            name: 'Séparateurs présents',
            selector: '.property-column:nth-child(2) .config-separator',
            test: async () => {
              const separators = await page.$$('.property-column:nth-child(2) .config-separator');
              return separators.length >= 2;
            }
          }
        ];

        const results = [];
        for (const test of tests) {
          try {
            const element = await page.$(test.selector);
            if (element) {
              const passed = await test.test(element);
              results.push({ name: test.name, status: passed ? 'PASSED' : 'FAILED' });
              console.log(`${passed ? '✅' : '❌'} ${test.name}`);
            } else {
              results.push({ name: test.name, status: 'ELEMENT_NOT_FOUND' });
              console.log(`❓ ${test.name} - Élément non trouvé`);
            }
          } catch (error) {
            results.push({ name: test.name, status: 'ERROR', error: error.message });
            console.log(`🚨 ${test.name} - Erreur: ${error.message}`);
          }
        }

        // Screenshot final avec mesures
        await page.evaluate(() => {
          // Ajouter des annotations visuelles pour les mesures
          const style = document.createElement('style');
          style.textContent = `
            .debug-measure {
              position: absolute;
              background: rgba(255, 0, 0, 0.3);
              border: 1px dashed red;
              z-index: 9999;
              font-size: 12px;
              color: red;
              font-weight: bold;
              padding: 2px;
            }
          `;
          document.head.appendChild(style);

          // Marquer les headers
          const headers = document.querySelectorAll('.column-header');
          headers.forEach((header, i) => {
            const rect = header.getBoundingClientRect();
            const measure = document.createElement('div');
            measure.className = 'debug-measure';
            measure.textContent = `H${i}: ${rect.height}px`;
            measure.style.left = `${rect.left + rect.width - 80}px`;
            measure.style.top = `${rect.top}px`;
            document.body.appendChild(measure);
          });
        });

        await page.screenshot({ path: 'CLAUDE/screenshots/design-test-mesures.png', fullPage: true });
        console.log('📸 Screenshot avec mesures');

        // Sauvegarder les résultats
        const finalResults = {
          timestamp: new Date().toISOString(),
          headerHeights: {
            column0: header0Height,
            column1: header1Height,
            aligned: header0Height === header1Height
          },
          designTests: results,
          allTestsPassed: results.every(r => r.status === 'PASSED')
        };

        const fs = require('fs').promises;
        await fs.writeFile('CLAUDE/design-test-results.json', JSON.stringify(finalResults, null, 2));
        console.log('📄 Résultats sauvegardés');

        if (finalResults.allTestsPassed && finalResults.headerHeights.aligned) {
          console.log('\n🎉 DESIGN PARFAIT - TOUS LES TESTS RÉUSSIS !');
          return true;
        } else {
          console.log('\n⚠️ Certains éléments nécessitent des ajustements');
          return false;
        }
      } else {
        console.log('❌ Bouton "Configurer →" non trouvé');
      }
    } else {
      console.log('❌ Propriété jsonschema non trouvée');
    }

    return false;

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: 'CLAUDE/screenshots/error-design-test.png', fullPage: true });
    return false;
  } finally {
    await browser.close();
  }
}

// Exécution
if (require.main === module) {
  testVisualDesign()
    .then(success => {
      console.log(success ? '\n✅ TEST DESIGN RÉUSSI' : '\n❌ TEST DESIGN NÉCESSITE AJUSTEMENTS');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}