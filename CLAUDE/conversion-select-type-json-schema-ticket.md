# Ticket : Conversion du type "select" en JSON Schema

## Demande
Trouver dans le codebase la fonction qui convertit les propriétés SchemaProperty[] en JSON Schema final pour ajouter la logique de conversion des types "select" en "string" + "enum".

## Analyse du codebase

### 1. Fonction principale de conversion - `/home/gouroubleu/WS/json-editor/app/src/routes/services.ts`

La fonction **`buildPropertySchema`** (lignes 6-73) est la fonction récursive qui convertit chaque `SchemaProperty` en schéma JSON :

```typescript
const buildPropertySchema = (prop: SchemaProperty): any => {
  const propSchema: any = {
    type: prop.type,
    description: prop.description
  };

  // Contraintes spécifiques par type
  if (prop.type === 'string') {
    if (prop.minLength !== undefined) propSchema.minLength = prop.minLength;
    if (prop.maxLength !== undefined) propSchema.maxLength = prop.maxLength;
    if (prop.format) propSchema.format = prop.format;
    if (prop.enum && prop.enum.length > 0) {
      propSchema.enum = prop.enum.filter(v => v.trim());
    }
  }
  // ... suite de la fonction
};
```

La fonction **`generateJsonSchema`** (lignes 76-130) est la fonction serveur exportée qui orchestre la conversion complète :

```typescript
export const generateJsonSchema = server$(async function(
  schemaInfo: SchemaInfo,
  properties: SchemaProperty[]
): Promise<JsonSchemaOutput> {
  // Construction du schéma final
  properties.forEach(prop => {
    schema.properties![prop.name] = buildPropertySchema(prop);
    // ...
  });
  // ...
});
```

### 2. Fonction côté client - `/home/gouroubleu/WS/json-editor/app/src/components/advanced-schema-editor.tsx`

La fonction **`convertToJsonSchema`** (lignes 86-123) fait une conversion similaire côté client :

```typescript
const convertToJsonSchema = () => {
  const jsonProperties: Record<string, any> = {};
  const required: string[] = [];

  Object.entries(properties).forEach(([name, prop]) => {
    if (!prop) return;

    const jsonProp: any = {
      type: prop.type,
      title: prop.title,
      description: prop.description
    };

    // Add type-specific fields
    if (prop.type === 'string') {
      if (prop.minLength) jsonProp.minLength = prop.minLength;
      if (prop.maxLength) jsonProp.maxLength = prop.maxLength;
      if (prop.format) jsonProp.format = prop.format;
      if (prop.enum && prop.enum.length > 0) {
        jsonProp.enum = prop.enum.filter(v => v.trim());
      }
    }
    // ...
  });
};
```

### 3. Types impliqués - `/home/gouroubleu/WS/json-editor/app/src/routes/types.ts`

**`JsonSchemaType`** (ligne 2) inclut déjà le type 'select' :
```typescript
export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'select';
```

**`SchemaProperty`** (lignes 4-29) contient la propriété `enum` nécessaire :
```typescript
export type SchemaProperty = {
  name: string;
  type: JsonSchemaType;
  // ...
  enum?: string[];
  // ...
};
```

## Solution proposée

Il faut modifier les deux fonctions de conversion pour traiter le type "select" :

### 1. Dans `buildPropertySchema` (services.ts)

Ajouter après la ligne 20 :

```typescript
// Gestion du type select -> conversion en string avec enum
if (prop.type === 'select') {
  propSchema.type = 'string';
  if (prop.enum && prop.enum.length > 0) {
    propSchema.enum = prop.enum.filter(v => v.trim());
  }
}
```

### 2. Dans `convertToJsonSchema` (advanced-schema-editor.tsx)

Modifier la logique existante pour inclure le type select :

```typescript
// Add type-specific fields
if (prop.type === 'string' || prop.type === 'select') {
  // Convertir select en string
  if (prop.type === 'select') {
    jsonProp.type = 'string';
  }

  if (prop.minLength) jsonProp.minLength = prop.minLength;
  if (prop.maxLength) jsonProp.maxLength = prop.maxLength;
  if (prop.format) jsonProp.format = prop.format;
  if (prop.enum && prop.enum.length > 0) {
    jsonProp.enum = prop.enum.filter(v => v.trim());
  }
}
```

## Fichiers à modifier

1. **`/home/gouroubleu/WS/json-editor/app/src/routes/services.ts`** - Fonction `buildPropertySchema`
2. **`/home/gouroubleu/WS/json-editor/app/src/components/advanced-schema-editor.tsx`** - Fonction `convertToJsonSchema`

## Prochaines étapes

1. Implémenter la conversion dans les deux fonctions
2. Tester la génération de schéma avec des propriétés de type "select"
3. Vérifier que le JSON Schema généré est valide et contient `type: "string"` + `enum: [...]`