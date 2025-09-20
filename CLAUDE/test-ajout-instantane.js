/**
 * Test pour vérifier que l'ajout d'éléments est maintenant INSTANTANÉ
 */

const puppeteer = require('puppeteer');

async function testAjoutInstantane() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('🚀 TEST AJOUT INSTANTANÉ - Chargement...');

    await page.goto('http://localhost:5501/bdd/test-user/new/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Navigation vers adresse
    await page.evaluate(() => {
      const fieldElements = Array.from(document.querySelectorAll('.field-name'));
      const adresseField = fieldElements.find(el => el.textContent.includes('adresse'));
      const fieldContainer = adresseField?.closest('.field-item');
      const navigateButton = fieldContainer?.querySelector('button[title="Explorer"]');
      navigateButton?.click();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // TEST AVEC MESURES DE TEMPS PRÉCISES
    const resultats = await page.evaluate(() => {
      const mesures = [];

      // État initial
      const initialCount = document.querySelectorAll('.array-item').length;
      const initialText = document.querySelector('.array-container')?.textContent || '';

      mesures.push({
        moment: 'INITIAL',
        timestamp: Date.now(),
        count: initialCount,
        textExtrait: initialText.substring(0, 100)
      });

      // CLIC SUR AJOUTER avec mesure immédiate
      const addButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Ajouter') || btn.textContent.includes('➕')
      );

      if (addButtons.length === 0) {
        return { error: 'Aucun bouton ajouter trouvé' };
      }

      const startTime = Date.now();
      addButtons[0].click();

      // Mesures à intervalles réguliers
      const intervals = [100, 200, 500, 1000, 2000]; // millisecondes

      return new Promise(resolve => {
        let completed = 0;

        intervals.forEach((delay, index) => {
          setTimeout(() => {
            const currentCount = document.querySelectorAll('.array-item').length;
            const currentText = document.querySelector('.array-container')?.textContent || '';

            mesures.push({
              moment: `APRES_${delay}ms`,
              timestamp: Date.now(),
              delaiDepuisClic: Date.now() - startTime,
              count: currentCount,
              changement: currentCount - initialCount,
              textExtrait: currentText.substring(0, 100)
            });

            completed++;
            if (completed === intervals.length) {
              resolve({
                success: true,
                countInitial: initialCount,
                mesures: mesures,
                premierChangementDetecte: mesures.find(m => m.changement > 0)?.moment || 'AUCUN'
              });
            }
          }, delay);
        });
      });
    });

    if (resultats.error) {
      throw new Error(resultats.error);
    }

    console.log('📊 RÉSULTATS TEST INSTANTANÉ:');
    console.log(`   Éléments initial: ${resultats.countInitial}`);
    console.log(`   Premier changement détecté: ${resultats.premierChangementDetecte}`);

    // Analyser les mesures
    resultats.mesures.forEach(mesure => {
      const status = mesure.changement > 0 ? '✅ AJOUTÉ' : '⏳ EN ATTENTE';
      console.log(`   ${mesure.moment}: ${mesure.count} éléments (${status})`);
    });

    // Déterminer si c'est instantané (< 500ms)
    const premierChangement = resultats.mesures.find(m => m.changement > 0);
    const estInstantane = premierChangement && premierChangement.delaiDepuisClic <= 500;

    console.log('\n🎯 CONCLUSION:');
    if (estInstantane) {
      console.log(`✅ AJOUT INSTANTANÉ ! (détecté en ${premierChangement.delaiDepuisClic}ms)`);
      console.log('   Le problème de délai a été corrigé');
    } else if (premierChangement) {
      console.log(`⚠️ AJOUT LENT (détecté en ${premierChangement.delaiDepuisClic}ms)`);
      console.log('   Le délai existe encore mais est réduit');
    } else {
      console.log('❌ AJOUT NE FONCTIONNE PAS');
      console.log('   Aucun changement détecté même après 2 secondes');
    }

    await browser.close();

    return {
      instantane: estInstantane,
      delai: premierChangement?.delaiDepuisClic || -1,
      resultats
    };

  } catch (error) {
    console.error('❌ Erreur test:', error);
    await browser.close();
    return { error: error.message };
  }
}

// Exécution
testAjoutInstantane().then(result => {
  if (result.error) {
    console.log('\n🚨 TEST ÉCHOUÉ:', result.error);
    process.exit(1);
  } else if (result.instantane) {
    console.log('\n🎉 CORRECTION VALIDÉE - L\'ajout est maintenant instantané !');
    process.exit(0);
  } else {
    console.log('\n⚠️ AMÉLIORATION PARTIELLE - Il reste du délai à optimiser');
    process.exit(1);
  }
}).catch(console.error);