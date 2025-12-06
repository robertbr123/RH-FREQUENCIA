import { Camera } from 'lucide-react'

/**
 * Instruções de uso do scanner
 */
export default function ScannerInstructions() {
  return (
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
  )
}
