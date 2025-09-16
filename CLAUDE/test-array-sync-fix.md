# Test de la correction Array Sync

## Problème identifié
Quand on ajoute un élément à un array :
- ❌ Le formulaire du nouvel élément apparaît (OK)
- ❌ L'affichage du tableau montre qu'il est vide (PROBLÈME)
- ❌ Le textarea JSON est vide aussi (PROBLÈME)

## Cause racine trouvée
Dans `HorizontalEntityViewer.tsx`, ligne 212-214 :
```typescript
if (current[key] === undefined) {
  current[key] = {}; // ❌ TOUJOURS un objet
}
```

## Correction appliquée
```typescript
if (current[key] === undefined) {
  // ✅ Déterminer le type selon le prochain élément du path
  const nextKey = path[i + 1];
  const isNextKeyArrayIndex = !isNaN(parseInt(nextKey));
  current[key] = isNextKeyArrayIndex ? [] : {};
}
```

## Test manuel

### Étapes à suivre :
1. Aller sur `/bo/schemaEditor/bdd/encoreuntest/new/`
2. Cliquer sur le champ "pop" (array)
3. Cliquer sur "➕ Ajouter un élément"
4. Observer :
   - Le count du tableau (doit afficher "1 élément")
   - Le formulaire du nouvel élément
   - Cliquer sur "📝 Éditer en JSON" pour voir le textarea

### Résultats attendus :
- ✅ Array count : "1 élément" (pas "Tableau vide")
- ✅ Textarea JSON : `[{"test": 0, "pop": {"pop": 0}}]`
- ✅ Navigation fonctionnelle vers l'élément

### Log à surveiller :
```
🔧 HorizontalEntityViewer - handleDataChange appelé: {path: ["pop"], newValue: [{}]}
🔧 HorizontalEntityViewer - Nouvelles données: {test: "", pop: [{}]}
```

## Structure du schéma encoreuntest
```json
{
  "properties": {
    "test": { "type": "string" },
    "pop": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "test": { "type": "number" },
          "pop": {
            "type": "object",
            "properties": {
              "pop": { "type": "number" }
            }
          }
        }
      }
    }
  }
}
```

## Validation réussie si :
- Le path `["pop"]` crée bien un array `[]`
- Le path `["pop", "0"]` navigue vers l'élément créé
- Le path `["pop", "0", "pop"]` crée bien un objet `{}`
- La textarea JSON reflète la structure correcte