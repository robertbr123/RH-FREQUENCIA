import { Clock } from 'lucide-react'
import { RecentAttendance } from '../../hooks/useDashboardData'
import { Card, Badge, EmptyState } from './StatCard'

// ============================================
// TIPOS
// ============================================

interface RecentAttendanceTableProps {
  records: RecentAttendance[]
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return '-'
  const str = timeStr.toString()
  if (!str.includes(':')) return '-'
  return str.substring(0, 5)
}

const formatDuration = (hours: number | null): string => {
  if (!hours || isNaN(hours)) return '-'
  return `${parseFloat(hours.toString()).toFixed(1)}h`
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function RecentAttendanceTable({ records }: RecentAttendanceTableProps) {
  return (
    <Card
      title="Últimos Registros de Hoje"
      icon={Clock}
    >
      {records.length === 0 ? (
        <EmptyState
          icon={Clock}
          message="Nenhum registro de frequência hoje"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Registros de frequência de hoje">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th 
                  scope="col" 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Funcionário
                </th>
                <th 
                  scope="col" 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Entrada
                </th>
                <th 
                  scope="col" 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Saída
                </th>
                <th 
                  scope="col" 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Duração
                </th>
                <th 
                  scope="col" 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const hasExited = !!record.exit_time
                
                return (
                  <tr 
                    key={record.id} 
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {record.employee_name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatTime(record.entry_time)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatTime(record.exit_time)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDuration(record.total_hours)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={hasExited ? 'success' : 'warning'}>
                        {hasExited ? 'Completo' : 'Trabalhando'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
