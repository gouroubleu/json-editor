# Ticket - Correction Type Select selon Legacy et Conventions

## 🚨 PROBLÈMES IDENTIFIÉS

1. **Persistance des données** - Les options enum disparaissent lors du changement de type
2. **Architecture non-conforme** - Interface enum intégrée inline au lieu d'une colonne dédiée
3. **Styles incohérents** - Formulaire sans styles et non-homogène avec l'existant
4. **Tests insuffisants** - N'ont pas vérifié la persistance ni l'UX complète

## 🎯 CORRECTION REQUISE

### Architecture conforme au legacy :
```
Colonne 1: Liste propriétés → Colonne 2: Configuration select → Colonne 3: Administration options
```

### Persistance des données :
- Conserver les options enum lors des changements de type
- Restaurer les options si on repasse en type select

### Interface homogène :
- Styles cohérents avec l'existant
- Navigation colonnaire comme pour object/array
- Boutons et formulaires harmonisés

## 📋 PLAN DE CORRECTION

1. **Analyser l'architecture colonnaire** - Comprendre le pattern existant
2. **Corriger la persistance** - Sauvegarder/restaurer les options enum
3. **Refactorer l'interface** - Déplacer vers colonne dédiée
4. **Harmoniser les styles** - Utiliser les classes existantes
5. **Tests complets** - Vérifier persistance et navigation

---

**Date:** 2025-09-18
**Statut:** 🔴 CRITIQUE - Correction Legacy Required
**Priorité:** 🚨 URGENTE