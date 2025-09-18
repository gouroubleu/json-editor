# Ticket: Problème Navigation Infinie Arrays Niveau 3+

## Description
Les arrays au niveau 3+ dans l'éditeur d'entités n'affichent pas le bouton "→" pour continuer la navigation, bloquant la navigation infinie.

## Contexte Technique
- **URL test**: http://localhost:5505/bdd/test-user/new/
- **Navigation**: Utilisateur → adresse → adresse[0] → place → test (array)
- **Problème**: Au niveau 3 (volet "place"), la propriété "test" (array) n'a pas de bouton "→"

## Structure Schéma Attendue
```json
"place": {
  "type": "object",
  "properties": {
    "nom": { "type": "string" },
    "test": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" }
        }
      }
    }
  }
}
```

## Problème Identifié HTML
```html
<div class="field-item">
  <div class="field-actions"></div> <!-- ❌ VIDE pour array "test" -->
</div>
```

## Analyse à Effectuer
1. Examiner `ContextualEntityColumn.tsx`
2. Identifier logique affichage bouton "→"
3. Comprendre différence niveaux 1-2 vs 3+
4. Vérifier génération schémas vs affichage

## Status
- [x] Ticket créé
- [ ] Analyse du code
- [ ] Identification du problème
- [ ] Test de la solution
- [ ] Validation end-to-end

## Début Investigation
Démarrage: 2025-09-17