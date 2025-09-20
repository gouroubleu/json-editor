/**
 * TEST SIMPLE : Voir quel composant est utilisé
 */

const puppeteer = require('puppeteer');

async function testQuelComposant() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Capturer logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('handleAddArrayItem') || text.includes('ContextualEntityColumn') || text.includes('EntityColumn')) {
      logs.push(text);
      console.log(`[LOG] ${text}`);
    }
  });

  try {
    await page.goto('http://localhost:5501/bdd/test-user/entity_mfqm0qvi_ainoph/edit/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Navigation vers adresse
    await page.evaluate(() => {
      const fieldElements = Array.from(document.querySelectorAll('.field-name'));
      const adresseField = fieldElements.find(el => el.textContent.includes('adresse'));
      const fieldContainer = adresseField?.closest('.field-item');
      const navigateButton = fieldContainer?.querySelector('button[title="Explorer"]');
      navigateButton?.click();
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Clic sur ajouter
    await page.evaluate(() => {
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );
      if (addButtons.length > 0) {
        addButtons[0].click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    await browser.close();

    console.log('\n🎯 COMPOSANT UTILISÉ:');
    const contextualLogs = logs.filter(log => log.includes('ContextualEntityColumn'));
    const entityLogs = logs.filter(log => log.includes('EntityColumn'));

    if (contextualLogs.length > 0) {
      console.log('✅ ContextualEntityColumn utilisé !');
      contextualLogs.forEach(log => console.log(`   ${log}`));
    }

    if (entityLogs.length > 0) {
      console.log('❌ EntityColumn utilisé !');
      entityLogs.forEach(log => console.log(`   ${log}`));
    }

    if (contextualLogs.length === 0 && entityLogs.length === 0) {
      console.log('❓ Aucun des deux composants détecté dans les logs');
    }

    return { contextualLogs, entityLogs, allLogs: logs };

  } catch (error) {
    console.error('❌ Erreur:', error);
    await browser.close();
    return { error: error.message };
  }
}

testQuelComposant().then(result => {
  if (result.error) {
    console.log('🚨 ERREUR:', result.error);
  } else {
    console.log('\n📋 RÉSUMÉ:');
    console.log(`ContextualEntityColumn: ${result.contextualLogs.length} logs`);
    console.log(`EntityColumn: ${result.entityLogs.length} logs`);
  }
}).catch(console.error);