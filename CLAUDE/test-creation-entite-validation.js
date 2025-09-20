const puppeteer = require('puppeteer');
const fs = require('fs');

// Test de validation de la création d'entité pour comprendre l'éditeur JSON Schema
async function testEntityCreationValidation() {
    console.log('🎯 Test de validation - Création d\'entité pour éditeur JSON Schema');

    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1400, height: 900 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        // 1. Aller sur la page principale du schéma test-user
        console.log('📍 Navigation vers la page du schéma test-user...');
        await page.goto('http://localhost:5501/bdd/test-user/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.screenshot({ path: './CLAUDE/entity-list-page.png', fullPage: true });
        console.log('✅ Page de liste des entités chargée');

        // 2. Cliquer sur "➕ Nouvelle entité" pour accéder à l'éditeur
        console.log('\n🖱️ Clic sur "Nouvelle entité"...');

        const newEntityButton = await page.$('button.btn.btn-primary');
        if (newEntityButton) {
            const buttonText = await page.evaluate(btn => btn.textContent, newEntityButton);
            console.log(`🔘 Bouton trouvé: "${buttonText}"`);

            await newEntityButton.click();
            await new Promise(resolve => setTimeout(resolve, 3000));

            await page.screenshot({ path: './CLAUDE/after-new-entity-click.png', fullPage: true });
            console.log('✅ Clic effectué, analyse de la nouvelle page...');
        } else {
            throw new Error('Bouton "Nouvelle entité" non trouvé');
        }

        // 3. Analyser l'interface de création d'entité
        const entityCreationInterface = await page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                // Analyser les colonnes et l'interface horizontale
                columns: Array.from(document.querySelectorAll('[class*="column"], [class*="col"]')).map(col => ({
                    classes: col.className,
                    content: col.textContent.trim().substring(0, 100),
                    childrenCount: col.children.length
                })),
                // Rechercher l'éditeur de schéma horizontal
                schemaEditor: Array.from(document.querySelectorAll('*')).filter(el => {
                    const classes = el.className.toLowerCase();
                    return classes.includes('schema') ||
                           classes.includes('editor') ||
                           classes.includes('property') ||
                           classes.includes('horizontal');
                }).map(el => ({
                    tag: el.tagName,
                    classes: el.className,
                    content: el.textContent.trim().substring(0, 80)
                })),
                // Rechercher des boutons pour ajouter des propriétés
                propertyButtons: Array.from(document.querySelectorAll('button')).filter(btn => {
                    const text = btn.textContent.toLowerCase();
                    return text.includes('property') ||
                           text.includes('add') ||
                           text.includes('field') ||
                           text.includes('+') ||
                           text.includes('ajouter');
                }).map(btn => ({
                    text: btn.textContent.trim(),
                    classes: btn.className,
                    id: btn.id
                })),
                // Rechercher des formulaires et champs
                forms: Array.from(document.querySelectorAll('form')).map(form => ({
                    action: form.action,
                    inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
                        type: input.type,
                        name: input.name,
                        placeholder: input.placeholder,
                        value: input.value
                    }))
                })),
                // Rechercher tous les inputs disponibles
                allInputs: Array.from(document.querySelectorAll('input, select, textarea')).map(input => ({
                    type: input.type,
                    name: input.name,
                    placeholder: input.placeholder,
                    value: input.value,
                    parentClass: input.parentElement ? input.parentElement.className : ''
                })),
                // Rechercher des éléments avec des classes spécifiques à l'éditeur
                editorElements: Array.from(document.querySelectorAll('[class*="editor"], [class*="schema"], [class*="property"], [class*="field"], [class*="horizontal"]')).map(el => ({
                    tag: el.tagName,
                    classes: el.className,
                    id: el.id,
                    content: el.textContent.trim().substring(0, 60)
                }))
            };
        });

        console.log('\n📊 Analyse de l\'interface de création:');
        console.log(`- URL: ${entityCreationInterface.url}`);
        console.log(`- Titre: ${entityCreationInterface.title}`);
        console.log(`- Colonnes détectées: ${entityCreationInterface.columns.length}`);
        console.log(`- Éléments éditeur: ${entityCreationInterface.schemaEditor.length}`);
        console.log(`- Boutons de propriété: ${entityCreationInterface.propertyButtons.length}`);
        console.log(`- Formulaires: ${entityCreationInterface.forms.length}`);
        console.log(`- Inputs totaux: ${entityCreationInterface.allInputs.length}`);
        console.log(`- Éléments d'éditeur: ${entityCreationInterface.editorElements.length}`);

        // 4. Afficher les détails des éléments trouvés
        if (entityCreationInterface.propertyButtons.length > 0) {
            console.log('\n🔘 Boutons de propriété trouvés:');
            entityCreationInterface.propertyButtons.forEach((btn, i) => {
                console.log(`  ${i + 1}. "${btn.text}" (${btn.classes})`);
            });
        }

        if (entityCreationInterface.allInputs.length > 0) {
            console.log('\n📝 Champs de saisie disponibles:');
            entityCreationInterface.allInputs.forEach((input, i) => {
                console.log(`  ${i + 1}. ${input.type}: "${input.placeholder}" (${input.parentClass})`);
            });
        }

        if (entityCreationInterface.editorElements.length > 0) {
            console.log('\n⚙️ Éléments d\'éditeur détectés:');
            entityCreationInterface.editorElements.forEach((el, i) => {
                console.log(`  ${i + 1}. ${el.tag}.${el.classes}: "${el.content}"`);
            });
        }

        // 5. Essayer d'interagir avec l'interface pour tester l'ajout de propriété
        if (entityCreationInterface.propertyButtons.length > 0) {
            console.log('\n🎯 Test d\'ajout de propriété...');

            try {
                // Cliquer sur le premier bouton de propriété trouvé
                const firstPropertyButton = entityCreationInterface.propertyButtons[0];
                console.log(`🖱️ Clic sur: "${firstPropertyButton.text}"`);

                if (firstPropertyButton.id) {
                    await page.click(`#${firstPropertyButton.id}`);
                } else {
                    // Essayer de cliquer par classe ou texte
                    await page.click('button');
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
                await page.screenshot({ path: './CLAUDE/after-property-button-click.png', fullPage: true });

                // Analyser l'état après le clic
                const afterPropertyClick = await page.evaluate(() => {
                    return {
                        url: window.location.href,
                        newInputs: Array.from(document.querySelectorAll('input, select, textarea')).length,
                        modals: document.querySelectorAll('[role="dialog"], .modal, .popup').length,
                        typeSelectors: Array.from(document.querySelectorAll('select')).map(select => ({
                            name: select.name,
                            options: Array.from(select.options).map(opt => ({
                                value: opt.value,
                                text: opt.textContent
                            }))
                        }))
                    };
                });

                console.log('📊 État après clic sur propriété:');
                console.log(`- Nouveaux inputs: ${afterPropertyClick.newInputs}`);
                console.log(`- Modales: ${afterPropertyClick.modals}`);
                console.log(`- Sélecteurs de type: ${afterPropertyClick.typeSelectors.length}`);

                // Si nous avons des sélecteurs de type, afficher leurs options
                if (afterPropertyClick.typeSelectors.length > 0) {
                    console.log('\n📋 Sélecteurs de type disponibles:');
                    afterPropertyClick.typeSelectors.forEach((selector, i) => {
                        console.log(`  ${i + 1}. ${selector.name}:`);
                        selector.options.forEach(opt => {
                            console.log(`    - ${opt.value}: "${opt.text}"`);
                        });
                    });

                    // Rechercher et sélectionner le type "select" si disponible
                    const selectTypeOption = afterPropertyClick.typeSelectors.find(selector =>
                        selector.options.some(opt =>
                            opt.value.toLowerCase().includes('select') ||
                            opt.text.toLowerCase().includes('select')
                        )
                    );

                    if (selectTypeOption) {
                        const selectOption = selectTypeOption.options.find(opt =>
                            opt.value.toLowerCase().includes('select') ||
                            opt.text.toLowerCase().includes('select')
                        );

                        console.log(`\n🎯 Type "select" trouvé: ${selectOption.text}`);

                        try {
                            await page.select('select', selectOption.value);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            await page.screenshot({ path: './CLAUDE/select-type-chosen.png', fullPage: true });
                            console.log('✅ Type "select" sélectionné');

                            // Analyser l'interface après sélection du type select
                            const afterSelectType = await page.evaluate(() => {
                                return {
                                    selectConfigOptions: Array.from(document.querySelectorAll('*')).filter(el => {
                                        const text = el.textContent.toLowerCase();
                                        return text.includes('option') || text.includes('enum') || text.includes('choice');
                                    }).map(el => ({
                                        tag: el.tagName,
                                        text: el.textContent.trim().substring(0, 60),
                                        classes: el.className
                                    })),
                                    optionInputs: Array.from(document.querySelectorAll('input')).filter(input => {
                                        return input.placeholder && (
                                            input.placeholder.toLowerCase().includes('option') ||
                                            input.placeholder.toLowerCase().includes('value') ||
                                            input.placeholder.toLowerCase().includes('choice')
                                        );
                                    }).map(input => ({
                                        placeholder: input.placeholder,
                                        name: input.name,
                                        type: input.type
                                    }))
                                };
                            });

                            console.log('\n⚙️ Configuration du type select:');
                            console.log(`- Éléments de configuration: ${afterSelectType.selectConfigOptions.length}`);
                            console.log(`- Inputs d'options: ${afterSelectType.optionInputs.length}`);

                            if (afterSelectType.optionInputs.length > 0) {
                                console.log('\n📝 Champs d\'options disponibles:');
                                afterSelectType.optionInputs.forEach((input, i) => {
                                    console.log(`  ${i + 1}. "${input.placeholder}" (${input.type})`);
                                });
                            }

                        } catch (selectError) {
                            console.log(`❌ Erreur lors de la sélection du type: ${selectError.message}`);
                        }
                    }
                }

            } catch (interactionError) {
                console.log(`❌ Erreur lors de l'interaction: ${interactionError.message}`);
            }
        }

        // 6. Rechercher du contenu JSON Schema dans la page
        const jsonSchemaContent = await page.evaluate(() => {
            // Rechercher dans tous les éléments de la page
            const elements = Array.from(document.querySelectorAll('*'));
            let schemaFound = null;

            elements.forEach(el => {
                const text = el.textContent || el.innerText;
                if (text && text.includes('"type"') && text.includes('"properties"')) {
                    try {
                        const parsed = JSON.parse(text);
                        if (parsed.type && parsed.properties) {
                            schemaFound = parsed;
                        }
                    } catch (e) {
                        // Ignorer les erreurs de parsing
                    }
                }
            });

            return schemaFound;
        });

        if (jsonSchemaContent) {
            console.log('\n📋 JSON Schema détecté dans la page:');
            console.log(JSON.stringify(jsonSchemaContent, null, 2));
        } else {
            console.log('\n⚠️ Aucun JSON Schema détecté dans la page');
        }

        // 7. Sauvegarder le rapport complet
        const finalReport = {
            timestamp: new Date().toISOString(),
            testType: 'Entity Creation Validation',
            finalUrl: page.url(),
            entityCreationInterface,
            jsonSchemaFound: !!jsonSchemaContent,
            jsonSchema: jsonSchemaContent,
            testResults: {
                interfaceLoaded: true,
                propertyButtonsFound: entityCreationInterface.propertyButtons.length > 0,
                inputsAvailable: entityCreationInterface.allInputs.length > 0,
                editorElementsFound: entityCreationInterface.editorElements.length > 0,
                canAddProperties: entityCreationInterface.propertyButtons.length > 0
            }
        };

        fs.writeFileSync('./CLAUDE/rapport-creation-entite-validation.json', JSON.stringify(finalReport, null, 2));
        console.log('\n📊 Rapport complet sauvegardé: ./CLAUDE/rapport-creation-entite-validation.json');

        return finalReport;

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        await page.screenshot({ path: './CLAUDE/error-screenshot.png', fullPage: true });
        throw error;
    } finally {
        await browser.close();
    }
}

// Exécution du test
if (require.main === module) {
    testEntityCreationValidation()
        .then(report => {
            console.log('\n✅ Test de validation terminé');
            console.log(`📊 Résultats: ${JSON.stringify(report.testResults, null, 2)}`);
        })
        .catch(error => {
            console.error('\n❌ Test échoué:', error.message);
            process.exit(1);
        });
}

module.exports = { testEntityCreationValidation };