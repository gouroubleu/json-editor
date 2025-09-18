import { component$, useSignal, useStore } from '@builder.io/qwik';
import { JsonSchema } from '../routes/types';

type DynamicFormProps = {
  schema: JsonSchema;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
}

export const DynamicForm = component$<DynamicFormProps>(({ schema, initialData = {}, onSubmit, onCancel }) => {
  const formData = useStore(initialData);
  const errors = useSignal<Record<string, string>>({});

  const validateField = (name: string, value: any, property: any) => {
    const fieldErrors: string[] = [];

    if (schema.required?.includes(name) && (!value || (typeof value === 'string' && !value.trim()))) {
      fieldErrors.push(`${name} is required`);
    }

    if (property.type === 'string' && value && typeof value !== 'string') {
      fieldErrors.push(`${name} must be a string`);
    }

    if (property.type === 'number' && value && isNaN(Number(value))) {
      fieldErrors.push(`${name} must be a number`);
    }

    if (property.minLength && value && value.length < property.minLength) {
      fieldErrors.push(`${name} must be at least ${property.minLength} characters`);
    }

    if (property.maxLength && value && value.length > property.maxLength) {
      fieldErrors.push(`${name} must be at most ${property.maxLength} characters`);
    }

    if (property.pattern && value && !new RegExp(property.pattern).test(value)) {
      fieldErrors.push(`${name} format is invalid`);
    }

    return fieldErrors.length > 0 ? fieldErrors[0] : null;
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate all fields
    Object.entries(schema.properties || {}).forEach(([name, property]) => {
      const error = validateField(name, formData[name], property);
      if (error) {
        newErrors[name] = error;
      }
    });

    errors.value = newErrors;

    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    }
  };

  const renderField = (name: string, property: any) => {
    const isRequired = schema.required?.includes(name);
    const error = errors.value[name];

    switch (property.type) {
      case 'string':
        if (property.enum) {
          return (
            <select
              value={formData[name] || ''}
              onChange$={(e: any) => formData[name] = e.target.value}
              class={`form-control ${error ? 'is-invalid' : ''}`}
              required={isRequired}
            >
              <option value="">Select {property.title || name}</option>
              {property.enum.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          );
        }
        
        if (property.format === 'textarea') {
          return (
            <textarea
              value={formData[name] || ''}
              onInput$={(e: any) => formData[name] = e.target.value}
              class={`form-control ${error ? 'is-invalid' : ''}`}
              rows={4}
              placeholder={property.description}
              required={isRequired}
            />
          );
        }

        return (
          <input
            type={property.format === 'email' ? 'email' : property.format === 'date' ? 'date' : 'text'}
            value={formData[name] || ''}
            onInput$={(e: any) => formData[name] = e.target.value}
            class={`form-control ${error ? 'is-invalid' : ''}`}
            placeholder={property.description}
            required={isRequired}
          />
        );

      case 'number':
      case 'integer':
        return (
          <input
            type="number"
            value={formData[name] || ''}
            onInput$={(e: any) => formData[name] = property.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value)}
            class={`form-control ${error ? 'is-invalid' : ''}`}
            placeholder={property.description}
            min={property.minimum}
            max={property.maximum}
            step={property.type === 'integer' ? 1 : 'any'}
            required={isRequired}
          />
        );

      case 'boolean':
        return (
          <div class="form-check">
            <input
              type="checkbox"
              checked={!!formData[name]}
              onChange$={(e: any) => formData[name] = e.target.checked}
              class="form-check-input"
              id={`field-${name}`}
            />
            <label class="form-check-label" for={`field-${name}`}>
              {property.title || name}
            </label>
          </div>
        );

      case 'select':
        return (
          <select
            value={formData[name] || ''}
            onChange$={(e: any) => formData[name] = e.target.value}
            class={`form-control ${error ? 'is-invalid' : ''}`}
            required={isRequired}
          >
            <option value="">Select {property.title || name}</option>
            {property.options && property.options.map((option: any) => (
              <option key={option.key} value={option.key}>{option.value}</option>
            ))}
          </select>
        );

      case 'array':
        const arrayValue = formData[name] || [];
        return (
          <div class="array-field">
            {arrayValue.map((item: any, index: number) => (
              <div key={index} class="array-item">
                <input
                  type="text"
                  value={item || ''}
                  onInput$={(e: any) => {
                    const newArray = [...arrayValue];
                    newArray[index] = e.target.value;
                    formData[name] = newArray;
                  }}
                  class="form-control"
                  placeholder={`${property.title || name} ${index + 1}`}
                />
                <button
                  type="button"
                  onClick$={() => {
                    const newArray = arrayValue.filter((_: any, i: number) => i !== index);
                    formData[name] = newArray;
                  }}
                  class="btn btn-sm btn-danger"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick$={() => {
                formData[name] = [...arrayValue, ''];
              }}
              class="btn btn-sm btn-secondary"
            >
              Add {property.title || name}
            </button>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={formData[name] || ''}
            onInput$={(e: any) => formData[name] = e.target.value}
            class={`form-control ${error ? 'is-invalid' : ''}`}
            placeholder={property.description}
            required={isRequired}
          />
        );
    }
  };

  return (
    <div class="dynamic-form">
      <h3>{schema.title || schema.name}</h3>
      {schema.description && <p class="text-muted">{schema.description}</p>}
      
      <form onSubmit$={(e) => { e.preventDefault(); handleSubmit(); }}>
        {Object.entries(schema.properties || {}).map(([name, property]: [string, any]) => (
          <div key={name} class="form-group mb-3">
            <label class="form-label">
              {property.title || name}
              {schema.required?.includes(name) && <span class="text-danger">*</span>}
            </label>
            {renderField(name, property)}
            {property.description && !['boolean'].includes(property.type) && (
              <small class="form-text text-muted">{property.description}</small>
            )}
            {errors.value[name] && (
              <div class="invalid-feedback d-block">{errors.value[name]}</div>
            )}
          </div>
        ))}
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary me-2">
            Save
          </button>
          {onCancel && (
            <button type="button" onClick$={onCancel} class="btn btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
});