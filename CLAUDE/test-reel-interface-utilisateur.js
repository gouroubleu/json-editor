/**
 * TEST RÉEL DE L'INTERFACE UTILISATEUR
 * Ce que l'utilisateur voit vraiment quand il clique sur "Ajouter"
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testReelInterface() {
  const browser = await puppeteer.launch({
    headless: false, // IMPORTANT : headless false pour voir ce qui se passe
    devtools: true,
    defaultViewport: { width: 1600, height: 1200 },
    slowMo: 500 // Ralentir pour voir les actions
  });

  const page = await browser.newPage();

  const etapes = [];

  try {
    console.log('🚀 TEST RÉEL - Ouverture de la page...');

    await page.goto('http://localhost:5501/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // ÉTAPE 1 : Prendre capture AVANT tout
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-avant-tout.png', fullPage: true });
    console.log('📸 Capture AVANT navigation prise');

    // ÉTAPE 2 : Cliquer sur le champ adresse pour naviguer
    console.log('👆 Clic sur le champ adresse...');

    const adresseNavigation = await page.evaluate(() => {
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

    etapes.push({ nom: 'Navigation adresse', resultat: adresseNavigation });

    if (!adresseNavigation.success) {
      throw new Error(`Navigation échouée: ${adresseNavigation.error}`);
    }

    await page.waitForTimeout(3000);

    // ÉTAPE 3 : Capture APRÈS navigation vers adresse
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-apres-navigation.png', fullPage: true });
    console.log('📸 Capture APRÈS navigation prise');

    // ÉTAPE 4 : Analyser ce qui est affiché dans le tableau adresse
    const etatAvantAjout = await page.evaluate(() => {
      // Compter les éléments visuellement affichés
      const arrayItems = document.querySelectorAll('.array-item');
      const arrayItemsVisible = Array.from(arrayItems).filter(item => {
        const style = window.getComputedStyle(item);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      // Chercher les boutons d'ajout
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      return {
        elementsAffiches: arrayItemsVisible.length,
        elementsDetails: arrayItemsVisible.map((item, index) => ({
          index,
          texteAffiche: item.querySelector('.array-item-preview')?.textContent || 'Pas de preview',
          estVisible: window.getComputedStyle(item).display !== 'none'
        })),
        boutonsAjoutTrouves: addButtons.length,
        premierBoutonTexte: addButtons[0]?.textContent || 'Aucun bouton'
      };
    });

    etapes.push({ nom: 'État avant ajout', resultat: etatAvantAjout });
    console.log('📊 AVANT AJOUT:', etatAvantAjout);

    // ÉTAPE 5 : CLIQUER SUR LE BOUTON AJOUTER
    console.log('👆 CLIC SUR BOUTON AJOUTER...');

    const clicAjout = await page.evaluate(() => {
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      if (addButtons.length === 0) {
        return { success: false, error: 'Aucun bouton ajouter trouvé' };
      }

      // Cliquer sur le premier bouton trouvé
      addButtons[0].click();
      return { success: true, boutonClique: addButtons[0].textContent };
    });

    etapes.push({ nom: 'Clic ajout', resultat: clicAjout });

    if (!clicAjout.success) {
      throw new Error(`Clic ajout échoué: ${clicAjout.error}`);
    }

    // ATTENDRE et observer les changements
    console.log('⏱️ Attente des changements...');
    await page.waitForTimeout(5000); // 5 secondes pour voir ce qui se passe

    // ÉTAPE 6 : Capture APRÈS clic ajout
    await page.screenshot({ path: '/home/gouroubleu/WS/json-editor/CLAUDE/test-apres-ajout.png', fullPage: true });
    console.log('📸 Capture APRÈS ajout prise');

    // ÉTAPE 7 : Analyser ce qui est affiché APRÈS ajout
    const etatApresAjout = await page.evaluate(() => {
      const arrayItems = document.querySelectorAll('.array-item');
      const arrayItemsVisible = Array.from(arrayItems).filter(item => {
        const style = window.getComputedStyle(item);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      return {
        elementsAffiches: arrayItemsVisible.length,
        elementsDetails: arrayItemsVisible.map((item, index) => ({
          index,
          texteAffiche: item.querySelector('.array-item-preview')?.textContent || 'Pas de preview',
          estVisible: window.getComputedStyle(item).display !== 'none',
          estTemporaire: item.classList.contains('temporary-item') || item.textContent.includes('Temporaire')
        })),
        urlActuelle: window.location.href
      };
    });

    etapes.push({ nom: 'État après ajout', resultat: etatApresAjout });
    console.log('📊 APRÈS AJOUT:', etatApresAjout);

    // ANALYSE FINALE
    const analyse = {
      elementesAvant: etatAvantAjout.elementsAffiches,
      elementsApres: etatApresAjout.elementsAffiches,
      ajoutFonctionne: etatApresAjout.elementsAffiches > etatAvantAjout.elementsAffiches,
      problemeDetecte: etatApresAjout.elementsAffiches <= etatAvantAjout.elementsAffiches,
      details: etatApresAjout.elementsDetails
    };

    console.log('\n🎯 ANALYSE FINALE:');
    console.log(`   Éléments AVANT: ${analyse.elementesAvant}`);
    console.log(`   Éléments APRÈS: ${analyse.elementsApres}`);
    console.log(`   Ajout fonctionne: ${analyse.ajoutFonctionne ? 'OUI ✅' : 'NON ❌'}`);
    console.log(`   Problème détecté: ${analyse.problemeDetecte ? 'OUI ⚠️' : 'NON ✅'}`);

    if (analyse.problemeDetecte) {
      console.log('\n🚨 PROBLÈME CONFIRMÉ: Le bouton ajout ne fonctionne pas correctement !');
      console.log('   L\'utilisateur a raison, il y a un vrai bug.');
    } else {
      console.log('\n✅ Ajout fonctionne correctement');
    }

    // Sauvegarder le rapport complet
    const rapport = {
      timestamp: new Date().toISOString(),
      etapes,
      analyse,
      captures: [
        'test-avant-tout.png',
        'test-apres-navigation.png',
        'test-apres-ajout.png'
      ]
    };

    fs.writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/test-reel-rapport.json', JSON.stringify(rapport, null, 2));

    // Garder le browser ouvert pour inspection manuelle
    console.log('\n🔍 Browser laissé ouvert pour inspection manuelle...');
    console.log('Appuyez sur Ctrl+C quand vous avez fini d\'inspecter');

    // Attendre indéfiniment
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Erreur dans le test réel:', error);
    etapes.push({ nom: 'ERREUR', resultat: { error: error.message } });
  }

  return etapes;
}

// Exécution
testReelInterface().catch(console.error);