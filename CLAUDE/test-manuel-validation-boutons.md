# Test Manuel - Validation des Boutons de Sauvegarde

## Date
2025-09-19

## Objectif
Tester manuellement que les corrections apportées fonctionnent correctement :
1. ✅ Bouton actif au départ
2. ✅ Bouton désactivé si erreurs
3. ✅ Bouton réactivé dès que toutes erreurs corrigées

## Instructions de Test

### Préparation
1. Démarrer le serveur de développement : `npm run dev`
2. Ouvrir http://localhost:5503/bdd/ dans un navigateur

### Test 1: Page de Création d'Entité
1. Aller sur http://localhost:5503/bdd/
2. Cliquer sur un schéma existant (ex: test-user)
3. Cliquer sur "Nouvelle entité" ou naviguer vers /new/
4. **VÉRIFIER** : Le bouton "Créer l'entité" doit être ACTIF au départ

#### Test d'erreur de validation
5. Dans un champ requis, saisir une valeur invalide (ex: email invalide)
6. **VÉRIFIER** : Le bouton doit devenir DÉSACTIVÉ et afficher "⚠️ Erreurs à corriger"
7. **VÉRIFIER** : Le tooltip du bouton doit montrer les erreurs présentes

#### Test de correction
8. Corriger la valeur invalide (ex: saisir email valide)
9. **VÉRIFIER** : Le bouton doit redevenir ACTIF et afficher "✨ Créer l'entité"
10. **VÉRIFIER** : Le tooltip ne doit plus montrer d'erreurs

### Test 2: Page de Modification d'Entité
1. Aller sur http://localhost:5503/bdd/
2. Cliquer sur un schéma existant
3. Cliquer sur "Modifier" pour une entité existante
4. **VÉRIFIER** : Le bouton "Sauvegarder" doit être ACTIF au départ

#### Test d'erreur de validation
5. Modifier un champ pour mettre une valeur invalide
6. **VÉRIFIER** : Le bouton doit devenir DÉSACTIVÉ et afficher "⚠️ Erreurs à corriger"
7. **VÉRIFIER** : Le tooltip du bouton doit montrer les erreurs présentes

#### Test de correction
8. Corriger la valeur invalide
9. **VÉRIFIER** : Le bouton doit redevenir ACTIF
10. **VÉRIFIER** : Le tooltip ne doit plus montrer d'erreurs

## Points de Vérification Technique

### Pour la Création (ContextualHorizontalEntityViewer)
- Le bouton utilise : `disabled={store.ui.loading || store.ui.saving || store.ui.hasValidationErrors}`
- L'état `store.ui.hasValidationErrors` est mis à jour par le contexte via `actions.setFieldError`
- Les erreurs remontent des `ContextualEntityColumn` vers le contexte global

### Pour la Modification (HorizontalEntityViewer)
- Le bouton utilise : `disabled={props.loading || props.hasValidationErrors}`
- L'état `props.hasValidationErrors` vient de la page parent qui écoute les changements de données
- La validation se déclenche dans `handleDataChange` après chaque modification

## Critères de Succès
- ✅ Bouton actif au départ (sans erreurs)
- ✅ Bouton désactivé quand erreurs détectées
- ✅ Bouton réactivé quand erreurs corrigées
- ✅ Texte du bouton change selon l'état
- ✅ Tooltip informatif présent quand erreurs
- ✅ Fonctionne pour création ET modification

## Résultats
- [ ] Test 1 (Création) : PASS / FAIL
- [ ] Test 2 (Modification) : PASS / FAIL
- [ ] Bugs détectés : ...
- [ ] Actions correctives : ...

---

**Instructions** : Remplir ce document lors du test manuel et documenter tous les comportements observés.