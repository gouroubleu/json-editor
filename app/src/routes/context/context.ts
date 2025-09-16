// Contexte principal pour le SchemaEditor avec architecture Qwik
import { createContextId } from '@builder.io/qwik';
import type { SchemaEditorContextValue } from './types';

/**
 * Context ID pour le SchemaEditor
 * Utilisé avec useContext() et useContextProvider()
 */
export const SchemaEditorContextId = createContextId<SchemaEditorContextValue>('schema-editor-context');

/**
 * Clés pour le stockage local (cache persistant et brouillons)
 */
export const STORAGE_KEYS = {
  CACHE: 'schema-editor-cache',
  DRAFTS: 'schema-editor-drafts',
  CONFIG: 'schema-editor-config',
  UI_STATE: 'schema-editor-ui-state'
} as const;

/**
 * Configuration par défaut du contexte
 */
export const DEFAULT_CONFIG = {
  cache: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 50, // 50 schémas en cache
    enablePersistence: true
  },
  drafts: {
    autoSaveEnabled: true,
    autoSaveInterval: 30000, // 30 secondes
    maxDrafts: 10
  },
  notifications: {
    maxNotifications: 5,
    defaultDuration: 5000, // 5 secondes
    enableSound: false
  },
  ui: {
    defaultView: 'list' as const,
    defaultPanel: 'properties' as const,
    enableValidation: true,
    debounceTime: 300 // millisecondes
  }
} as const;

/**
 * État initial du contexte
 */
export const INITIAL_STATE = {
  currentSchema: {
    schemaInfo: {
      name: '',
      title: '',
      description: '',
      type: 'object' as const
    },
    properties: [],
    isValid: true,
    errors: []
  },
  schemas: [],
  ui: {
    selectedSchemaName: null,
    selectedPropertyId: null,
    expandedProperties: new Set<string>(),
    editMode: 'view' as const,
    activeView: 'list' as const,
    searchQuery: '',
    filters: {},
    sidebarCollapsed: false,
    activePanel: 'properties' as const,
    validationEnabled: true,
    showValidationErrors: true
  },
  cache: {
    lastSync: null,
    cachedSchemas: new Map(),
    invalidationQueue: [],
    maxCacheSize: DEFAULT_CONFIG.cache.maxSize,
    ttl: DEFAULT_CONFIG.cache.ttl
  },
  drafts: {
    drafts: new Map(),
    autoSaveEnabled: DEFAULT_CONFIG.drafts.autoSaveEnabled,
    autoSaveInterval: DEFAULT_CONFIG.drafts.autoSaveInterval,
    lastAutoSave: null
  },
  loading: {
    isLoading: false,
    isLoadingSchemas: false,
    isSaving: false,
    isValidating: false,
    isGenerating: false,
    loadingOperations: new Map()
  },
  notifications: {
    notifications: [],
    maxNotifications: DEFAULT_CONFIG.notifications.maxNotifications
  }
} as const;

/**
 * Types pour les événements du contexte
 */
export interface SchemaEditorEvent {
  type: string;
  payload?: any;
  timestamp: string;
}

export interface SchemaEditorEventMap {
  'schema:created': { name: string; schema: any };
  'schema:updated': { name: string; schema: any };
  'schema:deleted': { name: string };
  'schema:selected': { name: string | null };
  'property:added': { propertyId: string; property: any };
  'property:updated': { propertyId: string; updates: any };
  'property:deleted': { propertyId: string };
  'draft:saved': { draftName: string; draft: any };
  'draft:loaded': { draftName: string; draft: any };
  'cache:invalidated': { schemaName?: string };
  'notification:added': { notification: any };
  'ui:view-changed': { view: string };
  'ui:mode-changed': { mode: string };
}

/**
 * Utilitaires pour les IDs uniques
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generatePropertyId = (name: string, parentId?: string): string => {
  const base = parentId ? `${parentId}.${name}` : name;
  return `prop-${base}-${Date.now()}`;
};

/**
 * Utilitaires pour la validation des noms
 */
export const validateSchemaName = (name: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push('Le nom du schéma est requis');
  }

  if (name.length < 2) {
    errors.push('Le nom doit contenir au moins 2 caractères');
  }

  if (name.length > 50) {
    errors.push('Le nom ne peut pas dépasser 50 caractères');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    errors.push('Le nom ne peut contenir que des lettres, chiffres, tirets et underscores');
  }

  if (/^[0-9]/.test(name)) {
    errors.push('Le nom ne peut pas commencer par un chiffre');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Utilitaires pour la comparaison des schémas
 */
export const schemasEqual = (schema1: any, schema2: any): boolean => {
  return JSON.stringify(schema1) === JSON.stringify(schema2);
};

/**
 * Utilitaires pour le stockage
 */
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Erreur lors de la lecture du localStorage pour ${key}:`, error);
      return defaultValue;
    }
  },

  set: (key: string, value: any): void => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Erreur lors de l'écriture dans le localStorage pour ${key}:`, error);
    }
  },

  remove: (key: string): void => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Erreur lors de la suppression du localStorage pour ${key}:`, error);
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;

    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Erreur lors du nettoyage du localStorage:', error);
    }
  }
};

/**
 * Utilitaires pour les notifications
 */
export const createNotification = (
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  message: string,
  duration?: number,
  actions?: any[]
) => ({
  id: generateId(),
  type,
  title,
  message,
  timestamp: new Date().toISOString(),
  duration: duration ?? DEFAULT_CONFIG.notifications.defaultDuration,
  actions
});

/**
 * Debounce utility pour les actions de l'UI
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;

  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
};