// Test avec Chrome en mode headless pour capturer les erreurs console
const { execSync, spawn } = require('child_process');
const fs = require('fs');

console.log('=== TEST BROWSER RÉEL AVEC CAPTURE D\'ERREURS ===');

// Fonction pour tester avec Chrome headless
function testWithChrome() {
  console.log('\nLancement de Chrome pour capturer les erreurs...');

  try {
    // Script JavaScript à injecter pour capturer les erreurs
    const testScript = `
      console.log('=== DÉBUT DU TEST ===');

      // Capturer les erreurs globales
      window.addEventListener('error', function(e) {
        console.error('ERREUR CAPTURÉE:', e.message, 'Source:', e.filename, 'Ligne:', e.lineno);
      });

      // Capturer les erreurs de modules
      window.addEventListener('unhandledrejection', function(e) {
        console.error('ERREUR MODULE CAPTURÉE:', e.reason);
      });

      // Attendre que la page soit chargée
      setTimeout(function() {
        console.log('Page chargée, recherche des boutons Entités...');

        // Chercher les boutons "Entités"
        const buttons = document.querySelectorAll('button[title*="Voir les entités"]');
        console.log('Boutons Entités trouvés:', buttons.length);

        if (buttons.length > 0) {
          console.log('Clic sur le premier bouton Entités...');

          // Simuler un clic
          try {
            buttons[0].click();
            console.log('Clic effectué avec succès');
          } catch (error) {
            console.error('Erreur lors du clic:', error.message);
          }
        }

        // Attendre un peu pour voir les erreurs
        setTimeout(function() {
          console.log('=== FIN DU TEST ===');
        }, 3000);

      }, 2000);
    `;

    // Encoder le script en base64 pour éviter les problèmes de quotes
    const scriptBase64 = Buffer.from(testScript).toString('base64');

    // Commande Chrome avec le script injecté
    const chromeCmd = `google-chrome --headless --disable-gpu --enable-logging --v=1 --disable-web-security --disable-features=VizDisplayCompositor --run-all-compositor-stages-before-draw --virtual-time-budget=10000 --evaluate-on-load='(function(){${testScript}})()' http://localhost:5501/ 2>&1`;

    console.log('Exécution du test Chrome...');
    const result = execSync(chromeCmd, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      timeout: 15000
    });

    console.log('\n--- RÉSULTATS DU TEST CHROME ---');
    console.log(result);

  } catch (error) {
    console.log('❌ Erreur lors du test Chrome:', error.message);
    if (error.stdout) {
      console.log('\n--- STDOUT ---');
      console.log(error.stdout);
    }
    if (error.stderr) {
      console.log('\n--- STDERR ---');
      console.log(error.stderr);
    }
  }
}

// Test direct avec wget/curl pour voir les en-têtes
function testDirectAccess() {
  console.log('\n=== TEST D\'ACCÈS DIRECT ===');

  try {
    // Test avec une requête GET complète
    const result = execSync('curl -s -v http://localhost:5501/ 2>&1 | head -20', { encoding: 'utf8' });
    console.log('Headers de la réponse:');
    console.log(result);
  } catch (error) {
    console.log('❌ Erreur curl:', error.message);
  }
}

// Vérifier les fichiers JS générés dans le dossier build
function checkBuildFiles() {
  console.log('\n=== VÉRIFICATION DES FICHIERS BUILD ===');

  try {
    // Chercher les dossiers build/dist
    const buildDirs = [
      '/home/gouroubleu/WS/json-editor/app/dist',
      '/home/gouroubleu/WS/json-editor/app/build',
      '/home/gouroubleu/WS/json-editor/app/.vite',
      '/home/gouroubleu/WS/json-editor/app/node_modules/.vite'
    ];

    buildDirs.forEach(dir => {
      try {
        const result = execSync(`ls -la "${dir}" 2>/dev/null || echo "Dossier inexistant: ${dir}"`, { encoding: 'utf8' });
        console.log(`\n--- ${dir} ---`);
        console.log(result);
      } catch (error) {
        console.log(`Dossier ${dir} non accessible`);
      }
    });

  } catch (error) {
    console.log('❌ Erreur lors de la vérification des builds:', error.message);
  }
}

// Exécuter tous les tests
testDirectAccess();
checkBuildFiles();
testWithChrome();

console.log('\n=== ANALYSE TERMINÉE ===');