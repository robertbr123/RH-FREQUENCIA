import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, User, Maximize, Minimize, Scan, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from '../utils/toast'
import FaceRecognition from '../components/FaceRecognition'
import ScanResultDisplay from '../components/ScanResultDisplay'

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

// Constantes de timeout
const TIMEOUTS = {
  DEBOUNCE_FACE: 3000,
  SUCCESS_DISPLAY: 5000,
  ERROR_DISPLAY_QR: 3000,
  ERROR_DISPLAY_FACE: 7000,
  QR_ERROR_CLEAR: 3000,
} as const

export default function Scanner() {
  const [scanMode, setScanMode] = useState<'qr' | 'face'>('qr') // Novo: modo de scanner
  const [scanning, setScanning] = useState(false)
  const [faceScanning, setFaceScanning] = useState(false) // Estado separado para reconhecimento facial
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [manualInput, setManualInput] = useState('')
  const [loadingManual, setLoadingManual] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const containerRef = useRef<HTMLDivElement>(null)
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null)
  const [verifyingFace, setVerifyingFace] = useState(false)
  const isProcessingFace = useRef(false) // Controle adicional para evitar múltiplas chamadas
  const lastFaceDetectionTime = useRef(0) // Timestamp da última detecção

  // Helper som para reproduzir som de votação com síntese de áudio
  const playSuccessSound = () => {
    try {
      // Criar áudio com síntese em tempo real (mais confiável)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Se estiver suspenso, retomar
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }
      
      // Criar uma, sequência de beeps (som tipo votação)
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

  // Monitorar on/off conexão online/offline
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

  // Helper to translate punch types erros
  const getPunchTypeLabel = useMemo(() => (type: string) => {
    const labels: Record<string, string> = {
      entry: 'Entrada',
      break_start: 'Início do Intervalo',
      break_end: 'Fim do Intervalo',
      exit: 'Saída'
    }
    return labels[type] || type
  }, [])

  // Helper to get color classes based on punch type
  const getPunchTypeColors = useMemo(() => (type: string) => {
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
  }, [])

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
        const errorTimer = setTimeout(() => setError(null), TIMEOUTS.QR_ERROR_CLEAR)
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
      }, TIMEOUTS.SUCCESS_DISPLAY)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao registrar ponto'
      
      setResult({
        success: false,
        message: errorMessage,
      })
      
      // Toast com erro
      toast.error(errorMessage)

      // Reiniciar scanner após erro
      setTimeout(() => {
        setResult(null)
        startScanner()
      }, TIMEOUTS.ERROR_DISPLAY_QR)
    }
  }

  const onScanError = (_errorMessage: string) => {
    // Silenciar erros normais de scan (quando não detecta QR code)
    // Esses erros são esperados durante a varredura contínua
  }

  // Função para verificar face e registrar ponto
  const handleFaceDetected = async (descriptor: Float32Array) => {
    // Verificar se já está processando ou se passou menos de 3 segundos desde a última detecção
    const now = Date.now()
    const timeSinceLastDetection = now - lastFaceDetectionTime.current
    
    if (isProcessingFace.current || verifyingFace || timeSinceLastDetection < TIMEOUTS.DEBOUNCE_FACE) {
      console.log('⏭️ Ignorando detecção facial (ainda processando ou muito recente)')
      return
    }
    
    // Marcar como processando
    isProcessingFace.current = true
    lastFaceDetectionTime.current = now
    setVerifyingFace(true)
    setFaceDescriptor(descriptor)

    try {
      const token = localStorage.getItem('token')
      
      console.log('=== RECONHECIMENTO FACIAL ===')
      console.log('Descriptor capturado:', {
        length: descriptor.length,
        type: descriptor.constructor.name,
        primeiros5valores: Array.from(descriptor).slice(0, 5)
      })
      
      // Enviar descriptor para API verificar
      console.log('Enviando para /api/attendance/face-verify...')
      const response = await axios.post(
        '/api/attendance/face-verify',
        { 
          faceDescriptor: Array.from(descriptor) // Converter Float32Array para Array
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      console.log('✅ Resposta da verificação:', response.data)

      // Se verificação bem-sucedida, registrar ponto
      if (response.data.verified && response.data.employee) {
        console.log('✅ Face verificada! Registrando ponto...')
        
        const attendanceResponse = await axios.post(
          '/api/attendance',
          { employee_id: response.data.employee.id },
          { headers: { Authorization: `Bearer ${token}` } }
        )

        console.log('✅ Ponto registrado:', attendanceResponse.data)

        setResult({
          success: true,
          message: attendanceResponse.data.message || 'Ponto registrado com sucesso!',
          punch_type: attendanceResponse.data.punch_type,
          next_punch: attendanceResponse.data.next_punch,
          employee: {
            name: response.data.employee.name,
            cpf: response.data.employee.cpf || '',
          },
          today_summary: attendanceResponse.data.today_summary,
        })

        playSuccessSound()
        toast.success(`✅ ${response.data.employee.name} - Ponto registrado!`)

        // Limpar resultado após 5 segundos
        setTimeout(() => {
          setResult(null)
          setVerifyingFace(false)
          isProcessingFace.current = false
          setFaceScanning(false) // Parar reconhecimento facial após sucesso
        }, TIMEOUTS.SUCCESS_DISPLAY)
      } else {
        throw new Error('Face não reconhecida - verified=false')
      }
    } catch (err: any) {
      console.error('❌ Erro na verificação facial:', err)
      console.error('Status:', err.response?.status)
      console.error('Dados do erro:', err.response?.data)
      
      let errorMessage = '❌ Erro ao verificar face'
      let errorDetails = ''
      
      if (err.response?.status === 404) {
        errorMessage = err.response.data.error || 'Face não reconhecida'
        errorDetails = err.response.data.hint || err.response.data.details || ''
      } else if (err.response?.status === 400) {
        errorMessage = 'Erro ao capturar face'
        errorDetails = err.response.data.details || 'Tente posicionar melhor seu rosto'
      } else if (err.response?.status === 500) {
        errorMessage = 'Erro no servidor'
        errorDetails = err.response.data.hint || 'Tente novamente'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      const fullMessage = errorDetails ? `${errorMessage}\n${errorDetails}` : errorMessage
      
      setResult({
        success: false,
        message: fullMessage,
      })
      
      toast.error(fullMessage)

      setTimeout(() => {
        setResult(null)
        setVerifyingFace(false)
        isProcessingFace.current = false
        setFaceScanning(false) // Parar reconhecimento facial após erro
      }, TIMEOUTS.ERROR_DISPLAY_FACE)
    }
  }

  const handleFaceError = (error: string) => {
    setError(error)
    toast.error(error)
    setFaceScanning(false) // Parar reconhecimento facial em caso de erro
  }

  const startFaceScanning = () => {
    setFaceScanning(true)
    setResult(null)
    setError(null)
    isProcessingFace.current = false
    lastFaceDetectionTime.current = 0
  }

  const stopFaceScanning = () => {
    setFaceScanning(false)
    setVerifyingFace(false)
    isProcessingFace.current = false
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
      }, TIMEOUTS.SUCCESS_DISPLAY)
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
      }, TIMEOUTS.SUCCESS_DISPLAY)
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
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="p-4 bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                  <Camera className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">
                    Scanner de Ponto
                  </h1>
                  <div className="h-1 w-24 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full mt-1"></div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg ml-1">
                🚀 Sistema inteligente de registro de ponto
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controles superiores */}
      <div className="mb-6 flex justify-between items-center gap-4 animate-slide-down">
        {/* Toggle Modo Scanner */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-1.5 shadow-lg border-2 border-gray-200 dark:border-gray-700">
          <button
            onClick={() => { setScanMode('qr'); setResult(null); setError(null); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 transform ${
              scanMode === 'qr'
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-xl scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:scale-105'
            }`}
          >
            <Scan className="w-5 h-5" />
            <span className="font-bold">QR Code</span>
          </button>
          <button
            onClick={() => { setScanMode('face'); stopScanner(); setResult(null); setError(null); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 transform ${
              scanMode === 'face'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-xl scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:scale-105'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            <span className="font-bold">Facial</span>
          </button>
        </div>

        {/* Botão de Tela Cheia */}
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
          title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-5 h-5" />
              <span className="font-bold">Minimizar</span>
            </>
          ) : (
            <>
              <Maximize className="w-5 h-5" />
              <span className="font-bold">Tablet</span>
            </>
          )}
        </button>
      </div>

      {/* Relógio */}
      <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 rounded-2xl shadow-2xl p-8 mb-6 text-white overflow-hidden animate-fade-in">
        {/* Efeito de brilho animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 animate-shimmer"></div>
        
        <div className="relative text-center">
          <div className="mb-3">
            <div className={`font-black tracking-tight mb-1 ${isFullscreen ? 'text-9xl' : 'text-6xl'} drop-shadow-2xl`}>
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="h-2 w-32 bg-white/30 rounded-full mx-auto"></div>
          </div>
          <div className={`font-semibold opacity-95 ${isFullscreen ? 'text-4xl' : 'text-2xl'} drop-shadow-lg`}>
            {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>
      </div>

      {/* Scanner */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 p-8 mb-6 animate-fade-in">
        <div className="flex flex-col items-center">
          {/* Modo QR Code */}
          {scanMode === 'qr' && (
            <>
              {!scanning && !result && (
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-3xl flex items-center justify-center mb-6 animate-pulse-slow">
                    <Scan className="w-16 h-16 text-primary-600 dark:text-primary-300" />
                  </div>
                  <button
                    onClick={startScanner}
                    className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-primary-600 via-primary-700 to-purple-600 text-white rounded-2xl hover:from-primary-700 hover:via-primary-800 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-300 text-xl font-bold transform hover:scale-105 animate-bounce-subtle"
                  >
                    <Camera className="w-7 h-7" />
                    Iniciar Scanner QR
                  </button>
                </div>
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
              <ScanResultDisplay
                result={result}
                getPunchTypeLabel={getPunchTypeLabel}
                getPunchTypeColors={getPunchTypeColors}
                autoHideMessage="Reiniciando scanner automaticamente..."
              />
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
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
                aria-label="Registrar ponto manualmente"
              >
                <User className="w-6 h-6" />
                {loadingManual ? 'Registrando...' : 'Registrar Ponto'}
              </button>
            </form>
          </div>
            </>
          )}

          {/* Modo Reconhecimento Facial */}
          {scanMode === 'face' && (
            <div className="w-full">
              {!faceScanning && !result && (
                <div className="flex justify-center">
                  <button
                    onClick={startFaceScanning}
                    className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:via-purple-800 hover:to-indigo-700 shadow-2xl hover:shadow-3xl transition-all duration-300 text-xl font-bold transform hover:scale-105"
                  >
                    <UserCheck className="w-7 h-7" />
                    Iniciar Reconhecimento Facial
                  </button>
                </div>
              )}

              {faceScanning && !result && (
                <div className="w-full space-y-4">
                  <FaceRecognition
                    mode="verify"
                    onFaceDetected={handleFaceDetected}
                    onError={handleFaceError}
                  />
                  
                  {verifyingFace && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-blue-900 font-medium">Verificando identidade...</p>
                    </div>
                  )}

                  <button
                    onClick={stopFaceScanning}
                    className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Parar Reconhecimento
                  </button>
                </div>
              )}

              {result && (
                <div className="w-full">
                  <ScanResultDisplay
                    result={result}
                    getPunchTypeLabel={getPunchTypeLabel}
                    getPunchTypeColors={getPunchTypeColors}
                  />

                  {!result.success && (
                    <button
                      onClick={() => {
                        setResult(null)
                        setError(null)
                        setVerifyingFace(false)
                        isProcessingFace.current = false
                        setFaceScanning(false)
                      }}
                      className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 text-lg font-semibold mt-4"
                    >
                      <UserCheck className="w-6 h-6" />
                      Iniciar Novo Reconhecimento
                    </button>
                  )}
                </div>
              )}

              {error && !result && (
                <div className="space-y-4">
                  <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    {error}
                  </div>
                  <button
                    onClick={() => {
                      setError(null)
                      setFaceScanning(false)
                    }}
                    className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 shadow-lg">
        <h3 className="font-bold text-xl text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Camera className="w-6 h-6 text-white" />
          </div>
          Como usar
        </h3>
        <ol className="space-y-3 text-blue-800 dark:text-blue-200">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</span>
            <span>Clique em "Iniciar Scanner" para ativar a câmera</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</span>
            <span>Ou use o reconhecimento facial ou digite matrícula/CPF</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</span>
            <span>O sistema registra automaticamente e mostra confirmação</span>
          </li>
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
