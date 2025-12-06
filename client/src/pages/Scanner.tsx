import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import axios from 'axios'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, Scan, UserCheck, MapPin, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from '../utils/toast'
import { useAudioFeedback, useOnlineStatus, useFullscreen, useChristmasSeason, useGeolocation, validateLocationAgainstAllowed, fetchAllowedLocations } from '../hooks'
import type { AllowedLocation } from '../hooks'
import { Snowfall, ChristmasLights } from '../components/christmas'

// Componentes extraídos
import ClockDisplay from '../components/ClockDisplay'
import OnlineStatusBar from '../components/OnlineStatusBar'
import ScannerModeSelector, { type ScanMode } from '../components/ScannerModeSelector'
import ManualEntryForm from '../components/ManualEntryForm'
import ScannerInstructions from '../components/ScannerInstructions'
import ScannerHeader from '../components/ScannerHeader'

// Lazy loading para componentes pesados
const FaceRecognition = lazy(() => import('../components/FaceRecognition'))
const ScanResultDisplay = lazy(() => import('../components/ScanResultDisplay'))

// Types
interface ScanResult {
  success: boolean
  message: string
  type?: 'punch' | 'completed' | 'duplicate' | 'error' // Tipo de resultado
  punch_type?: 'entry' | 'break_start' | 'break_end' | 'exit'
  punch_time?: string
  next_punch?: string
  employee?: {
    id?: number
    name: string
    cpf?: string
    photo_url?: string
    department?: string
    position?: string
    schedule?: string
  }
  today_summary?: {
    entry?: string
    break_start?: string
    break_end?: string
    exit?: string
    hours_worked?: number
  }
}

// Constantes
const TIMEOUTS = {
  DEBOUNCE_FACE: 3000,
  SUCCESS_DISPLAY: 5000,
  ERROR_DISPLAY_QR: 3000,
  ERROR_DISPLAY_FACE: 7000,
  QR_ERROR_CLEAR: 3000,
} as const

const PUNCH_LABELS: Record<string, string> = {
  entry: 'Entrada',
  break_start: 'Início do Intervalo',
  break_end: 'Fim do Intervalo',
  exit: 'Saída'
}

const PUNCH_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  entry: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-900', icon: 'text-green-600' },
  break_start: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-900', icon: 'text-yellow-600' },
  break_end: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900', icon: 'text-blue-600' },
  exit: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900', icon: 'text-red-600' }
}

// Helpers
const getPunchTypeLabel = (type: string) => PUNCH_LABELS[type] || type
const getPunchTypeColors = (type: string) => PUNCH_COLORS[type] || {
  bg: 'bg-gray-50', border: 'border-gray-500', text: 'text-gray-900', icon: 'text-gray-600'
}

// Vibração para feedback tátil (mobile)
const vibrate = (pattern: number | number[] = 100) => {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch (e) {
      // Navegador não suporta vibração
    }
  }
}

export default function Scanner() {
  // State
  const [scanMode, setScanMode] = useState<ScanMode>('qr')
  const [scanning, setScanning] = useState(false)
  const [faceScanning, setFaceScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingManual, setLoadingManual] = useState(false)
  const [verifyingFace, setVerifyingFace] = useState(false)
  
  // Geolocation state
  const [requireGeolocation, setRequireGeolocation] = useState(false)
  const [allowedLocations, setAllowedLocations] = useState<AllowedLocation[]>([])
  const [geoValidationError, setGeoValidationError] = useState<string | null>(null)
  const [currentLocationName, setCurrentLocationName] = useState<string | null>(null)
  const [geoStatus, setGeoStatus] = useState<'loading' | 'valid' | 'invalid' | 'disabled'>('loading')
  const [geoDistance, setGeoDistance] = useState<number | null>(null)
  
  // Refs
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isProcessingFace = useRef(false)
  const lastFaceDetectionTime = useRef(0)

  // Hooks customizados
  const { playPunchSound } = useAudioFeedback()
  const isOnline = useOnlineStatus()
  const { isFullscreen, containerRef, toggleFullscreen } = useFullscreen<HTMLDivElement>()
  const isChristmasSeason = useChristmasSeason()
  const { location, getLocation } = useGeolocation()

  // Carregar configurações de geolocalização ao montar o componente
  useEffect(() => {
    const loadGeoSettings = async () => {
      setGeoStatus('loading')
      
      try {
        const token = localStorage.getItem('token')
        
        // Buscar configurações do sistema
        const settingsResponse = await axios.get('/api/settings', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        const requireGeo = settingsResponse.data?.require_geolocation === true
        setRequireGeolocation(requireGeo)
        
        // Se geolocalização NÃO é exigida, desabilitar validação
        if (!requireGeo) {
          setGeoStatus('disabled')
          setCurrentLocationName(null)
          setGeoValidationError(null)
          return
        }
        
        // Carregar localizações permitidas
        const locations = await fetchAllowedLocations()
        setAllowedLocations(locations)
        
        // Se não há localizações cadastradas, considerar como desabilitado
        if (locations.length === 0) {
          setGeoStatus('disabled')
          setCurrentLocationName(null)
          setGeoValidationError(null)
          return
        }
        
        // Obter localização atual automaticamente
        const currentLocation = await getLocation()
        
        if (!currentLocation) {
          setGeoStatus('invalid')
          setCurrentLocationName(null)
          setGeoValidationError('Não foi possível obter sua localização. Verifique as permissões do navegador.')
          return
        }
        
        // Validar contra localizações permitidas
        const validation = validateLocationAgainstAllowed(
          currentLocation.latitude,
          currentLocation.longitude,
          locations
        )
        
        if (validation.isValid && validation.nearestLocation) {
          setGeoStatus('valid')
          setCurrentLocationName(validation.nearestLocation.name)
          setGeoDistance(validation.distance || null)
          setGeoValidationError(null)
        } else {
          setGeoStatus('invalid')
          setCurrentLocationName(null)
          const nearestName = validation.nearestLocation?.name || 'local permitido'
          const distance = validation.distance ? `${validation.distance}m` : 'desconhecida'
          setGeoValidationError(`Fora da área permitida. Distância até "${nearestName}": ${distance}`)
          setGeoDistance(validation.distance || null)
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de geolocalização:', err)
        setGeoStatus('invalid')
        setGeoValidationError('Erro ao validar localização')
      }
    }
    
    loadGeoSettings()
  }, [])

  // Função para validar geolocalização
  const validateGeolocation = useCallback(async (): Promise<{ valid: boolean; error?: string }> => {
    // Se não exige geolocalização, sempre válido
    if (!requireGeolocation) {
      return { valid: true }
    }
    
    // Se não há localizações cadastradas, considerar válido (validação desativada)
    if (allowedLocations.length === 0) {
      return { valid: true }
    }
    
    // Obter localização atual
    const currentLocation = await getLocation()
    
    if (!currentLocation) {
      return { 
        valid: false, 
        error: 'Não foi possível obter sua localização. Verifique as permissões do navegador.' 
      }
    }
    
    // Validar contra localizações permitidas
    const validation = validateLocationAgainstAllowed(
      currentLocation.latitude,
      currentLocation.longitude,
      allowedLocations
    )
    
    if (!validation.isValid) {
      const nearestName = validation.nearestLocation?.name || 'local permitido'
      const distance = validation.distance ? `${validation.distance}m` : 'desconhecida'
      return {
        valid: false,
        error: `Você está fora da área permitida. Distância até "${nearestName}": ${distance}. Vá até um local autorizado para registrar o ponto.`
      }
    }
    
    return { valid: true }
  }, [requireGeolocation, allowedLocations, getLocation])

  // === QR Scanner Functions ===
  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scanning) {
      try {
        const isScanning = scannerRef.current.getState()
        if (isScanning === 2) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
        scannerRef.current = null
        setScanning(false)
      } catch (err) {
        setScanning(false)
      }
    }
  }, [scanning])

  const registerAttendance = useCallback(async (employeeId: number, employeeName: string, employeeCpf: string) => {
    // Primeiro, validar geolocalização se necessário
    const geoValidation = await validateGeolocation()
    
    if (!geoValidation.valid) {
      setGeoValidationError(geoValidation.error || 'Localização inválida')
      setResult({
        success: false,
        type: 'error',
        message: geoValidation.error || 'Você não está em um local permitido para registrar o ponto.',
        employee: { name: employeeName, cpf: employeeCpf }
      })
      vibrate(300) // Vibração longa para erro
      toast.error('Localização não permitida!')
      throw new Error(geoValidation.error)
    }
    
    setGeoValidationError(null)
    
    const token = localStorage.getItem('token')
    
    // Tentar obter localização antes de registrar o ponto
    let geoData = location
    if (!geoData) {
      geoData = await getLocation()
    }
    
    const requestBody: any = { employee_id: employeeId }
    
    // Adicionar geolocalização se disponível
    if (geoData) {
      requestBody.latitude = geoData.latitude
      requestBody.longitude = geoData.longitude
      requestBody.location_accuracy = geoData.accuracy
    }
    
    const response = await axios.post(
      '/api/attendance',
      requestBody,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    const data = response.data
    const punchType = data.punch?.type as 'entry' | 'break_start' | 'break_end' | 'exit'

    setResult({
      success: true,
      message: data.punch?.message || 'Ponto registrado com sucesso!',
      punch_type: punchType,
      punch_time: data.punch?.time,
      next_punch: data.next,
      employee: {
        id: data.employee?.id,
        name: data.employee?.name || employeeName,
        cpf: employeeCpf,
        photo_url: data.employee?.photo_url,
        department: data.employee?.department,
        position: data.employee?.position,
        schedule: data.employee?.schedule,
      },
      today_summary: data.today,
    })

    // Feedback: som + vibração
    playPunchSound(punchType)
    vibrate([100, 50, 100]) // Vibração de sucesso
    
    toast.success(`Ponto registrado! ${getPunchTypeLabel(punchType || 'Ponto')}`)

    return response.data
  }, [playPunchSound, validateGeolocation, location, getLocation])

  const startScanner = useCallback(async () => {
    try {
      setError(null)
      setResult(null)
      setScanning(true)
      
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

      await new Promise(resolve => setTimeout(resolve, 100))

      const devices = await Html5Qrcode.getCameras()
      if (!devices || devices.length === 0) {
        setError('Nenhuma câmera encontrada no dispositivo.')
        setScanning(false)
        return
      }

      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      let cameraId = devices[0].id
      const frontCamera = devices.find((device: any) => 
        device.label?.toLowerCase().includes('front') ||
        device.label?.toLowerCase().includes('frontal') ||
        device.label?.toLowerCase().includes('user')
      )
      if (frontCamera) cameraId = frontCamera.id

      await html5QrCode.start(
        cameraId,
        { fps: 5, qrbox: { width: 200, height: 200 }, aspectRatio: 1.0, disableFlip: true },
        async (decodedText: string) => {
          let employeeName = ''
          let employeeCpf = ''
          
          try {
            const qrData = JSON.parse(decodedText)
            employeeName = qrData.name || ''
            employeeCpf = qrData.cpf || ''
            
            if (!qrData.id || !qrData.cpf) {
              setError('QR Code inválido. Deve conter ID e CPF do funcionário.')
              setTimeout(() => setError(null), TIMEOUTS.QR_ERROR_CLEAR)
              return
            }

            await stopScanner()
            await registerAttendance(qrData.id, qrData.name, qrData.cpf)

            setTimeout(() => {
              setResult(null)
              startScanner()
            }, TIMEOUTS.SUCCESS_DISPLAY)
          } catch (err: any) {
            const errorData = err.response?.data
            const errorMessage = errorData?.error || 'Erro ao registrar ponto'
            
            // Tratar caso de todos os pontos já registrados
            if (errorMessage.includes('Todos os pontos') || errorMessage.includes('já foram registrados')) {
              setResult({
                success: true,
                type: 'completed',
                message: errorData?.message || 'Você já completou todos os registros de hoje!',
                employee: { name: employeeName, cpf: employeeCpf }
              })
              vibrate([50, 50, 50]) // Vibração suave de aviso
              toast.info('Todos os pontos do dia já foram registrados')
            }
            // Tratar caso de ponto duplicado (menos de 1 minuto)
            else if (errorMessage.includes('menos de 1 minuto') || errorMessage.includes('já registrado')) {
              setResult({
                success: true,
                type: 'duplicate',
                message: 'Você registrou um ponto há menos de 1 minuto',
                employee: { name: employeeName, cpf: employeeCpf }
              })
              vibrate([50, 50]) // Vibração suave
              toast.warning('Aguarde 1 minuto para registrar novamente')
            }
            // Outros erros
            else {
              setResult({ success: false, type: 'error', message: errorMessage })
              vibrate(300) // Vibração longa para erro
              toast.error(errorMessage)
            }

            setTimeout(() => {
              setResult(null)
              startScanner()
            }, TIMEOUTS.ERROR_DISPLAY_QR)
          }
        },
        () => {} // Erros de scan são normais
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
  }, [stopScanner, registerAttendance])

  // === Face Recognition Functions ===
  const handleFaceDetected = useCallback(async (descriptor: Float32Array) => {
    const now = Date.now()
    const timeSinceLastDetection = now - lastFaceDetectionTime.current
    
    if (isProcessingFace.current || verifyingFace || timeSinceLastDetection < TIMEOUTS.DEBOUNCE_FACE) {
      return
    }
    
    isProcessingFace.current = true
    lastFaceDetectionTime.current = now
    setVerifyingFace(true)

    let employeeName = ''
    let employeeCpf = ''

    try {
      const token = localStorage.getItem('token')
      
      const response = await axios.post(
        '/api/attendance/face-verify',
        { faceDescriptor: Array.from(descriptor) },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.verified && response.data.employee) {
        employeeName = response.data.employee.name || ''
        employeeCpf = response.data.employee.cpf || ''
        
        await registerAttendance(
          response.data.employee.id,
          employeeName,
          employeeCpf
        )

        setTimeout(() => {
          setResult(null)
          setVerifyingFace(false)
          isProcessingFace.current = false
          setFaceScanning(false)
        }, TIMEOUTS.SUCCESS_DISPLAY)
      } else {
        throw new Error('Face não reconhecida')
      }
    } catch (err: any) {
      const errorData = err.response?.data
      const errorMessage = errorData?.error || err.message || 'Erro ao verificar face'
      
      // Tratar caso de todos os pontos já registrados
      if (errorMessage.includes('Todos os pontos') || errorMessage.includes('já foram registrados')) {
        setResult({
          success: true,
          type: 'completed',
          message: errorData?.message || 'Você já completou todos os registros de hoje!',
          employee: { name: employeeName, cpf: employeeCpf }
        })
        vibrate([50, 50, 50])
        toast.info('Todos os pontos do dia já foram registrados')
      }
      // Tratar caso de ponto duplicado (menos de 1 minuto)
      else if (errorMessage.includes('menos de 1 minuto') || errorMessage.includes('já registrado')) {
        setResult({
          success: true,
          type: 'duplicate',
          message: 'Você registrou um ponto há menos de 1 minuto',
          employee: { name: employeeName, cpf: employeeCpf }
        })
        vibrate([50, 50])
        toast.warning('Aguarde 1 minuto para registrar novamente')
      }
      // Face não reconhecida
      else if (err.response?.status === 404) {
        const hint = errorData?.hint || errorData?.details || ''
        const fullMessage = hint ? `${errorMessage}\n${hint}` : errorMessage
        setResult({ success: false, type: 'error', message: fullMessage })
        toast.error(errorMessage)
      }
      // Outros erros
      else {
        const details = errorData?.details || ''
        const fullMessage = details ? `${errorMessage}\n${details}` : errorMessage
        setResult({ success: false, type: 'error', message: fullMessage })
        toast.error(errorMessage)
      }

      setTimeout(() => {
        setResult(null)
        setVerifyingFace(false)
        isProcessingFace.current = false
        setFaceScanning(false)
      }, TIMEOUTS.ERROR_DISPLAY_FACE)
    }
  }, [verifyingFace, registerAttendance])

  const handleFaceError = useCallback((error: string) => {
    setError(error)
    toast.error(error)
    setFaceScanning(false)
  }, [])

  const startFaceScanning = useCallback(() => {
    setFaceScanning(true)
    setResult(null)
    setError(null)
    isProcessingFace.current = false
    lastFaceDetectionTime.current = 0
  }, [])

  const stopFaceScanning = useCallback(() => {
    setFaceScanning(false)
    setVerifyingFace(false)
    isProcessingFace.current = false
  }, [])

  // === Manual Entry ===
  const handleManualEntry = useCallback(async (input: string) => {
    setLoadingManual(true)
    setError(null)
    setResult(null)

    try {
      const token = localStorage.getItem('token')
      
      // Usar endpoint otimizado para busca rápida
      const response = await axios.get('/api/employee-card/find', {
        params: { q: input },
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.data.success || !response.data.employee) {
        setError('Funcionário não encontrado. Verifique a matrícula ou CPF.')
        setLoadingManual(false)
        return
      }

      const employee = response.data.employee
      await registerAttendance(employee.id, employee.name, employee.cpf || '')
      
      setTimeout(() => setResult(null), TIMEOUTS.SUCCESS_DISPLAY)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Erro ao registrar ponto'
      
      if (err.response?.status === 404) {
        setError('Funcionário não encontrado. Verifique a matrícula ou CPF.')
      } else {
        setResult({ success: false, message: errorMessage })
        toast.error(errorMessage)
      }
      
      setTimeout(() => setResult(null), TIMEOUTS.SUCCESS_DISPLAY)
    } finally {
      setLoadingManual(false)
    }
  }, [registerAttendance])

  // === Mode Change Handler ===
  const handleModeChange = useCallback((mode: ScanMode) => {
    setScanMode(mode)
    setResult(null)
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Parar scanner QR
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState()
          if (state === 2) {
            scannerRef.current.stop()
          }
          scannerRef.current.clear()
        } catch (e) {
          // Ignorar erros no cleanup
        }
      }
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className={`${isFullscreen ? 'fixed inset-0 z-50 p-3 sm:p-6 overflow-y-auto' : 'max-w-4xl mx-auto px-2 sm:px-0'} ${isChristmasSeason ? 'bg-gradient-to-br from-red-50/30 via-white to-green-50/30 dark:from-red-950/20 dark:via-gray-900 dark:to-green-950/20' : 'bg-gray-50'} relative`}
    >
      {/* Decorações de Natal */}
      {isChristmasSeason && (
        <>
          <Snowfall count={25} enabled={true} />
          <div className="fixed top-0 left-0 right-0 z-10 pointer-events-none">
            <ChristmasLights count={20} enabled={true} />
          </div>
          {/* Brilho sutil nos cantos */}
          <div className="fixed top-0 left-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed bottom-0 left-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed bottom-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        </>
      )}
      
      <ScannerHeader isFullscreen={isFullscreen} />

      <ScannerModeSelector
        scanMode={scanMode}
        onModeChange={handleModeChange}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        onStopScanner={stopScanner}
      />

      <ClockDisplay isFullscreen={isFullscreen} />

      {/* Indicador de Geolocalização */}
      {geoStatus !== 'disabled' && (
        <div className={`mb-3 sm:mb-4 p-3 sm:p-4 rounded-xl border-2 flex items-center gap-2 sm:gap-3 ${
          geoStatus === 'invalid'
            ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' 
            : geoStatus === 'loading'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
              : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
        }`}>
          <div className={`p-1.5 sm:p-2 rounded-lg ${
            geoStatus === 'invalid'
              ? 'bg-red-100 dark:bg-red-800' 
              : geoStatus === 'loading'
                ? 'bg-yellow-100 dark:bg-yellow-800'
                : 'bg-green-100 dark:bg-green-800'
          }`}>
            <MapPin className={`w-4 h-4 sm:w-5 sm:h-5 ${
              geoStatus === 'invalid'
                ? 'text-red-600 dark:text-red-400' 
                : geoStatus === 'loading'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-green-600 dark:text-green-400'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-sm sm:text-base truncate ${
              geoStatus === 'invalid'
                ? 'text-red-800 dark:text-red-200' 
                : geoStatus === 'loading'
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : 'text-green-800 dark:text-green-200'
            }`}>
              {geoStatus === 'invalid'
                ? '⚠️ Localização Desconhecida' 
                : geoStatus === 'loading'
                  ? '📍 Verificando...'
                  : `📍 ${currentLocationName || 'Local Permitido'}`}
            </p>
            <p className={`text-xs sm:text-sm truncate ${
              geoStatus === 'invalid'
                ? 'text-red-600 dark:text-red-400' 
                : geoStatus === 'loading'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-green-600 dark:text-green-400'
            }`}>
              {geoStatus === 'invalid'
                ? 'Vá até um local autorizado'
                : geoStatus === 'loading'
                  ? 'Aguarde...'
                  : 'Registro liberado'}
            </p>
          </div>
          {geoStatus === 'invalid' && (
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0" />
          )}
          {geoStatus === 'valid' && (
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
          )}
        </div>
      )}

      {/* Scanner Container */}
      <div className={`rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-4 sm:p-8 mb-4 sm:mb-6 relative overflow-hidden ${
        isChristmasSeason 
          ? 'bg-gradient-to-br from-white via-red-50/20 to-green-50/20 dark:from-gray-800 dark:via-red-950/10 dark:to-green-950/10 border-2 border-red-200/50 dark:border-green-800/30' 
          : 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex flex-col items-center">
          
          {/* === QR Mode === */}
          {scanMode === 'qr' && (
            <>
              {!scanning && !result && (
                <div className="text-center space-y-3 sm:space-y-4">
                  <div className="w-20 h-20 sm:w-32 sm:h-32 mx-auto bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6">
                    <Scan className="w-10 h-10 sm:w-16 sm:h-16 text-primary-600 dark:text-primary-300" />
                  </div>
                  <button
                    onClick={startScanner}
                    disabled={geoStatus === 'invalid' || geoStatus === 'loading'}
                    className={`flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-10 py-3 sm:py-5 text-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl transition-all duration-200 text-base sm:text-xl font-bold w-full sm:w-auto ${
                      geoStatus === 'invalid' || geoStatus === 'loading'
                        ? 'bg-gray-400 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-primary-600 via-primary-700 to-purple-600 hover:from-primary-700 hover:via-primary-800 hover:to-purple-700'
                    }`}
                  >
                    <Camera className="w-5 h-5 sm:w-7 sm:h-7" />
                    Iniciar Scanner QR
                  </button>
                  {geoStatus === 'invalid' && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      ⚠️ Vá até um local permitido para registrar o ponto
                    </p>
                  )}
                </div>
              )}

              {scanning && (
                <div className="w-full">
                  <div className="mb-4 text-center">
                    <p className="text-gray-700 dark:text-gray-300 font-medium">
                      Posicione o QR Code na área destacada
                    </p>
                  </div>
                  <div id="qr-reader" className="rounded-lg overflow-hidden border-4 border-primary-500" style={{ width: '100%' }}></div>
                  <button onClick={stopScanner} className="mt-4 w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    Parar Scanner
                  </button>
                </div>
              )}

              {!scanning && !result && <div id="qr-reader" className="hidden"></div>}

              {result && (
                <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>}>
                  <ScanResultDisplay result={result} getPunchTypeLabel={getPunchTypeLabel} getPunchTypeColors={getPunchTypeColors} autoHideMessage="Reiniciando scanner automaticamente..." />
                </Suspense>
              )}

              {error && <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>}

              <ManualEntryForm onSubmit={handleManualEntry} loading={loadingManual} />
            </>
          )}

          {/* === Face Mode === */}
          {scanMode === 'face' && (
            <div className="w-full">
              {!faceScanning && !result && (
                <div className="flex flex-col items-center">
                  <button
                    onClick={startFaceScanning}
                    disabled={geoStatus === 'invalid' || geoStatus === 'loading'}
                    className={`flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-10 py-3 sm:py-5 text-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl transition-all duration-300 text-base sm:text-xl font-bold w-full sm:w-auto ${
                      geoStatus === 'invalid' || geoStatus === 'loading'
                        ? 'bg-gray-400 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-700'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 sm:w-7 sm:h-7" />
                    <span className="sm:inline">Reconhecimento Facial</span>
                  </button>
                  {geoStatus === 'invalid' && (
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-2 text-center">
                      ⚠️ Vá até um local permitido
                    </p>
                  )}
                </div>
              )}

              {faceScanning && !result && (
                <div className="w-full space-y-3 sm:space-y-4">
                  <Suspense fallback={<div className="flex flex-col items-center justify-center py-8 sm:py-12"><div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mb-3 sm:mb-4"></div><p className="text-gray-600 text-sm sm:text-base">Carregando câmera...</p></div>}>
                    <FaceRecognition mode="verify" onFaceDetected={handleFaceDetected} onError={handleFaceError} />
                  </Suspense>
                  
                  {verifyingFace && (
                    <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-blue-900 font-medium text-sm sm:text-base">Verificando identidade...</p>
                    </div>
                  )}

                  <button onClick={stopFaceScanning} className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base">
                    Parar Reconhecimento
                  </button>
                </div>
              )}

              {result && (
                <div className="w-full">
                  <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>}>
                    <ScanResultDisplay result={result} getPunchTypeLabel={getPunchTypeLabel} getPunchTypeColors={getPunchTypeColors} />
                  </Suspense>

                  {!result.success && (
                    <button
                      onClick={() => { setResult(null); setError(null); setVerifyingFace(false); isProcessingFace.current = false; setFaceScanning(false); }}
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
                  <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>
                  <button onClick={() => { setError(null); setFaceScanning(false); }} className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    Tentar Novamente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ScannerInstructions />
      
      {/* Mensagem de Natal sutil */}
      {isChristmasSeason && (
        <div className="text-center py-4 mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <span className="text-lg">🎄</span>
            <span className="font-medium bg-gradient-to-r from-red-500 to-green-500 bg-clip-text text-transparent">
              Boas Festas! Que este período seja repleto de alegria!
            </span>
            <span className="text-lg">🎅</span>
          </p>
        </div>
      )}
      
      <OnlineStatusBar isOnline={isOnline} isFullscreen={isFullscreen} />
    </div>
  )
}
