/**
 * Script principal pour exécuter tous les tests automatisés
 * Usage: node run-tests.cjs
 */

const { spawn } = require('child_process');
const path = require('path');

class TestRunner {
  constructor() {
    this.testResults = [];
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`🏃 Exécution: ${command} ${args.join(' ')}`);
      
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Commande réussie: ${command}`);
          resolve(true);
        } else {
          console.log(`❌ Commande échouée: ${command} (code: ${code})`);
          resolve(false);
        }
      });

      child.on('error', (error) => {
        console.error(`💥 Erreur exécution: ${error.message}`);
        resolve(false);
      });
    });
  }

  async runTest(testName, scriptPath) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST: ${testName}`);
    console.log(`${'='.repeat(60)}`);
    
    const success = await this.runCommand('node', [scriptPath]);
    
    this.testResults.push({
      name: testName,
      success: success,
      script: scriptPath
    });

    return success;
  }

  generateFinalReport() {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 RAPPORT FINAL DES TESTS`);
    console.log(`${'='.repeat(80)}`);

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`📊 Résumé: ${passedTests}/${totalTests} tests réussis`);
    console.log(`✅ Réussis: ${passedTests}`);
    console.log(`❌ Échoués: ${failedTests}\n`);

    console.log(`📝 Détail des tests:`);
    this.testResults.forEach((test, index) => {
      const status = test.success ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${test.name}`);
      console.log(`     Script: ${test.script}`);
    });

    console.log(`\n${'='.repeat(80)}`);
    
    const overallSuccess = failedTests === 0;
    if (overallSuccess) {
      console.log(`🎉 RÉSULTAT GLOBAL: TOUS LES TESTS SONT RÉUSSIS !`);
    } else {
      console.log(`💥 RÉSULTAT GLOBAL: ${failedTests} TEST(S) ONT ÉCHOUÉ !`);
    }
    
    console.log(`${'='.repeat(80)}`);
    return overallSuccess;
  }

  async run() {
    console.log(`🚀 Démarrage de la suite de tests automatisés`);
    console.log(`📅 ${new Date().toLocaleString('fr-FR')}\n`);

    // Test 1: Connectivité du serveur
    const serverTest = await this.runTest(
      'Connectivité du serveur',
      'test-server-connectivity.cjs'
    );

    if (!serverTest) {
      console.log(`\n⚠️  Le serveur n'est pas accessible. Tests interrompus.`);
      console.log(`💡 Démarrez le serveur avec: npm run dev`);
      return false;
    }

    // Test 2: Test des colonnes d'array
    await this.runTest(
      'Colonnes d\'édition d\'array',
      'test-array-columns.cjs'
    );

    // Générer le rapport final
    return this.generateFinalReport();
  }
}

async function main() {
  const runner = new TestRunner();
  const success = await runner.run();
  
  process.exit(success ? 0 : 1);
}

// Gestion des interruptions
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Tests interrompus par l\'utilisateur');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Tests interrompus');
  process.exit(1);
});

main();