#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function debugSchemaFlow() {
  console.log('🔍 Debug flux des schémas');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // Activer les logs de console de la page
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔧') || text.includes('✅') || text.includes('❌') || text.includes('🎯')) {
        console.log('PAGE LOG:', text);
      }
    });

    console.log('🌐 Navigation vers http://localhost:5503/bdd/test-user/new/');
    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 1. Naviguer vers hhh
    console.log('🔍 Étape 1: Navigation vers hhh...');
    const fieldItems = await page.$$('.field-item');
    const hhhContainer = fieldItems[6];
    const exploreButton = await hhhContainer.$('button[title="Explorer"]');
    await exploreButton.click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Ajouter un élément
    console.log('🔍 Étape 2: Ajout d\'un élément...');
    const addButton = await page.$('.entity-column:nth-child(2) .btn-primary');
    await addButton.click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Naviguer vers l'élément ajouté
    console.log('🔍 Étape 3: Navigation vers l\'élément existant...');
    const arrayItemButton = await page.$('.array-item .btn[title="Explorer cet élément"]');
    await arrayItemButton.click();
    await new Promise(resolve => setTimeout(resolve, 5000)); // Plus de temps pour les logs

    console.log('✅ Navigation terminée, analyse des logs...');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
  } finally {
    await browser.close();
  }
}

// Exécution
if (require.main === module) {
  debugSchemaFlow().catch(console.error);
}