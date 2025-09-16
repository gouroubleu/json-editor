# Entity Creation Context

A comprehensive Qwik context solution for entity creation and editing that eliminates the need for complex prop drilling and provides reactive data management.

## Features

✅ **Reactive Data Management**: Automatically updates all components when entity data changes
✅ **No Props Drilling**: Components read directly from context instead of receiving data through props
✅ **Automatic Column Updates**: Navigation columns update automatically when data changes
✅ **Built-in Navigation**: Handles multi-level navigation through object properties and arrays
✅ **Array Management**: Add/remove array elements with automatic navigation
✅ **Property Management**: Add/remove object properties dynamically
✅ **Modification Tracking**: Tracks whether the entity has been modified
✅ **UI State Management**: Loading, saving, notifications, JSON preview
✅ **Type Safety**: Full TypeScript support with proper typing

## Architecture

### Core Context (`entity-creation-context.tsx`)

The context provides:

- **EntityCreationStore**: Central state management
- **EntityCreationActions**: All data manipulation functions
- **EntityCreationProvider**: Context provider component
- **useEntityCreation**: Hook to access context

### Components

- **ContextualEntityColumn**: Column component that reads from context
- **ContextualHorizontalEntityViewer**: Main viewer that reads from context
- **EntityCreationNotification**: Notification component

### Pages

- **contextual-index.tsx**: New entity creation page using context
- **contextual-edit.tsx**: Entity editing page using context

## Usage

### 1. Basic Setup

Wrap your component tree with the provider:

```tsx
import { EntityCreationProvider } from './context/entity-creation-context';

export default component$(() => {
  const entityData = useEntityLoader();

  return (
    <EntityCreationProvider
      entity={entityData.value.entity}
      schema={entityData.value.schema}
      schemaName={entityData.value.schemaName}
      schemaTitle={entityData.value.schemaTitle}
      schemaVersion={entityData.value.schemaVersion}
    >
      <YourEntityEditor />
    </EntityCreationProvider>
  );
});
```

### 2. Using the Context in Components

```tsx
import { useEntityCreation } from './context/entity-creation-context';

export const MyComponent = component$(() => {
  const { store, actions } = useEntityCreation();

  // Access entity data
  const entityData = store.state.entity.data;

  // Check if modified
  const hasChanges = store.state.modifications.hasChanges;

  // Update data
  const updateField = $((path: string[], value: any) => {
    actions.updateEntityData(path, value);
  });

  return <div>...</div>;
});
```

### 3. Data Operations

#### Update Entity Data
```tsx
// Update a simple property
actions.updateEntityData(['name'], 'New Name');

// Update nested property
actions.updateEntityData(['user', 'profile', 'email'], 'new@email.com');

// Update array element
actions.updateEntityData(['items', '0', 'quantity'], 5);
```

#### Array Operations
```tsx
// Add array element
actions.addArrayElement(['items'], itemSchema);

// Remove array element
actions.removeArrayElement(['items'], 2);
```

#### Property Operations
```tsx
// Add property
actions.addProperty(['user'], 'newField', 'defaultValue');

// Remove property
actions.removeProperty(['user'], 'oldField');
```

#### Navigation
```tsx
// Navigate to property
actions.navigateToProperty('items', 0);

// Navigate to array item
actions.navigateToArrayItem(1, 1);

// Go back
actions.goBack(1);

// Reset navigation
actions.resetNavigation();
```

#### UI Operations
```tsx
// Show notification
actions.showNotification('Success!', 'success');

// Toggle JSON preview
actions.toggleJsonPreview();

// Set loading state
actions.setLoading(true);
```

## State Structure

### EntityCreationState
```tsx
{
  entity: EntityData;           // Current entity being edited
  schema: any;                  // JSON Schema
  schemaName: string;           // Schema identifier
  schemaTitle: string;          // Display title
  schemaVersion: string;        // Schema version
  columns: Array<{              // Navigation columns
    data: any;
    schema: any;
    path: string[];
    parentName: string;
    level: number;
    isArray?: boolean;
    arrayIndex?: number;
  }>;
  navigation: {
    selectedPath: string[];     // Current navigation path
    expandedColumns: number;    // Number of visible columns
  };
  modifications: {
    hasChanges: boolean;        // Whether entity was modified
    originalData: string;       // Original data (JSON string)
  };
}
```

### EntityCreationUI
```tsx
{
  loading: boolean;             // General loading state
  saving: boolean;              // Saving state
  validating: boolean;          // Validation state
  showJsonPreview: boolean;     // JSON preview visibility
  notification: {
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  };
}
```

## Advanced Features

### Automatic Column Updates

The context automatically recalculates navigation columns when:
- Entity data changes
- Navigation path changes
- Array elements are added/removed

### Modification Tracking

The context tracks modifications by:
- Comparing current data with original data (JSON stringified)
- Updating `hasChanges` flag automatically
- Resetting when data is saved

### Deep Path Updates

The context handles complex nested updates:
```tsx
// This will safely create intermediate objects/arrays as needed
actions.updateEntityData(['deeply', 'nested', 'path', '0', 'value'], newValue);
```

### Schema-Aware Defaults

When adding array elements, the context uses the schema to generate appropriate default values:
```tsx
// Uses schema.items to generate default value
actions.addArrayElement(['myArray'], arraySchema);
```

## Migration from Props-Based Components

### Before (Props-based)
```tsx
<EntityColumn
  data={propData}
  schema={propSchema}
  path={propPath}
  onDataChange$={handleChange}
  // ... many other props
/>
```

### After (Context-based)
```tsx
<ContextualEntityColumn
  columnIndex={0}
  isReadOnly={false}
/>
```

## Benefits

1. **Simplified Component API**: Components only need minimal props
2. **Automatic Reactivity**: All components update when data changes
3. **Centralized Logic**: All data manipulation logic in one place
4. **Better Performance**: No unnecessary prop passing
5. **Easier Testing**: Context can be easily mocked
6. **Type Safety**: Full TypeScript support
7. **Consistent State**: Single source of truth for entity state

## Best Practices

1. **Always use the context hook**: Don't access context directly
2. **Use actions for all data changes**: Don't modify store directly
3. **Handle errors**: Actions may throw, wrap in try-catch
4. **Provide loading states**: Use UI state for better UX
5. **Clean up**: Context automatically handles cleanup

## Files Created

- `context/entity-creation-context.tsx` - Main context implementation
- `components/ContextualEntityColumn.tsx` - Context-aware column component
- `components/ContextualHorizontalEntityViewer.tsx` - Context-aware viewer
- `new/contextual-index.tsx` - Context-based new entity page
- `[id]/contextual-edit.tsx` - Context-based edit entity page

## Integration

The context follows the same patterns as the existing `SchemaEditorContext` in your codebase, ensuring consistency and maintainability.

To integrate:

1. Replace existing prop-based components with contextual versions
2. Update page components to use the provider
3. Remove complex prop drilling logic
4. Enjoy simplified, reactive entity management!