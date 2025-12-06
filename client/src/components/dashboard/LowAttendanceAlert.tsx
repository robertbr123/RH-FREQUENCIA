import { XCircle } from 'lucide-react'
import { LowAttendanceEmployee } from '../../hooks/useDashboardData'
import { glassStyles } from './StatCard'

// ============================================
// TIPOS
// ============================================

interface LowAttendanceAlertProps {
  employees: LowAttendanceEmployee[]
}

interface AlertCardProps {
  employee: LowAttendanceEmployee
}

// ============================================
// COMPONENTE CARD DO ALERTA
// ============================================

function AlertCard({ employee }: AlertCardProps) {
  return (
    <div 
      className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 p-4 rounded-xl border border-red-200/50 dark:border-red-700/30 hover:shadow-lg transition-all duration-300"
      role="listitem"
      aria-label={`${employee.name}: ${employee.rate}% de presença, ${employee.days_absent} faltas`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-gray-900 dark:text-white truncate flex-1">
          {employee.name}
        </p>
        <span 
          className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full ml-2"
          aria-label={`${employee.rate}% de presença`}
        >
          {employee.rate}%
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
        <XCircle className="w-3 h-3" aria-hidden="true" />
        <span>
          {employee.days_absent} {employee.days_absent === 1 ? 'falta' : 'faltas'} este mês
        </span>
      </div>
      
      <div 
        className="mt-2 w-full bg-red-100 dark:bg-red-900/30 rounded-full h-2"
        role="progressbar"
        aria-valuenow={employee.rate}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div 
          className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all duration-500"
          style={{ width: `${employee.rate}%` }}
        />
      </div>
    </div>
  )
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function LowAttendanceAlert({ employees }: LowAttendanceAlertProps) {
  if (employees.length === 0) {
    return null
  }

  return (
    <div 
      className={`mb-8 ${glassStyles.card} bg-gradient-to-r from-red-50/80 via-orange-50/80 to-yellow-50/80 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 rounded-2xl shadow-lg p-6 border-2 border-red-200/50 dark:border-red-700/30`}
      role="alert"
      aria-label="Alerta de baixa frequência"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="backdrop-blur-xl bg-red-500/90 p-3 rounded-xl shadow-lg animate-pulse">
          <XCircle className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-red-700 dark:text-red-400">
            ⚠️ Atenção Necessária
          </h3>
          <p className="text-sm text-red-600 dark:text-red-500">
            Funcionários com baixa frequência (abaixo de 70%)
          </p>
        </div>
      </div>
      
      <div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
        role="list"
        aria-label="Lista de funcionários com baixa frequência"
      >
        {employees.map((employee) => (
          <AlertCard
            key={employee.name}
            employee={employee}
          />
        ))}
      </div>
    </div>
  )
}
