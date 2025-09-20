const fs = require('fs');
const path = require('path');

// Vérifications des corrections appliquées
function verifierCorrections() {
  console.log('🔍 VÉRIFICATION DES CORRECTIONS APPLIQUÉES');
  console.log('=========================================\n');

  const corrections = [
    {
      name: "Contexte Entity Creation - Ajout gestion erreurs UI",
      file: "/home/gouroubleu/WS/json-editor/app/src/routes/bdd/context/entity-creation-context.tsx",
      checks: [
        "fieldErrors: Record<string, string>",
        "hasValidationErrors: boolean",
        "setFieldError: (fieldPath: string, error: string | null) => void",
        "clearAllFieldErrors: () => void",
        "store.ui.hasValidationErrors"
      ]
    },
    {
      name: "ContextualHorizontalEntityViewer - Logique bouton désactivé",
      file: "/home/gouroubleu/WS/json-editor/app/src/routes/bdd/[schema]/components/ContextualHorizontalEntityViewer.tsx",
      checks: [
        "disabled={store.ui.loading || store.ui.saving || store.ui.hasValidationErrors}",
        "store.ui.hasValidationErrors ? '⚠️ Erreurs à corriger'",
        "title={store.ui.hasValidationErrors ? `Erreurs de validation présentes:"
      ]
    },
    {
      name: "ContextualEntityColumn - Remontée erreurs globales",
      file: "/home/gouroubleu/WS/json-editor/app/src/routes/bdd/[schema]/components/ContextualEntityColumn.tsx",
      checks: [
        "actions.setFieldError(fieldPath, validation.errors[0])",
        "actions.setFieldError(fieldPath, null)",
        "const fieldPath = [...column.path, key].join('.');"
      ]
    },
    {
      name: "Page Edit - Validation temps réel",
      file: "/home/gouroubleu/WS/json-editor/app/src/routes/bdd/[schema]/[entityId]/edit/index.tsx",
      checks: [
        "validationErrors: {} as Record<string, string>",
        "hasValidationErrors: false",
        "const validation = validateEntityData(editableEntity.data",
        "hasValidationErrors={uiState.hasValidationErrors}",
        "validationErrors={uiState.validationErrors}"
      ]
    },
    {
      name: "HorizontalEntityViewer - Props validation",
      file: "/home/gouroubleu/WS/json-editor/app/src/routes/bdd/[schema]/components/HorizontalEntityViewer.tsx",
      checks: [
        "hasValidationErrors?: boolean",
        "validationErrors?: Record<string, string>",
        "disabled={props.loading || props.hasValidationErrors}",
        "props.hasValidationErrors ? '⚠️ Erreurs à corriger'"
      ]
    }
  ];

  let totalChecks = 0;
  let passedChecks = 0;
  const results = [];

  corrections.forEach(correction => {
    console.log(`📁 ${correction.name}`);
    console.log(`   Fichier: ${correction.file}`);

    if (!fs.existsSync(correction.file)) {
      console.log(`   ❌ FICHIER NON TROUVÉ`);
      results.push({ ...correction, status: 'FICHIER_NON_TROUVÉ', passed: 0, total: correction.checks.length });
      totalChecks += correction.checks.length;
      return;
    }

    const content = fs.readFileSync(correction.file, 'utf8');
    let localPassed = 0;

    correction.checks.forEach(check => {
      totalChecks++;
      if (content.includes(check)) {
        localPassed++;
        passedChecks++;
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check}`);
      }
    });

    const status = localPassed === correction.checks.length ? 'COMPLET' :
                   localPassed > 0 ? 'PARTIEL' : 'ÉCHEC';

    results.push({ ...correction, status, passed: localPassed, total: correction.checks.length });
    console.log(`   📊 Statut: ${status} (${localPassed}/${correction.checks.length})\n`);
  });

  // Rapport final
  console.log('📊 RAPPORT FINAL');
  console.log('==============');
  console.log(`Vérifications totales: ${passedChecks}/${totalChecks} (${Math.round(passedChecks/totalChecks*100)}%)`);

  results.forEach(result => {
    const percentage = Math.round(result.passed/result.total*100);
    console.log(`- ${result.name}: ${result.status} ${percentage}%`);
  });

  const allComplete = results.every(r => r.status === 'COMPLET');
  console.log(`\n🎯 Statut global: ${allComplete ? '✅ TOUTES CORRECTIONS APPLIQUÉES' : '⚠️ CORRECTIONS INCOMPLÈTES'}`);

  return { allComplete, passedChecks, totalChecks, results };
}

// Vérifier les dépendances nécessaires
function verifierDependances() {
  console.log('\n🔧 VÉRIFICATION DES DÉPENDANCES');
  console.log('==============================');

  const packageJsonPath = '/home/gouroubleu/WS/json-editor/app/package.json';
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    console.log('📦 Dépendances importantes:');
    ['@builder.io/qwik', '@builder.io/qwik-city', 'puppeteer'].forEach(dep => {
      if (dependencies[dep]) {
        console.log(`   ✅ ${dep}: ${dependencies[dep]}`);
      } else {
        console.log(`   ❌ ${dep}: NON INSTALLÉ`);
      }
    });
  }
}

// Exécution
if (require.main === module) {
  const results = verifierCorrections();
  verifierDependances();

  console.log('\n🏁 CONCLUSION');
  console.log('============');

  if (results.allComplete) {
    console.log('✅ Toutes les corrections ont été appliquées avec succès !');
    console.log('   Le système de validation des boutons devrait fonctionner.');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Démarrer le serveur: npm run dev');
    console.log('   2. Tester manuellement selon test-manuel-validation-boutons.md');
    console.log('   3. Vérifier le comportement dans le navigateur');
  } else {
    console.log('⚠️ Certaines corrections semblent manquantes ou incomplètes.');
    console.log('   Vérifiez les fichiers mentionnés ci-dessus.');
  }

  process.exit(results.allComplete ? 0 : 1);
}

module.exports = { verifierCorrections, verifierDependances };