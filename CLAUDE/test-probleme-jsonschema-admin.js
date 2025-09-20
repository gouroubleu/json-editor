const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Test Puppeteer - Diagnostic problème propriétés JSON Schema côté administration
 *
 * Ce script teste l'ajout de propriétés de type "jsonschema" dans l'interface
 * d'administration sur http://localhost:5501/edit/test-user/
 *
 * Objectifs:
 * 1. Reproduire précisément le problème avec les propriétés jsonschema
 * 2. Capturer tous les erreurs console/réseau
 * 3. Documenter le comportement exact de l'interface
 * 4. Identifier les composants défaillants
 */

const TEST_CONFIG = {
  baseUrl: 'http://localhost:5501',
  schemaPath: '/edit/test-user',
  headless: true, // Mode headless pour environment sans GUI
  slowMo: 200, // Ralentir les actions pour observation
  timeout: 30000,
  screenshotDir: './CLAUDE/screenshots'
};

class JsonSchemaAdminTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.errors = [];
    this.networkIssues = [];
    this.consoleMessages = [];
    this.testResults = {
      timestamp: new Date().toISOString(),
      success: false,
      errors: [],
      screenshots: [],
      phase: '',
      details: {}
    };
  }

  async init() {
    console.log('🚀 Initialisation du test Puppeteer pour JSONSchema Admin...');

    // Créer le dossier screenshots si nécessaire
    try {
      await fs.mkdir(TEST_CONFIG.screenshotDir, { recursive: true });
    } catch (error) {
      console.log('📁 Dossier screenshots déjà existant');
    }

    this.browser = await puppeteer.launch({
      headless: TEST_CONFIG.headless,
      slowMo: TEST_CONFIG.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1400, height: 900 }
    });

    this.page = await this.browser.newPage();

    // Écouter les erreurs console
    this.page.on('console', (msg) => {
      const message = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      this.consoleMessages.push(message);

      if (msg.type() === 'error') {
        console.log('❌ Erreur console:', msg.text());
        this.errors.push(`Console Error: ${msg.text()}`);
      }
    });

    // Écouter les erreurs de page
    this.page.on('pageerror', (error) => {
      console.log('💥 Erreur page:', error.message);
      this.errors.push(`Page Error: ${error.message}`);
    });

    // Écouter les échecs de requêtes
    this.page.on('requestfailed', (request) => {
      const networkIssue = {
        url: request.url(),
        failure: request.failure()?.errorText,
        timestamp: new Date().toISOString()
      };
      this.networkIssues.push(networkIssue);
      console.log('🌐 Requête échouée:', request.url(), request.failure()?.errorText);
    });

    // Écouter les réponses d'erreur
    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        const networkIssue = {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        };
        this.networkIssues.push(networkIssue);
        console.log(`🚫 Réponse erreur ${response.status()}:`, response.url());
      }
    });
  }

  async takeScreenshot(name, description) {
    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(TEST_CONFIG.screenshotDir, filename);

    await this.page.screenshot({
      path: filepath,
      fullPage: true
    });

    this.testResults.screenshots.push({
      name,
      description,
      filename,
      filepath,
      timestamp: new Date().toISOString()
    });

    console.log(`📸 Screenshot: ${filename} - ${description}`);
    return filepath;
  }

  async navigateToAdminPage() {
    console.log('🧭 Navigation vers la page d\'administration...');
    this.testResults.phase = 'navigation';

    const fullUrl = `${TEST_CONFIG.baseUrl}${TEST_CONFIG.schemaPath}`;
    console.log(`📍 URL cible: ${fullUrl}`);

    try {
      await this.page.goto(fullUrl, {
        waitUntil: 'networkidle2',
        timeout: TEST_CONFIG.timeout
      });

      await this.takeScreenshot('01-page-loaded', 'Page d\'administration chargée');

      // Vérifier que la page est bien chargée
      const title = await this.page.title();
      console.log(`📄 Titre de la page: ${title}`);

      // Attendre que l'interface soit prête
      await this.page.waitForSelector('.edit-schema-page, .horizontal-schema-editor', {
        timeout: 10000
      });

      console.log('✅ Page d\'administration chargée avec succès');
      return true;

    } catch (error) {
      this.errors.push(`Navigation failed: ${error.message}`);
      console.log('❌ Échec de navigation:', error.message);
      await this.takeScreenshot('01-navigation-error', 'Erreur de navigation');
      return false;
    }
  }

  async analyzeCurrentInterface() {
    console.log('🔍 Analyse de l\'interface actuelle...');
    this.testResults.phase = 'interface_analysis';

    try {
      // Capturer l'état initial
      await this.takeScreenshot('02-interface-initial', 'État initial de l\'interface');

      // Analyser les composants présents
      const interfaceElements = await this.page.evaluate(() => {
        const analysis = {
          schemaEditor: !!document.querySelector('.horizontal-schema-editor'),
          propertyColumns: document.querySelectorAll('.property-column').length,
          addButtons: document.querySelectorAll('button[class*="add"], .add-property').length,
          selectElements: document.querySelectorAll('select').length,
          totalButtons: document.querySelectorAll('button').length,
          totalInputs: document.querySelectorAll('input').length,
          errorElements: document.querySelectorAll('.error, .alert-danger').length
        };

        // Analyser les options de type disponibles
        const typeSelects = Array.from(document.querySelectorAll('select')).filter(select => {
          return Array.from(select.options).some(option =>
            option.value.includes('type') || option.text.includes('Type')
          );
        });

        const availableTypes = [];
        typeSelects.forEach(select => {
          Array.from(select.options).forEach(option => {
            if (option.value && option.value !== '') {
              availableTypes.push({
                value: option.value,
                text: option.text,
                selected: option.selected
              });
            }
          });
        });

        analysis.availableTypes = availableTypes;
        analysis.typeSelectsFound = typeSelects.length;

        return analysis;
      });

      this.testResults.details.interfaceAnalysis = interfaceElements;
      console.log('📊 Analyse interface:', JSON.stringify(interfaceElements, null, 2));

      // Vérifier spécifiquement la présence du type "jsonschema"
      const hasJsonSchemaType = interfaceElements.availableTypes.some(type =>
        type.value === 'jsonschema' || type.text.toLowerCase().includes('json schema')
      );

      console.log(`🔍 Type "jsonschema" disponible: ${hasJsonSchemaType ? '✅' : '❌'}`);
      this.testResults.details.jsonSchemaTypeAvailable = hasJsonSchemaType;

      return interfaceElements;

    } catch (error) {
      this.errors.push(`Interface analysis failed: ${error.message}`);
      console.log('❌ Échec analyse interface:', error.message);
      return null;
    }
  }

  async attemptAddJsonSchemaProperty() {
    console.log('➕ Tentative d\'ajout d\'une propriété JSON Schema...');
    this.testResults.phase = 'add_jsonschema_property';

    try {
      // Chercher un bouton d'ajout de propriété
      const addButtons = await this.page.$$('button');
      let addPropertyButton = null;

      for (const button of addButtons) {
        const text = await this.page.evaluate(el => el.textContent?.toLowerCase() || '', button);
        if (text.includes('add') || text.includes('ajouter') || text.includes('+')) {
          addPropertyButton = button;
          console.log(`🎯 Bouton d'ajout trouvé: "${text}"`);
          break;
        }
      }

      if (!addPropertyButton) {
        throw new Error('Aucun bouton d\'ajout de propriété trouvé');
      }

      // Cliquer sur le bouton d'ajout
      await this.takeScreenshot('03-before-add-click', 'Avant clic bouton ajout');
      await addPropertyButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.takeScreenshot('04-after-add-click', 'Après clic bouton ajout');

      // Chercher les champs de création de propriété
      const propertyNameInput = await this.page.$('input[placeholder*="nom"], input[placeholder*="name"], input[name*="name"]');
      const typeSelect = await this.page.$('select option[value="jsonschema"]')?.then(option =>
        option ? this.page.$('select') : null
      );

      if (!propertyNameInput) {
        throw new Error('Champ nom de propriété non trouvé');
      }

      // Saisir un nom de propriété
      await propertyNameInput.click();
      await propertyNameInput.clear();
      await propertyNameInput.type('test-jsonschema-property');
      await this.takeScreenshot('05-property-name-entered', 'Nom de propriété saisi');

      // Chercher et sélectionner le type jsonschema
      console.log('🔍 Recherche de l\'option jsonschema...');

      const jsonSchemaSelection = await this.page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));

        for (const select of selects) {
          const jsonSchemaOption = Array.from(select.options).find(option =>
            option.value === 'jsonschema' || option.text.toLowerCase().includes('json schema')
          );

          if (jsonSchemaOption) {
            // Tenter la sélection
            select.value = jsonSchemaOption.value;
            jsonSchemaOption.selected = true;

            // Déclencher les événements
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));

            return {
              success: true,
              selectedValue: jsonSchemaOption.value,
              selectedText: jsonSchemaOption.text,
              selectElement: select.className || select.id || 'select-element'
            };
          }
        }

        return {
          success: false,
          error: 'Option jsonschema non trouvée',
          availableOptions: selects.map(select =>
            Array.from(select.options).map(opt => ({ value: opt.value, text: opt.text }))
          ).flat()
        };
      });

      this.testResults.details.jsonSchemaSelection = jsonSchemaSelection;
      console.log('📋 Résultat sélection jsonschema:', JSON.stringify(jsonSchemaSelection, null, 2));

      if (jsonSchemaSelection.success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.takeScreenshot('06-jsonschema-selected', 'Type jsonschema sélectionné');

        // Analyser ce qui se passe après la sélection
        await this.analyzePostSelectionState();

      } else {
        console.log('❌ Impossible de sélectionner le type jsonschema');
        await this.takeScreenshot('06-jsonschema-selection-failed', 'Échec sélection jsonschema');
        this.errors.push('JsonSchema type selection failed: ' + jsonSchemaSelection.error);
      }

      return jsonSchemaSelection.success;

    } catch (error) {
      this.errors.push(`Add jsonschema property failed: ${error.message}`);
      console.log('❌ Échec ajout propriété jsonschema:', error.message);
      await this.takeScreenshot('06-add-property-error', 'Erreur ajout propriété');
      return false;
    }
  }

  async analyzePostSelectionState() {
    console.log('🔬 Analyse de l\'état après sélection jsonschema...');

    try {
      const postSelectionState = await this.page.evaluate(() => {
        const analysis = {
          timestamp: new Date().toISOString(),
          newElementsVisible: {},
          configurationFields: [],
          validationMessages: [],
          enabledButtons: 0,
          disabledButtons: 0
        };

        // Chercher les nouveaux éléments de configuration
        const possibleConfigElements = [
          { selector: '.jsonschema-config', description: 'Configuration JSONSchema' },
          { selector: '.reference-config', description: 'Configuration référence' },
          { selector: 'input[placeholder*="schema"]', description: 'Champ schéma' },
          { selector: 'select[name*="schema"]', description: 'Sélecteur schéma' },
          { selector: '.schema-selector', description: 'Sélecteur de schéma' },
          { selector: '.ref-metadata', description: 'Métadonnées référence' }
        ];

        possibleConfigElements.forEach(({ selector, description }) => {
          const elements = document.querySelectorAll(selector);
          analysis.newElementsVisible[description] = elements.length;

          if (elements.length > 0) {
            elements.forEach((el, index) => {
              analysis.configurationFields.push({
                description: `${description} ${index + 1}`,
                tagName: el.tagName,
                className: el.className,
                placeholder: el.placeholder || '',
                visible: el.offsetParent !== null
              });
            });
          }
        });

        // Analyser les messages de validation/erreur
        const errorSelectors = ['.error', '.alert-danger', '.validation-error', '.warning'];
        errorSelectors.forEach(selector => {
          const errorElements = document.querySelectorAll(selector);
          errorElements.forEach(el => {
            if (el.textContent?.trim()) {
              analysis.validationMessages.push({
                type: 'error',
                message: el.textContent.trim(),
                selector: selector
              });
            }
          });
        });

        // Compter les boutons actifs/inactifs
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
          if (button.disabled) {
            analysis.disabledButtons++;
          } else {
            analysis.enabledButtons++;
          }
        });

        return analysis;
      });

      this.testResults.details.postSelectionState = postSelectionState;
      console.log('📊 État post-sélection:', JSON.stringify(postSelectionState, null, 2));

      await this.takeScreenshot('07-post-selection-analysis', 'Analyse après sélection jsonschema');

      // Chercher spécifiquement les composants JsonSchemaReferenceField
      const jsonSchemaComponents = await this.page.evaluate(() => {
        const components = {
          jsonSchemaReferenceFields: [],
          referenceConfigColumns: [],
          possibleConfigElements: []
        };

        // Chercher les éléments avec classes spécifiques au JsonSchema
        const classNames = [
          'jsonschema-field',
          'reference-header',
          'reference-config',
          'schema-selector',
          'reference-content'
        ];

        classNames.forEach(className => {
          const elements = document.getElementsByClassName(className);
          if (elements.length > 0) {
            components.jsonSchemaReferenceFields.push({
              className: className,
              count: elements.length,
              visible: Array.from(elements).some(el => el.offsetParent !== null)
            });
          }
        });

        return components;
      });

      this.testResults.details.jsonSchemaComponents = jsonSchemaComponents;
      console.log('🧩 Composants JsonSchema détectés:', JSON.stringify(jsonSchemaComponents, null, 2));

    } catch (error) {
      console.log('❌ Erreur analyse post-sélection:', error.message);
      this.errors.push(`Post-selection analysis failed: ${error.message}`);
    }
  }

  async testSaveAttempt() {
    console.log('💾 Test de tentative de sauvegarde...');
    this.testResults.phase = 'save_attempt';

    try {
      // Chercher un bouton de sauvegarde
      const saveButtons = await this.page.$$('button');
      let saveButton = null;

      for (const button of saveButtons) {
        const text = await this.page.evaluate(el => el.textContent?.toLowerCase() || '', button);
        if (text.includes('save') || text.includes('sauv') || text.includes('enregistrer')) {
          saveButton = button;
          console.log(`💾 Bouton sauvegarde trouvé: "${text}"`);
          break;
        }
      }

      if (!saveButton) {
        console.log('⚠️ Aucun bouton de sauvegarde trouvé');
        return false;
      }

      // Vérifier si le bouton est activé
      const isEnabled = await this.page.evaluate(btn => !btn.disabled, saveButton);
      console.log(`🔘 Bouton sauvegarde ${isEnabled ? 'activé' : 'désactivé'}`);

      await this.takeScreenshot('08-before-save', 'Avant tentative de sauvegarde');

      if (isEnabled) {
        await saveButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.takeScreenshot('09-after-save-click', 'Après clic sauvegarde');

        // Analyser le résultat de la sauvegarde
        const saveResult = await this.page.evaluate(() => {
          const notifications = Array.from(document.querySelectorAll('.notification, .alert, .message'));
          const errors = Array.from(document.querySelectorAll('.error, .alert-danger'));

          return {
            notifications: notifications.map(el => ({
              text: el.textContent?.trim() || '',
              className: el.className
            })),
            errors: errors.map(el => ({
              text: el.textContent?.trim() || '',
              className: el.className
            })),
            currentUrl: window.location.href
          };
        });

        this.testResults.details.saveResult = saveResult;
        console.log('📄 Résultat sauvegarde:', JSON.stringify(saveResult, null, 2));
      }

      return isEnabled;

    } catch (error) {
      this.errors.push(`Save attempt failed: ${error.message}`);
      console.log('❌ Échec tentative sauvegarde:', error.message);
      await this.takeScreenshot('09-save-error', 'Erreur sauvegarde');
      return false;
    }
  }

  async generateTestReport() {
    console.log('📋 Génération du rapport de test...');

    this.testResults.success = this.errors.length === 0;
    this.testResults.errors = this.errors;
    this.testResults.networkIssues = this.networkIssues;
    this.testResults.consoleMessages = this.consoleMessages.filter(msg => msg.type === 'error');
    this.testResults.completedAt = new Date().toISOString();
    this.testResults.duration = new Date() - new Date(this.testResults.timestamp);

    // Analyse des problèmes identifiés
    this.testResults.problemAnalysis = {
      criticalIssues: [],
      warnings: [],
      recommendations: []
    };

    // Identifier les problèmes critiques
    if (!this.testResults.details.jsonSchemaTypeAvailable) {
      this.testResults.problemAnalysis.criticalIssues.push(
        'Type "jsonschema" non disponible dans les options de type de propriété'
      );
    }

    if (this.testResults.details.jsonSchemaSelection && !this.testResults.details.jsonSchemaSelection.success) {
      this.testResults.problemAnalysis.criticalIssues.push(
        'Impossible de sélectionner le type jsonschema dans l\'interface'
      );
    }

    if (this.errors.length > 0) {
      this.testResults.problemAnalysis.criticalIssues.push(
        `${this.errors.length} erreur(s) détectée(s) pendant les tests`
      );
    }

    // Ajouter des recommandations
    if (this.testResults.details.jsonSchemaComponents?.jsonSchemaReferenceFields?.length === 0) {
      this.testResults.problemAnalysis.recommendations.push(
        'Vérifier que le composant JsonSchemaReferenceField est correctement intégré'
      );
    }

    if (this.networkIssues.length > 0) {
      this.testResults.problemAnalysis.warnings.push(
        `${this.networkIssues.length} problème(s) réseau détecté(s)`
      );
    }

    // Sauvegarder le rapport
    const reportPath = path.join('./CLAUDE', 'test-jsonschema-admin-rapport.json');
    await fs.writeFile(reportPath, JSON.stringify(this.testResults, null, 2));

    console.log('📊 Rapport de test sauvegardé:', reportPath);
    return this.testResults;
  }

  async cleanup() {
    console.log('🧹 Nettoyage...');
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();

      console.log('\n=== PHASE 1: NAVIGATION ===');
      const navigationSuccess = await this.navigateToAdminPage();

      if (!navigationSuccess) {
        throw new Error('Échec de navigation - test arrêté');
      }

      console.log('\n=== PHASE 2: ANALYSE INTERFACE ===');
      await this.analyzeCurrentInterface();

      console.log('\n=== PHASE 3: AJOUT PROPRIÉTÉ JSONSCHEMA ===');
      await this.attemptAddJsonSchemaProperty();

      console.log('\n=== PHASE 4: TEST SAUVEGARDE ===');
      await this.testSaveAttempt();

      console.log('\n=== PHASE 5: GÉNÉRATION RAPPORT ===');
      const report = await this.generateTestReport();

      // Afficher le résumé
      console.log('\n' + '='.repeat(60));
      console.log('📋 RÉSUMÉ DU TEST');
      console.log('='.repeat(60));
      console.log(`✅ Succès global: ${report.success ? 'OUI' : 'NON'}`);
      console.log(`❌ Erreurs détectées: ${report.errors.length}`);
      console.log(`🌐 Problèmes réseau: ${report.networkIssues.length}`);
      console.log(`📸 Screenshots capturés: ${report.screenshots.length}`);
      console.log(`⏱️ Durée du test: ${Math.round(report.duration / 1000)}s`);

      if (report.problemAnalysis.criticalIssues.length > 0) {
        console.log('\n🚨 PROBLÈMES CRITIQUES:');
        report.problemAnalysis.criticalIssues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue}`);
        });
      }

      if (report.problemAnalysis.recommendations.length > 0) {
        console.log('\n💡 RECOMMANDATIONS:');
        report.problemAnalysis.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec}`);
        });
      }

      console.log('\n📂 Fichiers générés:');
      console.log(`  📄 Rapport: ./CLAUDE/test-jsonschema-admin-rapport.json`);
      console.log(`  📁 Screenshots: ${TEST_CONFIG.screenshotDir}/`);

      return report;

    } catch (error) {
      console.log('💥 Erreur critique:', error.message);
      this.errors.push(`Critical error: ${error.message}`);
      await this.takeScreenshot('critical-error', 'Erreur critique du test');
      return await this.generateTestReport();
    } finally {
      await this.cleanup();
    }
  }
}

// Exécution du test
async function main() {
  console.log('🧪 TEST DIAGNOTIC JSONSCHEMA ADMINISTRATION');
  console.log('='.repeat(60));
  console.log(`🌐 URL cible: ${TEST_CONFIG.baseUrl}${TEST_CONFIG.schemaPath}`);
  console.log(`📁 Screenshots: ${TEST_CONFIG.screenshotDir}`);
  console.log(`⏱️ Timeout: ${TEST_CONFIG.timeout}ms`);
  console.log('='.repeat(60));

  const tester = new JsonSchemaAdminTester();
  const results = await tester.run();

  console.log('\n🏁 Test terminé!');
  process.exit(results.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { JsonSchemaAdminTester, TEST_CONFIG };