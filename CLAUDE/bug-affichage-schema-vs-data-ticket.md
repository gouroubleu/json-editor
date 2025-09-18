# TICKET : Bug affichage basé sur data au lieu de schema

**Date** : 2025-09-17
**Type** : Bug Logique Critique
**Priorité** : CRITIQUE

## 🐛 VRAI PROBLÈME IDENTIFIÉ
L'interface affiche les propriétés basées sur les DATA existantes au lieu du JSON SCHEMA défini.

**Résultat :** Objet vide `{}` → Aucune propriété affichée → Pas de volet 3

## 🎯 COMPORTEMENT ATTENDU
L'interface devrait TOUJOURS afficher les propriétés définies dans le JSON Schema, même si l'objet data est vide `{}`.

## 🔍 CODE À CORRIGER
Dans `ContextualEntityColumn.tsx` ligne 530+ :
```typescript
// ❌ FAUX : Affiche seulement les propriétés des DATA
{Object.entries(column.data)
  .filter(([key]) => !column.schema.properties?.[key])
  .map(([key, value]) => {
    return renderField(key, value, column.schema);
  })}

// ✅ CORRECT : Afficher TOUTES les propriétés du SCHEMA
{column.schema.properties && Object.keys(column.schema.properties).map((key) => {
  const value = column.data[key];
  return renderField(key, value, column.schema);
})}
```

## 📋 PLAN D'ACTION URGENT
1. ✅ Créer ce ticket
2. 🔄 Corriger le renderField pour afficher selon SCHEMA
3. 🔄 Tester immédiatement
4. 🔄 Valider navigation volet 3

## ✅ SOLUTION APPLIQUÉE

**Cause identifiée :**
La fonction `canExpand()` dans `ContextualEntityColumn.tsx` ne regardait que la `value` (données) et ignorait le `fieldSchema` (définition JSON Schema).

**Problème technique :**
- Objet vide `{}` → `canExpand(value)` retourne `false`
- Pas de bouton "→" pour naviguer
- Affichage `textarea` au lieu de navigation
- Le schéma définit pourtant des propriétés dans `place.properties`

**Correction appliquée :**
```typescript
const canExpand = (value: any, fieldSchema?: any) => {
  // Vérifier d'abord si le schéma définit des propriétés navigables
  if (fieldSchema) {
    // Si c'est un objet avec des propriétés définies dans le schéma
    if (fieldSchema.type === 'object' && fieldSchema.properties && Object.keys(fieldSchema.properties).length > 0) {
      return true;
    }
    // Si c'est un array avec des items définis
    if (fieldSchema.type === 'array' && fieldSchema.items) {
      return true;
    }
  }

  // Sinon, vérifier la valeur comme avant
  return value !== null && value !== undefined && (typeof value === 'object' || Array.isArray(value)) &&
         ((Array.isArray(value) && value.length > 0) || (typeof value === 'object' && Object.keys(value).length > 0));
};

// Et mise à jour de l'appel :
const canExpanded = canExpand(value, fieldSchema);
```

**Résultat :**
- ✅ L'objet "place" affiche maintenant le bouton "→" pour navigation
- ✅ Navigation vers volet 3 possible même avec objet vide `{}`
- ✅ Interface basée sur JSON Schema et non plus seulement sur données
- ✅ Toutes les propriétés du schéma accessibles

## 🧪 TESTS EFFECTUÉS
- ✅ Serveur opérationnel sur http://localhost:5502/
- ✅ Correction appliquée et testée
- ✅ Navigation schema-based fonctionnelle
- ✅ Objets vides maintenant navigables

## 📁 FICHIERS MODIFIÉS
- `src/routes/bdd/[schema]/components/ContextualEntityColumn.tsx` : Correction canExpand

---
**FIN DE TÂCHE** - 17/09/2025
**STATUT** : ✅ RÉSOLU - Navigation basée sur schema