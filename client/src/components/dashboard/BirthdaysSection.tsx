import { Cake, MessageCircle } from 'lucide-react'
import { Birthday } from '../../hooks/useDashboardData'
import { Avatar, EmptyState } from './StatCard'

// ============================================
// TIPOS
// ============================================

interface BirthdaysSectionProps {
  birthdays: Birthday[]
}

interface BirthdayCardProps {
  birthday: Birthday
  isToday: boolean
  daysUntil: number
  displayDay: number
  displayMonth: number
}

// ============================================
// CONSTANTES
// ============================================

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

const extractDateInfo = (dateStr: string) => {
  const dateOnly = String(dateStr).split('T')[0]
  const [, month, day] = dateOnly.split('-').map(Number)
  return { day, month }
}

const generateWhatsAppMessage = (name: string): string => {
  const firstName = name.split(' ')[0]
  return `*Olá ${firstName}*! \n\nFeliz Aniversário! Desejamos um dia cheio de alegrias, realizações e muitas felicidades!\n\nQue este novo ciclo de vida traga ainda mais alegrias e conquistas, tanto pessoais quanto profissionais.\n\n Parabéns! e Feliz aniversário\n\n *SEMSA*`
}

const openWhatsApp = (phone: string, name: string) => {
  const cleanPhone = phone.replace(/\D/g, '')
  const message = generateWhatsAppMessage(name)
  const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank')
}

// ============================================
// COMPONENTE CARD DE ANIVERSÁRIO
// ============================================

function BirthdayCard({ birthday, isToday, daysUntil, displayDay, displayMonth }: BirthdayCardProps) {
  const monthName = MONTH_NAMES[displayMonth - 1]
  const isPast = daysUntil < 0

  return (
    <div 
      className={`group relative flex items-center gap-3 p-4 rounded-xl transition-all duration-300 ${
        isToday 
          ? 'bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border-2 border-pink-400 shadow-lg scale-105 animate-pulse' 
          : 'bg-white dark:bg-gray-700 border-2 border-pink-200 dark:border-gray-600 hover:border-pink-400 hover:shadow-md hover:scale-102'
      }`}
      role="listitem"
      aria-label={`${birthday.name}, aniversário em ${displayDay} de ${monthName}${isToday ? ' - Hoje!' : ''}`}
    >
      {isToday && (
        <div 
          className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-bounce"
          aria-hidden="true"
        >
          🎂 HOJE!
        </div>
      )}
      
      <div className="flex-shrink-0 relative">
        <Avatar
          src={birthday.photo_url}
          name={birthday.name}
          size="lg"
          highlight={isToday}
        />
        {isToday && (
          <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-xs rounded-full p-1" aria-hidden="true">
            🎉
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">
          {birthday.name}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {birthday.position_name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <p className={`text-xs font-medium ${
            isToday ? 'text-pink-700 dark:text-pink-400' : 'text-pink-600 dark:text-pink-500'
          }`}>
            {displayDay} de {monthName}
          </p>
          {!isToday && !isPast && daysUntil > 0 && daysUntil <= 7 && (
            <span className="text-xs bg-pink-200 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full">
              {daysUntil === 1 ? 'Amanhã' : `${daysUntil} dias`}
            </span>
          )}
        </div>
      </div>
      
      {birthday.phone && (
        <button
          onClick={() => openWhatsApp(birthday.phone!, birthday.name)}
          className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
            isToday
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-md'
              : 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400'
          }`}
          title="Enviar mensagem de feliz aniversário pelo WhatsApp"
          aria-label={`Enviar mensagem de aniversário para ${birthday.name} via WhatsApp`}
        >
          <MessageCircle className="w-5 h-5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function BirthdaysSection({ birthdays }: BirthdaysSectionProps) {
  const today = new Date().getDate()
  const hasBirthdayToday = birthdays.some(b => extractDateInfo(b.birth_date).day === today)

  return (
    <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-sm p-5 border border-pink-100 dark:border-gray-600 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-pink-500 p-2 rounded-lg">
          <Cake className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex-1">
          🎂 Aniversariantes
        </h2>
        
        {birthdays.length > 0 && (
          <span 
            className="bg-pink-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full"
            aria-label={`${birthdays.length} aniversariantes este mês`}
          >
            {birthdays.length}
          </span>
        )}
        {hasBirthdayToday && (
          <span 
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce"
            aria-label="Há aniversariante hoje"
          >
            🎉
          </span>
        )}
      </div>
      
      {birthdays.length === 0 ? (
        <EmptyState
          icon={Cake}
          message="Nenhum aniversariante este mês"
          iconColor="text-pink-300 dark:text-pink-600"
        />
      ) : (
        <div 
          className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar"
          role="list"
          aria-label="Lista de aniversariantes do mês"
        >
          {birthdays.map((birthday) => {
            const { day: displayDay, month: displayMonth } = extractDateInfo(birthday.birth_date)
            const isToday = displayDay === today
            const daysUntil = displayDay - today

            return (
              <BirthdayCard
                key={birthday.id}
                birthday={birthday}
                isToday={isToday}
                daysUntil={daysUntil}
                displayDay={displayDay}
                displayMonth={displayMonth}
              />
            )
          })}
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(236, 72, 153, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(236, 72, 153, 0.5);
        }
      `}</style>
    </div>
  )
}
