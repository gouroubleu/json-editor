/**
 * TEST DE VALIDATION RÉELLE DU PROBLÈME ARRAY
 * Sans interface graphique mais avec validation DOM complète
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testValidationReelle() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1600, height: 1200 }
  });

  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🔧') || text.includes('addArrayElement')) {
      logs.push(text);
    }
  });

  const rapport = {
    timestamp: new Date().toISOString(),
    etapes: [],
    problemeConfirme: false,
    details: {}
  };

  try {
    console.log('🚀 TEST VALIDATION - Chargement page...');

    await page.goto('http://localhost:5501/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // ÉTAPE 1 : Naviguer vers le champ adresse
    console.log('📍 ÉTAPE 1: Navigation vers adresse...');

    const navigation = await page.evaluate(() => {
      const fieldElements = Array.from(document.querySelectorAll('.field-name'));
      const adresseField = fieldElements.find(el => el.textContent.includes('adresse'));

      if (!adresseField) {
        return { success: false, error: 'Champ adresse introuvable' };
      }

      const fieldContainer = adresseField.closest('.field-item');
      const navigateButton = fieldContainer?.querySelector('button[title="Explorer"]');

      if (!navigateButton) {
        return { success: false, error: 'Bouton navigation introuvable' };
      }

      navigateButton.click();
      return { success: true };
    });

    rapport.etapes.push({ nom: 'Navigation', resultat: navigation });

    if (!navigation.success) {
      throw new Error(`Navigation échouée: ${navigation.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 4000));

    // ÉTAPE 2 : Analyser état initial du tableau
    console.log('📍 ÉTAPE 2: Analyse état initial...');

    const etatInitial = await page.evaluate(() => {
      // Méthode 1: Compter les .array-item
      const arrayItems = document.querySelectorAll('.array-item');

      // Méthode 2: Analyser le contenu textuel
      const arrayContainer = document.querySelector('.array-container');
      const arrayText = arrayContainer ? arrayContainer.textContent : 'Pas de container';

      // Méthode 3: Chercher les indices [0], [1], etc.
      const indexMatches = arrayText.match(/\[\d+\]/g) || [];

      // Méthode 4: Boutons d'ajout disponibles
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      return {
        arrayItemsCount: arrayItems.length,
        indicesDetectes: indexMatches.length,
        textuelContainer: arrayText.substring(0, 500),
        addButtonsCount: addButtons.length,
        addButtonsTexts: addButtons.map(btn => btn.textContent),
        urlActuelle: window.location.href
      };
    });

    rapport.etapes.push({ nom: 'État initial', resultat: etatInitial });
    console.log('📊 ÉTAT INITIAL:');
    console.log(`   Array items DOM: ${etatInitial.arrayItemsCount}`);
    console.log(`   Indices détectés: ${etatInitial.indicesDetectes}`);
    console.log(`   Boutons ajout: ${etatInitial.addButtonsCount}`);
    console.log(`   URL: ${etatInitial.urlActuelle}`);

    // ÉTAPE 3 : CLIQUER SUR AJOUTER et analyser immédiatement
    console.log('📍 ÉTAPE 3: CLIC AJOUT + ANALYSE...');

    const testAjout = await page.evaluate(() => {
      // AVANT le clic
      const avantArrayItems = document.querySelectorAll('.array-item').length;
      const avantText = document.querySelector('.array-container')?.textContent || '';
      const avantIndices = (avantText.match(/\[\d+\]/g) || []).length;

      // CLIC SUR AJOUTER
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      if (addButtons.length === 0) {
        return { success: false, error: 'Aucun bouton ajouter trouvé' };
      }

      addButtons[0].click();

      // ATTENDRE un court instant (synchrone)
      const start = Date.now();
      while (Date.now() - start < 1000) {
        // Attente active de 1 seconde
      }

      // APRÈS le clic (immédiat)
      const apresArrayItems = document.querySelectorAll('.array-item').length;
      const apresText = document.querySelector('.array-container')?.textContent || '';
      const apresIndices = (apresText.match(/\[\d+\]/g) || []).length;

      return {
        success: true,
        avant: {
          arrayItems: avantArrayItems,
          indices: avantIndices,
          textExtrait: avantText.substring(0, 200)
        },
        apres: {
          arrayItems: apresArrayItems,
          indices: apresIndices,
          textExtrait: apresText.substring(0, 200)
        },
        changement: {
          arrayItemsDelta: apresArrayItems - avantArrayItems,
          indicesDelta: apresIndices - avantIndices
        }
      };
    });

    rapport.etapes.push({ nom: 'Test ajout', resultat: testAjout });

    if (!testAjout.success) {
      throw new Error(`Test ajout échoué: ${testAjout.error}`);
    }

    console.log('📊 RÉSULTAT CLIC AJOUT:');
    console.log(`   AVANT - Array items: ${testAjout.avant.arrayItems}, Indices: ${testAjout.avant.indices}`);
    console.log(`   APRÈS - Array items: ${testAjout.apres.arrayItems}, Indices: ${testAjout.apres.indices}`);
    console.log(`   DELTA - Array items: ${testAjout.changement.arrayItemsDelta}, Indices: ${testAjout.changement.indicesDelta}`);

    // ÉTAPE 4 : Attendre plus longtemps et re-analyser
    console.log('📍 ÉTAPE 4: Attente + Re-analyse...');

    await new Promise(resolve => setTimeout(resolve, 5000)); // Attendre 5 secondes

    const etatFinal = await page.evaluate(() => {
      const arrayItems = document.querySelectorAll('.array-item');
      const arrayText = document.querySelector('.array-container')?.textContent || '';
      const indices = (arrayText.match(/\[\d+\]/g) || []).length;

      return {
        arrayItemsCount: arrayItems.length,
        indicesDetectes: indices,
        textuelContainer: arrayText.substring(0, 500),
        details: Array.from(arrayItems).map((item, i) => ({
          index: i,
          preview: item.querySelector('.array-item-preview')?.textContent || 'Pas de preview',
          temporaire: item.textContent.includes('Temporaire')
        }))
      };
    });

    rapport.etapes.push({ nom: 'État final', resultat: etatFinal });
    console.log('📊 ÉTAT FINAL:');
    console.log(`   Array items DOM: ${etatFinal.arrayItemsCount}`);
    console.log(`   Indices détectés: ${etatFinal.indicesDetectes}`);
    console.log('   Détails éléments:', etatFinal.details);

    // ANALYSE FINALE
    const analyse = {
      etatInitialItems: etatInitial.arrayItemsCount,
      etatFinalItems: etatFinal.arrayItemsCount,
      changementImmediat: testAjout.changement.arrayItemsDelta,
      changementFinal: etatFinal.arrayItemsCount - etatInitial.arrayItemsCount,
      ajoutFonctionne: etatFinal.arrayItemsCount > etatInitial.arrayItemsCount,
      problemeDetecte: etatFinal.arrayItemsCount <= etatInitial.arrayItemsCount
    };

    rapport.details = analyse;
    rapport.problemeConfirme = analyse.problemeDetecte;

    console.log('\n🎯 ANALYSE FINALE:');
    console.log(`   Initial: ${analyse.etatInitialItems} éléments`);
    console.log(`   Final: ${analyse.etatFinalItems} éléments`);
    console.log(`   Changement: ${analyse.changementFinal}`);
    console.log(`   Ajout fonctionne: ${analyse.ajoutFonctionne ? 'OUI ✅' : 'NON ❌'}`);

    if (analyse.problemeDetecte) {
      console.log('\n🚨 PROBLÈME CONFIRMÉ !');
      console.log('   L\'utilisateur a raison, le bouton ajouter ne fonctionne pas.');
      console.log('   Il faut corriger la logique d\'ajout d\'éléments.');
    } else {
      console.log('\n✅ AJOUT FONCTIONNE CORRECTEMENT');
    }

  } catch (error) {
    console.error('❌ Erreur test:', error);
    rapport.etapes.push({ nom: 'ERREUR', resultat: { error: error.message } });
  }

  rapport.logs = logs;

  // Sauvegarder le rapport
  fs.writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/test-validation-reelle-rapport.json', JSON.stringify(rapport, null, 2));

  await browser.close();

  return rapport;
}

// Exécution
testValidationReelle().then(rapport => {
  console.log('\n📄 RAPPORT SAUVEGARDÉ: test-validation-reelle-rapport.json');
  if (rapport.problemeConfirme) {
    console.log('🚨 CONCLUSION: PROBLÈME CONFIRMÉ - L\'utilisateur a raison !');
    process.exit(1);
  } else {
    console.log('✅ CONCLUSION: Ajout fonctionne correctement');
    process.exit(0);
  }
}).catch(err => {
  console.error('❌ Test échoué:', err);
  process.exit(1);
});