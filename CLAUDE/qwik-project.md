# Configuration Claude Code pour Qwik Framework

## ⚠️ RÈGLES CRITIQUES - À RESPECTER ABSOLUMENT

### ❌ JAMAIS utiliser routeAction
- **INTERDIT** : Ne jamais utiliser `routeAction$()` dans aucun cas
- Les actions doivent être gérées via server$ et shareMap

### ❌ JAMAIS utiliser interface - Uniquement type
- **INTERDIT** : Ne jamais utiliser `interface` dans le code Qwik
- **OBLIGATOIRE** : Utiliser uniquement `type` pour toutes les définitions de types

```typescript
// ❌ MAUVAIS
interface UserData { id: string; }

// ✅ CORRECT
type UserData = { id: string; }
```

### 🔧 useVisibleTask$ - Toujours avec eslint-disable
- **OBLIGATOIRE** : Toujours ajouter `// eslint-disable-next-line qwik/no-use-visible-task` avant chaque utilisation
- Qwik préfère `useTask# Configuration Claude Code pour Qwik Framework

## ⚠️ RÈGLES CRITIQUES - À RESPECTER ABSOLUMENT

### ❌ JAMAIS utiliser routeAction
- **INTERDIT** : Ne jamais utiliser `routeAction$()` dans aucun cas
- Les actions doivent être gérées via server$ et shareMap

## ⚠️ RÈGLES CRITIQUES - À RESPECTER ABSOLUMENT

### ❌ JAMAIS utiliser routeAction
- **INTERDIT** : Ne jamais utiliser `routeAction$()` dans aucun cas
- Les actions doivent être gérées via server$ et shareMap

 est parfois nécessaire pour le DOM

```typescript
// ✅ CORRECT
// eslint-disable-next-line qwik/no-use-visible-task
useVisibleTask$(() => {
  // Manipulation DOM, animations, etc.
});
```

### 🎯 RÈGLE D'OR : Export le plus possible pour le chunking optimal
- **OBLIGATOIRE** : Toujours exporter le maximum de fonctions avec `export const`
- **INTERDIT** : Ne JAMAIS définir de fonctions `server$` à l'intérieur des composants
- **INTERDIT** : Ne JAMAIS définir de handlers `$()` complexes inline dans les composants

### ⚠️ routeLoader - Usage TRÈS limité
- **USAGE PRINCIPAL** : Récupérer des données depuis sharedMap uniquement
- **INTERDIT** : Ne JAMAIS faire d'appels API directs dans routeLoader

## 💡 Comprendre le $ dans Qwik

Le symbole `$` = **sérialisation de fonction** par Qwik. C'est le mécanisme core pour :
- Découper le code en chunks séparés (lazy loading)
- Permettre la resumability (reprise d'état sans hydratation)
- Sérialiser les fonctions pour les transférer entre serveur et client

**Règle simple** : Si c'est une fonction dans un composant ou une route → Elle doit être wrappée avec `$` et exportée

| Type | Usage | Contexte d'exécution |
|------|-------|---------------------|
| `$()` | Fonction lazy-loaded générale | Client |
| `server$()` | Fonction exécutée côté serveur | Serveur uniquement |
| `component$()` | Définition de composant | Client (avec SSR) |
| `useTask$()` | Effet réactif | Serveur + Client |
| `useVisibleTask$()` | Effet quand visible | Client uniquement |

## 📁 Structure de projet recommandée

### Organisation des composants autonomes
```
components/user-profile/
├── index.tsx          # Export default du composant
├── index.scss         # Styles spécifiques
├── types.ts           # Types du composant
├── services.ts        # server$ et handlers exportés
└── avatar/            # Sous-composant
    ├── index.tsx
    ├── index.scss
    └── types.ts
```

### Organisation des routes
```
routes/dashboard/
├── layout.tsx         # Layout partagé pour toute la section
├── layout.scss        # Styles du layout
├── index.tsx          # Page principale du dashboard
├── index.scss         # Styles de la page principale
└── analytics/         # Sous-route
    ├── index.tsx
    └── index.scss
```

### Services et types globaux
```
src/
├── services/          # Services globaux avec server$
│   ├── api.service.ts
│   └── auth.service.ts
└── types/            # Types globaux partagés
    ├── user.types.ts
    └── api.types.ts
```

## 🔌 Pattern ShareMap et Connecteurs

### 1. Configuration dans plugin.ts
```typescript
// routes/plugin.ts
import type { RequestHandler } from '@builder.io/qwik-city';

export const onRequest: RequestHandler = async ({ sharedMap, env, cookie }) => {
  // Cache partagé
  const cache = new Map();
  sharedMap.set('cache', cache);
  
  // Connecteur API principal
  sharedMap.set('apiConnector', async (method: string, path: string, body?: any) => {
    const response = await fetch(`${env.get('API_BASE_URL')}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cookie.get('token')?.value}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  });
};
```

### 2. Utilisation avec routeLoader (lecture sharedMap uniquement)
```typescript
// routes/dashboard/index.tsx
export const useInitialData = routeLoader$(async ({ sharedMap }) => {
  const cache = sharedMap.get('cache');
  return cache?.get('userData') || null;
});
```

### 3. Server functions (toujours exportées)
```typescript
// components/user-profile/services.ts
import { server$ } from '@builder.io/qwik-city';

export const fetchUserData = server$(async function(userId: string) {
  const connector = this.sharedMap.get('apiConnector');
  return await connector('GET', `/users/${userId}`);
});

export const updateUserData = server$(async function(userId: string, data: any) {
  const connector = this.sharedMap.get('apiConnector');
  return await connector('PATCH', `/users/${userId}`, data);
});
```

### 4. Handlers (toujours exportés)
```typescript
// components/user-profile/handlers.ts
import { $ } from '@builder.io/qwik';
import { fetchUserData, updateUserData } from './services';

export const handleFetchUser = $(async (userId: string) => {
  return await fetchUserData(userId);
});

export const handleUpdateUser = $(async (userId: string, data: any) => {
  return await updateUserData(userId, data);
});
```

### 5. Composant (utilise les exports)
```typescript
// components/user-profile/index.tsx
import { component$, useSignal, useStyles$ } from '@builder.io/qwik';
import { handleFetchUser, handleUpdateUser } from './handlers';
import type { UserProfileProps } from './types';
import STYLES from './index.scss?inline';

export default component$<UserProfileProps>((props) => {
  useStyles$(STYLES);
  const userData = useSignal(null);
  
  return (
    <div class="cpt-user-profile">
      <button onClick$={() => handleFetchUser(props.userId)}>
        Load User
      </button>
    </div>
  );
});
```

## 🎨 Gestion des styles

### Import et application obligatoires
```typescript
import STYLES from './index.scss?inline';

export default component$(() => {
  useStyles$(STYLES);
  // ...
});
```

### Conventions de nommage CSS

| Type | Classe racine | Classes enfants | Exemple SCSS |
|------|--------------|-----------------|--------------|
| Layout | `layout-[nom]` | Classes simples | `.layout-dashboard > .nav` |
| Page | `page-[nom]` | Classes simples | `.page-products > .title` |
| Composant | `cpt-[nom]` | Classes simples | `.cpt-card > .image` |

### Exemple de styles avec Container Queries et hover
```scss
.cpt-product-card {
  container-type: inline-size;
  container-name: card;
  background: white;
  
  > .image {
    width: 100%;
    height: 200px;
    
    @container card (min-width: 400px) {
      height: 300px;
    }
  }
  
  > .button {
    background: #3498db;
    transition: background-color 0.2s;
    
    // Desktop avec souris
    @media screen and (hover: hover) {
      &:hover {
        background: #2980b9;
      }
    }
    
    // Mobile/Tablette tactile
    @media screen and (hover: none) {
      &:active {
        background: #2980b9;
        transform: scale(0.98);
      }
    }
  }
}
```

## ⚡ Anti-patterns à éviter

1. ❌ `useEffect` style React → ✅ Utiliser `useTask$`
2. ❌ État global style Redux → ✅ Utiliser `useContextProvider`/`useContext`
3. ❌ `routeAction$()` → ✅ `server$()` + sharedMap
4. ❌ API calls dans `routeLoader` → ✅ `server$()` + sharedMap
5. ❌ Fonctions définies dans les composants → ✅ `export const` en dehors
6. ❌ `server$` dans les composants → ✅ `export const` + `server$` en dehors
7. ❌ `interface` TypeScript → ✅ Uniquement `type`
8. ❌ Media queries pour le responsive des composants → ✅ Container queries
9. ❌ Hover sans media query → ✅ `@media screen and (hover: hover)`

## 📝 Exemple complet d'un composant

```typescript
// components/product-card/types.ts
export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
}

export type ProductCardProps = {
  product: Product;
}
```

```typescript
// components/product-card/services.ts
import { server$ } from '@builder.io/qwik-city';

export const addToCart = server$(async function(productId: string) {
  const connector = this.sharedMap.get('apiConnector');
  return await connector('POST', '/cart/add', { productId });
});
```

```typescript
// components/product-card/handlers.ts
import { $ } from '@builder.io/qwik';
import { addToCart } from './services';

export const handleAddToCart = $(async (productId: string) => {
  const result = await addToCart(productId);
  alert(result.success ? 'Added!' : 'Error');
  return result;
});
```

```typescript
// components/product-card/index.tsx
import { component$, useStyles$ } from '@builder.io/qwik';
import { handleAddToCart } from './handlers';
import type { ProductCardProps } from './types';
import STYLES from './index.scss?inline';

export default component$<ProductCardProps>((props) => {
  useStyles$(STYLES);
  
  return (
    <div class="cpt-product-card">
      <img class="image" src={props.product.image} alt={props.product.name} />
      <h3 class="title">{props.product.name}</h3>
      <p class="price">${props.product.price}</p>
      <button class="button" onClick$={() => handleAddToCart(props.product.id)}>
        Add to Cart
      </button>
    </div>
  );
});
```

```scss
// components/product-card/index.scss
.cpt-product-card {
  container-type: inline-size;
  background: white;
  border-radius: 8px;
  
  > .image {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }
  
  > .title {
    padding: 1rem;
    font-size: 1.2rem;
  }
  
  > .price {
    padding: 0 1rem;
    color: #2ecc71;
    font-weight: bold;
  }
  
  > .button {
    width: calc(100% - 2rem);
    margin: 1rem;
    padding: 0.75rem;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    
    @media screen and (hover: hover) {
      &:hover {
        background: #2980b9;
      }
    }
    
    @media screen and (hover: none) {
      &:active {
        transform: scale(0.98);
      }
    }
  }
}
```

## 🔗 Ressources
- Documentation officielle Qwik : https://qwik.builder.io/
- Qwik City (routing) : https://qwik.builder.io/docs/qwikcity/
- Playground Qwik : https://qwik.builder.io/playground/

## 💡 Notes pour Claude Code
- Toujours vérifier la sérialisabilité des données
- Privilégier la performance via le lazy loading ($)
- Utiliser les patterns sharedMap pour toute communication API
- Ne jamais générer de routeAction
- Toujours proposer server$ + sharedMap pour les opérations serveur
- TOUJOURS exporter les server$ et handlers avec export const
- JAMAIS de server$ ou $() définis dans les composants
- Utiliser Container Queries pour le responsive
- Utiliser les conventions de nommage CSS (layout-*, page-*, cpt-*)