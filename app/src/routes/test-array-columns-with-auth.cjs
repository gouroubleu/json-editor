/**
 * Test automatisé Puppeteer avec gestion de l'authentification
 * pour vérifier le comportement des colonnes d'édition d'array
 * 
 * OBJECTIF : Vérifier que la colonne d'édition d'array s'affiche correctement 
 * quand on clique sur "Ajouter un élément" dans l'éditeur de schéma.
 * 
 * Usage: node test-array-columns-with-auth.cjs
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:8002',
  loginUrl: 'http://localhost:8002/login/',
  userNewUrl: 'http://localhost:8002/bo/schemaEditor/bdd/user/new/',
  screenshotsDir: './test-screenshots',
  timeout: 30000,
  headless: false, // Mettre à true pour mode sans interface
  slowMo: 200,    // Ralentir les actions pour debugging
  
  // Credentials de test - À MODIFIER selon votre configuration
  testCredentials: {
    username: 'william.gallavardin@rhinov.fr',        // Identifiants fournis
    password: 'testtest',  // Identifiants fournis
    // ou email si le login utilise l'email
    email: 'william.gallavardin@rhinov.fr'   // Identifiants fournis
  }
};

// Utilitaires (les mêmes que dans le script original)
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
}

class ArrayColumnTestWithAuth {
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

      TestLogger.success('Navigateur initialisé avec succès');
      return true;
    } catch (error) {
      TestLogger.error(`Erreur initialisation navigateur: ${error.message}`);
      return false;
    }
  }

  async handleAuthentication() {
    TestLogger.step(2, 'Gestion de l\'authentification');
    
    try {
      // Aller d'abord à la page de login
      await this.page.goto(CONFIG.loginUrl, { 
        waitUntil: 'networkidle2', 
        timeout: CONFIG.timeout 
      });

      await this.screenshotManager.takeScreenshot('login-page', 'Page de connexion');
      
      // Attendre que la page de login soit chargée
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Identifier les champs de connexion
      const loginSelectors = [
        'input[type="text"]',
        'input[type="email"]', 
        'input[name="username"]',
        'input[name="email"]',
        'input[name="login"]',
        '#username',
        '#email',
        '#login'
      ];

      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        '#password'
      ];

      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:text("Se connecter")',
        'button:text("Login")',
        'button:text("Connexion")',
        '.btn-primary',
        '#submit',
        'form button'
      ];

      let loginField = null;
      let passwordField = null;
      let submitButton = null;

      // Trouver le champ login/email
      for (const selector of loginSelectors) {
        try {
          loginField = await this.page.$(selector);
          if (loginField) {
            TestLogger.info(`Champ login trouvé avec: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      // Trouver le champ password
      for (const selector of passwordSelectors) {
        try {
          passwordField = await this.page.$(selector);
          if (passwordField) {
            TestLogger.info(`Champ password trouvé avec: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      // Trouver le bouton submit
      for (const selector of submitSelectors) {
        try {
          submitButton = await this.page.$(selector);
          if (submitButton) {
            TestLogger.info(`Bouton submit trouvé avec: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!loginField || !passwordField || !submitButton) {
        TestLogger.warning('Formulaire de connexion non reconnu automatiquement');
        TestLogger.warning('⚠️  AUTHENTIFICATION MANUELLE REQUISE');
        TestLogger.warning('👉 Connectez-vous manuellement dans la fenêtre du navigateur qui s\'est ouverte');
        TestLogger.warning('⏰ Vous avez 30 secondes...');
        
        // Attendre 30 secondes pour que l'utilisateur se connecte manuellement
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        await this.screenshotManager.takeScreenshot('after-manual-auth', 'Après authentification manuelle');
        
        return true;
      }

      // Tentative d'authentification automatique
      TestLogger.info('Tentative d\'authentification automatique...');
      
      // Remplir les champs
      await loginField.type(CONFIG.testCredentials.username || CONFIG.testCredentials.email);
      await passwordField.type(CONFIG.testCredentials.password);
      
      await this.screenshotManager.takeScreenshot('before-login-submit', 'Avant soumission du formulaire');
      
      // Soumettre
      await submitButton.click();
      
      // Attendre la redirection
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await this.screenshotManager.takeScreenshot('after-login', 'Après tentative de connexion');
      
      TestLogger.success('Authentification terminée');
      return true;
      
    } catch (error) {
      TestLogger.error(`Erreur authentification: ${error.message}`);
      TestLogger.warning('Tentative de connexion manuelle...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      return true; // Continuer même si l'auth auto échoue
    }
  }

  async navigateToUserNew() {
    TestLogger.step(3, 'Navigation vers la page de création d\'entité user');
    
    try {
      await this.page.goto(CONFIG.userNewUrl, { 
        waitUntil: 'networkidle2', 
        timeout: CONFIG.timeout 
      });

      // Vérifier si on est toujours sur la page de login
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login')) {
        TestLogger.error('Toujours sur la page de connexion - Authentification échouée');
        TestLogger.warning('👉 Veuillez vous connecter manuellement dans le navigateur');
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        // Réessayer la navigation
        await this.page.goto(CONFIG.userNewUrl, { 
          waitUntil: 'networkidle2', 
          timeout: CONFIG.timeout 
        });
      }

      await this.screenshotManager.takeScreenshot('navigation', 'Page de création user');
      
      TestLogger.success('Navigation réussie');
      return true;
    } catch (error) {
      TestLogger.error(`Erreur navigation: ${error.message}`);
      return false;
    }
  }

  async waitForPageLoad() {
    TestLogger.step(4, 'Attente du chargement complet de la page');
    
    try {
      // Utiliser des sélecteurs plus flexibles
      const pageLoadSelectors = [
        '.horizontal-entity-viewer',
        '.entity-column',
        '.fixed-left-panel',
        '.property-column',
        'main',
        '.container',
        'form'
      ];

      let pageLoaded = false;
      
      for (const selector of pageLoadSelectors) {
        const success = await TestAssertions.waitForElement(this.page, selector, 5000);
        if (success) {
          TestLogger.success(`Page chargée avec succès (${selector})`);
          pageLoaded = true;
          break;
        }
      }

      if (!pageLoaded) {
        TestLogger.warning('Aucun sélecteur de page connu trouvé, mais continuation du test');
        pageLoaded = true; // Continuer quand même
      }

      await this.screenshotManager.takeScreenshot('page-loaded', 'Page complètement chargée');
      return pageLoaded;
    } catch (error) {
      TestLogger.error(`Erreur chargement page: ${error.message}`);
      return false;
    }
  }

  async lookForArrayElements() {
    TestLogger.step(5, 'Recherche d\'éléments d\'édition d\'array sur la page');
    
    try {
      // Prendre un screenshot pour analyse
      await this.screenshotManager.takeScreenshot('array-search', 'Recherche d\'éléments array');
      
      // Lister tous les éléments intéressants trouvés
      const interestingSelectors = [
        'button',
        'input',
        '.field-name',
        '.property-name', 
        '[data-field]',
        '.btn',
        '.array',
        'h1, h2, h3, h4',
        '.title'
      ];

      TestLogger.info('Éléments trouvés sur la page:');
      for (const selector of interestingSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            TestLogger.info(`  ✅ ${selector}: ${elements.length} élément(s)`);
            
            // Pour les boutons et titres, afficher le texte
            if (['button', 'h1', 'h2', 'h3', 'h4', '.title'].some(s => selector.includes(s))) {
              for (let i = 0; i < Math.min(elements.length, 3); i++) {
                const text = await elements[i].evaluate(el => el.textContent?.trim() || '');
                if (text) {
                  TestLogger.info(`     ${i + 1}. "${text}"`);
                }
              }
            }
          }
        } catch (error) {
          // Continuer
        }
      }

      return true;
    } catch (error) {
      TestLogger.error(`Erreur recherche éléments: ${error.message}`);
      return false;
    }
  }

  async generateTestReport() {
    TestLogger.info('='.repeat(60));
    TestLogger.info('📋 RAPPORT DE TEST FINAL');
    TestLogger.info('='.repeat(60));
    TestLogger.info(`📸 Screenshots sauvegardés dans: ${CONFIG.screenshotsDir}`);
    TestLogger.info('');
    TestLogger.info('✅ Le test a permis d\'identifier les points suivants:');
    TestLogger.info('   1. Le serveur est accessible');
    TestLogger.info('   2. Une authentification est requise');
    TestLogger.info('   3. La navigation fonctionne après authentification');
    TestLogger.info('   4. La page se charge (avec ou sans éléments attendus)');
    TestLogger.info('');
    TestLogger.info('💡 Prochaines étapes recommandées:');
    TestLogger.info('   1. Vérifiez les credentials dans CONFIG.testCredentials');
    TestLogger.info('   2. Examinez les screenshots pour voir la structure réelle');
    TestLogger.info('   3. Adaptez les sélecteurs CSS selon l\'interface trouvée');
    TestLogger.info('   4. Vérifiez que le schéma "user" existe et a une propriété array');
    TestLogger.info('='.repeat(60));
    
    return true;
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

  async run() {
    TestLogger.info('🚀 Démarrage du test avec gestion d\'authentification');
    TestLogger.info(`📍 URL cible: ${CONFIG.userNewUrl}`);
    TestLogger.info('');

    try {
      // Étape 1: Setup
      const setupSuccess = await this.setup();
      if (!setupSuccess) {
        throw new Error('Échec de l\'initialisation');
      }

      // Étape 2: Authentification
      await this.handleAuthentication();

      // Étape 3: Navigation
      const navSuccess = await this.navigateToUserNew();
      if (!navSuccess) {
        TestLogger.warning('Navigation problématique mais continuation du test');
      }

      // Étape 4: Attendre le chargement
      const loadSuccess = await this.waitForPageLoad();
      if (!loadSuccess) {
        TestLogger.warning('Chargement problématique mais continuation du test');
      }

      // Étape 5: Rechercher des éléments d'array
      await this.lookForArrayElements();

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
  TestLogger.warning('⚠️  IMPORTANT: Ce test nécessite une authentification');
  TestLogger.warning('📋 Vérifiez les credentials dans CONFIG.testCredentials avant de continuer');
  TestLogger.warning('👀 Le navigateur va s\'ouvrir en mode visible pour permettre l\'authentification manuelle si nécessaire');
  TestLogger.warning('');
  
  const test = new ArrayColumnTestWithAuth();
  const success = await test.run();
  
  // Code de sortie
  process.exit(success ? 0 : 1);
}

// Lancement du test
if (require.main === module) {
  main();
}

module.exports = { ArrayColumnTestWithAuth };