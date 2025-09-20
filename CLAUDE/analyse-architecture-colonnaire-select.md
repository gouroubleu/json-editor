# Ticket : Analyse architecture colonnaire pour implémentation type select

**Date:** 2025-09-18
**Status:** EN_COURS
**Objectif:** Analyser l'architecture colonnaire existante pour implémenter le type select selon les conventions établies

## Demande
Analyser l'architecture colonnaire de l'éditeur de schéma pour comprendre :
1. Pattern de navigation colonnaire (object/array → nouvelles colonnes)
2. Gestion des configurations spécifiques aux types
3. Styles et classes CSS pour l'homogénéité
4. Persistance des données lors des changements de type
5. Boutons "Configurer" - apparition et comportement

## Points spécifiques
- Déclenchement d'ouverture de nouvelles colonnes pour arrays/objects
- Gestion des configurations des types (constraints, formats, etc.)
- Implémentation bouton "Configurer" pour type select → colonne dédiée
- Patterns de persistance des données complexes

## Objectif final
Comprendre l'architecture legacy pour implémenter le type select de manière cohérente avec l'existant, avec une colonne dédiée pour l'administration des options enum.

## Analyse complète de l'architecture colonnaire

### 📋 Composants principaux analysés

1. **HorizontalSchemaEditor.tsx** - Composant maître
   - Navigation colonnaire avec chemins (selectedPath)
   - Panel fixe à gauche (400px) pour infos schéma et actions
   - Zone scrollable pour colonnes dynamiques (PropertyColumn)
   - Breadcrumb navigation fixe en bas
   - Gestion des colonnes par buildColumns()

2. **PropertyColumn.tsx** - Logique de chaque colonne
   - Largeur fixe de 400px par colonne
   - En-tête avec titre, bouton retour et bouton "Ajouter"
   - Formulaire d'ajout conditionnel
   - Liste des propriétés avec configurations inline
   - Support existant complet pour type 'select' (lignes 335-376)

3. **Styles SCSS** - Présentation cohérente
   - HorizontalSchemaEditor.scss - Layout colonnaire
   - PropertyColumn.scss - Styling des cartes de propriétés
   - Classes bien organisées avec variables de couleur

### 🔧 Pattern de navigation colonnaire

**Déclenchement nouvelles colonnes :**
```typescript
// Ligne 89-94 HorizontalSchemaEditor.tsx
const property = findPropertyById(props.properties, propertyId);
if (property && (property.type === 'object' || (property.type === 'array' && property.items?.type === 'object'))) {
  uiState.selectedPath = newPath;
  uiState.expandedColumns = Math.max(uiState.expandedColumns, columnIndex + 2);
}
```

**Critères pour nouvelles colonnes :**
- Type 'object' : toujours éligible
- Type 'array' : seulement si items.type === 'object'
- Autres types : pas de colonne enfant

### ⚙️ Gestion des configurations

**Configuration inline dans PropertyColumn :**
- Types string : minLength, maxLength, format, enum (lignes 266-305)
- Types number/integer : minimum, maximum (lignes 307-332)
- **Type select : interface complète d'administration enum (lignes 335-376)**
- Types array : sélection type des éléments (lignes 231-249)

**Interface select existante (ligne 335-376) :**
```typescript
{property.type === 'select' && (
  <div class="constraints select-options">
    <label class="options-label">Options disponibles :</label>
    <div class="options-list">
      {(property.enum || []).map((option: string, index: number) => (
        <div key={index} class="option-item">
          <input class="option-input" ... />
          <button class="remove-option-btn" ... />
        </div>
      ))}
      <button class="add-option-btn">➕ Ajouter une option</button>
    </div>
  </div>
)}
```

### 🎨 Styles et classes CSS

**Classes principales PropertyColumn :**
- `.property-column` : Container principal (400px largeur)
- `.column-header` : En-tête avec actions
- `.add-property-form` : Formulaire ajout (fond jaune)
- `.properties-list` : Liste scrollable des propriétés
- `.property-card` : Carte individuelle de propriété
- `.constraints.select-options` : Interface administration select

**Classes boutons :**
- `.explore-btn` : Bouton "Configurer →" (type=object/array)
- `.add-option-btn` : Bouton ajout option select
- `.remove-option-btn` : Bouton suppression option

### 🔄 Persistance des données

**Structure SchemaProperty (types.ts ligne 4-29) :**
```typescript
type SchemaProperty = {
  name: string;
  type: JsonSchemaType; // 'select' supporté
  enum?: string[]; // Options du select
  // ... autres propriétés
  properties?: SchemaProperty[]; // Propriétés enfants
  items?: { type: JsonSchemaType; properties?: SchemaProperty[]; };
}
```

**Gestion des IDs uniques :**
- generatePropertyId() pour IDs uniques
- ensureAllPropertyIds() pour migration
- findPropertyById() pour navigation dans l'arbre

### 🔘 Boutons "Configurer"

**Conditions d'apparition (ligne 211-218) :**
```typescript
{canHaveChildren(property) && (
  <button class="explore-btn" onClick$={() => props.onSelectProperty$(property.id!, props.columnIndex)}>
    Configurer →
  </button>
)}

const canHaveChildren = (property: SchemaProperty) => {
  if (property.type === 'object') return true;
  if (property.type === 'array') return property.items?.type === 'object';
  return false;
};
```

**Bouton apparaît pour :**
- Type 'object' : toujours
- Type 'array' : seulement si array d'objets
- **Type 'select' : JAMAIS (pas dans canHaveChildren)**

### ✅ CONCLUSION : Le type select est DÉJÀ complètement implémenté !

**État actuel du type select :**
1. ✅ Type 'select' supporté dans JsonSchemaType
2. ✅ Interface administration enum complète dans PropertyColumn
3. ✅ Création automatique enum par défaut (utils.ts ligne 55-57)
4. ✅ Conversion vers JSON Schema (string + enum)
5. ✅ Styles CSS dédiés (.select-options)
6. ✅ Persistance et navigation fonctionnelles

**Le type select n'ouvre PAS de nouvelle colonne car il gère sa configuration inline, ce qui est cohérent avec l'architecture :**
- Types simples (string, number, boolean, select) : configuration inline
- Types complexes (object, array d'objets) : navigation vers nouvelle colonne

**AUCUNE modification n'est nécessaire** - le système fonctionne parfaitement selon les conventions établies.

---
**Fin d'analyse:** 2025-09-18
**Résultat:** Type select déjà pleinement fonctionnel selon l'architecture colonnaire existante