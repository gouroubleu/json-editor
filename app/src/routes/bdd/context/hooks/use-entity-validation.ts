// Hook spécialisé pour la validation en temps réel des entités
import { useContext, useComputed$, useStore, useSignal, useTask$, $ } from '@builder.io/qwik';
import { EntityEditorContext } from '../provider';
import { debounceEntity } from '../context';
import type {
  EntityValidationResult,
  EntityValidationError,
  EntityValidationWarning,
  CachedValidation,
  BatchValidationStatus
} from '../types';

/**
 * Hook pour la validation avancée des entités avec cache et validation en temps réel
 */
export const useEntityValidation = () => {
  const { state, actions, config } = useContext(EntityEditorContext);

  // État local pour la validation
  const validationState = useStore({
    isValidating: false,
    lastValidationTime: null as string | null,
    validationHistory: [] as Array<{ timestamp: string; result: EntityValidationResult }>,
    realTimeErrors: new Map<string, EntityValidationError[]>(),
    realTimeWarnings: new Map<string, EntityValidationWarning[]>(),
    fieldValidationCache: new Map<string, { timestamp: string; isValid: boolean; errors: string[] }>()
  });

  // Signal pour contrôler la validation automatique
  const autoValidationEnabled = useSignal(config.value.validation.validateOnChange);

  // Validation en temps réel avec debounce
  const debouncedValidateField = debounceEntity(
    $(async (fieldPath: string, value: any) => {
      if (!autoValidationEnabled.value) return;

      try {
        const result = await validateFieldValue(fieldPath, value, state.currentEntity.schema);

        if (result.isValid) {
          validationState.realTimeErrors.delete(fieldPath);
          validationState.realTimeWarnings.delete(fieldPath);
        } else {
          const errors: EntityValidationError[] = result.errors.map(error => ({
            path: fieldPath,
            message: error,
            severity: 'error' as const
          }));
          validationState.realTimeErrors.set(fieldPath, errors);
        }

        // Mettre en cache le résultat
        validationState.fieldValidationCache.set(fieldPath, {
          timestamp: new Date().toISOString(),
          isValid: result.isValid,
          errors: result.errors
        });

      } catch (error) {
        console.warn(`Erreur validation champ ${fieldPath}:`, error);
      }
    }),
    config.value.ui.debounceTime
  );

  // Validation complète de l'entité courante
  const validateCurrentEntity = $(async (): Promise<EntityValidationResult> => {
    validationState.isValidating = true;

    try {
      const result = await actions.entities.validate();

      // Ajouter à l'historique
      validationState.validationHistory.push({
        timestamp: new Date().toISOString(),
        result
      });

      // Limiter l'historique à 10 entrées
      if (validationState.validationHistory.length > 10) {
        validationState.validationHistory.shift();
      }

      validationState.lastValidationTime = new Date().toISOString();

      return result;
    } finally {
      validationState.isValidating = false;
    }
  });

  // Validation par lot avec progression
  const validateBatch = $(async (entityIds: string[]): Promise<BatchValidationStatus> => {
    return await actions.entities.validateBatch(entityIds);
  });

  // Statistiques de validation
  const validationStats = useComputed$(() => {
    const currentErrors = state.currentEntity.validationErrors.length;
    const currentWarnings = state.currentEntity.validationWarnings.length;
    const realtimeErrorCount = Array.from(validationState.realTimeErrors.values())
      .reduce((total, errors) => total + errors.length, 0);
    const realtimeWarningCount = Array.from(validationState.realTimeWarnings.values())
      .reduce((total, warnings) => total + warnings.length, 0);

    return {
      totalErrors: currentErrors + realtimeErrorCount,
      totalWarnings: currentWarnings + realtimeWarningCount,
      isValid: currentErrors === 0 && realtimeErrorCount === 0,
      hasWarnings: currentWarnings > 0 || realtimeWarningCount > 0,
      lastValidated: validationState.lastValidationTime,
      validationCount: validationState.validationHistory.length,
      avgValidationTime: calculateAverageValidationTime(validationState.validationHistory)
    };
  });

  // Erreurs groupées par catégorie
  const groupedErrors = useComputed$(() => {
    const allErrors = [
      ...state.currentEntity.validationErrors,
      ...Array.from(validationState.realTimeErrors.values()).flat()
    ];

    const grouped = allErrors.reduce((groups, error) => {
      const category = categorizeError(error);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(error);
      return groups;
    }, {} as Record<string, EntityValidationError[]>);

    return grouped;
  });

  // Avertissements par priorité
  const prioritizedWarnings = useComputed$(() => {
    const allWarnings = [
      ...state.currentEntity.validationWarnings,
      ...Array.from(validationState.realTimeWarnings.values()).flat()
    ];

    return allWarnings.sort((a, b) => {
      const priorityA = getWarningPriority(a);
      const priorityB = getWarningPriority(b);
      return priorityB - priorityA; // Ordre décroissant de priorité
    });
  });

  // Suggestions d'amélioration
  const validationSuggestions = useComputed$(() => {
    const suggestions: Array<{
      type: 'error' | 'warning' | 'improvement';
      message: string;
      action?: string;
      severity: number;
    }> = [];

    // Suggestions basées sur les erreurs courantes
    if (validationStats.value.totalErrors > 0) {
      suggestions.push({
        type: 'error',
        message: `${validationStats.value.totalErrors} erreur(s) empêchent la sauvegarde`,
        action: 'Corriger les erreurs de validation',
        severity: 10
      });
    }

    // Suggestions basées sur les avertissements
    if (validationStats.value.totalWarnings > 3) {
      suggestions.push({
        type: 'warning',
        message: 'Nombreux avertissements détectés',
        action: 'Réviser la qualité des données',
        severity: 5
      });
    }

    // Suggestions d'amélioration
    if (state.currentEntity.schemaVersion !== state.currentEntity.entityInfo.version) {
      suggestions.push({
        type: 'improvement',
        message: 'Une nouvelle version du schéma est disponible',
        action: 'Migrer vers la nouvelle version',
        severity: 3
      });
    }

    return suggestions.sort((a, b) => b.severity - a.severity);
  });

  // Validation en temps réel activée par une tâche
  useTask$(({ track }) => {
    track(() => state.currentEntity.data);
    track(() => autoValidationEnabled.value);

    if (autoValidationEnabled.value && state.currentEntity.data) {
      // Valider chaque champ modifié
      Object.keys(state.currentEntity.data).forEach(fieldPath => {
        const value = state.currentEntity.data[fieldPath];
        debouncedValidateField(fieldPath, value);
      });
    }
  });

  // Méthodes utilitaires de validation
  const validationUtils = {
    // Validation d'un champ spécifique
    validateField: $(async (fieldPath: string, value: any) => {
      return await debouncedValidateField(fieldPath, value);
    }),

    // Activer/désactiver la validation en temps réel
    toggleAutoValidation: $(() => {
      autoValidationEnabled.value = !autoValidationEnabled.value;
    }),

    // Nettoyer les erreurs d'un champ
    clearFieldErrors: $((fieldPath: string) => {
      validationState.realTimeErrors.delete(fieldPath);
      validationState.realTimeWarnings.delete(fieldPath);
      validationState.fieldValidationCache.delete(fieldPath);
    }),

    // Obtenir les erreurs d'un champ spécifique
    getFieldErrors: $((fieldPath: string): EntityValidationError[] => {
      return validationState.realTimeErrors.get(fieldPath) || [];
    }),

    // Obtenir les avertissements d'un champ spécifique
    getFieldWarnings: $((fieldPath: string): EntityValidationWarning[] => {
      return validationState.realTimeWarnings.get(fieldPath) || [];
    }),

    // Vérifier si un champ est valide
    isFieldValid: $((fieldPath: string): boolean => {
      const cached = validationState.fieldValidationCache.get(fieldPath);
      if (cached) {
        // Vérifier si le cache n'est pas expiré
        const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
        if (cacheAge < config.value.validation.validationCacheTTL) {
          return cached.isValid;
        }
      }

      // Pas de cache ou cache expiré, supposer valide jusqu'à validation
      return !validationState.realTimeErrors.has(fieldPath);
    }),

    // Validation préventive avant sauvegarde
    validateBeforeSave: $(async (): Promise<boolean> => {
      if (!config.value.validation.validateOnSave) return true;

      const result = await validateCurrentEntity();

      if (!result.isValid) {
        actions.notifications.error(
          'Validation échouée',
          `${result.errors.length} erreur(s) empêchent la sauvegarde`,
          [{
            label: 'Voir les erreurs',
            action: () => {
              state.ui.showValidationErrors = true;
              state.ui.activePanel = 'validation';
            },
            style: 'primary'
          }]
        );
        return false;
      }

      return true;
    }),

    // Rapport de validation détaillé
    generateValidationReport: $(() => {
      const report = {
        timestamp: new Date().toISOString(),
        entityId: state.currentEntity.entityInfo.id || 'new',
        schemaName: state.currentEntity.schemaName,
        schemaVersion: state.currentEntity.schemaVersion,

        summary: validationStats.value,

        errors: {
          total: validationStats.value.totalErrors,
          byCategory: groupedErrors.value,
          realTime: Object.fromEntries(validationState.realTimeErrors),
          persistent: state.currentEntity.validationErrors
        },

        warnings: {
          total: validationStats.value.totalWarnings,
          prioritized: prioritizedWarnings.value,
          realTime: Object.fromEntries(validationState.realTimeWarnings),
          persistent: state.currentEntity.validationWarnings
        },

        suggestions: validationSuggestions.value,

        cache: {
          fieldValidations: validationState.fieldValidationCache.size,
          lastValidation: validationState.lastValidationTime,
          validationHistory: validationState.validationHistory.length
        },

        config: {
          autoValidation: autoValidationEnabled.value,
          validateOnChange: config.value.validation.validateOnChange,
          validateOnSave: config.value.validation.validateOnSave,
          validationMode: state.validation.validationMode
        }
      };

      return report;
    }),

    // Exporter le rapport en JSON
    exportValidationReport: $(() => {
      const report = validationUtils.generateValidationReport();
      return JSON.stringify(report, null, 2);
    }),

    // Nettoyer l'historique de validation
    clearValidationHistory: $(() => {
      validationState.validationHistory = [];
      validationState.fieldValidationCache.clear();
      validationState.realTimeErrors.clear();
      validationState.realTimeWarnings.clear();
    }),

    // Configuration avancée de la validation
    configureValidation: $((options: {
      mode?: 'strict' | 'lenient' | 'off';
      validateOnChange?: boolean;
      validateOnSave?: boolean;
      debounceTime?: number;
    }) => {
      if (options.mode) {
        state.validation.validationMode = options.mode;
      }
      if (options.validateOnChange !== undefined) {
        state.validation.validateOnChange = options.validateOnChange;
        autoValidationEnabled.value = options.validateOnChange;
      }
      if (options.validateOnSave !== undefined) {
        state.validation.validateOnSave = options.validateOnSave;
      }

      actions.notifications.info(
        'Configuration mise à jour',
        'Les paramètres de validation ont été appliqués',
        2000
      );
    })
  };

  return {
    // État de validation
    validationStats,
    groupedErrors,
    prioritizedWarnings,
    validationSuggestions,
    isValidating: validationState.isValidating,
    autoValidationEnabled: autoValidationEnabled.value,

    // Actions de validation
    validateCurrentEntity,
    validateBatch,

    // Utilitaires
    ...validationUtils,

    // Configuration
    validationMode: state.validation.validationMode,
    validateOnChange: state.validation.validateOnChange,
    validateOnSave: state.validation.validateOnSave,

    // Cache et historique
    validationHistory: validationState.validationHistory,
    fieldValidationCache: validationState.fieldValidationCache
  };
};

// Fonctions utilitaires privées

async function validateFieldValue(
  fieldPath: string,
  value: any,
  schema: any
): Promise<{ isValid: boolean; errors: string[] }> {
  if (!schema || !schema.properties) {
    return { isValid: true, errors: [] };
  }

  const fieldSchema = getFieldSchema(schema, fieldPath);
  if (!fieldSchema) {
    return { isValid: true, errors: [] };
  }

  const errors: string[] = [];

  // Validation du type
  if (fieldSchema.type && !validateFieldType(value, fieldSchema.type)) {
    errors.push(`Type invalide: attendu ${fieldSchema.type}`);
  }

  // Validation des contraintes
  if (fieldSchema.required && (value === null || value === undefined || value === '')) {
    errors.push('Champ requis');
  }

  if (fieldSchema.minLength && typeof value === 'string' && value.length < fieldSchema.minLength) {
    errors.push(`Longueur minimale: ${fieldSchema.minLength} caractères`);
  }

  if (fieldSchema.maxLength && typeof value === 'string' && value.length > fieldSchema.maxLength) {
    errors.push(`Longueur maximale: ${fieldSchema.maxLength} caractères`);
  }

  if (fieldSchema.minimum && typeof value === 'number' && value < fieldSchema.minimum) {
    errors.push(`Valeur minimale: ${fieldSchema.minimum}`);
  }

  if (fieldSchema.maximum && typeof value === 'number' && value > fieldSchema.maximum) {
    errors.push(`Valeur maximale: ${fieldSchema.maximum}`);
  }

  if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
    errors.push(`Valeur autorisée: ${fieldSchema.enum.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function getFieldSchema(schema: any, fieldPath: string): any {
  const pathParts = fieldPath.split('.');
  let currentSchema = schema;

  for (const part of pathParts) {
    if (currentSchema.properties && currentSchema.properties[part]) {
      currentSchema = currentSchema.properties[part];
    } else {
      return null;
    }
  }

  return currentSchema;
}

function validateFieldType(value: any, expectedType: string): boolean {
  if (value === null || value === undefined) return true; // Les valeurs null sont gérées par required

  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && !Array.isArray(value);
    default:
      return true;
  }
}

function categorizeError(error: EntityValidationError): string {
  if (error.message.includes('requis')) return 'Champs requis';
  if (error.message.includes('type') || error.message.includes('Type')) return 'Types de données';
  if (error.message.includes('longueur') || error.message.includes('Longueur')) return 'Contraintes de longueur';
  if (error.message.includes('valeur') || error.message.includes('Valeur')) return 'Contraintes de valeur';
  if (error.message.includes('format') || error.message.includes('Format')) return 'Format';
  return 'Autres';
}

function getWarningPriority(warning: EntityValidationWarning): number {
  // Priorité basée sur le code ou le message
  if (warning.code === 'deprecated') return 8;
  if (warning.code === 'performance') return 6;
  if (warning.message.includes('recommandé')) return 4;
  if (warning.message.includes('suggestion')) return 2;
  return 1;
}

function calculateAverageValidationTime(history: Array<{ timestamp: string; result: EntityValidationResult }>): number {
  if (history.length < 2) return 0;

  const intervals: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = new Date(history[i - 1].timestamp).getTime();
    const current = new Date(history[i].timestamp).getTime();
    intervals.push(current - prev);
  }

  return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
}