import { Camera } from 'lucide-react'

interface ScannerHeaderProps {
  isFullscreen: boolean
}

/**
 * Cabeçalho do Scanner (escondido em tela cheia)
 * Otimizado para mobile
 */
export default function ScannerHeader({ isFullscreen }: ScannerHeaderProps) {
  if (isFullscreen) return null

  return (
    <div className="mb-4 sm:mb-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
            <div className="p-2 sm:p-4 bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl">
              <Camera className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">
                Scanner de Ponto
              </h1>
              <div className="h-0.5 sm:h-1 w-16 sm:w-24 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full mt-1"></div>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-lg ml-1 hidden sm:block">
            🚀 Sistema inteligente de registro de ponto
          </p>
        </div>
      </div>
    </div>
  )
}
