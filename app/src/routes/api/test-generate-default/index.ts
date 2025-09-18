import type { RequestHandler } from '@builder.io/qwik-city';
import { generateDefaultValue } from '../../bdd/services';

export const onGet: RequestHandler = async ({ json }) => {
  // Test avec le schéma exact d'adresse
  const adresseItemsSchema = {
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

  const result = generateDefaultValue(adresseItemsSchema);

  await json(200, {
    schema: adresseItemsSchema,
    result: result,
    isNull: result === null,
    type: typeof result,
    debug: 'Test generateDefaultValue avec schéma adresse exact'
  });
};