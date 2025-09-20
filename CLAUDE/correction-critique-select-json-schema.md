# Correction Critique - Type Select JSON Schema

**Date**: 2025-09-19
**Priorité**: CRITIQUE
**Fichier**: `/app/src/routes/services.ts`
**Lignes**: 22-28

## Problème Identifié

La fonction `buildPropertySchema` génère un JSON Schema **non-standard** pour le type `select` :

```typescript
// ❌ CODE ACTUEL (INCORRECT)
if (prop.type === 'select') {
  propSchema.type = 'select';  // Type non-standard !
  if (prop.selectOptions && prop.selectOptions.length > 0) {
    propSchema.options = prop.selectOptions;  // Propriété non-standard !
  }
}
```

### Problèmes :
1. **`type: 'select'`** n'existe pas dans JSON Schema standard
2. **`options`** n'est pas une propriété JSON Schema standard
3. Les schémas générés ne passent pas la validation JSON Schema

## Solution

Remplacer par la conversion standard JSON Schema :

```typescript
// ✅ CODE CORRIGÉ (STANDARD)
if (prop.type === 'select') {
  propSchema.type = 'string';  // Type JSON Schema standard
  if (prop.selectOptions && prop.selectOptions.length > 0) {
    propSchema.enum = prop.selectOptions.map(opt => opt.value);  // Enum standard
  }
}
```

## Modification Exacte

**Fichier**: `/home/gouroubleu/WS/json-editor/app/src/routes/services.ts`

**Remplacer les lignes 22-28:**

```diff
- // Gestion du type select (garde le type select)
- if (prop.type === 'select') {
-   propSchema.type = 'select';
-   if (prop.selectOptions && prop.selectOptions.length > 0) {
-     propSchema.options = prop.selectOptions;
-   }
- }
+ // Gestion du type select (convertir en string + enum standard)
+ if (prop.type === 'select') {
+   propSchema.type = 'string';
+   if (prop.selectOptions && prop.selectOptions.length > 0) {
+     propSchema.enum = prop.selectOptions.map(opt => opt.value);
+   }
+ }
```

## Validation de la Correction

Après application du correctif, un select avec options :
```javascript
{
  name: "statut",
  type: "select",
  selectOptions: [
    { key: "draft", value: "Brouillon" },
    { key: "published", value: "Publié" },
    { key: "archived", value: "Archivé" }
  ]
}
```

Doit générer le JSON Schema standard :
```json
{
  "statut": {
    "type": "string",
    "enum": ["Brouillon", "Publié", "Archivé"]
  }
}
```

## Test de Validation

1. Appliquer la correction
2. Créer une propriété select avec options
3. Générer le JSON Schema
4. Vérifier que `type: "string"` et `enum: [...]` sont présents
5. Valider le schema avec un validateur JSON Schema externe

## Impact

- ✅ **Schemas conformes** aux standards JSON Schema
- ✅ **Compatibilité** avec tous les validateurs JSON Schema
- ✅ **Interopérabilité** avec d'autres outils
- ✅ **Aucun impact** sur l'interface utilisateur (qui reste fonctionnelle)

## Notes

- Cette correction n'affecte que la génération JSON Schema
- L'interface SelectOptionsColumn continue de fonctionner normalement
- Les propriétés `selectOptions` restent dans la structure interne pour l'édition
- Seule la sortie JSON Schema finale est standardisée