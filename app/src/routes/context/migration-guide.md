# Guide de Migration vers le Contexte SchemaEditor

Ce guide présente la migration des composants existants vers le nouveau système de contexte centralisé. Il élimine les problèmes de props drilling, simplifie la gestion d'état et améliore la maintenabilité.

## 📋 Vue d'ensemble

### Problèmes actuels identifiés

1. **Props Drilling excessif** : Les propriétés sont passées à travers plusieurs niveaux de composants
2. **État dispersé** : Chaque composant gère son propre état local avec `useStore`
3. **Handlers dupliqués** : Même logique répétée dans plusieurs composants
4. **Notifications locales** : Système de notifications géré individuellement
5. **Auto-save manuel** : Logique d'auto-sauvegarde complexe et répétitive

### Avantages du nouveau contexte

1. **État centralisé** : Un seul endroit pour gérer l'état de l'application
2. **Actions unifiées** : Logique métier centralisée dans le contexte
3. **Notifications globales** : Système de notifications cohérent
4. **Auto-save automatique** : Sauvegarde intelligente intégrée
5. **Props simplifiées** : Élimination du props drilling

## 🔧 Patterns de Migration

### 1. Migration de l'état local vers le contexte

#### AVANT - État local dispersé
```tsx
// Dans chaque composant
const schemas = useStore([]);
const uiState = useStore({
  notification: { show: false, type: 'success', message: '' },
  loading: false
});
```

#### APRÈS - État centralisé
```tsx
// Récupération depuis le contexte
const { schemas, loading } = useSchemaState();
const { showNotification } = useSchemaNotifications();
```

### 2. Élimination du Props Drilling

#### AVANT - Props Drilling
```tsx
// Composant parent
<HorizontalSchemaEditor
  schemaInfo={schemaInfo}
  properties={properties}
  onUpdateSchemaInfo$={handleUpdateSchemaInfo}
  onAddProperty$={handleAddProperty}
  onRemoveProperty$={handleRemoveProperty}
  onUpdateProperty$={handleUpdatePropertyWrapper}
  onUpdatePropertyType$={handleUpdatePropertyTypeWrapper}
  onUpdateArrayItemType$={handleUpdateArrayItemTypeWrapper}
  generatedJson={uiState.generatedJson}
  validationErrors={uiState.validationErrors}
  isValid={uiState.isValid}
  onCopyJson$={handleCopyJson}
  onSave$={handleSave}
  hasModifications={uiState.hasModifications}
/>

// Composant enfant qui propage encore plus loin
<PropertyColumn
  properties={props.properties}
  onAddProperty$={props.onAddProperty$}
  onRemoveProperty$={props.onRemoveProperty$}
  onUpdateProperty$={props.onUpdateProperty$}
  // ... 15+ props
/>
```

#### APRÈS - Accès direct au contexte
```tsx
// Composant parent simplifié
<ContextualHorizontalSchemaEditor
  onSave$={handleSave}
/>

// Composant enfant avec accès direct
export const ContextualPropertyColumn = component$(() => {
  // Accès direct au contexte, plus de props drilling
  const { currentProperties } = useSchemaState();
  const { addProperty, removeProperty } = useSchemaActions();

  return (
    // Interface directe
  );
});
```

### 3. Simplification des handlers

#### AVANT - Handlers complexes et répétés
```tsx
const handleDelete = $(async (schemaId: string, schemaName: string) => {
  if (confirm(`Êtes-vous sûr de vouloir supprimer le schéma "${schemaName}" ?`)) {
    uiState.value.loading = true;

    try {
      const result = await deleteSchema(schemaId);

      if (result.success) {
        // Recharger manuellement la liste
        const schemas = await handleLoadSchemas();
        savedSchemas.value = schemas.map(schema => ({
          id: schema.name,
          ...schema
        }));

        // Gestion manuelle des notifications
        await handleShowNotification('success', result.message, uiState.value);
      } else {
        await handleShowNotification('error', result.message, uiState.value);
      }
    } catch (error) {
      await handleShowNotification('error', 'Erreur lors de la suppression', uiState.value);
    } finally {
      uiState.value.loading = false;
    }
  }
});
```

#### APRÈS - Handlers simplifiés
```tsx
const handleDelete = $(async (schemaId: string, schemaName: string) => {
  if (confirm(`Êtes-vous sûr de vouloir supprimer le schéma "${schemaName}" ?`)) {
    const result = await deleteSchema(schemaId); // Action du contexte
    if (result.success) {
      showNotification('success', result.message);
      // La liste se recharge automatiquement
    } else {
      showNotification('error', result.message);
    }
  }
});
```

### 4. Notifications centralisées

#### AVANT - Notifications locales
```tsx
const notificationState = useStore({
  show: false,
  type: 'success' as 'success' | 'error' | 'info',
  message: ''
});

const showNotification = $(async (type: string, message: string) => {
  notificationState.show = true;
  notificationState.type = type as any;
  notificationState.message = message;

  setTimeout(() => {
    notificationState.show = false;
  }, 3000);
});

// Dans le template
{notificationState.show && (
  <div class={`notification ${notificationState.type}`}>
    {notificationState.message}
  </div>
)}
```

#### APRÈS - Notifications globales
```tsx
// Utilisation simple
const { showNotification } = useSchemaNotifications();

// Affichage automatique via le contexte
showNotification('success', 'Action réussie');

// Plus besoin de template local - géré par le provider
```

### 5. Auto-save intelligent

#### AVANT - Auto-save manuel complexe
```tsx
// Auto-save toutes les 10 secondes
useVisibleTask$(({ track }) => {
  track(() => schemaInfo.name);
  track(() => schemaInfo.title);
  track(() => schemaInfo.description);
  track(() => properties.length);
  track(() => JSON.stringify(properties));

  uiState.hasUnsavedChanges = true;

  if (uiState.autoSaveTimer) {
    clearTimeout(uiState.autoSaveTimer);
  }

  uiState.autoSaveTimer = setTimeout(async () => {
    ensureAllPropertyIds(properties);
    await handleAutoSave(schemaInfo, properties);
    uiState.lastSaved = new Date().toLocaleTimeString();
  }, 10000);
});
```

#### APRÈS - Auto-save automatique
```tsx
// Plus besoin de gérer l'auto-save manuellement
// Le contexte s'en charge automatiquement

// Optionnel : configuration de l'auto-save
const { configureAutoSave } = useSchemaActions();
configureAutoSave({
  enabled: true,
  interval: 10000 // 10 secondes
});
```

## 📁 Structure des fichiers de migration

### Nouveaux fichiers créés

1. **`/context/migration-examples.tsx`** - Exemples de migration avant/après
2. **`/context/contextualized-components.tsx`** - Versions contextualisées des composants
3. **`/context/migration-guide.md`** - Ce guide de migration
4. **`/context/migration-patterns.tsx`** - Patterns de migration réutilisables

### Fichiers à adapter (exemples fournis)

- `/index.tsx` → Utilise `SchemaEditorMainPage`
- `/new/index.tsx` → Utilise `CreateSchemaPage`
- `/edit/[id]/index.tsx` → Utilise `EditSchemaPage`
- `/components/*` → Utilise les versions contextualisées

## 🚀 Plan de migration étape par étape

### Étape 1 : Mise en place du contexte
1. ✅ Créer le provider du contexte
2. ✅ Implémenter les hooks d'accès
3. ✅ Tester l'intégration de base

### Étape 2 : Migration des pages principales
1. Migrer `/index.tsx` vers `SchemaEditorMainPage`
2. Migrer `/new/index.tsx` vers `CreateSchemaPage`
3. Migrer `/edit/[id]/index.tsx` vers `EditSchemaPage`

### Étape 3 : Migration des composants
1. Migrer `HorizontalSchemaEditor` vers version contextuelle
2. Migrer `PropertyColumn` vers version contextuelle
3. Migrer `PropertyTree` vers version contextuelle

### Étape 4 : Nettoyage
1. Supprimer les handlers locaux dupliqués
2. Nettoyer les props non utilisées
3. Simplifier la structure des composants

## 💡 Patterns de migration spécifiques

### Pattern 1: Composant avec état local

```tsx
// AVANT
const Component = component$(() => {
  const localState = useStore({ data: [], loading: false });

  const loadData = $(async () => {
    localState.loading = true;
    // ... logique
    localState.loading = false;
  });

  return <div>{/* interface */}</div>;
});

// APRÈS
const Component = component$(() => {
  const { data, loading } = useSchemaState();
  const { loadData } = useSchemaActions();

  return <div>{/* interface simplifiée */}</div>;
});
```

### Pattern 2: Composant avec props drilling

```tsx
// AVANT
type Props = {
  data: any[];
  onUpdate: (data: any[]) => void;
  loading: boolean;
  notifications: any;
  // ... 10+ props
};

const Component = component$<Props>((props) => {
  return (
    <ChildComponent
      data={props.data}
      onUpdate={props.onUpdate}
      loading={props.loading}
      // ... propagation des props
    />
  );
});

// APRÈS
const Component = component$(() => {
  // Plus de props - accès direct au contexte
  return <ContextualChildComponent />;
});
```

### Pattern 3: Gestion des formulaires

```tsx
// AVANT
const FormComponent = component$(() => {
  const formData = useStore({ name: '', description: '' });
  const errors = useStore<string[]>([]);

  const validate = $(() => {
    errors.splice(0, errors.length);
    if (!formData.name) errors.push('Nom requis');
  });

  const handleSubmit = $(async () => {
    if (await validate()) {
      // ... soumission
    }
  });

  return (
    <form>
      <input value={formData.name} onInput$={/* ... */} />
      {errors.map(error => <div>{error}</div>)}
    </form>
  );
});

// APRÈS
const FormComponent = component$(() => {
  const { currentSchema, validationState } = useSchemaState();
  const { updateSchemaInfo, saveCurrentSchema } = useSchemaActions();

  const handleSubmit = $(async () => {
    if (validationState.isValid) {
      await saveCurrentSchema();
    }
  });

  return (
    <form>
      <input
        value={currentSchema.name}
        onInput$={(e) => updateSchemaInfo({
          name: (e.target as HTMLInputElement).value
        })}
      />
      {validationState.errors.map(error => <div>{error}</div>)}
    </form>
  );
});
```

## 🎯 Cas d'usage avancés

### Auto-save conditionnel

```tsx
// Configuration intelligente de l'auto-save
const { configureAutoSave } = useSchemaActions();

// Auto-save seulement si modifications importantes
configureAutoSave({
  enabled: true,
  interval: 5000,
  condition: (changes) => changes.propertyCount > 0 || changes.schemaInfo
});
```

### Gestion des erreurs centralisée

```tsx
// Gestion d'erreurs avec retry automatique
const { executeWithRetry } = useSchemaActions();

const handleRiskyOperation = $(async () => {
  const result = await executeWithRetry(
    () => complexOperation(),
    {
      maxRetries: 3,
      onError: (error, attempt) => {
        showNotification('warning', `Tentative ${attempt}/3: ${error.message}`);
      }
    }
  );
});
```

### État de navigation intelligent

```tsx
// Navigation avec sauvegarde automatique
const { navigateWithSave } = useSchemaActions();

const handleNavigation = $(async (path: string) => {
  const result = await navigateWithSave(path, {
    askConfirmation: true,
    saveAsDraft: true
  });
});
```

## 🔍 Debugging et monitoring

### État du contexte

```tsx
// Hook de debug pour développement
const { debugState } = useSchemaState();

// Affiche l'état complet du contexte
console.log('Schema Context State:', debugState);
```

### Performance monitoring

```tsx
// Monitoring des performances
const { performanceMetrics } = useSchemaState();

// Métriques: temps de sauvegarde, taille des données, etc.
console.log('Performance:', performanceMetrics);
```

## ✅ Checklist de migration

### Pour chaque composant migré :

- [ ] Supprimer les imports `useStore` non utilisés
- [ ] Remplacer les props par l'accès au contexte
- [ ] Simplifier les handlers locaux
- [ ] Utiliser les notifications centralisées
- [ ] Tester l'auto-save automatique
- [ ] Vérifier la validation intégrée
- [ ] Nettoyer les états locaux obsolètes

### Tests de validation :

- [ ] L'état se synchronise entre composants
- [ ] Les notifications s'affichent correctement
- [ ] L'auto-save fonctionne comme attendu
- [ ] Les erreurs sont gérées centralement
- [ ] Les performances sont maintenues ou améliorées

## 🎉 Résultat attendu

Après migration, vous devriez avoir :

1. **Code simplifié** : Moins de lignes, logique centralisée
2. **Props réduites** : Élimination du props drilling
3. **État cohérent** : Synchronisation automatique entre composants
4. **Meilleure UX** : Notifications cohérentes, auto-save intelligent
5. **Maintenabilité** : Un seul endroit pour la logique métier
6. **Tests simplifiés** : Logique centralisée plus facile à tester

La migration vers le contexte transforme une architecture dispersée en un système cohérent et maintenable, tout en améliorant l'expérience utilisateur et développeur.