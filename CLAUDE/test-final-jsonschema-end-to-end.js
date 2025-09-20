const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class JsonSchemaWorkflowTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshotIndex = 0;
    this.results = {
      success: false,
      steps: [],
      issues: [],
      screenshots: [],
      timing: {}
    };
  }

  async init() {
    console.log('🚀 Initialisation du test end-to-end JsonSchema...');

    this.browser = await puppeteer.launch({
      headless: true,
      devtools: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    });

    this.page = await this.browser.newPage();

    // Configuration de la page
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Intercepter les erreurs console
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.results.issues.push(`Console Error: ${msg.text()}`);
      }
    });

    // Intercepter les erreurs de requête
    this.page.on('requestfailed', request => {
      this.results.issues.push(`Request Failed: ${request.url()} - ${request.failure().errorText}`);
    });
  }

  async takeScreenshot(stepName, additionalInfo = '') {
    const filename = `jsonschema-${String(++this.screenshotIndex).padStart(2, '0')}-${stepName.replace(/\s+/g, '-').toLowerCase()}.png`;
    const filepath = path.join(__dirname, filename);

    await this.page.screenshot({
      path: filepath,
      fullPage: false
    });

    this.results.screenshots.push({
      step: stepName,
      filename,
      info: additionalInfo,
      timestamp: new Date().toISOString()
    });

    console.log(`📸 Screenshot: ${filename} - ${stepName} ${additionalInfo}`);
    return filename;
  }

  async waitForElementAndLog(selector, description, timeout = 10000) {
    try {
      console.log(`⏳ Attente de: ${description} (${selector})`);
      const element = await this.page.waitForSelector(selector, { timeout });
      console.log(`✅ Trouvé: ${description}`);
      return element;
    } catch (error) {
      const message = `❌ Échec attente: ${description} - ${error.message}`;
      console.log(message);
      this.results.issues.push(message);
      throw error;
    }
  }

  async stepLog(stepName, action) {
    console.log(`\n📋 ÉTAPE: ${stepName}`);
    const startTime = Date.now();

    try {
      const result = await action();
      const duration = Date.now() - startTime;

      this.results.steps.push({
        name: stepName,
        success: true,
        duration,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ ${stepName} - Terminé en ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.results.steps.push({
        name: stepName,
        success: false,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      console.log(`❌ ${stepName} - Échec après ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  async testNavigation() {
    return await this.stepLog('Navigation vers la page d\'édition', async () => {
      const url = 'http://localhost:5502/new';
      console.log(`Navigation vers: ${url}`);

      await this.page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await this.takeScreenshot('initial-page', 'Page initiale chargée');

      // Vérifier que la page est correctement chargée
      await this.waitForElementAndLog('.horizontal-schema-editor', 'Éditeur de schéma horizontal');
      await this.waitForElementAndLog('.property-column', 'Colonne de propriétés');

      return { url, pageTitle: await this.page.title() };
    });
  }

  async testAddJsonSchemaProperty() {
    return await this.stepLog('Ajout propriété JsonSchema', async () => {
      // Cliquer sur le bouton d'ajout de propriété
      await this.waitForElementAndLog('.add-btn', 'Bouton ajouter propriété');
      await this.page.click('.add-btn');

      await this.takeScreenshot('add-property-form-opened', 'Formulaire d\'ajout ouvert');

      // Attendre que le formulaire d'ajout soit visible
      await this.waitForElementAndLog('.add-property-form', 'Formulaire d\'ajout de propriété');

      // Remplir le nom de la propriété
      const propertyName = 'myReference';
      await this.page.type('.add-property-form .input[placeholder*="Nom de la propriété"]', propertyName);

      // Sélectionner le type jsonschema
      await this.page.select('.add-property-form .select', 'jsonschema');

      await this.takeScreenshot('property-form-filled', `Formulaire rempli: ${propertyName}, type: jsonschema`);

      // Cliquer sur Ajouter
      await this.page.click('.add-property-form .btn-primary');

      // Attendre que la propriété soit ajoutée
      await new Promise(resolve => setTimeout(resolve, 1000));

      await this.takeScreenshot('property-added', 'Propriété JsonSchema ajoutée');

      // Vérifier que la propriété est visible
      const propertyCard = await this.waitForElementAndLog('.property-card', 'Carte de propriété créée');

      // Vérifier le type dans la carte
      const typeText = await this.page.$eval('.property-card .property-type', el => el.value || el.textContent);
      if (typeText !== 'jsonschema') {
        throw new Error(`Type incorrect: attendu 'jsonschema', reçu '${typeText}'`);
      }

      return { propertyName, type: typeText };
    });
  }

  async testConfigurationButton() {
    return await this.stepLog('Test bouton Configuration', async () => {
      // Chercher le bouton "Configurer →"
      await this.waitForElementAndLog('.explore-btn', 'Bouton Configurer');

      const buttonText = await this.page.$eval('.explore-btn', el => el.textContent.trim());
      if (!buttonText.includes('Configurer')) {
        throw new Error(`Texte bouton incorrect: attendu 'Configurer', reçu '${buttonText}'`);
      }

      await this.takeScreenshot('before-configure-click', 'Avant clic sur Configurer');

      // Compter les colonnes avant
      const columnsBefore = await this.page.$$eval('.property-column', els => els.length);

      // Cliquer sur le bouton
      await this.page.click('.explore-btn');

      // Attendre un court moment pour l'animation
      await new Promise(resolve => setTimeout(resolve, 1000));

      await this.takeScreenshot('after-configure-click', 'Après clic sur Configurer');

      // Vérifier qu'une nouvelle colonne est apparue
      const columnsAfter = await this.page.$$eval('.property-column', els => els.length);

      if (columnsAfter <= columnsBefore) {
        throw new Error(`Nouvelle colonne non créée: avant=${columnsBefore}, après=${columnsAfter}`);
      }

      return { columnsBefore, columnsAfter, buttonText };
    });
  }

  async testReferenceConfigColumn() {
    return await this.stepLog('Test colonne configuration référence', async () => {
      // Attendre que la colonne de configuration soit visible
      await this.waitForElementAndLog('.reference-config-content', 'Contenu configuration référence');

      await this.takeScreenshot('reference-config-opened', 'Colonne de configuration ouverte');

      // Vérifier les éléments de configuration
      const configSections = await this.page.$$eval('.config-section', els =>
        els.map(el => ({
          title: el.querySelector('h4')?.textContent?.trim(),
          hasSelect: !!el.querySelector('select'),
          hasInputs: !!el.querySelector('input'),
          hasTextarea: !!el.querySelector('textarea')
        }))
      );

      console.log('Sections de configuration trouvées:', configSections);

      // Vérifier qu'on a au moins les sections attendues
      const expectedSections = ['Schema référencé', 'Options', 'Affichage'];
      const actualTitles = configSections.map(s => s.title);

      for (const expected of expectedSections) {
        if (!actualTitles.some(title => title?.includes(expected))) {
          throw new Error(`Section manquante: ${expected}`);
        }
      }

      return { configSections, actualTitles };
    });
  }

  async testSchemaSelection() {
    return await this.stepLog('Test sélection schéma', async () => {
      // Trouver le select de schéma
      const schemaSelect = await this.waitForElementAndLog('.config-section select', 'Select de schéma');

      // Récupérer les options disponibles
      const options = await this.page.$$eval('.config-section select option',
        opts => opts.map(opt => ({ value: opt.value, text: opt.textContent.trim() }))
      );

      console.log('Options de schéma disponibles:', options);

      // Sélectionner le premier schéma non-vide
      const validOption = options.find(opt => opt.value && opt.value !== '');
      if (!validOption) {
        throw new Error('Aucun schéma disponible pour la sélection');
      }

      await this.takeScreenshot('before-schema-selection', 'Avant sélection schéma');

      // Sélectionner le schéma
      await this.page.select('.config-section select', validOption.value);

      // Attendre que l'interface se mette à jour
      await new Promise(resolve => setTimeout(resolve, 1000));

      await this.takeScreenshot('after-schema-selection', `Schéma sélectionné: ${validOption.text}`);

      // Vérifier que des informations de schéma apparaissent
      try {
        await this.waitForElementAndLog('.info-section', 'Section informations schéma', 3000);
        const schemaInfo = await this.page.$eval('.schema-info', el => el.textContent);
        console.log('Informations schéma:', schemaInfo);
      } catch (error) {
        console.log('Informations schéma non trouvées (optionnel)');
      }

      return { selectedSchema: validOption, availableOptions: options };
    });
  }

  async testOptionsConfiguration() {
    return await this.stepLog('Test configuration options', async () => {
      await this.takeScreenshot('before-options-config', 'Avant configuration options');

      // Tester la case à cocher "Multiple"
      const multipleCheckbox = await this.page.$('.checkbox-label input[type="checkbox"]');
      if (multipleCheckbox) {
        console.log('Test de l\'option Multiple...');
        await multipleCheckbox.click();
        await new Promise(resolve => setTimeout(resolve, 500));

        const isChecked = await this.page.$eval('.checkbox-label input[type="checkbox"]', el => el.checked);
        console.log(`Option Multiple: ${isChecked ? 'activée' : 'désactivée'}`);
      }

      // Tester le titre personnalisé
      const titleInput = await this.page.$('.form-group input[placeholder*="Titre"]');
      if (titleInput) {
        console.log('Test du titre personnalisé...');
        await titleInput.click();
        await titleInput.type('Mon Titre Personnalisé');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Tester la description
      const descriptionTextarea = await this.page.$('.form-group textarea');
      if (descriptionTextarea) {
        console.log('Test de la description...');
        await descriptionTextarea.click();
        await descriptionTextarea.type('Description de ma propriété de référence JsonSchema');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await this.takeScreenshot('after-options-config', 'Après configuration options');

      return { configured: true };
    });
  }

  async testBackNavigation() {
    return await this.stepLog('Test navigation retour', async () => {
      await this.takeScreenshot('before-back-navigation', 'Avant navigation retour');

      // Cliquer sur le bouton retour
      await this.waitForElementAndLog('.back-btn', 'Bouton retour');
      await this.page.click('.back-btn');

      await new Promise(resolve => setTimeout(resolve, 1000));

      await this.takeScreenshot('after-back-navigation', 'Après navigation retour');

      // Vérifier qu'on est revenu à la liste des propriétés
      await this.waitForElementAndLog('.properties-list', 'Liste des propriétés');

      // Vérifier que la propriété JsonSchema est toujours là avec la configuration
      const propertyCards = await this.page.$$eval('.property-card',
        cards => cards.map(card => ({
          type: card.querySelector('.property-type')?.value || card.querySelector('.property-type')?.textContent,
          name: card.querySelector('.property-name')?.value || card.querySelector('.property-name')?.textContent,
          hasConfigButton: !!card.querySelector('.explore-btn')
        }))
      );

      const jsonSchemaProperty = propertyCards.find(p => p.type === 'jsonschema');
      if (!jsonSchemaProperty) {
        throw new Error('Propriété JsonSchema non trouvée après retour');
      }

      if (!jsonSchemaProperty.hasConfigButton) {
        throw new Error('Bouton de configuration manquant sur la propriété JsonSchema');
      }

      return { propertyCards, jsonSchemaProperty };
    });
  }

  async testFinalValidation() {
    return await this.stepLog('Validation finale interface', async () => {
      await this.takeScreenshot('final-interface-state', 'État final de l\'interface');

      // Validation complète de l'interface
      const validation = {
        hasPropertyColumn: await this.page.$('.property-column') !== null,
        hasJsonSchemaProperty: await this.page.$('.property-card') !== null,
        hasConfigButton: await this.page.$('.explore-btn') !== null,
        stylesLoaded: await this.page.evaluate(() => {
          const styles = getComputedStyle(document.querySelector('.property-column') || document.body);
          return styles.display !== '' && styles.backgroundColor !== '';
        })
      };

      console.log('Validation finale:', validation);

      // Vérifier que tous les éléments critiques sont présents
      const criticalChecks = Object.entries(validation);
      const failures = criticalChecks.filter(([key, value]) => !value);

      if (failures.length > 0) {
        throw new Error(`Échecs validation: ${failures.map(([key]) => key).join(', ')}`);
      }

      return validation;
    });
  }

  async runCompleteTest() {
    const startTime = Date.now();

    try {
      console.log('\n🎯 DÉBUT DU TEST COMPLET JSONSCHEMA WORKFLOW\n');

      await this.init();

      // Exécution séquentielle de tous les tests
      const testResults = {
        navigation: await this.testNavigation(),
        addProperty: await this.testAddJsonSchemaProperty(),
        configButton: await this.testConfigurationButton(),
        configColumn: await this.testReferenceConfigColumn(),
        schemaSelection: await this.testSchemaSelection(),
        optionsConfig: await this.testOptionsConfiguration(),
        backNavigation: await this.testBackNavigation(),
        finalValidation: await this.testFinalValidation()
      };

      this.results.success = true;
      this.results.testResults = testResults;
      this.results.timing.total = Date.now() - startTime;

      console.log('\n✅ TOUS LES TESTS RÉUSSIS !');
      console.log(`⏱️  Durée totale: ${this.results.timing.total}ms`);
      console.log(`📸 Screenshots: ${this.results.screenshots.length}`);

    } catch (error) {
      this.results.success = false;
      this.results.error = error.message;
      this.results.timing.total = Date.now() - startTime;

      console.log(`\n❌ ÉCHEC DU TEST: ${error.message}`);

      // Capture d'écran de l'erreur
      await this.takeScreenshot('error-state', `Erreur: ${error.message}`);

      throw error;
    }
  }

  async generateReport() {
    const reportPath = path.join(__dirname, 'test-final-jsonschema-rapport.json');

    const report = {
      ...this.results,
      metadata: {
        timestamp: new Date().toISOString(),
        testVersion: '1.0.0',
        environment: 'local',
        url: 'http://localhost:5502/bdd/test-user/new'
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📋 Rapport généré: ${reportPath}`);

    // Résumé console
    console.log('\n📊 RÉSUMÉ DU TEST:');
    console.log(`├── Statut: ${this.results.success ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
    console.log(`├── Étapes: ${this.results.steps.length}`);
    console.log(`├── Étapes réussies: ${this.results.steps.filter(s => s.success).length}`);
    console.log(`├── Issues: ${this.results.issues.length}`);
    console.log(`├── Screenshots: ${this.results.screenshots.length}`);
    console.log(`└── Durée: ${this.results.timing.total}ms`);

    if (this.results.screenshots.length > 0) {
      console.log('\n📸 SCREENSHOTS GÉNÉRÉS:');
      this.results.screenshots.forEach((screenshot, index) => {
        console.log(`${index + 1}. ${screenshot.filename} - ${screenshot.step}`);
      });
    }

    return reportPath;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Exécution du test
async function main() {
  const tester = new JsonSchemaWorkflowTester();

  try {
    await tester.runCompleteTest();
    await tester.generateReport();

    console.log('\n🎉 TEST JSONSCHEMA WORKFLOW TERMINÉ AVEC SUCCÈS !');
    process.exit(0);

  } catch (error) {
    console.error('\n💥 ÉCHEC DU TEST:', error.message);

    await tester.generateReport();
    await tester.cleanup();

    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Lancement si exécuté directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = JsonSchemaWorkflowTester;