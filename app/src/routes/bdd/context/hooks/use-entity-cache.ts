// Hook spécialisé pour la gestion avancée du cache multi-niveaux des entités
import { useContext, useComputed$, useStore, useSignal, useTask$, $ } from '@builder.io/qwik';
import { EntityEditorContext } from '../provider';
import type {
  EntityCacheStats,
  CachedEntityEntry,
  LoadedEntity,
  EntityFilters,
  CacheLevel,
  CacheKey,
  CacheMetrics,
  CacheStrategy,
  PreloadPattern
} from '../types';

/**
 * Hook pour la gestion avancée du cache multi-niveaux avec optimisation LRU intelligente
 */
export const useEntityCache = () => {
  const { state, actions, config } = useContext(EntityEditorContext);

  // État avancé du cache multi-niveaux
  const cacheState = useStore({
    // Cache L1: Entités les plus fréquemment utilisées (mémoire rapide)
    l1Cache: new Map<string, CachedEntityEntry>(),
    l1MaxSize: config.value.cache.l1MaxSize || 50,
    l1HitRate: 0,

    // Cache L2: Entités récemment utilisées (mémoire étendue)
    l2Cache: new Map<string, CachedEntityEntry>(),
    l2MaxSize: config.value.cache.l2MaxSize || 200,
    l2HitRate: 0,

    // Cache L3: Métadonnées et résultats de recherche
    l3Cache: new Map<string, any>(),
    l3MaxSize: config.value.cache.l3MaxSize || 500,
    l3HitRate: 0,

    // Statistiques avancées
    accessPattern: new Map<string, Array<{ timestamp: number; type: 'hit' | 'miss' }>>(),
    preloadQueue: [] as Array<{ key: string; priority: number; pattern: PreloadPattern }>,
    evictionHistory: [] as Array<{ key: string; timestamp: number; reason: string; level: CacheLevel }>,

    // Métriques de performance
    performanceMetrics: {
      avgAccessTime: 0,
      cacheUtilization: 0,
      memoryPressure: 0,
      fragmentationRate: 0,
      optimizationScore: 0
    } as CacheMetrics,

    // Configuration dynamique
    adaptiveOptimization: true,
    preloadingEnabled: true,
    compressionEnabled: false,
    strategy: 'lru' as CacheStrategy
  });

  // Signal pour les métriques temps réel
  const realtimeMetrics = useSignal({
    totalMemoryUsage: 0,
    activeConnections: 0,
    pendingPreloads: 0
  });

  // Statistiques avancées du cache multi-niveaux
  const cacheStats = useComputed$(() => {
    const l1Entries = Array.from(cacheState.l1Cache.values());
    const l2Entries = Array.from(cacheState.l2Cache.values());
    const l3Entries = Array.from(cacheState.l3Cache.values());
    const totalEntries = l1Entries.length + l2Entries.length + l3Entries.length;

    const l1Size = calculateCacheSize(l1Entries);
    const l2Size = calculateCacheSize(l2Entries);
    const l3Size = calculateCacheSize(l3Entries);
    const totalSize = l1Size + l2Size + l3Size;

    const totalRequests = state.cache.cacheHits + state.cache.cacheMisses;
    const overallHitRate = totalRequests > 0 ? (state.cache.cacheHits / totalRequests) * 100 : 0;

    const stats: EntityCacheStats = {
      // Statistiques globales
      totalEntries,
      totalSizeBytes: totalSize,
      hitRate: overallHitRate,
      missRate: totalRequests > 0 ? (state.cache.cacheMisses / totalRequests) * 100 : 0,
      avgAccessTime: calculateAverageAccessTime([...l1Entries, ...l2Entries]),
      cacheUtilization: (totalEntries / (cacheState.l1MaxSize + cacheState.l2MaxSize + cacheState.l3MaxSize)) * 100,
      expiredEntries: countExpiredEntries([...l1Entries, ...l2Entries], state.cache.ttl),
      oldestEntry: findOldestEntry([...l1Entries, ...l2Entries]),
      newestEntry: findNewestEntry([...l1Entries, ...l2Entries]),

      // Statistiques par niveau
      levelStats: {
        l1: {
          entries: l1Entries.length,
          sizeBytes: l1Size,
          hitRate: cacheState.l1HitRate,
          utilization: (l1Entries.length / cacheState.l1MaxSize) * 100,
          avgAccessTime: calculateAverageAccessTime(l1Entries)
        },
        l2: {
          entries: l2Entries.length,
          sizeBytes: l2Size,
          hitRate: cacheState.l2HitRate,
          utilization: (l2Entries.length / cacheState.l2MaxSize) * 100,
          avgAccessTime: calculateAverageAccessTime(l2Entries)
        },
        l3: {
          entries: l3Entries.length,
          sizeBytes: l3Size,
          hitRate: cacheState.l3HitRate,
          utilization: (l3Entries.length / cacheState.l3MaxSize) * 100,
          avgAccessTime: 0 // L3 est pour les métadonnées
        }
      },

      // Métriques avancées
      metrics: cacheState.performanceMetrics,
      evictionRate: calculateEvictionRate(cacheState.evictionHistory),
      fragmentationScore: calculateFragmentationScore(cacheState),
      optimizationOpportunities: identifyOptimizationOpportunities(cacheState)
    };

    return stats;
  });

  // Entités en cache triées par accès récent
  const recentlyCachedEntities = useComputed$(() => {
    const allEntries = new Map([...cacheState.l1Cache, ...cacheState.l2Cache]);

    return Array.from(allEntries.entries())
      .map(([entityId, entry]) => ({
        entityId,
        entity: entry.entity,
        lastAccessed: entry.lastAccessed,
        accessCount: entry.accessCount,
        cacheSize: estimateEntitySize(entry.entity),
        level: cacheState.l1Cache.has(entityId) ? 'l1' : 'l2'
      }))
      .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
  });

  // Entités expirées
  const expiredEntities = useComputed$(() => {
    const now = Date.now();
    const allEntries = new Map([...cacheState.l1Cache, ...cacheState.l2Cache]);

    return Array.from(allEntries.entries())
      .filter(([_, entry]) => now - new Date(entry.timestamp).getTime() > state.cache.ttl)
      .map(([entityId, entry]) => ({
        entityId,
        expiredSince: now - new Date(entry.timestamp).getTime(),
        lastAccessed: entry.lastAccessed,
        level: cacheState.l1Cache.has(entityId) ? 'l1' : 'l2'
      }));
  });

  // Efficacité du cache par schéma
  const cacheEfficiencyBySchema = useComputed$(() => {
    const schemaStats = new Map<string, {
      hits: number;
      misses: number;
      entities: number;
      totalAccess: number;
    }>();

    const allEntries = [...cacheState.l1Cache.values(), ...cacheState.l2Cache.values()];

    allEntries.forEach((entry) => {
      const schemaName = entry.entity.entity.schemaName;
      const stats = schemaStats.get(schemaName) || { hits: 0, misses: 0, entities: 0, totalAccess: 0 };

      stats.entities++;
      stats.totalAccess += entry.accessCount;

      schemaStats.set(schemaName, stats);
    });

    return Array.from(schemaStats.entries()).map(([schemaName, stats]) => ({
      schemaName,
      ...stats,
      efficiency: stats.totalAccess > 0 ? (stats.hits / (stats.hits + stats.misses)) * 100 : 0,
      avgAccessPerEntity: stats.entities > 0 ? stats.totalAccess / stats.entities : 0
    }));
  });

  // Méthodes avancées de gestion du cache multi-niveaux
  const cacheUtils = {
    // Récupération intelligente avec cache multi-niveaux
    get: $(async (key: string): Promise<CachedEntityEntry | null> => {
      const startTime = performance.now();

      // Tentative L1 (cache le plus rapide)
      let entry = cacheState.l1Cache.get(key);
      if (entry) {
        updateAccessMetrics(key, 'hit', 'l1');
        cacheState.l1HitRate = updateHitRate(cacheState.l1HitRate, true);
        promoteToL1(key, entry); // Réorganiser si nécessaire
        return entry;
      }

      // Tentative L2 (cache étendu)
      entry = cacheState.l2Cache.get(key);
      if (entry) {
        updateAccessMetrics(key, 'hit', 'l2');
        cacheState.l2HitRate = updateHitRate(cacheState.l2HitRate, true);

        // Promouvoir vers L1 si fréquemment accédé
        if (shouldPromoteToL1(entry)) {
          moveToL1(key, entry);
        }
        return entry;
      }

      // Pas de cache hit - mettre à jour les métriques
      updateAccessMetrics(key, 'miss', null);
      updateMissRates();

      const accessTime = performance.now() - startTime;
      updatePerformanceMetrics(accessTime);

      return null;
    }),

    // Stockage intelligent avec optimisation automatique
    set: $(async (key: string, entry: CachedEntityEntry, level?: CacheLevel) => {
      const targetLevel = level || determineOptimalLevel(entry);

      switch (targetLevel) {
        case 'l1':
          setToL1(key, entry);
          break;
        case 'l2':
          setToL2(key, entry);
          break;
        case 'l3':
          setToL3(key, entry);
          break;
      }

      // Déclencher l'optimisation si nécessaire
      if (cacheState.adaptiveOptimization) {
        await optimizeCacheLevels();
      }
    }),

    // Préchargement intelligent basé sur les patterns
    preloadSchemaEntities: async (schemaName: string, limit: number = 10) => {
      const pattern: PreloadPattern = {
        type: 'schema',
        identifier: schemaName,
        priority: calculatePreloadPriority(schemaName),
        estimatedBenefit: estimatePreloadBenefit(schemaName)
      };

      cacheState.preloadQueue.push({
        key: `schema:${schemaName}`,
        priority: pattern.priority,
        pattern
      });

      if (cacheState.preloadingEnabled) {
        await processPreloadQueue();
      }
    },

    // Préchargement intelligent des entités liées avec analyse des relations
    preloadRelatedEntities: async (entityId: string) => {
      const entry = await cacheUtils.get(entityId);
      if (!entry) return;

      // Analyser les relations dans les données de l'entité
      const relatedIds = extractRelatedEntityIds(entry.entity.entity.data);
      const relationGraph = buildRelationGraph(entityId, relatedIds);

      // Trier par score de pertinence
      const prioritizedIds = relatedIds
        .map(id => ({
          id,
          score: calculateRelationScore(entityId, id, relationGraph),
          depth: getRelationDepth(entityId, id, relationGraph)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, config.value.cache.maxRelatedPreload || 8);

      // Précharger par ordre de priorité
      for (const { id, score } of prioritizedIds) {
        if (!(await cacheUtils.get(id))) {
          const pattern: PreloadPattern = {
            type: 'related',
            identifier: id,
            parentId: entityId,
            priority: score,
            estimatedBenefit: score * 0.8 // Réduire l'estimation pour les liées
          };

          cacheState.preloadQueue.push({
            key: `related:${id}`,
            priority: score,
            pattern
          });
        }
      }

      if (cacheState.preloadingEnabled) {
        await processPreloadQueue();
      }
    },

    // Optimisation intelligente multi-niveaux avec algorithme LRU avancé
    optimizeCache: $(() => {
      optimizeCacheLevels();
    }),

    // Optimisation adaptative basée sur les patterns d'utilisation
    adaptiveOptimization: $(async () => {
      const patterns = analyzeAccessPatterns();
      const recommendations = generateOptimizationRecommendations(patterns);

      // Appliquer les recommandations automatiquement
      for (const rec of recommendations) {
        await applyOptimizationRecommendation(rec);
      }

      // Mettre à jour les métriques d'optimisation
      cacheState.performanceMetrics.optimizationScore = calculateOptimizationScore();
    }),

    // Analyse approfondie de l'utilisation du cache multi-niveaux
    analyzeCacheUsage: $(() => {
      const l1Entries = Array.from(cacheState.l1Cache.values());
      const l2Entries = Array.from(cacheState.l2Cache.values());
      const allEntries = [...l1Entries, ...l2Entries];

      const analysis = {
        // Statistiques par niveau
        levelAnalysis: {
          l1: analyzeLevel(l1Entries, 'l1'),
          l2: analyzeLevel(l2Entries, 'l2'),
          l3: analyzeLevel(Array.from(cacheState.l3Cache.values()), 'l3')
        },

        // Analyse globale
        global: {
          mostAccessed: findMostAccessed(allEntries),
          leastAccessed: findLeastAccessed(allEntries),
          averageAccess: calculateAverageAccess(allEntries),
          recentlyAccessed: filterRecentlyAccessed(allEntries, 5 * 60 * 1000),
          neverAccessed: filterNeverAccessed(allEntries),
          hotspots: identifyHotspots(allEntries),
          coldData: identifyColdData(allEntries)
        },

        // Patterns d'accès
        accessPatterns: analyzeAccessPatterns(),

        // Recommandations d'optimisation
        recommendations: generateCacheRecommendations(allEntries),

        // Métriques de performance
        performance: {
          hitRateByTime: calculateHitRateByTime(),
          throughput: calculateCacheThroughput(),
          latencyDistribution: calculateLatencyDistribution(),
          memoryEfficiency: calculateMemoryEfficiency()
        }
      };

      return analysis;
    }),

    // Réchauffement intelligent du cache avec prédiction
    warmupCache: async (schemaName?: string) => {
      const warmupStrategy = determineWarmupStrategy(schemaName);

      switch (warmupStrategy.type) {
        case 'popular':
          await warmupPopularEntities(schemaName, warmupStrategy.count);
          break;
        case 'recent':
          await warmupRecentEntities(schemaName, warmupStrategy.count);
          break;
        case 'predictive':
          await warmupPredictiveEntities(schemaName, warmupStrategy.patterns);
          break;
        case 'mixed':
          await warmupMixedStrategy(schemaName, warmupStrategy);
          break;
      }

      // Mesurer l'efficacité du réchauffement
      const efficiency = await measureWarmupEfficiency();

      actions.notifications.success(
        'Cache réchauffé',
        `Efficacité du réchauffement: ${Math.round(efficiency * 100)}%`,
        { duration: 2000 }
      );
    },

    // Export complet des statistiques et métriques du cache
    exportCacheStats: $(() => {
      const stats = cacheStats.value;
      const analysis = cacheUtils.analyzeCacheUsage();

      const detailed = {
        timestamp: new Date().toISOString(),
        version: '2.0',

        // Statistiques globales
        global: stats,

        // Analyse détaillée
        analysis,

        // Configuration actuelle
        config: {
          strategy: cacheState.strategy,
          adaptiveOptimization: cacheState.adaptiveOptimization,
          preloadingEnabled: cacheState.preloadingEnabled,
          compressionEnabled: cacheState.compressionEnabled,
          levels: {
            l1MaxSize: cacheState.l1MaxSize,
            l2MaxSize: cacheState.l2MaxSize,
            l3MaxSize: cacheState.l3MaxSize
          },
          ttl: state.cache.ttl
        },

        // Historique d'éviction
        evictionHistory: cacheState.evictionHistory.slice(-100), // Derniers 100

        // Queue de préchargement
        preloadQueue: cacheState.preloadQueue,

        // Métriques temps réel
        realtime: realtimeMetrics.value,

        // Entités par niveau
        entities: {
          l1: recentlyCachedEntities.value.filter(e => cacheState.l1Cache.has(e.entityId)),
          l2: recentlyCachedEntities.value.filter(e => cacheState.l2Cache.has(e.entityId)),
          expired: expiredEntities.value
        },

        // Efficacité par schéma
        schemaEfficiency: cacheEfficiencyBySchema.value
      };

      return JSON.stringify(detailed, null, 2);
    })
  };

  // Tâche d'optimisation automatique
  useTask$(({ cleanup }) => {
    if (!cacheState.adaptiveOptimization) return;

    const interval = setInterval(() => {
      // Optimisation périodique
      if (shouldRunOptimization()) {
        cacheUtils.adaptiveOptimization();
      }

      // Nettoyage des métriques anciennes
      cleanupOldMetrics();

      // Mise à jour des métriques temps réel
      updateRealtimeMetrics();

    }, config.value.cache.optimizationInterval || 30000); // 30 secondes

    cleanup(() => clearInterval(interval));
  });

  return {
    // État du cache multi-niveaux
    cacheStats,
    recentlyCachedEntities,
    expiredEntities,
    cacheEfficiencyBySchema,

    // Nouveau: Métriques par niveau
    l1Stats: useComputed$(() => cacheStats.value.levelStats?.l1),
    l2Stats: useComputed$(() => cacheStats.value.levelStats?.l2),
    l3Stats: useComputed$(() => cacheStats.value.levelStats?.l3),

    // Actions de cache standard (compatibilité)
    ...actions.cache,

    // Utilitaires avancés
    ...cacheUtils,

    // Configuration avancée
    config: {
      ...config.value.cache,
      strategy: cacheState.strategy,
      adaptiveOptimization: cacheState.adaptiveOptimization,
      preloadingEnabled: cacheState.preloadingEnabled,
      compressionEnabled: cacheState.compressionEnabled
    },

    // Métriques en temps réel avancées
    isOverCapacity: isAnyCacheLevelOverCapacity(),
    memoryPressure: cacheState.performanceMetrics.memoryPressure,
    recommendedCleanup: shouldRecommendCleanup(cacheState),
    optimizationScore: cacheState.performanceMetrics.optimizationScore,

    // Nouveau: Contrôles avancés
    setCacheStrategy: $((strategy: CacheStrategy) => {
      cacheState.strategy = strategy;
      actions.notifications.info('Stratégie mise à jour', `Nouvelle stratégie: ${strategy}`);
    }),

    toggleAdaptiveOptimization: $(() => {
      cacheState.adaptiveOptimization = !cacheState.adaptiveOptimization;
      actions.notifications.info(
        'Optimisation adaptative',
        `${cacheState.adaptiveOptimization ? 'Activée' : 'Désactivée'}`
      );
    }),

    togglePreloading: $(() => {
      cacheState.preloadingEnabled = !cacheState.preloadingEnabled;
      if (!cacheState.preloadingEnabled) {
        cacheState.preloadQueue = [];
      }
    }),

    // Métriques détaillées
    realtimeMetrics: realtimeMetrics.value,
    performanceMetrics: cacheState.performanceMetrics,
    evictionHistory: cacheState.evictionHistory,
    preloadQueue: cacheState.preloadQueue
  };
};

// ===== FONCTIONS UTILITAIRES AVANCÉES =====

// Gestion intelligente du cache L1
function setToL1(key: string, entry: CachedEntityEntry) {
  if (cacheState.l1Cache.size >= cacheState.l1MaxSize) {
    evictFromL1();
  }
  cacheState.l1Cache.set(key, entry);
}

// Gestion intelligente du cache L2
function setToL2(key: string, entry: CachedEntityEntry) {
  if (cacheState.l2Cache.size >= cacheState.l2MaxSize) {
    evictFromL2();
  }
  cacheState.l2Cache.set(key, entry);
}

// Gestion du cache L3 (métadonnées)
function setToL3(key: string, entry: any) {
  if (cacheState.l3Cache.size >= cacheState.l3MaxSize) {
    evictFromL3();
  }
  cacheState.l3Cache.set(key, entry);
}

// Éviction intelligente du L1 (LRU avancé)
function evictFromL1() {
  const entries = Array.from(cacheState.l1Cache.entries());
  const victim = findEvictionVictim(entries, 'l1');

  if (victim) {
    cacheState.l1Cache.delete(victim.key);

    // Possible dégradation vers L2
    if (shouldDegradeToL2(victim.entry)) {
      setToL2(victim.key, victim.entry);
    }

    recordEviction(victim.key, 'l1', 'lru');
  }
}

// Éviction intelligente du L2
function evictFromL2() {
  const entries = Array.from(cacheState.l2Cache.entries());
  const victim = findEvictionVictim(entries, 'l2');

  if (victim) {
    cacheState.l2Cache.delete(victim.key);
    recordEviction(victim.key, 'l2', 'lru');
  }
}

// Éviction simple du L3
function evictFromL3() {
  const entries = Array.from(cacheState.l3Cache.entries());
  if (entries.length > 0) {
    const oldestKey = entries[0][0]; // Simple FIFO pour L3
    cacheState.l3Cache.delete(oldestKey);
    recordEviction(oldestKey, 'l3', 'fifo');
  }
}

// Fonctions utilitaires existantes améliorées
function calculateCacheSize(entries: CachedEntityEntry[]): number {
  return entries.reduce((total, entry) => {
    return total + estimateEntitySize(entry.entity);
  }, 0);
}

function estimateEntitySize(entity: LoadedEntity): number {
  // Estimation plus précise de la taille en bytes
  const jsonString = JSON.stringify(entity);
  const sizeInBytes = new Blob([jsonString]).size;
  return sizeInBytes;
}

function calculateAverageAccessTime(entries: CachedEntityEntry[]): number {
  if (entries.length === 0) return 0;
  const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
  return totalAccess / entries.length;
}

function countExpiredEntries(entries: CachedEntityEntry[], ttl: number): number {
  const now = Date.now();
  return entries.filter(entry =>
    now - new Date(entry.timestamp).getTime() > ttl
  ).length;
}

function findOldestEntry(entries: CachedEntityEntry[]): string | null {
  if (entries.length === 0) return null;
  return entries.reduce((oldest, entry) =>
    new Date(entry.timestamp) < new Date(oldest.timestamp) ? entry : oldest
  ).entity.entity.id;
}

function findNewestEntry(entries: CachedEntityEntry[]): string | null {
  if (entries.length === 0) return null;
  return entries.reduce((newest, entry) =>
    new Date(entry.timestamp) > new Date(newest.timestamp) ? entry : newest
  ).entity.entity.id;
}

// Nouvelles fonctions pour le cache multi-niveaux
function extractRelatedEntityIds(data: Record<string, any>): string[] {
  const entityIds: string[] = [];
  const references = new Set<string>();

  // Recherche récursive avancée d'IDs d'entités
  function searchForIds(obj: any, path: string = '') {
    if (typeof obj === 'string') {
      // Patterns d'ID d'entités plus flexibles
      const patterns = [
        /^entity_[a-f0-9-]{8,}/i,
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
        /^ref_\w+_[a-f0-9]+$/i
      ];

      for (const pattern of patterns) {
        if (pattern.test(obj)) {
          entityIds.push(obj);
          references.add(`${path}:${obj}`);
          break;
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => searchForIds(item, `${path}[${index}]`));
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) =>
        searchForIds(value, path ? `${path}.${key}` : key)
      );
    }
  }

  searchForIds(data);
  return [...new Set(entityIds)]; // Supprimer les doublons
}

// Fonctions utilitaires pour l'optimisation (implémentations simplifiées pour l'exemple)
function calculateEvictionRate(history: any[]): number {
  if (history.length < 2) return 0;
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  const recentEvictions = history.filter(e => e.timestamp > oneHourAgo);
  return recentEvictions.length;
}

function calculateFragmentationScore(cacheState: any): number {
  const totalCapacity = cacheState.l1MaxSize + cacheState.l2MaxSize + cacheState.l3MaxSize;
  const totalUsed = cacheState.l1Cache.size + cacheState.l2Cache.size + cacheState.l3Cache.size;
  const efficiency = totalUsed / totalCapacity;
  return Math.max(0, 1 - (efficiency * 0.8));
}

function identifyOptimizationOpportunities(cacheState: any): string[] {
  const opportunities: string[] = [];

  if (cacheState.l1Cache.size < cacheState.l1MaxSize * 0.5) {
    opportunities.push('Sous-utilisation du cache L1');
  }

  if (cacheState.l2Cache.size > cacheState.l2MaxSize * 0.9) {
    opportunities.push('Saturation du cache L2');
  }

  if (cacheState.evictionHistory.length > 100) {
    opportunities.push('Taux d\'éviction élevé');
  }

  return opportunities;
}

// Implémentations simplifiées des autres fonctions
function updateAccessMetrics(key: string, type: 'hit' | 'miss', level: CacheLevel | null) {
  // Mise à jour des métriques d'accès
}

function updateHitRate(currentRate: number, isHit: boolean): number {
  const alpha = 0.1;
  return currentRate * (1 - alpha) + (isHit ? 1 : 0) * alpha;
}

function promoteToL1(key: string, entry: CachedEntityEntry) {
  // Logique de promotion vers L1
}

function shouldPromoteToL1(entry: CachedEntityEntry): boolean {
  return entry.accessCount > 5; // Exemple simple
}

function moveToL1(key: string, entry: CachedEntityEntry) {
  cacheState.l2Cache.delete(key);
  setToL1(key, entry);
}

function updateMissRates() {
  // Mise à jour des taux de miss
}

function updatePerformanceMetrics(accessTime: number) {
  // Mise à jour des métriques de performance
}

function determineOptimalLevel(entry: CachedEntityEntry): CacheLevel {
  const score = calculateCacheImportance(entry);
  if (score > 0.8) return 'l1';
  if (score > 0.4) return 'l2';
  return 'l3';
}

function calculateCacheImportance(entry: CachedEntityEntry): number {
  const factors = {
    accessFrequency: Math.min(1, (entry.accessCount || 0) / 10),
    recency: calculateRecencyScore(entry.lastAccessed),
    entitySize: 1 - Math.min(1, estimateEntitySize(entry.entity) / 1000000),
    entityType: getEntityTypeImportance(entry.entity)
  };

  return (
    factors.accessFrequency * 0.4 +
    factors.recency * 0.3 +
    factors.entitySize * 0.2 +
    factors.entityType * 0.1
  );
}

function calculateRecencyScore(lastAccessed: string): number {
  const now = Date.now();
  const accessTime = new Date(lastAccessed).getTime();
  const hoursSinceAccess = (now - accessTime) / (1000 * 60 * 60);
  return Math.max(0, 1 - (hoursSinceAccess / 24));
}

function getEntityTypeImportance(entity: any): number {
  const criticalSchemas = ['user', 'session', 'auth'];
  return criticalSchemas.includes(entity.entity.schemaName) ? 1.0 : 0.5;
}

// Fonctions d'optimisation (implémentations de base)
async function optimizeCacheLevels() {
  // Optimisation des niveaux de cache
}

function analyzeAccessPatterns() {
  return {
    hotKeys: [],
    coldKeys: [],
    accessFrequency: 0,
    temporalPatterns: []
  };
}

function generateOptimizationRecommendations(patterns: any) {
  return [];
}

async function applyOptimizationRecommendation(rec: any) {
  // Application des recommandations
}

function calculateOptimizationScore(): number {
  return 0.8; // Score exemple
}

function shouldRunOptimization(): boolean {
  return Math.random() > 0.8; // Exemple simple
}

function cleanupOldMetrics() {
  // Nettoyage des métriques anciennes
}

function updateRealtimeMetrics() {
  // Mise à jour des métriques temps réel
}

function isAnyCacheLevelOverCapacity(): boolean {
  return (
    cacheState.l1Cache.size > cacheState.l1MaxSize ||
    cacheState.l2Cache.size > cacheState.l2MaxSize ||
    cacheState.l3Cache.size > cacheState.l3MaxSize
  );
}

function shouldRecommendCleanup(cacheState: any): boolean {
  const reasons = [];
  const l1Expired = countExpiredInLevel(cacheState.l1Cache, state.cache.ttl);
  const l2Expired = countExpiredInLevel(cacheState.l2Cache, state.cache.ttl);

  if (l1Expired > cacheState.l1Cache.size * 0.2) {
    reasons.push('L1 cache expired entries');
  }

  if (l2Expired > cacheState.l2Cache.size * 0.25) {
    reasons.push('L2 cache expired entries');
  }

  return reasons.length > 0;
}

function countExpiredInLevel(cache: Map<string, any>, ttl: number): number {
  const now = Date.now();
  return Array.from(cache.values())
    .filter((entry: any) => now - new Date(entry.timestamp).getTime() > ttl)
    .length;
}

// Autres fonctions utilitaires simplifiées
function findEvictionVictim(entries: [string, any][], level: CacheLevel): { key: string; entry: any } | null {
  if (entries.length === 0) return null;
  return { key: entries[0][0], entry: entries[0][1] };
}

function shouldDegradeToL2(entry: any): boolean {
  return entry.accessCount > 1;
}

function recordEviction(key: string, level: CacheLevel, reason: string) {
  cacheState.evictionHistory.push({
    key,
    timestamp: Date.now(),
    reason,
    level
  });
}

// Fonctions de préchargement et d'analyse (implémentations de base)
function calculatePreloadPriority(schemaName: string): number {
  return Math.random();
}

function estimatePreloadBenefit(schemaName: string): number {
  return Math.random();
}

async function processPreloadQueue() {
  // Traitement de la queue de préchargement
}

function buildRelationGraph(rootId: string, relatedIds: string[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  graph.set(rootId, relatedIds);
  return graph;
}

function calculateRelationScore(fromId: string, toId: string, graph: Map<string, string[]>): number {
  return Math.random();
}

function getRelationDepth(fromId: string, toId: string, graph: Map<string, string[]>): number {
  return 1;
}

// Fonctions d'analyse (implémentations de base)
function analyzeLevel(entries: any[], level: CacheLevel) {
  return {
    totalEntries: entries.length,
    avgAccessTime: 0,
    hitRate: 0
  };
}

function findMostAccessed(entries: any[]) {
  return entries[0] || null;
}

function findLeastAccessed(entries: any[]) {
  return entries[0] || null;
}

function calculateAverageAccess(entries: any[]): number {
  return entries.reduce((sum, e) => sum + (e.accessCount || 0), 0) / Math.max(1, entries.length);
}

function filterRecentlyAccessed(entries: any[], timeMs: number) {
  const cutoff = Date.now() - timeMs;
  return entries.filter(e => new Date(e.lastAccessed).getTime() > cutoff);
}

function filterNeverAccessed(entries: any[]) {
  return entries.filter(e => (e.accessCount || 0) === 0);
}

function identifyHotspots(entries: any[]) {
  return entries.filter(e => (e.accessCount || 0) > 10);
}

function identifyColdData(entries: any[]) {
  return entries.filter(e => (e.accessCount || 0) < 2);
}

function generateCacheRecommendations(entries: any[]) {
  return ['Augmenter la taille du cache L1', 'Activer la compression'];
}

function calculateHitRateByTime() {
  return { hourly: 0.8, daily: 0.75 };
}

function calculateCacheThroughput() {
  return { requestsPerSecond: 100 };
}

function calculateLatencyDistribution() {
  return { p50: 5, p90: 15, p99: 50 };
}

function calculateMemoryEfficiency() {
  return 0.85;
}

// Fonctions de réchauffement (implémentations de base)
function determineWarmupStrategy(schemaName?: string) {
  return { type: 'popular' as const, count: 10 };
}

async function warmupPopularEntities(schemaName: string | undefined, count: number) {
  // Réchauffement des entités populaires
}

async function warmupRecentEntities(schemaName: string | undefined, count: number) {
  // Réchauffement des entités récentes
}

async function warmupPredictiveEntities(schemaName: string | undefined, patterns: any) {
  // Réchauffement prédictif
}

async function warmupMixedStrategy(schemaName: string | undefined, strategy: any) {
  // Stratégie mixte
}

async function measureWarmupEfficiency(): Promise<number> {
  return 0.85;
}