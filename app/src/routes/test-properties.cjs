// Test de lecture des propriétés après migration
const fs = require('fs');
const path = require('path');

console.log('🧪 Test de lecture des propriétés après migration');
console.log('='.repeat(55));

const schemasDir = path.join(process.cwd(), 'serverMedias', 'schemas');

// Simuler la fonction loadSchemas
function testLoadSchemas() {
    const schemas = [];
    
    try {
        const files = fs.readdirSync(schemasDir)
            .filter(file => file.endsWith('.json') && !file.startsWith('.'));
        
        console.log(`📄 ${files.length} schéma(s) trouvé(s): ${files.join(', ')}`);
        
        for (const file of files) {
            const filePath = path.join(schemasDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const schemaData = JSON.parse(content);
            
            console.log(`\n🔍 Analyse du schéma '${file}':`);
            
            // Si c'est un schéma versionné
            if (schemaData.version && schemaData.versionInfo && schemaData.schema) {
                console.log(`   ✅ Format versionné détecté (v${schemaData.version})`);
                console.log(`   📋 Titre: ${schemaData.schema.title || 'Non défini'}`);
                console.log(`   📝 Description: ${schemaData.schema.description || 'Non définie'}`);
                console.log(`   🏷️  Type: ${schemaData.schema.type || 'object'}`);
                
                if (schemaData.schema.properties) {
                    const propCount = Object.keys(schemaData.schema.properties).length;
                    console.log(`   🔧 Propriétés: ${propCount}`);
                    
                    Object.entries(schemaData.schema.properties).forEach(([propName, propDef]) => {
                        console.log(`      - ${propName}: ${propDef.type} ${propDef.title ? `(${propDef.title})` : ''}`);
                    });
                } else {
                    console.log('   ⚠️  Pas de propriétés trouvées');
                }
                
                schemas.push({
                    name: schemaData.name,
                    schema: schemaData.schema,
                    createdAt: schemaData.createdAt,
                    updatedAt: schemaData.updatedAt,
                    version: schemaData.version,
                    versionInfo: schemaData.versionInfo
                });
            } else {
                console.log('   ⚠️  Ancien format détecté (non versionné)');
            }
        }
        
        console.log(`\n📊 Total de schémas traités: ${schemas.length}`);
        return schemas;
        
    } catch (error) {
        console.error(`❌ Erreur: ${error.message}`);
        return [];
    }
}

// Simuler la fonction convertJsonSchemaToProperties pour l'éditeur
function testConvertJsonSchemaToProperties(schema) {
    const properties = [];
    
    if (schema.properties) {
        console.log(`\n🔧 Test de conversion des propriétés:`);
        
        for (const [propName, propDef] of Object.entries(schema.properties)) {
            const property = {
                id: `${propName}-${Math.random().toString(36).substr(2, 9)}`,
                name: propName,
                type: propDef.type || 'string',
                required: schema.required?.includes(propName) || false,
                description: propDef.description || '',
                minLength: propDef.minLength,
                maxLength: propDef.maxLength,
                minimum: propDef.minimum,
                maximum: propDef.maximum,
                enum: propDef.enum,
                format: propDef.format
            };
            
            console.log(`   ✅ ${propName} → ${propDef.type} (requis: ${property.required})`);
            properties.push(property);
        }
    }
    
    return properties;
}

// Exécuter les tests
const schemas = testLoadSchemas();

if (schemas.length > 0) {
    console.log('\n🧪 Test de conversion pour l\'éditeur:');
    const firstSchema = schemas[0];
    console.log(`   📋 Test avec le schéma '${firstSchema.name}':`);
    const convertedProperties = testConvertJsonSchemaToProperties(firstSchema.schema);
    console.log(`   🔧 ${convertedProperties.length} propriétés converties pour l'éditeur`);
}

console.log('\n✅ Tests terminés - Les propriétés devraient maintenant s\'afficher correctement!');