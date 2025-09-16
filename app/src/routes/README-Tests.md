# Tests Automatisés - Colonnes d'Édition d'Array

## 📋 Description

Cette suite de tests automatisés utilise **Puppeteer** pour vérifier le comportement des colonnes d'édition d'array dans le schemaEditor.

### 🎯 Objectif Principal

Vérifier automatiquement que :
1. La colonne d'édition d'array s'affiche correctement quand on clique sur "Explorer" une propriété array
2. Le bouton "Ajouter un élément" fonctionne
3. Une nouvelle colonne apparaît pour éditer le nouvel élément ajouté

## 🗂️ Fichiers de Test

| Fichier | Description |
|---------|-------------|
| `test-array-columns.cjs` | ✨ **Test principal** - Teste les colonnes d'array |
| `test-server-connectivity.cjs` | 🔍 Test de connectivité du serveur |
| `run-tests.cjs` | 🏃 Script principal pour exécuter tous les tests |
| `test-screenshots/` | 📸 Dossier des captures d'écran |

## 🚀 Comment Exécuter les Tests

### Prérequis
```bash
# 1. Assurez-vous que le serveur est démarré
npm run dev

# 2. Le serveur doit être accessible sur http://localhost:8002
```

### Option 1: Test Complet (Recommandé)
```bash
# Depuis le répertoire schemaEditor
cd src/routes/bo/schemaEditor

# Exécuter tous les tests
node run-tests.cjs
```

### Option 2: Tests Individuels
```bash
# Test de connectivité uniquement
node test-server-connectivity.cjs

# Test des colonnes d'array uniquement  
node test-array-columns.cjs
```

## 📸 Screenshots et Debugging

Les tests génèrent automatiquement des **captures d'écran** à chaque étape dans le dossier `test-screenshots/`:

```
test-screenshots/
├── step-01-navigation.png
├── step-02-page-loaded.png
├── step-03-addresses-search.png
├── step-04-after-expansion-click.png
├── step-05-array-column-verification.png
├── step-06-after-add-element.png
└── step-07-final-verification.png
```

## ⚙️ Configuration

Modifiez les paramètres dans `test-array-columns.cjs` :

```javascript
const CONFIG = {
  baseUrl: 'http://localhost:8002',
  userNewUrl: 'http://localhost:8002/bo/schemaEditor/bdd/user/new/',
  screenshotsDir: './test-screenshots',
  timeout: 30000,
  headless: false,  // true = mode sans interface
  slowMo: 100,     // Ralentir les actions (ms)
};
```

## 🔧 Scénario de Test Détaillé

Le test suit ce scénario automatisé :

1. **🌐 Navigation** - Va à `/bo/schemaEditor/bdd/user/new/`
2. **⏳ Chargement** - Attend que la page soit complètement chargée  
3. **🔍 Recherche** - Trouve la propriété array `addresses`
4. **🖱️ Clic 1** - Clique sur la flèche "→" pour explorer l'array
5. **✅ Assertion 1** - Vérifie qu'une colonne d'édition d'array apparaît
6. **🖱️ Clic 2** - Clique sur le bouton "➕ Ajouter un élément"
7. **✅ Assertion 2** - Vérifie qu'une nouvelle colonne apparaît
8. **📸 Capture** - Prend des screenshots à chaque étape

## 📊 Interprétation des Résultats

### ✅ Test Réussi
```
[✅ SUCCESS] Colonne d'édition d'array détectée !
[✅ SUCCESS] Nouvelle colonne d'édition d'élément détectée !
🎉 TEST GLOBAL : RÉUSSI !
```

### ❌ Test Échoué
```
[❌ ERROR] Aucune colonne d'édition d'array détectée
[❌ ERROR] Nouvelle colonne d'édition non détectée
💥 TEST GLOBAL : ÉCHOUÉ !
```

### 🔍 Debugging

En cas d'échec :

1. **Vérifiez les screenshots** dans `test-screenshots/`
2. **Regardez les logs** détaillés dans la console
3. **Modifiez `headless: false`** pour voir le navigateur en action
4. **Vérifiez les sélecteurs** dans le code si l'UI a changé

## 🎛️ Sélecteurs CSS Utilisés

Le test utilise ces sélecteurs pour identifier les éléments :

```javascript
// Colonnes d'entité
'.entity-column'

// Propriétés de champs
'.field-item .field-name'
'.field-actions button[title="Explorer"]'

// Éléments d'array
'.array-container'
'.array-header'
'button:text("➕ Ajouter un élément")'

// Navigation
'button:text("→")'
```

## 🛠️ Personnalisation

### Tester d'Autres Schémas
```javascript
// Modifiez l'URL dans CONFIG
userNewUrl: 'http://localhost:8002/bo/schemaEditor/bdd/product/new/',
```

### Tester d'Autres Propriétés Array
```javascript
// Modifiez la recherche dans findAddressesArray()
if (text.includes('items') || text.includes('categories')) {
  // ...
}
```

## 📈 Résultats Attendus

Le test valide que l'interface :
- ✅ Charge correctement la page de création d'entité
- ✅ Affiche les colonnes de navigation horizontale
- ✅ Permet l'exploration des propriétés array
- ✅ Affiche une interface d'édition d'array appropriée
- ✅ Permet l'ajout de nouveaux éléments
- ✅ Ouvre une colonne d'édition pour les nouveaux éléments

## 🐛 Résolution de Problèmes

### Le serveur n'est pas accessible
```bash
# Redémarrez le serveur
npm run dev

# Vérifiez que le port 8002 est libre
netstat -ano | findstr :8002
```

### Le test ne trouve pas les éléments
1. Vérifiez que le schéma `user` existe et a une propriété `addresses`
2. Examinez les screenshots pour voir l'état actuel de l'UI
3. Mettez à jour les sélecteurs CSS si nécessaire

### Puppeteer ne se lance pas
```bash
# Réinstallez Puppeteer
npm uninstall puppeteer
npm install puppeteer
```

## 📝 Notes Techniques

- **Puppeteer Version**: Compatible avec la version dans package.json (24.20.0)
- **Node.js**: Testé avec Node.js 18+  
- **Timeout**: 30 secondes par défaut pour chaque action
- **Résolution**: 1920x1080 pour les screenshots
- **Mode**: Navigateur visible par défaut (pour debugging)

## 🤝 Contribution

Pour ajouter de nouveaux tests :

1. Créez un nouveau fichier `test-[fonctionnalite].js`
2. Suivez la même structure avec les classes utilitaires
3. Ajoutez le test au `run-tests.js`
4. Mettez à jour cette documentation

---

**💡 Astuce**: Gardez toujours le navigateur visible (`headless: false`) lors du développement de nouveaux tests pour voir ce qui se passe en temps réel !