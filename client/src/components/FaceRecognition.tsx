import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import * as faceapi from 'face-api.js'

interface FaceRecognitionProps {
  onFaceDetected: (faceDescriptor: Float32Array) => void
  onError: (error: string) => void
  employeeName?: string
  mode: 'register' | 'verify'
}

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
  const [cameraError, setCameraError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Carregar modelos do face-api.js
  useEffect(() => {
    const loadModels = async () => {
      try {
        // ✅ Sempre usar CDN (funciona tanto em produção quanto desenvolvimento)
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
        
        console.log(`🤖 Carregando modelos de: ${MODEL_URL}`)
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        
        console.log('✅ Modelos carregados com sucesso')
        setModelsLoaded(true)
        setLoading(false)
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
        // Verificar se navegador suporta getUserMedia
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

        // Limpar canvas
        const canvas = canvasRef.current
        const displaySize = {
          width: videoRef.current.videoWidth || 640,
          height: videoRef.current.videoHeight || 480
        }
        
        faceapi.matchDimensions(canvas, displaySize)
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)

        if (detections) {
          setFaceDetected(true)
          
          // Desenhar detecções
          const resizedDetections = faceapi.resizeResults(detections, displaySize)
          faceapi.draw.drawDetections(canvas, resizedDetections)
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)

          // Chamar callback com descriptor
          if (mode === 'register' || mode === 'verify') {
            onFaceDetected(detections.descriptor)
          }
        } else {
          setFaceDetected(false)
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
  }, [modelsLoaded, mode])

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {mode === 'register' ? 'Registrar Face' : 'Verificar Identidade'}
          </span>
        </div>
        
        {loading && (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        )}
        
        {modelsLoaded && (
          <div className={`flex items-center gap-2 ${faceDetected ? 'text-green-600' : 'text-orange-600'}`}>
            {faceDetected ? (
              <>
                <CheckCircle className="w-4 h-4" />
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

      {/* Instrução */}
      {employeeName && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
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
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
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

      {/* Vídeo + Canvas Overlay */}
      <div className="relative rounded-xl overflow-hidden border-4 border-gray-300 bg-black">
        {cameraError ? (
          <div className="flex items-center justify-center bg-gray-900 text-white p-12 min-h-[480px]">
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
              className="w-full h-auto"
              style={{ transform: 'scaleX(-1)' }} // Espelhar vídeo
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ transform: 'scaleX(-1)' }} // Espelhar canvas
            />
            
            {/* Guia de posicionamento */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-4 border-dashed border-white/50 rounded-full w-64 h-64 flex items-center justify-center">
                {!faceDetected && (
                  <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg">
                    Centralize seu rosto
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dicas */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
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
