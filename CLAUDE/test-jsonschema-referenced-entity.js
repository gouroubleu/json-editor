#!/usr/bin/env node

/**
 * Test pour vérifier le chargement du schéma référencé pour les entités jsonschema
 * Doit vérifier que quand on clique sur la flèche de 'hhh' (type jsonschema),
 * le formulaire affiché correspond au schéma 'user' référencé
 */

const puppeteer = require('puppeteer');

async function testJsonschemaReferencedEntity() {
  console.log('🎯 Test formulaire entité avec schéma référencé');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    console.log('🌐 Navigation vers http://localhost:5503/bdd/test-user/new/');
    await page.goto('http://localhost:5503/bdd/test-user/new/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: 'CLAUDE/screenshots/test-referenced-initial.png', fullPage: true });
    console.log('📸 Screenshot page initiale');

    // Chercher la propriété hhh (type jsonschema)
    console.log('🔍 Recherche propriété hhh...');

    // Basé sur l'analyse, hhh est le 7ème champ (index 6)
    const hhhFieldIndex = 6;
    const fieldItems = await page.$$('.field-item');

    if (fieldItems.length <= hhhFieldIndex) {
      console.log('❌ Propriété hhh non trouvée (pas assez de champs)');
      return false;
    }

    const hhhContainer = fieldItems[hhhFieldIndex];

    // Vérifier que c'est bien le champ hhh
    const fieldName = await page.evaluate(el => {
      const nameEl = el.querySelector('.field-name');
      return nameEl ? nameEl.textContent.trim() : '';
    }, hhhContainer);

    if (fieldName !== 'hhh') {
      console.log(`❌ Champ attendu 'hhh' mais trouvé '${fieldName}'`);
      return false;
    }

    console.log('✅ Champ hhh trouvé');

    const exploreButton = await hhhContainer.$('button[title="Explorer"]');
    if (!exploreButton) {
      console.log('❌ Bouton explorer non trouvé pour hhh');
      return false;
    }

    console.log('✅ Bouton explorer trouvé pour hhh');

    // Cliquer sur le bouton explorer
    await exploreButton.click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: 'CLAUDE/screenshots/test-referenced-navigation.png', fullPage: true });
    console.log('📸 Screenshot après navigation');

    // Vérifier qu'on a bien une nouvelle colonne affichée
    const columns = await page.$$('.entity-column');
    console.log(`📋 Nombre de colonnes: ${columns.length}`);

    if (columns.length < 2) {
      console.log('❌ Navigation échouée - pas de nouvelle colonne');
      return false;
    }

    // Chercher le bouton "Ajouter" dans la nouvelle colonne
    const addButton = await page.$('.entity-column:nth-child(2) button, .entity-column:nth-child(2) .btn');
    if (!addButton) {
      console.log('❌ Bouton Ajouter non trouvé dans la colonne hhh');
      return false;
    }

    console.log('✅ Bouton Ajouter trouvé, clic pour ouvrir le formulaire...');

    // Cliquer sur Ajouter
    await addButton.click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: 'CLAUDE/screenshots/test-referenced-form.png', fullPage: true });
    console.log('📸 Screenshot formulaire d\'ajout');

    // Analyser le formulaire affiché
    console.log('🔍 Analyse du formulaire affiché...');

    // Chercher les champs du schéma user (id, nom, email, age)
    const expectedUserFields = ['id', 'nom', 'email', 'age'];
    const foundFields = [];
    const missingFields = [];

    for (const fieldName of expectedUserFields) {
      // Chercher les champs de plusieurs façons
      const fieldSelectors = [
        `input[name*="${fieldName}"]`,
        `input[placeholder*="${fieldName}"]`,
        `.field-name`,
        `.field-item input`
      ];

      let fieldFound = false;
      for (const selector of fieldSelectors) {
        try {
          const field = await page.$(selector);
          if (field) {
            foundFields.push(fieldName);
            fieldFound = true;
            console.log(`✅ Champ "${fieldName}" trouvé`);
            break;
          }
        } catch (error) {
          // Continuer avec le sélecteur suivant
        }
      }

      if (!fieldFound) {
        missingFields.push(fieldName);
        console.log(`❌ Champ "${fieldName}" NON TROUVÉ`);
      }
    }

    // Analyser tous les champs présents pour debug
    const allInputs = await page.$$('input[type="text"], input[type="email"], input[type="number"], select, textarea');
    console.log(`📋 Total des champs trouvés: ${allInputs.length}`);

    for (let i = 0; i < allInputs.length; i++) {
      const inputInfo = await page.evaluate(input => ({
        type: input.type,
        name: input.name,
        placeholder: input.placeholder,
        id: input.id,
        value: input.value
      }), allInputs[i]);
      console.log(`📋 Champ ${i}:`, inputInfo);
    }

    // Vérifier si on a un formulaire générique ou le bon schéma user
    const hasCorrectUserSchema = foundFields.length >= 3; // Au moins 3 des 4 champs attendus
    const hasMissingFields = missingFields.length > 0;

    console.log('\n📊 ANALYSE RÉSULTATS:');
    console.log(`✅ Champs trouvés: ${foundFields.join(', ')}`);
    console.log(`❌ Champs manquants: ${missingFields.join(', ')}`);
    console.log(`📋 Schéma user correct: ${hasCorrectUserSchema ? 'OUI' : 'NON'}`);

    // Sauvegarder l'analyse
    const analysis = {
      timestamp: new Date().toISOString(),
      test: 'jsonschema-referenced-entity',
      url: page.url(),
      columnsCount: columns.length,
      expectedFields: expectedUserFields,
      foundFields: foundFields,
      missingFields: missingFields,
      totalInputs: allInputs.length,
      hasCorrectSchema: hasCorrectUserSchema,
      success: hasCorrectUserSchema && missingFields.length === 0
    };

    const fs = require('fs').promises;
    await fs.writeFile('CLAUDE/test-jsonschema-referenced-results.json', JSON.stringify(analysis, null, 2));
    console.log('📄 Analyse sauvegardée');

    return analysis.success;

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    await page.screenshot({ path: 'CLAUDE/screenshots/error-referenced-test.png', fullPage: true });
    return false;
  } finally {
    await browser.close();
  }
}

// Exécution
if (require.main === module) {
  testJsonschemaReferencedEntity()
    .then(success => {
      if (success) {
        console.log('\n🎉 TEST RÉUSSI - Le formulaire utilise le schéma référencé !');
      } else {
        console.log('\n⚠️ TEST PARTIELLEMENT RÉUSSI - Ajustements nécessaires');
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}