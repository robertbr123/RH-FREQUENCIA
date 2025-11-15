import axios from 'axios'
import { toast } from './toast'

type RetryConfig = {
  retries: number
  retryDelayBaseMs: number
}

const defaultRetry: RetryConfig = { retries: 3, retryDelayBaseMs: 400 }

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

export function setupAxiosNetwork(retryCfg: Partial<RetryConfig> = {}) {
  const cfg = { ...defaultRetry, ...retryCfg }
  let offlineNotified = false

  // Eventos de rede
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (offlineNotified) {
        toast.success('Conexão restabelecida')
        offlineNotified = false
      }
      // Verificar updates do SW (opcional)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(reg => reg.update().catch(() => {}))
        })
      }
    })
    window.addEventListener('offline', () => {
      offlineNotified = true
      toast.warning('Sem conexão. Tentaremos novamente automaticamente.')
    })
  }

  // Interceptor de resposta com retry exponencial
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config || {}
      if (!config || config.__isRetryRequest) {
        return Promise.reject(error)
      }

      const status = error?.response?.status
      const isNetworkError = !error.response && (error.code === 'ECONNABORTED' || error.message?.includes('Network Error'))
      const isRetriableStatus = [502, 503, 504].includes(status)

      if (isNetworkError || isRetriableStatus) {
        config.__retryCount = config.__retryCount || 0
        if (config.__retryCount < cfg.retries) {
          config.__retryCount += 1
          const delay = cfg.retryDelayBaseMs * Math.pow(2, config.__retryCount - 1)
          await sleep(delay)
          config.__isRetryRequest = true
          return axios(config)
        }
        if (isNetworkError) {
          offlineNotified = true
          toast.error('Falha de rede. Verifique sua conexão.')
        }
      }

      // 401: deixar fluxo atual tratar (AuthContext/logout)
      return Promise.reject(error)
    }
  )
}
