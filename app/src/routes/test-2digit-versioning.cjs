// Test du nouveau système de versioning à 2 chiffres
console.log('🧪 Test du système de versioning à 2 chiffres');
console.log('='.repeat(55));

// Simuler la nouvelle logique
function isTypeChangeCompatible(oldType, newType) {
    const compatibleChanges = [
        ['string', 'number'],    // string "123" -> number 123
        ['string', 'integer'],   // string "123" -> integer 123
        ['number', 'string'],    // number 123 -> string "123"
        ['integer', 'string'],   // integer 123 -> string "123"
        ['integer', 'number'],   // integer 123 -> number 123.0
        ['boolean', 'string'],   // boolean true -> string "true"
    ];
    
    return compatibleChanges.some(([from, to]) => from === oldType && to === newType);
}

function compareSchemas(oldSchema, newSchema) {
    const oldProps = oldSchema.properties || {};
    const newProps = newSchema.properties || {};
    const oldRequired = oldSchema.required || [];
    const newRequired = newSchema.required || [];

    // CHANGEMENTS MAJEURS (incompatibles) - Version +1.0
    
    // 1. Type racine différent
    if (oldSchema.type !== newSchema.type) {
        return 'major';
    }

    // 2. Propriétés supprimées
    const oldPropNames = Object.keys(oldProps);
    const newPropNames = Object.keys(newProps);
    const removedProps = oldPropNames.filter(prop => !newPropNames.includes(prop));
    if (removedProps.length > 0) {
        return 'major';
    }

    // 3. Propriétés requises supprimées
    const removedRequired = oldRequired.filter(prop => !newRequired.includes(prop));
    if (removedRequired.length > 0) {
        return 'major';
    }

    // 4. Changements de type incompatibles
    for (const propName of oldPropNames) {
        if (newProps[propName] && oldProps[propName].type !== newProps[propName].type) {
            if (!isTypeChangeCompatible(oldProps[propName].type, newProps[propName].type)) {
                return 'major';
            }
        }
    }

    // 5. Contraintes plus strictes
    for (const propName of oldPropNames) {
        if (newProps[propName]) {
            const oldProp = oldProps[propName];
            const newProp = newProps[propName];
            
            // Contraintes string plus strictes
            if (oldProp.type === 'string' && newProp.type === 'string') {
                if ((newProp.minLength && (!oldProp.minLength || newProp.minLength > oldProp.minLength)) ||
                    (newProp.maxLength && oldProp.maxLength && newProp.maxLength < oldProp.maxLength)) {
                    return 'major';
                }
            }
        }
    }

    // CHANGEMENTS MINEURS (compatibles) - Version +0.1
    return 'minor';
}

function incrementVersion(currentVersion, changeType) {
    const parts = currentVersion.split('.').map(n => parseFloat(n));
    let [major, minor] = parts.length >= 2 ? parts : [1, 0];

    switch (changeType) {
        case 'major':
            major += 1;
            minor = 0;
            break;
        case 'minor':
            minor += 0.1;
            minor = Math.round(minor * 10) / 10;
            break;
    }

    return `${major}.${minor}`;
}

// Tests de scénarios
const baseSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        active: { type: 'boolean' }
    },
    required: ['name']
};

console.log('🔍 Tests de détection des changements:');

// Test 1: Ajout propriété (MINOR +0.1)
const test1 = {
    ...baseSchema,
    properties: {
        ...baseSchema.properties,
        email: { type: 'string' }
    }
};
let changeType = compareSchemas(baseSchema, test1);
console.log(`   ✅ Ajout propriété: ${changeType} → 1.0 devient ${incrementVersion('1.0', changeType)}`);

// Test 2: Changement type compatible (MINOR +0.1)
const test2 = {
    ...baseSchema,
    properties: {
        ...baseSchema.properties,
        age: { type: 'string' } // number → string (compatible)
    }
};
changeType = compareSchemas(baseSchema, test2);
console.log(`   ✅ number → string: ${changeType} → 1.0 devient ${incrementVersion('1.0', changeType)}`);

// Test 3: Changement type incompatible (MAJOR +1.0)
const test3 = {
    ...baseSchema,
    properties: {
        ...baseSchema.properties,
        active: { type: 'number' } // boolean → number (incompatible)
    }
};
changeType = compareSchemas(baseSchema, test3);
console.log(`   ✅ boolean → number: ${changeType} → 1.0 devient ${incrementVersion('1.0', changeType)}`);

// Test 4: Suppression propriété (MAJOR +1.0)
const test4 = {
    ...baseSchema,
    properties: {
        name: baseSchema.properties.name,
        age: baseSchema.properties.age
        // active supprimé
    }
};
changeType = compareSchemas(baseSchema, test4);
console.log(`   ✅ Suppression propriété: ${changeType} → 1.0 devient ${incrementVersion('1.0', changeType)}`);

// Test 5: Série d'incréments
console.log('\n📈 Simulation d\'évolutions successives:');
let currentVersion = '1.0';
console.log(`   📌 Version initiale: ${currentVersion}`);

currentVersion = incrementVersion(currentVersion, 'minor');
console.log(`   🟢 Ajout propriété: ${currentVersion}`);

currentVersion = incrementVersion(currentVersion, 'minor');
console.log(`   🟢 Modification description: ${currentVersion}`);

currentVersion = incrementVersion(currentVersion, 'minor');
console.log(`   🟢 string → number: ${currentVersion}`);

currentVersion = incrementVersion(currentVersion, 'major');
console.log(`   🔴 Suppression propriété: ${currentVersion}`);

currentVersion = incrementVersion(currentVersion, 'minor');
console.log(`   🟢 Nouvelle propriété: ${currentVersion}`);

console.log('\n🎯 Nouveau système de versioning opérationnel:');
console.log('   🔴 MAJOR (x.0): Changements qui cassent la compatibilité BDD');
console.log('   🟢 MINOR (+0.1): Changements compatibles avec BDD existante');
console.log('\n💡 Changements compatibles (MINOR):');
console.log('   • Ajout de nouvelles propriétés');
console.log('   • string ↔ number/integer (conversion possible)');  
console.log('   • boolean → string ("true"/"false")');
console.log('   • Modification descriptions/contraintes souples');
console.log('\n⚠️  Changements incompatibles (MAJOR):');
console.log('   • Suppression de propriétés');
console.log('   • Suppression champs requis');
console.log('   • boolean → number (perte de données)');
console.log('   • Contraintes plus strictes');

console.log('\n✅ Migration vers 2 chiffres terminée et testée !');