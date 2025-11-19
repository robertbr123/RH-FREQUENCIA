import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CheckCircle, XCircle, Clock, User, Maximize, Minimize } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from '../utils/toast'
import { getErrorMessage } from '../utils/errorMessages'

interface ScanResult {
  success: boolean
  message: string
  punch_type?: 'entry' | 'break_start' | 'break_end' | 'exit'
  next_punch?: string
  employee?: {
    name: string
    cpf: string
    type: string
  }
  today_summary?: {
    entry?: string
    break_start?: string
    break_end?: string
    exit?: string
    hours_worked?: number
  }
}

export default function Scanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [manualInput, setManualInput] = useState('')
  const [loadingManual, setLoadingManual] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const containerRef = useRef<HTMLDivElement>(null)

  // Helper para reproduzir som de votação com síntese de áudio
  const playSuccessSound = () => {
    try {
      // Criar áudio com síntese em tempo real (mais confiável)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Se estiver suspenso, retomar
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }
      
      // Criar sequência de beeps (som tipo votação)
      const now = audioContext.currentTime
      const beepDuration = 0.15
      const gapDuration = 0.05
      const frequency1 = 1000 // Primeira frequência
      const frequency2 = 800  // Segunda frequência
      
      // Primeiro beep
      playBeep(audioContext, now, frequency1, beepDuration, 0.5)
      
      // Segundo beep
      playBeep(audioContext, now + beepDuration + gapDuration, frequency2, beepDuration, 0.5)
    } catch (e) {
      // Som pode falhar - ignorar silenciosamente
    }
  }

  // Função auxiliar para tocar um beep individual
  const playBeep = (audioContext: any, startTime: number, frequency: number, duration: number, volume: number) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    
    oscillator.frequency.value = frequency
    oscillator.type = 'sine'
    
    gain.gain.setValueAtTime(volume, startTime)
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
    
    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }

  // Monitorar conexão online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Helper to translate punch types
  const getPunchTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      entry: 'Entrada',
      break_start: 'Início do Intervalo',
      break_end: 'Fim do Intervalo',
      exit: 'Saída'
    }
    return labels[type] || type
  }

  // Helper to get color classes based on punch type
  const getPunchTypeColors = (type: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      entry: {
        bg: 'bg-green-50',
        border: 'border-green-500',
        text: 'text-green-900',
        icon: 'text-green-600'
      },
      break_start: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-500',
        text: 'text-yellow-900',
        icon: 'text-yellow-600'
      },
      break_end: {
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        text: 'text-blue-900',
        icon: 'text-blue-600'
      },
      exit: {
        bg: 'bg-red-50',
        border: 'border-red-500',
        text: 'text-red-900',
        icon: 'text-red-600'
      }
    }
    return colors[type] || {
      bg: 'bg-gray-50',
      border: 'border-gray-500',
      text: 'text-gray-900',
      icon: 'text-gray-600'
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      // Erro silencioso - funcionalidade não crítica
    }
  }

  const startScanner = async () => {
    try {
      setError(null)
      setResult(null)
      setScanning(true) // Mover para antes da inicialização
      
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState()
          if (state === 2) {
            await scannerRef.current.stop()
          }
          scannerRef.current.clear()
        } catch (e) {
          console.log('Limpando scanner anterior')
        }
        scannerRef.current = null
      }

      // Aguardar o DOM estar pronto
      await new Promise(resolve => setTimeout(resolve, 100))

      const devices = await Html5Qrcode.getCameras()
      if (!devices || devices.length === 0) {
        setError('Nenhuma câmera encontrada no dispositivo.')
        setScanning(false)
        return
      }

      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      // Preferir câmera frontal (melhor para tablets) ou usar a primeira disponível
      let cameraId = devices[0].id
      
      // Se houver apenas uma câmera ou se for encontrar uma frontal, usar
      const frontCamera = devices.find((device: any) => 
        device.label?.toLowerCase().includes('front') ||
        device.label?.toLowerCase().includes('frontal') ||
        device.label?.toLowerCase().includes('user')
      )
      
      if (frontCamera) {
        cameraId = frontCamera.id
      }

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          verbose: false, // Desabilitar logs verbosos no console
        },
        onScanSuccess,
        onScanError
      )
    } catch (err: any) {
      setScanning(false)
      let errorMessage = 'Erro ao acessar a câmera.'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permissão negada. Permita o acesso à câmera nas configurações do navegador.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Câmera em uso por outro aplicativo.'
      }
      
      setError(errorMessage)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        const isScanning = scannerRef.current.getState()
        if (isScanning === 2) { // 2 = SCANNING
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
        scannerRef.current = null
        setScanning(false)
      } catch (err) {
        // Erro ao parar scanner - ignorar
        setScanning(false)
      }
    }
  }

  const onScanSuccess = async (decodedText: string) => {
    try {
      // Debug logging apenas em desenvolvimento
      
      // Parse QR code data
      const qrData = JSON.parse(decodedText)
      
      if (!qrData.id || !qrData.cpf) {
        setError('QR Code inválido. Deve conter ID e CPF do funcionário.')
        setTimeout(() => setError(null), 3000)
        return
      }

      // Parar scanner temporariamente
      await stopScanner()

      // Registrar ponto
      const token = localStorage.getItem('token')
      const response = await axios.post(
        '/api/attendance',
        {
          employee_id: qrData.id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      setResult({
        success: true,
        message: response.data.message || 'Ponto registrado com sucesso!',
        punch_type: response.data.punch_type,
        next_punch: response.data.next_punch,
        employee: {
          name: qrData.name,
          cpf: qrData.cpf,
          type: qrData.type,
        },
        today_summary: response.data.today_summary,
      })

      // Reproduzir som de sucesso
      playSuccessSound()
      
      // Toast com feedback positivo (com fallback se punch_type for undefined)
      const punchType = response.data.punch_type || 'Ponto'
      toast.success(`Ponto registrado! ${getPunchTypeLabel(punchType)}`)

      // Limpar resultado após 5 segundos e reiniciar scanner
      setTimeout(() => {
        setResult(null)
        startScanner()
      }, 5000)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao registrar ponto'
      
      setResult({
        success: false,
        message: errorMessage,
      })
      
      // Toast com erro
      toast.error(errorMessage)

      // Reiniciar scanner após 3 segundos
      setTimeout(() => {
        setResult(null)
        startScanner()
      }, 3000)
    }
  }

  const onScanError = (_errorMessage: string) => {
    // Silenciar erros normais de scan (quando não detecta QR code)
    // Esses erros são esperados durante a varredura contínua
  }

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualInput.trim()) return

    setLoadingManual(true)
    setError(null)
    setResult(null)

    try {
      const token = localStorage.getItem('token')
      
      // Buscar funcionário por matrícula ou CPF
      const response = await axios.get('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const employee = response.data.find((emp: any) => 
        emp.id.toString() === manualInput.trim() || 
        emp.cpf?.replace(/\D/g, '') === manualInput.replace(/\D/g, '')
      )

      if (!employee) {
        setError('Funcionário não encontrado. Verifique a matrícula ou CPF.')
        setLoadingManual(false)
        return
      }

      // Registrar ponto
      const attendanceResponse = await axios.post(
        '/api/attendance',
        { employee_id: employee.id },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setResult({
        success: true,
        message: attendanceResponse.data.message || 'Ponto registrado com sucesso!',
        punch_type: attendanceResponse.data.punch_type,
        next_punch: attendanceResponse.data.next_punch,
        employee: {
          name: employee.name,
          cpf: employee.cpf || '',
          type: employee.type || 'full-time',
        },
        today_summary: attendanceResponse.data.today_summary,
      })

      // Reproduzir som de sucesso
      playSuccessSound()
      
      // Toast com feedback positivo (com fallback se punch_type for undefined)
      const punchType = attendanceResponse.data.punch_type || 'Ponto'
      toast.success(`Ponto registrado! ${getPunchTypeLabel(punchType)}`)

      setManualInput('')
      
      // Limpar resultado após 5 segundos
      setTimeout(() => {
        setResult(null)
      }, 5000)
    } catch (err: any) {
      let errorMessage = 'Erro ao registrar ponto'
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setResult({
        success: false,
        message: errorMessage,
      })
      
      // Toast com erro
      toast.error(errorMessage)

      setTimeout(() => {
        setResult(null)
      }, 5000)
    } finally {
      setLoadingManual(false)
    }
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className={`
        ${isFullscreen 
          ? 'fixed inset-0 z-50 bg-gray-50 p-6 overflow-y-auto' 
          : 'max-w-4xl mx-auto'
        }
      `}
    >
      {/* Cabeçalho - esconde em tela cheia */}
      {!isFullscreen && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                Scanner de Ponto
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Escaneie o QR Code do crachá do funcionário para registrar o ponto
              </p>
            </div>
            {/* Status Online/Offline - REMOVIDO do header, será adicionado fixo no rodapé */}
          </div>
        </div>
      )}

      {/* Botão de Tela Cheia */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-colors shadow-lg"
          title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-5 h-5" />
              <span>Sair da Tela Cheia</span>
            </>
          ) : (
            <>
              <Maximize className="w-5 h-5" />
              <span>Modo Tablet</span>
            </>
          )}
        </button>
      </div>

      {/* Relógio */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 mb-6 text-white">
        <div className="text-center">
          <div className={`font-bold mb-2 ${isFullscreen ? 'text-8xl' : 'text-5xl'}`}>
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className={`opacity-90 ${isFullscreen ? 'text-3xl' : 'text-xl'}`}>
            {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>
      </div>

      {/* Scanner */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col items-center">
          {!scanning && !result && (
            <button
              onClick={startScanner}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 text-lg font-semibold"
            >
              <Camera className="w-6 h-6" />
              Iniciar Scanner
            </button>
          )}

          {scanning && (
            <div className="w-full">
              <div className="mb-4 text-center">
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Posicione o QR Code na área destacada
                </p>
              </div>
              <div
                id="qr-reader"
                className="rounded-lg overflow-hidden border-4 border-primary-500"
                style={{ width: '100%' }}
              ></div>
              <button
                onClick={stopScanner}
                className="mt-4 w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Parar Scanner
              </button>
            </div>
          )}

          {!scanning && !result && (
            <div
              id="qr-reader"
              className="hidden"
            ></div>
          )}

          {result && (
            <div className="w-full">
              {(() => {
                const colors = result.success && result.punch_type
                  ? getPunchTypeColors(result.punch_type)
                  : { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900', icon: 'text-red-600' };

                return (
                  <div
                    className={`p-6 rounded-xl ${result.success ? `${colors.bg} border-2 ${colors.border}` : 'bg-red-50 border-2 border-red-500'}`}
                  >
                    <div className="flex items-start gap-4">
                      {result.success ? (
                        <CheckCircle className={`w-12 h-12 ${colors.icon} flex-shrink-0`} />
                      ) : (
                        <XCircle className="w-12 h-12 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3
                          className={`text-xl font-bold mb-2 ${result.success ? colors.text : 'text-red-900'}`}
                        >
                          {result.success 
                            ? `${getPunchTypeLabel(result.punch_type || '')} Registrada!` 
                            : 'Erro'
                          }
                        </h3>
                        <p
                          className={`text-lg mb-4 ${result.success ? colors.text : 'text-red-800'}`}
                        >
                          {result.message}
                        </p>

                    {result.next_punch && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-900 font-medium">
                          Próximo registro: {getPunchTypeLabel(result.next_punch)}
                        </p>
                      </div>
                    )}

                    {result.employee && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <span className="font-semibold text-gray-900 dark:text-white">
                            Funcionário
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Nome:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {result.employee.name}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">CPF:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {result.employee.cpf}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {result.employee.type === 'full-time'
                                ? 'Tempo Integral'
                                : result.employee.type === 'part-time'
                                ? 'Meio Período'
                                : 'Temporário'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {result.today_summary && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <span className="font-semibold text-gray-900 dark:text-white">
                            Resumo do Dia
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          {result.today_summary.entry && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Entrada:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {format(new Date(result.today_summary.entry), 'HH:mm:ss')}
                              </span>
                            </div>
                          )}
                          {result.today_summary.break_start && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Início Intervalo:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {format(new Date(result.today_summary.break_start), 'HH:mm:ss')}
                              </span>
                            </div>
                          )}
                          {result.today_summary.break_end && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Fim Intervalo:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {format(new Date(result.today_summary.break_end), 'HH:mm:ss')}
                              </span>
                            </div>
                          )}
                          {result.today_summary.exit && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Saída:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {format(new Date(result.today_summary.exit), 'HH:mm:ss')}
                              </span>
                            </div>
                          )}
                          {result.today_summary.hours_worked !== undefined && (
                            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                              <span className="text-gray-600 dark:text-gray-400">Horas Trabalhadas:</span>
                              <span className="ml-2 font-bold text-green-600">
                                {result.today_summary.hours_worked.toFixed(2)}h
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                      Reiniciando scanner automaticamente...
                    </p>
                  </div>
                </div>
              </div>
                );
              })()}
            </div>
          )}

          {error && (
            <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Entrada manual alternativa */}
          <div className="w-full mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center mb-4">
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                Ou digite a matrícula ou CPF
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Insira o número da matrícula ou CPF do funcionário
              </p>
            </div>
            <form onSubmit={handleManualEntry} className="space-y-4">
              <input
                type="tel"
                inputMode="numeric"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Matrícula ou CPF"
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg"
                disabled={loadingManual}
              />
              <button
                type="submit"
                disabled={loadingManual || !manualInput.trim()}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <User className="w-6 h-6" />
                <span className="text-lg font-semibold">
                  {loadingManual ? 'Registrando...' : 'Registrar Ponto'}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Como usar:
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Clique em "Iniciar Scanner" para ativar a câmera e escanear o QR Code</li>
          <li>Ou digite a matrícula ou CPF do funcionário no campo abaixo</li>
          <li>O sistema registrará o ponto automaticamente</li>
          <li>Verifique a confirmação com os dados do funcionário</li>
        </ol>
      </div>

      {/* Status Online/Offline - Fixo na parte inferior, visível sempre */}
      <div className={`fixed bottom-0 left-0 right-0 ${
        isFullscreen ? 'px-6 py-4' : 'px-6 py-3'
      } flex items-center justify-center gap-3 ${
        isOnline 
          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-t border-green-200 dark:border-green-900' 
          : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-t border-red-200 dark:border-red-900'
      }`}>
        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} ${isOnline ? '' : 'animate-pulse'}`}></div>
        <span className={`font-medium ${isFullscreen ? 'text-base' : 'text-sm'}`}>
          Sistema {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  )
}
