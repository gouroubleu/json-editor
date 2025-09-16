# Tests Automatisés avec Authentification

## 🔐 Découverte Importante

Lors du développement des tests automatisés, nous avons découvert que **l'application nécessite une authentification** pour accéder aux pages du schemaEditor. 

La tentative d'accès à `http://localhost:8002/bo/schemaEditor/bdd/user/new/` redirige automatiquement vers `http://localhost:8002/login/`.

## 📋 Solutions de Test Disponibles

### Option 1: Test avec Authentification Automatique ⚡ (Recommandé)

```bash
# Exécuter le test avec gestion d'authentification
node test-array-columns-with-auth.cjs
```

**Fonctionnalités:**
- ✅ Détection automatique des formulaires de connexion
- ✅ Authentification automatique si les credentials sont configurés
- ✅ Fallback vers l'authentification manuelle si l'auto échoue
- ✅ Screenshots détaillés de chaque étape
- ✅ Analyse de la page après connexion

### Option 2: Test de Debugging 🔍

```bash
# Analyser le contenu de la page actuelle
node test-page-debug.cjs
```

**Utilité:**
- 🔍 Voir exactement ce qui s'affiche sur la page
- 📸 Screenshots complets
- 📋 Liste de tous les éléments HTML trouvés
- 🐛 Détection des erreurs JavaScript

## ⚙️ Configuration de l'Authentification

### Étape 1: Modifier les Credentials

Editez le fichier `test-array-columns-with-auth.cjs` et modifiez la section `testCredentials`:

```javascript
testCredentials: {
  username: 'votre-nom-utilisateur',    // ou email selon votre config
  password: 'votre-mot-de-passe',      
  email: 'votre-email@domain.com'       // si le login utilise l'email
}
```

### Étape 2: Identifier le Formulaire de Connexion

Si l'authentification automatique échoue, le script essaie ces sélecteurs :

**Champs Login/Email:**
- `input[type="text"]`
- `input[type="email"]`
- `input[name="username"]`
- `input[name="email"]`
- `#username`, `#email`

**Champs Password:**
- `input[type="password"]`
- `input[name="password"]`
- `#password`

**Boutons de Connexion:**
- `button[type="submit"]`
- `button:text("Se connecter")`
- `.btn-primary`

## 🚀 Utilisation Pratique

### Scénario Typique d'Exécution

1. **Démarrer le serveur**
   ```bash
   npm run dev
   ```

2. **Configurer les credentials** (voir section ci-dessus)

3. **Lancer le test avec authentification**
   ```bash
   node test-array-columns-with-auth.cjs
   ```

4. **Authentification manuelle si nécessaire**
   - Si l'auto-login échoue, le navigateur reste ouvert
   - Connectez-vous manuellement
   - Le test continue automatiquement après 30 secondes

### Résultats Attendus

```
[STEP 1] Initialisation du navigateur Puppeteer
[STEP 2] Gestion de l'authentification  
[STEP 3] Navigation vers la page de création d'entité user
[STEP 4] Attente du chargement complet de la page
[STEP 5] Recherche d'éléments d'édition d'array sur la page
[STEP 9] Nettoyage et fermeture du navigateur

📋 RAPPORT DE TEST FINAL
📸 Screenshots sauvegardés dans: ./test-screenshots
```

## 📸 Screenshots Générés

Le test avec authentification génère ces captures :

```
test-screenshots/
├── step-01-login-page.png           # Page de connexion
├── step-02-before-login-submit.png  # Formulaire rempli
├── step-03-after-login.png          # Après tentative de connexion
├── step-04-navigation.png           # Page cible après navigation
├── step-05-page-loaded.png          # Page complètement chargée
└── step-06-array-search.png         # Analyse des éléments d'array
```

## 🔧 Personnalisation pour Votre Environnement

### Adapter les URLs

```javascript
const CONFIG = {
  loginUrl: 'http://localhost:8002/auth/login/',  // Si différent
  userNewUrl: 'http://localhost:8002/admin/schema/user/create/', // Si différent
  // ...
};
```

### Adapter les Sélecteurs de Connexion

Si votre formulaire de connexion utilise des sélecteurs différents :

```javascript
const loginSelectors = [
  'input[name="email"]',      // Votre sélecteur spécifique
  '#login-email',             // ID spécifique
  '.login-form input[type="text"]' // Classe spécifique
];
```

## 🐛 Résolution de Problèmes

### Problème: "Page de connexion non reconnue"

**Solution 1:** Vérifiez les sélecteurs
```bash
# Utilisez le script de debugging
node test-page-debug.cjs
```

**Solution 2:** Ajoutez vos sélecteurs spécifiques dans le code

### Problème: "Authentification échoue"

**Causes possibles:**
- ❌ Credentials incorrects
- ❌ CAPTCHA présent
- ❌ 2FA activé
- ❌ Sélecteurs de formulaire incorrects

**Solution:** Utilisez l'authentification manuelle
- Le test attend 30 secondes pour que vous vous connectiez manuellement
- Mode `headless: false` obligatoire pour voir le navigateur

### Problème: "Éléments d'array non trouvés"

**Causes possibles:**
- ❌ Le schéma 'user' n'existe pas
- ❌ Le schéma 'user' n'a pas de propriété array
- ❌ Les sélecteurs CSS ont changé
- ❌ JavaScript non chargé complètement

**Solution:** Examinez les screenshots générés
- `step-06-array-search.png` montre l'état final de la page
- Logs dans la console listent tous les éléments trouvés

## 🎯 Objectif Final du Test

Une fois l'authentification résolue, le test devrait :

1. ✅ Se connecter automatiquement
2. ✅ Naviguer vers la page de création d'entité user
3. ✅ Trouver la propriété array 'addresses' (ou similaire)
4. ✅ Cliquer sur le bouton d'exploration "→"
5. ✅ Vérifier qu'une colonne d'édition d'array apparaît
6. ✅ Cliquer sur "Ajouter un élément"
7. ✅ Vérifier qu'une nouvelle colonne d'élément apparaît

## 💡 Conseils d'Optimisation

### Pour les Tests Répétés
1. Gardez une session navigateur ouverte
2. Utilisez les cookies de session sauvegardés
3. Implémentez un système de tokens d'authentification

### Pour le Debugging
1. Activez `headless: false` et `slowMo: 500`
2. Examinez tous les screenshots générés
3. Utilisez les logs détaillés pour comprendre les problèmes

---

**🔐 Note Sécurité:** Ne committez jamais les vrais credentials dans le code. Utilisez des variables d'environnement ou des fichiers de configuration non versionnés pour les environnements de production.