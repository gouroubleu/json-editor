/**
 * Test simple de vérification des corrections
 * Télécharge la page et vérifie la présence des éléments select
 */

const http = require('http');

async function testSelectField() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5501/bdd/test-user/entity_mfqm0qvi_ainoph/edit/', (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const results = {
          pageLoaded: true,
          statusCode: res.statusCode,
          hasSelectOptions: false,
          hasInputForPop: false,
          hasArrayButtons: false,
          corrections: {
            popFieldCorrect: false,
            arrayNavigationCorrect: false
          }
        };

        // Chercher les éléments select avec des options
        const selectWithOptionsPattern = /<select[^>]*class="direct-edit-input"[^>]*>[\s\S]*?<option[^>]*value="[^"]*"[^>]*>Option [123]<\/option>[\s\S]*?<\/select>/gi;
        const selectMatches = data.match(selectWithOptionsPattern);

        if (selectMatches && selectMatches.length > 0) {
          results.hasSelectOptions = true;
          results.corrections.popFieldCorrect = true;
          console.log('✅ CORRECTION TROUVÉE: Champ select avec options détecté');
          console.log('📝 Select HTML:', selectMatches[0].substring(0, 200) + '...');
        } else {
          console.log('❌ PROBLÈME: Aucun select avec options trouvé');

          // Chercher des input à la place
          const inputPattern = /<input[^>]*class="direct-edit-input"[^>]*type="text"/gi;
          const inputMatches = data.match(inputPattern);
          if (inputMatches && inputMatches.length > 0) {
            results.hasInputForPop = true;
            console.log('⚠️ PROBLÈME PERSISTANT: Input texte trouvé à la place du select');
          }
        }

        // Chercher les boutons d'ajout d'array
        const arrayButtonPattern = /➕.*[Aa]jouter|[Aa]jouter.*➕/gi;
        const arrayButtonMatches = data.match(arrayButtonPattern);

        if (arrayButtonMatches && arrayButtonMatches.length > 0) {
          results.hasArrayButtons = true;
          results.corrections.arrayNavigationCorrect = true;
          console.log('✅ BOUTONS ARRAY: Boutons d\'ajout trouvés');
          console.log('📝 Boutons:', arrayButtonMatches);
        } else {
          console.log('❌ BOUTONS ARRAY: Aucun bouton d\'ajout trouvé');
        }

        // Résumé des corrections
        const successCount = Object.values(results.corrections).filter(Boolean).length;
        const totalCorrections = Object.keys(results.corrections).length;
        const successRate = Math.round((successCount / totalCorrections) * 100);

        console.log('\n📊 RÉSUMÉ DES CORRECTIONS:');
        console.log(`✅ Corrections validées: ${successCount}/${totalCorrections}`);
        console.log(`📈 Taux de réussite: ${successRate}%`);

        if (successRate === 100) {
          console.log('🎉 TOUTES LES CORRECTIONS SONT APPLIQUÉES !');
        } else if (successRate >= 50) {
          console.log('⚠️ CORRECTIONS PARTIELLES - Certains problèmes persistent');
        } else {
          console.log('🚨 PROBLÈMES PERSISTANTS - Corrections insuffisantes');
        }

        results.summary = {
          successRate,
          status: successRate === 100 ? 'TOUTES_CORRECTIONS_OK' :
                  successRate >= 50 ? 'CORRECTIONS_PARTIELLES' : 'CORRECTIONS_INSUFFISANTES'
        };

        resolve(results);
      });
    });

    req.on('error', (err) => {
      console.error('❌ Erreur lors du test:', err.message);
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Exécution
testSelectField()
  .then(results => {
    console.log('\n🎯 CONCLUSION FINALE:');
    console.log('Status:', results.summary.status);

    // Sauvegarder les résultats
    const fs = require('fs');
    fs.writeFileSync('/home/gouroubleu/WS/json-editor/CLAUDE/test-simple-results.json', JSON.stringify(results, null, 2));

    process.exit(results.summary.successRate === 100 ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Test échoué:', err.message);
    process.exit(1);
  });