import { CheckCircle, XCircle, Clock, User } from 'lucide-react'
import { format } from 'date-fns'

interface ScanResult {
  success: boolean
  message: string
  punch_type?: 'entry' | 'break_start' | 'break_end' | 'exit'
  next_punch?: string
  employee?: {
    name: string
    cpf: string
  }
  today_summary?: {
    entry?: string
    break_start?: string
    break_end?: string
    exit?: string
    hours_worked?: number
  }
}

interface ScanResultDisplayProps {
  result: ScanResult
  getPunchTypeLabel: (type: string) => string
  getPunchTypeColors: (type: string) => {
    bg: string
    border: string
    text: string
    icon: string
  }
  autoHideMessage?: string
}

export default function ScanResultDisplay({
  result,
  getPunchTypeLabel,
  getPunchTypeColors,
  autoHideMessage = 'Resultado será ocultado automaticamente...'
}: ScanResultDisplayProps) {
  const colors = result.success && result.punch_type
    ? getPunchTypeColors(result.punch_type)
    : { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900', icon: 'text-red-600' }

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
                {result.employee.cpf && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">CPF:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {result.employee.cpf}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.today_summary && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
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
            {result.success ? autoHideMessage : 'Clique no botão abaixo para tentar novamente'}
          </p>
        </div>
      </div>
    </div>
  )
}
