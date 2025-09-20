/**
 * Test Puppeteer précis pour reproduire le problème du bouton "Configurer"
 * des propriétés jsonschema qui ne déclenche pas l'ouverture de ReferenceConfigColumn
 *
 * PROBLÈME IDENTIFIÉ:
 * - Dans HorizontalSchemaEditor.tsx, handlePropertySelect() ne reconnaît pas le type 'jsonschema'
 * - Lignes 116-120: seuls 'object', 'array' et 'select' sont gérés
 * - Le type 'jsonschema' est manquant dans la condition canHaveChildren
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration du test
const BASE_URL = 'http://localhost:5501';
const SCHEMA_URL = `${BASE_URL}/bdd/test-user/schema`;
const EDIT_URL = `${BASE_URL}/bdd/test-user/entity_mfpxrr3y_2ubim8/edit`;
const SCREENSHOTS_DIR = '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots';

class JsonSchemaConfigureBugTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      testStart: new Date().toISOString(),
      testEnd: null,
      success: false,
      bugReproduced: false,
      errorMessages: [],
      screenshots: [],
      codeAnalysis: {
        bugLocation: 'HorizontalSchemaEditor.tsx',
        bugFunction: 'handlePropertySelect',
        bugLines: '116-120',
        problemDescription: "Le type 'jsonschema' n'est pas reconnu dans la condition canHaveChildren"
      },
      detailedSteps: []
    };
  }

  async setup() {
    console.log('🚀 Initialisation du test Puppeteer...');

    // Créer le dossier screenshots si inexistant
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    this.browser = await puppeteer.launch({
      headless: true, // Mode headless pour environnement sans écran
      slowMo: 100,
      defaultViewport: { width: 1400, height: 900 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    this.page = await this.browser.newPage();

    // Écouter les erreurs console
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || type === 'warn') {
        this.results.errorMessages.push({
          type,
          message: text,
          timestamp: new Date().toISOString()
        });
        console.log(`❌ Console ${type.toUpperCase()}: ${text}`);
      }
    });

    // Écouter les erreurs de page
    this.page.on('pageerror', error => {
      this.results.errorMessages.push({
        type: 'pageerror',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      console.log(`💥 Page Error: ${error.message}`);
    });

    await this.page.setViewport({ width: 1400, height: 900 });
  }

  async takeScreenshot(name, description) {
    const timestamp = Date.now();
    const filename = `bug-configurer-${name}-${timestamp}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);

    await this.page.screenshot({
      path: filepath,
      fullPage: false
    });

    this.results.screenshots.push({
      name,
      description,
      filepath,
      timestamp: new Date().toISOString()
    });

    console.log(`📸 Screenshot: ${description} -> ${filename}`);
    return filepath;
  }

  async logStep(step, action, result = null) {
    const stepData = {
      step,
      action,
      result,
      timestamp: new Date().toISOString(),
      url: this.page.url()
    };

    this.results.detailedSteps.push(stepData);
    console.log(`✅ Étape ${step}: ${action}${result ? ` -> ${result}` : ''}`);
  }

  async reproduireBugExact() {
    try {
      // ÉTAPE 1: Accéder à la page d'édition
      console.log('\n🔍 REPRODUCTION DU BUG EXACT - BOUTON CONFIGURER JSONSCHEMA');

      await this.page.goto(SCHEMA_URL, { waitUntil: 'networkidle0', timeout: 30000 });
      await this.logStep(1, 'Navigation vers page édition du schéma test-user');
      await this.takeScreenshot('01-page-initiale', 'Page d\'édition chargée');

      // Attendre que les composants Qwik soient chargés
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ÉTAPE 2: Cliquer sur "Ajouter" dans la première colonne
      await this.logStep(2, 'Recherche du bouton Ajouter dans la première colonne');

      const ajouterBtnSelector = '.property-column .add-btn';
      await this.page.waitForSelector(ajouterBtnSelector, { timeout: 10000 });

      await this.page.click(ajouterBtnSelector);
      await this.logStep(2, 'Clic sur bouton Ajouter', 'Formulaire d\'ajout ouvert');
      await this.takeScreenshot('02-formulaire-ajouter', 'Formulaire d\'ajout ouvert');

      // ÉTAPE 3: Remplir le formulaire pour créer une propriété jsonschema
      await this.logStep(3, 'Saisie des données de la propriété jsonschema');

      // Nom de la propriété
      const nomInput = 'input[placeholder="Nom de la propriété"]';
      await this.page.waitForSelector(nomInput);
      await this.page.type(nomInput, 'ma-reference-test');

      // Sélectionner le type "JSON Schema"
      const typeSelect = '.add-property-form select';
      await this.page.select(typeSelect, 'jsonschema');

      await this.takeScreenshot('03-propriete-remplie', 'Propriété jsonschema configurée');

      // ÉTAPE 4: Ajouter la propriété
      const ajouterPropBtn = '.form-actions .btn-primary';
      await this.page.click(ajouterPropBtn);
      await this.logStep(4, 'Ajout de la propriété jsonschema', 'Propriété ajoutée à la liste');

      // Attendre que la propriété apparaisse
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.takeScreenshot('04-propriete-ajoutee', 'Propriété jsonschema ajoutée dans la liste');

      // ÉTAPE 5: VÉRIFICATION CRITIQUE - Rechercher le bouton "Configurer"
      await this.logStep(5, 'Recherche du bouton Configurer pour la propriété jsonschema');

      // Attendre que la propriété soit rendue
      const propertyCard = '.property-card:last-child';
      await this.page.waitForSelector(propertyCard, { timeout: 5000 });

      // Vérifier la présence du bouton Configurer
      const configurerBtnSelector = '.property-card:last-child .explore-btn';
      const configurerBtnExists = await this.page.$(configurerBtnSelector) !== null;

      if (configurerBtnExists) {
        await this.logStep(5, 'Bouton Configurer trouvé', 'PRÉSENT - test va continuer');
        await this.takeScreenshot('05-bouton-configurer-trouve', 'Bouton Configurer visible');

        // ÉTAPE 6: REPRODUCTION DU BUG - Cliquer sur "Configurer"
        await this.logStep(6, 'Clic sur le bouton Configurer (REPRODUCTION DU BUG)');

        // Prendre screenshot avant le clic
        await this.takeScreenshot('06-avant-clic-configurer', 'Juste avant clic sur Configurer');

        // Compter les colonnes avant le clic
        const colonnesAvant = await this.page.$$eval('.property-column, .reference-config-content',
          columns => columns.length);

        await this.logStep(6, `Nombre de colonnes avant clic: ${colonnesAvant}`);

        // CLIC CRITIQUE sur le bouton Configurer
        await this.page.click(configurerBtnSelector);

        // Attendre un délai pour voir si quelque chose se passe
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Prendre screenshot après le clic
        await this.takeScreenshot('07-apres-clic-configurer', 'Après clic sur Configurer');

        // Vérifier si une nouvelle colonne ReferenceConfigColumn s'est ouverte
        const colonnesApres = await this.page.$$eval('.property-column, .reference-config-content',
          columns => columns.length);

        await this.logStep(6, `Nombre de colonnes après clic: ${colonnesApres}`);

        // DIAGNOSTIC DU BUG
        if (colonnesApres === colonnesAvant) {
          // BUG REPRODUIT !
          this.results.bugReproduced = true;
          await this.logStep(6, '🐛 BUG CONFIRMÉ', 'Aucune colonne de configuration ne s\'est ouverte !');

          // Analyser l'état du DOM pour comprendre pourquoi
          const analyseDOM = await this.analyserEtatDOM();
          this.results.domAnalysis = analyseDOM;

        } else {
          await this.logStep(6, '✅ Comportement normal', 'Colonne de configuration ouverte');
          this.results.bugReproduced = false;
        }

      } else {
        await this.logStep(5, 'Bouton Configurer NON TROUVÉ', 'PROBLÈME - bouton manquant');
        await this.takeScreenshot('05-bouton-configurer-manquant', 'Bouton Configurer absent');
        this.results.bugReproduced = true;
      }

      // ÉTAPE 7: ANALYSER LES ERREURS CONSOLE
      await this.logStep(7, 'Analyse des erreurs console et JavaScript');

      if (this.results.errorMessages.length > 0) {
        await this.logStep(7, `${this.results.errorMessages.length} erreurs détectées`,
          'Voir results.errorMessages pour détails');
      } else {
        await this.logStep(7, 'Aucune erreur console détectée');
      }

    } catch (error) {
      console.error('❌ Erreur lors de la reproduction du bug:', error);
      this.results.errorMessages.push({
        type: 'test-error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      await this.takeScreenshot('error', 'Erreur pendant le test');
    }
  }

  async analyserEtatDOM() {
    console.log('\n🔬 ANALYSE APPROFONDIE DE L\'ÉTAT DU DOM');

    const analyse = {
      selectedPath: await this.page.evaluate(() => {
        // Accéder à l'état interne Qwik (si possible)
        return window.__qwik_state__ || 'État Qwik non accessible';
      }),

      columnCount: await this.page.$$eval('.property-column, .reference-config-content',
        columns => columns.length),

      propertyCards: await this.page.$$eval('.property-card', cards =>
        cards.map(card => ({
          name: card.querySelector('.property-name')?.value || 'unknown',
          type: card.querySelector('.property-type')?.value || 'unknown',
          hasConfigureBtn: !!card.querySelector('.explore-btn'),
          configureBtnText: card.querySelector('.explore-btn')?.textContent || 'none'
        }))
      ),

      breadcrumbNav: await this.page.$$eval('.breadcrumb-item', items =>
        items.map(item => item.textContent)
      )
    };

    console.log('📊 Analyse DOM:', JSON.stringify(analyse, null, 2));
    return analyse;
  }

  async verifierSolutionProposee() {
    console.log('\n🔧 VÉRIFICATION DE LA SOLUTION PROPOSÉE');

    // La solution consiste à ajouter 'jsonschema' dans handlePropertySelect
    // Nous allons vérifier si la condition devrait être modifiée

    const solutionAnalysis = {
      problemFile: 'app/src/components/HorizontalSchemaEditor.tsx',
      problemFunction: 'handlePropertySelect',
      problemLine: '116-120',
      currentCondition: `property.type === 'object' ||
        (property.type === 'array' && property.items?.type === 'object') ||
        property.type === 'select'`,
      proposedFix: `property.type === 'object' ||
        (property.type === 'array' && property.items?.type === 'object') ||
        property.type === 'select' ||
        property.type === 'jsonschema'`,
      reasoning: 'Le type jsonschema doit permettre l\'ouverture de ReferenceConfigColumn pour configuration'
    };

    this.results.solutionAnalysis = solutionAnalysis;

    console.log('💡 Solution identifiée:', solutionAnalysis);
  }

  async cleanup() {
    this.results.testEnd = new Date().toISOString();

    // Générer le rapport final
    const reportPath = '/home/gouroubleu/WS/json-editor/CLAUDE/rapport-test-bouton-configurer-jsonschema.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    console.log('\n📋 RÉSUMÉ DU TEST:');
    console.log(`✅ Test terminé: ${this.results.testEnd}`);
    console.log(`🐛 Bug reproduit: ${this.results.bugReproduced ? 'OUI' : 'NON'}`);
    console.log(`📸 Screenshots: ${this.results.screenshots.length}`);
    console.log(`❌ Erreurs: ${this.results.errorMessages.length}`);
    console.log(`📄 Rapport complet: ${reportPath}`);

    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();
      await this.reproduireBugExact();
      await this.verifierSolutionProposee();
      this.results.success = true;
    } catch (error) {
      console.error('💥 Erreur générale du test:', error);
      this.results.success = false;
      this.results.errorMessages.push({
        type: 'fatal-error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await this.cleanup();
    }
  }
}

// Exécution du test si appelé directement
if (require.main === module) {
  const test = new JsonSchemaConfigureBugTest();
  test.run().then(() => {
    console.log('\n🎯 TEST PUPPETEER TERMINÉ');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Échec du test:', error);
    process.exit(1);
  });
}

module.exports = JsonSchemaConfigureBugTest;