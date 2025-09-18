/**
 * Script Puppeteer ciblé pour reproduire le bug spécifique de la propriété "adresse"
 * Basé sur l'analyse de la capture d'écran qui montre l'interface réelle
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class TargetedAdresseBugTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.targetUrl = 'http://localhost:5505/bdd/test-user/new/';
        this.screenshotDir = path.join(__dirname, 'targeted-screenshots');
        this.results = {
            steps: [],
            errors: [],
            logs: []
        };
    }

    async init() {
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }

        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--disable-gpu'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1400, height: 900 });

        // Capturer les erreurs
        this.page.on('pageerror', error => {
            this.results.errors.push(`Page Error: ${error.message}`);
            console.error('❌ Page Error:', error.message);
        });

        this.page.on('console', msg => {
            this.results.logs.push(`Console ${msg.type()}: ${msg.text()}`);
        });
    }

    async takeScreenshot(name, description) {
        const timestamp = Date.now();
        const filename = `${timestamp}_${name}.png`;
        const filepath = path.join(this.screenshotDir, filename);

        await this.page.screenshot({
            path: filepath,
            fullPage: true
        });

        this.results.steps.push({
            name,
            description,
            screenshot: filename,
            timestamp: new Date().toISOString()
        });

        console.log(`📸 ${description} -> ${filename}`);
        return filename;
    }

    async log(message) {
        console.log(message);
        this.results.logs.push(`[${new Date().toISOString()}] ${message}`);
    }

    async testAdressePropertyBug() {
        await this.log('🚀 Début du test ciblé sur la propriété adresse...');

        try {
            // Étape 1: Charger la page
            await this.log('📍 Navigation vers la page test-user/new');
            await this.page.goto(this.targetUrl, { waitUntil: 'networkidle2' });
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.takeScreenshot('01_initial_page', 'Page initiale chargée');

            // Étape 2: Localiser spécifiquement la propriété adresse
            await this.log('🔍 Recherche de la propriété adresse (type array)');

            // Chercher le conteneur de la propriété adresse
            const adressePropertyContainer = await this.page.evaluate(() => {
                // Chercher tous les éléments qui contiennent le texte "adresse"
                const elements = Array.from(document.querySelectorAll('*'));
                for (let el of elements) {
                    if (el.textContent && el.textContent.toLowerCase().includes('adresse')) {
                        // Vérifier si c'est bien la propriété (pas juste un texte quelconque)
                        const parent = el.closest('div');
                        if (parent && parent.textContent.includes('array')) {
                            return {
                                found: true,
                                innerHTML: parent.innerHTML.substring(0, 500),
                                textContent: parent.textContent.substring(0, 200),
                                hasEditButton: parent.textContent.includes('Éditer en JSON')
                            };
                        }
                    }
                }
                return { found: false };
            });

            if (!adressePropertyContainer.found) {
                throw new Error('Propriété adresse non trouvée dans l\'interface');
            }

            await this.log(`✅ Propriété adresse trouvée. Bouton d'édition: ${adressePropertyContainer.hasEditButton ? 'Oui' : 'Non'}`);

            // Étape 3: Interagir avec le bouton "Éditer en JSON"
            await this.log('👆 Tentative de clic sur "Éditer en JSON"');

            const editButtonClicked = await this.page.evaluate(() => {
                // Chercher le bouton "Éditer en JSON" spécifiquement pour adresse
                const buttons = Array.from(document.querySelectorAll('button'));
                for (let button of buttons) {
                    if (button.textContent && button.textContent.includes('Éditer en JSON')) {
                        // Vérifier que c'est bien pour la propriété adresse
                        const container = button.closest('div');
                        if (container && container.textContent.includes('adresse')) {
                            button.click();
                            return true;
                        }
                    }
                }
                return false;
            });

            if (editButtonClicked) {
                await this.log('✅ Clic sur "Éditer en JSON" réussi');
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.takeScreenshot('02_after_edit_click', 'Après clic sur Éditer en JSON');
            } else {
                await this.log('⚠️ Bouton "Éditer en JSON" non trouvé ou non cliquable');
            }

            // Étape 4: Chercher des moyens d'ajouter un élément à l'array adresse
            await this.log('🔍 Recherche de contrôles pour ajouter un élément à l\'array');

            const arrayControls = await this.page.evaluate(() => {
                const controls = [];

                // Chercher tous les boutons avec +, Add, Ajouter
                const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
                for (let button of buttons) {
                    const text = button.textContent || '';
                    if (text.includes('+') || text.toLowerCase().includes('add') || text.toLowerCase().includes('ajouter')) {
                        // Vérifier si c'est dans le contexte de la propriété adresse
                        const container = button.closest('div');
                        if (container && container.textContent.includes('adresse')) {
                            controls.push({
                                type: 'button',
                                text: text.trim(),
                                className: button.className,
                                id: button.id
                            });
                        }
                    }
                }

                // Chercher des éléments avec des icônes ou classes liées à l'ajout
                const addIcons = Array.from(document.querySelectorAll('[class*="add"], [class*="plus"], .fa-plus'));
                for (let icon of addIcons) {
                    const container = icon.closest('div');
                    if (container && container.textContent.includes('adresse')) {
                        controls.push({
                            type: 'icon',
                            className: icon.className,
                            parentText: container.textContent.substring(0, 100)
                        });
                    }
                }

                return controls;
            });

            await this.log(`🎛️ Contrôles d'ajout trouvés: ${arrayControls.length}`);
            arrayControls.forEach((control, idx) => {
                this.log(`  ${idx + 1}. ${control.type}: ${control.text || control.className}`);
            });

            // Étape 5: Tenter d'ajouter un élément si des contrôles sont disponibles
            if (arrayControls.length > 0) {
                await this.log('👆 Tentative d\'ajout d\'un élément à l\'array adresse');

                const addResult = await this.page.evaluate(() => {
                    // Essayer de cliquer sur le premier contrôle d'ajout trouvé
                    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
                    for (let button of buttons) {
                        const text = button.textContent || '';
                        if ((text.includes('+') || text.toLowerCase().includes('add') || text.toLowerCase().includes('ajouter'))) {
                            const container = button.closest('div');
                            if (container && container.textContent.includes('adresse')) {
                                button.click();
                                return {
                                    clicked: true,
                                    buttonText: text.trim()
                                };
                            }
                        }
                    }
                    return { clicked: false };
                });

                if (addResult.clicked) {
                    await this.log(`✅ Clic sur contrôle d'ajout réussi: "${addResult.buttonText}"`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await this.takeScreenshot('03_after_add_click', 'Après tentative d\'ajout d\'élément');

                    // Étape 6: Vérifier l'état après l'ajout
                    await this.log('🔬 Vérification de l\'état après l\'ajout');

                    const postAddState = await this.page.evaluate(() => {
                        const result = {
                            nullElements: [],
                            newFormFields: [],
                            adresseContainerState: ''
                        };

                        // Chercher des éléments contenant "null"
                        const elements = Array.from(document.querySelectorAll('*'));
                        for (let el of elements) {
                            if (el.textContent && el.textContent.includes('null')) {
                                result.nullElements.push({
                                    tagName: el.tagName,
                                    textContent: el.textContent.trim().substring(0, 100),
                                    className: el.className
                                });
                            }
                        }

                        // Analyser les nouveaux champs de formulaire
                        const formFields = Array.from(document.querySelectorAll('input, select, textarea'));
                        result.newFormFields = formFields.map(field => ({
                            type: field.type || field.tagName.toLowerCase(),
                            name: field.name,
                            placeholder: field.placeholder,
                            value: field.value,
                            id: field.id
                        }));

                        // État du conteneur adresse
                        for (let el of elements) {
                            if (el.textContent && el.textContent.toLowerCase().includes('adresse')) {
                                const container = el.closest('div');
                                if (container && container.textContent.includes('array')) {
                                    result.adresseContainerState = container.textContent.substring(0, 300);
                                    break;
                                }
                            }
                        }

                        return result;
                    });

                    await this.log(`🔍 Éléments contenant "null": ${postAddState.nullElements.length}`);
                    postAddState.nullElements.forEach((nullEl, idx) => {
                        this.log(`  ${idx + 1}. ${nullEl.tagName}: ${nullEl.textContent}`);
                    });

                    await this.log(`📝 Nouveaux champs de formulaire: ${postAddState.newFormFields.length}`);
                    postAddState.newFormFields.forEach((field, idx) => {
                        this.log(`  ${idx + 1}. ${field.type} (${field.name || field.id || 'unnamed'}): "${field.value}"`);
                    });

                    if (postAddState.adresseContainerState) {
                        await this.log(`📦 État conteneur adresse: ${postAddState.adresseContainerState}`);
                    }

                    // Déterminer si le bug est reproduit
                    const bugReproduced = postAddState.nullElements.length > 0 ||
                                        postAddState.newFormFields.some(f => f.value === 'null');

                    await this.log(`${bugReproduced ? '🐛 BUG REPRODUIT' : '✅ Pas de bug détecté'}`);

                    return {
                        success: true,
                        bugReproduced,
                        postAddState,
                        steps: this.results.steps
                    };

                } else {
                    await this.log('❌ Impossible de cliquer sur un contrôle d\'ajout');
                }
            } else {
                await this.log('❌ Aucun contrôle d\'ajout trouvé pour la propriété adresse');
            }

            // Capture finale
            await this.takeScreenshot('04_final_state', 'État final de l\'interface');

            return {
                success: true,
                bugReproduced: false,
                message: 'Test terminé - analyse manuelle requise',
                results: this.results
            };

        } catch (error) {
            await this.log(`💥 Erreur: ${error.message}`);
            await this.takeScreenshot('error', 'État lors de l\'erreur');
            return {
                success: false,
                error: error.message,
                results: this.results
            };
        }
    }

    async generateDetailedReport(testResults) {
        const reportContent = `# RAPPORT DÉTAILLÉ - TEST CIBLÉ PROPRIÉTÉ ADRESSE

## Résumé Exécutif
- **Date**: ${new Date().toISOString()}
- **URL**: ${this.targetUrl}
- **Succès du test**: ${testResults.success ? '✅' : '❌'}
- **Bug reproduit**: ${testResults.bugReproduced ? '🐛 OUI' : '❌ NON'}

## Séquence de Test Exécutée

${this.results.steps.map((step, idx) =>
`### Étape ${idx + 1}: ${step.name}
**Description**: ${step.description}
**Timestamp**: ${step.timestamp}
**Screenshot**: ${step.screenshot}
`).join('\n')}

## Logs Détaillés

${this.results.logs.map(log => `- ${log}`).join('\n')}

## Erreurs Détectées

${this.results.errors.length > 0 ?
this.results.errors.map(error => `- ❌ ${error}`).join('\n') :
'✅ Aucune erreur détectée'}

## Analyse des Résultats

${testResults.bugReproduced ? `
### 🐛 BUG CONFIRMÉ
Le bug a été reproduit avec succès. Détails:
- **Éléments null détectés**: ${testResults.postAddState?.nullElements?.length || 0}
- **Nouveaux champs**: ${testResults.postAddState?.newFormFields?.length || 0}
- **État du conteneur**: Analysé

### Éléments Null Trouvés
${testResults.postAddState?.nullElements?.map(el =>
`- **${el.tagName}** (${el.className}): ${el.textContent}`
).join('\n') || 'Aucun'}

### Nouveaux Champs de Formulaire
${testResults.postAddState?.newFormFields?.map(field =>
`- **${field.type}** (${field.name || 'unnamed'}): "${field.value}"`
).join('\n') || 'Aucun'}
` : `
### ✅ RÉSULTAT
${testResults.message || 'Bug non reproduit automatiquement'}
`}

## Recommandations pour Investigation

1. **Examiner le code source** des composants gérant les arrays
2. **Vérifier les handlers** d'ajout d'éléments dans les arrays
3. **Analyser la génération** des formulaires dynamiques pour les objets adresse
4. **Tester manuellement** les interactions spécifiques identifiées

## Captures d'Écran Disponibles

${this.results.steps.map(step =>
`- **${step.name}**: ${step.description} (${step.screenshot})`
).join('\n')}

---
**Rapport généré par le test Puppeteer ciblé**
`;

        const reportPath = path.join(__dirname, 'targeted-bug-report.md');
        fs.writeFileSync(reportPath, reportContent);
        console.log(`📄 Rapport détaillé: ${reportPath}`);
        return reportPath;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Exécution
async function runTargetedTest() {
    const tester = new TargetedAdresseBugTest();

    try {
        await tester.init();
        const results = await tester.testAdressePropertyBug();
        await tester.generateDetailedReport(results);

        console.log('\n🎯 RÉSUMÉ DU TEST:');
        console.log(`- Succès: ${results.success ? '✅' : '❌'}`);
        console.log(`- Bug reproduit: ${results.bugReproduced ? '🐛' : '❌'}`);
        console.log(`- Étapes exécutées: ${tester.results.steps.length}`);
        console.log(`- Erreurs: ${tester.results.errors.length}`);

    } catch (error) {
        console.error('💥 Erreur fatale:', error);
    } finally {
        await tester.cleanup();
    }
}

if (require.main === module) {
    runTargetedTest().catch(console.error);
}

module.exports = TargetedAdresseBugTest;