// Test de la fonction generateDefaultValue avec le schéma adresse

const generateDefaultValue = (schema) => {
  if (!schema || typeof schema !== 'object') {
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
      return '';

    case 'number':
    case 'integer':
      // Si une valeur minimum est définie, l'utiliser, sinon 0
      return schema.minimum !== undefined ? schema.minimum : 0;

    case 'boolean':
      return false;

    case 'array':
      // Retourner un tableau vide par défaut
      return [];

    case 'object':
      // Générer un objet avec toutes les propriétés par défaut
      const defaultObject = {};

      if (schema.properties && typeof schema.properties === 'object') {
        // Générer les valeurs pour toutes les propriétés définies
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          defaultObject[propName] = generateDefaultValue(propSchema);
        }
      }

      return defaultObject;

    case null:
    case undefined:
      // Si le type n'est pas défini, essayer de déduire à partir des propriétés
      if (schema.properties) {
        return generateDefaultValue({ ...schema, type: 'object' });
      }
      if (schema.items) {
        return generateDefaultValue({ ...schema, type: 'array' });
      }
      return null;

    default:
      // Type non reconnu
      return null;
  }
};

// Schéma adresse du test-user
const adresseSchema = {
  "type": "object",
  "properties": {
    "adresse": {
      "type": "string",
      "description": ""
    },
    "cp": {
      "type": "string",
      "description": ""
    },
    "ville": {
      "type": "string",
      "description": ""
    },
    "place": {
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
    }
  },
  "required": []
};

console.log('Testing generateDefaultValue with adresse schema:');
console.log('Schema:', JSON.stringify(adresseSchema, null, 2));

const result = generateDefaultValue(adresseSchema);
console.log('Result:', JSON.stringify(result, null, 2));
console.log('Type of result:', typeof result);
console.log('Is null?', result === null);