const puppeteer = require('puppeteer');
const fs = require('fs');

// Test ciblé pour l'éditeur de schéma
async function testSchemaEditor() {
    console.log('🎯 Test ciblé de l\'éditeur de schéma JSON');

    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1400, height: 900 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        // Naviguer vers l'éditeur de schéma test-user
        await page.goto('http://localhost:5501/bdd/test-user/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('✅ Page chargée:', page.url());

        // Capturer l'état initial
        await page.screenshot({
            path: './CLAUDE/test-schema-initial.png',
            fullPage: true
        });

        // Analyser le contenu de la page
        const pageContent = await page.evaluate(() => {
            // Extraire informations sur l'interface
            const info = {
                title: document.title,
                url: window.location.href,
                buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
                    text: btn.textContent.trim(),
                    classes: btn.className,
                    type: btn.type
                })),
                inputs: Array.from(document.querySelectorAll('input')).map(input => ({
                    type: input.type,
                    placeholder: input.placeholder,
                    name: input.name,
                    value: input.value
                })),
                selects: Array.from(document.querySelectorAll('select')).map(select => ({
                    name: select.name,
                    options: Array.from(select.options).map(opt => ({
                        value: opt.value,
                        text: opt.textContent
                    }))
                })),
                headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent.trim()),
                links: Array.from(document.querySelectorAll('a')).map(a => ({
                    text: a.textContent.trim(),
                    href: a.href
                })).filter(link => link.text && link.href),
                // Rechercher du contenu JSON Schema
                scripts: Array.from(document.querySelectorAll('script')).map(script => script.textContent).filter(s => s.includes('schema')),
                // Rechercher des éléments avec 'schema' ou 'property'
                schemaElements: Array.from(document.querySelectorAll('*')).filter(el =>
                    el.textContent && (
                        el.textContent.toLowerCase().includes('schema') ||
                        el.textContent.toLowerCase().includes('property') ||
                        el.textContent.toLowerCase().includes('type') ||
                        el.textContent.toLowerCase().includes('select')
                    )
                ).map(el => ({
                    tag: el.tagName,
                    text: el.textContent.trim().substring(0, 100),
                    classes: el.className
                }))
            };

            return info;
        });

        console.log('📊 Analyse de la page:');
        console.log(`- Titre: ${pageContent.title}`);
        console.log(`- Boutons: ${pageContent.buttons.length}`);
        console.log(`- Champs input: ${pageContent.inputs.length}`);
        console.log(`- Selecteurs: ${pageContent.selects.length}`);
        console.log(`- Liens: ${pageContent.links.length}`);
        console.log(`- Éléments schema: ${pageContent.schemaElements.length}`);

        // Afficher les boutons disponibles
        if (pageContent.buttons.length > 0) {
            console.log('\n🔘 Boutons disponibles:');
            pageContent.buttons.forEach((btn, i) => {
                if (btn.text) console.log(`  ${i + 1}. ${btn.text} (${btn.classes})`);
            });
        }

        // Afficher les liens disponibles
        if (pageContent.links.length > 0) {
            console.log('\n🔗 Liens disponibles:');
            pageContent.links.slice(0, 10).forEach((link, i) => {
                console.log(`  ${i + 1}. ${link.text} -> ${link.href}`);
            });
        }

        // Rechercher spécifiquement des éléments d'édition de schéma
        const editorElements = await page.evaluate(() => {
            // Rechercher des mots-clés spécifiques à l'édition de schéma
            const keywords = ['property', 'add', 'create', 'edit', 'schema', 'type', 'field'];
            const elements = [];

            keywords.forEach(keyword => {
                const matchingElements = Array.from(document.querySelectorAll('*')).filter(el => {
                    const text = el.textContent.toLowerCase();
                    return text.includes(keyword) && el.offsetParent !== null; // Visible elements only
                });

                matchingElements.forEach(el => {
                    if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                        elements.push({
                            keyword,
                            tag: el.tagName,
                            text: el.textContent.trim().substring(0, 50),
                            classes: el.className,
                            id: el.id
                        });
                    }
                });
            });

            return elements;
        });

        console.log('\n🎯 Éléments d\'édition détectés:');
        editorElements.forEach((el, i) => {
            console.log(`  ${i + 1}. [${el.keyword}] ${el.tag}: "${el.text}" (${el.classes})`);
        });

        // Essayer de trouver et cliquer sur un bouton d'ajout ou d'édition
        const addButtons = editorElements.filter(el =>
            el.tag === 'BUTTON' && (
                el.text.toLowerCase().includes('add') ||
                el.text.toLowerCase().includes('nouvelle') ||
                el.text.toLowerCase().includes('create') ||
                el.text.includes('+')
            )
        );

        if (addButtons.length > 0) {
            console.log(`\n🎯 Tentative de clic sur: "${addButtons[0].text}"`);

            try {
                // Essayer de cliquer sur le premier bouton d'ajout
                await page.click('button');
                await new Promise(resolve => setTimeout(resolve, 2000));

                await page.screenshot({
                    path: './CLAUDE/test-schema-after-click.png',
                    fullPage: true
                });

                // Analyser l'état après le clic
                const afterClickContent = await page.evaluate(() => {
                    return {
                        currentUrl: window.location.href,
                        forms: Array.from(document.querySelectorAll('form')).length,
                        inputs: Array.from(document.querySelectorAll('input')).map(input => ({
                            type: input.type,
                            placeholder: input.placeholder,
                            name: input.name
                        })),
                        modals: Array.from(document.querySelectorAll('[role="dialog"], .modal')).length,
                        newButtons: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent.trim()).filter(t => t)
                    };
                });

                console.log('\n📋 État après clic:');
                console.log(`- URL: ${afterClickContent.currentUrl}`);
                console.log(`- Formulaires: ${afterClickContent.forms}`);
                console.log(`- Inputs: ${afterClickContent.inputs.length}`);
                console.log(`- Modales: ${afterClickContent.modals}`);
                console.log(`- Nouveaux boutons: ${afterClickContent.newButtons.length}`);

            } catch (clickError) {
                console.log(`❌ Erreur lors du clic: ${clickError.message}`);
            }
        }

        // Sauvegarder toutes les informations collectées
        const fullReport = {
            timestamp: new Date().toISOString(),
            url: page.url(),
            pageContent,
            editorElements,
            addButtons,
            tests: {
                pageLoaded: true,
                buttonsFound: pageContent.buttons.length > 0,
                formsFound: pageContent.inputs.length > 0,
                editorElementsFound: editorElements.length > 0
            }
        };

        fs.writeFileSync('./CLAUDE/rapport-editeur-schema-ciblé.json', JSON.stringify(fullReport, null, 2));
        console.log('\n📊 Rapport sauvegardé: ./CLAUDE/rapport-editeur-schema-ciblé.json');

        return fullReport;

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// Exécution du test
if (require.main === module) {
    testSchemaEditor()
        .then(report => {
            console.log('\n✅ Test terminé avec succès');
            console.log(`📊 ${report.tests.editorElementsFound ? 'Éléments d\'édition trouvés' : 'Aucun élément d\'édition trouvé'}`);
        })
        .catch(error => {
            console.error('\n❌ Test échoué:', error.message);
            process.exit(1);
        });
}

module.exports = { testSchemaEditor };