# Guide d'utilisation du contexte SchemaEditor

## Installation et configuration

### 1. Importer le contexte

```tsx
import {
  SchemaEditorProvider,
  useSchemas,
  useSchemaProperties,
  useSchemaValidation,
  useNotifications,
  createDefaultConfig
} from './routes/bo/schemaEditor/context';
```

### 2. Configurer le Provider

```tsx
import { component$ } from '@builder.io/qwik';

export const App = component$(() => {
  return (
    <SchemaEditorProvider>
      <YourComponents />
    </SchemaEditorProvider>
  );
});
```

### 3. Configuration avancée (optionnelle)

```tsx
const config = createDefaultConfig({
  cache: {
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 100
  },
  drafts: {
    autoSaveEnabled: true,
    autoSaveInterval: 3000 // 3 secondes
  },
  notifications: {
    maxNotifications: 10,
    defaultDuration: 4000
  }
});

// Le Provider utilise automatiquement la configuration par défaut
```

## Hooks disponibles

### 1. useSchemas - Gestion des schémas

```tsx
const MySchemasList = component$(() => {
  const {
    schemas,
    selectedSchema,
    isLoading,
    searchQuery,
    loadAll,
    create,
    update,
    delete: deleteSchema,
    select,
    setSearchQuery
  } = useSchemas();

  useTask$(async () => {
    await loadAll(); // Charger tous les schémas
  });

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onInput$={(ev) => setSearchQuery(ev.target.value)}
        placeholder="Rechercher un schéma..."
      />

      {isLoading && <p>Chargement...</p>}

      {schemas.value.map(schema => (
        <div key={schema.name} onClick$={() => select(schema.name)}>
          <h3>{schema.schema.title}</h3>
          <p>{schema.schema.description}</p>
        </div>
      ))}
    </div>
  );
});
```

### 2. useSchemaProperties - Gestion des propriétés

```tsx
const PropertyEditor = component$(() => {
  const {
    properties,
    selectedProperty,
    expandedProperties,
    add,
    update,
    delete: deleteProperty,
    expand,
    collapse,
    toggleExpansion
  } = useSchemaProperties();

  const addNewProperty = $(() => {
    add({
      name: 'nouvelle-propriete',
      type: 'string',
      required: false,
      description: 'Description de la propriété',
      level: 0,
      isExpanded: false
    });
  });

  return (
    <div>
      <button onClick$={addNewProperty}>
        Ajouter une propriété
      </button>

      {properties.value.map(property => (
        <div key={property.id}>
          <button onClick$={() => toggleExpansion(property.id!)}>
            {expandedProperties.value.has(property.id!) ? '−' : '+'}
          </button>
          <span>{property.name} ({property.type})</span>

          {property.properties && expandedProperties.value.has(property.id!) && (
            <div style="margin-left: 20px">
              {property.properties.map(childProp => (
                <div key={childProp.id}>
                  {childProp.name} ({childProp.type})
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});
```

### 3. useSchemaValidation - Validation en temps réel

```tsx
const ValidationPanel = component$(() => {
  const {
    isValid,
    errors,
    isValidating,
    validationEnabled,
    validate,
    toggleValidation
  } = useSchemaValidation();

  return (
    <div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={validationEnabled}
            onChange$={toggleValidation}
          />
          Validation activée
        </label>
      </div>

      <div>
        <button onClick$={validate} disabled={isValidating}>
          {isValidating ? 'Validation...' : 'Valider maintenant'}
        </button>
      </div>

      <div class={isValid.value ? 'valid' : 'invalid'}>
        {isValid.value ? (
          <p>✅ Schéma valide</p>
        ) : (
          <div>
            <p>❌ Erreurs de validation:</p>
            <ul>
              {errors.value.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
});
```

### 4. useNotifications - Système de notifications

```tsx
const NotificationSystem = component$(() => {
  const {
    notifications,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll
  } = useNotifications();

  return (
    <div>
      <div class="notification-actions">
        <button onClick$={() => success('Succès', 'Opération réussie!')}>
          Notification succès
        </button>
        <button onClick$={() => error('Erreur', 'Une erreur est survenue')}>
          Notification erreur
        </button>
        <button onClick$={() => warning('Attention', 'Attention à cela')}>
          Notification avertissement
        </button>
        <button onClick$={() => info('Info', 'Information utile')}>
          Notification info
        </button>
        <button onClick$={dismissAll}>
          Effacer toutes les notifications
        </button>
      </div>

      <div class="notifications">
        {notifications.value.map(notification => (
          <div
            key={notification.id}
            class={`notification notification-${notification.type}`}
          >
            <h4>{notification.title}</h4>
            <p>{notification.message}</p>
            <button onClick$={() => dismiss(notification.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
});
```

### 5. useSchemaCache - Gestion du cache

```tsx
const CacheManager = component$(() => {
  const {
    stats,
    size,
    maxSize,
    ttl,
    invalidate,
    invalidateAll,
    cleanup,
    setTTL,
    setMaxSize
  } = useSchemaCache();

  return (
    <div>
      <h3>Statistiques du cache</h3>
      <p>Taille: {size.value} / {maxSize}</p>
      <p>TTL: {ttl}ms</p>
      <p>Entrées totales: {stats.value.totalEntries}</p>

      <div>
        <button onClick$={() => setTTL(10 * 60 * 1000)}>
          TTL 10 minutes
        </button>
        <button onClick$={() => setMaxSize(100)}>
          Taille max 100
        </button>
        <button onClick$={cleanup}>
          Nettoyer le cache
        </button>
        <button onClick$={invalidateAll}>
          Vider le cache
        </button>
      </div>
    </div>
  );
});
```

### 6. useDraftManager - Gestion des brouillons

```tsx
const DraftManager = component$(() => {
  const {
    currentDraft,
    hasDraft,
    drafts,
    autoSaveEnabled,
    save,
    load,
    delete: deleteDraft,
    restore,
    enableAutoSave,
    disableAutoSave,
    triggerAutoSave
  } = useDraftManager();

  return (
    <div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={autoSaveEnabled}
            onChange$={(ev) => {
              if (ev.target.checked) {
                enableAutoSave();
              } else {
                disableAutoSave();
              }
            }}
          />
          Auto-sauvegarde activée
        </label>
      </div>

      <div>
        <button onClick$={triggerAutoSave}>
          Sauvegarder maintenant
        </button>
      </div>

      <div>
        <h4>Brouillons disponibles:</h4>
        {drafts.value.map(draft => (
          <div key={draft.name}>
            <span>{draft.name}</span>
            <button onClick$={() => restore(draft.name)}>
              Restaurer
            </button>
            <button onClick$={() => deleteDraft(draft.name)}>
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});
```

## Hooks utilitaires

### useSchemaImportExport

```tsx
const ImportExport = component$(() => {
  const {
    exportToJson,
    exportToYaml,
    importFromJson,
    importFromYaml
  } = useSchemaImportExport();

  const handleExport = $((schemaName: string, format: 'json' | 'yaml') => {
    const content = format === 'json'
      ? exportToJson(schemaName)
      : exportToYaml(schemaName);

    // Télécharger le fichier
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schemaName}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const handleImport = $(async (content: string, format: 'json' | 'yaml') => {
    const result = await (format === 'json'
      ? importFromJson(content)
      : importFromYaml(content));

    if (result.success) {
      console.log('Import réussi:', result.schema);
    } else {
      console.error('Erreur d\'import:', result.errors);
    }
  });

  return (
    <div>
      <button onClick$={() => handleExport('mon-schema', 'json')}>
        Exporter en JSON
      </button>
      <button onClick$={() => handleExport('mon-schema', 'yaml')}>
        Exporter en YAML
      </button>
    </div>
  );
});
```

## Patterns d'utilisation avancée

### 1. Composition de hooks

```tsx
const SchemaEditor = component$(() => {
  const schemas = useSchemas();
  const properties = useSchemaProperties();
  const validation = useSchemaValidation();
  const notifications = useNotifications();

  // Validation automatique lors des changements
  useTask$(({ track }) => {
    track(() => properties.properties.value);

    if (validation.validationEnabled) {
      validation.validate();
    }
  });

  // Notification automatique des erreurs
  useTask$(({ track }) => {
    const errors = track(() => validation.errors.value);

    if (errors.length > 0) {
      notifications.error(
        'Erreurs de validation',
        `${errors.length} erreur(s) détectée(s)`
      );
    }
  });

  return (
    <div>
      {/* Votre interface */}
    </div>
  );
});
```

### 2. Synchronisation avec l'état global

```tsx
const SynchronizedEditor = component$(() => {
  const schemas = useSchemas();
  const sync = useSchemaSynchronization();

  useTask$(({ track }) => {
    track(() => sync.needsSync.value);

    if (sync.needsSync.value) {
      sync.syncWithServer();
    }
  });

  return (
    <div>
      {sync.needsSync.value && (
        <div class="sync-indicator">
          Synchronisation nécessaire...
        </div>
      )}
    </div>
  );
});
```

## Bonnes pratiques

1. **Utilisez les hooks spécialisés** plutôt que le hook principal pour des cas d'usage spécifiques
2. **Activez la validation automatique** pour une meilleure UX
3. **Configurez l'auto-sauvegarde** selon vos besoins
4. **Gérez les notifications** pour informer l'utilisateur
5. **Utilisez le cache intelligemment** pour optimiser les performances
6. **Composez les hooks** pour créer des fonctionnalités complexes

## Dépannage

### Erreur "useSchemaEditor must be used within a SchemaEditorProvider"
Assurez-vous que votre composant est bien enveloppé dans le `SchemaEditorProvider`.

### Les changements ne sont pas sauvegardés automatiquement
Vérifiez que l'auto-sauvegarde est activée avec `useDraftManager().enableAutoSave()`.

### Les notifications ne s'affichent pas
Utilisez le hook `useNotifications()` et gérez l'affichage des notifications dans votre interface.

### Performances dégradées
Ajustez la configuration du cache et utilisez les hooks spécialisés pour éviter les re-renders inutiles.