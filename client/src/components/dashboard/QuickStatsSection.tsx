import { Clock, CheckCircle, XCircle } from 'lucide-react'
import { Stats } from '../../hooks/useDashboardData'
import { Card, glassStyles } from './StatCard'

// ============================================
// TIPOS
// ============================================

interface QuickStatsSectionProps {
  stats: Stats
}

interface QuickStatItemProps {
  icon: typeof CheckCircle
  iconBg: string
  label: string
  value: number
  sublabel: string
  bgColor: string
  borderColor: string
}

// ============================================
// COMPONENTE ITEM DE ESTATÍSTICA RÁPIDA
// ============================================

function QuickStatItem({ icon: Icon, iconBg, label, value, sublabel, bgColor, borderColor }: QuickStatItemProps) {
  return (
    <div 
      className={`flex items-center justify-between p-4 backdrop-blur-xl ${bgColor} rounded-xl border ${borderColor} shadow-sm`}
      role="listitem"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center gap-3">
        <div className={`${iconBg} p-2 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-500 dark:text-gray-400">{sublabel}</p>
      </div>
    </div>
  )
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function QuickStatsSection({ stats }: QuickStatsSectionProps) {
  const quickStats = [
    {
      icon: CheckCircle,
      iconBg: 'bg-green-500',
      label: 'Pontuais Hoje',
      value: stats.onTimeToday,
      sublabel: 'Antes das 08:30',
      bgColor: 'bg-green-50/80 dark:bg-green-900/20',
      borderColor: 'border-green-200/50 dark:border-green-700/30'
    },
    {
      icon: Clock,
      iconBg: 'bg-yellow-500',
      label: 'Atrasados Hoje',
      value: stats.lateToday,
      sublabel: 'Após 08:30',
      bgColor: 'bg-yellow-50/80 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200/50 dark:border-yellow-700/30'
    },
    {
      icon: XCircle,
      iconBg: 'bg-red-500',
      label: 'Inativos',
      value: stats.inactiveEmployees,
      sublabel: 'Funcionários',
      bgColor: 'bg-red-50/80 dark:bg-red-900/20',
      borderColor: 'border-red-200/50 dark:border-red-700/30'
    }
  ]

  return (
    <Card
      title="Resumo Rápido"
      icon={Clock}
      gradient={glassStyles.gradient.purple}
    >
      <div className="space-y-4" role="list" aria-label="Estatísticas rápidas">
        {quickStats.map((stat) => (
          <QuickStatItem key={stat.label} {...stat} />
        ))}
      </div>
    </Card>
  )
}
