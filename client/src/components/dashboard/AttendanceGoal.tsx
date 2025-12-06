import { TrendingUp } from 'lucide-react'
import { glassStyles } from './StatCard'

// ============================================
// TIPOS
// ============================================

interface AttendanceGoalProps {
  currentRate: number
  goalRate: number
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

const getStatusColor = (current: number, goal: number): 'green' | 'yellow' | 'red' => {
  if (current >= goal) return 'green'
  if (current >= goal - 5) return 'yellow'
  return 'red'
}

const getStatusTextColor = (current: number, goal: number): string => {
  if (current >= goal) return 'text-green-600 dark:text-green-400'
  if (current >= goal - 5) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

// ============================================
// COMPONENTE PRINCIPAL - VERSÃO COMPACTA
// ============================================

export function AttendanceGoal({ currentRate, goalRate }: AttendanceGoalProps) {
  const statusColor = getStatusColor(currentRate, goalRate)
  const textColor = getStatusTextColor(currentRate, goalRate)
  const achieved = currentRate >= goalRate

  return (
    <div 
      className={`${glassStyles.card} bg-gradient-to-r from-indigo-50/80 via-blue-50/80 to-cyan-50/80 dark:from-indigo-900/30 dark:via-blue-900/30 dark:to-cyan-900/30 rounded-xl shadow-md p-4`}
      role="region"
      aria-label="Meta de presença mensal"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-indigo-500 to-cyan-500 p-2 rounded-lg shadow-sm">
            <TrendingUp className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">
              🎯 Meta Mensal
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Objetivo: {goalRate}%
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className={`text-2xl font-bold ${textColor}`} aria-label={`Taxa atual: ${currentRate}%`}>
            {currentRate}%
          </p>
          <p className={`text-xs font-medium ${achieved ? 'text-green-600' : 'text-gray-500'}`}>
            {achieved ? '✅ Atingida!' : `Faltam ${goalRate - currentRate}%`}
          </p>
        </div>
      </div>
      
      {/* Barra de Progresso Compacta */}
      <div className="relative">
        <div className="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${
              statusColor === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
              statusColor === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
              'bg-gradient-to-r from-red-500 to-rose-500'
            }`}
            style={{ width: `${Math.min(currentRate, 100)}%` }}
          />
        </div>
        
        {/* Marcador da Meta */}
        <div 
          className="absolute top-0 w-0.5 h-3 bg-gray-800 dark:bg-white rounded-full"
          style={{ left: `${goalRate}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
