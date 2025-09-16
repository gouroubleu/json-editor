# Test de synchronisation Array ↔ Textarea JSON

## Problème résolu

Quand on configure un array via l'interface utilisateur (ajout/suppression d'éléments), la textarea JSON ne se mettait pas automatiquement à jour pour refléter les changements.

## Solution implémentée

### 1. Cache local pour les textareas JSON
Ajout d'un cache local `jsonTextareaValues` dans l'état du composant `EntityColumn` :

```typescript
const uiState = useStore({
  // ... autres propriétés
  jsonTextareaValues: {} as Record<string, string> // Cache local pour les valeurs des textareas JSON
});
```

### 2. Tracking automatique des changements
Ajout d'un `useTask$` qui surveille les changements dans `props.data` et met à jour automatiquement le cache des textareas :

```typescript
// Tracker les changements dans props.data pour mettre à jour les textareas JSON
useTask$(({ track }) => {
  track(() => JSON.stringify(props.data));

  if (props.schema?.properties && !props.isArray) {
    Object.entries(props.schema.properties).forEach(([key, fieldSchema]: [string, any]) => {
      if ((fieldSchema?.type === 'array' || fieldSchema?.type === 'object') && props.data[key] !== undefined) {
        const newJsonValue = formatValue(props.data[key], fieldSchema.type);
        // Mettre à jour seulement si la valeur a changé pour éviter les boucles infinies
        if (uiState.jsonTextareaValues[key] !== newJsonValue) {
          uiState.jsonTextareaValues[key] = newJsonValue;
        }
      }
    });
  }
});
```

### 3. Utilisation du cache dans les textareas
Les textareas utilisent maintenant le cache local avec fallback vers `props.data` :

```typescript
<textarea
  class="direct-edit-textarea"
  value={uiState.jsonTextareaValues[key] || formatValue(props.data[key], fieldSchema?.type)}
  onInput$={(e) => {
    const target = e.target as HTMLTextAreaElement;
    // Mettre à jour le cache local de la textarea en temps réel
    uiState.jsonTextareaValues[key] = target.value;
  }}
  onChange$={(e) => {
    const target = e.target as HTMLTextAreaElement;
    handleDirectSave(target.value);
  }}
  // ...
/>
```

### 4. Mise à jour du cache lors des sauvegardes
La fonction `handleDirectSave` met maintenant à jour le cache JSON :

```typescript
// Mettre à jour le cache de la textarea JSON si c'est un array/object
if (targetType === 'array' || targetType === 'object') {
  uiState.jsonTextareaValues[key] = formatValue(convertedValue, targetType);
}
```

### 5. Initialisation lors de l'affichage
Quand on clique pour afficher la textarea JSON, le cache est initialisé avec la valeur actuelle :

```typescript
onClick$={() => {
  const wasHidden = !uiState.showJsonEditor[key];
  uiState.showJsonEditor[key] = !uiState.showJsonEditor[key];

  // Si on vient d'afficher la textarea, s'assurer que le cache est à jour
  if (wasHidden && uiState.showJsonEditor[key]) {
    uiState.jsonTextareaValues[key] = formatValue(props.data[key], fieldSchema?.type);
  }
}}
```

## Test du schéma 'encoreuntest'

Le schéma `encoreuntest.json` contient :
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

## Résultat attendu

Maintenant, quand vous :
1. Allez sur `/bo/schemaEditor/bdd/encoreuntest/new/`
2. Ajoutez des éléments à l'array `pop` via l'interface
3. Cliquez sur "📝 Éditer en JSON" pour l'array

→ **La textarea JSON doit afficher automatiquement la structure mise à jour avec les nouveaux éléments ajoutés.**

## Avantages de cette solution

1. **Réactivité** : Les textareas se mettent à jour automatiquement quand la structure change
2. **Performance** : Utilisation d'un cache local pour éviter les re-calculs
3. **Consistance** : Les données sont toujours synchronisées entre l'interface et le JSON
4. **Flexibilité** : Fonctionne pour les arrays et les objects
5. **Évite les boucles** : Vérification des changements avant mise à jour

## Fichiers modifiés

- `src/routes/bo/schemaEditor/bdd/[schema]/components/EntityColumn.tsx`

La solution est maintenant prête à être testée !