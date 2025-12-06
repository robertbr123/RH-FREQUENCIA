import { Umbrella } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Vacation } from '../../hooks/useDashboardData'
import { Avatar, Badge } from './StatCard'

// ============================================
// TIPOS
// ============================================

interface VacationsSectionProps {
  vacations: Vacation[]
}

interface VacationCardProps {
  vacation: Vacation
  isOnVacationToday: boolean
}

// ============================================
// COMPONENTE CARD DE FÉRIAS
// ============================================

function VacationCard({ vacation, isOnVacationToday }: VacationCardProps) {
  const startDate = new Date(vacation.start_date)
  const endDate = new Date(vacation.end_date)

  return (
    <div 
      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
        isOnVacationToday 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-md' 
          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-700'
      }`}
      role="listitem"
      aria-label={`${vacation.employee_name}, férias de ${format(startDate, "dd/MM", { locale: ptBR })} a ${format(endDate, "dd/MM", { locale: ptBR })}`}
    >
      <div className="flex-shrink-0">
        <Avatar
          src={vacation.photo_url}
          name={vacation.employee_name}
          size="md"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
          {vacation.employee_name}
          {isOnVacationToday && (
            <Badge variant="info" animated>
              EM FÉRIAS 🏖️
            </Badge>
          )}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {vacation.position_name}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
          {format(startDate, "dd/MM", { locale: ptBR })} - {format(endDate, "dd/MM", { locale: ptBR })} ({vacation.days} dias)
        </p>
      </div>
    </div>
  )
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function VacationsSection({ vacations }: VacationsSectionProps) {
  const today = new Date()
  const vacationsOnToday = vacations.filter(v => {
    const startDate = new Date(v.start_date)
    const endDate = new Date(v.end_date)
    return today >= startDate && today <= endDate
  })

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-sm p-5 border border-blue-100 dark:border-gray-600 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-blue-500 p-2 rounded-lg">
          <Umbrella className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex-1">
          🏖️ Férias
        </h2>
        
        {vacations.length > 0 && (
          <span 
            className="bg-blue-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full"
            aria-label={`${vacations.length} funcionários de férias`}
          >
            {vacations.length}
          </span>
        )}
        {vacationsOnToday.length > 0 && (
          <span 
            className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full"
            aria-label={`${vacationsOnToday.length} de férias hoje`}
          >
            🌴 {vacationsOnToday.length}
          </span>
        )}
      </div>
      
      {vacations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
          <Umbrella className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm">Ninguém de férias este mês</p>
        </div>
      ) : (
        <div 
          className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar-blue"
          role="list"
          aria-label="Lista de funcionários de férias"
        >
          {vacations.map((vacation) => {
            const startDate = new Date(vacation.start_date)
            const endDate = new Date(vacation.end_date)
            const isOnVacationToday = today >= startDate && today <= endDate

            return (
              <VacationCard
                key={vacation.id}
                vacation={vacation}
                isOnVacationToday={isOnVacationToday}
              />
            )
          })}
        </div>
      )}
      
      <style>{`
        .custom-scrollbar-blue::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-blue::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar-blue::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar-blue::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  )
}
