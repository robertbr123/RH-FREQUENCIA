import { useState } from 'react'
import { Camera, Upload, Save, X, Loader2 } from 'lucide-react'
import FaceRecognition from './FaceRecognition'
import axios from 'axios'
import { toast } from '../utils/toast'

interface FaceRegistrationModalProps {
  employee: {
    id: number
    name: string
    photo_url?: string
  }
  onClose: () => void
  onSuccess: () => void
}

export default function FaceRegistrationModal({ employee, onClose, onSuccess }: FaceRegistrationModalProps) {
  const [mode, setMode] = useState<'capture' | 'upload'>('capture')
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(employee.photo_url || '')

  const handleFaceDetected = (descriptor: Float32Array) => {
    setFaceDescriptor(descriptor)
  }

  const handleSaveRegistration = async () => {
    if (!faceDescriptor) {
      toast.error('Nenhuma face detectada. Posicione seu rosto na câmera.')
      return
    }

    setUploading(true)

    try {
      const token = localStorage.getItem('token')
      
      console.log('Enviando registro facial:', {
        employee_id: employee.id,
        descriptorLength: faceDescriptor.length
      })
      
      // 1. Salvar descriptor facial
      const response = await axios.post(
        '/api/attendance/face-register',
        {
          employee_id: employee.id,
          faceDescriptor: Array.from(faceDescriptor)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      console.log('Resposta do servidor:', response.data)
      toast.success(`Face registrada com sucesso para ${employee.name}!`)
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erro completo ao registrar face:', error)
      console.error('Resposta do servidor:', error.response?.data)
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao registrar face'
      toast.error(errorMessage)
      
      // Se for erro de coluna não encontrada, sugerir migração
      if (errorMessage.includes('column') || errorMessage.includes('face_descriptor')) {
        toast.error('Execute a migração do banco: psql $DATABASE_URL -f api/migrations/add-face-recognition.sql', { duration: 8000 })
      }
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem')
      return
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB.')
      return
    }

    try {
      setUploading(true)
      const token = localStorage.getItem('token')
      
      // Converter para base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        
        // Salvar foto no servidor
        const response = await axios.post(
          `/api/employees/${employee.id}/photo`,
          { photo: base64 },
          { headers: { Authorization: `Bearer ${token}` } }
        )

        setUploadedPhotoUrl(response.data.photo_url)
        toast.success('Foto carregada! Agora capture a face para análise.')
        setMode('capture')
      }
      
      reader.readAsDataURL(file)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao fazer upload da foto')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Registrar Reconhecimento Facial
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {employee.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Toggle Mode */}
          <div className="flex items-center gap-2 mb-6 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-all ${
                mode === 'upload'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-md'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Upload className="w-5 h-5" />
              <span className="font-medium">Upload Foto</span>
            </button>
            <button
              onClick={() => setMode('capture')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-all ${
                mode === 'capture'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-md'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span className="font-medium">Capturar Face</span>
            </button>
          </div>

          {/* Upload Mode */}
          {mode === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Faça upload de uma foto recente do funcionário
                </p>
                <label className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-5 h-5" />
                  <span>Selecionar Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>

              {uploadedPhotoUrl && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-400">
                    ✓ Foto carregada! Agora vá para "Capturar Face" para registrar o reconhecimento facial.
                  </p>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Requisitos da foto:
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• Rosto visível e centralizado</li>
                  <li>• Boa iluminação</li>
                  <li>• Sem óculos escuros ou chapéus</li>
                  <li>• Formato: JPG, PNG (máx 5MB)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Capture Mode */}
          {mode === 'capture' && (
            <div className="space-y-4">
              <FaceRecognition
                mode="register"
                employeeName={employee.name}
                onFaceDetected={handleFaceDetected}
                onError={(error) => toast.error(error)}
              />

              {faceDescriptor && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Face detectada com sucesso! Clique em "Salvar Registro" abaixo.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveRegistration}
            disabled={!faceDescriptor || uploading}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Salvar Registro</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
