// Hook spécialisé pour la navigation avancée dans les entités
import { useContext, useComputed$, useStore, useSignal, $ } from '@builder.io/qwik';
import { EntityEditorContext } from '../provider';
import { entityStorage, createNavigationEntry, createBreadcrumbItem } from '../context';
import type {
  EntityNavigationState,
  NavigationEntry,
  HorizontalNavigation,
  BreadcrumbItem,
  RecentEntity
} from '../types';

/**
 * Hook pour la navigation avancée dans les entités avec historique et navigation horizontale
 */
export const useEntityNavigation = () => {
  const { state, actions, config } = useContext(EntityEditorContext);

  // État local pour la navigation
  const navigationState = useStore({
    isNavigating: false,
    quickSearchQuery: '',
    searchResults: [] as Array<{ entityId: string; title: string; relevance: number }>,
    bookmarks: [] as Array<{ entityId: string; title: string; notes?: string }>,
    navigationMode: 'normal' as 'normal' | 'horizontal' | 'search',
    keyboardShortcuts: true
  });

  // Signal pour le mode navigation horizontale
  const horizontalModeEnabled = useSignal(config.value.navigation.enableHorizontalNavigation);

  // Statistiques de navigation
  const navigationStats = useComputed$(() => {
    const { history, recentEntities, favoriteEntities } = state.navigation;

    return {
      historySize: history.length,
      currentPosition: state.navigation.currentIndex + 1,
      canGoBack: state.navigation.currentIndex > 0,
      canGoForward: state.navigation.currentIndex < history.length - 1,
      recentCount: recentEntities.length,
      favoritesCount: favoriteEntities.length,
      bookmarksCount: navigationState.bookmarks.length,
      totalVisitedEntities: new Set(history.map(h => h.entityId).filter(Boolean)).size
    };
  });

  // Navigation horizontale enrichie
  const horizontalNavigation = useComputed$(() => {
    const { horizontalNavigation: nav } = state.navigation;

    if (!nav.enabledForSchema || !state.entities.length) {
      return {
        ...nav,
        canGoNext: false,
        canGoPrev: false,
        progress: 0,
        currentEntity: null,
        nextEntity: null,
        prevEntity: null
      };
    }

    const currentIndex = nav.currentEntityIndex;
    const totalEntities = state.entities.length;

    return {
      ...nav,
      canGoNext: currentIndex < totalEntities - 1,
      canGoPrev: currentIndex > 0,
      progress: totalEntities > 0 ? ((currentIndex + 1) / totalEntities) * 100 : 0,
      currentEntity: state.entities[currentIndex] || null,
      nextEntity: state.entities[currentIndex + 1] || null,
      prevEntity: state.entities[currentIndex - 1] || null,
      remainingEntities: totalEntities - currentIndex - 1
    };
  });

  // Breadcrumbs dynamiques
  const dynamicBreadcrumbs = useComputed$(() => {
    const breadcrumbs: BreadcrumbItem[] = [
      createBreadcrumbItem('Entités', '/bo/schemaEditor/bdd', () => actions.ui.setActiveView('summary'), false)
    ];

    if (state.ui.selectedSchemaName) {
      breadcrumbs.push(
        createBreadcrumbItem(
          state.ui.selectedSchemaName,
          `/bo/schemaEditor/bdd/${state.ui.selectedSchemaName}`,
          () => {
            actions.entities.selectSchema(state.ui.selectedSchemaName);
            actions.ui.setActiveView('list');
          },
          !state.ui.selectedEntityId
        )
      );

      if (state.ui.selectedEntityId) {
        const currentEntity = state.entities.find(e => e.entity.id === state.ui.selectedEntityId);
        const title = currentEntity ? `Entité ${currentEntity.entity.id.substring(0, 8)}...` : 'Entité';

        breadcrumbs.push(
          createBreadcrumbItem(
            title,
            `/bo/schemaEditor/bdd/${state.ui.selectedSchemaName}/${state.ui.selectedEntityId}`,
            undefined,
            true
          )
        );
      }
    }

    return breadcrumbs;
  });

  // Suggestions de navigation
  const navigationSuggestions = useComputed$(() => {
    const suggestions: Array<{
      type: 'recent' | 'related' | 'popular' | 'bookmark';
      entityId: string;
      title: string;
      reason: string;
      confidence: number;
    }> = [];

    // Entités récentes
    state.navigation.recentEntities.slice(0, 3).forEach(recent => {
      suggestions.push({
        type: 'recent',
        entityId: recent.entityId,
        title: recent.title,
        reason: `Consultée ${formatTimeAgo(recent.lastAccessed)}`,
        confidence: 0.8
      });
    });

    // Entités du même schéma (si navigation horizontale)
    if (horizontalNavigation.value.enabledForSchema && state.ui.selectedSchemaName) {
      const relatedEntities = state.entities
        .filter(e => e.entity.id !== state.ui.selectedEntityId)
        .slice(0, 2);

      relatedEntities.forEach(entity => {
        suggestions.push({
          type: 'related',
          entityId: entity.entity.id,
          title: `Entité ${entity.entity.id.substring(0, 8)}...`,
          reason: `Même schéma (${entity.entity.schemaName})`,
          confidence: 0.6
        });
      });
    }

    // Favoris
    state.navigation.favoriteEntities.slice(0, 2).forEach(favoriteId => {
      const entity = state.entities.find(e => e.entity.id === favoriteId);
      if (entity) {
        suggestions.push({
          type: 'bookmark',
          entityId: favoriteId,
          title: `Entité ${favoriteId.substring(0, 8)}...`,
          reason: 'Dans vos favoris',
          confidence: 0.9
        });
      }
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  });

  // Méthodes de navigation avancées
  const navigationMethods = {
    // Navigation par raccourcis clavier
    handleKeyboardNavigation: $((event: KeyboardEvent) => {
      if (!navigationState.keyboardShortcuts) return;

      // Ctrl/Cmd + flèches pour navigation horizontale
      if ((event.ctrlKey || event.metaKey) && horizontalNavigation.value.enabledForSchema) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          actions.navigation.goToPrevEntity();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          actions.navigation.goToNextEntity();
        } else if (event.key === 'Home') {
          event.preventDefault();
          actions.navigation.goToFirstEntity();
        } else if (event.key === 'End') {
          event.preventDefault();
          actions.navigation.goToLastEntity();
        }
      }

      // Alt + flèches pour historique
      if (event.altKey) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          actions.navigation.navigateBack();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          actions.navigation.navigateForward();
        }
      }
    }),

    // Navigation rapide par recherche
    quickNavigate: $(async (query: string) => {
      navigationState.quickSearchQuery = query;
      navigationState.isNavigating = true;

      try {
        // Recherche dans les entités récentes d'abord
        const recentMatches = state.navigation.recentEntities
          .filter(entity =>
            entity.title.toLowerCase().includes(query.toLowerCase()) ||
            entity.entityId.includes(query)
          )
          .map(entity => ({
            entityId: entity.entityId,
            title: entity.title,
            relevance: calculateRelevanceScore(entity.title, query) + 0.2 // Bonus pour récent
          }));

        // Recherche dans toutes les entités chargées
        const allMatches = state.entities
          .filter(entity =>
            entity.entity.id.includes(query) ||
            JSON.stringify(entity.entity.data).toLowerCase().includes(query.toLowerCase())
          )
          .map(entity => ({
            entityId: entity.entity.id,
            title: `Entité ${entity.entity.id.substring(0, 8)}...`,
            relevance: calculateRelevanceScore(entity.entity.id, query)
          }));

        // Combiner et dédupliquer
        const allResults = [...recentMatches, ...allMatches];
        const uniqueResults = allResults.reduce((acc, current) => {
          const existing = acc.find(item => item.entityId === current.entityId);
          if (!existing || current.relevance > existing.relevance) {
            return acc.filter(item => item.entityId !== current.entityId).concat(current);
          }
          return acc;
        }, [] as Array<{ entityId: string; title: string; relevance: number }>);

        navigationState.searchResults = uniqueResults
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, 10);

      } finally {
        navigationState.isNavigating = false;
      }
    }),

    // Navigation vers un résultat de recherche
    navigateToSearchResult: $(async (entityId: string) => {
      navigationState.navigationMode = 'normal';
      navigationState.quickSearchQuery = '';
      navigationState.searchResults = [];
      await actions.entities.select(entityId);
    }),

    // Basculer le mode navigation horizontale
    toggleHorizontalMode: $(() => {
      horizontalModeEnabled.value = !horizontalModeEnabled.value;
      navigationState.navigationMode = horizontalModeEnabled.value ? 'horizontal' : 'normal';

      if (horizontalModeEnabled.value && state.ui.selectedSchemaName) {
        actions.navigation.enableHorizontalNavigation(state.ui.selectedSchemaName);
      }
    }),

    // Ajouter un signet
    addBookmark: $((entityId: string, title: string, notes?: string) => {
      const existingIndex = navigationState.bookmarks.findIndex(b => b.entityId === entityId);

      if (existingIndex > -1) {
        // Mettre à jour le signet existant
        navigationState.bookmarks[existingIndex] = { entityId, title, notes };
      } else {
        // Ajouter un nouveau signet
        navigationState.bookmarks.push({ entityId, title, notes });
      }

      // Sauvegarder dans le stockage local
      entityStorage.set('bookmarks', navigationState.bookmarks);

      actions.notifications.success(
        'Signet ajouté',
        `"${title}" a été ajouté à vos signets`,
        2000
      );
    }),

    // Supprimer un signet
    removeBookmark: $((entityId: string) => {
      const index = navigationState.bookmarks.findIndex(b => b.entityId === entityId);
      if (index > -1) {
        const bookmark = navigationState.bookmarks[index];
        navigationState.bookmarks.splice(index, 1);
        entityStorage.set('bookmarks', navigationState.bookmarks);

        actions.notifications.info(
          'Signet supprimé',
          `"${bookmark.title}" a été retiré de vos signets`,
          2000
        );
      }
    }),

    // Navigation par suggestion
    navigateToSuggestion: $(async (suggestion: any) => {
      await actions.entities.select(suggestion.entityId);

      actions.notifications.info(
        'Navigation suggérée',
        `Navigation vers "${suggestion.title}" - ${suggestion.reason}`,
        3000
      );
    }),

    // Export de l'historique de navigation
    exportNavigationHistory: $(() => {
      const data = {
        history: state.navigation.history,
        recentEntities: state.navigation.recentEntities,
        favoriteEntities: state.navigation.favoriteEntities,
        bookmarks: navigationState.bookmarks,
        stats: navigationStats.value,
        exportedAt: new Date().toISOString()
      };

      return JSON.stringify(data, null, 2);
    }),

    // Analyser les patterns de navigation
    analyzeNavigationPatterns: $(() => {
      const { history } = state.navigation;

      const patterns = {
        mostVisitedSchemas: getMostVisitedSchemas(history),
        navigationFrequency: calculateNavigationFrequency(history),
        sessionDuration: calculateSessionDuration(history),
        backtrackingRate: calculateBacktrackingRate(history),
        favoriteTransitions: findFavoriteTransitions(history)
      };

      return patterns;
    }),

    // Optimiser la navigation basée sur l'usage
    optimizeNavigation: $(() => {
      const patterns = navigationMethods.analyzeNavigationPatterns();

      // Ajuster la taille de l'historique
      const optimalHistorySize = Math.min(100, patterns.navigationFrequency * 10);
      if (optimalHistorySize !== config.value.navigation.maxHistorySize) {
        // Mise à jour de la configuration
        actions.notifications.info(
          'Navigation optimisée',
          `Taille de l'historique ajustée à ${optimalHistorySize}`,
          3000
        );
      }

      // Suggérer l'activation de la navigation horizontale
      if (!horizontalModeEnabled.value && patterns.backtrackingRate > 0.3) {
        actions.notifications.warning(
          'Suggestion d\'optimisation',
          'Activez la navigation horizontale pour réduire les allers-retours',
          5000
        );
      }
    }),

    // Nettoyer l'historique ancien
    cleanupOldHistory: $(() => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 jours

      const originalLength = state.navigation.history.length;
      state.navigation.history = state.navigation.history.filter(
        entry => new Date(entry.timestamp) > cutoffDate
      );

      const removedCount = originalLength - state.navigation.history.length;
      if (removedCount > 0) {
        actions.notifications.info(
          'Historique nettoyé',
          `${removedCount} entrée(s) ancienne(s) supprimée(s)`,
          3000
        );
      }
    })
  };

  return {
    // État de navigation
    navigationStats,
    horizontalNavigation,
    dynamicBreadcrumbs,
    navigationSuggestions,
    isNavigating: navigationState.isNavigating,
    navigationMode: navigationState.navigationMode,

    // Recherche rapide
    quickSearchQuery: navigationState.quickSearchQuery,
    searchResults: navigationState.searchResults,

    // Signets et favoris
    bookmarks: navigationState.bookmarks,
    favorites: state.navigation.favoriteEntities,
    recentEntities: state.navigation.recentEntities,

    // Actions de navigation standard
    ...actions.navigation,

    // Méthodes avancées
    ...navigationMethods,

    // Configuration
    horizontalModeEnabled: horizontalModeEnabled.value,
    keyboardShortcuts: navigationState.keyboardShortcuts,

    // Utilitaires
    enableKeyboardShortcuts: $((enabled: boolean) => {
      navigationState.keyboardShortcuts = enabled;
    }),

    toggleSearchMode: $(() => {
      navigationState.navigationMode = navigationState.navigationMode === 'search' ? 'normal' : 'search';
    })
  };
};

// Fonctions utilitaires privées

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays} jour(s)`;
  return time.toLocaleDateString();
}

function calculateRelevanceScore(text: string, query: string): number {
  if (!text || !query) return 0;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Score exact match
  if (lowerText === lowerQuery) return 1.0;

  // Score starts with
  if (lowerText.startsWith(lowerQuery)) return 0.8;

  // Score contains
  if (lowerText.includes(lowerQuery)) return 0.6;

  // Score partial matches
  const queryWords = lowerQuery.split(' ');
  const matchingWords = queryWords.filter(word => lowerText.includes(word));

  return (matchingWords.length / queryWords.length) * 0.4;
}

function getMostVisitedSchemas(history: NavigationEntry[]): Array<{ schema: string; visits: number }> {
  const schemaCounts = history.reduce((acc, entry) => {
    acc[entry.schemaName] = (acc[entry.schemaName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(schemaCounts)
    .map(([schema, visits]) => ({ schema, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);
}

function calculateNavigationFrequency(history: NavigationEntry[]): number {
  if (history.length < 2) return 0;

  const timeSpan = new Date(history[history.length - 1].timestamp).getTime() -
                   new Date(history[0].timestamp).getTime();
  const hours = timeSpan / (1000 * 60 * 60);

  return hours > 0 ? history.length / hours : 0;
}

function calculateSessionDuration(history: NavigationEntry[]): number {
  if (history.length < 2) return 0;

  const sessions: number[] = [];
  let sessionStart = new Date(history[0].timestamp).getTime();

  for (let i = 1; i < history.length; i++) {
    const currentTime = new Date(history[i].timestamp).getTime();
    const timeDiff = currentTime - new Date(history[i - 1].timestamp).getTime();

    // Si plus de 30 minutes entre les actions, considérer comme une nouvelle session
    if (timeDiff > 30 * 60 * 1000) {
      sessions.push(new Date(history[i - 1].timestamp).getTime() - sessionStart);
      sessionStart = currentTime;
    }
  }

  // Ajouter la session courante
  sessions.push(new Date(history[history.length - 1].timestamp).getTime() - sessionStart);

  return sessions.length > 0 ? sessions.reduce((sum, duration) => sum + duration, 0) / sessions.length : 0;
}

function calculateBacktrackingRate(history: NavigationEntry[]): number {
  if (history.length < 3) return 0;

  let backtrackCount = 0;
  for (let i = 2; i < history.length; i++) {
    // Vérifier si on revient à une entité visitée récemment
    const currentEntityId = history[i].entityId;
    const recentEntities = history.slice(Math.max(0, i - 5), i).map(h => h.entityId);

    if (currentEntityId && recentEntities.includes(currentEntityId)) {
      backtrackCount++;
    }
  }

  return backtrackCount / (history.length - 2);
}

function findFavoriteTransitions(history: NavigationEntry[]): Array<{ from: string; to: string; count: number }> {
  const transitions = new Map<string, number>();

  for (let i = 1; i < history.length; i++) {
    const from = history[i - 1].schemaName;
    const to = history[i].schemaName;
    const key = `${from} -> ${to}`;

    transitions.set(key, (transitions.get(key) || 0) + 1);
  }

  return Array.from(transitions.entries())
    .map(([transition, count]) => {
      const [from, to] = transition.split(' -> ');
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}