import { $, useComputed$, useSignal } from '@builder.io/qwik';
import { useSchemaEditor } from '../schema-editor-context';
import type { VersionedSchema } from '../../types';

export interface CacheStats {
  totalSchemas: number;
  cacheHitRate: number;
  lastFetchTime: string | null;
  cacheDuration: number;
  isExpired: boolean;
}

/**
 * Hook pour la gestion du cache des schémas
 */
export const useSchemaCache = () => {
  const { store, actions } = useSchemaEditor();
  const cacheHits = useSignal(0);
  const cacheMisses = useSignal(0);

  // Statistiques du cache
  const cacheStats = useComputed$<CacheStats>(() => {
    const totalRequests = cacheHits.value + cacheMisses.value;
    const hitRate = totalRequests > 0 ? (cacheHits.value / totalRequests) * 100 : 0;
    const lastFetch = store.cache.lastFetch > 0 ? new Date(store.cache.lastFetch).toISOString() : null;
    const isExpired = Date.now() - store.cache.lastFetch > store.cache.cacheDuration;

    return {
      totalSchemas: store.cache.schemas.size,
      cacheHitRate: hitRate,
      lastFetchTime: lastFetch,
      cacheDuration: store.cache.cacheDuration,
      isExpired
    };
  });

  // Liste des schémas en cache
  const cachedSchemas = useComputed$(() => {
    return Array.from(store.cache.schemas.values()).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });

  // Charger les schémas avec gestion du cache
  const loadSchemas = $(async (force = false) => {
    try {
      const schemas = await actions.loadSchemasList(force);

      if (force) {
        cacheMisses.value++;
      } else {
        cacheHits.value++;
      }

      return schemas;
    } catch (error) {
      cacheMisses.value++;
      throw error;
    }
  });

  // Obtenir un schéma spécifique du cache
  const getSchema = $(async (schemaId: string) => {
    let schema = store.cache.schemas.get(schemaId);

    if (schema) {
      cacheHits.value++;
      return schema;
    }

    // Si pas dans le cache, charger tous les schémas
    try {
      await loadSchemas(true);
      schema = store.cache.schemas.get(schemaId);

      if (schema) {
        return schema;
      } else {
        throw new Error(`Schéma '${schemaId}' introuvable`);
      }
    } catch (error) {
      cacheMisses.value++;
      throw error;
    }
  });

  // Ajouter ou mettre à jour un schéma dans le cache
  const updateCacheSchema = $(async (schema: VersionedSchema) => {
    store.cache.schemas.set(schema.id, schema);
  });

  // Supprimer un schéma du cache
  const removeFromCache = $(async (schemaId: string) => {
    const deleted = store.cache.schemas.delete(schemaId);
    return deleted;
  });

  // Vider le cache
  const clearCache = $(async () => {
    store.cache.schemas.clear();
    store.cache.lastFetch = 0;
    cacheHits.value = 0;
    cacheMisses.value = 0;
  });

  // Précharger tous les schémas en arrière-plan
  const preloadSchemas = $(async () => {
    try {
      await loadSchemas(true);
      actions.showNotification('Schémas préchargés en cache', 'info', 2000);
    } catch (error) {
      console.warn('Erreur lors du préchargement:', error);
    }
  });

  // Invalider le cache (forcer le rechargement au prochain appel)
  const invalidateCache = $(async () => {
    store.cache.lastFetch = 0;
  });

  // Vérifier si le cache est valide
  const isCacheValid = $(async () => {
    const now = Date.now();
    return (now - store.cache.lastFetch) < store.cache.cacheDuration;
  });

  // Nettoyer le cache (supprimer les entrées expirées)
  const cleanupCache = $(async () => {
    // Pour l'instant, on ne supprime rien car tous les schémas sont pertinents
    // Cette fonction pourrait être étendue pour supprimer des schémas selon des critères
    console.log('Cache cleanup - aucune action nécessaire pour le moment');
  });

  // Synchroniser le cache avec le serveur
  const syncCache = $(async () => {
    try {
      actions.showNotification('Synchronisation du cache...', 'info', 2000);
      const schemas = await loadSchemas(true);
      actions.showNotification(
        `Cache synchronisé - ${schemas.length} schémas chargés`,
        'success',
        3000
      );
      return schemas;
    } catch (error) {
      actions.showNotification('Erreur lors de la synchronisation', 'error');
      throw error;
    }
  });

  // Rechercher dans le cache
  const searchInCache = $(async (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    const results = Array.from(store.cache.schemas.values()).filter(schema =>
      schema.name.toLowerCase().includes(lowercaseQuery) ||
      schema.schema.title?.toLowerCase().includes(lowercaseQuery) ||
      schema.schema.description?.toLowerCase().includes(lowercaseQuery)
    );

    return results;
  });

  // Obtenir les schémas récemment modifiés
  const getRecentSchemas = $(async (limit = 5) => {
    return Array.from(store.cache.schemas.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  });

  return {
    cacheStats,
    cachedSchemas,
    loadSchemas,
    getSchema,
    updateCacheSchema,
    removeFromCache,
    clearCache,
    preloadSchemas,
    invalidateCache,
    isCacheValid,
    cleanupCache,
    syncCache,
    searchInCache,
    getRecentSchemas,

    // Propriétés calculées
    isExpired: cacheStats.value.isExpired,
    totalSchemas: cacheStats.value.totalSchemas,
    hitRate: cacheStats.value.cacheHitRate
  };
};