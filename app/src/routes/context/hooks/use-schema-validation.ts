import { $, useComputed$ } from '@builder.io/qwik';
import { useSchemaEditor } from '../provider';
import { validateProperty } from '../utils';

/**
 * Hook pour la validation du schéma en temps réel
 */
export const useSchemaValidation = () => {
  const { state, actions } = useSchemaEditor();

  // Validation en temps réel des propriétés
  const propertyErrors = useComputed$(() => {
    const errors: Record<string, string[]> = {};

    const validatePropertiesRecursive = (properties: typeof state.currentSchema.properties, path = '') => {
      properties.forEach((property, index) => {
        const currentPath = path ? `${path}.${property.name}` : property.name;
        const propertyValidationErrors = validateProperty(property);

        if (propertyValidationErrors.length > 0) {
          errors[property.id || currentPath] = propertyValidationErrors;
        }

        // Valider les propriétés imbriquées
        if (property.properties) {
          validatePropertiesRecursive(property.properties, currentPath);
        }

        // Valider les propriétés des arrays
        if (property.items?.properties) {
          validatePropertiesRecursive(property.items.properties, `${currentPath}[]`);
        }
      });
    };

    validatePropertiesRecursive(state.currentSchema.properties);
    return errors;
  });

  // Validation globale du schéma
  const schemaValidation = useComputed$(() => {
    const errors: string[] = [];

    // Validation des informations de base
    if (!state.currentSchema.schemaInfo.name.trim()) {
      errors.push('Le nom du schéma est requis');
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(state.currentSchema.schemaInfo.name)) {
      errors.push('Le nom du schéma doit être un identifiant valide');
    }

    // Validation des propriétés
    if (state.currentSchema.properties.length === 0) {
      errors.push('Le schéma doit avoir au moins une propriété');
    }

    // Vérifier les noms de propriétés dupliqués
    const propertyNames = new Set<string>();
    const checkDuplicates = (properties: typeof state.currentSchema.properties, path = '') => {
      properties.forEach(property => {
        const fullName = path ? `${path}.${property.name}` : property.name;
        if (propertyNames.has(fullName)) {
          errors.push(`Nom de propriété dupliqué: ${fullName}`);
        } else {
          propertyNames.add(fullName);
        }

        if (property.properties) {
          checkDuplicates(property.properties, fullName);
        }
        if (property.items?.properties) {
          checkDuplicates(property.items.properties, `${fullName}[]`);
        }
      });
    };

    checkDuplicates(state.currentSchema.properties);

    // Ajouter les erreurs de propriétés individuelles
    Object.values(propertyErrors.value).forEach(propErrors => {
      errors.push(...propErrors);
    });

    return {
      isValid: errors.length === 0,
      errors,
      propertyErrors: propertyErrors.value
    };
  });

  // Actions de validation
  const validateSchemaAsync = $(async () => {
    return await actions.schemas.validate();
  });

  const validateProperty = $(async (propertyId: string) => {
    const errors = propertyErrors.value[propertyId] || [];
    return {
      isValid: errors.length === 0,
      errors
    };
  });

  return {
    schemaValidation,
    propertyErrors,
    validateSchemaAsync,
    validateProperty,
    isValid: schemaValidation.value.isValid
  };
};