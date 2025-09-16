// Script pour migrer les schémas existants vers le format versionné
const fs = require('fs');
const path = require('path');

console.log('🔄 Migration des schémas existants vers le format versionné');
console.log('='.repeat(60));

const schemasDir = path.join(process.cwd(), 'serverMedias', 'schemas');
const versionsDir = path.join(schemasDir, 'versions');

// Fonction pour créer un schéma versionné
function createVersionedSchema(originalSchema, schemaName) {
    const now = new Date().toISOString();
    
    return {
        id: originalSchema.id || `${schemaName}-${Date.now()}`,
        name: originalSchema.name || schemaName,
        version: '1.0.0',
        schema: {
            type: originalSchema.type || 'object',
            title: originalSchema.title,
            description: originalSchema.description,
            properties: originalSchema.properties,
            required: originalSchema.required,
            items: originalSchema.items,
            additionalProperties: originalSchema.additionalProperties,
            version: '1.0.0'
        },
        versionInfo: {
            version: '1.0.0',
            createdAt: originalSchema.createdAt || now,
            changeType: 'major',
            changeDescription: 'Version initiale (migration automatique)',
            previousVersion: undefined
        },
        createdAt: originalSchema.createdAt || now,
        updatedAt: now
    };
}

async function migrateSchemas() {
    try {
        // Vérifier que le dossier existe
        if (!fs.existsSync(schemasDir)) {
            console.log('❌ Dossier schemas introuvable');
            return;
        }
        
        // Créer le dossier versions s'il n'existe pas
        if (!fs.existsSync(versionsDir)) {
            fs.mkdirSync(versionsDir, { recursive: true });
            console.log('📁 Dossier versions créé');
        }
        
        // Lire tous les fichiers JSON
        const files = fs.readdirSync(schemasDir)
            .filter(file => file.endsWith('.json'))
            .filter(file => !file.startsWith('.'));
        
        console.log(`📄 ${files.length} schéma(s) trouvé(s): ${files.join(', ')}`);
        
        let migratedCount = 0;
        let alreadyVersionedCount = 0;
        
        for (const file of files) {
            const filePath = path.join(schemasDir, file);
            const schemaName = path.basename(file, '.json');
            
            try {
                // Lire le schéma existant
                const content = fs.readFileSync(filePath, 'utf8');
                const originalSchema = JSON.parse(content);
                
                console.log(`\n🔍 Traitement de '${schemaName}':`);
                
                // Vérifier si déjà versionné
                if (originalSchema.version && originalSchema.versionInfo) {
                    console.log(`   ✅ Déjà versionné (v${originalSchema.version})`);
                    alreadyVersionedCount++;
                    continue;
                }
                
                // Créer le schéma versionné
                const versionedSchema = createVersionedSchema(originalSchema, schemaName);
                
                console.log(`   📝 Migration vers v1.0.0`);
                console.log(`   📋 Titre: ${versionedSchema.schema.title || 'Non défini'}`);
                console.log(`   🏷️  Propriétés: ${versionedSchema.schema.properties ? Object.keys(versionedSchema.schema.properties).length : 0}`);
                
                // Sauvegarder le schéma migré
                fs.writeFileSync(filePath, JSON.stringify(versionedSchema, null, 2), 'utf8');
                
                // Créer le backup initial dans versions
                const schemaVersionDir = path.join(versionsDir, schemaName);
                if (!fs.existsSync(schemaVersionDir)) {
                    fs.mkdirSync(schemaVersionDir, { recursive: true });
                }
                
                const versionFilePath = path.join(schemaVersionDir, 'v1.0.0.json');
                fs.writeFileSync(versionFilePath, JSON.stringify(versionedSchema, null, 2), 'utf8');
                
                console.log(`   💾 Backup créé: versions/${schemaName}/v1.0.0.json`);
                console.log(`   ✅ Migration réussie`);
                
                migratedCount++;
                
            } catch (error) {
                console.error(`   ❌ Erreur migration '${schemaName}': ${error.message}`);
            }
        }
        
        console.log('\n📊 Résumé de la migration:');
        console.log(`   ✅ Schémas migrés: ${migratedCount}`);
        console.log(`   ⏭️  Déjà versionnés: ${alreadyVersionedCount}`);
        console.log(`   📁 Total de schémas: ${files.length}`);
        
        if (migratedCount > 0) {
            console.log('\n🎉 Migration terminée avec succès !');
            console.log('💡 Tous les schémas sont maintenant versionnés et prêts pour le système de versioning automatique.');
        } else if (alreadyVersionedCount === files.length) {
            console.log('\n✨ Tous les schémas sont déjà versionnés !');
        }
        
    } catch (error) {
        console.error(`❌ Erreur générale: ${error.message}`);
    }
}

// Exécuter la migration
migrateSchemas();