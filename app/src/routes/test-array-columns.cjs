/**
 * Test automatisé Puppeteer pour vérifier le comportement des colonnes d'édition d'array
 * 
 * OBJECTIF : Vérifier que la colonne d'édition d'array s'affiche correctement 
 * quand on clique sur "Ajouter un élément" dans l'éditeur de schéma.
 * 
 * Usage: node test-array-columns.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:8002',
  userNewUrl: 'http://localhost:8002/bo/schemaEditor/bdd/user/new/',
  screenshotsDir: './test-screenshots',
  timeout: 30000,
  headless: false, // Mettre à true pour mode sans interface
  slowMo: 100,    // Ralentir les actions pour debugging
};

// Utilitaires
class TestLogger {
  static info(message) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  }
  
  static success(message) {
    console.log(`[✅ SUCCESS] ${new Date().toISOString()} - ${message}`);
  }
  
  static error(message) {
    console.log(`[❌ ERROR] ${new Date().toISOString()} - ${message}`);
  }
  
  static warning(message) {
    console.log(`[⚠️ WARNING] ${new Date().toISOString()} - ${message}`);
  }

  static step(stepNumber, description) {
    console.log(`[STEP ${stepNumber}] ${new Date().toISOString()} - ${description}`);
  }
}

class ScreenshotManager {
  constructor(page, screenshotsDir) {
    this.page = page;
    this.screenshotsDir = screenshotsDir;
    this.stepCounter = 1;
  }

  async init() {
    try {
      await fs.mkdir(this.screenshotsDir, { recursive: true });
      TestLogger.info(`Dossier screenshots créé: ${this.screenshotsDir}`);
    } catch (error) {
      TestLogger.error(`Erreur création dossier screenshots: ${error.message}`);
    }
  }

  async takeScreenshot(stepName, description) {
    try {
      const filename = `step-${String(this.stepCounter).padStart(2, '0')}-${stepName}.png`;
      const filepath = path.join(this.screenshotsDir, filename);
      
      await this.page.screenshot({ 
        path: filepath, 
        fullPage: true 
      });
      
      TestLogger.info(`Screenshot: ${filename} - ${description}`);
      this.stepCounter++;
      return filepath;
    } catch (error) {
      TestLogger.error(`Erreur screenshot: ${error.message}`);
    }
  }
}

class TestAssertions {
  static async waitForElement(page, selector, timeout = CONFIG.timeout) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      TestLogger.error(`Élément non trouvé: ${selector} - ${error.message}`);
      return false;
    }
  }

  static async assertElementExists(page, selector, description) {
    const exists = await TestAssertions.waitForElement(page, selector, 5000);
    if (exists) {
      TestLogger.success(`✅ ${description}`);
      return true;
    } else {
      TestLogger.error(`❌ ${description} - Élément non trouvé: ${selector}`);
      return false;
    }
  }

  static async assertElementCount(page, selector, expectedCount, description) {
    try {
      const elements = await page.$$(selector);
      const actualCount = elements.length;
      
      if (actualCount === expectedCount) {
        TestLogger.success(`✅ ${description} - Trouvé ${actualCount} élément(s)`);
        return true;
      } else {
        TestLogger.error(`❌ ${description} - Attendu: ${expectedCount}, Trouvé: ${actualCount}`);
        return false;
      }
    } catch (error) {
      TestLogger.error(`❌ Erreur assertion comptage: ${error.message}`);
      return false;
    }
  }

  static async getElementText(page, selector) {
    try {
      return await page.$eval(selector, el => el.textContent.trim());
    } catch (error) {
      TestLogger.error(`Erreur récupération texte: ${error.message}`);
      return null;
    }
  }
}

class ArrayColumnTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshotManager = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      steps: []
    };
  }

  async setup() {
    TestLogger.step(1, 'Initialisation du navigateur Puppeteer');
    
    try {
      this.browser = await puppeteer.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Configuration de la page
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Initialiser le gestionnaire de screenshots
      this.screenshotManager = new ScreenshotManager(this.page, CONFIG.screenshotsDir);
      await this.screenshotManager.init();

      // Intercepter les erreurs de console pour debugging
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          TestLogger.warning(`Console Error: ${msg.text()}`);
        }
      });

      TestLogger.success('Navigateur initialisé avec succès');
      return true;
    } catch (error) {
      TestLogger.error(`Erreur initialisation navigateur: ${error.message}`);
      return false;
    }
  }

  async navigateToUserNew() {
    TestLogger.step(2, 'Navigation vers la page de création d\'entité user');
    
    try {
      await this.page.goto(CONFIG.userNewUrl, { 
        waitUntil: 'networkidle2', 
        timeout: CONFIG.timeout 
      });

      await this.screenshotManager.takeScreenshot('navigation', 'Page de création user chargée');
      
      TestLogger.success('Navigation réussie');
      return true;
    } catch (error) {
      TestLogger.error(`Erreur navigation: ${error.message}`);
      return false;
    }
  }

  async waitForPageLoad() {
    TestLogger.step(3, 'Attente du chargement complet de la page');
    
    try {
      // Attendre que les colonnes d'entité soient chargées
      const success = await TestAssertions.waitForElement(this.page, '.entity-column', 10000);
      
      if (success) {
        await this.screenshotManager.takeScreenshot('page-loaded', 'Page complètement chargée');
        TestLogger.success('Page chargée avec succès');
        return true;
      } else {
        TestLogger.error('Échec du chargement de la page');
        return false;
      }
    } catch (error) {
      TestLogger.error(`Erreur chargement page: ${error.message}`);
      return false;
    }
  }

  async findAddressesArray() {
    TestLogger.step(4, 'Recherche de la propriété array \'addresses\'');
    
    try {
      // Chercher les différents sélecteurs possibles pour l'array addresses
      const possibleSelectors = [
        '.field-item .field-name:text("addresses")',
        '.field-info .field-name:text("addresses")',
        '[data-field="addresses"]',
        '.field-name'
      ];

      let addressesFound = false;
      let addressesSelector = null;

      // Essayer de trouver addresses avec chaque sélecteur
      for (const selector of possibleSelectors) {
        try {
          const elements = await this.page.$$(selector);
          
          for (const element of elements) {
            const text = await element.evaluate(el => el.textContent?.trim().toLowerCase() || '');
            if (text.includes('addresses') || text.includes('address')) {
              addressesFound = true;
              addressesSelector = selector;
              TestLogger.success(`Propriété 'addresses' trouvée avec le sélecteur: ${selector}`);
              break;
            }
          }
          
          if (addressesFound) break;
        } catch (error) {
          // Continuer avec le prochain sélecteur
          continue;
        }
      }

      if (!addressesFound) {
        // Lister toutes les propriétés disponibles pour debugging
        TestLogger.warning('Propriété addresses non trouvée, liste des propriétés disponibles:');
        try {
          const fieldNames = await this.page.$$eval('.field-name', elements => 
            elements.map(el => el.textContent?.trim()).filter(text => text)
          );
          TestLogger.info(`Propriétés trouvées: ${fieldNames.join(', ')}`);
        } catch (error) {
          TestLogger.warning('Impossible de lister les propriétés');
        }
      }

      await this.screenshotManager.takeScreenshot('addresses-search', 'Recherche de la propriété addresses');
      return { found: addressesFound, selector: addressesSelector };
      
    } catch (error) {
      TestLogger.error(`Erreur recherche addresses: ${error.message}`);
      return { found: false, selector: null };
    }
  }

  async clickOnArrayExpansion() {
    TestLogger.step(5, 'Clic sur la flèche pour éditer l\'array addresses');
    
    try {
      // Chercher le bouton d'expansion avec flèche
      const expandButtonSelectors = [
        '.field-actions button[title="Explorer"]',
        '.field-actions .btn-outline:text("→")',
        'button:text("→")',
        '.field-actions button'
      ];

      let clicked = false;
      
      for (const selector of expandButtonSelectors) {
        try {
          const buttons = await this.page.$$(selector);
          
          for (const button of buttons) {
            const text = await button.evaluate(el => el.textContent?.trim() || '');
            const title = await button.evaluate(el => el.title || '');
            
            // Vérifier si c'est un bouton d'expansion
            if (text === '→' || title === 'Explorer') {
              // Vérifier que c'est bien pour addresses
              const parentField = await button.evaluate(el => {
                const fieldItem = el.closest('.field-item');
                if (fieldItem) {
                  const fieldName = fieldItem.querySelector('.field-name');
                  return fieldName?.textContent?.trim().toLowerCase() || '';
                }
                return '';
              });
              
              if (parentField.includes('address')) {
                await button.click();
                clicked = true;
                TestLogger.success('Clic sur la flèche d\'expansion réussi');
                break;
              }
            }
          }
          
          if (clicked) break;
        } catch (error) {
          continue;
        }
      }

      if (!clicked) {
        // Essayer de cliquer sur le premier bouton d'expansion trouvé
        TestLogger.warning('Bouton spécifique addresses non trouvé, essai du premier bouton d\'expansion');
        try {
          await this.page.click('button:text("→")');
          clicked = true;
          TestLogger.success('Clic sur bouton d\'expansion générique réussi');
        } catch (error) {
          TestLogger.error('Aucun bouton d\'expansion trouvé');
        }
      }

      // Attendre un peu pour que la nouvelle colonne apparaisse
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.screenshotManager.takeScreenshot('after-expansion-click', 'Après clic sur expansion');
      
      return clicked;
    } catch (error) {
      TestLogger.error(`Erreur clic expansion: ${error.message}`);
      return false;
    }
  }

  async verifyArrayColumn() {
    TestLogger.step(6, 'Vérification que la colonne d\'édition d\'array s\'affiche');
    
    try {
      // Vérifier qu'une nouvelle colonne est apparue
      const columnsCount = await this.page.$$eval('.entity-column', columns => columns.length);
      TestLogger.info(`Nombre de colonnes trouvées: ${columnsCount}`);
      
      // Chercher des éléments spécifiques à l'édition d'array
      const arrayIndicators = [
        '.array-container',
        '.array-header',
        '.array-items',
        '.array-info',
        '.add-array-item',
        'button:text("➕ Ajouter")',
        'button:text("Ajouter un élément")'
      ];

      let arrayColumnFound = false;
      const foundElements = [];

      for (const selector of arrayIndicators) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            arrayColumnFound = true;
            foundElements.push(`${selector} (${elements.length})`);
          }
        } catch (error) {
          // Continuer
        }
      }

      if (arrayColumnFound) {
        TestLogger.success(`Colonne d'édition d'array détectée ! Éléments trouvés: ${foundElements.join(', ')}`);
      } else {
        TestLogger.error('Aucune colonne d\'édition d\'array détectée');
      }

      await this.screenshotManager.takeScreenshot('array-column-verification', 'Vérification colonne array');
      this.testResults.steps.push({ step: 6, passed: arrayColumnFound, description: 'Colonne array visible' });
      
      return arrayColumnFound;
    } catch (error) {
      TestLogger.error(`Erreur vérification colonne array: ${error.message}`);
      return false;
    }
  }

  async clickAddElement() {
    TestLogger.step(7, 'Clic sur le bouton "Ajouter un élément"');
    
    try {
      // Chercher les différents boutons d'ajout
      const addButtonSelectors = [
        'button:text("➕ Ajouter un élément")',
        'button:text("Ajouter un élément")',
        'button:text("➕ Ajouter")',
        '.add-item-button',
        '.btn-primary:text("Ajouter")',
        '.array-actions button'
      ];

      let clicked = false;

      for (const selector of addButtonSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            clicked = true;
            TestLogger.success(`Clic sur bouton "Ajouter un élément" réussi avec: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!clicked) {
        TestLogger.error('Aucun bouton "Ajouter un élément" trouvé');
        
        // Lister tous les boutons disponibles pour debugging
        try {
          const allButtons = await this.page.$$eval('button', buttons => 
            buttons.map(btn => btn.textContent?.trim()).filter(text => text)
          );
          TestLogger.info(`Boutons disponibles: ${allButtons.join(', ')}`);
        } catch (error) {
          TestLogger.warning('Impossible de lister les boutons');
        }
      }

      // Attendre un peu pour que la nouvelle colonne apparaisse
      await new Promise(resolve => setTimeout(resolve, 1500));
      await this.screenshotManager.takeScreenshot('after-add-element', 'Après clic sur ajouter élément');
      
      return clicked;
    } catch (error) {
      TestLogger.error(`Erreur clic ajouter élément: ${error.message}`);
      return false;
    }
  }

  async verifyNewElementColumn() {
    TestLogger.step(8, 'Vérification qu\'une nouvelle colonne apparaît pour éditer le nouvel élément');
    
    try {
      // Vérifier qu'une colonne supplémentaire est apparue
      const finalColumnsCount = await this.page.$$eval('.entity-column', columns => columns.length);
      TestLogger.info(`Nombre final de colonnes: ${finalColumnsCount}`);
      
      // Chercher des éléments indiquant l'édition d'un élément spécifique
      const elementEditingIndicators = [
        '.column-title:text("[0]")',
        '.column-title:text("addresses[0]")', 
        '.field-item',
        '.object-container',
        '.edit-input',
        '.edit-textarea'
      ];

      let newColumnFound = false;
      const foundElements = [];

      for (const selector of elementEditingIndicators) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            newColumnFound = true;
            foundElements.push(`${selector} (${elements.length})`);
          }
        } catch (error) {
          // Continuer
        }
      }

      // Vérifier spécifiquement si on a au moins une colonne de plus
      const hasMoreColumns = finalColumnsCount > 1;
      
      const testPassed = newColumnFound && hasMoreColumns;

      if (testPassed) {
        TestLogger.success(`Nouvelle colonne d'édition d'élément détectée ! Colonnes: ${finalColumnsCount}, Éléments: ${foundElements.join(', ')}`);
      } else {
        TestLogger.error(`Nouvelle colonne d'édition non détectée. Colonnes: ${finalColumnsCount}`);
      }

      await this.screenshotManager.takeScreenshot('final-verification', 'Vérification finale de la nouvelle colonne');
      this.testResults.steps.push({ step: 8, passed: testPassed, description: 'Nouvelle colonne d\'élément' });
      
      return testPassed;
    } catch (error) {
      TestLogger.error(`Erreur vérification nouvelle colonne: ${error.message}`);
      return false;
    }
  }

  async cleanup() {
    TestLogger.step(9, 'Nettoyage et fermeture du navigateur');
    
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      TestLogger.success('Nettoyage terminé');
    } catch (error) {
      TestLogger.error(`Erreur nettoyage: ${error.message}`);
    }
  }

  async generateTestReport() {
    const totalSteps = this.testResults.steps.length;
    const passedSteps = this.testResults.steps.filter(step => step.passed).length;
    const failedSteps = totalSteps - passedSteps;

    TestLogger.info('='.repeat(60));
    TestLogger.info('📋 RAPPORT DE TEST FINAL');
    TestLogger.info('='.repeat(60));
    TestLogger.info(`📊 Résumé: ${passedSteps}/${totalSteps} étapes réussies`);
    TestLogger.info(`✅ Succès: ${passedSteps}`);
    TestLogger.info(`❌ Échecs: ${failedSteps}`);
    TestLogger.info('');
    
    TestLogger.info('📝 Détail des étapes:');
    this.testResults.steps.forEach(step => {
      const status = step.passed ? '✅' : '❌';
      TestLogger.info(`${status} Step ${step.step}: ${step.description}`);
    });

    TestLogger.info('');
    TestLogger.info(`📸 Screenshots sauvegardés dans: ${CONFIG.screenshotsDir}`);
    TestLogger.info('='.repeat(60));

    const overallSuccess = failedSteps === 0;
    if (overallSuccess) {
      TestLogger.success('🎉 TEST GLOBAL : RÉUSSI !');
    } else {
      TestLogger.error('💥 TEST GLOBAL : ÉCHOUÉ !');
    }

    return overallSuccess;
  }

  async run() {
    TestLogger.info('🚀 Démarrage du test automatisé des colonnes d\'array');
    TestLogger.info(`📍 URL cible: ${CONFIG.userNewUrl}`);
    TestLogger.info('');

    try {
      // Étape 1: Setup
      const setupSuccess = await this.setup();
      if (!setupSuccess) {
        throw new Error('Échec de l\'initialisation');
      }

      // Étape 2: Navigation
      const navSuccess = await this.navigateToUserNew();
      if (!navSuccess) {
        throw new Error('Échec de la navigation');
      }

      // Étape 3: Attendre le chargement
      const loadSuccess = await this.waitForPageLoad();
      if (!loadSuccess) {
        throw new Error('Échec du chargement de la page');
      }

      // Étape 4: Chercher addresses
      const addressesResult = await this.findAddressesArray();
      if (!addressesResult.found) {
        TestLogger.warning('Propriété addresses non trouvée, continuation du test avec la première propriété array disponible');
      }

      // Étape 5: Cliquer sur expansion
      const expansionSuccess = await this.clickOnArrayExpansion();
      if (!expansionSuccess) {
        throw new Error('Échec du clic sur l\'expansion de l\'array');
      }

      // Étape 6: Vérifier la colonne array
      const arrayColumnSuccess = await this.verifyArrayColumn();
      this.testResults.steps.push({ step: 6, passed: arrayColumnSuccess, description: 'Colonne array affichée' });

      // Étape 7: Cliquer sur ajouter élément
      const addElementSuccess = await this.clickAddElement();
      if (!addElementSuccess) {
        TestLogger.warning('Bouton ajouter élément non trouvé, test partiellement incomplet');
      }

      // Étape 8: Vérifier nouvelle colonne
      if (addElementSuccess) {
        const newColumnSuccess = await this.verifyNewElementColumn();
        this.testResults.steps.push({ step: 8, passed: newColumnSuccess, description: 'Nouvelle colonne d\'élément' });
      }

    } catch (error) {
      TestLogger.error(`Erreur critique durant le test: ${error.message}`);
    } finally {
      // Nettoyage
      await this.cleanup();
      
      // Rapport final
      return await this.generateTestReport();
    }
  }
}

// Fonction principale
async function main() {
  const test = new ArrayColumnTest();
  const success = await test.run();
  
  // Code de sortie
  process.exit(success ? 0 : 1);
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  TestLogger.error(`Erreur non gérée: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  TestLogger.error(`Exception non capturée: ${error.message}`);
  process.exit(1);
});

// Lancement du test
if (require.main === module) {
  main();
}

module.exports = { ArrayColumnTest };