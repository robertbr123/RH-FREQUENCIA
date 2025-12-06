import { Building2, Briefcase, Users, CheckCircle, XCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { DepartmentStats } from '../../hooks/useDashboardData'
import { Card, EmptyState, glassStyles } from './StatCard'

// ============================================
// TIPOS
// ============================================

interface DepartmentRankingProps {
  departments: DepartmentStats[]
}

interface DepartmentItemProps {
  department: DepartmentStats
  index: number
}

// ============================================
// CONSTANTES
// ============================================

const MEDALS = ['🥇', '🥈', '🥉']

const TREND_ICONS = {
  up: <ArrowUp className="w-4 h-4 text-green-500" aria-label="Tendência de alta" />,
  down: <ArrowDown className="w-4 h-4 text-red-500" aria-label="Tendência de baixa" />,
  stable: <Minus className="w-4 h-4 text-gray-400" aria-label="Tendência estável" />
}

const RANKING_STYLES = [
  'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-gray-700 dark:to-gray-600 border-2 border-yellow-300 dark:border-yellow-600',
  'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-gray-600 border border-gray-300 dark:border-gray-500',
  'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-700 dark:to-gray-600 border border-orange-300 dark:border-orange-600',
]

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

const getRateColor = (rate: number): string => {
  if (rate >= 90) return 'bg-gradient-to-r from-green-500 to-emerald-600'
  if (rate >= 80) return 'bg-gradient-to-r from-green-400 to-green-500'
  if (rate >= 70) return 'bg-gradient-to-r from-yellow-400 to-yellow-500'
  if (rate >= 50) return 'bg-gradient-to-r from-orange-400 to-orange-500'
  return 'bg-gradient-to-r from-red-400 to-red-500'
}

const getRateTextColor = (rate: number): string => {
  if (rate >= 80) return 'text-green-600 dark:text-green-400'
  if (rate >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

// ============================================
// COMPONENTE ITEM DO DEPARTAMENTO
// ============================================

function DepartmentItem({ department, index }: DepartmentItemProps) {
  const isTopThree = index < 3
  const styleClass = isTopThree
    ? RANKING_STYLES[index]
    : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'

  return (
    <div 
      className={`group relative rounded-lg p-4 transition-all duration-300 ${styleClass}`}
      role="listitem"
      aria-label={`${department.name}: ${department.rate}% de presença`}
    >
      <div className="flex items-center gap-3">
        {/* Ranking Badge */}
        <div className="flex-shrink-0" aria-hidden="true">
          {isTopThree ? (
            <span className="text-2xl">{MEDALS[index]}</span>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                #{department.rank}
              </span>
            </div>
          )}
        </div>
        
        {/* Info do Departamento */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" aria-hidden="true" />
            <span className="font-semibold text-gray-900 dark:text-white truncate">
              {department.name}
            </span>
            {department.trend && TREND_ICONS[department.trend]}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-2">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" aria-hidden="true" />
              <span aria-label={`${department.total} funcionários`}>{department.total}</span>
            </span>
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" aria-hidden="true" />
              <span aria-label={`${department.present} presentes`}>{department.present}</span>
            </span>
            <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" aria-hidden="true" />
              <span aria-label={`${department.absent} ausentes`}>{department.absent}</span>
            </span>
          </div>
          
          {/* Barra de Progresso */}
          <div 
            className="relative w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden"
            role="progressbar"
            aria-valuenow={department.rate}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out ${getRateColor(department.rate)}`}
              style={{ width: `${department.rate}%` }}
            >
              <div className="h-full w-full animate-pulse opacity-50 bg-white" />
            </div>
          </div>
        </div>
        
        {/* Taxa de Presença */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-2xl font-bold ${getRateTextColor(department.rate)}`}>
            {department.rate}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">presença</div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function DepartmentRanking({ departments }: DepartmentRankingProps) {
  return (
    <Card
      title="Ranking de Departamentos"
      icon={Building2}
      gradient={glassStyles.gradient.indigo}
    >
      <div className="flex items-center justify-between mb-4 -mt-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Presença Hoje</span>
      </div>
      
      {departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          message="Nenhum departamento cadastrado"
        />
      ) : (
        <div className="space-y-3" role="list" aria-label="Ranking de departamentos por presença">
          {departments.map((dept, index) => (
            <DepartmentItem
              key={dept.name}
              department={dept}
              index={index}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
