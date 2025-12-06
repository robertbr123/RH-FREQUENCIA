import { useEffect, useState } from 'react'
import { Cake, Trophy, Bell, X, Sparkles } from 'lucide-react'
import { Birthday } from '../../hooks/useDashboardData'

// ============================================
// TIPOS
// ============================================

interface Notification {
  id: string
  type: 'birthday' | 'goal' | 'info'
  title: string
  message: string
  icon: typeof Bell
  color: string
  bgColor: string
  borderColor: string
}

interface NotificationToastProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

interface NotificationBannerProps {
  birthdays: Birthday[]
  goalAchieved: boolean
  attendanceRate: number
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

const extractDay = (dateStr: string): number => {
  const dateOnly = String(dateStr).split('T')[0]
  const [, , day] = dateOnly.split('-').map(Number)
  return day
}

// ============================================
// COMPONENTE TOAST DE NOTIFICAÇÃO
// ============================================

function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={`${notification.bgColor} ${notification.borderColor} border-2 rounded-xl p-4 shadow-2xl backdrop-blur-xl animate-slide-in-right`}
          style={{ animationDelay: `${index * 150}ms` }}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className={`${notification.color} p-2 rounded-lg`}>
              <notification.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {notification.title}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => onDismiss(notification.id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// COMPONENTE BANNER DE NOTIFICAÇÕES
// ============================================

export function NotificationBanner({ birthdays, goalAchieved, attendanceRate }: NotificationBannerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const newNotifications: Notification[] = []
    const today = new Date().getDate()

    // Verificar aniversariantes de hoje
    const birthdaysToday = birthdays.filter(b => extractDay(b.birth_date) === today)
    if (birthdaysToday.length > 0) {
      const names = birthdaysToday.map(b => b.name.split(' ')[0]).join(', ')
      newNotifications.push({
        id: 'birthday-today',
        type: 'birthday',
        title: '🎂 Aniversário Hoje!',
        message: birthdaysToday.length === 1 
          ? `${names} faz aniversário hoje!`
          : `${birthdaysToday.length} pessoas fazem aniversário: ${names}`,
        icon: Cake,
        color: 'bg-pink-500',
        bgColor: 'bg-pink-50/95 dark:bg-pink-900/30',
        borderColor: 'border-pink-300 dark:border-pink-700'
      })
    }

    // Verificar se meta foi atingida
    if (goalAchieved && attendanceRate >= 95) {
      newNotifications.push({
        id: 'goal-achieved',
        type: 'goal',
        title: '🏆 Meta Atingida!',
        message: `Parabéns! A meta de ${attendanceRate}% de presença foi alcançada!`,
        icon: Trophy,
        color: 'bg-green-500',
        bgColor: 'bg-green-50/95 dark:bg-green-900/30',
        borderColor: 'border-green-300 dark:border-green-700'
      })
    }

    // Filtrar notificações já dispensadas
    const filtered = newNotifications.filter(n => !dismissed.has(n.id))
    setNotifications(filtered)
  }, [birthdays, goalAchieved, attendanceRate, dismissed])

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
  }

  if (notifications.length === 0) return null

  return <NotificationToast notifications={notifications} onDismiss={handleDismiss} />
}

// ============================================
// COMPONENTE SAUDAÇÃO PERSONALIZADA
// ============================================

interface GreetingHeaderProps {
  userName: string
  hasBirthdayToday: boolean
  goalAchieved: boolean
}

export function GreetingHeader({ userName, hasBirthdayToday, goalAchieved }: GreetingHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const getGreeting = (): { text: string; emoji: string } => {
    const hour = currentTime.getHours()
    if (hour >= 5 && hour < 12) return { text: 'Bom dia', emoji: '☀️' }
    if (hour >= 12 && hour < 18) return { text: 'Boa tarde', emoji: '🌤️' }
    return { text: 'Boa noite', emoji: '🌙' }
  }

  const getFirstName = (fullName: string): string => {
    return fullName.split(' ')[0]
  }

  const greeting = getGreeting()
  const firstName = getFirstName(userName)

  return (
    <div className="mb-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="animate-wave inline-block">{greeting.emoji}</span>
          <span>{greeting.text}, </span>
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {firstName}!
          </span>
        </h1>
        
        {/* Badges de destaque */}
        <div className="flex items-center gap-2">
          {hasBirthdayToday && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-full animate-bounce shadow-lg">
              <Cake className="w-3 h-3" />
              Aniversário!
            </span>
          )}
          {goalAchieved && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full animate-pulse shadow-lg">
              <Trophy className="w-3 h-3" />
              Meta atingida!
            </span>
          )}
        </div>
      </div>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
        <Sparkles className="w-4 h-4 text-yellow-500" />
        Veja como está o dia na sua equipe
      </p>
    </div>
  )
}

// ============================================
// COMPONENTE CELEBRATION EFFECT
// ============================================

interface CelebrationEffectProps {
  show: boolean
  type: 'birthday' | 'goal'
}

export function CelebrationEffect({ show, type }: CelebrationEffectProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [show])

  if (!visible) return null

  const confettiColors = type === 'birthday' 
    ? ['bg-pink-500', 'bg-rose-500', 'bg-purple-500', 'bg-yellow-500']
    : ['bg-green-500', 'bg-emerald-500', 'bg-yellow-500', 'bg-blue-500']

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden="true">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className={`absolute w-3 h-3 rounded-full ${confettiColors[i % confettiColors.length]} animate-confetti`}
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  )
}
