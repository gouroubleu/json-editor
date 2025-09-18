# Ticket: Bug ajout propriété adresse - objet null et formulaire incorrect

## Demande
Corriger le bug dans l'ajout de propriété "adresse" sur https://5501-dev.33800.nowhere84.com/bdd/test-user/new/

## Problème décrit par l'utilisateur
1. **URL** : https://5501-dev.33800.nowhere84.com/bdd/test-user/new/
2. **Action** : Clic sur la flèche pour ouvrir configuration de la propriété "adresse"
3. **Résultat attendu** : Colonne de droite avec formulaire correspondant à l'objet adresse
4. **Problème 1** : L'élément ajouté est null
5. **Problème 2** : Le formulaire ne correspond pas à la définition de l'objet adresse

## Contexte technique
- Le projet est automatiquement exposé derrière https://55XX-dev.33800.nowhere84.com
- Il s'agit d'un bug dans la gestion des objets complexes (adresse) dans l'éditeur d'entités

## Actions à faire IMMÉDIATEMENT
1. Aller sur https://5501-dev.33800.nowhere84.com/bdd/test-user/new/
2. Cliquer sur la flèche "adresse" pour reproduire le bug
3. Identifier pourquoi l'élément ajouté est null
4. Identifier pourquoi le formulaire ne correspond pas à la définition
5. Corriger la logique d'ajout d'objets complexes

## Début de la tâche
Date: 2025-09-17
Statut: En cours - Test immédiat

**Note** : Je dois VRAIMENT naviguer vers l'URL et reproduire le bug exact décrit par l'utilisateur.