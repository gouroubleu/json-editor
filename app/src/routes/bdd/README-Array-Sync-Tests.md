# Tests de Validation - Synchronisation des Arrays

Ce répertoire contient une suite complète de tests pour vérifier que le problème de synchronisation des arrays dans l'éditeur de schéma est résolu.

## 📋 Scénario de Test

Le test valide ce scénario exact :

1. **Navigation** : Aller sur `/bo/schemaEditor/bdd/encoreuntest/new/`
2. **Sélection** : Naviguer vers le champ "pop" (qui est un array)
3. **Action** : Ajouter un élément au tableau
4. **Validation** : Vérifier que :
   - ✅ Le formulaire du nouvel élément apparaît
   - ✅ L'affichage du tableau montre 1 élément (pas vide)
   - ✅ Le textarea JSON montre le tableau avec l'élément

## 🧪 Types de Tests Disponibles

### 1. Test Interactif (Recommandé pour développement)
**Fichier** : `test-array-sync-validation.tsx`
**Route** : `/bo/schemaEditor/bdd/test-array-sync/`

Interface complète avec :
- Simulation en temps réel de l'éditeur d'entité
- Test automatique et manuel
- Validation visuelle des résultats
- Aperçu JSON intégré

**Usage** :
```bash
# Démarrer le serveur de développement
npm run dev

# Naviguer vers http://localhost:5173/bo/schemaEditor/bdd/test-array-sync/
```

### 2. Test Simple (Validation de base)
**Fichier** : `test-array-sync-simple.cjs`

Test unitaire qui valide :
- Chargement du schéma `encoreuntest.json`
- Génération de valeurs par défaut
- Ajout d'éléments au tableau
- Sérialisation JSON

**Usage** :
```bash
node test-array-sync-simple.cjs
```

### 3. Test Navigateur (Test E2E automatisé)
**Fichier** : `test-array-sync-browser.cjs`

Test end-to-end avec Playwright qui :
- Lance un navigateur automatiquement
- Simule les interactions utilisateur
- Prend des captures d'écran
- Valide le comportement visuel

**Prérequis** :
```bash
npm install playwright
npx playwright install
```

**Usage** :
```bash
node test-array-sync-browser.cjs
```

### 4. Script de Lancement Unifié
**Fichier** : `run-array-sync-tests.cjs`

Script qui exécute tous les tests disponibles.

**Usage** :
```bash
# Tous les tests
node run-array-sync-tests.cjs

# Test simple uniquement
node run-array-sync-tests.cjs --simple-only

# Test navigateur uniquement
node run-array-sync-tests.cjs --browser-only

# Aide
node run-array-sync-tests.cjs --help
```

## 📊 Structure du Schéma de Test

Le test utilise le schéma `encoreuntest.json` :

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

## 🔧 Validation Détaillée

### Point de Validation 1 : Formulaire du Nouvel Élément
- **Objectif** : Vérifier qu'après ajout, un formulaire d'édition apparaît
- **Méthode** : Compter le nombre de colonnes `EntityColumn` actives
- **Critère de succès** : Au moins 2 colonnes visibles

### Point de Validation 2 : Affichage du Tableau
- **Objectif** : Vérifier que l'interface montre "1 élément" et non "vide"
- **Méthode** : Analyser le texte affiché dans la colonne du tableau
- **Critère de succès** : Texte contient "1 élément" ou "(1)"

### Point de Validation 3 : Contenu JSON
- **Objectif** : Vérifier que les données JSON reflètent le tableau non vide
- **Méthode** : Parser le JSON et vérifier `data.pop.length > 0`
- **Critère de succès** : `pop` est un array avec au moins 1 élément

## 📸 Captures d'Écran (Test Navigateur)

Le test navigateur génère automatiquement :
- `01-initial-state.png` : État initial de la page
- `02-pop-field-selected.png` : Après sélection du champ "pop"
- `03-element-added.png` : Après ajout de l'élément
- `04-json-preview.png` : Aperçu JSON avec le tableau
- `99-error.png` : Capture en cas d'erreur

## 🚀 Marche à Suivre pour Validation Manuelle

### Méthode 1 : Test Interactif (Recommandé)
1. Démarrer le serveur : `npm run dev`
2. Aller à : `http://localhost:5173/bo/schemaEditor/bdd/test-array-sync/`
3. Cliquer sur "👁️ Afficher le Test"
4. Option A : Cliquer sur "🚀 Lancer le Test Automatique"
5. Option B : Test manuel :
   - Cliquer sur le champ "pop" dans la première colonne
   - Cliquer sur "➕ Ajouter un élément" dans la colonne du tableau
   - Cliquer sur "✅ Valider Maintenant"
6. Observer les résultats de validation

### Méthode 2 : Test Direct dans l'Application
1. Démarrer le serveur : `npm run dev`
2. Aller à : `http://localhost:5173/bo/schemaEditor/bdd/encoreuntest/new/`
3. Localiser le champ "pop" et cliquer dessus
4. Dans la colonne qui s'ouvre, cliquer sur "➕ Ajouter un élément"
5. Vérifier manuellement :
   - Une nouvelle colonne d'édition s'ouvre ✅
   - L'en-tête de la colonne tableau affiche "pop (1 élément)" ✅
   - Cliquer sur "👁️ Voir JSON" montre un tableau non vide ✅

## 🐛 Problèmes Connus et Solutions

### Problème : Test navigateur échoue avec Playwright
**Solution** : Installer les dépendances Playwright
```bash
npm install playwright
npx playwright install
```

### Problème : Le schéma encoreuntest.json n'existe pas
**Solution** : Le fichier est créé automatiquement ou vérifier le chemin
```
serverMedias/schemas/encoreuntest.json
```

### Problème : Test interactif ne se charge pas
**Solution** : Vérifier que le serveur de développement fonctionne
```bash
npm run dev
```

## 📝 Logs et Débogage

Tous les tests génèrent des logs détaillés :
- **Console navigateur** : Messages préfixés par `🔧` et `TEST`
- **Console Node** : Messages de progression et résultats
- **Captures d'écran** : Dossier `test-screenshots-array-sync/`

Pour un débogage approfondi, chercher les messages :
- `🔧 EntityColumn - handleAddArrayItem appelé`
- `🔧 HorizontalEntityViewer - handleDataChange`
- `🧪 TEST - Validation`

## ✅ Critères de Succès Global

Le problème de synchronisation est considéré comme résolu si :
1. **Tous les tests automatiques passent** (simple + navigateur)
2. **Le test interactif valide les 3 points** ✅ ✅ ✅
3. **Le test manuel dans l'application fonctionne** sans régression

---

*Ce document de test a été généré pour valider spécifiquement le problème de synchronisation des arrays dans l'éditeur de schéma OfficeV2.*