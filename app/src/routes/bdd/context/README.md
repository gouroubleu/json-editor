# Architecture EntityEditor - Contexte Dynamique pour les Entités BDD

## Vue d'ensemble

L'architecture EntityEditor fournit un contexte dynamique complet pour la gestion des entités de base de données, basé sur l'architecture Qwik et intégré avec le système SchemaEditor existant.

## Structure de l'architecture

```
src/routes/bdd/context/
├── types.ts                    # Types TypeScript complets
├── context.ts                  # Configuration et utilitaires du contexte
├── provider.tsx                # Provider principal avec toutes les actions
├── hooks/
│   ├── index.ts               # Point d'entrée des hooks
│   ├── use-entity-cache.ts    # Hook pour la gestion du cache
│   ├── use-entity-validation.ts # Hook pour la validation
│   └── use-entity-navigation.ts # Hook pour la navigation
├── example-usage.tsx          # Exemple d'utilisation complète
└── README.md                  # Cette documentation
```

## Fonctionnalités principales

### 🏗️ Architecture modulaire
- **Provider principal** : `EntityEditorProvider` avec état centralisé
- **Hooks spécialisés** : Cache, validation, navigation
- **Types complets** : TypeScript avec intellisense complet
- **Intégration SchemaEditor** : Communication bidirectionnelle

### 📦 Gestion des entités
- **CRUD complet** : Créer, lire, mettre à jour, supprimer
- **Validation en temps réel** : Contre les schémas JSON Schema
- **Migration automatique** : Vers nouvelles versions de schémas
- **Duplication intelligente** : Avec personnalisation des données

### 🚀 Cache intelligent
- **Cache multi-niveaux** : Entités individuelles et listes par schéma
- **TTL configurable** : Expiration automatique
- **Statistiques détaillées** : Taux de succès, utilisation mémoire
- **Optimisation automatique** : Nettoyage des entrées obsolètes

### ✅ Validation avancée
- **Validation en temps réel** : Avec debounce configurable
- **Cache de validation** : Éviter les re-validations inutiles
- **Validation par lot** : Pour plusieurs entités
- **Suggestions d'amélioration** : Basées sur les erreurs courantes

### 🧭 Navigation sophistiquée
- **Navigation horizontale** : Entre entités du même schéma
- **Historique complet** : Avec navigation avant/arrière
- **Breadcrumbs dynamiques** : Mise à jour automatique
- **Recherche rapide** : Avec suggestions intelligentes

### 💾 Brouillons et auto-save
- **Auto-save configurable** : Intervalle personnalisable
- **Historique des modifications** : Suivi des changements
- **Restauration** : Depuis brouillons ou état original
- **Nettoyage automatique** : Des brouillons anciens

## Utilisation

### 1. Configuration de base

```tsx
import { component$ } from '@builder.io/qwik';
import { EntityEditorProvider } from './context/provider';

export const App = component$(() => {
  return (
    <EntityEditorProvider>
      <YourEntityComponents />
    </EntityEditorProvider>
  );
});
```

### 2. Hook principal

```tsx
import { useEntityEditor } from './context/hooks';

export const EntityComponent = component$(() => {
  const { state, actions } = useEntityEditor();

  const loadEntities = $(() => {
    actions.entities.loadSummaries();
  });

  return (
    <div>
      <button onClick$={loadEntities}>Charger les entités</button>
      <div>Entités: {state.entities.length}</div>
    </div>
  );
});
```

### 3. Hooks spécialisés

```tsx
import {
  useEntityCache,
  useEntityValidation,
  useEntityNavigation
} from './context/hooks';

export const AdvancedEntityComponent = component$(() => {
  const cache = useEntityCache();
  const validation = useEntityValidation();
  const navigation = useEntityNavigation();

  return (
    <div>
      {/* Statistiques du cache */}
      <div>Cache: {cache.cacheStats.totalEntries} entrées</div>

      {/* État de validation */}
      <div>Validation: {validation.validationStats.isValid ? '✅' : '❌'}</div>

      {/* Navigation horizontale */}
      {navigation.horizontalNavigation.enabledForSchema && (
        <div>
          <button onClick$={navigation.goToPrevEntity}>Précédent</button>
          <span>{navigation.horizontalNavigation.currentEntityIndex + 1}</span>
          <button onClick$={navigation.goToNextEntity}>Suivant</button>
        </div>
      )}
    </div>
  );
});
```

## API des actions

### Actions des entités

```tsx
// CRUD opérations
await actions.entities.create(schemaName, data);
await actions.entities.update(entityId, data);
await actions.entities.delete(entityId);
await actions.entities.loadById(entityId);

// Navigation et sélection
await actions.entities.select(entityId);
await actions.entities.selectSchema(schemaName);

// Validation et migration
await actions.entities.validate(entityId);
await actions.entities.migrateEntity(entityId);
```

### Actions des données

```tsx
// Manipulation des champs
actions.data.updateField('user.name', 'Nouveau nom');
actions.data.deleteField('user.oldField');

// Gestion des arrays
actions.data.addArrayItem('user.addresses', newAddress);
actions.data.removeArrayItem('user.addresses', 0);

// Import/Export
await actions.data.importData(jsonData, merge);
const exported = actions.data.exportData('json');
```

### Actions du cache

```tsx
// Gestion manuelle
actions.cache.invalidate(entityId);
actions.cache.refresh(entityId);
actions.cache.cleanup();

// Optimisation
await actions.cache.preloadSchema(schemaName);
await actions.cache.warmupCache(entityIds);

// Statistiques
const stats = actions.cache.getStats();
```

## Configuration

### Configuration par défaut

```tsx
const DEFAULT_ENTITY_CONFIG = {
  cache: {
    ttl: 15 * 60 * 1000, // 15 minutes
    maxSize: 100,
    enablePersistence: true
  },
  drafts: {
    autoSaveEnabled: true,
    autoSaveInterval: 10000, // 10 secondes
    maxDrafts: 20,
    retentionDays: 7
  },
  validation: {
    defaultMode: 'lenient',
    validateOnChange: true,
    validateOnSave: true,
    batchValidationChunkSize: 50
  },
  navigation: {
    maxHistorySize: 50,
    enableBreadcrumbs: true,
    enableHorizontalNavigation: true
  }
};
```

### Configuration personnalisée

```tsx
const customConfig = {
  ...DEFAULT_ENTITY_CONFIG,
  cache: {
    ...DEFAULT_ENTITY_CONFIG.cache,
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 200
  }
};

// Utiliser avec le provider
<EntityEditorProvider config={customConfig}>
```

## Intégration avec SchemaEditor

### Communication bidirectionnelle

```tsx
const { schemaIntegration } = useEntityEditor();

// Obtenir le schéma courant
const currentSchema = schemaIntegration.getCurrentSchema();

// Écouter les changements de schéma
schemaIntegration.onSchemaChanged((newSchema) => {
  console.log('Schéma mis à jour:', newSchema);
});

// Vérifier la compatibilité
const isCompatible = schemaIntegration.isSchemaCompatible(entityId, schemaName);
```

### Synchronisation automatique

L'EntityEditor se synchronise automatiquement avec le SchemaEditor pour :
- **Détecter les nouveaux schémas** : Mise à jour de la liste disponible
- **Alertes de migration** : Quand un schéma change
- **Validation mise à jour** : Contre les nouvelles versions
- **Cache intelligent** : Invalidation lors des changements

## Patterns Qwik spécialisés

### Signaux dérivés

```tsx
const { signals } = useEntityEditor();

// Signaux optimisés pour les performances
signals.currentEntitySignal; // Entité courante
signals.validationSignal;    // État de validation
signals.cacheStatsSignal;    // Statistiques du cache
```

### Actions typées avec $

```tsx
// Toutes les actions sont automatiquement sérialisables
const handleSave = $(async () => {
  const result = await actions.entities.update(entityId, data);
  if (result.success) {
    actions.notifications.success('Sauvegardé', result.message);
  }
});
```

### Store réactif

```tsx
// L'état est automatiquement réactif
const isEntityModified = state.currentEntity.isDirty;
const hasValidationErrors = state.currentEntity.validationErrors.length > 0;
```

## Performance et optimisation

### Cache multi-niveaux
- **Cache L1** : Entités fréquemment accédées
- **Cache L2** : Listes par schéma
- **Cache L3** : Résultats de validation

### Stratégies de préchargement
- **Préchargement de schéma** : Entités populaires
- **Navigation prédictive** : Entités adjacentes
- **Validation différée** : Pour les gros datasets

### Optimisations mémoire
- **Nettoyage automatique** : Entrées expirées
- **Limite de taille** : Éviction LRU
- **Compression** : Des données en cache

## Notifications et alertes

### Types de notifications
- **Success** : Opérations réussies
- **Error** : Erreurs avec actions correctives
- **Warning** : Avertissements non bloquants
- **Migration** : Alertes de migration nécessaire
- **Validation** : Erreurs de validation

### Notifications intelligentes
- **Auto-dismiss** : Durée configurable
- **Actions intégrées** : Boutons d'action directe
- **Limitation** : Nombre maximum affiché
- **Priorité** : Tri par importance

## Tests et debugging

### Outils de debugging
- **Export des statistiques** : Cache, navigation, validation
- **Historique détaillé** : Toutes les actions
- **Mode debug** : Logs étendus
- **Métriques de performance** : Temps de réponse

### Tests recommandés
- **Tests unitaires** : Actions individuelles
- **Tests d'intégration** : Avec SchemaEditor
- **Tests de performance** : Cache et validation
- **Tests de navigation** : Historique et breadcrumbs

## Sécurité et validation

### Validation des données
- **Schémas JSON Schema** : Validation stricte
- **Validation en temps réel** : Feedback immédiat
- **Sanitization** : Nettoyage des entrées
- **Types TypeScript** : Sécurité au compile-time

### Sécurité des données
- **Validation côté serveur** : Double vérification
- **Échappement XSS** : Dans les formulaires
- **Limitation de taille** : Cache et localStorage
- **Audit trail** : Historique des modifications

## Migration et maintenance

### Migration des données
- **Migration automatique** : Vers nouvelles versions
- **Sauvegarde** : Avant migration
- **Rollback** : En cas d'erreur
- **Rapport détaillé** : Succès et échecs

### Maintenance périodique
- **Nettoyage automatique** : Brouillons et cache
- **Optimisation** : Réorganisation du cache
- **Monitoring** : Métriques de performance
- **Alertes** : Problèmes de capacité

---

Cette architecture fournit une base solide et extensible pour la gestion des entités BDD avec toutes les fonctionnalités modernes attendues d'un éditeur d'entités professionnel.