# 🧠 Entity Editor - Notes Techniques pour Claude

## 🔴 PIÈGES RÉCURRENTS - À NE JAMAIS OUBLIER

### 1. **Problème Navigation Array - LE PLUS CRITIQUE**
❌ **SYMPTÔME** : "Cliquer 'Ajouter un élément' → Élément ajouté aux données" mais **PAS de colonne à droite**

🔧 **CAUSE** : Manque l'appel `onSelectArrayItem$` après ajout

✅ **SOLUTION OBLIGATOIRE** :
```typescript
// Dans handleAddArrayItem - LIGNE CRITIQUE
const newItemIndex = newArray.length - 1;
props.onSelectArrayItem$?.(newItemIndex, props.columnIndex);
```

⚠️ **HISTORIQUE** : L'utilisateur a signalé ce problème **5 FOIS**. Ne jamais l'oublier !

### 2. **Réactivité des Arrays**  
❌ **SYMPTÔME** : Interface qui ne se met pas à jour après ajout/suppression

🔧 **CAUSE** : Utilisation de `props.data` au lieu du cache réactif

✅ **SOLUTION** :
```typescript
// Pour l'AFFICHAGE des listes
{uiState.arrayData.length > 0 ? (
  renderArrayItems(uiState.arrayData, props.schema)
) : (
  <div>Tableau vide</div>
)}

// Pour les VALEURS des inputs
value={formatValue(props.data[key], fieldSchema?.type)}
```

### 3. **Logique Fermeture Colonnes**
❌ **SYMPTÔME** : Ferme la colonne n-1 au lieu de la colonne courante

🔧 **CAUSE** : Confusion entre index de colonne et longueur de path

✅ **SOLUTION** :
```typescript
const handleGoBack = $((columnIndex: number) => {
  // Pour fermer colonne N : garder path jusqu'à colonne N-1
  let newPathLength = 0;
  if (columnIndex > 0) {
    const previousColumn = columns.value[columnIndex - 1];
    newPathLength = previousColumn.path.length;
  }
  uiState.selectedPath = uiState.selectedPath.slice(0, newPathLength);
  uiState.expandedColumns = columnIndex;
});
```

## 🎯 PATTERNS À RESPECTER

### Gestion des Modifications
```typescript
// TOUJOURS dans cet ordre :
// 1. Modifier le cache local
uiState.arrayData = [...newArray];
// 2. Appeler onDataChange  
props.onDataChange$(fieldPath, newArray);
// 3. Navigation (si nécessaire)
props.onSelectArrayItem$?.(newIndex, props.columnIndex);
```

### Types d'Inputs selon les Schémas
```typescript
// Arrays : Toggle bouton + textarea (masqué par défaut)
fieldSchema?.type === 'array' 
→ <button> + {showEditor && <textarea>}

// Objects : Textarea toujours visible
fieldSchema?.type === 'object'  
→ <textarea>

// Boolean : Select true/false
fieldSchema?.type === 'boolean'
→ <select><option>true/false</select>

// Enum : Select options
fieldSchema?.enum 
→ <select>{enum.map(option)}</select>

// Primitifs : Input typé
→ <input type="number|text">
```

## 🐛 DÉBOGAGE RAPIDE

### Console Logs Essentiels
```typescript
// Navigation arrays
console.log('🔧 EntityColumn - Navigation vers l\'élément index:', newItemIndex);

// Fermeture colonnes  
console.log('🔧 HorizontalEntityViewer - handleGoBack:', {
  columnIndex, newPath, newExpandedColumns
});

// Changements données
console.log('🔧 EntityColumn - Cache array mis à jour:', uiState.arrayData);
```

### Checklist de Vérification
- [ ] Ajout array → Colonne apparaît automatiquement ?
- [ ] Suppression array → Liste se met à jour ?
- [ ] Fermeture colonne → Bonnes colonnes fermées ?
- [ ] Modification enfant → Parent textarea mis à jour ?
- [ ] Navigation → Fil d'Ariane cohérent ?

## ⚡ OPTIMISATIONS IMPORTANTES

### Signaux de Réactivité
```typescript
// Force la recalculation des colonnes
dataChangeSignal.value++;

// Force la réactivité dans useComputed  
const columns = useComputed$(() => {
  dataChangeSignal.value; // Track le signal
  // ... logique de calcul
});
```

### Cache Local Intelligent  
```typescript
useTask$(({ track }) => {
  track(() => props.data);
  
  // Synchroniser cache avec props
  if (props.isArray) {
    uiState.arrayData = [...props.data];
  } else {
    uiState.localData = { ...props.data };
  }
});
```

## 🎨 STYLES CRITIQUES

### Classes à Respecter
```scss
// Inputs directs
.direct-edit-container {
  .direct-edit-input { /* Styles input */ }
  .direct-edit-textarea { /* Styles textarea */ }
  
  // Arrays avec toggle
  .array-json-container {
    .btn { /* Bouton toggle */ }
    .direct-edit-textarea { 
      animation: slideDown 0.2s ease-out; 
    }
  }
}
```

## 🔍 SIGNAUX D'ALERTE

### Phrases de l'utilisateur qui indiquent un problème :
- "la colonne ne s'affiche pas"
- "l'élément est ajouté mais..."  
- "la flèche ferme la mauvaise colonne"
- "le textarea ne se met pas à jour"
- "c'est la Nème fois que..."

### Actions immédiates :
1. Vérifier `onSelectArrayItem$` après ajout
2. Vérifier `uiState.arrayData` vs `props.data` 
3. Vérifier logique `handleGoBack`
4. Vérifier réactivité des textareas

## 📝 RÈGLES D'OR

1. **Navigation automatique** : OBLIGATOIRE après ajout d'élément array
2. **Cache réactif** : `uiState.arrayData` pour affichage, `props.data` pour valeurs
3. **Fermeture colonnes** : Basé sur `previousColumn.path.length`
4. **Types inputs** : Arrays = toggle, Objects = direct, Primitifs = typés
5. **Debugging** : Console logs avec émojis pour traçabilité

---

⚠️ **IMPORTANT** : Ces notes sont basées sur les problèmes **réels** rencontrés lors du développement. Chaque point a causé des bugs ou de la frustration utilisateur.

🎯 **OBJECTIF** : Ne plus jamais refaire les mêmes erreurs et livrer une feature stable du premier coup.