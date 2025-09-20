/**
 * TEST NAVIGATION ÉLÉMENT TEMPORAIRE
 * Vérifier si on peut cliquer sur "Explorer" et voir les inputs
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testNavigationElementTemporaire() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1600, height: 1200 }
  });

  const page = await browser.newPage();

  try {
    console.log('🧭 TEST NAVIGATION ÉLÉMENT TEMPORAIRE - Chargement...');

    await page.goto('http://localhost:5501/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Navigation vers adresse
    console.log('📍 Navigation vers adresse...');
    await page.evaluate(() => {
      const fieldElements = Array.from(document.querySelectorAll('.field-name'));
      const adresseField = fieldElements.find(el => el.textContent.includes('adresse'));
      const fieldContainer = adresseField?.closest('.field-item');
      const navigateButton = fieldContainer?.querySelector('button[title="Explorer"]');
      navigateButton?.click();
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // ÉTAPE 1 : Ajouter un élément
    console.log('📍 ÉTAPE 1: Ajout d\'un élément...');

    await page.evaluate(() => {
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );
      if (addButtons.length > 0) {
        addButtons[0].click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // ÉTAPE 2 : Vérifier que l'élément temporaire est là
    console.log('📍 ÉTAPE 2: Vérification élément temporaire...');

    const etatAvantNavigation = await page.evaluate(() => {
      const arrayItems = document.querySelectorAll('.array-item');
      const elementsTemporaires = Array.from(arrayItems).filter(item =>
        item.textContent.includes('Temporaire')
      );

      if (elementsTemporaires.length === 0) {
        return { error: 'Aucun élément temporaire trouvé' };
      }

      const premierTemporaire = elementsTemporaires[0];
      const boutonsExplorer = premierTemporaire.querySelectorAll('button[title="Explorer cet élément"]');

      return {
        success: true,
        elementTemporaireIndex: Array.from(arrayItems).indexOf(premierTemporaire),
        aBoutonExplorer: boutonsExplorer.length > 0,
        boutonExplorerTexte: boutonsExplorer[0]?.textContent || 'N/A',
        htmlTemporaire: premierTemporaire.innerHTML.substring(0, 300)
      };
    });

    console.log('📊 AVANT NAVIGATION:');
    console.log(`   Élément temporaire index: ${etatAvantNavigation.elementTemporaireIndex}`);
    console.log(`   A bouton Explorer: ${etatAvantNavigation.aBoutonExplorer}`);

    if (etatAvantNavigation.error) {
      throw new Error(etatAvantNavigation.error);
    }

    // ÉTAPE 3 : CLIQUER SUR LE BOUTON EXPLORER DE L'ÉLÉMENT TEMPORAIRE
    console.log('📍 ÉTAPE 3: CLIC SUR EXPLORER ÉLÉMENT TEMPORAIRE...');

    const navigationResult = await page.evaluate((indexTemporaire) => {
      const arrayItems = document.querySelectorAll('.array-item');
      const elementTemporaire = arrayItems[indexTemporaire];

      if (!elementTemporaire) {
        return { error: 'Élément temporaire introuvable' };
      }

      const boutonExplorer = elementTemporaire.querySelector('button[title="Explorer cet élément"]');
      if (!boutonExplorer) {
        return { error: 'Bouton Explorer introuvable sur élément temporaire' };
      }

      // CLIC SUR EXPLORER
      boutonExplorer.click();

      return { success: true };
    }, etatAvantNavigation.elementTemporaireIndex);

    if (navigationResult.error) {
      throw new Error(navigationResult.error);
    }

    console.log('✅ Clic sur Explorer effectué');

    // ÉTAPE 4 : Attendre et analyser la nouvelle interface
    console.log('📍 ÉTAPE 4: Analyse interface après navigation...');

    await new Promise(resolve => setTimeout(resolve, 4000));

    const etatApresNavigation = await page.evaluate(() => {
      // Analyser les colonnes
      const colonnes = document.querySelectorAll('.column');
      const derniereColonne = colonnes[colonnes.length - 1];

      if (!derniereColonne) {
        return { error: 'Aucune colonne trouvée après navigation' };
      }

      // Chercher les inputs dans la dernière colonne
      const inputs = derniereColonne.querySelectorAll('input, select, textarea');
      const fieldItems = derniereColonne.querySelectorAll('.field-item');

      const detailsInputs = Array.from(inputs).map(input => ({
        type: input.type || input.tagName,
        value: input.value,
        placeholder: input.placeholder || '',
        name: input.name || '',
        fieldName: input.closest('.field-item')?.querySelector('.field-name')?.textContent || 'N/A'
      }));

      const detailsFields = Array.from(fieldItems).map(field => ({
        fieldName: field.querySelector('.field-name')?.textContent || 'N/A',
        fieldType: field.querySelector('.field-type')?.textContent || 'N/A',
        hasInput: field.querySelectorAll('input, select, textarea').length > 0,
        isEditable: field.querySelector('.direct-edit-container') !== null
      }));

      return {
        success: true,
        nombreColonnes: colonnes.length,
        inputsCount: inputs.length,
        fieldItemsCount: fieldItems.length,
        detailsInputs,
        detailsFields,
        titreColonne: derniereColonne.querySelector('.column-title')?.textContent || 'N/A',
        urlActuelle: window.location.href,
        htmlDerniereColonne: derniereColonne.innerHTML.substring(0, 500)
      };
    });

    console.log('📊 APRÈS NAVIGATION:');
    console.log(`   Nombre de colonnes: ${etatApresNavigation.nombreColonnes}`);
    console.log(`   Titre dernière colonne: ${etatApresNavigation.titreColonne}`);
    console.log(`   Inputs trouvés: ${etatApresNavigation.inputsCount}`);
    console.log(`   Fields trouvés: ${etatApresNavigation.fieldItemsCount}`);

    if (etatApresNavigation.detailsFields) {
      console.log('   Détails des champs:');
      etatApresNavigation.detailsFields.forEach(field => {
        console.log(`     - ${field.fieldName} (${field.fieldType}): Editable=${field.isEditable}, Input=${field.hasInput}`);
      });
    }

    // Screenshot final
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshot-navigation-temporaire.png' });

    const rapport = {
      timestamp: new Date().toISOString(),
      etatAvantNavigation,
      navigationResult,
      etatApresNavigation,
      screenshots: ['screenshot-navigation-temporaire.png']
    };

    fs.writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/test-navigation-temporaire-rapport.json', JSON.stringify(rapport, null, 2));

    await browser.close();

    // ANALYSE FINALE
    console.log('\\n🎯 ANALYSE FINALE:');

    if (etatApresNavigation.error) {
      console.log('❌ PROBLÈME: Navigation échouée !');
      console.log(`   Erreur: ${etatApresNavigation.error}`);
      return { probleme: 'NAVIGATION_FAILED' };
    }

    if (etatApresNavigation.inputsCount === 0) {
      console.log('❌ PROBLÈME: Aucun input après navigation !');
      console.log('   L\'élément temporaire ne propose pas d\'interface de saisie');
      console.log('   Tu as raison - c\'est exactement le problème décrit');
      return { probleme: 'NO_INPUTS_AFTER_NAVIGATION' };
    }

    const champsEditables = etatApresNavigation.detailsFields?.filter(f => f.isEditable) || [];
    if (champsEditables.length === 0) {
      console.log('❌ PROBLÈME: Champs non éditables !');
      console.log('   Les champs existent mais ne sont pas en mode édition');
      return { probleme: 'FIELDS_NOT_EDITABLE' };
    }

    console.log('✅ NAVIGATION FONCTIONNE !');
    console.log(`   ${etatApresNavigation.inputsCount} inputs disponibles`);
    console.log(`   ${champsEditables.length} champs éditables`);

    return { success: true, rapport };

  } catch (error) {
    console.error('❌ Erreur test:', error);
    await browser.close();
    return { error: error.message };
  }
}

// Exécution
testNavigationElementTemporaire().then(result => {
  if (result.error) {
    console.log('\\n🚨 TEST ÉCHOUÉ:', result.error);
    process.exit(1);
  } else if (result.probleme) {
    console.log(`\\n❌ PROBLÈME CONFIRMÉ: ${result.probleme}`);
    console.log('L\'utilisateur a raison - impossible de saisir dans l\'élément temporaire');
    process.exit(1);
  } else {
    console.log('\\n✅ NAVIGATION ET SAISIE FONCTIONNENT');
    process.exit(0);
  }
}).catch(console.error);