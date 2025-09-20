/**
 * Test validation bouton "Configurer" pour propriétés jsonschema
 * Valide que la correction dans HorizontalSchemaEditor.tsx fonctionne
 * Date: 2025-09-20
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Helper function pour les délais
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testJsonSchemaConfigureButton() {
    console.log('🚀 Démarrage du test validation bouton "Configurer" jsonschema...');

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1400, height: 900 },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-gpu'
        ]
    });

    const page = await browser.newPage();
    const results = {
        timestamp: new Date().toISOString(),
        testName: 'Validation bouton Configurer jsonschema',
        url: 'http://localhost:5501/edit/test-user/',
        steps: [],
        success: false,
        screenshots: [],
        errors: []
    };

    try {
        // Étape 1: Navigation vers la page d'édition
        console.log('📍 Étape 1: Navigation vers edit/test-user');
        await page.goto('http://localhost:5501/edit/test-user/', {
            waitUntil: 'networkidle0',
            timeout: 10000
        });

        await delay(2000);
        const screenshot1 = `validation-jsonschema-step1-${Date.now()}.png`;
        await page.screenshot({ path: `/home/gouroubleu/WS/json-editor/CLAUDE/${screenshot1}` });
        results.screenshots.push(screenshot1);
        results.steps.push({
            step: 1,
            description: 'Navigation vers page édition test-user (/edit/test-user)',
            success: true,
            screenshot: screenshot1
        });

        // Étape 2: Rechercher et cliquer sur le bouton d'ajout de propriété
        console.log('📍 Étape 2: Ajout d\'une nouvelle propriété jsonschema');

        // Attendre que l'interface soit chargée
        await page.waitForSelector('button', { timeout: 10000 });

        // Chercher le bouton vert "Ajouter"
        let addButton = null;
        const buttons = await page.$$('button');

        for (const button of buttons) {
            const text = await page.evaluate(el => el.textContent, button);
            if (text && text.includes('Ajouter')) {
                addButton = button;
                break;
            }
        }

        if (!addButton) {
            throw new Error('Bouton "Ajouter" non trouvé');
        }

        await addButton.click();
        await delay(1000);

        // Étape 3: Remplir le formulaire d'ajout de propriété
        console.log('📍 Étape 3: Configuration de la propriété jsonschema');

        // Attendre un peu pour que la nouvelle colonne apparaisse
        await delay(2000);

        // Chercher le dernier input de nom (celui de la nouvelle propriété)
        const nameInputs = await page.$$('input[type="text"]');
        if (nameInputs.length > 0) {
            const lastNameInput = nameInputs[nameInputs.length - 1];
            await lastNameInput.click({ clickCount: 3 }); // Sélectionner tout
            await lastNameInput.type('reference_test');
        }

        await delay(500);

        // Sélectionner le type "jsonschema" dans le dernier dropdown
        console.log('📍 Sélection du type jsonschema...');

        const typeSelects = await page.$$('select');
        if (typeSelects.length > 0) {
            // Prendre le dernier select (celui de la nouvelle propriété)
            const lastTypeSelect = typeSelects[typeSelects.length - 1];

            // Vérifier d'abord quelles options sont disponibles
            const options = await page.evaluate(select => {
                return Array.from(select.options).map(option => ({
                    value: option.value,
                    text: option.textContent
                }));
            }, lastTypeSelect);

            console.log('Options disponibles:', options);

            // Chercher jsonschema ou JsonSchema dans les options
            const jsonschemaOption = options.find(opt =>
                opt.value.toLowerCase().includes('jsonschema') ||
                opt.text.toLowerCase().includes('jsonschema')
            );

            if (jsonschemaOption) {
                await lastTypeSelect.select(jsonschemaOption.value);
                console.log(`Type sélectionné: ${jsonschemaOption.value}`);
            } else {
                console.log('Option jsonschema non trouvée, options disponibles:', options);
                throw new Error('Type jsonschema non disponible dans les options');
            }
        }

        await delay(1000);

        const screenshot2 = `validation-jsonschema-step3-${Date.now()}.png`;
        await page.screenshot({ path: `/home/gouroubleu/WS/json-editor/CLAUDE/${screenshot2}` });
        results.screenshots.push(screenshot2);
        results.steps.push({
            step: 3,
            description: 'Configuration propriété jsonschema (nom: reference_test)',
            success: true,
            screenshot: screenshot2
        });

        // Étape 4: Vérifier que la propriété est ajoutée et chercher le bouton "Configurer"
        console.log('📍 Étape 4: Recherche de la propriété ajoutée et du bouton Configurer');

        // Attendre un peu pour que l'interface se mette à jour
        await delay(2000);

        // Chercher la propriété "reference_test" dans l'interface
        let propertyFound = false;
        const propertySelectors = [
            '[data-property="reference_test"]',
            '.property-item',
            'td',
            '.property-row'
        ];

        for (const selector of propertySelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    propertyFound = true;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        // Si pas trouvé par sélecteur, chercher dans tout le texte
        if (!propertyFound) {
            const pageText = await page.evaluate(() => document.body.textContent);
            propertyFound = pageText.includes('reference_test');
        }

        console.log(`Propriété reference_test trouvée: ${propertyFound}`);

        // Chercher le bouton "Configurer" ou l'icône de configuration
        console.log('📍 Recherche du bouton Configurer...');

        const configureSelectors = [
            'button[title*="Configurer"]',
            'button[aria-label*="Configurer"]',
            '.configure-btn',
            '.config-btn',
            '.arrow-btn',
            '[data-testid="configure-btn"]'
        ];

        let configureButton = null;
        for (const selector of configureSelectors) {
            try {
                configureButton = await page.$(selector);
                if (configureButton) {
                    console.log(`Bouton Configurer trouvé avec sélecteur: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        // Si pas trouvé, chercher tous les boutons et examiner leur contenu
        if (!configureButton) {
            const allButtons = await page.$$('button');
            for (const button of allButtons) {
                const text = await page.evaluate(el => el.textContent || el.title || el.getAttribute('aria-label'), button);
                if (text && (text.includes('Configurer') || text.includes('→') || text.includes('Config'))) {
                    configureButton = button;
                    console.log(`Bouton Configurer trouvé par contenu: ${text}`);
                    break;
                }
            }
        }

        const screenshot3 = `validation-jsonschema-step4-${Date.now()}.png`;
        await page.screenshot({ path: `/home/gouroubleu/WS/json-editor/CLAUDE/${screenshot3}` });
        results.screenshots.push(screenshot3);
        results.steps.push({
            step: 4,
            description: `Propriété trouvée: ${propertyFound}, Bouton Configurer trouvé: ${!!configureButton}`,
            success: propertyFound && !!configureButton,
            screenshot: screenshot3
        });

        // Étape 5: Cliquer sur le bouton "Configurer"
        if (configureButton) {
            console.log('📍 Étape 5: Clic sur le bouton Configurer');

            // Scroll vers le bouton si nécessaire
            await page.evaluate(el => el.scrollIntoView(), configureButton);
            await delay(500);

            await configureButton.click();
            await delay(2000);

            const screenshot4 = `validation-jsonschema-step5-${Date.now()}.png`;
            await page.screenshot({ path: `/home/gouroubleu/WS/json-editor/CLAUDE/${screenshot4}` });
            results.screenshots.push(screenshot4);
            results.steps.push({
                step: 5,
                description: 'Clic sur bouton Configurer effectué',
                success: true,
                screenshot: screenshot4
            });

            // Étape 6: Vérifier l'ouverture de ReferenceConfigColumn
            console.log('📍 Étape 6: Vérification ouverture ReferenceConfigColumn');

            // Chercher la colonne de configuration
            const configColumnSelectors = [
                '.reference-config-column',
                '.config-column',
                '.schema-config',
                '[data-component="ReferenceConfigColumn"]'
            ];

            let configColumn = null;
            for (const selector of configColumnSelectors) {
                try {
                    configColumn = await page.$(selector);
                    if (configColumn) break;
                } catch (e) {
                    continue;
                }
            }

            // Vérifier la présence du dropdown des schémas
            const dropdownSelectors = [
                'select[name*="schema"]',
                '.schema-select',
                '.schema-dropdown',
                'select option[value="test-user"]'
            ];

            let schemaDropdown = null;
            for (const selector of dropdownSelectors) {
                try {
                    schemaDropdown = await page.$(selector);
                    if (schemaDropdown) break;
                } catch (e) {
                    continue;
                }
            }

            const screenshot5 = `validation-jsonschema-step6-${Date.now()}.png`;
            await page.screenshot({ path: `/home/gouroubleu/WS/json-editor/CLAUDE/${screenshot5}` });
            results.screenshots.push(screenshot5);
            results.steps.push({
                step: 6,
                description: `Colonne config: ${!!configColumn}, Dropdown schémas: ${!!schemaDropdown}`,
                success: !!configColumn || !!schemaDropdown,
                screenshot: screenshot5
            });

            // Étape 7: Test de sélection d'un schéma
            if (schemaDropdown) {
                console.log('📍 Étape 7: Sélection du schéma test-user');

                try {
                    await schemaDropdown.select('test-user');
                    await delay(1000);

                    results.steps.push({
                        step: 7,
                        description: 'Sélection schéma test-user réussie',
                        success: true
                    });
                } catch (e) {
                    console.log('Erreur sélection schéma:', e.message);
                    results.steps.push({
                        step: 7,
                        description: `Erreur sélection schéma: ${e.message}`,
                        success: false
                    });
                }
            }

        } else {
            console.log('❌ Bouton Configurer non trouvé - échec du test');
            results.steps.push({
                step: 5,
                description: 'ÉCHEC: Bouton Configurer non trouvé',
                success: false
            });
        }

        // Screenshot final
        const screenshotFinal = `validation-jsonschema-final-${Date.now()}.png`;
        await page.screenshot({ path: `/home/gouroubleu/WS/json-editor/CLAUDE/${screenshotFinal}` });
        results.screenshots.push(screenshotFinal);

        // Analyser les résultats
        const allStepsSuccess = results.steps.every(step => step.success);
        const configureButtonFound = results.steps.some(step => step.description.includes('Bouton Configurer trouvé: true'));
        const configColumnOpened = results.steps.some(step => step.description.includes('Colonne config: true') || step.description.includes('Dropdown schémas: true'));

        results.success = allStepsSuccess && configureButtonFound && configColumnOpened;

        console.log('\n=== RÉSULTATS DU TEST ===');
        console.log(`✅ Test global: ${results.success ? 'SUCCÈS' : 'ÉCHEC'}`);
        console.log(`✅ Bouton Configurer trouvé: ${configureButtonFound}`);
        console.log(`✅ Colonne config ouverte: ${configColumnOpened}`);

        results.steps.forEach((step, index) => {
            console.log(`${step.success ? '✅' : '❌'} Étape ${step.step}: ${step.description}`);
        });

    } catch (error) {
        console.error('❌ Erreur durant le test:', error);
        results.errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        results.success = false;

        // Screenshot d'erreur
        try {
            const errorScreenshot = `validation-jsonschema-error-${Date.now()}.png`;
            await page.screenshot({ path: `/home/gouroubleu/WS/json-editor/CLAUDE/${errorScreenshot}` });
            results.screenshots.push(errorScreenshot);
        } catch (e) {
            console.log('Impossible de prendre screenshot d\'erreur');
        }
    }

    await browser.close();

    // Sauvegarder le rapport
    const reportPath = '/home/gouroubleu/WS/json-editor/CLAUDE/validation-bouton-configurer-jsonschema-rapport.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);
    console.log(`📸 Screenshots: ${results.screenshots.length} fichiers`);

    return results;
}

// Exécution du test
if (require.main === module) {
    testJsonSchemaConfigureButton()
        .then(results => {
            console.log('\n🏁 Test terminé');
            console.log(`Résultat final: ${results.success ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = { testJsonSchemaConfigureButton };