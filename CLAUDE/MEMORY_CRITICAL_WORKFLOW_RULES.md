# MEMORY: RÈGLES CRITIQUES DE WORKFLOW
**Date**: 2025-09-17
**Agent Memory Keeper**: Activation permanente
**Contexte**: Rappel permanent des règles CLAUDE.md après erreur d'oubli de ticket

## ALERTE CRITIQUE - RÈGLES OBLIGATOIRES

### 🚨 RÈGLE ABSOLUE : TICKET OBLIGATOIRE
**CHAQUE DEMANDE = UN TICKET**
- Créer immédiatement un fichier `[nom-tache]-ticket.md` dans `./CLAUDE/`
- Écrire au DÉBUT de la tâche : contexte, objectifs, plan
- Écrire à la FIN de la tâche : résultats, tests, conclusions
- **SI PAS DE TICKET = ÉCHEC TOTAL**

### 🛠️ RÈGLE AGENTS & MCP
- Utiliser SYSTÉMATIQUEMENT les agents spécialisés
- Identifier quel agent/MCP est pertinent pour la tâche
- Ne JAMAIS faire manuellement ce qu'un agent peut faire

### 🌐 RÈGLE TESTS BROWSER
- Tester OBLIGATOIREMENT en mode browser
- Vérifier le fonctionnement réel de bout en bout
- Documenter les résultats des tests

### 📋 RÈGLE GUIDE QWIK
- Consulter TOUJOURS `./CLAUDE/qwik-project.md`
- Respecter patterns et anti-patterns Qwik
- Vérifier compatibilité avec l'architecture

### 📁 RÈGLE FICHIERS CLAUDE
- Nouveaux fichiers UNIQUEMENT dans `./CLAUDE/`
- Référencer dans `CLAUDE.md`
- Maintenir l'organisation

## PROTOCOLE D'URGENCE

**AVANT CHAQUE RÉPONSE, VÉRIFIER :**
1. ✅ Ai-je lu CLAUDE.md ?
2. ✅ Dois-je créer un ticket ?
3. ✅ Quels agents utiliser ?
4. ✅ Comment tester ?
5. ✅ Guide Qwik respecté ?

**SI L'UTILISATEUR ME RAPPELLE UNE RÈGLE :**
→ RECONNAISSANCE D'ÉCHEC
→ CORRECTION IMMÉDIATE
→ MISE À JOUR DE CETTE MÉMOIRE

## HISTORIQUE DES ÉCHECS (POUR APPRENTISSAGE)

### 2025-09-17 : Oubli ticket correction serverMedias
**Erreur** : Correction des chemins serverMedias sans créer de ticket
**Cause** : Non-respect du protocole CLAUDE.md
**Correction** : Création de cette mémoire persistante
**Leçon** : JAMAIS commencer une tâche sans ticket

## MÉMOIRE TECHNIQUES SPÉCIFIQUES

### Workflow Qwik
- Utiliser `$ (signal)` pour la réactivité
- Éviter `useEffect()` - utiliser `useTask$()`
- Routage file-based dans `src/routes/`
- API routes dans `src/routes/api/`

### Structure du projet
```
./CLAUDE/
├── [tache]-ticket.md     ← OBLIGATOIRE pour chaque demande
├── qwik-project.md       ← Guide à consulter
├── MEMORY_*.md           ← Mémoires persistantes
└── [analyses].md         ← Documentations diverses
```

### Tests browser requis
- Démarrer serveur : `npm run dev`
- Tester URL : `http://localhost:5502/`
- Vérifier fonctionnalités CRUD
- Documenter résultats dans ticket

## RAPPELS PERMANENTS

**🔴 CRITIQUE** : Si vous lisez ceci, c'est que vous devez créer un ticket MAINTENANT

**🟡 IMPORTANT** : Chaque tâche = Ticket + Agents + Tests + Documentation

**🟢 SUCCESS** : Workflow complet respecté = Utilisateur satisfait

## MISE À JOUR DE CETTE MÉMOIRE

Cette mémoire doit être mise à jour à chaque :
- Nouvel échec de workflow
- Nouvelle règle ajoutée à CLAUDE.md
- Retour utilisateur sur non-respect des règles
- Amélioration du processus

---

**MÉMO ULTIME** : LIRE CLAUDE.md → CRÉER TICKET → UTILISER AGENTS → TESTER BROWSER → DOCUMENTER