# Instructions de Test Manuel - Bug Propriété Adresse

## Objectif
Reproduire exactement le bug décrit pour la propriété "adresse" sur la page test-user/new

## Étapes à suivre

### 1. Ouvrir la page de test
```
URL: http://localhost:5505/bdd/test-user/new/
```

### 2. Localiser la propriété "adresse"
- Chercher le champ avec l'icône 📋
- Type affiché: "array"
- Flèche "→" présente à droite

### 3. Cliquer sur la flèche "→"
**ATTENDU selon le code:**
- Une nouvelle colonne devrait apparaître à droite
- Titre: "adresse (0 élément)"
- Contenu: Message "Tableau vide" avec bouton "➕ Ajouter un élément"

**À DOCUMENTER:**
- [ ] Une nouvelle colonne apparaît-elle ?
- [ ] Quel est le titre de la colonne ?
- [ ] Y a-t-il un bouton "Ajouter" ?
- [ ] Y a-t-il des erreurs dans la console ?

### 4. Cliquer sur "➕ Ajouter un élément"
**ATTENDU selon le code:**
Un nouvel objet devrait être créé avec la structure:
```json
{
  "adresse": "",
  "cp": "",
  "ville": "",
  "place": {
    "nom": ""
  }
}
```

**À DOCUMENTER:**
- [ ] Un élément est-il ajouté ?
- [ ] L'élément est-il null ou contient-il les bonnes propriétés ?
- [ ] Les champs correspondent-ils au schéma ?
- [ ] Y a-t-il des erreurs dans la console ?

### 5. Vérifier la correspondance avec le schéma
**SCHÉMA ATTENDU (test-user.json):**
```json
"adresse": {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "adresse": { "type": "string" },
      "cp": { "type": "string" },
      "ville": { "type": "string" },
      "place": {
        "type": "object",
        "properties": {
          "nom": { "type": "string" }
        }
      }
    }
  }
}
```

**À VÉRIFIER:**
- [ ] Les champs affichés correspondent-ils au schéma ?
- [ ] Tous les champs (adresse, cp, ville, place.nom) sont-ils présents ?
- [ ] Les types sont-ils respectés ?

## Logs à surveiller
Ouvrir les DevTools (F12) et surveiller ces logs:
- `🔧 EntityCreationContext - navigateToProperty:`
- `🔧 EntityCreationContext - addArrayElement:`
- Toute erreur JavaScript

## Captures à prendre
1. Avant clic sur la flèche
2. Après clic sur la flèche (nouvelle colonne)
3. Après ajout d'un élément
4. État final du JSON

## Fichier de résultats
Documenter tous les findings dans le fichier de rapport principal.