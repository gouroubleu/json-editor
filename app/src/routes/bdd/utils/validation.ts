// Utilitaires de validation pour les entités
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

/**
 * Valide les données d'une entité selon un schéma JSON Schema
 */
export function validateEntityData(data: any, schema: any): ValidationResult {
  const errors: string[] = [];

  // Fonction récursive pour valider un objet
  const validateObject = (obj: any, objSchema: any, path: string = '') => {
    if (!objSchema.properties) return;

    // Vérifier les champs requis
    if (objSchema.required && Array.isArray(objSchema.required)) {
      objSchema.required.forEach((requiredField: string) => {
        const value = obj[requiredField];
        const fieldPath = path ? `${path}.${requiredField}` : requiredField;

        if (value === undefined || value === null || value === '') {
          errors.push(`Le champ "${requiredField}" est requis`);
        }
      });
    }

    // Valider chaque propriété
    Object.entries(objSchema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
      const value = obj[fieldName];
      const fieldPath = path ? `${path}.${fieldName}` : fieldName;

      if (value === undefined || value === null || value === '') {
        return; // Déjà vérifié dans required ci-dessus
      }

      // Validation selon le type
      switch (fieldSchema.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Le champ "${fieldName}" doit être une chaîne de caractères`);
            break;
          }

          // Validation du format email
          if (fieldSchema.format === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors.push(`Le champ "${fieldName}" doit être un email valide`);
            }
          }

          // Validation du format date
          if (fieldSchema.format === 'date') {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(value)) {
              errors.push(`Le champ "${fieldName}" doit être une date valide (YYYY-MM-DD)`);
            }
          }

          // Validation du format URI
          if (fieldSchema.format === 'uri') {
            try {
              new URL(value);
            } catch {
              errors.push(`Le champ "${fieldName}" doit être une URL valide`);
            }
          }

          // Validation de la longueur
          if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
            errors.push(`Le champ "${fieldName}" doit contenir au moins ${fieldSchema.minLength} caractères`);
          }
          if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
            errors.push(`Le champ "${fieldName}" ne peut pas dépasser ${fieldSchema.maxLength} caractères`);
          }

          // Validation des patterns
          if (fieldSchema.pattern) {
            const pattern = new RegExp(fieldSchema.pattern);
            if (!pattern.test(value)) {
              errors.push(`Le champ "${fieldName}" ne respecte pas le format requis`);
            }
          }
          break;

        case 'number':
        case 'integer':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push(`Le champ "${fieldName}" doit être un nombre`);
            break;
          }
          if (fieldSchema.type === 'integer' && !Number.isInteger(numValue)) {
            errors.push(`Le champ "${fieldName}" doit être un nombre entier`);
            break;
          }
          if (fieldSchema.minimum !== undefined && numValue < fieldSchema.minimum) {
            errors.push(`Le champ "${fieldName}" doit être supérieur ou égal à ${fieldSchema.minimum}`);
          }
          if (fieldSchema.maximum !== undefined && numValue > fieldSchema.maximum) {
            errors.push(`Le champ "${fieldName}" doit être inférieur ou égal à ${fieldSchema.maximum}`);
          }
          if (fieldSchema.exclusiveMinimum !== undefined && numValue <= fieldSchema.exclusiveMinimum) {
            errors.push(`Le champ "${fieldName}" doit être strictement supérieur à ${fieldSchema.exclusiveMinimum}`);
          }
          if (fieldSchema.exclusiveMaximum !== undefined && numValue >= fieldSchema.exclusiveMaximum) {
            errors.push(`Le champ "${fieldName}" doit être strictement inférieur à ${fieldSchema.exclusiveMaximum}`);
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Le champ "${fieldName}" doit être un booléen (true ou false)`);
          }
          break;

        case 'select':
          if (fieldSchema.options && Array.isArray(fieldSchema.options)) {
            const validKeys = fieldSchema.options.map((opt: any) => opt.key);
            if (!validKeys.includes(value)) {
              const validLabels = fieldSchema.options.map((opt: any) => opt.value).join(', ');
              errors.push(`Le champ "${fieldName}" doit être l'une des valeurs autorisées: ${validLabels}`);
            }
          } else if (fieldSchema.enum && Array.isArray(fieldSchema.enum)) {
            // Support de l'ancien format enum
            if (!fieldSchema.enum.includes(value)) {
              errors.push(`Le champ "${fieldName}" doit être l'une des valeurs autorisées: ${fieldSchema.enum.join(', ')}`);
            }
          }
          break;

        case 'object':
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            validateObject(value, fieldSchema, fieldPath);
          } else {
            errors.push(`Le champ "${fieldName}" doit être un objet`);
          }
          break;

        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`Le champ "${fieldName}" doit être un tableau`);
            break;
          }

          // Validation de la longueur du tableau
          if (fieldSchema.minItems !== undefined && value.length < fieldSchema.minItems) {
            errors.push(`Le champ "${fieldName}" doit contenir au moins ${fieldSchema.minItems} éléments`);
          }
          if (fieldSchema.maxItems !== undefined && value.length > fieldSchema.maxItems) {
            errors.push(`Le champ "${fieldName}" ne peut pas contenir plus de ${fieldSchema.maxItems} éléments`);
          }

          // Validation des éléments du tableau
          if (fieldSchema.items) {
            value.forEach((item: any, index: number) => {
              if (fieldSchema.items.type === 'object' && fieldSchema.items.properties) {
                validateObject(item, fieldSchema.items, `${fieldPath}[${index}]`);
              } else {
                // Validation des types primitifs dans le tableau
                switch (fieldSchema.items.type) {
                  case 'string':
                    if (typeof item !== 'string') {
                      errors.push(`L'élément ${index} de "${fieldName}" doit être une chaîne de caractères`);
                    }
                    break;
                  case 'number':
                    if (typeof item !== 'number' || isNaN(item)) {
                      errors.push(`L'élément ${index} de "${fieldName}" doit être un nombre`);
                    }
                    break;
                  case 'integer':
                    if (!Number.isInteger(item)) {
                      errors.push(`L'élément ${index} de "${fieldName}" doit être un nombre entier`);
                    }
                    break;
                  case 'boolean':
                    if (typeof item !== 'boolean') {
                      errors.push(`L'élément ${index} de "${fieldName}" doit être un booléen`);
                    }
                    break;
                }
              }
            });
          }
          break;
      }
    });
  };

  validateObject(data, schema);
  return { isValid: errors.length === 0, errors };
}

/**
 * Valide un champ individuel en temps réel
 */
export function validateField(value: any, fieldSchema: any, fieldName: string, isRequired: boolean = false): ValidationResult {
  const mockSchema = {
    properties: {
      [fieldName]: fieldSchema
    },
    required: isRequired ? [fieldName] : []
  };

  const mockData = {
    [fieldName]: value
  };

  return validateEntityData(mockData, mockSchema);
}