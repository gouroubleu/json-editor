/**
 * TEST DE BOUT EN BOUT RÉEL - Exactement comme un utilisateur
 * 1. Ouvrir la page
 * 2. Naviguer vers adresse
 * 3. Voir l'état initial
 * 4. Cliquer sur ajouter
 * 5. Vérifier si le nouvel élément APPARAÎT VRAIMENT
 * 6. Essayer de supprimer le premier
 * 7. Vérifier si ça marche
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testBoutEnBoutReel() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1600, height: 1200 }
  });

  const page = await browser.newPage();

  const etapes = [];
  let problemeDetecte = false;
  let detailsProbleme = '';

  try {
    console.log('🔥 TEST BOUT EN BOUT RÉEL - Démarrage...');

    // ÉTAPE 1 : Charger la page
    console.log('📍 ÉTAPE 1: Chargement page...');
    await page.goto('http://localhost:5501/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Vérifier que la page est chargée
    const pageChargee = await page.evaluate(() => {
      return {
        titre: document.title,
        champsTrouves: Array.from(document.querySelectorAll('.field-name')).map(el => el.textContent),
        hasAdresse: Array.from(document.querySelectorAll('.field-name')).some(el => el.textContent.includes('adresse'))
      };
    });

    etapes.push({ nom: 'Chargement page', resultat: pageChargee });

    if (!pageChargee.hasAdresse) {
      problemeDetecte = true;
      detailsProbleme = 'Champ adresse non trouvé sur la page';
      throw new Error(detailsProbleme);
    }

    console.log('✅ Page chargée, champ adresse trouvé');

    // ÉTAPE 2 : Naviguer vers adresse
    console.log('📍 ÉTAPE 2: Navigation vers champ adresse...');

    const navigation = await page.evaluate(() => {
      const fieldElements = Array.from(document.querySelectorAll('.field-name'));
      const adresseField = fieldElements.find(el => el.textContent.includes('adresse'));

      if (!adresseField) {
        return { success: false, error: 'Champ adresse introuvable' };
      }

      const fieldContainer = adresseField.closest('.field-item');
      const navigateButton = fieldContainer?.querySelector('button[title="Explorer"]');

      if (!navigateButton) {
        return { success: false, error: 'Bouton Explorer introuvable' };
      }

      navigateButton.click();
      return { success: true };
    });

    etapes.push({ nom: 'Navigation adresse', resultat: navigation });

    if (!navigation.success) {
      problemeDetecte = true;
      detailsProbleme = `Navigation échouée: ${navigation.error}`;
      throw new Error(detailsProbleme);
    }

    // Attendre que la navigation se fasse
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('✅ Navigation vers adresse effectuée');

    // ÉTAPE 3 : Analyser l'état initial du tableau
    console.log('📍 ÉTAPE 3: Analyse état initial du tableau...');

    const etatInitial = await page.evaluate(() => {
      // Chercher le conteneur du tableau
      const arrayContainer = document.querySelector('.array-container');
      if (!arrayContainer) {
        return { error: 'Container array introuvable' };
      }

      // Compter les éléments visuels
      const arrayItems = document.querySelectorAll('.array-item');
      const elementsVisibles = Array.from(arrayItems).filter(item => {
        const style = window.getComputedStyle(item);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      // Chercher les boutons d'ajout
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      // Analyser le contenu textuel
      const textContainer = arrayContainer.textContent;

      return {
        success: true,
        elementsCount: elementsVisibles.length,
        elementsDetails: elementsVisibles.map((item, i) => ({
          index: i,
          preview: item.querySelector('.array-item-preview')?.textContent || 'Pas de preview',
          hasDeleteBtn: !!item.querySelector('button[title="Supprimer cet élément"]')
        })),
        addButtonsCount: addButtons.length,
        addButtonsTexts: addButtons.map(btn => btn.textContent.trim()),
        textContainer: textContainer.substring(0, 200),
        urlActuelle: window.location.href
      };
    });

    etapes.push({ nom: 'État initial tableau', resultat: etatInitial });

    if (etatInitial.error) {
      problemeDetecte = true;
      detailsProbleme = `Erreur état initial: ${etatInitial.error}`;
      throw new Error(detailsProbleme);
    }

    console.log(`✅ État initial: ${etatInitial.elementsCount} éléments, ${etatInitial.addButtonsCount} boutons ajout`);
    console.log(`   Détails éléments:`, etatInitial.elementsDetails);

    // ÉTAPE 4 : CLIQUER SUR AJOUTER - LE MOMENT DE VÉRITÉ
    console.log('📍 ÉTAPE 4: CLIC SUR AJOUTER - TEST CRITIQUE...');

    if (etatInitial.addButtonsCount === 0) {
      problemeDetecte = true;
      detailsProbleme = 'Aucun bouton ajouter trouvé';
      throw new Error(detailsProbleme);
    }

    const testAjout = await page.evaluate(() => {
      // État AVANT le clic
      const avant = {
        count: document.querySelectorAll('.array-item').length,
        text: document.querySelector('.array-container')?.textContent?.substring(0, 100) || 'N/A'
      };

      // CLIC SUR LE BOUTON
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      if (addButtons.length === 0) {
        return { error: 'Aucun bouton ajouter disponible' };
      }

      console.log('🔥 CLIC SUR BOUTON AJOUTER...');
      addButtons[0].click();

      return { success: true, avant };
    });

    etapes.push({ nom: 'Clic ajouter', resultat: testAjout });

    if (testAjout.error) {
      problemeDetecte = true;
      detailsProbleme = `Erreur clic ajout: ${testAjout.error}`;
      throw new Error(detailsProbleme);
    }

    console.log('✅ Clic effectué sur bouton ajouter');

    // ÉTAPE 5 : VÉRIFIER SI L'ÉLÉMENT APPARAÎT (plusieurs vérifications dans le temps)
    console.log('📍 ÉTAPE 5: VÉRIFICATION APPARITION NOUVEL ÉLÉMENT...');

    const verifications = [];
    const delais = [500, 1000, 2000, 3000, 5000]; // Vérifier à plusieurs moments

    for (const delai of delais) {
      await new Promise(resolve => setTimeout(resolve, delai - (verifications.length > 0 ? delais[verifications.length - 1] : 0)));

      const etatActuel = await page.evaluate(() => {
        const arrayItems = document.querySelectorAll('.array-item');
        const elementsVisibles = Array.from(arrayItems).filter(item => {
          const style = window.getComputedStyle(item);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });

        return {
          count: elementsVisibles.length,
          details: elementsVisibles.map((item, i) => ({
            index: i,
            preview: item.querySelector('.array-item-preview')?.textContent || 'Pas de preview',
            estTemporaire: item.textContent.includes('Temporaire') || item.classList.contains('temporary-item')
          })),
          textContainer: document.querySelector('.array-container')?.textContent?.substring(0, 150) || 'N/A'
        };
      });

      verifications.push({
        delai: delai,
        count: etatActuel.count,
        changement: etatActuel.count - testAjout.avant.count,
        details: etatActuel.details
      });

      console.log(`   Après ${delai}ms: ${etatActuel.count} éléments (changement: ${etatActuel.count - testAjout.avant.count})`);
    }

    etapes.push({ nom: 'Vérifications ajout', resultat: verifications });

    // Analyser si l'ajout a vraiment fonctionné
    const dernierEtat = verifications[verifications.length - 1];
    const ajoutFonctionne = dernierEtat.changement > 0;

    if (!ajoutFonctionne) {
      problemeDetecte = true;
      detailsProbleme = `AJOUT NE FONCTIONNE PAS ! Aucun changement détecté après 5 secondes. Avant: ${testAjout.avant.count}, Après: ${dernierEtat.count}`;
      console.log('❌ PROBLÈME CONFIRMÉ:', detailsProbleme);
    } else {
      console.log(`✅ AJOUT FONCTIONNE ! Élément ajouté. Avant: ${testAjout.avant.count}, Après: ${dernierEtat.count}`);
    }

    // ÉTAPE 6 : Test suppression du premier élément (si ajout fonctionne)
    if (ajoutFonctionne && dernierEtat.count > 1) {
      console.log('📍 ÉTAPE 6: TEST SUPPRESSION PREMIER ÉLÉMENT...');

      const testSuppression = await page.evaluate(() => {
        const arrayItems = document.querySelectorAll('.array-item');
        if (arrayItems.length === 0) {
          return { error: 'Aucun élément à supprimer' };
        }

        const premierElement = arrayItems[0];
        const deleteButton = premierElement.querySelector('button[title="Supprimer cet élément"]');

        if (!deleteButton) {
          return { error: 'Bouton suppression introuvable sur premier élément' };
        }

        const countAvant = arrayItems.length;
        deleteButton.click();

        return { success: true, countAvant };
      });

      if (testSuppression.error) {
        problemeDetecte = true;
        detailsProbleme += ` + SUPPRESSION: ${testSuppression.error}`;
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const etatApresSuppression = await page.evaluate(() => {
          return document.querySelectorAll('.array-item').length;
        });

        const suppressionFonctionne = etatApresSuppression < testSuppression.countAvant;
        etapes.push({
          nom: 'Test suppression',
          resultat: {
            avant: testSuppression.countAvant,
            apres: etatApresSuppression,
            fonctionne: suppressionFonctionne
          }
        });

        if (!suppressionFonctionne) {
          problemeDetecte = true;
          detailsProbleme += ` + SUPPRESSION: Ne fonctionne pas (${testSuppression.countAvant} -> ${etatApresSuppression})`;
        } else {
          console.log(`✅ SUPPRESSION FONCTIONNE ! ${testSuppression.countAvant} -> ${etatApresSuppression} éléments`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur durant le test:', error.message);
    problemeDetecte = true;
    if (!detailsProbleme) detailsProbleme = error.message;
    etapes.push({ nom: 'ERREUR', resultat: { error: error.message } });
  }

  const rapport = {
    timestamp: new Date().toISOString(),
    problemeDetecte,
    detailsProbleme,
    etapes
  };

  // Sauvegarder le rapport
  fs.writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/test-bout-en-bout-rapport.json', JSON.stringify(rapport, null, 2));

  await browser.close();

  console.log('\n🎯 CONCLUSION FINALE DU TEST BOUT EN BOUT:');
  if (problemeDetecte) {
    console.log('🚨 PROBLÈME DÉTECTÉ !');
    console.log(`   Détails: ${detailsProbleme}`);
    console.log('   L\'utilisateur a raison, il y a encore des bugs');
  } else {
    console.log('✅ TOUT FONCTIONNE CORRECTEMENT');
    console.log('   Ajout et suppression d\'éléments opérationnels');
  }

  return rapport;
}

// Exécution
testBoutEnBoutReel().then(rapport => {
  if (rapport.problemeDetecte) {
    console.log('\n💥 L\'UTILISATEUR A RAISON - IL Y A ENCORE DES PROBLÈMES !');
    process.exit(1);
  } else {
    console.log('\n🎉 Validation réussie - Tout fonctionne');
    process.exit(0);
  }
}).catch(err => {
  console.error('❌ Test échoué:', err);
  process.exit(1);
});