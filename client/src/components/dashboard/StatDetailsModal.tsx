import { useState } from 'react'
import { X, ArrowUp, ArrowDown } from 'lucide-react'
import { Stats, MonthlyComparison } from '../../hooks/useDashboardData'
import { glassStyles, ProgressBar } from './StatCard'

// ============================================
// TIPOS
// ============================================

interface StatDetailsModalProps {
  selectedStat: string | null
  stats: Stats
  monthlyComparison: MonthlyComparison
  attendanceGoal: number
  onClose: () => void
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function StatDetailsModal({
  selectedStat,
  stats,
  monthlyComparison,
  attendanceGoal,
  onClose
}: StatDetailsModalProps) {
  if (!selectedStat) return null

  const renderContent = () => {
    switch (selectedStat) {
      case 'Total de Funcionários':
        return (
          <>
            <div className="backdrop-blur-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-200/50">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Geral</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.totalEmployees}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="backdrop-blur-xl bg-green-50/80 dark:bg-green-900/20 p-4 rounded-xl border border-green-200/50">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ativos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeEmployees}</p>
              </div>
              <div className="backdrop-blur-xl bg-red-50/80 dark:bg-red-900/20 p-4 rounded-xl border border-red-200/50">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Inativos</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.inactiveEmployees}</p>
              </div>
            </div>
          </>
        )

      case 'Presentes Hoje':
        return (
          <>
            <div className="backdrop-blur-xl bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200/50">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Presentes</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.todayPresent}</p>
            </div>
            <div className="backdrop-blur-xl bg-blue-50/80 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">Pontuais (antes 08:30)</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.onTimeToday}</p>
              </div>
            </div>
            <div className="backdrop-blur-xl bg-yellow-50/80 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">Atrasados (após 08:30)</p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lateToday}</p>
              </div>
            </div>
          </>
        )

      case 'Ausentes Hoje':
        return (
          <>
            <div className="backdrop-blur-xl bg-gradient-to-r from-red-50/80 to-orange-50/80 dark:from-red-900/20 dark:to-orange-900/20 p-6 rounded-2xl border border-red-200/50">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Ausentes</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.todayAbsent}</p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Funcionários ativos que não registraram ponto hoje
            </p>
          </>
        )

      case 'Taxa Mensal':
        return (
          <>
            <div className="backdrop-blur-xl bg-gradient-to-r from-purple-50/80 to-indigo-50/80 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-purple-200/50">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Taxa de Frequência</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.monthAttendanceRate}%</p>
            </div>
            <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-700/80 p-4 rounded-xl border border-gray-200/50">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Progresso da Meta ({attendanceGoal}%)</p>
              <ProgressBar
                value={stats.monthAttendanceRate}
                max={100}
                color="purple"
                height="md"
              />
            </div>
            {monthlyComparison.percentChange !== 0 && (
              <div className={`backdrop-blur-xl p-4 rounded-xl border ${
                monthlyComparison.percentChange > 0 
                  ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200/50' 
                  : 'bg-red-50/80 dark:bg-red-900/20 border-red-200/50'
              }`}>
                <div className="flex items-center gap-2">
                  {monthlyComparison.percentChange > 0 
                    ? <ArrowUp className="w-5 h-5 text-green-600" /> 
                    : <ArrowDown className="w-5 h-5 text-red-600" />
                  }
                  <span className={`font-bold ${
                    monthlyComparison.percentChange > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {Math.abs(monthlyComparison.percentChange)}% {monthlyComparison.percentChange > 0 ? 'aumento' : 'redução'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">vs mês anterior</span>
                </div>
              </div>
            )}
          </>
        )

      default:
        return null
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`${glassStyles.card} backdrop-blur-2xl bg-white/90 dark:bg-gray-800/90 rounded-3xl max-w-2xl w-full p-8 shadow-2xl transform transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 
            id="modal-title"
            className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent"
          >
            {selectedStat}
          </h2>
          <button
            onClick={onClose}
            className="p-2 backdrop-blur-xl bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 rounded-xl transition-all"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
