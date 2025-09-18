# Contexte SchemaEditor - Documentation Complète

## 📖 Vue d'ensemble

Le contexte SchemaEditor est un système de gestion d'état centralisé pour l'éditeur de schémas JSON. Il remplace l'architecture dispersée basée sur `useStore` par un système cohérent et maintenable.

## 🎯 Objectifs

- **Centraliser l'état** : Un seul endroit pour gérer les schémas, propriétés et validations
- **Éliminer le props drilling** : Accès direct aux données depuis n'importe quel composant
- **Simplifier les composants** : Moins de logique locale, plus de réutilisabilité
- **Améliorer l'UX** : Auto-save intelligent, notifications cohérentes, état synchronisé
- **Faciliter la maintenance** : Logique métier centralisée et testable

## 📁 Structure des fichiers

```
src/routes/context/
├── schema-editor-context.tsx    # Contexte principal avec hooks
├── provider.tsx                 # Provider avec gestion d'état
├── example.tsx                  # Exemple d'utilisation simple
├── example-usage.tsx           # Exemple d'utilisation avancée
├── test-integration.tsx        # Tests d'intégration
├── migration-guide.md          # Guide de migration détaillé
├── migration-examples.tsx      # Exemples avant/après
├── migration-patterns.tsx      # Patterns et hooks de migration
├── contextualized-components.tsx # Versions contextualisées
├── integration-examples.tsx    # Exemples d'intégration pratique
└── README.md                   # Cette documentation
```

## 🚀 Démarrage rapide

### 1. Installation du Provider

Wrappez votre application avec le provider :

```tsx
import { SchemaEditorProvider } from './context/provider';

export default component$(() => {
  return (
    <SchemaEditorProvider>
      <YourApp />
    </SchemaEditorProvider>
  );
});
```

### 2. Utilisation dans un composant

```tsx
import {
  useSchemaState,
  useSchemaActions,
  useSchemaNotifications
} from './context/schema-editor-context';

export const MyComponent = component$(() => {
  // Récupération de l'état
  const { schemas, currentSchema, loading } = useSchemaState();

  // Récupération des actions
  const { addProperty, saveCurrentSchema } = useSchemaActions();

  // Récupération des notifications
  const { showNotification } = useSchemaNotifications();

  const handleSave = $(async () => {
    const result = await saveCurrentSchema();
    if (result.success) {
      showNotification('success', 'Schéma sauvegardé !');
    }
  });

  return (
    <div>
      <h1>{currentSchema.name}</h1>
      <p>Schémas disponibles : {schemas.length}</p>
      <button onClick$={handleSave} disabled={loading}>
        Sauvegarder
      </button>
    </div>
  );
});
```

## 🔧 API Complète

### useSchemaState()

Récupère l'état en lecture seule :

```tsx
const {
  // Liste des schémas
  schemas: Schema[],
  loading: boolean,
  statistics: {
    totalSchemas: number,
    modifiedToday: number
  },

  // Schéma en cours d'édition
  currentSchema: SchemaInfo,
  currentProperties: SchemaProperty[],

  // Validation
  validationState: {
    isValid: boolean,
    errors: string[]
  },

  // JSON généré
  generatedJson: string,

  // Auto-save
  autoSaveState: {
    isActive: boolean,
    lastSaved: string | null
  },

  // Brouillons
  draftState: {
    hasDraft: boolean,
    showModal: boolean
  }
} = useSchemaState();
```

### useSchemaActions()

Récupère les actions pour modifier l'état :

```tsx
const {
  // Gestion des schémas
  refreshSchemas: () => Promise<void>,
  deleteSchema: (id: string) => Promise<ActionResult>,
  copySchemaToClipboard: (schema: any) => Promise<ActionResult>,

  // Édition de schémas
  startEditing: (schemaId: string | null) => void,
  updateSchemaInfo: (updates: Partial<SchemaInfo>) => void,
  saveCurrentSchema: () => Promise<ActionResult>,

  // Gestion des propriétés
  addProperty: (parentId: string | null, name: string, type: JsonSchemaType, required: boolean, description: string) => Promise<ActionResult>,
  removeProperty: (propertyId: string) => Promise<ActionResult>,
  updateProperty: (propertyId: string, updates: Partial<SchemaProperty>) => Promise<ActionResult>,
  updatePropertyType: (propertyId: string, newType: JsonSchemaType) => Promise<ActionResult>,
  updateArrayItemType: (arrayPropertyId: string, newItemType: JsonSchemaType) => Promise<ActionResult>,

  // Utilitaires
  copyJsonToClipboard: () => Promise<ActionResult>,

  // Brouillons
  restoreDraft: () => Promise<ActionResult>,
  clearDraft: () => void,

  // Configuration
  configureAutoSave: (config: AutoSaveConfig) => void
} = useSchemaActions();
```

### useSchemaNotifications()

Récupère le système de notifications :

```tsx
const {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void,
  clearNotifications: () => void
} = useSchemaNotifications();
```

## 🔄 Migration depuis l'ancien système

### Avant (useStore local)

```tsx
export const OldComponent = component$(() => {
  const schemas = useStore([]);
  const uiState = useStore({
    notification: { show: false, type: 'success', message: '' },
    loading: false
  });

  const handleDelete = $(async (id: string) => {
    uiState.loading = true;
    try {
      const result = await deleteSchema(id);
      if (result.success) {
        // Recharger manuellement
        const newSchemas = await loadSchemas();
        schemas.splice(0, schemas.length, ...newSchemas);
        // Notification manuelle
        uiState.notification = { show: true, type: 'success', message: 'Supprimé' };
      }
    } finally {
      uiState.loading = false;
    }
  });

  return (
    <div>
      {schemas.map(schema => (
        <div key={schema.id}>
          {schema.name}
          <button onClick$={() => handleDelete(schema.id)}>Supprimer</button>
        </div>
      ))}
      {uiState.notification.show && (
        <div class={`notification ${uiState.notification.type}`}>
          {uiState.notification.message}
        </div>
      )}
    </div>
  );
});
```

### Après (contexte)

```tsx
export const NewComponent = component$(() => {
  const { schemas, loading } = useSchemaState();
  const { deleteSchema } = useSchemaActions();
  const { showNotification } = useSchemaNotifications();

  const handleDelete = $(async (id: string) => {
    const result = await deleteSchema(id);
    if (result.success) {
      showNotification('success', 'Supprimé');
      // La liste se recharge automatiquement
    }
  });

  return (
    <div>
      {schemas.map(schema => (
        <div key={schema.id}>
          {schema.name}
          <button onClick$={() => handleDelete(schema.id)} disabled={loading}>
            Supprimer
          </button>
        </div>
      ))}
      {/* Notifications gérées automatiquement */}
    </div>
  );
});
```

## 🎨 Patterns avancés

### Auto-save intelligent

```tsx
export const SmartEditor = component$(() => {
  const { autoSaveState } = useSchemaState();
  const { configureAutoSave, updateSchemaInfo } = useSchemaActions();

  // Configuration de l'auto-save
  configureAutoSave({
    enabled: true,
    interval: 5000, // 5 secondes
    condition: (changes) => changes.significantChanges
  });

  return (
    <div>
      <input
        onInput$={(e) => updateSchemaInfo({
          name: (e.target as HTMLInputElement).value
        })}
      />
      {autoSaveState.isActive && (
        <div class="auto-save-indicator">
          💾 Dernière sauvegarde : {autoSaveState.lastSaved}
        </div>
      )}
    </div>
  );
});
```

### Validation en temps réel

```tsx
export const ValidatedForm = component$(() => {
  const { currentSchema, validationState } = useSchemaState();
  const { updateSchemaInfo } = useSchemaActions();

  return (
    <form>
      <input
        value={currentSchema.name}
        onInput$={(e) => updateSchemaInfo({
          name: (e.target as HTMLInputElement).value
        })}
        class={validationState.isValid ? 'valid' : 'invalid'}
      />

      {/* Erreurs affichées automatiquement */}
      {validationState.errors.map(error => (
        <div key={error} class="error">{error}</div>
      ))}

      <button type="submit" disabled={!validationState.isValid}>
        Sauvegarder
      </button>
    </form>
  );
});
```

### Gestion des brouillons

```tsx
export const DraftAwareEditor = component$(() => {
  const { draftState } = useSchemaState();
  const { restoreDraft, clearDraft } = useSchemaActions();

  return (
    <div>
      {/* Modal automatique pour les brouillons */}
      {draftState.hasDraft && draftState.showModal && (
        <div class="draft-modal">
          <h2>Brouillon détecté</h2>
          <p>Voulez-vous restaurer vos modifications ?</p>
          <button onClick$={() => restoreDraft()}>
            Restaurer
          </button>
          <button onClick$={() => clearDraft()}>
            Ignorer
          </button>
        </div>
      )}

      {/* Votre éditeur */}
      <YourEditor />
    </div>
  );
});
```

## 🧪 Tests et debug

### Mode debug

```tsx
import { MigrationDebugPanel } from './context/migration-patterns';

export const DebugApp = component$(() => {
  return (
    <div>
      <YourApp />
      <MigrationDebugPanel /> {/* Affiche l'état du contexte en dev */}
    </div>
  );
});
```

### Tests d'intégration

```tsx
import { render } from '@builder.io/qwik/testing';
import { SchemaEditorProvider } from './context/provider';

test('should update schema name', async () => {
  const { screen, userEvent } = await render(
    <SchemaEditorProvider>
      <YourComponent />
    </SchemaEditorProvider>
  );

  const input = screen.getByRole('textbox');
  await userEvent.type(input, 'nouveau-nom');

  // Vérifications...
});
```

## 📊 Performance

Le contexte est optimisé pour :

- **Mise à jour sélective** : Seuls les composants utilisant les données modifiées se re-rendent
- **Mémorisation intelligente** : Les actions et les données complexes sont mémorisées
- **Auto-save optimisé** : Debouncing et conditions intelligentes
- **Lazy loading** : Chargement différé des schémas non utilisés

## 🔒 Sécurité

- **Validation centralisée** : Toutes les données passent par la validation du contexte
- **État immutable** : Modifications contrôlées via les actions uniquement
- **Sanitization** : Nettoyage automatique des entrées utilisateur

## 🐛 Dépannage

### Le contexte n'est pas disponible

```
Error: useSchemaState must be used within SchemaEditorProvider
```

**Solution** : Wrappez votre composant avec `SchemaEditorProvider`

### L'état ne se met pas à jour

**Vérifiez** :
1. Utilisez-vous les actions du contexte pour modifier l'état ?
2. Le provider est-il correctement placé ?
3. Y a-t-il des erreurs dans la console ?

### Performance dégradée

**Optimisations** :
1. Utilisez `useSchemaState()` seulement pour les données nécessaires
2. Évitez de déconstruire tout l'état si vous n'en avez besoin que d'une partie
3. Vérifiez que l'auto-save n'est pas trop fréquent

## 🚀 Roadmap

### Fonctionnalités prévues

- [ ] Undo/Redo intégré
- [ ] Collaboration en temps réel
- [ ] Cache intelligent avec IndexedDB
- [ ] Plugins pour extensions tierces
- [ ] Mode hors ligne

### Améliorations techniques

- [ ] Tests unitaires complets
- [ ] Documentation interactive
- [ ] Métriques de performance
- [ ] Monitoring d'erreurs
- [ ] A/B testing framework

## 🤝 Contribution

Pour contribuer au contexte SchemaEditor :

1. Étudiez les patterns existants dans `migration-examples.tsx`
2. Ajoutez vos nouveaux hooks dans `schema-editor-context.tsx`
3. Mettez à jour les tests dans `test-integration.tsx`
4. Documentez vos changements

## 📚 Ressources additionnelles

- **Guide de migration** : `migration-guide.md`
- **Exemples pratiques** : `integration-examples.tsx`
- **Patterns réutilisables** : `migration-patterns.tsx`
- **Tests** : `test-integration.tsx`

---

**Créé avec ❤️ pour améliorer l'expérience de développement du SchemaEditor**