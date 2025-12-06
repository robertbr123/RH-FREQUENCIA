import { Timer, Award } from 'lucide-react'
import { Stats } from '../../hooks/useDashboardData'

// ============================================
// TIPOS
// ============================================

interface AdditionalMetricsProps {
  stats: Stats
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AdditionalMetrics({ stats }: AdditionalMetricsProps) {
  const hasWorkHours = stats.avgWorkHours && stats.avgWorkHours > 0
  const hasEmployeeOfMonth = stats.employeeOfMonth

  if (!hasWorkHours && !hasEmployeeOfMonth) {
    return null
  }

  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
      role="region"
      aria-label="Métricas adicionais"
    >
      {hasWorkHours && (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-sm p-6 border border-cyan-100 dark:border-gray-600">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-cyan-500 p-3 rounded-lg">
              <Timer className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Média de Horas Trabalhadas
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.avgWorkHours}h
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Por dia no mês atual
          </p>
        </div>
      )}
      
      {hasEmployeeOfMonth && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-sm p-6 border border-amber-100 dark:border-gray-600">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-500 p-3 rounded-lg animate-pulse">
              <Award className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Funcionário Destaque
              </p>
              <p 
                className="text-lg font-bold text-gray-900 dark:text-white truncate"
                title={stats.employeeOfMonth.name}
              >
                {stats.employeeOfMonth.name}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.employeeOfMonth.rate}% de presença este mês
          </p>
        </div>
      )}
    </div>
  )
}
