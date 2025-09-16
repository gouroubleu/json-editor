# Checklist d'implémentation du contexte SchemaEditor

## ✅ Travail déjà réalisé

### 1. Infrastructure du contexte
- [x] **Contexte principal** (`schema-editor-context.tsx`) - Hooks et types
- [x] **Provider** (`provider.tsx`) - Gestion d'état centralisée
- [x] **Tests d'intégration** (`test-integration.tsx`) - Validation du fonctionnement
- [x] **Exemples d'utilisation** (`example.tsx`, `example-usage.tsx`) - Démonstrations

### 2. Documentation et migration
- [x] **Guide de migration** (`migration-guide.md`) - Instructions détaillées
- [x] **Exemples de migration** (`migration-examples.tsx`) - Avant/après concrets
- [x] **Patterns de migration** (`migration-patterns.tsx`) - Hooks et utilitaires
- [x] **Composants contextualisés** (`contextualized-components.tsx`) - Versions refactorisées
- [x] **Exemples d'intégration** (`integration-examples.tsx`) - Cas d'usage pratiques
- [x] **Documentation complète** (`README.md`) - Guide utilisateur

## 🚀 Prochaines étapes d'implémentation

### Phase 1 : Intégration du contexte (Priorité haute)

#### 1.1 Mise à jour du layout principal
```bash
# Fichier à modifier : src/routes/bo/schemaEditor/layout.tsx
```

**Action :**
- Wrapper l'application avec `SchemaEditorProvider`
- Tester que le contexte est accessible dans toute l'arborescence

**Code d'exemple :**
```tsx
import { SchemaEditorProvider } from './context/provider';

export default component$(() => {
  return (
    <SchemaEditorProvider>
      <Slot />
    </SchemaEditorProvider>
  );
});
```

#### 1.2 Migration de la page principale
```bash
# Fichier à modifier : src/routes/bo/schemaEditor/index.tsx
```

**Actions :**
- Remplacer les `useStore` locaux par les hooks du contexte
- Simplifier les handlers grâce aux actions centralisées
- Utiliser les notifications du contexte

**Référence :** Voir `SchemaEditorMainPage` dans `contextualized-components.tsx`

#### 1.3 Migration de la page de création
```bash
# Fichier à modifier : src/routes/bo/schemaEditor/new/index.tsx
```

**Actions :**
- Utiliser `startEditing(null)` pour un nouveau schéma
- Remplacer l'auto-save manuel par celui du contexte
- Simplifier la gestion des brouillons

**Référence :** Voir `CreateSchemaPage` dans `contextualized-components.tsx`

#### 1.4 Migration de la page d'édition
```bash
# Fichier à modifier : src/routes/bo/schemaEditor/edit/[id]/index.tsx
```

**Actions :**
- Utiliser `startEditing(schemaId)` pour charger un schéma existant
- Simplifier la détection de modifications
- Utiliser la gestion de brouillons du contexte

**Référence :** Voir `EditSchemaPage` dans `contextualized-components.tsx`

### Phase 2 : Migration des composants (Priorité moyenne)

#### 2.1 HorizontalSchemaEditor
```bash
# Fichier à modifier : src/routes/bo/schemaEditor/components/HorizontalSchemaEditor.tsx
```

**Actions :**
- Supprimer la plupart des props (props drilling)
- Utiliser les hooks du contexte pour l'état et les actions
- Garder seulement les props spécifiques à l'UI

**Référence :** Voir `ContextualHorizontalSchemaEditor` dans `contextualized-components.tsx`

#### 2.2 PropertyColumn
```bash
# Fichier à modifier : src/routes/bo/schemaEditor/components/PropertyColumn.tsx
```

**Actions :**
- Éliminer le props drilling des handlers
- Accès direct aux propriétés via le contexte
- Simplification des validations

#### 2.3 Schema-list et autres composants
```bash
# Fichiers à modifier :
# - src/routes/bo/schemaEditor/components/schema-list.tsx
# - src/routes/bo/schemaEditor/components/entity-list.tsx
# - src/routes/bo/schemaEditor/components/dynamic-form.tsx
```

**Actions :**
- Utiliser les listes et actions du contexte
- Simplifier les handlers CRUD
- Utiliser les notifications centralisées

### Phase 3 : Tests et optimisation (Priorité basse)

#### 3.1 Tests unitaires
```bash
# Ajouter des tests pour :
# - Chaque hook du contexte
# - Les actions et leur état résultant
# - La validation en temps réel
# - L'auto-save et les brouillons
```

#### 3.2 Performance monitoring
```bash
# Ajouter :
# - Métriques de re-render
# - Timing des actions
# - Taille des données en mémoire
```

## 📋 Checklist détaillée par fichier

### src/routes/bo/schemaEditor/layout.tsx
- [ ] Importer `SchemaEditorProvider`
- [ ] Wrapper `<Slot />` avec le provider
- [ ] Tester que le contexte fonctionne dans les pages enfants
- [ ] Vérifier que les notifications s'affichent correctement

### src/routes/bo/schemaEditor/index.tsx
- [ ] Remplacer `const savedSchemas = useSignal(...)` par `const { schemas } = useSchemaState()`
- [ ] Remplacer `const uiState = useSignal(...)` par `const { loading } = useSchemaState()`
- [ ] Utiliser `const { deleteSchema, refreshSchemas } = useSchemaActions()`
- [ ] Utiliser `const { showNotification } = useSchemaNotifications()`
- [ ] Simplifier `handleDelete` pour utiliser l'action du contexte
- [ ] Simplifier `handleCopySchema` pour utiliser l'action du contexte
- [ ] Supprimer la gestion manuelle des notifications
- [ ] Tester toutes les fonctionnalités

### src/routes/bo/schemaEditor/new/index.tsx
- [ ] Remplacer `const schemaInfo = useStore(...)` par `const { currentSchema } = useSchemaState()`
- [ ] Remplacer `const properties = useStore(...)` par `const { currentProperties } = useSchemaState()`
- [ ] Utiliser `const { updateSchemaInfo, addProperty, saveCurrentSchema } = useSchemaActions()`
- [ ] Supprimer les `useVisibleTask$` d'auto-save manuel
- [ ] Appeler `startEditing(null)` au début du composant
- [ ] Simplifier `handleSave` pour utiliser `saveCurrentSchema()`
- [ ] Utiliser la gestion de brouillons du contexte
- [ ] Tester la création de nouveaux schémas

### src/routes/bo/schemaEditor/edit/[id]/index.tsx
- [ ] Charger le schéma avec `startEditing(schemaId)`
- [ ] Utiliser l'état du contexte au lieu de l'état local
- [ ] Simplifier la détection de modifications
- [ ] Utiliser `saveCurrentSchema()` pour les mises à jour
- [ ] Tester l'édition de schémas existants
- [ ] Vérifier la gestion des brouillons

### src/routes/bo/schemaEditor/components/HorizontalSchemaEditor.tsx
- [ ] Réduire les props en gardant seulement celles spécifiques à l'UI
- [ ] Utiliser `const { currentSchema, currentProperties, validationState } = useSchemaState()`
- [ ] Utiliser `const { updateSchemaInfo, addProperty, updateProperty } = useSchemaActions()`
- [ ] Supprimer la gestion locale de l'état
- [ ] Tester l'interface horizontale

### src/routes/bo/schemaEditor/components/PropertyColumn.tsx
- [ ] Supprimer la plupart des props
- [ ] Accéder aux propriétés via `useSchemaState()`
- [ ] Utiliser les actions du contexte
- [ ] Tester l'édition de propriétés

## 🔧 Outils et utilitaires

### Migration progressive
Pour faciliter la migration, utilisez le `HybridMigrationWrapper` :

```tsx
import { HybridMigrationWrapper } from './context/migration-patterns';

<HybridMigrationWrapper
  useNewComponents={true} // Basculer entre ancien et nouveau
  newComponent={NewContextualComponent}
  oldComponent={OldComponent}
/>
```

### Debug et monitoring
Ajoutez le panneau de debug en développement :

```tsx
import { MigrationDebugPanel } from './context/migration-patterns';

// En bas de votre composant
<MigrationDebugPanel />
```

### Tests rapides
Utilisez les tests d'intégration existants :

```bash
# Exécuter les tests du contexte
npm test -- --testPathPattern=test-integration
```

## ⚠️ Points d'attention

### 1. Gestion des erreurs
- Toujours vérifier le résultat des actions : `if (result.success)`
- Utiliser `try/catch` pour les actions async
- Afficher les erreurs via `showNotification('error', message)`

### 2. Performance
- Ne pas déconstruire tout l'état si seulement quelques propriétés sont nécessaires
- Utiliser `useMemo` pour les calculs coûteux
- Éviter les re-renders inutiles

### 3. État de synchronisation
- L'état est automatiquement synchronisé entre composants
- Toujours utiliser les actions du contexte pour modifier l'état
- Ne jamais modifier directement l'état récupéré

### 4. Auto-save
- L'auto-save est activé par défaut
- Configurable via `configureAutoSave()`
- Sauvegarde intelligente basée sur les modifications significatives

## 🎯 Objectifs de migration

### Résultats attendus après migration complète :

1. **Réduction du code** : ~30-50% moins de lignes dans les composants
2. **Élimination du props drilling** : Plus de passage de props sur 3+ niveaux
3. **État cohérent** : Synchronisation automatique entre tous les composants
4. **UX améliorée** : Auto-save intelligent, notifications cohérentes
5. **Maintenabilité** : Logique centralisée et testable

### Métriques de succès :

- [ ] Tous les composants utilisent le contexte
- [ ] Aucun `useStore` local pour l'état des schémas
- [ ] Auto-save fonctionne correctement
- [ ] Notifications s'affichent de manière cohérente
- [ ] Tests d'intégration passent à 100%
- [ ] Performance maintenue ou améliorée

## 📞 Support

En cas de problème pendant la migration :

1. **Consulter** : `migration-guide.md` pour les patterns
2. **Référencer** : `migration-examples.tsx` pour les exemples
3. **Tester** : `test-integration.tsx` pour valider le fonctionnement
4. **Debug** : Utiliser `MigrationDebugPanel` en développement

---

**Cette checklist doit être mise à jour au fur et à mesure de l'avancement de la migration.**