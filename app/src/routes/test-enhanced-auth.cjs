/**
 * Test Puppeteer amélioré avec authentification interactive
 * pour vérifier le comportement des colonnes d'édition d'array
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:8002',
  loginUrl: 'http://localhost:8002/login/',
  userNewUrl: 'http://localhost:8002/bo/schemaEditor/bdd/user/new/',
  screenshotsDir: './test-screenshots-enhanced',
  timeout: 60000,
  headless: false,
  slowMo: 100,
  
  testCredentials: {
    email: 'william.gallavardin@rhinov.fr',
    password: 'testtest'
  }
};

// Classe de test améliorée
class EnhancedAuthTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.stepCounter = 1;
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async takeScreenshot(name, description) {
    try {
      const filename = `step-${String(this.stepCounter).padStart(2, '0')}-${name}.png`;
      const filepath = path.join(CONFIG.screenshotsDir, filename);
      
      await this.page.screenshot({ 
        path: filepath, 
        fullPage: true 
      });
      
      this.log(`📸 Screenshot: ${filename} - ${description}`);
      this.stepCounter++;
      return filepath;
    } catch (error) {
      this.log(`❌ Erreur screenshot: ${error.message}`);
    }
  }

  async setup() {
    this.log('🚀 Initialisation du test avec authentification interactive');
    
    try {
      // Créer le dossier screenshots
      await fs.mkdir(CONFIG.screenshotsDir, { recursive: true });
      
      // Lancer le navigateur
      this.browser = await puppeteer.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Configuration de la page
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      this.log('✅ Navigateur initialisé avec succès');
      return true;
    } catch (error) {
      this.log(`❌ Erreur initialisation: ${error.message}`);
      return false;
    }
  }

  async performLogin() {
    this.log('🔐 Démarrage du processus de connexion');
    
    try {
      // Aller à la page de login
      this.log(`➡️ Navigation vers: ${CONFIG.loginUrl}`);
      await this.page.goto(CONFIG.loginUrl, { 
        waitUntil: 'networkidle2', 
        timeout: CONFIG.timeout 
      });

      await this.takeScreenshot('initial-login', 'Page de connexion initiale');
      
      // Attendre que les champs soient présents
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await this.page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await this.page.waitForSelector('button[type="submit"]', { timeout: 10000 });
      
      this.log('✅ Champs de connexion détectés');
      
      // Remplir les champs
      this.log('📝 Remplissage des champs de connexion');
      await this.page.type('input[type="email"]', CONFIG.testCredentials.email, { delay: 50 });
      await this.page.type('input[type="password"]', CONFIG.testCredentials.password, { delay: 50 });
      
      await this.takeScreenshot('before-submit', 'Avant soumission du formulaire');
      
      // Cliquer sur le bouton de connexion
      this.log('🖱️ Clic sur le bouton de connexion');
      await this.page.click('button[type="submit"]');
      
      // Attendre la navigation
      this.log('⏳ Attente de la réponse de connexion...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await this.takeScreenshot('after-submit', 'Après soumission du formulaire');
      
      // Vérifier si nous sommes toujours sur la page de login
      const currentUrl = this.page.url();
      this.log(`📍 URL actuelle: ${currentUrl}`);
      
      if (currentUrl.includes('/login')) {
        this.log('⚠️ Toujours sur la page de connexion');
        
        // Vérifier s'il y a des messages d'erreur
        const errorMessages = await this.page.$$eval('.formError, .error, .alert', 
          elements => elements.map(el => el.textContent.trim()).filter(text => text)
        ).catch(() => []);
        
        if (errorMessages.length > 0) {
          this.log('❌ Messages d\'erreur trouvés:');
          errorMessages.forEach(msg => this.log(`   - ${msg}`));
        }
        
        this.log('🔧 Connexion manuelle requise');
        this.log('👤 Veuillez vous connecter manuellement dans le navigateur');
        this.log('⏰ Vous avez 60 secondes pour vous connecter...');
        
        // Attendre 60 secondes pour connexion manuelle
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        await this.takeScreenshot('after-manual-auth', 'Après tentative de connexion manuelle');
      } else {
        this.log('✅ Connexion réussie automatiquement');
      }
      
      return true;
    } catch (error) {
      this.log(`❌ Erreur during login: ${error.message}`);
      return false;
    }
  }

  async navigateToTarget() {
    this.log('🎯 Navigation vers la page cible');
    
    try {
      this.log(`➡️ Navigation vers: ${CONFIG.userNewUrl}`);
      await this.page.goto(CONFIG.userNewUrl, { 
        waitUntil: 'networkidle2', 
        timeout: CONFIG.timeout 
      });

      const currentUrl = this.page.url();
      this.log(`📍 URL finale: ${currentUrl}`);
      
      await this.takeScreenshot('target-page', 'Page cible atteinte');
      
      // Vérifier si nous sommes sur la bonne page
      if (currentUrl.includes('/login')) {
        this.log('❌ Redirection vers login - Authentification échouée');
        return false;
      } else if (currentUrl.includes('/schemaEditor')) {
        this.log('✅ Navigation réussie vers schemaEditor');
        return true;
      } else {
        this.log(`⚠️ Page inattendue: ${currentUrl}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ Erreur navigation: ${error.message}`);
      return false;
    }
  }

  async analyzePageContent() {
    this.log('🔍 Analyse du contenu de la page');
    
    try {
      await this.takeScreenshot('content-analysis', 'Analyse du contenu');
      
      // Obtenir le titre de la page
      const pageTitle = await this.page.title();
      this.log(`📄 Titre de la page: "${pageTitle}"`);
      
      // Chercher des éléments significatifs
      const selectors = [
        'h1', 'h2', 'h3', 
        'button', 
        'input',
        '.entity-column', 
        '.property-column',
        '.horizontal-entity-viewer',
        'form',
        '.array',
        '[data-field]'
      ];
      
      this.log('📋 Éléments trouvés sur la page:');
      for (const selector of selectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            this.log(`  ✅ ${selector}: ${elements.length} élément(s)`);
            
            // Pour certains éléments, afficher le contenu textuel
            if (['h1', 'h2', 'h3', 'button'].includes(selector)) {
              for (let i = 0; i < Math.min(elements.length, 3); i++) {
                const text = await elements[i].evaluate(el => el.textContent?.trim() || '');
                if (text) {
                  this.log(`     ${i + 1}. "${text}"`);
                }
              }
            }
          }
        } catch (error) {
          // Continue
        }
      }
      
      // Chercher spécifiquement des éléments liés aux arrays
      this.log('🔍 Recherche d\'éléments array spécifiques:');
      const arraySelectors = [
        'button:contains("Ajouter")',
        'button:contains("élément")', 
        '.add-array-item',
        '.array-item',
        '[data-type="array"]'
      ];
      
      for (const selector of arraySelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            this.log(`  🎯 ${selector}: ${elements.length} élément(s)`);
          }
        } catch (error) {
          // Continue
        }
      }
      
      return true;
    } catch (error) {
      this.log(`❌ Erreur analyse: ${error.message}`);
      return false;
    }
  }

  async generateReport() {
    this.log('📊 Génération du rapport final');
    this.log('='.repeat(60));
    this.log('📋 RAPPORT DE TEST - AUTHENTIFICATION INTERACTIVE');
    this.log('='.repeat(60));
    this.log(`📸 Screenshots dans: ${CONFIG.screenshotsDir}`);
    this.log(`🔐 Identifiants testés: ${CONFIG.testCredentials.email}`);
    this.log('');
    this.log('📝 Résumé des actions:');
    this.log('   1. Initialisation du navigateur ✅');
    this.log('   2. Navigation vers page de connexion ✅');
    this.log('   3. Tentative d\'authentification automatique');
    this.log('   4. Période d\'attente pour connexion manuelle');
    this.log('   5. Navigation vers page cible');
    this.log('   6. Analyse du contenu de la page');
    this.log('');
    this.log('💡 Recommandations:');
    this.log('   - Vérifiez les screenshots pour voir les détails');
    this.log('   - Confirmez les identifiants avec l\'administrateur');
    this.log('   - Vérifiez que le serveur fonctionne correctement');
    this.log('='.repeat(60));
  }

  async cleanup() {
    this.log('🧹 Nettoyage des ressources');
    
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      this.log('✅ Nettoyage terminé');
    } catch (error) {
      this.log(`❌ Erreur nettoyage: ${error.message}`);
    }
  }

  async run() {
    try {
      const setupOk = await this.setup();
      if (!setupOk) return false;
      
      const loginOk = await this.performLogin();
      if (!loginOk) {
        this.log('⚠️ Problème de connexion mais continuation...');
      }
      
      const navOk = await this.navigateToTarget();
      if (!navOk) {
        this.log('⚠️ Problème de navigation mais continuation...');
      }
      
      await this.analyzePageContent();
      
      return true;
    } catch (error) {
      this.log(`❌ Erreur générale: ${error.message}`);
      return false;
    } finally {
      await this.generateReport();
      await this.cleanup();
    }
  }
}

// Fonction principale
async function main() {
  console.log('🎬 Démarrage du test d\'authentification interactive');
  console.log(`📧 Email: ${CONFIG.testCredentials.email}`);
  console.log(`🔒 Mot de passe: ${'*'.repeat(CONFIG.testCredentials.password.length)}`);
  console.log('');
  
  const test = new EnhancedAuthTest();
  const success = await test.run();
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { EnhancedAuthTest };