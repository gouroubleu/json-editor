const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugJsonSchemaButtonCritique() {
    console.log('🚨 MISSION CRITIQUE - Debug bouton Configurer JsonSchema');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Capturer toutes les erreurs console
    const consoleMessages = [];
    page.on('console', msg => {
        const text = `[${msg.type().toUpperCase()}] ${msg.text()}`;
        console.log(text);
        consoleMessages.push(text);
    });

    page.on('pageerror', error => {
        const errorText = `[PAGE ERROR] ${error.message}`;
        console.log(errorText);
        consoleMessages.push(errorText);
    });

    const results = {
        timestamp: new Date().toISOString(),
        mission: 'Debug critique bouton Configurer JsonSchema',
        steps: [],
        consoleMessages: [],
        errors: [],
        finalAnalysis: ''
    };

    try {
        // Étape 1: Naviguer vers la page
        console.log('🎯 Étape 1: Navigation vers http://localhost:5502/');
        await page.goto('http://localhost:5502/', { waitUntil: 'networkidle2' });
        await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/debug-step1-homepage.png' });

        results.steps.push({
            step: 1,
            action: 'Navigation homepage',
            status: 'SUCCESS',
            url: page.url()
        });

        // Étape 2: Naviguer vers l'éditeur de schéma test-user
        console.log('🎯 Étape 2: Navigation vers éditeur schéma test-user');
        await page.goto('http://localhost:5502/edit/test-user/', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/debug-step2-schema-editor.png' });

        results.steps.push({
            step: 2,
            action: 'Navigation éditeur schéma',
            status: 'SUCCESS',
            url: page.url()
        });

        // Étape 3: Cliquer sur "Ajouter une propriété"
        console.log('🎯 Étape 3: Clic sur Ajouter une propriété');

        // Puppeteer ne supporte pas :contains, utiliser une approche différente
        const addPropertyButton = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(btn =>
                btn.textContent && btn.textContent.includes('Ajouter')
            );
        }).then(handle => handle.asElement()).catch(() => null);

        if (!addPropertyButton) {
            // Essayer d'autres sélecteurs
            const buttons = await page.$$('button');
            let foundButton = null;

            for (const button of buttons) {
                const text = await page.evaluate(btn => btn.textContent, button);
                console.log(`Bouton trouvé: "${text}"`);
                if (text && text.includes('Ajouter')) {
                    foundButton = button;
                    break;
                }
            }

            if (foundButton) {
                await foundButton.click();
            } else {
                throw new Error('Bouton Ajouter une propriété non trouvé');
            }
        } else {
            await addPropertyButton.click();
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/debug-step3-add-property.png' });

        results.steps.push({
            step: 3,
            action: 'Clic Ajouter propriété',
            status: 'SUCCESS'
        });

        // Étape 4: Remplir le nom de la propriété
        console.log('🎯 Étape 4: Saisie nom propriété "ma_reference"');
        const nameInput = await page.waitForSelector('input[placeholder*="nom"], input[name*="name"], input[type="text"]', { timeout: 5000 });
        await nameInput.click({ clickCount: 3 }); // Sélectionner tout le texte
        await nameInput.type('ma_reference');
        await new Promise(resolve => setTimeout(resolve, 500));

        results.steps.push({
            step: 4,
            action: 'Saisie nom propriété',
            status: 'SUCCESS',
            value: 'ma_reference'
        });

        // Étape 5: Sélectionner le type "jsonschema"
        console.log('🎯 Étape 5: Sélection type jsonschema');

        // Chercher le sélecteur de type
        const selects = await page.$$('select');
        let typeSelect = null;

        for (const select of selects) {
            const options = await page.evaluate(sel => {
                return Array.from(sel.options).map(opt => opt.value);
            }, select);

            console.log('Options du select:', options);

            if (options.includes('jsonschema')) {
                typeSelect = select;
                break;
            }
        }

        if (!typeSelect) {
            throw new Error('Select avec option jsonschema non trouvé');
        }

        await typeSelect.select('jsonschema');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/debug-step5-select-jsonschema.png' });

        results.steps.push({
            step: 5,
            action: 'Sélection type jsonschema',
            status: 'SUCCESS'
        });

        // Étape 6: Valider l'ajout de la propriété
        console.log('🎯 Étape 6: Validation ajout propriété');

        const validateButton = await page.evaluateHandle(() => {
            // Chercher bouton de type submit
            let btn = document.querySelector('button[type="submit"]');
            if (btn) return btn;

            // Chercher par texte
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b =>
                b.textContent && (
                    b.textContent.includes('Valider') ||
                    b.textContent.includes('Ajouter') ||
                    b.textContent.includes('Confirmer')
                )
            );
        }).then(handle => handle.asElement());

        if (!validateButton) {
            throw new Error('Bouton de validation non trouvé');
        }

        await validateButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/debug-step6-validate-property.png' });

        results.steps.push({
            step: 6,
            action: 'Validation propriété',
            status: 'SUCCESS'
        });

        // Étape 7: ANALYSE CRITIQUE - Localiser la propriété ajoutée
        console.log('🎯 Étape 7: ANALYSE CRITIQUE - Localisation propriété ma_reference');

        // Attendre que la propriété apparaisse
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Analyser toutes les propriétés présentes
        const properties = await page.evaluate(() => {
            const propertyElements = document.querySelectorAll('[data-property], .property-item, .property-row, .schema-property');
            return Array.from(propertyElements).map(el => ({
                text: el.textContent,
                classes: el.className,
                dataset: el.dataset,
                innerHTML: el.innerHTML.substring(0, 200)
            }));
        });

        console.log('Propriétés détectées:', properties);

        // Chercher spécifiquement "ma_reference"
        const maReferenceProperty = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            return elements.find(el =>
                el.textContent && el.textContent.includes('ma_reference')
            );
        });

        if (!maReferenceProperty) {
            console.log('⚠️ Propriété ma_reference non visible - Peut-être en cours d\'ajout ou masquée');
            // Ne pas échouer, continuer l'analyse
        } else {
            console.log('✅ Propriété ma_reference trouvée!');
        }

        // Attendre un peu plus pour laisser le temps à l'UI de se mettre à jour
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Étape 8: MOMENT CRITIQUE - Localiser le bouton Configurer
        console.log('🚨 Étape 8: MOMENT CRITIQUE - Localisation bouton Configurer');

        // Capturer l'état du DOM avant recherche
        const domAnalysis = await page.evaluate(() => {
            // Chercher tous les boutons possibles
            const buttons = Array.from(document.querySelectorAll('button, [role="button"], .button, .btn'));
            const links = Array.from(document.querySelectorAll('a, .link'));
            const clickables = Array.from(document.querySelectorAll('[onclick], [onmousedown]'));

            // Chercher spécifiquement les éléments avec "→" ou "Configurer"
            const arrows = Array.from(document.querySelectorAll('*')).filter(el =>
                el.textContent && (
                    el.textContent.includes('→') ||
                    el.textContent.includes('Configurer') ||
                    el.textContent.includes('▶') ||
                    el.textContent.includes('>')
                )
            );

            // Analyser les propriétés jsonschema
            const jsonschemaElements = Array.from(document.querySelectorAll('*')).filter(el =>
                el.textContent && el.textContent.toLowerCase().includes('jsonschema')
            );

            return {
                buttons: buttons.map(btn => ({
                    text: btn.textContent?.trim(),
                    classes: btn.className,
                    disabled: btn.disabled,
                    style: btn.style.cssText,
                    innerHTML: btn.innerHTML.substring(0, 100)
                })),
                links: links.map(link => ({
                    text: link.textContent?.trim(),
                    href: link.href,
                    classes: link.className
                })),
                arrows: arrows.map(el => ({
                    text: el.textContent?.trim(),
                    tag: el.tagName,
                    classes: el.className,
                    innerHTML: el.innerHTML.substring(0, 100)
                })),
                jsonschemaElements: jsonschemaElements.map(el => ({
                    text: el.textContent?.trim(),
                    tag: el.tagName,
                    classes: el.className,
                    parentTag: el.parentElement?.tagName,
                    parentClasses: el.parentElement?.className
                })),
                clickables: clickables.map(el => ({
                    text: el.textContent?.trim(),
                    tag: el.tagName,
                    classes: el.className
                }))
            };
        });

        console.log('ANALYSE DOM - Boutons:', domAnalysis.buttons);
        console.log('ANALYSE DOM - Flèches/Configurer:', domAnalysis.arrows);
        console.log('ANALYSE DOM - Éléments JsonSchema:', domAnalysis.jsonschemaElements);
        console.log('ANALYSE DOM - Links:', domAnalysis.links);
        console.log('ANALYSE DOM - Clickables:', domAnalysis.clickables);

        // Chercher le bouton Configurer de plusieurs façons
        let configurerButton = null;

        // Méthode 1: Par texte exact
        configurerButton = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(btn =>
                btn.textContent && btn.textContent.includes('Configurer')
            );
        }).then(handle => handle.asElement()).catch(() => null);

        // Méthode 2: Par sélecteur CSS
        if (!configurerButton) {
            configurerButton = await page.$('button[class*="configure"], .configure-btn, .config-button');
        }

        // Méthode 3: Flèche ou symbole
        if (!configurerButton) {
            configurerButton = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button, .arrow-button'));
                return buttons.find(btn =>
                    btn.textContent && (
                        btn.textContent.includes('→') ||
                        btn.textContent.includes('▶') ||
                        btn.textContent.includes('>')
                    )
                );
            }).then(handle => handle.asElement()).catch(() => null);
        }

        // Méthode 4: Analyse contextuelle autour de ma_reference
        if (!configurerButton) {
            const contextualButton = await page.evaluate(() => {
                // Trouver l'élément contenant ma_reference
                const propertyElement = Array.from(document.querySelectorAll('*')).find(el =>
                    el.textContent && el.textContent.includes('ma_reference')
                );

                if (propertyElement) {
                    // Chercher un bouton dans le même conteneur parent
                    const parent = propertyElement.closest('.property-row, .property-item, .schema-property, tr, div');
                    if (parent) {
                        const buttons = parent.querySelectorAll('button, [role="button"], .btn');
                        return Array.from(buttons).map(btn => ({
                            text: btn.textContent?.trim(),
                            classes: btn.className,
                            disabled: btn.disabled,
                            outerHTML: btn.outerHTML.substring(0, 200)
                        }));
                    }
                }
                return null;
            });

            console.log('Boutons contextuels près de ma_reference:', contextualButton);
        }

        if (!configurerButton) {
            results.errors.push('ERREUR CRITIQUE: Bouton Configurer introuvable');

            // Analyser plus profondément pourquoi
            const deepAnalysis = await page.evaluate(() => {
                // Vérifier si la correction est bien présente
                const scripts = Array.from(document.querySelectorAll('script'));
                let foundCorrection = false;

                for (const script of scripts) {
                    if (script.textContent && script.textContent.includes('property.type === \'jsonschema\'')) {
                        foundCorrection = true;
                        break;
                    }
                }

                // Analyser l'état du composant
                const propertyElements = Array.from(document.querySelectorAll('*')).filter(el =>
                    el.textContent && el.textContent.includes('ma_reference')
                );

                return {
                    correctionPresente: foundCorrection,
                    nombreProprietesReference: propertyElements.length,
                    debugInfo: propertyElements.map(el => ({
                        tag: el.tagName,
                        classes: el.className,
                        parent: el.parentElement?.tagName,
                        siblings: Array.from(el.parentElement?.children || []).map(child => child.tagName)
                    }))
                };
            });

            console.log('ANALYSE PROFONDE:', deepAnalysis);
            results.deepAnalysis = deepAnalysis;

        } else {
            console.log('✅ Bouton Configurer trouvé!');

            // Étape 9: CLIC CRITIQUE sur le bouton
            console.log('🚨 Étape 9: CLIC CRITIQUE sur bouton Configurer');

            await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/debug-step9-before-click.png' });

            await configurerButton.click();
            await new Promise(resolve => setTimeout(resolve, 2000));

            await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/debug-step9-after-click.png' });

            // Vérifier ce qui s'est passé
            const afterClickAnalysis = await page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    hasModal: !!document.querySelector('.modal, [role="dialog"]'),
                    hasNewContent: !!document.querySelector('.config-panel, .configuration'),
                    columnCount: document.querySelectorAll('.column, .property-column').length
                };
            });

            console.log('Analyse après clic:', afterClickAnalysis);

            results.steps.push({
                step: 9,
                action: 'Clic bouton Configurer',
                status: 'SUCCESS',
                analysis: afterClickAnalysis
            });
        }

        // Capturer les logs console
        results.consoleMessages = consoleMessages;

        await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/debug-final-state.png' });

    } catch (error) {
        console.error('🚨 ERREUR CRITIQUE:', error);
        results.errors.push({
            message: error.message,
            stack: error.stack
        });

        await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/debug-error-state.png' });
    }

    // Générer le rapport critique
    const reportPath = '/home/gouroubleu/WS/json-editor/CLAUDE/debug-jsonschema-rapport-critique.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log('\n🎯 RAPPORT CRITIQUE GÉNÉRÉ:', reportPath);
    console.log('\n📊 RÉSUMÉ:');
    console.log(`- Étapes réussies: ${results.steps.filter(s => s.status === 'SUCCESS').length}`);
    console.log(`- Erreurs détectées: ${results.errors.length}`);
    console.log(`- Messages console: ${results.consoleMessages.length}`);

    if (results.errors.length > 0) {
        console.log('\n🚨 ERREURS CRITIQUES IDENTIFIÉES:');
        results.errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error.message || error}`);
        });
    }

    await browser.close();

    return results;
}

// Exécution
debugJsonSchemaButtonCritique().then(results => {
    console.log('\n✅ Mission critique terminée');
    process.exit(0);
}).catch(error => {
    console.error('🚨 Échec mission critique:', error);
    process.exit(1);
});