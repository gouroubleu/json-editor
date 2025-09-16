// Utilitaires pour la gestion des entités BDD
import type {
  EntityData,
  EntitySummary,
  EntityFilters,
  EntityValidationResult,
  PaginationState,
  EntityUIState
} from './types';
import { generateDefaultValue } from '../services';

// ===== UTILITAIRES DE VALIDATION =====

/**
 * Valide un nom de schéma
 */
export const validateSchemaName = (name: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push('Le nom du schéma est requis');
  } else {
    // Vérifier le format du nom
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      errors.push('Le nom du schéma doit commencer par une lettre et ne contenir que des lettres, chiffres, tirets et underscores');
    }

    if (name.length < 2) {
      errors.push('Le nom du schéma doit contenir au moins 2 caractères');
    }

    if (name.length > 50) {
      errors.push('Le nom du schéma ne peut pas dépasser 50 caractères');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valide les données d'une entité selon un schéma JSON Schema basique
 */
export const validateEntityDataBasic = (
  data: Record<string, any>,
  schema: any
): EntityValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validation des champs requis
  if (schema.required && Array.isArray(schema.required)) {
    for (const requiredField of schema.required) {
      if (
        !data.hasOwnProperty(requiredField) ||
        data[requiredField] === null ||
        data[requiredField] === undefined ||
        (typeof data[requiredField] === 'string' && data[requiredField].trim() === '')
      ) {
        errors.push(`Le champ '${requiredField}' est requis`);
      }
    }
  }

  // Validation des types de base
  if (schema.properties) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      const fieldDef = fieldSchema as any;
      const value = data[fieldName];

      if (value !== null && value !== undefined && value !== '') {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        const expectedType = fieldDef.type;

        if (expectedType && actualType !== expectedType) {
          errors.push(`Le champ '${fieldName}' doit être de type '${expectedType}' (reçu: '${actualType}')`);
        }

        // Validations spécifiques par type
        if (expectedType === 'string' && typeof value === 'string') {
          if (fieldDef.minLength && value.length < fieldDef.minLength) {
            errors.push(`Le champ '${fieldName}' doit contenir au moins ${fieldDef.minLength} caractères`);
          }
          if (fieldDef.maxLength && value.length > fieldDef.maxLength) {
            errors.push(`Le champ '${fieldName}' ne peut pas dépasser ${fieldDef.maxLength} caractères`);
          }
          if (fieldDef.pattern && !new RegExp(fieldDef.pattern).test(value)) {
            errors.push(`Le champ '${fieldName}' ne respecte pas le format requis`);
          }
          if (fieldDef.enum && !fieldDef.enum.includes(value)) {
            errors.push(`Le champ '${fieldName}' doit être l'une des valeurs: ${fieldDef.enum.join(', ')}`);
          }
        }

        if ((expectedType === 'number' || expectedType === 'integer') && typeof value === 'number') {
          if (fieldDef.minimum !== undefined && value < fieldDef.minimum) {
            errors.push(`Le champ '${fieldName}' doit être supérieur ou égal à ${fieldDef.minimum}`);
          }
          if (fieldDef.maximum !== undefined && value > fieldDef.maximum) {
            errors.push(`Le champ '${fieldName}' doit être inférieur ou égal à ${fieldDef.maximum}`);
          }
          if (expectedType === 'integer' && !Number.isInteger(value)) {
            errors.push(`Le champ '${fieldName}' doit être un nombre entier`);
          }
        }

        if (expectedType === 'array' && Array.isArray(value)) {
          if (fieldDef.minItems && value.length < fieldDef.minItems) {
            errors.push(`Le champ '${fieldName}' doit contenir au moins ${fieldDef.minItems} éléments`);
          }
          if (fieldDef.maxItems && value.length > fieldDef.maxItems) {
            errors.push(`Le champ '${fieldName}' ne peut pas contenir plus de ${fieldDef.maxItems} éléments`);
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// ===== UTILITAIRES DE CONVERSION =====

/**
 * Convertit une entité en format d'affichage lisible
 */
export const formatEntityForDisplay = (entity: EntityData): Record<string, string> => {
  const formatted: Record<string, string> = {};

  // Métadonnées de base
  formatted['ID'] = entity.id;
  formatted['Schéma'] = entity.schemaName;
  formatted['Version'] = entity.version;
  formatted['Créé le'] = new Date(entity.createdAt).toLocaleString('fr-FR');
  formatted['Modifié le'] = new Date(entity.updatedAt).toLocaleString('fr-FR');

  // Données de l'entité (format lisible)
  for (const [key, value] of Object.entries(entity.data)) {
    formatted[key] = formatValueForDisplay(value);
  }

  return formatted;
};

/**
 * Formate une valeur pour l'affichage
 */
export const formatValueForDisplay = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }

  if (typeof value === 'number') {
    return value.toLocaleString('fr-FR');
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => formatValueForDisplay(item)).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

/**
 * Convertit des filtres en paramètres de requête
 */
export const filtersToQueryParams = (filters: EntityFilters): Record<string, string> => {
  const params: Record<string, string> = {};

  if (filters.schemaName) params.schemaName = filters.schemaName;
  if (filters.version) params.version = filters.version;
  if (filters.search) params.search = filters.search;
  if (filters.limit) params.limit = filters.limit.toString();
  if (filters.offset) params.offset = filters.offset.toString();

  return params;
};

/**
 * Convertit des paramètres de requête en filtres
 */
export const queryParamsToFilters = (params: Record<string, string>): EntityFilters => {
  const filters: EntityFilters = {};

  if (params.schemaName) filters.schemaName = params.schemaName;
  if (params.version) filters.version = params.version;
  if (params.search) filters.search = params.search;
  if (params.limit) filters.limit = parseInt(params.limit, 10);
  if (params.offset) filters.offset = parseInt(params.offset, 10);

  return filters;
};

// ===== UTILITAIRES DE NAVIGATION =====

/**
 * Génère une URL pour naviguer vers une entité
 */
export const getEntityUrl = (entityId: string, schemaName?: string): string => {
  const baseUrl = '/bo/schemaEditor/bdd';
  const params = new URLSearchParams();

  if (schemaName) {
    params.set('schema', schemaName);
  }

  params.set('entity', entityId);

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Génère une URL pour naviguer vers une liste d'entités d'un schéma
 */
export const getSchemaEntitiesUrl = (schemaName: string, filters?: EntityFilters): string => {
  const baseUrl = '/bo/schemaEditor/bdd';
  const params = new URLSearchParams();

  params.set('schema', schemaName);

  if (filters) {
    const queryParams = filtersToQueryParams(filters);
    for (const [key, value] of Object.entries(queryParams)) {
      params.set(key, value);
    }
  }

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Parse l'URL actuelle pour extraire les paramètres d'entité
 */
export const parseEntityUrl = (url: string): {
  schemaName?: string;
  entityId?: string;
  filters?: EntityFilters;
} => {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    const result: ReturnType<typeof parseEntityUrl> = {};

    if (params.has('schema')) {
      result.schemaName = params.get('schema')!;
    }

    if (params.has('entity')) {
      result.entityId = params.get('entity')!;
    }

    // Extraire les autres paramètres comme filtres
    const filterParams: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      if (key !== 'schema' && key !== 'entity') {
        filterParams[key] = value;
      }
    }

    if (Object.keys(filterParams).length > 0) {
      result.filters = queryParamsToFilters(filterParams);
    }

    return result;
  } catch (error) {
    return {};
  }
};

// ===== UTILITAIRES DE DONNÉES =====

/**
 * Compare deux entités pour détecter les changements
 */
export const compareEntities = (
  entityA: EntityData,
  entityB: EntityData
): {
  hasChanges: boolean;
  changedFields: string[];
  details: Record<string, { old: any; new: any }>;
} => {
  const changedFields: string[] = [];
  const details: Record<string, { old: any; new: any }> = {};

  // Comparer les métadonnées
  if (entityA.version !== entityB.version) {
    changedFields.push('version');
    details.version = { old: entityA.version, new: entityB.version };
  }

  // Comparer les données
  const allFields = new Set([
    ...Object.keys(entityA.data),
    ...Object.keys(entityB.data)
  ]);

  for (const field of allFields) {
    const valueA = entityA.data[field];
    const valueB = entityB.data[field];

    if (!deepEqual(valueA, valueB)) {
      changedFields.push(field);
      details[field] = { old: valueA, new: valueB };
    }
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFields,
    details
  };
};

/**
 * Comparaison profonde de deux valeurs
 */
export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => deepEqual(item, b[index]));
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
};

/**
 * Clone profond d'un objet
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;

  if (obj instanceof Date) return new Date(obj.getTime()) as any;

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
};

// ===== UTILITAIRES DE RECHERCHE =====

/**
 * Recherche dans les données d'une entité
 */
export const searchInEntity = (entity: EntityData, query: string): boolean => {
  if (!query || query.trim().length === 0) return true;

  const searchTerm = query.toLowerCase().trim();

  // Recherche dans les métadonnées
  if (
    entity.id.toLowerCase().includes(searchTerm) ||
    entity.schemaName.toLowerCase().includes(searchTerm) ||
    entity.version.toLowerCase().includes(searchTerm)
  ) {
    return true;
  }

  // Recherche dans les données
  return searchInObject(entity.data, searchTerm);
};

/**
 * Recherche récursive dans un objet
 */
export const searchInObject = (obj: any, searchTerm: string): boolean => {
  if (obj === null || obj === undefined) return false;

  if (typeof obj === 'string') {
    return obj.toLowerCase().includes(searchTerm);
  }

  if (typeof obj === 'number') {
    return obj.toString().includes(searchTerm);
  }

  if (typeof obj === 'boolean') {
    const boolStr = obj ? 'true' : 'false';
    return boolStr.includes(searchTerm) || (obj && 'oui'.includes(searchTerm)) || (!obj && 'non'.includes(searchTerm));
  }

  if (Array.isArray(obj)) {
    return obj.some(item => searchInObject(item, searchTerm));
  }

  if (typeof obj === 'object') {
    return Object.values(obj).some(value => searchInObject(value, searchTerm));
  }

  return false;
};

// ===== UTILITAIRES DE PAGINATION =====

/**
 * Calcule les informations de pagination
 */
export const calculatePagination = (
  totalCount: number,
  currentPage: number,
  pageSize: number
): {
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  startIndex: number;
  endIndex: number;
  offset: number;
} => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const offset = (currentPage - 1) * pageSize;
  const startIndex = offset + 1;
  const endIndex = Math.min(offset + pageSize, totalCount);

  return {
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    startIndex,
    endIndex,
    offset
  };
};

/**
 * Génère un range de pages pour la pagination
 */
export const generatePageRange = (
  currentPage: number,
  totalPages: number,
  maxVisiblePages: number = 5
): number[] => {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfRange = Math.floor(maxVisiblePages / 2);
  let start = Math.max(1, currentPage - halfRange);
  let end = Math.min(totalPages, start + maxVisiblePages - 1);

  // Ajuster le début si on est proche de la fin
  if (end - start + 1 < maxVisiblePages) {
    start = Math.max(1, end - maxVisiblePages + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

// ===== UTILITAIRES D'EXPORT =====

/**
 * Convertit des entités en format CSV
 */
export const entitiesToCSV = (entities: EntityData[]): string => {
  if (entities.length === 0) return '';

  // Déterminer toutes les colonnes possibles
  const allFields = new Set<string>();
  entities.forEach(entity => {
    allFields.add('id');
    allFields.add('schemaName');
    allFields.add('version');
    allFields.add('createdAt');
    allFields.add('updatedAt');
    Object.keys(entity.data).forEach(key => allFields.add(`data.${key}`));
  });

  const headers = Array.from(allFields);

  // Créer le contenu CSV
  const csvRows = [
    headers.join(','), // En-têtes
    ...entities.map(entity => {
      return headers.map(header => {
        let value: any;

        if (header.startsWith('data.')) {
          const fieldName = header.substring(5);
          value = entity.data[fieldName];
        } else {
          value = (entity as any)[header];
        }

        // Formater la valeur pour CSV
        if (value === null || value === undefined) {
          return '';
        }

        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }

        // Échapper les guillemets et entourer de guillemets si nécessaire
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      }).join(',');
    })
  ];

  return csvRows.join('\n');
};

/**
 * Génère un nom de fichier pour l'export
 */
export const generateExportFilename = (
  schemaName?: string,
  format: 'json' | 'csv' = 'json'
): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const prefix = schemaName ? `${schemaName}-entities` : 'all-entities';
  return `${prefix}-${timestamp}.${format}`;
};

// ===== UTILITAIRES DE PERFORMANCE =====

/**
 * Debounce d'une fonction
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle d'une fonction
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - (now - lastCall));
    }
  };
};