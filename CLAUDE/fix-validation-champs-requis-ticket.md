# Fix Validation Champs Requis - Ticket

**Date**: 2025-09-19
**Statut**: 🔄 EN COURS
**Priorité**: 🔴 CRITIQUE

## PROBLÈME DÉTAILLÉ

### Comportement Actuel (Défaillant)
1. ✅ Email invalide → erreur affichée sous l'input
2. ❌ Champs requis vides (id, nom) → AUCUNE erreur affichée
3. ❌ Quand je remplis id ou nom → bouton ne se réactive pas

### Cause Identifiée
La validation ne se déclenche que sur onChange/onInput, mais les champs requis vides n'ont jamais d'événement car ils sont vides dès le départ.

### Schéma Test-User
```json
"required": ["id", "nom", "email"]
```

## MISSION COMPLÈTE

### Analyse Technique
1. Analyser pourquoi validation champs requis ne fonctionne pas
2. Examiner le fichier principal: `/home/gouroubleu/WS/json-editor/app/src/routes/bdd/[schema]/components/ContextualEntityColumn.tsx`
3. Identifier où se fait la validation dans `validateAndSave()`

### Implémentation
1. Implémenter validation INITIALE au chargement de la page
2. Valider TOUS les champs requis vides dès le départ
3. Afficher erreurs sous champs requis vides
4. Réactiver bouton quand champs requis remplis

### Tests End-to-End
1. Tester création ET modification
2. S'assurer que le contexte partagé fonctionne correctement
3. Validation exhaustive avec tests browser

## CRITÈRES DE SUCCÈS

- [ ] Page chargée → champs requis vides montrent erreurs + bouton désactivé
- [ ] Remplir id → erreur id disparaît, bouton reste désactivé si autres manquent
- [ ] Remplir nom → erreur nom disparaît, bouton reste désactivé si autres manquent
- [ ] Remplir email → toutes erreurs parties, bouton réactivé
- [ ] Fonctionne pour création ET modification

## PLAN D'EXÉCUTION

### Phase 1: Analyse
- [ ] Analyser le code de validation actuel
- [ ] Identifier les points de défaillance
- [ ] Documenter l'architecture de validation

### Phase 2: Implémentation
- [ ] Ajouter validation initiale au chargement
- [ ] Implémenter détection champs requis vides
- [ ] Modifier logique d'activation/désactivation bouton
- [ ] Corriger affichage des erreurs

### Phase 3: Tests
- [ ] Tests unitaires de validation
- [ ] Tests end-to-end browser
- [ ] Validation création vs modification
- [ ] Tests de régression

---

**Fichiers Principaux à Modifier:**
- `/home/gouroubleu/WS/json-editor/app/src/routes/bdd/[schema]/components/ContextualEntityColumn.tsx`
- Potentiellement autres composants de validation

**Outils Utilisés:**
- Analyse de code avec Read/Grep
- Tests browser avec Puppeteer
- Validation end-to-end