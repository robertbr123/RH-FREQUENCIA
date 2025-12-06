/**
 * Helpers para paginação no backend
 */

/**
 * Extrair parâmetros de paginação da query string
 * @param {object} query - req.query
 * @param {object} defaults - valores padrão
 * @returns {object} { page, limit, offset }
 */
export function getPaginationParams(query, defaults = {}) {
  const {
    page = defaults.page || 1,
    limit = defaults.limit || 50,
    per_page // alias para limit
  } = query;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(per_page || limit, 10) || 50));
  const offset = (parsedPage - 1) * parsedLimit;

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset
  };
}

/**
 * Formatar resposta paginada
 * @param {array} data - dados da página atual
 * @param {number} total - total de registros
 * @param {object} pagination - { page, limit }
 * @returns {object} resposta formatada
 */
export function formatPaginatedResponse(data, total, pagination) {
  const { page, limit } = pagination;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

/**
 * Adicionar cláusulas de paginação a uma query SQL
 * @param {string} baseQuery - query base sem LIMIT/OFFSET
 * @param {object} pagination - { limit, offset }
 * @param {number} paramStart - número inicial dos parâmetros ($1, $2, etc)
 * @returns {object} { query, params }
 */
export function addPaginationToQuery(baseQuery, pagination, paramStart = 1) {
  const { limit, offset } = pagination;
  
  return {
    query: `${baseQuery} LIMIT $${paramStart} OFFSET $${paramStart + 1}`,
    params: [limit, offset]
  };
}

/**
 * Construir query de contagem a partir de uma query SELECT
 * @param {string} selectQuery - query SELECT original
 * @returns {string} query de COUNT
 */
export function buildCountQuery(selectQuery) {
  // Remover ORDER BY, LIMIT, OFFSET
  let countQuery = selectQuery
    .replace(/ORDER BY[\s\S]*?(LIMIT|OFFSET|$)/gi, '$1')
    .replace(/LIMIT\s+\d+/gi, '')
    .replace(/OFFSET\s+\d+/gi, '')
    .trim();

  // Envolver em COUNT
  return `SELECT COUNT(*) as total FROM (${countQuery}) as count_query`;
}

/**
 * Extrair parâmetros de ordenação
 * @param {object} query - req.query
 * @param {array} allowedFields - campos permitidos para ordenação
 * @param {string} defaultField - campo padrão
 * @param {string} defaultOrder - ordenação padrão (ASC/DESC)
 * @returns {object} { field, order, sql }
 */
export function getSortParams(query, allowedFields, defaultField = 'id', defaultOrder = 'ASC') {
  const { sort_by, order } = query;
  
  // Validar campo de ordenação
  const field = allowedFields.includes(sort_by) ? sort_by : defaultField;
  const sortOrder = ['ASC', 'DESC'].includes(order?.toUpperCase()) ? order.toUpperCase() : defaultOrder;

  return {
    field,
    order: sortOrder,
    sql: `ORDER BY ${field} ${sortOrder}`
  };
}

/**
 * Extrair parâmetros de busca/filtro
 * @param {object} query - req.query
 * @param {array} searchFields - campos onde buscar
 * @returns {object|null} { term, sql, params } ou null se não há busca
 */
export function getSearchParams(query, searchFields) {
  const { search, q } = query;
  const term = (search || q || '').trim();

  if (!term || searchFields.length === 0) {
    return null;
  }

  // Construir condição ILIKE para cada campo
  const conditions = searchFields.map((field, index) => 
    `${field} ILIKE $${index + 1}`
  );

  return {
    term,
    sql: `(${conditions.join(' OR ')})`,
    params: searchFields.map(() => `%${term}%`)
  };
}

export default {
  getPaginationParams,
  formatPaginatedResponse,
  addPaginationToQuery,
  buildCountQuery,
  getSortParams,
  getSearchParams
};
