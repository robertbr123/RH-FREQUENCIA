import { Award, CheckCircle } from 'lucide-react'
import { TopPerformer } from '../../hooks/useDashboardData'
import { glassStyles } from './StatCard'

// ============================================
// TIPOS
// ============================================

interface TopPerformersProps {
  performers: TopPerformer[]
}

interface PerformerCardProps {
  performer: TopPerformer
  index: number
}

// ============================================
// CONSTANTES
// ============================================

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

const GRADIENTS = [
  'from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-400',
  'from-gray-100 to-slate-100 dark:from-gray-700 dark:to-slate-700 border-gray-400',
  'from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-400',
  'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300',
  'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-300'
]

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

const getRateColor = (rate: number): string => {
  if (rate === 100) return 'text-green-600 dark:text-green-400'
  if (rate >= 95) return 'text-blue-600 dark:text-blue-400'
  return 'text-indigo-600 dark:text-indigo-400'
}

const getProgressColor = (rate: number): string => {
  if (rate === 100) return 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600'
  if (rate >= 95) return 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600'
  return 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600'
}

// ============================================
// COMPONENTE CARD DO PERFORMER
// ============================================

function PerformerCard({ performer, index }: PerformerCardProps) {
  return (
    <div 
      className={`backdrop-blur-xl bg-gradient-to-r ${GRADIENTS[index]} p-4 rounded-xl border-2 hover:shadow-xl transition-all duration-300 transform hover:scale-102`}
      role="listitem"
      aria-label={`${index + 1}º lugar: ${performer.name} com ${performer.rate}% de presença`}
    >
      <div className="flex items-center gap-4">
        <div className="text-4xl" aria-hidden="true">{MEDALS[index]}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-gray-900 dark:text-white truncate text-lg">
              {performer.name}
            </p>
            {performer.badge && (
              <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                {performer.badge}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-600" aria-hidden="true" />
              {performer.streak} dias presentes
            </span>
          </div>
          
          {/* Barra de Progresso */}
          <div 
            className="mt-2 w-full bg-white/50 dark:bg-gray-700/50 rounded-full h-2 backdrop-blur-sm"
            role="progressbar"
            aria-valuenow={performer.rate}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div 
              className={`h-full rounded-full transition-all duration-700 ${getProgressColor(performer.rate)}`}
              style={{ width: `${performer.rate}%` }}
            >
              <div className="h-full w-full animate-pulse opacity-50 bg-white rounded-full" />
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-3xl font-bold ${getRateColor(performer.rate)}`}>
            {performer.rate}%
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

export function TopPerformers({ performers }: TopPerformersProps) {
  if (performers.length === 0) {
    return null
  }

  return (
    <div 
      className={`mb-8 ${glassStyles.card} bg-gradient-to-r from-yellow-50/80 via-amber-50/80 to-orange-50/80 dark:from-yellow-900/20 dark:via-amber-900/20 dark:to-orange-900/20 rounded-2xl shadow-lg p-6 border-2 border-yellow-200/50 dark:border-yellow-700/30`}
      role="region"
      aria-label="Top 5 funcionários do mês"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-500 p-3 rounded-xl shadow-lg animate-pulse">
          <Award className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-700 to-orange-700 bg-clip-text text-transparent">
            🏆 Top 5 Funcionários do Mês
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-500">
            Maiores taxas de presença
          </p>
        </div>
      </div>
      
      <div className="space-y-3" role="list">
        {performers.map((performer, index) => (
          <PerformerCard
            key={performer.name}
            performer={performer}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
