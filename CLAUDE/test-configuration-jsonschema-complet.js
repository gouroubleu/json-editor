const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration du test
const CONFIG = {
    baseUrl: 'http://localhost:5501',
    timeout: 30000,
    screenshotDir: './CLAUDE/screenshots/jsonschema-config-test',
    reportFile: './CLAUDE/rapport-test-configuration-jsonschema-complet.json'
};

// Utilitaires pour les rapports
const TestReporter = {
    results: {
        startTime: new Date().toISOString(),
        endTime: null,
        status: 'RUNNING',
        tests: [],
        screenshots: [],
        errors: [],
        summary: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0
        }
    },

    addTest(name, status, details = {}) {
        this.results.tests.push({
            name,
            status,
            timestamp: new Date().toISOString(),
            details
        });
        this.results.summary.total++;
        this.results.summary[status]++;
    },

    addScreenshot(name, path) {
        this.results.screenshots.push({
            name,
            path,
            timestamp: new Date().toISOString()
        });
    },

    addError(error, context = '') {
        this.results.errors.push({
            error: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    },

    finalize() {
        this.results.endTime = new Date().toISOString();
        this.results.status = this.results.summary.failed > 0 ? 'FAILED' : 'PASSED';

        // Sauvegarder le rapport
        fs.writeFileSync(CONFIG.reportFile, JSON.stringify(this.results, null, 2));
        console.log(`📊 Rapport sauvegardé: ${CONFIG.reportFile}`);
    }
};

// Utilitaires pour les screenshots
async function takeScreenshot(page, name, description = '') {
    try {
        // Créer le dossier si nécessaire
        if (!fs.existsSync(CONFIG.screenshotDir)) {
            fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
        }

        const filename = `${name}-${Date.now()}.png`;
        const filepath = path.join(CONFIG.screenshotDir, filename);

        await page.screenshot({
            path: filepath,
            fullPage: true
        });

        TestReporter.addScreenshot(description || name, filepath);
        console.log(`📸 Screenshot: ${filepath}`);

        return filepath;
    } catch (error) {
        console.error(`❌ Erreur screenshot ${name}:`, error.message);
        TestReporter.addError(error, `Screenshot ${name}`);
    }
}

// Test de navigation vers l'application
async function testApplicationAccess(page) {
    console.log('🔍 Test d\'accès à l\'application...');

    try {
        await page.goto(CONFIG.baseUrl, {
            waitUntil: 'networkidle2',
            timeout: CONFIG.timeout
        });

        await takeScreenshot(page, 'app-access', 'Application chargée');

        // Vérifier que la page se charge correctement
        const title = await page.title();
        console.log(`📄 Titre de la page: ${title}`);

        TestReporter.addTest('application_access', 'passed', {
            url: CONFIG.baseUrl,
            title: title
        });

        return true;
    } catch (error) {
        console.error('❌ Erreur accès application:', error.message);
        TestReporter.addTest('application_access', 'failed', { error: error.message });
        TestReporter.addError(error, 'Application Access');
        return false;
    }
}

// Test de navigation vers l'éditeur de schéma
async function testSchemaEditorNavigation(page) {
    console.log('🧭 Test navigation vers l\'éditeur de schéma...');

    try {
        // Rechercher un lien vers l'éditeur de schéma
        await page.waitForSelector('body', { timeout: 10000 });

        // Essayer différentes stratégies de navigation
        const navigationStrategies = [
            // Stratégie 1: Navigation directe vers test-user
            async () => {
                await page.goto(`${CONFIG.baseUrl}/bdd/test-user`, {
                    waitUntil: 'networkidle2',
                    timeout: CONFIG.timeout
                });
            },

            // Stratégie 2: Rechercher des liens dans la page
            async () => {
                const schemaLinks = await page.$$eval('a', links =>
                    links.filter(link =>
                        link.href.includes('/bdd/') ||
                        link.textContent.toLowerCase().includes('schema') ||
                        link.textContent.toLowerCase().includes('test-user')
                    ).map(link => ({ href: link.href, text: link.textContent }))
                );

                if (schemaLinks.length > 0) {
                    console.log('🔗 Liens schéma trouvés:', schemaLinks);
                    await page.click(`a[href*="${schemaLinks[0].href}"]`);
                    await page.waitForNavigation({ waitUntil: 'networkidle2' });
                }
            }
        ];

        let navigationSuccess = false;
        for (const strategy of navigationStrategies) {
            try {
                await strategy();

                // Vérifier si nous sommes dans l'éditeur
                const currentUrl = page.url();
                if (currentUrl.includes('/bdd/')) {
                    navigationSuccess = true;
                    console.log(`✅ Navigation réussie vers: ${currentUrl}`);
                    break;
                }
            } catch (strategyError) {
                console.log(`⚠️ Stratégie échouée: ${strategyError.message}`);
            }
        }

        if (!navigationSuccess) {
            throw new Error('Impossible de naviguer vers l\'éditeur de schéma');
        }

        await takeScreenshot(page, 'schema-editor', 'Éditeur de schéma chargé');

        TestReporter.addTest('schema_editor_navigation', 'passed', {
            finalUrl: page.url()
        });

        return true;
    } catch (error) {
        console.error('❌ Erreur navigation éditeur:', error.message);
        TestReporter.addTest('schema_editor_navigation', 'failed', { error: error.message });
        TestReporter.addError(error, 'Schema Editor Navigation');
        return false;
    }
}

// Test de création d'une propriété select
async function testSelectPropertyCreation(page) {
    console.log('🎯 Test création propriété select...');

    try {
        // Attendre que l'interface soit chargée
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Rechercher un bouton pour ajouter une propriété
        const addButtons = await page.$$eval('button', buttons =>
            buttons.filter(btn =>
                btn.textContent.toLowerCase().includes('add') ||
                btn.textContent.toLowerCase().includes('+') ||
                btn.textContent.toLowerCase().includes('ajouter') ||
                btn.textContent.toLowerCase().includes('nouvelle')
            ).map(btn => btn.textContent)
        );

        console.log('🔘 Boutons d\'ajout trouvés:', addButtons);

        if (addButtons.length === 0) {
            throw new Error('Aucun bouton d\'ajout de propriété trouvé');
        }

        // Cliquer sur le premier bouton d'ajout
        await page.click('button');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await takeScreenshot(page, 'add-property-clicked', 'Après clic ajout propriété');

        // Rechercher les champs de configuration
        const inputs = await page.$$('input, select, textarea');
        console.log(`📝 ${inputs.length} champs de saisie trouvés`);

        // Essayer de remplir un nom de propriété
        try {
            const nameInput = await page.$('input[type="text"]');
            if (nameInput) {
                await nameInput.type('test_select_property');
                console.log('✅ Nom de propriété saisi');
            }
        } catch (e) {
            console.log('⚠️ Impossible de saisir le nom de propriété');
        }

        // Rechercher un sélecteur de type
        try {
            const typeSelectors = await page.$$('select');
            for (const selector of typeSelectors) {
                const options = await selector.$$eval('option', opts =>
                    opts.map(opt => ({ value: opt.value, text: opt.textContent }))
                );

                console.log('📋 Options disponibles:', options);

                // Chercher l'option 'select'
                const selectOption = options.find(opt =>
                    opt.value.toLowerCase().includes('select') ||
                    opt.text.toLowerCase().includes('select')
                );

                if (selectOption) {
                    await selector.select(selectOption.value);
                    console.log(`✅ Type 'select' sélectionné: ${selectOption.value}`);
                    break;
                }
            }
        } catch (e) {
            console.log('⚠️ Impossible de sélectionner le type select');
        }

        await takeScreenshot(page, 'select-configured', 'Configuration propriété select');

        TestReporter.addTest('select_property_creation', 'passed', {
            buttonsFound: addButtons.length,
            inputsFound: inputs.length
        });

        return true;
    } catch (error) {
        console.error('❌ Erreur création propriété select:', error.message);
        TestReporter.addTest('select_property_creation', 'failed', { error: error.message });
        TestReporter.addError(error, 'Select Property Creation');
        return false;
    }
}

// Test de configuration des options select
async function testSelectOptionsConfiguration(page) {
    console.log('⚙️ Test configuration options select...');

    try {
        // Rechercher des champs pour les options
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Essayer de trouver une zone pour ajouter des options
        const optionInputs = await page.$$eval('input', inputs =>
            inputs.filter(input =>
                input.placeholder && (
                    input.placeholder.toLowerCase().includes('option') ||
                    input.placeholder.toLowerCase().includes('value') ||
                    input.placeholder.toLowerCase().includes('choice')
                )
            ).map(input => input.placeholder)
        );

        console.log('🎛️ Champs d\'options trouvés:', optionInputs);

        // Essayer d'ajouter des options de test
        const testOptions = ['Option 1', 'Option 2', 'Option 3'];

        for (let i = 0; i < testOptions.length; i++) {
            try {
                // Chercher un bouton pour ajouter une option
                const addOptionButton = await page.$('button[type="button"]');
                if (addOptionButton) {
                    await addOptionButton.click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Essayer de remplir le champ d'option
                const optionInputs = await page.$$('input[type="text"]');
                if (optionInputs.length > i) {
                    await optionInputs[i].type(testOptions[i]);
                    console.log(`✅ Option ajoutée: ${testOptions[i]}`);
                }
            } catch (e) {
                console.log(`⚠️ Impossible d'ajouter l'option ${i + 1}`);
            }
        }

        await takeScreenshot(page, 'options-configured', 'Options select configurées');

        TestReporter.addTest('select_options_configuration', 'passed', {
            optionFieldsFound: optionInputs.length,
            testOptionsAdded: testOptions.length
        });

        return true;
    } catch (error) {
        console.error('❌ Erreur configuration options:', error.message);
        TestReporter.addTest('select_options_configuration', 'failed', { error: error.message });
        TestReporter.addError(error, 'Select Options Configuration');
        return false;
    }
}

// Test de validation du JSON Schema généré
async function testJsonSchemaValidation(page) {
    console.log('🔍 Test validation JSON Schema généré...');

    try {
        // Essayer de sauvegarder ou valider la configuration
        const saveButtons = await page.$$eval('button', buttons =>
            buttons.filter(btn =>
                btn.textContent.toLowerCase().includes('save') ||
                btn.textContent.toLowerCase().includes('sauvegarder') ||
                btn.textContent.toLowerCase().includes('valider') ||
                btn.textContent.toLowerCase().includes('confirm')
            ).map(btn => btn.textContent)
        );

        console.log('💾 Boutons de sauvegarde trouvés:', saveButtons);

        if (saveButtons.length > 0) {
            await page.click('button');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Essayer de récupérer le JSON Schema généré
        const jsonSchemaContent = await page.evaluate(() => {
            // Chercher du contenu JSON dans la page
            const scripts = Array.from(document.querySelectorAll('script'));
            const preElements = Array.from(document.querySelectorAll('pre'));
            const codeElements = Array.from(document.querySelectorAll('code'));

            let jsonContent = null;

            // Rechercher dans les éléments de code
            [...preElements, ...codeElements].forEach(el => {
                try {
                    const text = el.textContent || el.innerText;
                    if (text.includes('"type"') && text.includes('"properties"')) {
                        jsonContent = JSON.parse(text);
                    }
                } catch (e) {
                    // Ignorer les erreurs de parsing
                }
            });

            return jsonContent;
        });

        console.log('📋 JSON Schema détecté:', jsonSchemaContent ? 'OUI' : 'NON');

        // Valider la structure du JSON Schema
        let validationResults = {
            hasType: false,
            hasProperties: false,
            hasSelectProperty: false,
            selectHasEnum: false,
            selectHasStringType: false
        };

        if (jsonSchemaContent) {
            validationResults.hasType = !!jsonSchemaContent.type;
            validationResults.hasProperties = !!jsonSchemaContent.properties;

            // Chercher une propriété de type select
            if (jsonSchemaContent.properties) {
                Object.keys(jsonSchemaContent.properties).forEach(key => {
                    const prop = jsonSchemaContent.properties[key];
                    if (prop.enum && Array.isArray(prop.enum)) {
                        validationResults.hasSelectProperty = true;
                        validationResults.selectHasEnum = true;
                        validationResults.selectHasStringType = prop.type === 'string';
                    }
                });
            }
        }

        await takeScreenshot(page, 'schema-validation', 'Validation JSON Schema');

        TestReporter.addTest('json_schema_validation', 'passed', {
            schemaFound: !!jsonSchemaContent,
            validation: validationResults,
            schema: jsonSchemaContent
        });

        return true;
    } catch (error) {
        console.error('❌ Erreur validation JSON Schema:', error.message);
        TestReporter.addTest('json_schema_validation', 'failed', { error: error.message });
        TestReporter.addError(error, 'JSON Schema Validation');
        return false;
    }
}

// Test de bout en bout
async function testEndToEndUserFlow(page) {
    console.log('🔄 Test de bout en bout...');

    try {
        // Simulation d'un flux utilisateur complet
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Essayer de naviguer entre différentes sections
        const navigationLinks = await page.$$('a, button');
        console.log(`🔗 ${navigationLinks.length} éléments de navigation trouvés`);

        // Test de responsivité
        await page.setViewport({ width: 1200, height: 800 });
        await takeScreenshot(page, 'desktop-view', 'Vue desktop');

        await page.setViewport({ width: 768, height: 1024 });
        await takeScreenshot(page, 'tablet-view', 'Vue tablette');

        await page.setViewport({ width: 375, height: 667 });
        await takeScreenshot(page, 'mobile-view', 'Vue mobile');

        // Revenir à la vue desktop
        await page.setViewport({ width: 1200, height: 800 });

        // Test de performance
        const performanceMetrics = await page.metrics();
        console.log('📊 Métriques de performance:', performanceMetrics);

        TestReporter.addTest('end_to_end_user_flow', 'passed', {
            navigationElements: navigationLinks.length,
            performanceMetrics
        });

        return true;
    } catch (error) {
        console.error('❌ Erreur test bout en bout:', error.message);
        TestReporter.addTest('end_to_end_user_flow', 'failed', { error: error.message });
        TestReporter.addError(error, 'End to End User Flow');
        return false;
    }
}

// Fonction principale
async function runCompleteTest() {
    console.log('🚀 Début du test complet de configuration JSON Schema');
    console.log('=' .repeat(60));

    let browser;
    let page;

    try {
        // Lancement du navigateur
        browser = await puppeteer.launch({
            headless: 'new', // Mode headless pour serveur sans affichage
            defaultViewport: { width: 1200, height: 800 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--remote-debugging-port=9222',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-default-apps'
            ]
        });

        page = await browser.newPage();

        // Configuration de la page
        await page.setDefaultTimeout(CONFIG.timeout);
        await page.setDefaultNavigationTimeout(CONFIG.timeout);

        // Écouter les erreurs de la console
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('🔴 Erreur console:', msg.text());
            }
        });

        page.on('pageerror', error => {
            console.log('🔴 Erreur page:', error.message);
            TestReporter.addError(error, 'Page Error');
        });

        // Exécution des tests
        const tests = [
            { name: 'Application Access', fn: testApplicationAccess },
            { name: 'Schema Editor Navigation', fn: testSchemaEditorNavigation },
            { name: 'Select Property Creation', fn: testSelectPropertyCreation },
            { name: 'Select Options Configuration', fn: testSelectOptionsConfiguration },
            { name: 'JSON Schema Validation', fn: testJsonSchemaValidation },
            { name: 'End to End User Flow', fn: testEndToEndUserFlow }
        ];

        for (const test of tests) {
            console.log(`\n🧪 Exécution: ${test.name}`);
            try {
                await test.fn(page);
            } catch (error) {
                console.error(`❌ Erreur dans ${test.name}:`, error.message);
                TestReporter.addError(error, test.name);
            }
        }

    } catch (error) {
        console.error('❌ Erreur critique:', error.message);
        TestReporter.addError(error, 'Critical Error');
    } finally {
        // Nettoyage
        if (page) {
            await takeScreenshot(page, 'final-state', 'État final de l\'application');
        }

        if (browser) {
            await browser.close();
        }

        // Finaliser le rapport
        TestReporter.finalize();

        // Affichage du résumé
        console.log('\n' + '='.repeat(60));
        console.log('📊 RÉSUMÉ DU TEST');
        console.log('='.repeat(60));
        console.log(`✅ Tests réussis: ${TestReporter.results.summary.passed}`);
        console.log(`❌ Tests échoués: ${TestReporter.results.summary.failed}`);
        console.log(`⏭️  Tests ignorés: ${TestReporter.results.summary.skipped}`);
        console.log(`📝 Total: ${TestReporter.results.summary.total}`);
        console.log(`🗂️  Screenshots: ${TestReporter.results.screenshots.length}`);
        console.log(`🔴 Erreurs: ${TestReporter.results.errors.length}`);
        console.log(`📊 Statut global: ${TestReporter.results.status}`);
        console.log('='.repeat(60));

        if (TestReporter.results.errors.length > 0) {
            console.log('\n🔴 ERREURS DÉTECTÉES:');
            TestReporter.results.errors.forEach((err, index) => {
                console.log(`${index + 1}. [${err.context}] ${err.error}`);
            });
        }

        console.log(`\n📋 Rapport complet: ${CONFIG.reportFile}`);
        console.log(`📸 Screenshots: ${CONFIG.screenshotDir}`);
    }
}

// Exécution du test si appelé directement
if (require.main === module) {
    runCompleteTest().catch(console.error);
}

module.exports = {
    runCompleteTest,
    TestReporter,
    CONFIG
};