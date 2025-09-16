// Script pour migrer vers le format 2 chiffres (MAJOR.MINOR)
const fs = require('fs');
const path = require('path');

console.log('🔄 Migration vers le format de versioning 2 chiffres');
console.log('='.repeat(55));

const schemasDir = path.join(process.cwd(), 'serverMedias', 'schemas');
const versionsDir = path.join(schemasDir, 'versions');

// Fonction pour convertir version 3 chiffres vers 2 chiffres
function convertVersionTo2Digits(version) {
    if (!version) return '1.0';
    
    const parts = version.split('.').map(n => parseFloat(n));
    if (parts.length === 1) return `${parts[0]}.0`;
    if (parts.length === 2) return version; // Déjà bon format
    
    // Si c'est 3 chiffres (x.y.z), convertir en x.y
    const [major, minor, patch] = parts;
    let newMinor = minor;
    
    // Si il y a un patch, l'ajouter comme décimale au minor
    if (patch && patch > 0) {
        newMinor = minor + (patch * 0.1);
        // Arrondir pour éviter les problèmes de précision
        newMinor = Math.round(newMinor * 10) / 10;
    }
    
    return `${major}.${newMinor}`;
}

// Fonction pour migrer une version dans le dossier versions
function migrateVersionFile(schemaName, versionFile) {
    const versionFilePath = path.join(versionsDir, schemaName, versionFile);
    
    try {
        const content = fs.readFileSync(versionFilePath, 'utf8');
        const versionData = JSON.parse(content);
        
        // Convertir la version
        const oldVersion = versionData.version;
        const newVersion = convertVersionTo2Digits(oldVersion);
        
        if (oldVersion !== newVersion) {
            console.log(`   📝 Version backup: ${oldVersion} → ${newVersion}`);
            
            // Mettre à jour les versions
            versionData.version = newVersion;
            versionData.schema.version = newVersion;
            versionData.versionInfo.version = newVersion;
            
            // Supprimer le type 'patch' s'il existe
            if (versionData.versionInfo.changeType === 'patch') {
                versionData.versionInfo.changeType = 'minor';
            }
            
            // Renommer le fichier
            const oldFileName = versionFile;
            const newFileName = `v${newVersion}.json`;
            
            if (oldFileName !== newFileName) {
                const newVersionFilePath = path.join(versionsDir, schemaName, newFileName);
                
                // Écrire le nouveau fichier
                fs.writeFileSync(newVersionFilePath, JSON.stringify(versionData, null, 2), 'utf8');
                
                // Supprimer l'ancien si différent
                if (oldFileName !== newFileName) {
                    fs.unlinkSync(versionFilePath);
                    console.log(`   📄 Fichier renommé: ${oldFileName} → ${newFileName}`);
                }
            } else {
                // Juste mettre à jour le contenu
                fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2), 'utf8');
            }
        }
        
    } catch (error) {
        console.error(`   ❌ Erreur migration version ${versionFile}: ${error.message}`);
    }
}

async function migrateAllSchemas() {
    try {
        // Vérifier que le dossier existe
        if (!fs.existsSync(schemasDir)) {
            console.log('❌ Dossier schemas introuvable');
            return;
        }
        
        // Lire tous les fichiers JSON principaux
        const files = fs.readdirSync(schemasDir)
            .filter(file => file.endsWith('.json'))
            .filter(file => !file.startsWith('.'));
        
        console.log(`📄 ${files.length} schéma(s) trouvé(s): ${files.join(', ')}`);
        
        let migratedCount = 0;
        let alreadyCorrectCount = 0;
        
        for (const file of files) {
            const filePath = path.join(schemasDir, file);
            const schemaName = path.basename(file, '.json');
            
            try {
                console.log(`\n🔍 Migration de '${schemaName}':`);
                
                // Lire le schéma principal
                const content = fs.readFileSync(filePath, 'utf8');
                const schemaData = JSON.parse(content);
                
                // Vérifier s'il faut migrer
                const oldVersion = schemaData.version;
                const newVersion = convertVersionTo2Digits(oldVersion);
                
                if (oldVersion !== newVersion || (schemaData.versionInfo?.changeType === 'patch')) {
                    console.log(`   📝 Version principale: ${oldVersion} → ${newVersion}`);
                    
                    // Mettre à jour le schéma principal
                    schemaData.version = newVersion;
                    if (schemaData.schema) schemaData.schema.version = newVersion;
                    if (schemaData.versionInfo) {
                        schemaData.versionInfo.version = newVersion;
                        if (schemaData.versionInfo.changeType === 'patch') {
                            schemaData.versionInfo.changeType = 'minor';
                            console.log(`   🔧 Type changé: patch → minor`);
                        }
                    }
                    
                    // Sauvegarder le schéma principal
                    fs.writeFileSync(filePath, JSON.stringify(schemaData, null, 2), 'utf8');
                    
                    migratedCount++;
                } else {
                    console.log(`   ✅ Déjà au bon format (v${oldVersion})`);
                    alreadyCorrectCount++;
                }
                
                // Migrer les versions dans le dossier versions/
                const schemaVersionDir = path.join(versionsDir, schemaName);
                if (fs.existsSync(schemaVersionDir)) {
                    const versionFiles = fs.readdirSync(schemaVersionDir)
                        .filter(file => file.endsWith('.json'));
                    
                    console.log(`   📁 ${versionFiles.length} version(s) backup à migrer`);
                    
                    versionFiles.forEach(versionFile => {
                        migrateVersionFile(schemaName, versionFile);
                    });
                }
                
            } catch (error) {
                console.error(`   ❌ Erreur migration '${schemaName}': ${error.message}`);
            }
        }
        
        console.log('\n📊 Résumé de la migration vers 2 chiffres:');
        console.log(`   ✅ Schémas migrés: ${migratedCount}`);
        console.log(`   ⏭️  Déjà corrects: ${alreadyCorrectCount}`);
        console.log(`   📁 Total de schémas: ${files.length}`);
        
        console.log('\n🎯 Nouveau système de versioning:');
        console.log('   🔴 MAJOR (x.0): Changements incompatibles BDD');
        console.log('   🟢 MINOR (x.y): Changements compatibles BDD (+0.1)');
        console.log('\n💡 Exemples de changements:');
        console.log('   🟢 string → number: MINOR (compatible)');
        console.log('   🟢 Ajout propriété: MINOR (compatible)');  
        console.log('   🔴 Suppression propriété: MAJOR (incompatible)');
        console.log('   🔴 boolean → number: MAJOR (incompatible)');
        
        if (migratedCount > 0) {
            console.log('\n🎉 Migration vers 2 chiffres terminée !');
        } else {
            console.log('\n✨ Tous les schémas sont déjà au bon format !');
        }
        
    } catch (error) {
        console.error(`❌ Erreur générale: ${error.message}`);
    }
}

// Exécuter la migration
migrateAllSchemas();