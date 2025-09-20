# Guide d'utilisation : Type JSON Schema

## Vue d'ensemble

Le type "jsonschema" permet de créer des **références entre schemas JSON Schema**, générant automatiquement des structures `$ref` conformes aux standards JSON Schema.

## 🚀 Utilisation de base

### 1. Créer une propriété JSON Schema

1. **Ouvrir l'éditeur** de schema (nouveau ou existant)
2. **Cliquer sur "Ajouter"** pour créer une nouvelle propriété
3. **Donner un nom** à votre propriété (ex: `user_reference`)
4. **Sélectionner le type "JSON Schema"** dans la dropdown
5. **Cliquer sur "Ajouter"** pour valider

### 2. Configurer la référence

1. **Cliquer sur "Configurer →"** à côté de votre propriété
2. Dans la colonne de configuration qui s'ouvre :
   - **Sélectionner le schema référencé** dans la dropdown
   - **Personnaliser le titre** (optionnel)
   - **Modifier la description** si nécessaire
   - **Cocher "Multiple"** pour créer un array de références

### 3. Configuration avancée (Versioning)

Dans la section **Versioning** :
- **Version spécifique** : Forcer une version précise (ex: `1.2.0`)
- **Version minimum** : Version minimum acceptée (ex: `1.0.0`)
- **Version maximum** : Version maximum acceptée (ex: `2.0.0`)

### 4. Aperçu et validation

- **Aperçu JSON Schema** : Voir le `$ref` généré en temps réel
- **Informations du schema** : Détails du schema référencé
- **Validation automatique** : Alertes en cas de problèmes de version

## 📋 Exemples de génération

### Référence simple
```json
{
  "type": "object",
  "properties": {
    "user_reference": {
      "$ref": "./user.json"
    }
  }
}
```

### Référence multiple (array)
```json
{
  "type": "object",
  "properties": {
    "users": {
      "type": "array",
      "items": {
        "$ref": "./user.json"
      }
    }
  }
}
```

### Référence avec version
```json
{
  "type": "object",
  "properties": {
    "user_reference": {
      "$ref": "./user.json#/definitions/v1.2.0"
    }
  }
}
```

## 🎯 Interface entités (formulaires)

Quand vous utilisez un schema avec des références JSON Schema dans un formulaire d'entité :

1. **Icône spéciale** 🔗 identifie les champs référence
2. **Métadonnées visibles** : nom du schema, version, mode multiple
3. **Saisie spécialisée** : placeholder adapté au type de référence
4. **Validation** : Vérification des références cassées

## ⚙️ Fonctionnalités avancées

### Navigation colonnaire
- **Architecture cohérente** avec les autres types (object, array, select)
- **Breadcrumb navigation** pour se repérer dans les niveaux
- **Interface responsive** qui s'adapte à la complexité

### Gestion des erreurs
- **Références cassées** : Alertes visuelles si le schema référencé n'existe pas
- **Conflits de version** : Avertissements automatiques
- **Validation temps réel** : Retour immédiat sur les problèmes

### Compatibilité
- **Standards JSON Schema** : Génération 100% conforme
- **Versioning avancé** : Support complet du système de versions
- **Réutilisation** : Infrastructure extensible pour futures améliorations

## 🔧 Cas d'usage typiques

### 1. Référence utilisateur
```
Propriété: user_id
Type: JSON Schema
Schema référencé: user
Description: Référence vers un utilisateur
```

### 2. Liste de produits
```
Propriété: products
Type: JSON Schema
Schema référencé: product
Multiple: ✓ (coché)
Description: Liste de produits
```

### 3. Référence avec contrainte de version
```
Propriété: legacy_data
Type: JSON Schema
Schema référencé: legacy-format
Version maximum: 1.9.9
Description: Données au format legacy
```

## 🎨 Interface utilisateur

### Indicateurs visuels
- **🔗** : Icône de référence JSON Schema
- **Version** : Badge de version affiché
- **Multiple** : Badge "Multiple" pour les arrays
- **⚠️** : Alertes pour configurations incomplètes

### Navigation
1. **Colonne principale** : Liste des propriétés avec types
2. **Colonne configuration** : Interface de configuration référence
3. **Aperçu temps réel** : JSON Schema généré visible immédiatement

## 🧪 Tests et validation

### Tests disponibles
- `test-jsonschema-quick-validation.js` : Test rapide (30 sec)
- `test-jsonschema-complet-validation.js` : Test complet (5 min)

### Exécution des tests
```bash
cd /home/gouroubleu/WS/json-editor/CLAUDE
node test-jsonschema-quick-validation.js
```

## 🐛 Résolution des problèmes

### Problème : "Type jsonschema non disponible"
- **Vérifier** que le serveur est démarré
- **Actualiser** la page navigateur
- **Consulter** la console pour erreurs JavaScript

### Problème : "Schema référencé non trouvé"
- **Vérifier** que le schema existe dans la liste
- **S'assurer** que le nom est correct (sensible à la casse)
- **Créer** le schema référencé si nécessaire

### Problème : "Erreur de version"
- **Vérifier** les contraintes de version
- **Consulter** les versions disponibles du schema
- **Ajuster** les contraintes min/max si nécessaire

## 📞 Support

Pour des questions ou problèmes :
1. **Consulter** les logs de la console navigateur
2. **Vérifier** les tickets dans `/CLAUDE/`
3. **Exécuter** les tests de validation
4. **Documenter** les bugs avec captures d'écran

---
*Guide généré pour l'implémentation JSON Schema v1.0*