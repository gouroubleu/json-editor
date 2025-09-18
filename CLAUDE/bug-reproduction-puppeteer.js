/**
 * Script Puppeteer pour reproduire le bug de la propriété "adresse"
 * Bug: Élément ajouté null + formulaire incorrect sur test-user/new
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class AdresseBugReproducer {
    constructor() {
        this.browser = null;
        this.page = null;
        this.screenshots = [];
        this.logs = [];
        this.errors = [];
        this.targetUrl = 'http://localhost:5505/bdd/test-user/new/';
        this.screenshotDir = path.join(__dirname, 'screenshots');
    }

    async init() {
        // Créer le dossier screenshots s'il n'existe pas
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }

        this.browser = await puppeteer.launch({
            headless: true, // Mode headless pour environnement sans X
            slowMo: 100, // Ralentir pour observer
            devtools: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--disable-gpu',
                '--disable-web-security'
            ]
        });

        this.page = await this.browser.newPage();

        // Configurer la taille de viewport
        await this.page.setViewport({ width: 1400, height: 900 });

        // Écouter les logs console
        this.page.on('console', msg => {
            const text = msg.text();
            this.logs.push(`[${msg.type()}] ${text}`);
            console.log(`🔍 Console ${msg.type()}: ${text}`);
        });

        // Écouter les erreurs
        this.page.on('pageerror', error => {
            this.errors.push(error.message);
            console.error('❌ Page Error:', error.message);
        });

        // Écouter les requêtes échouées
        this.page.on('requestfailed', request => {
            console.error('🔥 Request Failed:', request.url(), request.failure().errorText);
        });
    }

    async takeScreenshot(name, description) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}_${name}.png`;
        const filepath = path.join(this.screenshotDir, filename);

        await this.page.screenshot({
            path: filepath,
            fullPage: true
        });

        this.screenshots.push({
            name,
            description,
            filename,
            timestamp: new Date().toISOString()
        });

        console.log(`📸 Screenshot: ${description} -> ${filename}`);
    }

    async logDOMState(selector, description) {
        try {
            const element = await this.page.$(selector);
            if (element) {
                const innerHTML = await this.page.evaluate(el => el.innerHTML, element);
                const outerHTML = await this.page.evaluate(el => el.outerHTML, element);

                console.log(`🏗️ DOM State - ${description}:`);
                console.log(`Selector: ${selector}`);
                console.log(`Inner HTML (first 200 chars): ${innerHTML.substring(0, 200)}...`);

                this.logs.push({
                    type: 'dom_state',
                    description,
                    selector,
                    innerHTML: innerHTML.substring(0, 500),
                    outerHTML: outerHTML.substring(0, 500),
                    timestamp: new Date().toISOString()
                });
            } else {
                console.log(`⚠️ Element not found: ${selector}`);
            }
        } catch (error) {
            console.error(`❌ Error logging DOM state for ${selector}:`, error.message);
        }
    }

    async reproduceAdresseBug() {
        console.log('🚀 Début de la reproduction du bug adresse...');

        try {
            // Étape 1: Navigation vers la page
            console.log('📍 Étape 1: Navigation vers test-user/new');
            await this.page.goto(this.targetUrl, { waitUntil: 'networkidle2' });
            await this.takeScreenshot('01_page_loaded', 'Page initiale chargée');

            // Attendre que la page soit complètement chargée
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Étape 2: Localiser la propriété "adresse"
            console.log('🔍 Étape 2: Localisation de la propriété adresse');

            // Chercher différents sélecteurs possibles pour la propriété adresse
            const adresseSelectors = [
                '[data-property="adresse"]',
                '.property-adresse',
                '[class*="adresse"]',
                'div:has-text("adresse")',
                'label:has-text("adresse")',
                'span:has-text("adresse")'
            ];

            let adresseElement = null;
            let adresseSelector = null;

            for (const selector of adresseSelectors) {
                try {
                    // Timeout court pour chaque sélecteur
                    adresseElement = await this.page.waitForSelector(selector, { timeout: 1000 }).catch(() => null);
                    if (adresseElement) {
                        adresseSelector = selector;
                        console.log(`✅ Propriété adresse trouvée avec: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Continuer avec le prochain sélecteur
                }
            }

            // Si aucun sélecteur spécifique ne fonctionne, chercher par texte
            if (!adresseElement) {
                console.log('🔍 Recherche par texte "adresse"...');
                try {
                    await this.page.waitForFunction(() => {
                        return Array.from(document.querySelectorAll('*')).find(el =>
                            el.textContent && el.textContent.toLowerCase().includes('adresse')
                        );
                    }, { timeout: 5000 });

                    adresseElement = await this.page.evaluateHandle(() => {
                        return Array.from(document.querySelectorAll('*')).find(el =>
                            el.textContent && el.textContent.toLowerCase().includes('adresse')
                        );
                    });
                    adresseSelector = 'text-based-search';
                    console.log('✅ Propriété adresse trouvée par recherche textuelle');
                } catch (e) {
                    console.error('❌ Impossible de localiser la propriété adresse');
                    await this.takeScreenshot('02_adresse_not_found', 'Propriété adresse non trouvée');

                    // Logger tout le contenu de la page pour debug
                    const pageContent = await this.page.content();
                    console.log('📄 Contenu de la page (premiers 1000 caractères):');
                    console.log(pageContent.substring(0, 1000));

                    return { success: false, error: 'Propriété adresse non trouvée' };
                }
            }

            await this.takeScreenshot('02_adresse_found', 'Propriété adresse localisée');
            await this.logDOMState(adresseSelector || 'body', 'État DOM après localisation adresse');

            // Étape 3: Chercher la flèche pour ouvrir la configuration
            console.log('🎯 Étape 3: Recherche de la flèche de configuration');

            // Chercher les éléments de contrôle près de la propriété adresse
            const arrowSelectors = [
                `${adresseSelector} .arrow`,
                `${adresseSelector} .expand`,
                `${adresseSelector} .toggle`,
                `${adresseSelector} button`,
                `${adresseSelector} [class*="arrow"]`,
                `${adresseSelector} [class*="expand"]`,
                `${adresseSelector} [class*="toggle"]`
            ];

            let arrowElement = null;
            let arrowSelector = null;

            for (const selector of arrowSelectors) {
                try {
                    arrowElement = await this.page.$(selector);
                    if (arrowElement) {
                        arrowSelector = selector;
                        console.log(`✅ Flèche trouvée avec: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Continuer
                }
            }

            // Si pas de flèche spécifique, essayer de cliquer sur l'élément adresse lui-même
            if (!arrowElement && adresseElement) {
                console.log('🔄 Tentative de clic direct sur l\'élément adresse');
                arrowElement = adresseElement;
                arrowSelector = adresseSelector;
            }

            if (!arrowElement) {
                console.error('❌ Impossible de trouver la flèche ou contrôle de configuration');
                await this.takeScreenshot('03_arrow_not_found', 'Flèche de configuration non trouvée');
                return { success: false, error: 'Flèche de configuration non trouvée' };
            }

            // Étape 4: Cliquer sur la flèche pour ouvrir la configuration
            console.log('👆 Étape 4: Clic sur la flèche de configuration');
            await this.takeScreenshot('04_before_click', 'Avant clic sur la flèche');

            // Scroller vers l'élément et cliquer
            await arrowElement.scrollIntoView();
            await new Promise(resolve => setTimeout(resolve, 500));
            await arrowElement.click();

            // Attendre que l'interface se mette à jour
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.takeScreenshot('04_after_click', 'Après clic sur la flèche');

            // Étape 5: Observer l'état de la colonne de droite
            console.log('👀 Étape 5: Observation de la colonne de droite');

            const rightColumnSelectors = [
                '.right-column',
                '.config-panel',
                '.property-config',
                '[class*="right"]',
                '[class*="config"]',
                '[class*="panel"]'
            ];

            let rightColumnFound = false;
            for (const selector of rightColumnSelectors) {
                const element = await this.page.$(selector);
                if (element) {
                    await this.logDOMState(selector, `Colonne droite trouvée: ${selector}`);
                    rightColumnFound = true;
                    break;
                }
            }

            if (!rightColumnFound) {
                console.log('⚠️ Aucune colonne de droite spécifique détectée');
                await this.logDOMState('body', 'État général du DOM après clic');
            }

            // Étape 6: Chercher le bouton d'ajout
            console.log('🔍 Étape 6: Recherche du bouton d\'ajout');

            const addButtonSelectors = [
                '.add-button',
                '.btn-add',
                'button[class*="add"]',
                'button:has-text("+")',
                'button:has-text("Ajouter")',
                'button:has-text("Add")',
                '[role="button"]:has-text("+")',
                '.fa-plus'
            ];

            let addButton = null;
            let addButtonSelector = null;

            for (const selector of addButtonSelectors) {
                try {
                    addButton = await this.page.$(selector);
                    if (addButton) {
                        addButtonSelector = selector;
                        console.log(`✅ Bouton d'ajout trouvé: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Continuer
                }
            }

            // Recherche par texte si aucun sélecteur ne fonctionne
            if (!addButton) {
                try {
                    addButton = await this.page.evaluateHandle(() => {
                        return Array.from(document.querySelectorAll('button, [role="button"]')).find(el =>
                            el.textContent && (
                                el.textContent.includes('+') ||
                                el.textContent.toLowerCase().includes('add') ||
                                el.textContent.toLowerCase().includes('ajouter')
                            )
                        );
                    });
                    addButtonSelector = 'text-based-add-button';
                    console.log('✅ Bouton d\'ajout trouvé par recherche textuelle');
                } catch (e) {
                    console.error('❌ Impossible de trouver le bouton d\'ajout');
                }
            }

            await this.takeScreenshot('05_add_button_search', 'Recherche du bouton d\'ajout');

            // Étape 7: Cliquer sur le bouton d'ajout et observer le résultat
            if (addButton) {
                console.log('👆 Étape 7: Clic sur le bouton d\'ajout');
                await this.takeScreenshot('06_before_add_click', 'Avant clic sur le bouton d\'ajout');

                await addButton.scrollIntoView();
                await new Promise(resolve => setTimeout(resolve, 500));
                await addButton.click();

                // Attendre la réaction de l'interface
                await new Promise(resolve => setTimeout(resolve, 3000));
                await this.takeScreenshot('06_after_add_click', 'Après clic sur le bouton d\'ajout');

                // Étape 8: Analyser l'élément ajouté
                console.log('🔬 Étape 8: Analyse de l\'élément ajouté');

                // Chercher des indicateurs que quelque chose a été ajouté
                const newElementSelectors = [
                    '.added-item',
                    '.new-item',
                    '.item:last-child',
                    '[class*="item"]:last-of-type',
                    'li:last-child',
                    'div:last-child'
                ];

                for (const selector of newElementSelectors) {
                    await this.logDOMState(selector, `Recherche nouvel élément: ${selector}`);
                }

                // Vérifier s'il y a des messages d'erreur ou des valeurs null
                const possibleNullIndicators = await this.page.evaluate(() => {
                    const elements = Array.from(document.querySelectorAll('*'));
                    return elements.filter(el =>
                        el.textContent && (
                            el.textContent.includes('null') ||
                            el.textContent.includes('undefined') ||
                            el.textContent.includes('error') ||
                            el.textContent.includes('erreur')
                        )
                    ).map(el => ({
                        tagName: el.tagName,
                        textContent: el.textContent.substring(0, 100),
                        className: el.className
                    }));
                });

                if (possibleNullIndicators.length > 0) {
                    console.log('⚠️ Indicateurs de problème détectés:');
                    possibleNullIndicators.forEach(indicator => {
                        console.log(`  - ${indicator.tagName}.${indicator.className}: ${indicator.textContent}`);
                    });
                }

            } else {
                console.log('❌ Impossible de tester l\'ajout - bouton non trouvé');
            }

            // Étape 9: Capture finale et analyse du formulaire
            console.log('📋 Étape 9: Analyse du formulaire affiché');
            await this.takeScreenshot('07_final_state', 'État final de l\'interface');

            // Analyser tous les champs de formulaire visibles
            const formFields = await this.page.evaluate(() => {
                const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
                return inputs.map(input => ({
                    type: input.type || input.tagName,
                    name: input.name,
                    id: input.id,
                    placeholder: input.placeholder,
                    value: input.value,
                    className: input.className
                }));
            });

            console.log('📝 Champs de formulaire détectés:');
            formFields.forEach(field => {
                console.log(`  - ${field.type}: ${field.name || field.id || 'unnamed'} (${field.placeholder || 'no placeholder'})`);
            });

            // Analyser les labels associés
            const labels = await this.page.evaluate(() => {
                return Array.from(document.querySelectorAll('label')).map(label => ({
                    textContent: label.textContent.trim(),
                    htmlFor: label.htmlFor,
                    className: label.className
                }));
            });

            console.log('🏷️ Labels détectés:');
            labels.forEach(label => {
                console.log(`  - "${label.textContent}" (for: ${label.htmlFor})`);
            });

            return {
                success: true,
                results: {
                    adresseFound: !!adresseElement,
                    adresseSelector,
                    arrowFound: !!arrowElement,
                    arrowSelector,
                    addButtonFound: !!addButton,
                    addButtonSelector,
                    formFields,
                    labels,
                    possibleNullIndicators,
                    screenshots: this.screenshots,
                    logs: this.logs,
                    errors: this.errors
                }
            };

        } catch (error) {
            console.error('💥 Erreur lors de la reproduction:', error);
            await this.takeScreenshot('error_state', 'État lors de l\'erreur');
            return {
                success: false,
                error: error.message,
                screenshots: this.screenshots,
                logs: this.logs,
                errors: this.errors
            };
        }
    }

    async generateReport(results) {
        const reportContent = `# RAPPORT DE REPRODUCTION DU BUG ADRESSE

## Résumé Exécutif
- **Date**: ${new Date().toISOString()}
- **URL testée**: ${this.targetUrl}
- **Succès**: ${results.success ? '✅ Oui' : '❌ Non'}

## Détails des Résultats

### Localisation des Éléments
- **Propriété adresse trouvée**: ${results.results?.adresseFound ? '✅' : '❌'}
  - Sélecteur utilisé: \`${results.results?.adresseSelector || 'N/A'}\`
- **Flèche de configuration trouvée**: ${results.results?.arrowFound ? '✅' : '❌'}
  - Sélecteur utilisé: \`${results.results?.arrowSelector || 'N/A'}\`
- **Bouton d'ajout trouvé**: ${results.results?.addButtonFound ? '✅' : '❌'}
  - Sélecteur utilisé: \`${results.results?.addButtonSelector || 'N/A'}\`

### Champs de Formulaire Détectés
${results.results?.formFields?.map(field =>
    `- **${field.type}**: ${field.name || field.id || 'unnamed'} ${field.placeholder ? `(${field.placeholder})` : ''}`
).join('\n') || 'Aucun champ détecté'}

### Labels Détectés
${results.results?.labels?.map(label =>
    `- "${label.textContent}" ${label.htmlFor ? `(for: ${label.htmlFor})` : ''}`
).join('\n') || 'Aucun label détecté'}

### Indicateurs de Problème
${results.results?.possibleNullIndicators?.length > 0 ?
    results.results.possibleNullIndicators.map(indicator =>
        `- **${indicator.tagName}**: ${indicator.textContent}`
    ).join('\n') : 'Aucun indicateur de problème détecté'}

### Screenshots Capturées
${this.screenshots.map(screenshot =>
    `- **${screenshot.name}**: ${screenshot.description} (${screenshot.filename})`
).join('\n')}

### Logs Console
${this.logs.length > 0 ? this.logs.map(log => `- ${typeof log === 'string' ? log : JSON.stringify(log)}`).join('\n') : 'Aucun log console'}

### Erreurs Détectées
${this.errors.length > 0 ? this.errors.map(error => `- ❌ ${error}`).join('\n') : 'Aucune erreur détectée'}

## Analyse Technique

### Hypothèses sur le Bug
1. **Élément ajouté null**: ${results.results?.possibleNullIndicators?.some(i => i.textContent.includes('null')) ? 'Confirmé par indicateurs null détectés' : 'Non confirmé visuellement'}
2. **Formulaire incorrect**: Analyse des champs nécessaire pour comparaison avec définition adresse
3. **Configuration colonne droite**: ${results.results?.arrowFound ? 'Interaction possible testée' : 'Interaction non testable - élément non trouvé'}

### Recommandations pour Investigation
1. Examiner le code source des composants liés à la propriété adresse
2. Vérifier les handlers d'événements pour l'ajout d'éléments
3. Analyser la génération du formulaire dynamique
4. Vérifier la correspondance avec le schéma de définition adresse

---
**Rapport généré automatiquement par le script Puppeteer de reproduction de bug**
`;

        const reportPath = path.join(__dirname, 'bug-reproduction-report.md');
        fs.writeFileSync(reportPath, reportContent);
        console.log(`📄 Rapport généré: ${reportPath}`);

        return reportPath;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Exécution du script
async function main() {
    const reproducer = new AdresseBugReproducer();

    try {
        await reproducer.init();
        console.log('🚀 Initialisation terminée, début de la reproduction...');

        const results = await reproducer.reproduceAdresseBug();
        console.log('📊 Reproduction terminée, génération du rapport...');

        const reportPath = await reproducer.generateReport(results);
        console.log(`✅ Rapport complet disponible: ${reportPath}`);

        // Afficher un résumé dans la console
        if (results.success) {
            console.log('\n🎯 RÉSUMÉ DES RÉSULTATS:');
            console.log(`- Propriété adresse: ${results.results.adresseFound ? '✅ Trouvée' : '❌ Non trouvée'}`);
            console.log(`- Flèche config: ${results.results.arrowFound ? '✅ Trouvée' : '❌ Non trouvée'}`);
            console.log(`- Bouton ajout: ${results.results.addButtonFound ? '✅ Trouvé' : '❌ Non trouvé'}`);
            console.log(`- Screenshots: ${reproducer.screenshots.length} capturées`);
            console.log(`- Erreurs: ${reproducer.errors.length} détectées`);
        } else {
            console.log(`\n❌ ÉCHEC: ${results.error}`);
        }

    } catch (error) {
        console.error('💥 Erreur fatale:', error);
    } finally {
        await reproducer.cleanup();
        console.log('🧹 Nettoyage terminé');
    }
}

// Lancer le script si exécuté directement
if (require.main === module) {
    main().catch(console.error);
}

module.exports = AdresseBugReproducer;