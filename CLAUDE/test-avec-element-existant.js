/**
 * TEST AVEC ÉLÉMENT DÉJÀ EXISTANT
 * Reproduire exactement le problème : tableau avec 1 élément → ajouter → voir si 2e apparaît
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testAvecElementExistant() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1600, height: 1200 }
  });

  const page = await browser.newPage();

  try {
    console.log('🎯 TEST AVEC ÉLÉMENT DÉJÀ EXISTANT - Démarrage...');

    // Charger une entité existante avec données dans le tableau adresse
    await page.goto('http://localhost:5501/bdd/test-user/entity_mfqm0qvi_ainoph/edit/', {
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

    // ÉTAPE 1 : Analyser l'état initial avec élément existant
    console.log('📍 ÉTAPE 1: État initial du tableau avec élément existant...');

    const etatInitial = await page.evaluate(() => {
      const arrayContainer = document.querySelector('.array-container');
      const arrayItems = document.querySelectorAll('.array-item');
      const arrayHeader = document.querySelector('.array-header');

      // Analyser chaque élément en détail
      const elementsDetails = Array.from(arrayItems).map((item, index) => {
        const header = item.querySelector('.array-item-header');
        const preview = item.querySelector('.array-item-preview');
        const actions = item.querySelector('.array-item-actions');
        const isTemporary = item.textContent.includes('Temporaire') || item.classList.contains('temporary-item');

        return {
          index,
          indexAffiché: header?.querySelector('.array-index')?.textContent || 'N/A',
          type: header?.querySelector('.array-item-type')?.textContent || 'N/A',
          preview: preview?.textContent || 'N/A',
          isTemporary,
          hasDeleteButton: !!actions?.querySelector('button[title*="Supprimer"]'),
          hasExploreButton: !!actions?.querySelector('button[title*="Explorer"]'),
          innerHTML: item.innerHTML.substring(0, 200)
        };
      });

      return {
        nombreElements: arrayItems.length,
        headerText: arrayHeader?.textContent || 'N/A',
        containerText: arrayContainer?.textContent?.substring(0, 300) || 'N/A',
        elementsDetails,
        urlActuelle: window.location.href
      };
    });

    console.log('📊 ÉTAT INITIAL AVEC ÉLÉMENT EXISTANT:');
    console.log(`   Nombre d'éléments détectés: ${etatInitial.nombreElements}`);
    console.log(`   Header du tableau: ${etatInitial.headerText}`);
    etatInitial.elementsDetails.forEach(el => {
      const status = el.isTemporary ? '⏳ TEMPORAIRE' : '✅ PERMANENT';
      console.log(`   [${el.index}] ${el.indexAffiché} ${el.type} - ${el.preview} (${status})`);
    });

    // Screenshot avant ajout
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshot-avant-ajout-element-existant.png' });

    // ÉTAPE 2 : AJOUTER UN NOUVEL ÉLÉMENT
    console.log('📍 ÉTAPE 2: AJOUT NOUVEL ÉLÉMENT...');

    const ajoutResult = await page.evaluate(() => {
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      if (addButtons.length === 0) {
        return { error: 'Aucun bouton ajouter trouvé' };
      }

      // État juste avant le clic
      const avantClic = {
        items: document.querySelectorAll('.array-item').length,
        headerText: document.querySelector('.array-header')?.textContent || 'N/A'
      };

      addButtons[0].click();

      return { success: true, avantClic };
    });

    if (ajoutResult.error) {
      throw new Error(ajoutResult.error);
    }

    console.log('✅ Clic sur ajouter effectué');
    console.log(`   Avant clic: ${ajoutResult.avantClic.items} éléments, Header: "${ajoutResult.avantClic.headerText}"`);

    // ÉTAPE 3 : Analyser l'état après ajout (plusieurs vérifications)
    console.log('📍 ÉTAPE 3: Analyse après ajout...');

    const verifications = [];
    const delais = [500, 1000, 2000, 3000, 5000];

    for (const delai of delais) {
      await new Promise(resolve => setTimeout(resolve, delai - (verifications.length > 0 ? delais[verifications.length - 1] : 0)));

      const verification = await page.evaluate((moment) => {
        const arrayContainer = document.querySelector('.array-container');
        const arrayItems = document.querySelectorAll('.array-item');
        const arrayHeader = document.querySelector('.array-header');

        const elementsDetails = Array.from(arrayItems).map((item, index) => {
          const header = item.querySelector('.array-item-header');
          const preview = item.querySelector('.array-item-preview');
          const isTemporary = item.textContent.includes('Temporaire') || item.classList.contains('temporary-item');

          return {
            index,
            indexAffiché: header?.querySelector('.array-index')?.textContent || 'N/A',
            type: header?.querySelector('.array-item-type')?.textContent || 'N/A',
            preview: preview?.textContent || 'N/A',
            isTemporary
          };
        });

        return {
          moment,
          nombreElements: arrayItems.length,
          headerText: arrayHeader?.textContent || 'N/A',
          elementsDetails,
          changementDepuisInitial: arrayItems.length - 1 // Supposant 1 élément initial
        };
      }, `APRES_${delai}ms`);

      verifications.push(verification);

      console.log(`📊 ${verification.moment}:`);
      console.log(`   Éléments: ${verification.nombreElements} (changement: +${verification.changementDepuisInitial})`);
      console.log(`   Header: "${verification.headerText}"`);

      if (verification.elementsDetails.length > 1) {
        console.log('   Détail des éléments:');
        verification.elementsDetails.forEach(el => {
          const status = el.isTemporary ? '⏳ TEMP' : '✅ PERM';
          console.log(`     [${el.index}] ${el.indexAffiché} - ${el.preview} (${status})`);
        });
      }
    }

    // Screenshot après ajout
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/screenshot-apres-ajout-element-existant.png' });

    const rapport = {
      timestamp: new Date().toISOString(),
      etatInitial,
      ajoutResult,
      verifications,
      screenshots: [
        'screenshot-avant-ajout-element-existant.png',
        'screenshot-apres-ajout-element-existant.png'
      ]
    };

    fs.writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/test-element-existant-rapport.json', JSON.stringify(rapport, null, 2));

    await browser.close();

    // ANALYSE FINALE
    console.log('\\n🎯 ANALYSE FINALE:');

    const dernierEtat = verifications[verifications.length - 1];
    const problemeDetecte = dernierEtat.nombreElements <= etatInitial.nombreElements;

    console.log(`INITIAL: ${etatInitial.nombreElements} éléments`);
    console.log(`FINAL: ${dernierEtat.nombreElements} éléments`);
    console.log(`CHANGEMENT: +${dernierEtat.changementDepuisInitial}`);

    if (problemeDetecte) {
      console.log('❌ PROBLÈME CONFIRMÉ !');
      console.log('   Le nouvel élément N\'APPARAÎT PAS dans la liste du tableau');
      console.log('   L\'utilisateur a raison - ça ne fonctionne pas avec des éléments existants');
      return { probleme: 'NOUVEAU_ELEMENT_INVISIBLE', rapport };
    } else {
      console.log('✅ AJOUT FONCTIONNE !');
      console.log('   Le nouvel élément apparaît bien dans la liste');
      return { success: true, rapport };
    }

  } catch (error) {
    console.error('❌ Erreur test:', error);
    await browser.close();
    return { error: error.message };
  }
}

// Exécution
testAvecElementExistant().then(result => {
  if (result.error) {
    console.log('\\n🚨 TEST ÉCHOUÉ:', result.error);
    process.exit(1);
  } else if (result.probleme) {
    console.log(`\\n❌ PROBLÈME CONFIRMÉ: ${result.probleme}`);
    console.log('Il faut corriger l\'affichage du nouvel élément dans la liste');
    process.exit(1);
  } else {
    console.log('\\n✅ TOUT FONCTIONNE AVEC ÉLÉMENTS EXISTANTS');
    process.exit(0);
  }
}).catch(console.error);