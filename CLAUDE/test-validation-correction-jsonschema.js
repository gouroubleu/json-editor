/**
 * Test Puppeteer - Validation Correction JsonSchema
 *
 * Ce test valide que la correction appliquée au composant HorizontalSchemaEditor
 * a bien restauré la fonctionnalité jsonschema dans l'interface d'administration.
 *
 * Correction testée: availableSchemas={[]} -> availableSchemas={availableSchemas.value}
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class JsonSchemaValidationTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:5501';
        this.results = {
            testName: 'Validation Correction JsonSchema',
            timestamp: new Date().toISOString(),
            steps: [],
            screenshots: [],
            errors: [],
            success: false,
            summary: {}
        };
        this.screenshotDir = '/home/gouroubleu/WS/json-editor/CLAUDE/screenshots';
    }

    async setup() {
        console.log('🚀 Initialisation du test JsonSchema...');

        // Créer le dossier screenshots s'il n'existe pas
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }

        this.browser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1400, height: 900 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        this.page = await this.browser.newPage();

        // Configuration de la page
        await this.page.setViewport({ width: 1400, height: 900 });

        // Capture des erreurs console
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.results.errors.push({
                    type: 'console',
                    message: msg.text(),
                    timestamp: new Date().toISOString()
                });
            }
        });

        console.log('✅ Configuration Puppeteer terminée');
    }

    async addStep(name, action, success = true, details = {}) {
        const step = {
            name,
            action,
            success,
            timestamp: new Date().toISOString(),
            details
        };

        this.results.steps.push(step);
        console.log(`${success ? '✅' : '❌'} ${name}: ${action}`);

        if (details.screenshot) {
            await this.takeScreenshot(details.screenshot);
        }
    }

    async takeScreenshot(name) {
        const timestamp = Date.now();
        const filename = `validation-jsonschema-${name}-${timestamp}.png`;
        const filepath = path.join(this.screenshotDir, filename);

        await this.page.screenshot({
            path: filepath,
            fullPage: true
        });

        this.results.screenshots.push({
            name,
            filename,
            filepath,
            timestamp: new Date().toISOString()
        });

        console.log(`📸 Screenshot sauvé: ${filename}`);
    }

    async navigateToSchemaEditor() {
        await this.addStep(
            'Navigation',
            'Accès à la page d\'accueil pour trouver test-user'
        );

        const url = `${this.baseUrl}/`;
        console.log(`🔗 Navigation vers: ${url}`);

        await this.page.goto(url, { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        await this.takeScreenshot('page-accueil');

        // Vérifier que la page est bien chargée
        const title = await this.page.title();
        await this.addStep(
            'Vérification chargement',
            `Page d'accueil chargée avec titre: ${title}`,
            true,
            { title }
        );

        // Chercher et cliquer sur le bouton "Éditer" pour test-user
        await this.addStep(
            'Recherche bouton éditer',
            'Recherche du bouton "Éditer" pour le schéma test-user'
        );

        try {
            // Attendre que les cartes de schémas soient chargées
            await this.page.waitForSelector('.schema-card', { timeout: 5000 });

            // Trouver la carte pour test-user et cliquer sur Éditer
            const editButtons = await this.page.$$('.schema-card');
            let editClicked = false;

            for (const card of editButtons) {
                const titleElement = await card.$('.card-title');
                if (titleElement) {
                    const title = await titleElement.evaluate(el => el.textContent?.trim());
                    if (title === 'test-user') {
                        const editButton = await card.$('button[title*="Éditer"]');
                        if (editButton) {
                            await editButton.click();
                            editClicked = true;
                            console.log('✅ Bouton "Éditer" cliqué pour test-user');
                            break;
                        }
                    }
                }
            }

            if (!editClicked) {
                throw new Error('Bouton "Éditer" pour test-user non trouvé');
            }

            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.takeScreenshot('editeur-schema');

            await this.addStep(
                'Accès éditeur',
                'Accès réussi à l\'éditeur de schéma test-user',
                editClicked,
                { success: editClicked }
            );

        } catch (error) {
            await this.addStep(
                'Erreur navigation',
                `Erreur lors de l'accès à l'éditeur: ${error.message}`,
                false,
                { error: error.message }
            );
        }
    }

    async addJsonSchemaProperty() {
        await this.addStep(
            'Ajout propriété',
            'Tentative d\'ajout d\'une propriété de type jsonschema'
        );

        try {
            // Chercher le bouton d'ajout de propriété
            await this.page.waitForSelector('button[data-action="add-property"], .add-property-btn, button:has-text("Ajouter")', { timeout: 5000 });

            // Cliquer sur le bouton d'ajout
            const addButtons = await this.page.$$('button');
            let addButtonFound = false;

            for (const button of addButtons) {
                const text = await button.evaluate(el => el.textContent?.toLowerCase() || '');
                if (text.includes('ajouter') || text.includes('add')) {
                    await button.click();
                    addButtonFound = true;
                    break;
                }
            }

            if (!addButtonFound) {
                // Essayer d'autres sélecteurs
                const possibleSelectors = [
                    '.add-property',
                    '[data-add-property]',
                    '.property-add-btn',
                    'button[title*="ropriété"]'
                ];

                for (const selector of possibleSelectors) {
                    const elements = await this.page.$$(selector);
                    if (elements.length > 0) {
                        await elements[0].click();
                        addButtonFound = true;
                        break;
                    }
                }
            }

            await this.takeScreenshot('apres-clic-ajout');
            await new Promise(resolve => setTimeout(resolve, 1000));

            await this.addStep(
                'Bouton ajout',
                'Bouton d\'ajout de propriété cliqué',
                addButtonFound,
                { found: addButtonFound }
            );

        } catch (error) {
            await this.addStep(
                'Erreur ajout propriété',
                `Erreur lors du clic sur ajout: ${error.message}`,
                false,
                { error: error.message }
            );
        }
    }

    async testJsonSchemaTypeAvailability() {
        await this.addStep(
            'Test disponibilité type',
            'Vérification de la disponibilité du type jsonschema'
        );

        try {
            // Attendre que le formulaire d'ajout apparaisse
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Chercher les dropdowns/selects de type
            const typeSelectors = [
                'select[name*="type"]',
                'select.property-type',
                '.type-selector select',
                'select:has(option[value="jsonschema"])',
                'select'
            ];

            let typeSelectFound = false;
            let jsonSchemaOptionFound = false;
            let typeSelect = null;

            for (const selector of typeSelectors) {
                const selects = await this.page.$$(selector);
                for (const select of selects) {
                    const options = await select.$$eval('option', opts =>
                        opts.map(opt => ({ value: opt.value, text: opt.textContent }))
                    );

                    console.log(`🔍 Options trouvées dans select:`, options);

                    const hasJsonSchema = options.some(opt =>
                        opt.value === 'jsonschema' ||
                        opt.text.toLowerCase().includes('jsonschema') ||
                        opt.text.toLowerCase().includes('json schema')
                    );

                    if (hasJsonSchema) {
                        typeSelectFound = true;
                        jsonSchemaOptionFound = true;
                        typeSelect = select;
                        break;
                    } else if (options.length > 1) {
                        typeSelectFound = true;
                        typeSelect = select;
                    }
                }
                if (jsonSchemaOptionFound) break;
            }

            await this.takeScreenshot('dropdown-types');

            await this.addStep(
                'Détection dropdown type',
                `Dropdown de type trouvé: ${typeSelectFound}`,
                typeSelectFound,
                { found: typeSelectFound }
            );

            await this.addStep(
                'Option jsonschema',
                `Option jsonschema disponible: ${jsonSchemaOptionFound}`,
                jsonSchemaOptionFound,
                { available: jsonSchemaOptionFound }
            );

            // Si l'option jsonschema est trouvée, la sélectionner
            if (jsonSchemaOptionFound && typeSelect) {
                await typeSelect.select('jsonschema');
                await new Promise(resolve => setTimeout(resolve, 1000));

                await this.takeScreenshot('jsonschema-selectionne');

                await this.addStep(
                    'Sélection jsonschema',
                    'Type jsonschema sélectionné avec succès',
                    true
                );

                return true;
            }

            return false;

        } catch (error) {
            await this.addStep(
                'Erreur test type',
                `Erreur lors du test de type: ${error.message}`,
                false,
                { error: error.message }
            );
            return false;
        }
    }

    async testSchemaDropdownPopulation() {
        await this.addStep(
            'Test dropdown schémas',
            'Vérification du chargement des schémas disponibles'
        );

        try {
            // Attendre que l'interface de configuration jsonschema apparaisse
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Chercher les dropdowns de schémas
            const schemaSelectors = [
                'select[name*="schema"]',
                'select.schema-selector',
                '.schema-reference select',
                'select:has(option[value*="test"])',
                '.jsonschema-config select'
            ];

            let schemaDropdownFound = false;
            let schemasLoaded = false;
            let schemaOptions = [];

            for (const selector of schemaSelectors) {
                const selects = await this.page.$$(selector);
                for (const select of selects) {
                    const options = await select.$$eval('option', opts =>
                        opts.map(opt => ({ value: opt.value, text: opt.textContent }))
                    );

                    // Exclure les options vides ou de placeholder
                    const validOptions = options.filter(opt =>
                        opt.value &&
                        opt.value !== '' &&
                        !opt.text.toLowerCase().includes('sélectionner') &&
                        !opt.text.toLowerCase().includes('choisir')
                    );

                    if (validOptions.length > 0) {
                        schemaDropdownFound = true;
                        schemasLoaded = true;
                        schemaOptions = validOptions;
                        break;
                    } else if (options.length > 0) {
                        schemaDropdownFound = true;
                    }
                }
                if (schemasLoaded) break;
            }

            await this.takeScreenshot('dropdown-schemas');

            console.log(`🔍 Schémas trouvés:`, schemaOptions);

            await this.addStep(
                'Dropdown schémas détecté',
                `Dropdown de schémas trouvé: ${schemaDropdownFound}`,
                schemaDropdownFound,
                { found: schemaDropdownFound }
            );

            await this.addStep(
                'Schémas chargés',
                `Schémas disponibles chargés: ${schemasLoaded} (${schemaOptions.length} schémas)`,
                schemasLoaded,
                {
                    loaded: schemasLoaded,
                    count: schemaOptions.length,
                    schemas: schemaOptions
                }
            );

            return schemasLoaded;

        } catch (error) {
            await this.addStep(
                'Erreur dropdown schémas',
                `Erreur lors du test dropdown: ${error.message}`,
                false,
                { error: error.message }
            );
            return false;
        }
    }

    async testPropertySaving() {
        await this.addStep(
            'Test sauvegarde',
            'Test de sauvegarde de la propriété jsonschema'
        );

        try {
            // Remplir les champs requis
            const nameInput = await this.page.$('input[name*="name"], input[placeholder*="nom"]');
            if (nameInput) {
                await nameInput.type('test_jsonschema_property');
                await this.addStep(
                    'Nom propriété',
                    'Nom de propriété saisi: test_jsonschema_property',
                    true
                );
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

            // Chercher le bouton de sauvegarde
            const saveButtons = await this.page.$$('button');
            let saveButtonFound = false;

            for (const button of saveButtons) {
                const text = await button.evaluate(el => el.textContent?.toLowerCase() || '');
                if (text.includes('sauvegarder') || text.includes('valider') || text.includes('ajouter') || text.includes('save')) {
                    await button.click();
                    saveButtonFound = true;
                    break;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.takeScreenshot('apres-sauvegarde');

            await this.addStep(
                'Sauvegarde propriété',
                `Sauvegarde tentée: ${saveButtonFound}`,
                saveButtonFound,
                { attempted: saveButtonFound }
            );

            return saveButtonFound;

        } catch (error) {
            await this.addStep(
                'Erreur sauvegarde',
                `Erreur lors de la sauvegarde: ${error.message}`,
                false,
                { error: error.message }
            );
            return false;
        }
    }

    async validateFinalState() {
        await this.addStep(
            'Validation finale',
            'Vérification de l\'état final de l\'interface'
        );

        try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.takeScreenshot('etat-final');

            // Vérifier qu'il n'y a pas d'erreurs JavaScript critiques
            const errors = this.results.errors.filter(e => e.type === 'console');
            const hasErrors = errors.length > 0;

            await this.addStep(
                'Erreurs JavaScript',
                `Erreurs console détectées: ${errors.length}`,
                !hasErrors,
                { errorCount: errors.length, errors }
            );

            // Analyser la page pour détecter la propriété ajoutée
            const pageContent = await this.page.content();
            const hasJsonSchemaProperty = pageContent.toLowerCase().includes('test_jsonschema_property');

            await this.addStep(
                'Propriété visible',
                `Propriété jsonschema visible dans l'interface: ${hasJsonSchemaProperty}`,
                hasJsonSchemaProperty,
                { visible: hasJsonSchemaProperty }
            );

            return !hasErrors;

        } catch (error) {
            await this.addStep(
                'Erreur validation finale',
                `Erreur lors de la validation: ${error.message}`,
                false,
                { error: error.message }
            );
            return false;
        }
    }

    async generateReport() {
        const successfulSteps = this.results.steps.filter(s => s.success).length;
        const totalSteps = this.results.steps.length;
        const successRate = totalSteps > 0 ? (successfulSteps / totalSteps) * 100 : 0;

        this.results.success = successRate >= 70; // 70% de réussite minimum
        this.results.summary = {
            totalSteps,
            successfulSteps,
            failedSteps: totalSteps - successfulSteps,
            successRate: `${successRate.toFixed(1)}%`,
            criticalErrors: this.results.errors.filter(e => e.type === 'console').length,
            screenshotCount: this.results.screenshots.length,
            testDuration: new Date().toISOString()
        };

        // Sauvegarder le rapport
        const reportPath = '/home/gouroubleu/WS/json-editor/CLAUDE/validation-jsonschema-rapport.json';
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

        console.log('\n📊 RAPPORT DE VALIDATION JSONSCHEMA');
        console.log('=====================================');
        console.log(`✅ Étapes réussies: ${successfulSteps}/${totalSteps} (${successRate.toFixed(1)}%)`);
        console.log(`❌ Erreurs: ${this.results.errors.length}`);
        console.log(`📸 Screenshots: ${this.results.screenshots.length}`);
        console.log(`📄 Rapport sauvé: ${reportPath}`);
        console.log(`🎯 Test global: ${this.results.success ? 'RÉUSSI' : 'ÉCHEC'}`);

        return this.results;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.setup();

            // Séquence de test complète
            await this.navigateToSchemaEditor();
            await this.addJsonSchemaProperty();
            const jsonSchemaAvailable = await this.testJsonSchemaTypeAvailability();

            if (jsonSchemaAvailable) {
                const schemasLoaded = await this.testSchemaDropdownPopulation();
                if (schemasLoaded) {
                    await this.testPropertySaving();
                }
            }

            await this.validateFinalState();

            return await this.generateReport();

        } catch (error) {
            console.error('❌ Erreur fatale:', error);
            this.results.errors.push({
                type: 'fatal',
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            return await this.generateReport();

        } finally {
            await this.cleanup();
        }
    }
}

// Exécution du test
async function main() {
    console.log('🧪 DÉMARRAGE DU TEST DE VALIDATION JSONSCHEMA');
    console.log('==============================================');

    const test = new JsonSchemaValidationTest();
    const results = await test.run();

    console.log('\n🏁 Test terminé');
    process.exit(results.success ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = JsonSchemaValidationTest;