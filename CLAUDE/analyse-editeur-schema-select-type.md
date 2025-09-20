# Analyse Éditeur de Schéma - Ajout Type "Select"

## Objectif
Analyser l'éditeur de schéma JSON pour comprendre comment ajouter un nouveau type "select" dans les options de création de propriétés.

## Recherches à effectuer
1. ✅ Localiser les fichiers d'édition de schémas
2. ✅ Analyser la gestion des types de propriétés
3. ✅ Comprendre l'interface de sélection des types
4. ✅ Étudier le processus d'ajout de propriétés
5. ✅ Identifier l'interface d'administration

## État
✅ TERMINÉ - Analyse complète

## Fichiers identifiés

### Composants principaux
- `/app/src/components/schema-editor.tsx` - Éditeur de schéma simple (interface verticale)
- `/app/src/components/HorizontalSchemaEditor.tsx` - Éditeur de schéma avancé (interface horizontale)
- `/app/src/components/PropertyColumn.tsx` - Composant de colonne pour l'édition de propriétés
- `/app/src/components/advanced-schema-editor.tsx` - Éditeur avancé

### Types et utilitaires
- `/app/src/routes/types.ts` - Définitions des types (`JsonSchemaType`, `SchemaProperty`)
- `/app/src/routes/utils.ts` - Utilitaires pour manipulation des propriétés

### Routes
- `/app/src/routes/new/index.tsx` - Page de création de schéma (utilise HorizontalSchemaEditor)
- `/app/src/routes/edit/[id]/index.tsx` - Page d'édition de schéma

## Architecture actuelle

### 1. Définition des types (types.ts)
```typescript
export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

export type SchemaProperty = {
  name: string;
  type: JsonSchemaType;
  required: boolean;
  description: string;
  enum?: string[];  // ✅ Support enum déjà présent !
  format?: 'email' | 'date' | 'uri' | 'datetime-local';
  // ... autres propriétés
};
```

### 2. Interface de sélection des types
**Dans PropertyColumn.tsx (lignes 102-108) :**
```typescript
<option value="string">String</option>
<option value="number">Number</option>
<option value="integer">Integer</option>
<option value="boolean">Boolean</option>
<option value="array">Array</option>
<option value="object">Object</option>
```

**Dans schema-editor.tsx (lignes 210-216) :**
```typescript
<option value="string">String</option>
<option value="number">Number</option>
<option value="integer">Integer</option>
<option value="boolean">Boolean</option>
<option value="array">Array</option>
<option value="object">Object</option>
```

### 3. Interface d'administration
L'application possède deux interfaces d'édition :

1. **Interface simple** (`schema-editor.tsx`) : Formulaire vertical classique
2. **Interface avancée** (`HorizontalSchemaEditor.tsx`) : Interface en colonnes avec :
   - Panneau fixe à gauche pour les infos du schéma
   - Colonnes dynamiques pour navigation dans l'arbre de propriétés
   - Support complet pour types complexes (objects, arrays)

## Points d'extension pour type "select"

### ✅ Constats positifs
1. **Support enum déjà présent** : Le type `SchemaProperty` inclut déjà `enum?: string[]`
2. **Architecture modulaire** : Types centralisés, composants séparés
3. **Interface extensible** : Structure permettant l'ajout de nouveaux types facilement

### 🔧 Modifications nécessaires

#### 1. Ajout du type "select" (types.ts)
```typescript
// Ligne 2 - Ajouter 'select' au type union
export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'select';
```

#### 2. Interface de sélection (PropertyColumn.tsx + schema-editor.tsx)
```typescript
// Ajouter dans les <select> existants
<option value="select">Select</option>
```

#### 3. Interface de configuration enum
Dans `PropertyColumn.tsx`, ajouter une section dédiée après les contraintes existantes :
```typescript
{property.type === 'select' && (
  <div class="constraints">
    <label>Options disponibles :</label>
    {/* Interface pour gérer le tableau enum */}
  </div>
)}
```

#### 4. Utilitaires (utils.ts)
```typescript
// Dans createNewProperty(), ajouter :
if (type === 'select') {
  property.enum = ['Option 1', 'Option 2'];
}
```

## Recommandations d'implémentation

### Phase 1 : Support basique
1. ✅ **Modifier le type `JsonSchemaType`** pour inclure 'select'
2. ✅ **Ajouter l'option** dans les interfaces de sélection
3. ✅ **Utiliser le champ `enum` existant** pour stocker les options
4. ✅ **Interface minimale** pour éditer les options (textarea avec une option par ligne)

### Phase 2 : Interface avancée
1. 🔧 **Interface dynamique** pour ajouter/supprimer des options
2. 🔧 **Validation** des options (unicité, format)
3. 🔧 **Prévisualisation** du select dans l'aperçu JSON
4. 🔧 **Import/export** d'options depuis un fichier

### Phase 3 : Fonctionnalités avancées
1. 🚀 **Options avec valeurs** (label/value séparés)
2. 🚀 **Groupement d'options** (optgroups)
3. 🚀 **Select multiple** (avec array comme type de base)
4. 🚀 **Options dynamiques** (depuis API)

## Complexité d'implémentation
- **Faible** ✅ : Le champ `enum` existe déjà dans le type `SchemaProperty`
- **Modérée** 🔧 : Modifications limitées à quelques fichiers bien identifiés
- **Architecture robuste** 💪 : Code modulaire et extensible

## Fichiers à modifier (ordre prioritaire)
1. `/app/src/routes/types.ts` - Ajouter 'select' au type union
2. `/app/src/components/PropertyColumn.tsx` - Ajouter option + interface enum
3. `/app/src/components/schema-editor.tsx` - Ajouter option + interface enum
4. `/app/src/routes/utils.ts` - Initialiser enum pour type select
5. Tests et validation

## Conclusion
L'ajout du type "select" est **techniquement simple** car :
- Infrastructure `enum` déjà présente
- Architecture modulaire facilitant l'extension
- Modifications limitées à 4-5 fichiers bien identifiés
- Aucune migration de données nécessaire

**Temps estimé : 2-4 heures** pour une implémentation basique fonctionnelle.