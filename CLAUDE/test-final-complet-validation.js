/**
 * TEST FINAL COMPLET - Validation de l'ajout d'éléments en mode édition
 * Teste avec captures d'écran et debug complet
 */

const puppeteer = require('puppeteer');

async function testFinalCompletValidation() {
  const browser = await puppeteer.launch({
    headless: true, // Mode headless pour serveur
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Capturer logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log(`[LOG] ${text}`);
  });

  try {
    console.log('🎯 TEST FINAL COMPLET - Démarrage...');

    // 1. Navigation vers la page d'édition
    console.log('📍 Navigation vers page d\'édition...');
    await page.goto('http://localhost:5501/bdd/test-user/entity_mfqm0qvi_ainoph/edit/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Capture d'écran de l'état initial
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/capture-1-initial.png' });

    // 3. Navigation vers adresse
    console.log('📍 Navigation vers adresse...');
    await page.evaluate(() => {
      const fieldElements = Array.from(document.querySelectorAll('.field-name'));
      const adresseField = fieldElements.find(el => el.textContent.includes('adresse'));
      const fieldContainer = adresseField?.closest('.field-item');
      const navigateButton = fieldContainer?.querySelector('button[title="Explorer"]');
      console.log('🔧 Navigation button found:', !!navigateButton);
      if (navigateButton) {
        navigateButton.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // 4. Capture d'écran après navigation
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/capture-2-apres-navigation.png' });

    // 5. Analyser l'état du tableau
    const tableauInfo = await page.evaluate(() => {
      // Chercher tous les éléments du tableau
      const elements = Array.from(document.querySelectorAll('.array-item, .list-item, .item-row, tr, .row'));

      // Chercher les boutons d'ajout
      const buttons = Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent?.trim(),
        title: btn.title,
        className: btn.className,
        visible: !btn.hidden && btn.style.display !== 'none'
      }));

      // Chercher spécifiquement les boutons d'ajout
      const addButtons = buttons.filter(btn =>
        btn.text?.includes('Ajouter') ||
        btn.text?.includes('➕') ||
        btn.text?.includes('+') ||
        btn.title?.includes('Ajouter') ||
        btn.className?.includes('add')
      );

      return {
        totalElements: elements.length,
        totalButtons: buttons.length,
        addButtons,
        allButtons: buttons.slice(0, 10) // Limite pour pas trop de logs
      };
    });

    console.log('📊 ÉTAT DU TABLEAU:');
    console.log(`   Éléments totaux: ${tableauInfo.totalElements}`);
    console.log(`   Boutons totaux: ${tableauInfo.totalButtons}`);
    console.log(`   Boutons d'ajout: ${tableauInfo.addButtons.length}`);

    tableauInfo.addButtons.forEach((btn, i) => {
      console.log(`   [${i}] "${btn.text}" (${btn.className}) - visible: ${btn.visible}`);
    });

    console.log('📋 PREMIERS BOUTONS:');
    tableauInfo.allButtons.forEach((btn, i) => {
      console.log(`   [${i}] "${btn.text}" (${btn.className})`);
    });

    // 6. Si on trouve un bouton d'ajout, cliquer dessus
    if (tableauInfo.addButtons.length > 0) {
      console.log('📍 CLIC SUR BOUTON AJOUTER...');

      await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        const addButton = allButtons.find(btn =>
          btn.textContent?.includes('Ajouter') ||
          btn.textContent?.includes('➕') ||
          btn.textContent?.includes('+') ||
          btn.title?.includes('Ajouter')
        );

        if (addButton) {
          console.log('🔧 Cliquant sur bouton:', addButton.textContent);
          addButton.click();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // 7. Capture d'écran après clic
      await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/capture-3-apres-clic.png' });

      // 8. Analyser l'état après clic
      const tableauApres = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('.array-item, .list-item, .item-row, tr, .row'));
        return {
          totalElements: elements.length,
          elementsTexts: elements.slice(0, 5).map(el => el.textContent?.slice(0, 100))
        };
      });

      console.log('📊 ÉTAT APRÈS CLIC:');
      console.log(`   Éléments totaux: ${tableauApres.totalElements}`);
      console.log(`   Différence: ${tableauApres.totalElements - tableauInfo.totalElements}`);

      if (tableauApres.totalElements > tableauInfo.totalElements) {
        console.log('✅ SUCCÈS: Nouvel élément ajouté !');
      } else {
        console.log('❌ ÉCHEC: Aucun nouvel élément détecté');
      }
    } else {
      console.log('❌ ÉCHEC: Aucun bouton d\'ajout trouvé');
    }

    // 9. Analyser les logs
    const contextualLogs = logs.filter(log => log.includes('ContextualEntityColumn'));
    const entityLogs = logs.filter(log => log.includes('EntityColumn') && !log.includes('ContextualEntityColumn'));
    const addLogs = logs.filter(log => log.includes('handleAddArrayItem') || log.includes('addArrayElement'));

    console.log('\n🎯 ANALYSE DES LOGS:');
    console.log(`ContextualEntityColumn: ${contextualLogs.length} logs`);
    console.log(`EntityColumn (legacy): ${entityLogs.length} logs`);
    console.log(`Add actions: ${addLogs.length} logs`);

    addLogs.forEach(log => console.log(`   ${log}`));

    await browser.close();

    return {
      success: tableauApres && tableauApres.totalElements > tableauInfo.totalElements,
      initialElements: tableauInfo.totalElements,
      finalElements: tableauApres?.totalElements || 0,
      addButtonsFound: tableauInfo.addButtons.length,
      contextualLogsCount: contextualLogs.length,
      addLogsCount: addLogs.length
    };

  } catch (error) {
    console.error('❌ Erreur test:', error.message);
    await browser.close();
    return { error: error.message };
  }
}

testFinalCompletValidation().then(result => {
  console.log('\n📋 RÉSUMÉ FINAL:');
  if (result.error) {
    console.log('🚨 ERREUR:', result.error);
  } else if (result.success) {
    console.log('✅ SUCCÈS: L\'ajout d\'éléments fonctionne !');
    console.log(`   Éléments: ${result.initialElements} → ${result.finalElements}`);
    console.log(`   Contexte utilisé: ${result.contextualLogsCount > 0 ? 'OUI' : 'NON'}`);
  } else {
    console.log('❌ ÉCHEC: L\'ajout d\'éléments ne fonctionne pas');
    console.log(`   Boutons trouvés: ${result.addButtonsFound}`);
    console.log(`   Logs contextuels: ${result.contextualLogsCount}`);
  }
}).catch(console.error);