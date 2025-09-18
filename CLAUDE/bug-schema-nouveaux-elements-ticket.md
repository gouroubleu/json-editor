# TICKET : Bug schéma nouveaux éléments d'array

**Date** : 2025-09-17
**Type** : Bug Navigation - Schéma
**Priorité** : ÉLEVÉE

## 🐛 PROBLÈME IDENTIFIÉ

**Navigation fonctionne PARTIELLEMENT sur nouveaux éléments :**
- ✅ Niveau 1 (adresse array) → Niveau 2 (liste éléments) : OK
- ✅ Niveau 2 (liste) → Niveau 3 (propriétés élément) : OK
- ❌ Niveau 3 (propriétés) → Niveau 4 (sous-objet "place") : ÉCHOUE

## 🔍 ANALYSE TECHNIQUE

**Comportement observé :**
1. **Éléments existants** : Bouton → pour "place" présent
2. **Nouveaux éléments** : Bouton → pour "place" ABSENT

**Tests confirmés :**
```bash
# Test automatisé montre :
- Navigation vers NOUVEL élément : 3 colonnes ✅
- Navigation "place" sur nouvel élément : ÉCHOUE ❌
```

## 🎯 CAUSE PROBABLE

**Problème de propagation du schéma :**

Le schéma des propriétés d'objet ("place") n'est pas correctement propagé pour les nouveaux éléments d'array.

**Dans `calculateColumns()` ligne 246-253 :**
```typescript
columns.push({
  data: itemData,
  schema: itemSchema,  // <- PROBLÈME ICI !
  path: selectedPath.slice(0, i + 2),
  parentName: `${key}[${arrayIndex}]`,
  level: i + 2,
  arrayIndex: arrayIndex
});
```

Le `itemSchema` est le schéma de l'élément d'array, mais quand `ContextualEntityColumn` essaie d'obtenir le schéma pour "place" :

```typescript
const fieldSchema = currentColumn.schema.properties?.[key];
```

Si `currentColumn.schema` est mal configuré, `fieldSchema` sera `undefined` et donc pas de bouton →.

## 📋 PLAN DE CORRECTION

1. ✅ Créer ce ticket
2. 🔄 Investiguer `calculateColumns` pour les éléments d'array
3. 🔄 Vérifier la propagation du schéma `items.properties`
4. 🔄 Corriger le schéma passé aux colonnes d'éléments d'array
5. 🔄 Tester navigation complète sur nouveaux éléments

## 📊 TESTS DE VALIDATION

**Script disponible :** `test-navigation-final-nouvel-element.js`

**Critères de succès :**
- Navigation niveau 5+ sur nouveaux éléments
- Bouton → présent pour tous les objets selon schéma
- Comportement identique éléments existants/nouveaux

---
**DÉBUT CORRECTION** - 17/09/2025
**STATUT** : 🔄 EN COURS - Correction du schéma pour nouveaux éléments