import { useState, FormEvent } from 'react'
import { User } from 'lucide-react'

interface ManualEntryFormProps {
  onSubmit: (input: string) => Promise<void>
  loading: boolean
}

/**
 * Formulário para entrada manual de matrícula/CPF
 */
export default function ManualEntryForm({ onSubmit, loading }: ManualEntryFormProps) {
  const [manualInput, setManualInput] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!manualInput.trim()) return

    await onSubmit(manualInput.trim())
    setManualInput('')
  }

  return (
    <div className="w-full mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="text-center mb-4">
        <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
          Ou digite a matrícula ou CPF
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Insira o número da matrícula ou CPF do funcionário
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="tel"
          inputMode="numeric"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Matrícula ou CPF"
          className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !manualInput.trim()}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
          aria-label="Registrar ponto manualmente"
        >
          <User className="w-6 h-6" />
          {loading ? 'Registrando...' : 'Registrar Ponto'}
        </button>
      </form>
    </div>
  )
}
