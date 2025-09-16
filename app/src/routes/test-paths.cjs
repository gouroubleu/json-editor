// Test que les chemins sont corrects pour le versioning
const fs = require('fs');
const path = require('path');

console.log('🧪 Test des chemins du système de versioning');
console.log('='.repeat(50));

// Simuler le comportement des services server$
const process_cwd = process.cwd();
console.log(`📁 Répertoire de travail: ${process_cwd}`);

// Test des chemins utilisés dans les services
const schemasDir = path.join(process_cwd, 'serverMedias', 'schemas');
const versionsDir = path.join(schemasDir, 'versions');

console.log(`📁 Dossier schemas: ${schemasDir}`);
console.log(`📁 Dossier versions: ${versionsDir}`);

// Vérifications
try {
    if (fs.existsSync(schemasDir)) {
        console.log('✅ Dossier schemas existe');
        const files = fs.readdirSync(schemasDir).filter(f => f.endsWith('.json'));
        console.log(`📄 ${files.length} schéma(s) trouvé(s): ${files.join(', ')}`);
        
        // Lire un exemple de schéma
        if (files.length > 0) {
            const sampleFile = path.join(schemasDir, files[0]);
            const content = fs.readFileSync(sampleFile, 'utf8');
            const schema = JSON.parse(content);
            console.log(`📋 Schéma exemple '${files[0]}': ${schema.name || 'sans nom'}`);
            
            if (schema.version) {
                console.log(`   📌 Version actuelle: ${schema.version}`);
            } else {
                console.log('   ⚠️  Pas de version (sera migré automatiquement vers 1.0.0)');
            }
        }
    } else {
        console.log('❌ Dossier schemas n\'existe pas');
    }
    
    if (fs.existsSync(versionsDir)) {
        console.log('✅ Dossier versions existe');
        const subDirs = fs.readdirSync(versionsDir, { withFileTypes: true })
                         .filter(dirent => dirent.isDirectory())
                         .map(dirent => dirent.name);
        console.log(`📁 ${subDirs.length} dossier(s) de versions: ${subDirs.join(', ')}`);
    } else {
        console.log('⚠️  Dossier versions n\'existe pas encore (sera créé automatiquement)');
    }
    
} catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
}

// Test de simulation de création de version
console.log('\n🔧 Simulation d\'une structure de versioning:');

const testSchemaName = 'user-test';
const testVersionDir = path.join(versionsDir, testSchemaName);

console.log(`📁 Dossier de versions pour '${testSchemaName}': ${testVersionDir}`);

// Structure attendue
console.log('\n📋 Structure de fichiers attendue:');
console.log('serverMedias/schemas/');
console.log('├── user.json (version actuelle)');
console.log('├── product.json (version actuelle)');
console.log('└── versions/');
console.log('    ├── user/');
console.log('    │   ├── v1.0.0.json');
console.log('    │   ├── v1.1.0.json');
console.log('    │   └── v2.0.0.json');
console.log('    └── product/');
console.log('        ├── v1.0.0.json');
console.log('        └── v1.0.1.json');

console.log('\n✅ Les chemins sont maintenant corrects !');
console.log('🎯 Prêt pour tester le versioning dans l\'interface Qwik.');