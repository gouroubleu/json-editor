const puppeteer = require('puppeteer');

async function debugSchemaArrayItems() {
  console.log('🔍 DEBUG - Schémas des éléments d\'array');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔍 CAN EXPAND CHECK') || text.includes('SCHEMA DEBUG')) {
        console.log(`🖥️  ${text}`);
      }
    });

    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    await page.waitForSelector('.entity-column', { timeout: 5000 });

    // Navigation vers adresse array
    console.log('1️⃣ Navigation vers adresse array...');
    await page.click('div[q\\:key="adresse"] .field-actions button[title="Explorer"]');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Navigation vers premier élément
    console.log('2️⃣ Navigation vers premier élément...');
    await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const firstItem = arrayColumn.querySelector('.array-item button[title*="Explorer"]');
        if (firstItem) {
          firstItem.click();
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Injecter du debug dans la page pour examiner les schémas
    const schemaDebug = await page.evaluate(() => {
      // Accéder au contexte Qwik (ceci est expérimental)
      const columns = document.querySelectorAll('.entity-column');

      const debug = {
        columnsCount: columns.length,
        schemas: []
      };

      columns.forEach((col, idx) => {
        const title = col.querySelector('.column-title')?.textContent;
        const level = col.querySelector('.column-level')?.textContent;

        // Chercher les propriétés affichées
        const fields = Array.from(col.querySelectorAll('.field-item')).map(field => {
          const name = field.querySelector('.field-name')?.textContent;
          const type = field.querySelector('.field-type')?.textContent;
          const hasButton = !!field.querySelector('button[title="Explorer"]');

          return { name, type, hasButton };
        });

        debug.schemas.push({
          index: idx,
          title,
          level,
          fields
        });
      });

      return debug;
    });

    console.log('\n📊 ANALYSE SCHÉMAS PAR COLONNE:');
    schemaDebug.schemas.forEach(col => {
      console.log(`\nColonne ${col.index}: ${col.title} (${col.level})`);
      col.fields.forEach(field => {
        const button = field.hasButton ? '✅→' : '❌';
        console.log(`  ${button} ${field.name} (${field.type})`);
      });
    });

    // Test spécifique: qu'est-ce qui se passe avec "place" ?
    if (schemaDebug.columnsCount >= 3) {
      const placeField = schemaDebug.schemas[2]?.fields?.find(f => f.name === 'place');
      if (placeField) {
        console.log(`\n🎯 CHAMP "place":`);
        console.log(`   Type: ${placeField.type}`);
        console.log(`   Bouton →: ${placeField.hasButton ? 'OUI ✅' : 'NON ❌'}`);

        if (!placeField.hasButton) {
          console.log('❌ PROBLÈME CONFIRMÉ: "place" n\'a pas de bouton → !');
        }
      } else {
        console.log('❌ Champ "place" non trouvé dans colonne 3');
      }
    }

    // Maintenant testons avec l'ajout d'un nouvel élément
    console.log('\n3️⃣ Retour et test avec nouvel élément...');
    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'networkidle0'
    });

    await page.click('div[q\\:key="adresse"] .field-actions button[title="Explorer"]');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Ajouter un élément
    await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const addBtn = arrayColumn.querySelector('button[title*="Ajouter"]');
        if (addBtn) addBtn.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Naviguer vers le nouvel élément (dernier)
    await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');
      if (columns.length >= 2) {
        const arrayColumn = columns[1];
        const lastItem = arrayColumn.querySelector('.array-item:last-child button[title*="Explorer"]');
        if (lastItem) lastItem.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Analyser le nouvel élément
    const newElementDebug = await page.evaluate(() => {
      const columns = document.querySelectorAll('.entity-column');

      if (columns.length >= 3) {
        const col3 = columns[2];
        const title = col3.querySelector('.column-title')?.textContent;

        const fields = Array.from(col3.querySelectorAll('.field-item')).map(field => {
          const name = field.querySelector('.field-name')?.textContent;
          const type = field.querySelector('.field-type')?.textContent;
          const hasButton = !!field.querySelector('button[title="Explorer"]');

          return { name, type, hasButton };
        });

        return { title, fields };
      }

      return null;
    });

    if (newElementDebug) {
      console.log(`\n🆕 NOUVEL ÉLÉMENT: ${newElementDebug.title}`);
      newElementDebug.fields.forEach(field => {
        const button = field.hasButton ? '✅→' : '❌';
        console.log(`  ${button} ${field.name} (${field.type})`);
      });

      const newPlaceField = newElementDebug.fields.find(f => f.name === 'place');
      if (newPlaceField) {
        console.log(`\n🎯 NOUVEAU "place":`);
        console.log(`   Type: ${newPlaceField.type}`);
        console.log(`   Bouton →: ${newPlaceField.hasButton ? 'OUI ✅' : 'NON ❌'}`);

        if (!newPlaceField.hasButton) {
          console.log('❌ MÊME PROBLÈME sur nouvel élément!');
        } else {
          console.log('✅ Bouton → fonctionne sur nouvel élément!');
        }
      }
    }

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

debugSchemaArrayItems();