import { useState, useCallback, useMemo, memo } from 'react'
import { Users, UserCheck, UserX, TrendingUp, Calendar, RefreshCw, XCircle, ChevronDown, ChevronUp, Clock, Timer } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Hooks customizados
import { useDashboardData, useChristmasSeason } from '../hooks'
import { useAuth } from '../context/AuthContext'

// Componentes de Natal
import { Snowfall } from '../components/christmas'

// Componentes do Dashboard
import {
  StatCard,
  StatCardSkeleton,
  DepartmentRanking,
  BirthdaysSection,
  VacationsSection,
  RecentAttendanceTable,
  StatDetailsModal,
  NotificationBanner,
  GreetingHeader,
  CelebrationEffect,
  ColorVariant,
  ImprovementsPopup
} from '../components/dashboard'

// ============================================
// TIPOS
// ============================================

interface StatCardConfig {
  title: string
  getValue: () => string | number
  icon: typeof Users
  color: ColorVariant
  getSubtitle: () => string
  getChange: () => number | null
}

// ============================================
// COMPONENTE DE BACKGROUND ANIMADO
// ============================================

interface AnimatedBackgroundProps {
  isChristmasSeason?: boolean
}

function AnimatedBackground({ isChristmasSeason }: AnimatedBackgroundProps) {
  // Cores natalinas ou normais
  const colors = isChristmasSeason 
    ? {
        first: 'from-red-400/20 via-green-400/20 to-red-400/20',
        second: 'from-green-400/15 via-red-400/15 to-green-400/15',
        third: 'from-red-400/20 via-green-400/20 to-red-400/20'
      }
    : {
        first: 'from-indigo-400/20 via-blue-400/20 to-cyan-400/20',
        second: 'from-blue-400/15 via-cyan-400/15 to-indigo-400/15',
        third: 'from-cyan-400/20 via-indigo-400/20 to-blue-400/20'
      }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
      <div className={`absolute top-20 left-10 w-96 h-96 bg-gradient-to-br ${colors.first} rounded-full blur-3xl animate-float`} />
      <div className={`absolute top-40 right-20 w-[500px] h-[500px] bg-gradient-to-br ${colors.second} rounded-full blur-3xl animate-float-delayed`} />
      <div className={`absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-br ${colors.third} rounded-full blur-3xl animate-float-slow`} />
    </div>
  )
}

// ============================================
// COMPONENTE HEADER
// ============================================

interface DashboardHeaderProps {
  userName: string
  hasBirthdayToday: boolean
  goalAchieved: boolean
  onRefresh: () => void
  isRefreshing: boolean
}

function DashboardHeader({ userName, hasBirthdayToday, goalAchieved, onRefresh, isRefreshing }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
      <GreetingHeader 
        userName={userName}
        hasBirthdayToday={hasBirthdayToday}
        goalAchieved={goalAchieved}
      />
      <div className="flex items-center gap-4">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all duration-200 disabled:opacity-50"
          aria-label="Atualizar dados"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
          <Calendar className="w-4 h-4" aria-hidden="true" />
          <time dateTime={format(new Date(), 'yyyy-MM-dd')}>
            {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </time>
        </div>
      </div>
    </header>
  )
}

// ============================================
// COMPONENTE DE LOADING
// ============================================

function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// ============================================
// COMPONENTE DE ERRO
// ============================================

interface DashboardErrorProps {
  message: string
  onRetry: () => void
}

function DashboardError({ message, onRetry }: DashboardErrorProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-16"
      role="alert"
    >
      <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
        <XCircle className="w-12 h-12 text-red-500" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Erro ao carregar dados
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4 text-center max-w-md">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function Dashboard() {
  const { user } = useAuth()
  const isChristmasSeason = useChristmasSeason()
  const {
    stats,
    recentAttendance,
    departmentStats,
    birthdays,
    vacations,
    weeklyData,
    monthlyComparison,
    loading,
    error,
    refresh
  } = useDashboardData()

  const [selectedStat, setSelectedStat] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showDepartments, setShowDepartments] = useState(false)
  const [showRecentRecords, setShowRecentRecords] = useState(false)
  const [showImprovements, setShowImprovements] = useState(() => {
    // Mostrar popup apenas uma vez por versão
    const version = '2.0.0-dec2025'
    const seenVersion = localStorage.getItem('improvements_seen')
    return seenVersion !== version
  })

  const handleCloseImprovements = () => {
    setShowImprovements(false)
    localStorage.setItem('improvements_seen', '2.0.0-dec2025')
  }

  // Verificar se há aniversário hoje
  const hasBirthdayToday = useMemo(() => {
    const today = new Date().getDate()
    return birthdays.some(b => {
      const dateOnly = String(b.birth_date).split('T')[0]
      const day = parseInt(dateOnly.split('-')[2], 10)
      return day === today
    })
  }, [birthdays])

  // Verificar se meta foi atingida (meta padrão de 90%)
  const goalAchieved = useMemo(() => {
    return stats.monthAttendanceRate >= 90
  }, [stats.monthAttendanceRate])

  // Handler para atualizar dados
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }, [refresh])

  // Configuração dos cards de estatísticas
  const statCardsConfig: StatCardConfig[] = useMemo(() => [
    {
      title: 'Total de Funcionários',
      getValue: () => stats.totalEmployees,
      icon: Users,
      color: 'blue' as ColorVariant,
      getSubtitle: () => `${stats.activeEmployees} ativos`,
      getChange: () => null
    },
    {
      title: 'Presentes Hoje',
      getValue: () => stats.todayPresent,
      icon: UserCheck,
      color: 'green' as ColorVariant,
      getSubtitle: () => `${stats.onTimeToday} pontuais`,
      getChange: () => monthlyComparison.percentChange
    },
    {
      title: 'Ausentes Hoje',
      getValue: () => stats.todayAbsent,
      icon: UserX,
      color: 'red' as ColorVariant,
      getSubtitle: () => `${stats.lateToday} atrasados`,
      getChange: () => null
    },
    {
      title: 'Taxa Mensal',
      getValue: () => `${stats.monthAttendanceRate}%`,
      icon: TrendingUp,
      color: 'purple' as ColorVariant,
      getSubtitle: () => 'Frequência do mês',
      getChange: () => monthlyComparison.percentChange
    }
  ], [stats, monthlyComparison])

  // Handler para seleção de stat
  const handleStatClick = useCallback((title: string) => {
    setSelectedStat(title)
  }, [])

  // Handler para fechar modal
  const handleCloseModal = useCallback(() => {
    setSelectedStat(null)
  }, [])

  // Nome do usuário
  const userName = user?.name || 'Usuário'

  // Render loading
  if (loading) {
    return (
      <div className="relative animate-fade-in">
        <AnimatedBackground isChristmasSeason={isChristmasSeason} />
        <Snowfall count={15} enabled={isChristmasSeason} />
        <DashboardHeader 
          userName={userName}
          hasBirthdayToday={false}
          goalAchieved={false}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <DashboardLoading />
      </div>
    )
  }

  // Render error
  if (error) {
    return (
      <div className="relative animate-fade-in">
        <AnimatedBackground isChristmasSeason={isChristmasSeason} />
        <Snowfall count={15} enabled={isChristmasSeason} />
        <DashboardHeader 
          userName={userName}
          hasBirthdayToday={false}
          goalAchieved={false}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <DashboardError message={error} onRetry={refresh} />
      </div>
    )
  }

  return (
    <div className="relative animate-fade-in">
      <AnimatedBackground isChristmasSeason={isChristmasSeason} />
      
      {/* Decorações de Natal - Neve caindo */}
      <Snowfall count={20} enabled={isChristmasSeason} />
      
      {/* Notificações Toast */}
      <NotificationBanner 
        birthdays={birthdays}
        goalAchieved={goalAchieved}
        attendanceRate={stats.monthAttendanceRate}
      />

      {/* Efeito de Celebração */}
      <CelebrationEffect show={hasBirthdayToday || goalAchieved} type={hasBirthdayToday ? 'birthday' : 'goal'} />

      <DashboardHeader 
        userName={userName}
        hasBirthdayToday={hasBirthdayToday}
        goalAchieved={goalAchieved}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Stats Grid Compacto - 2x2 no mobile, linha única no desktop */}
      <section 
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
        aria-label="Estatísticas principais"
      >
        {statCardsConfig.map((config, index) => (
          <StatCard
            key={config.title}
            title={config.title}
            value={config.getValue()}
            icon={config.icon}
            color={config.color}
            subtitle={config.getSubtitle()}
            change={config.getChange()}
            onClick={() => handleStatClick(config.title)}
            delay={index * 100}
          />
        ))}
      </section>

      {/* Painel de Resumo do Dia + Gráfico de Presença */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Gráfico de Presença Semanal */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/30 rounded-xl p-4 shadow-md">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Presença dos Últimos 7 Dias
          </h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {weeklyData.length > 0 ? weeklyData.map((day, index) => {
              const maxValue = 100
              const height = day.isWeekend ? 8 : (day.rate / maxValue) * 100
              const isToday = index === weeklyData.length - 1
              
              return (
                <div key={day.date} className="flex flex-col items-center flex-1 gap-1">
                  <div className="relative w-full flex items-end justify-center" style={{ height: '100px' }}>
                    <div
                      className={`w-full max-w-8 rounded-t-md transition-all duration-500 ${
                        day.isWeekend 
                          ? 'bg-gray-200 dark:bg-gray-700' 
                          : isToday
                            ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                            : day.rate >= 90
                              ? 'bg-gradient-to-t from-green-500 to-green-400'
                              : day.rate >= 75
                                ? 'bg-gradient-to-t from-yellow-500 to-yellow-400'
                                : 'bg-gradient-to-t from-red-500 to-red-400'
                      }`}
                      style={{ height: `${height}%`, minHeight: day.isWeekend ? '8px' : '20px' }}
                    >
                      {!day.isWeekend && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-700 dark:text-gray-300">
                          {day.rate}%
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs ${isToday ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {format(parseISO(day.date), 'EEE', { locale: ptBR }).slice(0, 3)}
                  </span>
                </div>
              )
            }) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Carregando dados...
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-green-500 to-green-400"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">≥90%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-yellow-500 to-yellow-400"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">75-89%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-red-500 to-red-400"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">&lt;75%</span>
            </div>
          </div>
        </div>
        
        {/* Resumo Rápido do Dia */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/30 rounded-xl p-4 shadow-md">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            Resumo do Dia
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Pontuais</span>
              </div>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">{stats.onTimeToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Atrasados</span>
              </div>
              <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{stats.lateToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Ausentes</span>
              </div>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">{stats.todayAbsent}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">De férias</span>
              </div>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{vacations.length}</span>
            </div>
            {stats.avgWorkHours > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3 h-3 text-cyan-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Média horas/dia</span>
                  </div>
                  <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{stats.avgWorkHours}h</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Grid Principal: Aniversariantes e Férias lado a lado */}
      <section 
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6"
        aria-label="Aniversariantes e Férias"
      >
        {/* Aniversariantes */}
        <BirthdaysSection birthdays={birthdays} />

        {/* Férias */}
        <VacationsSection vacations={vacations} />
      </section>

      {/* Seção Colapsável: Ranking de Departamentos */}
      <section className="mb-4">
        <button
          onClick={() => setShowDepartments(!showDepartments)}
          className="w-full flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 group"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🏢</span>
            <span className="font-medium text-gray-900 dark:text-white text-sm">Ranking de Departamentos</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{departmentStats.length}</span>
          </div>
          {showDepartments ? (
            <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-indigo-500 transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-indigo-500 transition-colors" />
          )}
        </button>
        
        {showDepartments && (
          <div className="mt-3 animate-fade-in">
            <DepartmentRanking departments={departmentStats} />
          </div>
        )}
      </section>

      {/* Seção Colapsável: Últimos Registros */}
      <section className="mb-6">
        <button
          onClick={() => setShowRecentRecords(!showRecentRecords)}
          className="w-full flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 group"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">📋</span>
            <span className="font-medium text-gray-900 dark:text-white text-sm">Últimos Registros de Ponto</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{recentAttendance.length}</span>
          </div>
          {showRecentRecords ? (
            <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-indigo-500 transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-indigo-500 transition-colors" />
          )}
        </button>
        
        {showRecentRecords && (
          <div className="mt-3 animate-fade-in">
            <RecentAttendanceTable records={recentAttendance} />
          </div>
        )}
      </section>

      {/* Modal de Detalhes */}
      <StatDetailsModal
        selectedStat={selectedStat}
        stats={stats}
        monthlyComparison={monthlyComparison}
        attendanceGoal={90}
        onClose={handleCloseModal}
      />

      {/* Popup de Melhorias */}
      {showImprovements && (
        <ImprovementsPopup onClose={handleCloseImprovements} />
      )}
    </div>
  )
}
