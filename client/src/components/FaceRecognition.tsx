import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, CheckCircle, XCircle, Loader2, Zap, AlertTriangle, ThumbsUp } from 'lucide-react'
import * as faceapi from 'face-api.js'

interface FaceRecognitionProps {
  onFaceDetected: (faceDescriptor: Float32Array) => void
  onError: (error: string) => void
  employeeName?: string
  mode: 'register' | 'verify'
}

// ==========================================
// CACHE DE MODELOS COM INDEXEDDB
// ==========================================

const DB_NAME = 'FaceApiModelsCache'
const DB_VERSION = 1
const STORE_NAME = 'models'
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'

// Verificar se modelos estão em cache
async function areModelsCached(): Promise<boolean> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const count = await promisifyRequest(store.count())
    db.close()
    return count >= 3 // tinyFaceDetector, faceLandmark68, faceRecognition
  } catch {
    return false
  }
}

// Abrir IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' })
      }
    }
  })
}

// Promisificar request do IndexedDB
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Marcar modelos como cacheados
async function markModelsCached(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    await promisifyRequest(store.put({ name: 'tinyFaceDetector', cached: true, date: Date.now() }))
    await promisifyRequest(store.put({ name: 'faceLandmark68', cached: true, date: Date.now() }))
    await promisifyRequest(store.put({ name: 'faceRecognition', cached: true, date: Date.now() }))
    
    db.close()
  } catch (e) {
    console.warn('Não foi possível salvar cache dos modelos:', e)
  }
}

// ==========================================
// INDICADOR DE QUALIDADE
// ==========================================

interface FaceQuality {
  score: number // 0-100
  label: 'poor' | 'fair' | 'good' | 'excellent'
  issues: string[]
}

function calculateFaceQuality(
  detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>,
  videoWidth: number,
  videoHeight: number
): FaceQuality {
  const issues: string[] = []
  let score = 100

  const box = detection.detection.box
  const faceWidth = box.width
  const faceHeight = box.height
  
  // 1. Tamanho da face (deve ocupar pelo menos 20% do vídeo)
  const faceAreaRatio = (faceWidth * faceHeight) / (videoWidth * videoHeight)
  if (faceAreaRatio < 0.05) {
    score -= 30
    issues.push('Aproxime-se da câmera')
  } else if (faceAreaRatio < 0.1) {
    score -= 15
    issues.push('Fique um pouco mais perto')
  } else if (faceAreaRatio > 0.5) {
    score -= 20
    issues.push('Afaste-se um pouco')
  }

  // 2. Centralização (face deve estar no centro)
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2
  const distFromCenterX = Math.abs(centerX - videoWidth / 2) / (videoWidth / 2)
  const distFromCenterY = Math.abs(centerY - videoHeight / 2) / (videoHeight / 2)
  
  if (distFromCenterX > 0.3 || distFromCenterY > 0.3) {
    score -= 20
    issues.push('Centralize o rosto')
  } else if (distFromCenterX > 0.15 || distFromCenterY > 0.15) {
    score -= 10
  }

  // 3. Confiança da detecção
  const confidence = detection.detection.score
  if (confidence < 0.7) {
    score -= 25
    issues.push('Melhore a iluminação')
  } else if (confidence < 0.85) {
    score -= 10
  }

  // 4. Proporção facial (verificar se não está muito inclinado)
  const aspectRatio = faceWidth / faceHeight
  if (aspectRatio < 0.6 || aspectRatio > 1.0) {
    score -= 15
    issues.push('Mantenha o rosto reto')
  }

  // Garantir score entre 0-100
  score = Math.max(0, Math.min(100, score))

  // Determinar label
  let label: FaceQuality['label']
  if (score >= 80) label = 'excellent'
  else if (score >= 60) label = 'good'
  else if (score >= 40) label = 'fair'
  else label = 'poor'

  return { score, label, issues }
}

// ==========================================
// COMPONENTE DE INDICADOR DE QUALIDADE
// ==========================================

function QualityIndicator({ quality }: { quality: FaceQuality | null }) {
  if (!quality) return null

  const getColor = () => {
    switch (quality.label) {
      case 'excellent': return 'bg-green-500'
      case 'good': return 'bg-blue-500'
      case 'fair': return 'bg-yellow-500'
      case 'poor': return 'bg-red-500'
    }
  }

  const getIcon = () => {
    switch (quality.label) {
      case 'excellent': return <ThumbsUp className="w-4 h-4" />
      case 'good': return <CheckCircle className="w-4 h-4" />
      case 'fair': return <AlertTriangle className="w-4 h-4" />
      case 'poor': return <XCircle className="w-4 h-4" />
    }
  }

  const getLabel = () => {
    switch (quality.label) {
      case 'excellent': return 'Excelente'
      case 'good': return 'Boa'
      case 'fair': return 'Regular'
      case 'poor': return 'Ruim'
    }
  }

  return (
    <div className="animate-fadeIn">
      {/* Barra de qualidade */}
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-1.5 rounded-full ${getColor()} text-white`}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Qualidade: {getLabel()}</span>
            <span className="text-xs font-bold text-gray-900">{quality.score}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getColor()} transition-all duration-500 ease-out`}
              style={{ width: `${quality.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Issues/dicas */}
      {quality.issues.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-slideInUp">
          {quality.issues.map((issue, i) => (
            <span 
              key={i}
              className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full animate-pulse"
            >
              {issue}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function FaceRecognition({ 
  onFaceDetected, 
  onError, 
  employeeName = '',
  mode 
}: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Inicializando...')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [faceQuality, setFaceQuality] = useState<FaceQuality | null>(null)
  const [isCached, setIsCached] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const faceQualityRef = useRef<FaceQuality | null>(null)

  // Carregar modelos do face-api.js com cache
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Verificar cache
        const cached = await areModelsCached()
        setIsCached(cached)
        
        if (cached) {
          setLoadingMessage('🚀 Modelos em cache, carregando rapidamente...')
          setLoadingProgress(30)
        } else {
          setLoadingMessage('📥 Baixando modelos pela primeira vez...')
          setLoadingProgress(10)
        }
        
        console.log(`🤖 Carregando modelos de: ${MODEL_URL} (cache: ${cached})`)
        
        setLoadingMessage('Carregando detector de face...')
        setLoadingProgress(40)
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
        
        setLoadingMessage('Carregando pontos faciais...')
        setLoadingProgress(60)
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
        
        setLoadingMessage('Carregando reconhecimento...')
        setLoadingProgress(80)
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        
        setLoadingProgress(100)
        setLoadingMessage('✅ Pronto!')
        
        // Marcar como cacheado para próxima vez
        if (!cached) {
          await markModelsCached()
          console.log('💾 Modelos salvos em cache para próximo uso')
        }
        
        console.log('✅ Modelos carregados com sucesso')
        
        // Pequeno delay para animação
        setTimeout(() => {
          setModelsLoaded(true)
          setLoading(false)
        }, 300)
      } catch (error) {
        console.error('❌ Erro ao carregar modelos:', error)
        onError('Erro ao carregar modelos de reconhecimento facial. Verifique sua conexão com a internet.')
        setLoading(false)
      }
    }

    loadModels()
  }, [])

  // Iniciar webcam
  useEffect(() => {
    if (!modelsLoaded) return

    const startVideo = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const errorMsg = 'Seu navegador não suporta acesso à câmera. Use Chrome, Firefox ou Safari atualizado.'
          setCameraError(errorMsg)
          onError(errorMsg)
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        })
        
        streamRef.current = stream
        setCameraError(null)
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error: any) {
        console.error('Erro ao acessar webcam:', error)
        
        let errorMessage = 'Erro ao acessar câmera. '
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage += 'Permita o acesso à câmera nas configurações do navegador.'
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage += 'Nenhuma câmera foi encontrada no dispositivo.'
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage += 'A câmera está sendo usada por outro aplicativo. Feche outros programas que usam a câmera.'
        } else if (error.name === 'OverconstrainedError') {
          errorMessage += 'As configurações da câmera não são suportadas.'
        } else {
          errorMessage += 'Verifique as permissões e tente novamente.'
        }
        
        setCameraError(errorMessage)
        onError(errorMessage)
      }
    }

    startVideo()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [modelsLoaded])

  // Detectar face continuamente
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current) return

    setDetecting(true)
    let animationFrame: number
    let lastQualityUpdate = 0

    const detectFace = async () => {
      if (!videoRef.current || !canvasRef.current) return

      try {
        const detections = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor()

        const canvas = canvasRef.current
        const videoWidth = videoRef.current.videoWidth || 640
        const videoHeight = videoRef.current.videoHeight || 480
        const displaySize = { width: videoWidth, height: videoHeight }
        
        faceapi.matchDimensions(canvas, displaySize)
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)

        if (detections) {
          setFaceDetected(true)
          
          // Calcular qualidade (throttled para performance)
          const now = Date.now()
          let currentQuality = faceQualityRef.current
          if (now - lastQualityUpdate > 200) {
            currentQuality = calculateFaceQuality(detections, videoWidth, videoHeight)
            setFaceQuality(currentQuality)
            faceQualityRef.current = currentQuality
            lastQualityUpdate = now
          }
          
          // Desenhar detecções com cor baseada na qualidade
          const resizedDetections = faceapi.resizeResults(detections, displaySize)
          
          // Custom drawing com cor da qualidade
          const box = resizedDetections.detection.box
          if (ctx) {
            const qualityColor = currentQuality?.label === 'excellent' ? '#22c55e' :
                                currentQuality?.label === 'good' ? '#3b82f6' :
                                currentQuality?.label === 'fair' ? '#eab308' : '#ef4444'
            
            ctx.strokeStyle = qualityColor
            ctx.lineWidth = 3
            ctx.strokeRect(box.x, box.y, box.width, box.height)
            
            // Desenhar landmarks
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
          }

          // Chamar callback se qualidade for boa (score >= 50 = fair ou melhor)
          if (mode === 'register' || mode === 'verify') {
            if (currentQuality && currentQuality.score >= 50) {
              onFaceDetected(detections.descriptor)
            }
          }
        } else {
          setFaceDetected(false)
          setFaceQuality(null)
        }
      } catch (error) {
        console.error('Erro na detecção:', error)
      }

      animationFrame = requestAnimationFrame(detectFace)
    }

    const startDetection = async () => {
      if (videoRef.current?.readyState === 4) {
        detectFace()
      } else {
        videoRef.current?.addEventListener('loadeddata', detectFace)
      }
    }

    startDetection()

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [modelsLoaded, mode, onFaceDetected])

  // Borda do vídeo baseada na qualidade
  const getBorderColor = () => {
    if (!faceDetected) return 'border-gray-300'
    switch (faceQuality?.label) {
      case 'excellent': return 'border-green-500'
      case 'good': return 'border-blue-500'
      case 'fair': return 'border-yellow-500'
      case 'poor': return 'border-red-500'
      default: return 'border-gray-300'
    }
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto animate-fadeIn">
      {/* Status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {mode === 'register' ? 'Registrar Face' : 'Verificar Identidade'}
          </span>
          {isCached && modelsLoaded && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <Zap className="w-3 h-3" />
              Cache
            </span>
          )}
        </div>
        
        {loading && (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{loadingProgress}%</span>
          </div>
        )}
        
        {modelsLoaded && (
          <div className={`flex items-center gap-2 transition-all duration-300 ${faceDetected ? 'text-green-600' : 'text-orange-600'}`}>
            {faceDetected ? (
              <>
                <CheckCircle className="w-4 h-4 animate-scaleIn" />
                <span className="text-sm font-medium">Face detectada</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Posicione seu rosto</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Barra de progresso do loading */}
      {loading && (
        <div className="mb-4 animate-fadeIn">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-600">{loadingMessage}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Instrução */}
      {employeeName && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-slideInUp">
          <p className="text-sm text-blue-900">
            {mode === 'register' 
              ? `Registrando face de: ${employeeName}`
              : `Verificando identidade de: ${employeeName}`
            }
          </p>
        </div>
      )}

      {/* Erro de Câmera */}
      {cameraError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-shake">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900 mb-1">Erro ao Acessar Câmera</h4>
              <p className="text-sm text-red-800 mb-3">{cameraError}</p>
              <div className="text-xs text-red-700 space-y-1">
                <p><strong>Soluções:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>Clique no ícone de cadeado/câmera na barra de endereço e permita acesso</li>
                  <li>Feche outros aplicativos que usam a câmera (Zoom, Teams, etc)</li>
                  <li>Recarregue a página após dar permissão</li>
                  <li>Use Chrome, Firefox ou Safari atualizado</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de Qualidade */}
      {faceDetected && faceQuality && (
        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <QualityIndicator quality={faceQuality} />
        </div>
      )}

      {/* Vídeo + Canvas Overlay */}
      <div className={`relative rounded-xl overflow-hidden border-4 ${getBorderColor()} bg-black transition-all duration-300`}>
        {cameraError ? (
          <div className="flex items-center justify-center bg-gray-900 text-white p-12 min-h-[480px] animate-fadeIn">
            <div className="text-center">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <p className="text-lg font-medium mb-2">Câmera não disponível</p>
              <p className="text-sm text-gray-400">Verifique as instruções acima</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-auto animate-fadeIn"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Guia de posicionamento */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`
                border-4 border-dashed rounded-full w-64 h-64 
                flex items-center justify-center
                transition-all duration-500
                ${faceDetected 
                  ? faceQuality?.label === 'excellent' 
                    ? 'border-green-400/80 scale-105' 
                    : faceQuality?.label === 'good'
                      ? 'border-blue-400/80 scale-102'
                      : 'border-yellow-400/80 scale-100'
                  : 'border-white/50 scale-100'
                }
              `}>
                {!faceDetected && (
                  <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg animate-pulse">
                    Centralize seu rosto
                  </p>
                )}
                {faceDetected && faceQuality?.label === 'excellent' && (
                  <div className="text-center animate-scaleIn">
                    <ThumbsUp className="w-8 h-8 mx-auto text-green-400 mb-2" />
                    <p className="text-green-400 text-sm bg-black/50 px-4 py-2 rounded-lg font-medium">
                      Perfeito! ✨
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dicas */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg animate-slideInUp">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Dicas:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Olhe diretamente para a câmera</li>
          <li>• Certifique-se de estar bem iluminado</li>
          <li>• Remova óculos escuros ou chapéus</li>
          <li>• Mantenha o rosto centralizado no círculo</li>
        </ul>
      </div>
    </div>
  )
}

// Função auxiliar para calcular distância euclidiana
export function getFaceDistance(descriptor1: Float32Array, descriptor2: Float32Array): number {
  return faceapi.euclideanDistance(descriptor1, descriptor2)
}

// Função auxiliar para verificar se faces são da mesma pessoa
export function isSamePerson(distance: number, threshold: number = 0.6): boolean {
  return distance < threshold
}
