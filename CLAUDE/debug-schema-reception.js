/**
 * Debug pour comprendre comment le schéma arrive dans EntityColumn
 */

const http = require('http');

async function debugSchemaReception() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5501/bdd/test-user/entity_mfqm0qvi_ainoph/edit/', (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('🔍 ANALYSE DU SCHÉMA REÇU PAR L\'INTERFACE:');

        // 1. Chercher tous les field-type affichés
        const fieldTypePattern = /<span class="field-type"[^>]*>([^<]*)<\/span>/gi;
        let match;
        const fieldTypes = [];
        while ((match = fieldTypePattern.exec(data)) !== null) {
          fieldTypes.push(match[1]);
        }

        console.log('📊 Types de champs détectés:', fieldTypes);

        // 2. Chercher spécifiquement le champ pop
        const popFieldPattern = /<span class="field-name"[^>]*>\s*pop[^<]*<\/span>[\s\S]*?<span class="field-type"[^>]*>([^<]*)<\/span>/gi;
        const popMatch = popFieldPattern.exec(data);

        if (popMatch) {
          console.log('🎯 CHAMP POP TROUVÉ:');
          console.log('   Type affiché:', popMatch[1]);

          // Chercher l'input ou select associé
          const popFullPattern = /<span class="field-name"[^>]*>\s*pop[^<]*<\/span>[\s\S]*?<div class="field-value">[\s\S]*?(<(?:input|select)[^>]*class="direct-edit-input"[^>]*>[\s\S]*?<\/(?:input|select)>)/gi;
          const popFullMatch = popFullPattern.exec(data);

          if (popFullMatch) {
            console.log('   Element de saisie:', popFullMatch[1].substring(0, 200) + '...');

            // Vérifier si c'est un select avec options
            if (popFullMatch[1].includes('<select')) {
              console.log('✅ ÉLÉMENT SELECT DÉTECTÉ');

              // Extraire les options
              const optionsPattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi;
              let optionMatch;
              const options = [];
              while ((optionMatch = optionsPattern.exec(popFullMatch[1])) !== null) {
                options.push({ value: optionMatch[1], text: optionMatch[2] });
              }
              console.log('   Options:', options);

              if (options.some(opt => opt.text.includes('Option'))) {
                console.log('🎉 CORRECTION RÉUSSIE: Select avec bonnes options !');
                resolve({ success: true, type: 'select', options });
                return;
              } else {
                console.log('⚠️ PROBLÈME: Select sans les bonnes options');
              }
            } else if (popFullMatch[1].includes('<input')) {
              console.log('❌ PROBLÈME: Input détecté au lieu de select');
            }
          }
        } else {
          console.log('❌ CHAMP POP NON TROUVÉ');
        }

        // 3. Chercher les données de debug dans les scripts
        const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
        let scriptMatch;
        while ((scriptMatch = scriptPattern.exec(data)) !== null) {
          if (scriptMatch[1].includes('fieldSchema') || scriptMatch[1].includes('type.*select')) {
            console.log('🔧 DEBUG SCRIPT TROUVÉ:', scriptMatch[1].substring(0, 300) + '...');
          }
        }

        // 4. Chercher les erreurs dans les console.log
        if (data.includes('🔧')) {
          console.log('🛠️ LOGS DE DEBUG PRÉSENTS DANS LA PAGE');
        }

        resolve({ success: false, analysis: 'Problèmes détectés' });
      });
    });

    req.on('error', (err) => {
      console.error('❌ Erreur:', err.message);
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Exécution
debugSchemaReception()
  .then(result => {
    console.log('\n🎯 RÉSULTAT FINAL:', result);
  })
  .catch(err => {
    console.error('❌ Debug échoué:', err.message);
  });