/**
 * Tests unitaires pour le SchemaEditorContext
 *
 * Ces tests vérifient que le provider fonctionne correctement avec tous ses hooks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  jsonSchemaToProperties,
  propertiesToJsonSchema,
  findPropertyByPath,
  validateProperty,
  getMaxDepth,
  countProperties
} from './schema-converter';
import type { SchemaProperty, JsonSchemaOutput, SchemaInfo } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SchemaConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('jsonSchemaToProperties', () => {
    it('should convert a simple object schema to properties', () => {
      const schema: JsonSchemaOutput = {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'User name'
          },
          age: {
            type: 'integer',
            description: 'User age',
            minimum: 0
          }
        },
        required: ['name']
      };

      const properties = jsonSchemaToProperties(schema);

      expect(properties).toHaveLength(2);
      expect(properties[0]).toMatchObject({
        name: 'name',
        type: 'string',
        required: true,
        description: 'User name'
      });
      expect(properties[1]).toMatchObject({
        name: 'age',
        type: 'integer',
        required: false,
        description: 'User age',
        minimum: 0
      });
    });

    it('should convert nested object properties', () => {
      const schema: JsonSchemaOutput = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: {
                type: 'string'
              },
              email: {
                type: 'string',
                format: 'email'
              }
            },
            required: ['name']
          }
        }
      };

      const properties = jsonSchemaToProperties(schema);

      expect(properties).toHaveLength(1);
      expect(properties[0].name).toBe('user');
      expect(properties[0].type).toBe('object');
      expect(properties[0].properties).toHaveLength(2);
      expect(properties[0].properties![0]).toMatchObject({
        name: 'name',
        type: 'string',
        required: true
      });
      expect(properties[0].properties![1]).toMatchObject({
        name: 'email',
        type: 'string',
        required: false,
        format: 'email'
      });
    });

    it('should convert array schemas', () => {
      const schema: JsonSchemaOutput = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' }
              },
              required: ['id']
            }
          }
        }
      };

      const properties = jsonSchemaToProperties(schema);

      expect(properties).toHaveLength(2);
      expect(properties[0]).toMatchObject({
        name: 'tags',
        type: 'array',
        items: {
          type: 'string'
        }
      });
      expect(properties[1]).toMatchObject({
        name: 'users',
        type: 'array'
      });
      expect(properties[1].items?.properties).toHaveLength(2);
    });
  });

  describe('propertiesToJsonSchema', () => {
    it('should convert properties to JSON schema', () => {
      const schemaInfo: SchemaInfo = {
        name: 'UserSchema',
        title: 'User Schema',
        description: 'Schema for user data',
        type: 'object'
      };

      const properties: SchemaProperty[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'User name',
          minLength: 1,
          maxLength: 100
        },
        {
          name: 'age',
          type: 'integer',
          required: false,
          description: 'User age',
          minimum: 0,
          maximum: 150
        }
      ];

      const schema = propertiesToJsonSchema(schemaInfo, properties);

      expect(schema).toMatchObject({
        type: 'object',
        title: 'User Schema',
        description: 'Schema for user data',
        properties: {
          name: {
            type: 'string',
            description: 'User name',
            minLength: 1,
            maxLength: 100
          },
          age: {
            type: 'integer',
            description: 'User age',
            minimum: 0,
            maximum: 150
          }
        },
        required: ['name']
      });
    });

    it('should handle nested objects', () => {
      const schemaInfo: SchemaInfo = {
        name: 'NestedSchema',
        title: 'Nested Schema',
        description: 'Schema with nested objects',
        type: 'object'
      };

      const properties: SchemaProperty[] = [
        {
          name: 'user',
          type: 'object',
          required: true,
          description: 'User information',
          properties: [
            {
              name: 'name',
              type: 'string',
              required: true,
              description: 'User name'
            },
            {
              name: 'profile',
              type: 'object',
              required: false,
              description: 'User profile',
              properties: [
                {
                  name: 'bio',
                  type: 'string',
                  required: false,
                  description: 'User bio'
                }
              ]
            }
          ]
        }
      ];

      const schema = propertiesToJsonSchema(schemaInfo, properties);

      expect(schema.properties?.user).toMatchObject({
        type: 'object',
        description: 'User information',
        properties: {
          name: {
            type: 'string',
            description: 'User name'
          },
          profile: {
            type: 'object',
            description: 'User profile',
            properties: {
              bio: {
                type: 'string',
                description: 'User bio'
              }
            }
          }
        },
        required: ['name']
      });
    });
  });

  describe('findPropertyByPath', () => {
    const properties: SchemaProperty[] = [
      {
        name: 'user',
        type: 'object',
        required: true,
        description: 'User',
        properties: [
          {
            name: 'name',
            type: 'string',
            required: true,
            description: 'Name'
          },
          {
            name: 'address',
            type: 'object',
            required: false,
            description: 'Address',
            properties: [
              {
                name: 'street',
                type: 'string',
                required: true,
                description: 'Street'
              }
            ]
          }
        ]
      }
    ];

    it('should find property by simple path', () => {
      const property = findPropertyByPath(properties, 'user');
      expect(property?.name).toBe('user');
    });

    it('should find nested property by path', () => {
      const property = findPropertyByPath(properties, 'user.name');
      expect(property?.name).toBe('name');
    });

    it('should find deeply nested property by path', () => {
      const property = findPropertyByPath(properties, 'user.address.street');
      expect(property?.name).toBe('street');
    });

    it('should return null for non-existent path', () => {
      const property = findPropertyByPath(properties, 'user.nonexistent');
      expect(property).toBeNull();
    });
  });

  describe('validateProperty', () => {
    it('should validate required name', () => {
      const property: SchemaProperty = {
        name: '',
        type: 'string',
        required: false,
        description: 'Test'
      };

      const errors = validateProperty(property);
      expect(errors).toContain('Le nom de la propriété est requis');
    });

    it('should validate identifier format', () => {
      const property: SchemaProperty = {
        name: '123invalid',
        type: 'string',
        required: false,
        description: 'Test'
      };

      const errors = validateProperty(property);
      expect(errors).toContain('Le nom de la propriété doit être un identifiant valide');
    });

    it('should validate string constraints', () => {
      const property: SchemaProperty = {
        name: 'test',
        type: 'string',
        required: false,
        description: 'Test',
        minLength: 10,
        maxLength: 5
      };

      const errors = validateProperty(property);
      expect(errors).toContain('La longueur minimale ne peut pas être supérieure à la longueur maximale');
    });

    it('should validate number constraints', () => {
      const property: SchemaProperty = {
        name: 'test',
        type: 'number',
        required: false,
        description: 'Test',
        minimum: 10,
        maximum: 5
      };

      const errors = validateProperty(property);
      expect(errors).toContain('La valeur minimale ne peut pas être supérieure à la valeur maximale');
    });

    it('should validate object has properties', () => {
      const property: SchemaProperty = {
        name: 'test',
        type: 'object',
        required: false,
        description: 'Test',
        properties: []
      };

      const errors = validateProperty(property);
      expect(errors).toContain('Un objet doit avoir au moins une propriété');
    });

    it('should validate array has items definition', () => {
      const property: SchemaProperty = {
        name: 'test',
        type: 'array',
        required: false,
        description: 'Test'
      };

      const errors = validateProperty(property);
      expect(errors).toContain('Un array doit définir le type de ses éléments');
    });
  });

  describe('getMaxDepth', () => {
    it('should calculate depth of simple properties', () => {
      const properties: SchemaProperty[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Name'
        }
      ];

      expect(getMaxDepth(properties)).toBe(0);
    });

    it('should calculate depth of nested properties', () => {
      const properties: SchemaProperty[] = [
        {
          name: 'user',
          type: 'object',
          required: true,
          description: 'User',
          properties: [
            {
              name: 'address',
              type: 'object',
              required: false,
              description: 'Address',
              properties: [
                {
                  name: 'street',
                  type: 'string',
                  required: true,
                  description: 'Street'
                }
              ]
            }
          ]
        }
      ];

      expect(getMaxDepth(properties)).toBe(2);
    });
  });

  describe('countProperties', () => {
    it('should count all properties including nested ones', () => {
      const properties: SchemaProperty[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Name'
        },
        {
          name: 'user',
          type: 'object',
          required: true,
          description: 'User',
          properties: [
            {
              name: 'email',
              type: 'string',
              required: true,
              description: 'Email'
            },
            {
              name: 'profile',
              type: 'object',
              required: false,
              description: 'Profile',
              properties: [
                {
                  name: 'bio',
                  type: 'string',
                  required: false,
                  description: 'Bio'
                }
              ]
            }
          ]
        }
      ];

      expect(countProperties(properties)).toBe(5); // name + user + email + profile + bio
    });

    it('should count properties in arrays', () => {
      const properties: SchemaProperty[] = [
        {
          name: 'users',
          type: 'array',
          required: true,
          description: 'Users',
          items: {
            type: 'object',
            properties: [
              {
                name: 'id',
                type: 'integer',
                required: true,
                description: 'ID'
              },
              {
                name: 'name',
                type: 'string',
                required: true,
                description: 'Name'
              }
            ]
          }
        }
      ];

      expect(countProperties(properties)).toBe(3); // users + id + name
    });
  });
});

// Tests d'intégration simulés
describe('SchemaEditor Integration', () => {
  it('should handle complete schema conversion cycle', () => {
    // Simuler un cycle complet: JSON Schema -> Properties -> JSON Schema
    const originalSchema: JsonSchemaOutput = {
      type: 'object',
      title: 'User Schema',
      description: 'Schema for user management',
      properties: {
        id: {
          type: 'integer',
          description: 'User ID',
          minimum: 1
        },
        name: {
          type: 'string',
          description: 'User name',
          minLength: 1,
          maxLength: 100
        },
        email: {
          type: 'string',
          description: 'User email',
          format: 'email'
        },
        profile: {
          type: 'object',
          description: 'User profile',
          properties: {
            bio: {
              type: 'string',
              description: 'User biography'
            },
            age: {
              type: 'integer',
              description: 'User age',
              minimum: 0,
              maximum: 150
            }
          },
          required: ['age']
        },
        tags: {
          type: 'array',
          description: 'User tags',
          items: {
            type: 'string'
          }
        }
      },
      required: ['id', 'name', 'email']
    };

    // Convertir en propriétés
    const properties = jsonSchemaToProperties(originalSchema);

    // Vérifier la structure
    expect(properties).toHaveLength(5);
    expect(properties.find(p => p.name === 'id')?.required).toBe(true);
    expect(properties.find(p => p.name === 'profile')?.properties).toHaveLength(2);

    // Reconvertir en schéma
    const schemaInfo: SchemaInfo = {
      name: 'UserSchema',
      title: originalSchema.title!,
      description: originalSchema.description!,
      type: 'object'
    };

    const reconstructedSchema = propertiesToJsonSchema(schemaInfo, properties);

    // Vérifier que la structure est préservée
    expect(reconstructedSchema.type).toBe('object');
    expect(reconstructedSchema.required).toContain('id');
    expect(reconstructedSchema.required).toContain('name');
    expect(reconstructedSchema.required).toContain('email');
    expect(reconstructedSchema.properties?.profile?.required).toContain('age');
  });

  it('should handle validation errors correctly', () => {
    const invalidProperties: SchemaProperty[] = [
      {
        name: '',
        type: 'string',
        required: true,
        description: 'Invalid property'
      },
      {
        name: '123invalid',
        type: 'object',
        required: false,
        description: 'Invalid name',
        properties: []
      }
    ];

    const errors1 = validateProperty(invalidProperties[0]);
    const errors2 = validateProperty(invalidProperties[1]);

    expect(errors1.length).toBeGreaterThan(0);
    expect(errors2.length).toBeGreaterThan(0);
    expect(errors1).toContain('Le nom de la propriété est requis');
    expect(errors2).toContain('Le nom de la propriété doit être un identifiant valide');
    expect(errors2).toContain('Un objet doit avoir au moins une propriété');
  });
});