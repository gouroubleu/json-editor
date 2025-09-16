# 📝 Entity Editor Feature - Documentation Complète

## 🎯 Vue d'ensemble

Le **Entity Editor** est un système d'édition d'entités basé sur des schémas JSON avec une interface multi-colonnes horizontale. Cette feature permet de créer, modifier et naviguer dans des structures de données complexes de manière intuitive.

## 🏗️ Architecture

### Structure des fichiers
```
src/routes/bo/schemaEditor/bdd/[schema]/
├── components/
│   ├── EntityColumn.tsx           # Composant principal de colonne
│   ├── HorizontalEntityViewer.tsx # Gestionnaire de navigation multi-colonnes
│   └── EntityViewer.scss          # Styles CSS complets
├── new/index.tsx                  # Page création d'entité
├── [entityId]/
│   ├── index.tsx                  # Page visualisation d'entité
│   └── edit/index.tsx            # Page édition d'entité
└── services.ts                   # Services de gestion des entités
```

## 🚀 Fonctionnalités Principales

### 1. **Interface Multi-Colonnes**
- Navigation horizontale par colonnes
- Chaque colonne représente un niveau de profondeur dans l'objet
- Fil d'Ariane dynamique pour la navigation
- Fermeture en cascade des colonnes enfants

### 2. **Édition Directe des Champs**
- **Input direct** : Plus besoin de mode édition/validation
- **Sauvegarde automatique** : Changements appliqués instantanément
- **Types supportés** :
  - `string` → `<input type="text">`
  - `number/integer` → `<input type="number">`  
  - `boolean` → `<select>` (true/false)
  - `enum` → `<select>` (options définies)
  - `object` → `<textarea>` JSON toujours visible
  - `array` → Bouton toggle pour `<textarea>` JSON

### 3. **Gestion Avancée des Arrays**
- **Navigation dans les éléments** : Clic sur un élément pour l'éditer
- **Ajout automatique** : Navigation automatique vers le nouvel élément
- **Réactivité complète** : Liste mise à jour instantanément
- **Suppression intuitive** : Bouton de suppression par élément

### 4. **Système de Cache Réactif**
- Cache local pour les modifications en cours
- Synchronisation automatique avec les props parent
- Détection des changements profonds dans les structures

## 🔧 Implémentation Technique

### Composants Clés

#### EntityColumn.tsx
```typescript
// Gestion d'une colonne d'édition
const EntityColumn = component$<EntityColumnProps>((props) => {
  const uiState = useStore({
    arrayData: [] as any[],           // Cache réactif pour arrays
    localData: {} as Record<string, any>, // Cache pour modifications
    showJsonEditor: {} as Record<string, boolean> // Toggle JSON
  });
  
  // Fonctions principales :
  // - renderField() : Rendu des champs selon leur type
  // - handleDirectSave() : Sauvegarde immédiate
  // - handleAddArrayItem() : Ajout + navigation automatique
});
```

#### HorizontalEntityViewer.tsx
```typescript
// Orchestrateur de la navigation multi-colonnes
const HorizontalEntityViewer = component$((props) => {
  const uiState = useStore({
    selectedPath: [] as string[],     // Chemin de navigation
    expandedColumns: 1,               // Nombre de colonnes visibles
  });
  
  // Calcul dynamique des colonnes basé sur selectedPath
  const columns = useComputed$(() => {
    // Logique complexe de génération des colonnes
    // en fonction du chemin de navigation
  });
});
```

### Logiques Critiques

#### 1. Navigation Automatique (Arrays)
```typescript
const handleAddArrayItem = $(() => {
  const newItem = generateDefaultValue(props.schema.items);
  const newArray = [...props.data, newItem];
  
  // CRITIQUE: Mettre à jour le cache local AVANT onDataChange
  uiState.arrayData = [...newArray];
  props.onDataChange$?.(fieldPath, newArray);
  
  // Navigation automatique vers le nouvel élément
  const newItemIndex = newArray.length - 1;
  props.onSelectArrayItem$?.(newItemIndex, props.columnIndex);
});
```

#### 2. Fermeture des Colonnes
```typescript
const handleGoBack = $((columnIndex: number) => {
  // Pour fermer la colonne N, garder les colonnes 0 à N-1
  let newPathLength = 0;
  if (columnIndex > 0) {
    const previousColumn = columns.value[columnIndex - 1];
    if (previousColumn) {
      newPathLength = previousColumn.path.length;
    }
  }
  
  uiState.selectedPath = uiState.selectedPath.slice(0, newPathLength);
  uiState.expandedColumns = columnIndex;
  dataChangeSignal.value++; // Force réactivité
});
```

#### 3. Réactivité des Textareas JSON
```typescript
// IMPORTANT: Utiliser props.data[key] au lieu du cache local
// pour que les textareas se mettent à jour quand les enfants changent
<textarea
  value={formatValue(props.data[key], fieldSchema?.type)}
  onChange$={(e) => handleDirectSave(e.target.value)}
/>
```

## 🎨 Styles et UX

### Classes CSS Principales
- `.entity-column` : Structure d'une colonne
- `.direct-edit-container` : Container des inputs directs
- `.array-json-container` : Container spécial pour arrays avec toggle
- `.field-item` : Structure d'un champ individuel

### Animations
- Slide down pour l'affichage des textareas JSON
- Transitions smoothes sur les hovers et focus
- Feedback visuel pour les actions utilisateur

## 🚨 Points d'Attention Critiques

### 1. **Réactivité des Arrays**
⚠️ **PROBLÈME RÉCURRENT** : Les arrays doivent utiliser `uiState.arrayData` pour l'affichage et `props.data` pour les valeurs des inputs.

```typescript
// ✅ CORRECT
{uiState.arrayData.length > 0 ? (
  renderArrayItems(uiState.arrayData, props.schema)
) : (
  <div>Tableau vide</div>
)}

// ❌ INCORRECT  
{props.data.length > 0 ? ...}
```

### 2. **Navigation Automatique**
⚠️ **CRITIQUE** : L'utilisateur a signalé 5 fois que l'ajout d'éléments ne créait pas de colonne. La solution :

```typescript
// Dans handleAddArrayItem - OBLIGATOIRE
props.onSelectArrayItem$?.(newItemIndex, props.columnIndex);
```

### 3. **Logique de Fermeture des Colonnes**
⚠️ **CONFUS** : L'indexation des colonnes vs la longueur du path. La règle :
- Pour fermer la colonne N : `newPathLength = previousColumn.path.length`
- `expandedColumns = columnIndex`

### 4. **Types d'Inputs**
⚠️ **DISTINCTION** : Arrays vs Objects ont des comportements différents :
- **Arrays** : Toggle bouton JSON (masqué par défaut)
- **Objects** : Textarea JSON toujours visible
- **Primitifs** : Input direct selon le type

## 🔄 Processus de Debugging

### Logs Importants
```typescript
// Dans handleGoBack
console.log('🔧 HorizontalEntityViewer - handleGoBack appelé:', {
  columnIndex, currentPath, totalColumns, allColumns
});

// Dans handleAddArrayItem  
console.log('🔧 EntityColumn - Navigation vers l\'élément index:', newItemIndex);
```

### Tests de Vérification
1. **Ajout d'élément array** → Nouvelle colonne apparaît automatiquement
2. **Modification enfant** → Textarea parent se met à jour (si affiché)
3. **Fermeture colonne** → Colonnes enfants se ferment aussi
4. **Navigation** → Fil d'Ariane cohérent

## 📈 Améliorations Futures

### Court terme
- [ ] Validation en temps réel des JSON dans textareas
- [ ] Messages d'erreur pour les formats JSON invalides
- [ ] Undo/Redo pour les modifications

### Long terme
- [ ] Drag & drop pour réorganiser les éléments d'array
- [ ] Recherche/filtrage dans les grandes structures
- [ ] Export/Import des entités en différents formats
- [ ] Mode diff pour comparer deux versions d'entité

## 🏷️ Tags pour Claude

`#entity-editor` `#multi-column-navigation` `#direct-editing` `#array-management` `#json-schema` `#qwik-reactive`

---
📝 **Dernière mise à jour** : Septembre 2024  
🔧 **Version** : 2.0 - Interface directe sans mode édition  
⚠️ **Statut** : Production - Stable