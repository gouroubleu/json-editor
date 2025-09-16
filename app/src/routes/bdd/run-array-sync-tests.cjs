const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Script de lancement pour tous les tests de synchronisation des arrays
 *
 * Ce script exécute :
 * 1. Le test simple (validation de base)
 * 2. Le test navigateur (test automatisé avec Playwright)
 *
 * Usage: node run-array-sync-tests.cjs [--simple-only] [--browser-only]
 */

const args = process.argv.slice(2);
const simpleOnly = args.includes('--simple-only');
const browserOnly = args.includes('--browser-only');

console.log('🚀 Lancement des Tests de Synchronisation des Arrays');
console.log('='.repeat(70));

async function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 ${description}...`);
    console.log(`📝 Commande: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} - SUCCÈS`);
        resolve(code);
      } else {
        console.log(`❌ ${description} - ÉCHEC (code: ${code})`);
        reject(new Error(`${description} failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`💥 Erreur lors de l'exécution de ${description}:`, error.message);
      reject(error);
    });
  });
}

async function main() {
  let testResults = {
    simple: null,
    browser: null
  };

  try {
    // Test 1: Test simple
    if (!browserOnly) {
      try {
        await runCommand('node', ['test-array-sync-simple.cjs'], 'Test Simple de Synchronisation');
        testResults.simple = 'SUCCESS';
      } catch (error) {
        testResults.simple = 'FAILED';
        if (simpleOnly) {
          throw error;
        }
      }
    }

    // Test 2: Test navigateur (seulement si Playwright est disponible)
    if (!simpleOnly) {
      try {
        // Vérifier si Playwright est installé
        try {
          require('playwright');
        } catch (playwrightError) {
          console.log('⚠️ Playwright non installé. Installation requise pour le test navigateur.');
          console.log('📦 Pour installer: npm install playwright');
          testResults.browser = 'SKIPPED';
          return;
        }

        await runCommand('node', ['test-array-sync-browser.cjs'], 'Test Navigateur de Synchronisation');
        testResults.browser = 'SUCCESS';
      } catch (error) {
        testResults.browser = 'FAILED';
        if (browserOnly) {
          throw error;
        }
      }
    }

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE:', error.message);
    process.exit(1);
  }

  // Rapport final
  console.log('\n' + '='.repeat(70));
  console.log('📊 RAPPORT FINAL DES TESTS');
  console.log('='.repeat(70));

  if (testResults.simple !== null) {
    const simpleIcon = testResults.simple === 'SUCCESS' ? '✅' : '❌';
    console.log(`${simpleIcon} Test Simple: ${testResults.simple}`);
  }

  if (testResults.browser !== null) {
    const browserIcon = testResults.browser === 'SUCCESS' ? '✅' :
                        testResults.browser === 'SKIPPED' ? '⏭️' : '❌';
    console.log(`${browserIcon} Test Navigateur: ${testResults.browser}`);
  }

  const allPassed = (testResults.simple === 'SUCCESS' || testResults.simple === null) &&
                    (testResults.browser === 'SUCCESS' || testResults.browser === 'SKIPPED' || testResults.browser === null);

  if (allPassed) {
    console.log('\n🎉 TOUS LES TESTS DISPONIBLES ONT RÉUSSI !');
    console.log('✨ La synchronisation des arrays fonctionne correctement.');
  } else {
    console.log('\n❌ CERTAINS TESTS ONT ÉCHOUÉ !');
    console.log('🔧 Des corrections sont nécessaires pour la synchronisation des arrays.');
    process.exit(1);
  }

  // Instructions pour accéder au test interactif
  console.log('\n📋 TESTS SUPPLÉMENTAIRES DISPONIBLES:');
  console.log('🌐 Test Interactif: http://localhost:5173/bo/schemaEditor/bdd/test-array-sync/');
  console.log('📝 Test Composant: Voir le fichier test-array-sync-validation.tsx');
  console.log('📸 Captures d\'écran: Dossier test-screenshots-array-sync/');
}

// Afficher l'aide si demandé
if (args.includes('--help') || args.includes('-h')) {
  console.log('🔧 AIDE - Tests de Synchronisation des Arrays');
  console.log('='.repeat(50));
  console.log('Usage: node run-array-sync-tests.cjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --simple-only    Exécuter seulement le test simple');
  console.log('  --browser-only   Exécuter seulement le test navigateur');
  console.log('  --help, -h       Afficher cette aide');
  console.log('');
  console.log('Exemples:');
  console.log('  node run-array-sync-tests.cjs                # Tous les tests');
  console.log('  node run-array-sync-tests.cjs --simple-only  # Test simple uniquement');
  console.log('  node run-array-sync-tests.cjs --browser-only # Test navigateur uniquement');
  process.exit(0);
}

// Créer le répertoire de captures si nécessaire
const screenshotDir = path.join(__dirname, 'test-screenshots-array-sync');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

main().catch(console.error);