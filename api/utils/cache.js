/**
 * Cache em memória para dados frequentemente acessados
 * Reduz consultas repetidas ao banco de dados
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0
    };
  }

  /**
   * Obter valor do cache
   * @param {string} key - Chave do cache
   * @returns {any|null} Valor ou null se não existe/expirado
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Verificar se expirou
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  /**
   * Definir valor no cache
   * @param {string} key - Chave do cache
   * @param {any} value - Valor a armazenar
   * @param {number} ttlSeconds - Tempo de vida em segundos (padrão: 5 minutos)
   */
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
      createdAt: Date.now()
    });
  }

  /**
   * Invalidar uma chave específica
   * @param {string} key - Chave a invalidar
   */
  invalidate(key) {
    this.cache.delete(key);
  }

  /**
   * Invalidar todas as chaves que começam com um prefixo
   * @param {string} prefix - Prefixo das chaves
   */
  invalidatePrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpar todo o cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Obter estatísticas do cache
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size
    };
  }

  /**
   * Helper: Obter ou buscar
   * Se não existe no cache, executa a função e armazena o resultado
   * @param {string} key - Chave do cache
   * @param {Function} fetchFn - Função async que busca o dado
   * @param {number} ttlSeconds - TTL em segundos
   */
  async getOrFetch(key, fetchFn, ttlSeconds = 300) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttlSeconds);
    return value;
  }
}

// Instância singleton do cache
const cache = new MemoryCache();

// Chaves de cache predefinidas
export const CACHE_KEYS = {
  DEPARTMENTS: 'org:departments',
  POSITIONS: 'org:positions',
  SCHEDULES: 'org:schedules',
  SECTORS: 'org:sectors',
  UNITS: 'org:units',
  SETTINGS: 'system:settings',
  HOLIDAYS: (year) => `holidays:${year}`,
  EMPLOYEE: (id) => `employee:${id}`,
  EMPLOYEES_LIST: (status, deptIds) => `employees:${status || 'all'}:${deptIds?.join(',') || 'all'}`
};

// TTLs em segundos
export const CACHE_TTL = {
  SHORT: 60,           // 1 minuto
  MEDIUM: 300,         // 5 minutos
  LONG: 900,           // 15 minutos
  VERY_LONG: 3600,     // 1 hora
  ORGANIZATION: 600,   // 10 minutos para dados organizacionais
  SETTINGS: 300        // 5 minutos para configurações
};

export default cache;
