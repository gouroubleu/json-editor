// Test manuel de generateDefaultValue pour comprendre le problème

const placeSchema = {
  "type": "object",
  "description": "",
  "properties": {
    "nom": {
      "type": "string",
      "description": ""
    },
    "test": {
      "type": "array",
      "description": "",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": ""
          }
        },
        "required": []
      }
    }
  }
};

// Simuler generateDefaultValue
function generateDefaultValue(schema) {
  console.log('📊 generateDefaultValue - ENTRÉE type:', typeof schema);
  console.log('📊 generateDefaultValue - SCHEMA TYPE:', schema?.type);
  console.log('📊 generateDefaultValue - HAS PROPERTIES:', !!schema?.properties);

  if (!schema || typeof schema !== 'object') {
    console.log('📊 generateDefaultValue - RETOUR null (pas de schéma)');
    return null;
  }

  // Si une valeur par défaut est définie dans le schéma, l'utiliser
  if (schema.hasOwnProperty('default')) {
    return schema.default;
  }

  // Si un enum est défini, utiliser la première valeur
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  // Générer selon le type
  switch (schema.type) {
    case 'string':
      console.log('📊 STRING CASE');
      return '';

    case 'number':
    case 'integer':
      console.log('📊 NUMBER CASE');
      return schema.minimum !== undefined ? schema.minimum : 0;

    case 'boolean':
      console.log('📊 BOOLEAN CASE');
      return false;

    case 'array':
      console.log('📊 ARRAY CASE');
      if (schema.items) {
        return [generateDefaultValue(schema.items)];
      }
      return [];

    case 'object':
      console.log('📊 OBJECT CASE - DÉBUT');
      const defaultObject = {};
      console.log('📊 OBJECT - Propriétés disponibles:', !!schema.properties);

      if (schema.properties && typeof schema.properties === 'object') {
        console.log('📊 OBJECT - Entrée dans la boucle');
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          console.log('📊 OBJECT - Génération propriété:', propName);
          defaultObject[propName] = generateDefaultValue(propSchema);
          console.log('📊 OBJECT - Propriété générée:', propName, '=', defaultObject[propName]);
        }
      } else {
        console.log('📊 OBJECT - PAS de propriétés ou type incorrect');
      }

      console.log('📊 OBJECT - OBJET FINAL:', defaultObject);
      console.log('📊 OBJECT - KEYS FINAL:', Object.keys(defaultObject));
      return defaultObject;

    case null:
    case undefined:
      console.log('📊 NULL/UNDEFINED CASE');
      if (schema.properties) {
        return generateDefaultValue({ ...schema, type: 'object' });
      }
      if (schema.items) {
        return generateDefaultValue({ ...schema, type: 'array' });
      }
      return null;

    default:
      console.log('📊 generateDefaultValue - TYPE NON RECONNU:', schema.type);
      return null;
  }
}

console.log('🧪 TEST MANUEL generateDefaultValue');
console.log('Schema place:', JSON.stringify(placeSchema, null, 2));
console.log('\n🔍 EXÉCUTION:');

const result = generateDefaultValue(placeSchema);

console.log('\n🎯 RÉSULTAT FINAL:');
console.log('Type:', typeof result);
console.log('Valeur:', result);
console.log('JSON:', JSON.stringify(result));