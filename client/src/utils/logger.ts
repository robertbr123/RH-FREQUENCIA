// Utilitário de logging que respeita ambiente
// Em produção, apenas erros são logados
// Em desenvolvimento, todos os logs são mostrados

const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development'

export const logger = {
  // Informação geral (apenas dev)
  info: (...args: any[]) => {
    if (isDev) {
      console.log('[INFO]', ...args)
    }
  },

  // Avisos (apenas dev)
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('[WARN]', ...args)
    }
  },

  // Erros (sempre loga)
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  },

  // Debug detalhado (apenas dev)
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args)
    }
  },

  // Grupo de logs relacionados (apenas dev)
  group: (label: string, fn: () => void) => {
    if (isDev) {
      console.group(label)
      fn()
      console.groupEnd()
    }
  }
}

export default logger
