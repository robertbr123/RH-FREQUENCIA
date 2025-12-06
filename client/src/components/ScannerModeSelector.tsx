import { Scan, UserCheck, Maximize, Minimize } from 'lucide-react'

export type ScanMode = 'qr' | 'face'

interface ScannerModeSelectorProps {
  scanMode: ScanMode
  onModeChange: (mode: ScanMode) => void
  onToggleFullscreen: () => void
  isFullscreen: boolean
  onStopScanner: () => void
}

/**
 * Componente para alternar entre modo QR e Facial + controle de tela cheia
 * Otimizado para mobile
 */
export default function ScannerModeSelector({
  scanMode,
  onModeChange,
  onToggleFullscreen,
  isFullscreen,
  onStopScanner
}: ScannerModeSelectorProps) {
  
  const handleModeChange = (mode: ScanMode) => {
    if (mode !== scanMode) {
      if (mode === 'face') {
        onStopScanner()
      }
      onModeChange(mode)
    }
  }

  return (
    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
      {/* Toggle Modo Scanner */}
      <div className="flex items-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-1 sm:p-1.5 shadow-lg border-2 border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleModeChange('qr')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-all duration-300 ${
            scanMode === 'qr'
              ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-xl'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700'
          }`}
        >
          <Scan className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="font-bold text-sm sm:text-base">QR Code</span>
        </button>
        <button
          onClick={() => handleModeChange('face')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-all duration-300 ${
            scanMode === 'face'
              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-xl'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700'
          }`}
        >
          <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="font-bold text-sm sm:text-base">Facial</span>
        </button>
      </div>

      {/* Botão de Tela Cheia */}
      <button
        onClick={onToggleFullscreen}
        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white rounded-xl transition-all duration-300 shadow-xl"
        title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
      >
        {isFullscreen ? (
          <>
            <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-bold text-sm sm:text-base">Minimizar</span>
          </>
        ) : (
          <>
            <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-bold text-sm sm:text-base">Tela Cheia</span>
          </>
        )}
      </button>
    </div>
  )
}
