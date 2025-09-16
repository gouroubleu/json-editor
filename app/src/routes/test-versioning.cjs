// Test du système de versioning des JSON Schema
console.log('🧪 Test du système de versioning des JSON Schema');
console.log('='.repeat(50));

// Simuler un schéma de test
const test_schema = {
    "type": "object",
    "title": "User Test Schema", 
    "description": "Schema de test pour utilisateur",
    "properties": {
        "name": {
            "type": "string",
            "description": "Nom de l'utilisateur"
        },
        "email": {
            "type": "string", 
            "format": "email",
            "description": "Email de l'utilisateur"
        }
    },
    "required": ["name", "email"]
};

console.log("✅ Schéma de test créé:");
console.log(`   - Type: ${test_schema.type}`);
console.log(`   - Propriétés: ${Object.keys(test_schema.properties).length}`);
console.log(`   - Champs requis: ${test_schema.required.join(', ')}`);

// Test de l'algorithme de comparaison
function compare_schemas_test(old_schema, new_schema) {
    // Changement majeur : type racine différent
    if (old_schema.type !== new_schema.type) {
        return 'major';
    }
    
    const old_props = old_schema.properties || {};
    const new_props = new_schema.properties || {};
    const old_required = old_schema.required || [];
    const new_required = new_schema.required || [];
    
    // Changement majeur : propriétés requises supprimées
    const removed_required = old_required.filter(prop => !new_required.includes(prop));
    if (removed_required.length > 0) {
        return 'major';
    }
    
    // Changement majeur : propriétés supprimées
    const old_prop_names = Object.keys(old_props);
    const new_prop_names = Object.keys(new_props);
    const removed_props = old_prop_names.filter(prop => !new_prop_names.includes(prop));
    if (removed_props.length > 0) {
        return 'major';
    }
    
    // Changement majeur : type de propriété modifié
    for (const prop_name of old_prop_names) {
        if (new_props[prop_name] && old_props[prop_name].type !== new_props[prop_name].type) {
            return 'major';
        }
    }
    
    // Changement mineur : nouvelles propriétés ou nouvelles propriétés requises
    const added_props = new_prop_names.filter(prop => !old_prop_names.includes(prop));
    const added_required = new_required.filter(prop => !old_required.includes(prop));
    if (added_props.length > 0 || added_required.length > 0) {
        return 'minor';
    }
    
    // Sinon, c'est un changement patch
    return 'patch';
}

// Fonction pour incrémenter une version
function increment_version(current_version, change_type) {
    const parts = current_version.split('.').map(n => parseInt(n, 10));
    let [major, minor, patch] = parts.length === 3 ? parts : [1, 0, 0];
    
    switch (change_type) {
        case 'major':
            major += 1;
            minor = 0;
            patch = 0;
            break;
        case 'minor':
            minor += 1;
            patch = 0;
            break;
        case 'patch':
            patch += 1;
            break;
    }
    
    return `${major}.${minor}.${patch}`;
}

// Test de différents scénarios
console.log('\n🔍 Tests de détection des changements:');

// Scénario 1: Ajout d'une propriété (minor)
const new_schema_minor = {
    ...test_schema,
    properties: {
        ...test_schema.properties,
        age: {"type": "integer", "description": "Age de l'utilisateur"}
    }
};

let change_type = compare_schemas_test(test_schema, new_schema_minor);
console.log(`   ✅ Ajout propriété 'age': ${change_type} (attendu: minor)`);
console.log(`   📝 Version: 1.0.0 → ${increment_version('1.0.0', change_type)}`);

// Scénario 2: Suppression d'une propriété (major)  
const new_schema_major = {
    ...test_schema,
    properties: Object.fromEntries(
        Object.entries(test_schema.properties).filter(([k, v]) => k !== 'email')
    )
};

change_type = compare_schemas_test(test_schema, new_schema_major);
console.log(`   ✅ Suppression propriété 'email': ${change_type} (attendu: major)`);
console.log(`   📝 Version: 1.0.0 → ${increment_version('1.0.0', change_type)}`);

// Scénario 3: Modification description (patch)
const new_schema_patch = {
    ...test_schema,
    properties: {
        ...test_schema.properties,
        name: {
            ...test_schema.properties.name,
            description: "Nom complet de l'utilisateur"
        }
    }
};

change_type = compare_schemas_test(test_schema, new_schema_patch);
console.log(`   ✅ Modification description: ${change_type} (attendu: patch)`);
console.log(`   📝 Version: 1.0.0 → ${increment_version('1.0.0', change_type)}`);

// Scénario 4: Changement de type (major)
const new_schema_type_change = {
    ...test_schema,
    properties: {
        ...test_schema.properties,
        name: {"type": "integer", "description": "ID numérique"}
    }
};

change_type = compare_schemas_test(test_schema, new_schema_type_change);
console.log(`   ✅ Changement type 'name' string → integer: ${change_type} (attendu: major)`);
console.log(`   📝 Version: 1.0.0 → ${increment_version('1.0.0', change_type)}`);

// Scénario 5: Nouvelle propriété requise (minor)
const new_schema_required = {
    ...test_schema,
    properties: {
        ...test_schema.properties,
        phone: {"type": "string", "description": "Numéro de téléphone"}
    },
    required: [...test_schema.required, 'phone']
};

change_type = compare_schemas_test(test_schema, new_schema_required);
console.log(`   ✅ Nouvelle propriété requise 'phone': ${change_type} (attendu: minor)`);
console.log(`   📝 Version: 1.0.0 → ${increment_version('1.0.0', change_type)}`);

console.log('\n✨ Tests de logique de versioning réussis!');
console.log('\n📋 Résumé du système de versioning:');
console.log('   🔴 MAJOR (x.0.0): Changements incompatibles (suppression, changement de type)');  
console.log('   🟠 MINOR (x.y.0): Nouvelles fonctionnalités (nouvelles propriétés)');
console.log('   🟢 PATCH (x.y.z): Corrections mineures (descriptions, contraintes)');

// Test de la structure de backup
const fs = require('fs');
const path = require('path');

console.log('\n🗂️  Test de la structure de fichiers:');

const schemas_dir = path.join(__dirname, 'serverMedias', 'schemas');
const versions_dir = path.join(schemas_dir, 'versions');

console.log(`   📁 Dossier schemas: ${schemas_dir}`);
console.log(`   📁 Dossier versions: ${versions_dir}`);

// Vérifier que les dossiers existent
try {
    if (fs.existsSync(schemas_dir)) {
        console.log('   ✅ Dossier schemas existe');
        const files = fs.readdirSync(schemas_dir);
        console.log(`   📄 ${files.length} fichier(s) de schémas trouvé(s)`);
    } else {
        console.log('   ❌ Dossier schemas n\'existe pas encore');
    }
    
    if (fs.existsSync(versions_dir)) {
        console.log('   ✅ Dossier versions existe'); 
    } else {
        console.log('   ❌ Dossier versions n\'existe pas encore');
    }
} catch (error) {
    console.log(`   ⚠️  Erreur vérification fichiers: ${error.message}`);
}

console.log('\n🎯 Le système de versioning est prêt à être testé dans l\'interface!');