const puppeteer = require('puppeteer');
const fs = require('fs');

// Test direct de l'éditeur de schéma JSON
async function testSchemaEditorDirect() {
    console.log('🎯 Test direct de l\'éditeur de schéma JSON');

    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1400, height: 900 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        // 1. Naviguer directement vers l'éditeur de schéma
        console.log('📍 Navigation vers l\'éditeur de schéma...');
        await page.goto('http://localhost:5501/bdd/test-user/schema', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('✅ Page éditeur chargée:', page.url());
        await page.screenshot({ path: './CLAUDE/schema-editor-direct.png', fullPage: true });

        // 2. Analyser l'interface de l'éditeur
        const editorContent = await page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                // Rechercher des éléments spécifiques à l'édition de schéma
                schemaElements: Array.from(document.querySelectorAll('*')).filter(el => {
                    const text = el.textContent.toLowerCase();
                    const classes = el.className.toLowerCase();
                    return (
                        text.includes('property') ||
                        text.includes('type') ||
                        text.includes('add') ||
                        text.includes('field') ||
                        classes.includes('property') ||
                        classes.includes('schema') ||
                        classes.includes('editor')
                    ) && el.offsetParent !== null;
                }).map(el => ({
                    tag: el.tagName,
                    text: el.textContent.trim().substring(0, 80),
                    classes: el.className,
                    id: el.id
                })),
                // Rechercher des boutons d'action
                actionButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
                    text: btn.textContent.trim(),
                    classes: btn.className,
                    disabled: btn.disabled,
                    type: btn.type
                })),
                // Rechercher des formulaires
                forms: Array.from(document.querySelectorAll('form')).map(form => ({
                    action: form.action,
                    method: form.method,
                    inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
                        type: input.type,
                        name: input.name,
                        placeholder: input.placeholder
                    }))
                })),
                // Rechercher du contenu JSON visible
                jsonContent: Array.from(document.querySelectorAll('pre, code')).map(el => el.textContent).filter(text => {
                    try {
                        JSON.parse(text);
                        return true;
                    } catch {
                        return false;
                    }
                })
            };
        });

        console.log('📊 Analyse de l\'éditeur:');
        console.log(`- URL: ${editorContent.url}`);
        console.log(`- Éléments schema: ${editorContent.schemaElements.length}`);
        console.log(`- Boutons d'action: ${editorContent.actionButtons.length}`);
        console.log(`- Formulaires: ${editorContent.forms.length}`);
        console.log(`- Contenu JSON: ${editorContent.jsonContent.length}`);

        // 3. Si nous ne sommes pas sur l'éditeur, essayer d'autres URLs
        if (editorContent.schemaElements.length === 0) {
            console.log('⚠️ Pas d\'éléments d\'édition trouvés, essai d\'autres URLs...');

            const urlsToTry = [
                'http://localhost:5501/bdd/test-user/edit',
                'http://localhost:5501/schema/test-user',
                'http://localhost:5501/edit/test-user',
                'http://localhost:5501/bdd/test-user/new',
                'http://localhost:5501/'
            ];

            for (const url of urlsToTry) {
                try {
                    console.log(`🔍 Essai de: ${url}`);
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });

                    const content = await page.evaluate(() => {
                        const hasSchema = Array.from(document.querySelectorAll('*')).some(el => {
                            const text = el.textContent.toLowerCase();
                            return text.includes('schema') || text.includes('property') || text.includes('type');
                        });

                        return {
                            url: window.location.href,
                            hasSchemaContent: hasSchema,
                            buttonsCount: document.querySelectorAll('button').length,
                            inputsCount: document.querySelectorAll('input').length
                        };
                    });

                    console.log(`  - Schema content: ${content.hasSchemaContent}`);
                    console.log(`  - Buttons: ${content.buttonsCount}, Inputs: ${content.inputsCount}`);

                    if (content.hasSchemaContent || content.buttonsCount > 5) {
                        await page.screenshot({
                            path: `./CLAUDE/test-url-${url.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
                            fullPage: true
                        });
                        console.log(`✅ Interface intéressante trouvée sur: ${url}`);
                        break;
                    }
                } catch (e) {
                    console.log(`  ❌ Erreur sur ${url}: ${e.message}`);
                }
            }
        }

        // 4. Test spécifique pour la création de propriété select
        console.log('\n🎯 Test de création de propriété select...');

        // Rechercher des éléments qui pourraient permettre d'ajouter une propriété
        const interactionResult = await page.evaluate(() => {
            // Chercher tous les boutons qui contiennent "add", "+", "nouveau", etc.
            const addButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                const text = btn.textContent.toLowerCase();
                return text.includes('add') ||
                       text.includes('+') ||
                       text.includes('nouveau') ||
                       text.includes('ajouter') ||
                       text.includes('create');
            });

            // Chercher des formulaires ou interfaces d'édition
            const editForms = Array.from(document.querySelectorAll('form, [class*="edit"], [class*="form"]'));

            // Chercher des sélecteurs de type
            const typeSelectors = Array.from(document.querySelectorAll('select')).filter(select => {
                const options = Array.from(select.options).map(opt => opt.textContent.toLowerCase());
                return options.some(opt => opt.includes('string') || opt.includes('select') || opt.includes('type'));
            });

            return {
                addButtons: addButtons.map(btn => ({
                    text: btn.textContent.trim(),
                    classes: btn.className
                })),
                editForms: editForms.length,
                typeSelectors: typeSelectors.map(select => ({
                    name: select.name,
                    options: Array.from(select.options).map(opt => opt.textContent)
                }))
            };
        });

        console.log('🔍 Éléments d\'interaction trouvés:');
        console.log(`- Boutons d'ajout: ${interactionResult.addButtons.length}`);
        console.log(`- Formulaires d'édition: ${interactionResult.editForms}`);
        console.log(`- Sélecteurs de type: ${interactionResult.typeSelectors.length}`);

        if (interactionResult.addButtons.length > 0) {
            console.log('\n🔘 Boutons d\'ajout disponibles:');
            interactionResult.addButtons.forEach((btn, i) => {
                console.log(`  ${i + 1}. "${btn.text}" (${btn.classes})`);
            });
        }

        if (interactionResult.typeSelectors.length > 0) {
            console.log('\n📋 Sélecteurs de type disponibles:');
            interactionResult.typeSelectors.forEach((selector, i) => {
                console.log(`  ${i + 1}. ${selector.name}: [${selector.options.join(', ')}]`);
            });
        }

        // 5. Essayer d'interagir si possible
        if (interactionResult.addButtons.length > 0) {
            try {
                console.log('\n🖱️ Tentative d\'interaction avec le premier bouton d\'ajout...');
                await page.click('button');
                await new Promise(resolve => setTimeout(resolve, 2000));

                await page.screenshot({ path: './CLAUDE/after-add-click.png', fullPage: true });

                // Analyser l'état après le clic
                const afterClick = await page.evaluate(() => {
                    return {
                        url: window.location.href,
                        newInputs: Array.from(document.querySelectorAll('input')).map(input => ({
                            type: input.type,
                            placeholder: input.placeholder,
                            name: input.name
                        })),
                        newSelects: Array.from(document.querySelectorAll('select')).map(select => ({
                            name: select.name,
                            options: Array.from(select.options).map(opt => opt.textContent)
                        })),
                        modals: document.querySelectorAll('[role="dialog"], .modal, .popup').length
                    };
                });

                console.log('📊 État après clic:');
                console.log(`- Nouveaux inputs: ${afterClick.newInputs.length}`);
                console.log(`- Nouveaux selects: ${afterClick.newSelects.length}`);
                console.log(`- Modales ouvertes: ${afterClick.modals}`);

                // Si nous avons de nouveaux éléments, essayer de configurer un select
                if (afterClick.newInputs.length > 0 || afterClick.newSelects.length > 0) {
                    console.log('\n⚙️ Configuration d\'une propriété select...');

                    // Essayer de remplir un nom de propriété
                    try {
                        const nameInput = await page.$('input[type="text"]');
                        if (nameInput) {
                            await nameInput.type('test_select_property');
                            console.log('✅ Nom de propriété saisi');
                        }
                    } catch (e) {
                        console.log('⚠️ Impossible de saisir le nom');
                    }

                    // Essayer de sélectionner le type "select"
                    try {
                        const typeSelect = await page.$('select');
                        if (typeSelect) {
                            const options = await typeSelect.$$eval('option', opts =>
                                opts.map(opt => ({ value: opt.value, text: opt.textContent }))
                            );

                            console.log('📋 Options de type disponibles:', options);

                            const selectOption = options.find(opt =>
                                opt.text.toLowerCase().includes('select') ||
                                opt.value.toLowerCase().includes('select')
                            );

                            if (selectOption) {
                                await typeSelect.select(selectOption.value);
                                console.log(`✅ Type select choisi: ${selectOption.text}`);

                                await new Promise(resolve => setTimeout(resolve, 1000));
                                await page.screenshot({ path: './CLAUDE/select-type-chosen.png', fullPage: true });
                            }
                        }
                    } catch (e) {
                        console.log('⚠️ Impossible de sélectionner le type select');
                    }
                }
            } catch (e) {
                console.log(`❌ Erreur lors de l'interaction: ${e.message}`);
            }
        }

        // 6. Sauvegarder le rapport complet
        const finalReport = {
            timestamp: new Date().toISOString(),
            finalUrl: page.url(),
            editorContent,
            interactionResult,
            testStatus: {
                pageLoaded: true,
                editorFound: editorContent.schemaElements.length > 0,
                interactionPossible: interactionResult.addButtons.length > 0,
                typeSelectorsAvailable: interactionResult.typeSelectors.length > 0
            }
        };

        fs.writeFileSync('./CLAUDE/rapport-editeur-schema-direct.json', JSON.stringify(finalReport, null, 2));
        console.log('\n📊 Rapport complet sauvegardé: ./CLAUDE/rapport-editeur-schema-direct.json');

        return finalReport;

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// Exécution du test
if (require.main === module) {
    testSchemaEditorDirect()
        .then(report => {
            console.log('\n✅ Test terminé');
            console.log(`📊 Statut: ${JSON.stringify(report.testStatus, null, 2)}`);
        })
        .catch(error => {
            console.error('\n❌ Test échoué:', error.message);
            process.exit(1);
        });
}

module.exports = { testSchemaEditorDirect };