# Ticket: Analyse des anti-patterns Qwik et restructuration

## Demande
Analyser le code dans `/home/gouroubleu/WS/json-editor/app/src/routes/` pour identifier:
1. Les problèmes/anti-patterns Qwik présents
2. Comment structurer proprement le projet selon les bonnes pratiques Qwik
3. Ce qui doit être nettoyé/réorganisé

## Contexte
- Projet qui mélange un starter Qwik clean avec du code importé d'un JSON Schema Editor
- Structure mélangée qui ne suit pas les conventions Qwik
- Beaucoup de fichiers de test dans routes/

## Début de la tâche
- Date: 2025-09-17
- Guide Qwik du projet lu et intégré
- Règles critiques identifiées:
  - JAMAIS de routeAction$
  - Utiliser server$ + sharedMap
  - JAMAIS d'interface, uniquement type
  - Export maximum pour chunking optimal
  - useVisibleTask$ avec eslint-disable

## Actions à effectuer
1. Analyser la structure actuelle des routes
2. Identifier les anti-patterns
3. Proposer une restructuration
4. Tester le projet en mode browser

## Résultats

### ❌ Anti-patterns Qwik Identifiés

#### 1. **Violation critique: Usage de interface au lieu de type**
- **Fichier**: `/routes/types.ts` - Ligne 3 et autres
- **Problème**: Utilise `interface` au lieu de `type`
- **Impact**: Violation de la règle fondamentale du guide Qwik du projet

#### 2. **Problème de structure: Composants dans routes/**
- **Fichiers**: `/routes/components/` (9 composants)
- **Problème**: Les composants sont mélangés avec les routes
- **Impact**: Mauvaise séparation des responsabilités, chunking sous-optimal

#### 3. **Pollution de routes/ avec fichiers de test**
- **Fichiers**: 22+ fichiers de test .cjs et .tsx dans routes/
- **Problème**: Les tests ne devraient pas être dans routes/
- **Impact**: Structure confuse, routing pollué

#### 4. **API routes non-Qwik standard**
- **Fichiers**: `/routes/api/` avec RequestHandler
- **Problème**: Utilise des patterns non-standards pour Qwik
- **Impact**: Ne suit pas les conventions server$ + sharedMap

#### 5. **Problèmes de QRL Types**
- **Fichier**: `/routes/components/schema-editor.tsx` ligne 6
- **Problème**: `onSave: (schema: any) => void` au lieu de `QRL<(data: any) => void>`
- **Impact**: Violation des règles TypeScript Qwik

#### 6. **Handlers inline dans composants**
- **Fichier**: `/routes/index.tsx` lignes 44, 71
- **Problème**: Handlers définis dans le composant au lieu d'être exportés
- **Impact**: Violation de la règle d'or du chunking optimal

#### 7. **Services mélangés avec routes**
- **Fichiers**: `/routes/services.ts`, `/routes/handlers.ts`
- **Problème**: Services globaux dans routes/ au lieu de src/services/
- **Impact**: Mauvaise organisation modulaire

### ✅ Points Positifs Identifiés

1. **Utilisation correcte de server$**: Les services utilisent bien `server$`
2. **Respect de useStyles$**: Import correct des styles SCSS
3. **Pas de routeAction$**: Aucune utilisation de routeAction$ trouvée
4. **Bonne utilisation de useSignal/useStore**: Gestion d'état correcte

### 🔧 Restructuration Proposée

#### Structure Recommandée:
```
app/src/
├── components/                     # Composants réutilisables
│   ├── schema-editor/
│   │   ├── index.tsx              # Composant principal
│   │   ├── index.scss             # Styles
│   │   ├── types.ts               # Types du composant
│   │   ├── services.ts            # server$ exportés
│   │   └── handlers.ts            # handlers exportés
│   ├── entity-list/
│   └── dynamic-form/
├── services/                       # Services globaux
│   ├── schema.service.ts          # Services schémas
│   ├── filesystem.service.ts      # Services filesystem
│   └── versioning.service.ts      # Services versioning
├── types/                         # Types globaux
│   ├── schema.types.ts            # Types schémas
│   └── api.types.ts              # Types API
├── routes/                        # Routes uniquement
│   ├── layout.tsx                 # Layout principal
│   ├── index.tsx                  # Page d'accueil
│   ├── new/
│   │   └── index.tsx             # Page nouveau schéma
│   ├── edit/
│   │   └── [id]/index.tsx        # Page édition
│   └── bdd/
│       └── index.tsx             # Page base de données
└── tests/                         # Tests séparés
    ├── e2e/
    ├── unit/
    └── integration/
```

#### Actions Prioritaires:

1. **URGENT**: Remplacer tous les `interface` par `type` dans `/routes/types.ts`
2. **URGENT**: Déplacer les composants de `/routes/components/` vers `/src/components/`
3. **URGENT**: Nettoyer les 22+ fichiers de test dans `/routes/`
4. **Important**: Exporter tous les handlers des composants
5. **Important**: Corriger les types QRL dans les props des composants
6. **Important**: Déplacer les services globaux vers `/src/services/`

#### Migration Steps:

1. Créer la nouvelle structure de dossiers
2. Migrer les types (interface → type)
3. Déplacer et refactoriser les composants
4. Exporter handlers et services
5. Nettoyer les fichiers de test
6. Tester fonctionnellement

### 📊 Métrics

- **Fichiers dans routes/**: 143 (dont 26 de test)
- **Composants mal placés**: 9
- **Violations interface**: ~15 occurrences
- **Handlers inline**: ~8 occurrences
- **Services mal placés**: 3 fichiers majeurs

### 🚧 Statut de Test

- ✅ Serveur démarre correctement (`npm start`)
- ✅ Aucune erreur de compilation TypeScript
- ⚠️ Warnings sur "deprecated parameters" à investiguer
- ✅ Application fonctionnelle en mode développement

## Fin de la tâche
- Date de completion: 2025-09-17
- Tous les anti-patterns identifiés et documentés
- Structure de migration proposée
- Prêt pour implémentation des corrections