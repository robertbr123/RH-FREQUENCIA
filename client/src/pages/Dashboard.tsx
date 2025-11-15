import { useState, useEffect } from 'react'
import axios from 'axios'
import { Users, Clock, CheckCircle, XCircle, TrendingUp, UserCheck, UserX, Calendar, Briefcase, Building2, Cake, Umbrella, ArrowUp, ArrowDown, Minus, Award, Timer } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Stats {
  totalEmployees: number
  activeEmployees: number
  inactiveEmployees: number
  todayPresent: number
  todayAbsent: number
  monthAttendanceRate: number
  lateToday: number
  onTimeToday: number
  avgWorkHours?: number
  employeeOfMonth?: { name: string; rate: number }
}

interface RecentAttendance {
  id: number
  employee_name: string
  entry_time: string | null
  break_start_time: string | null
  break_end_time: string | null
  exit_time: string | null
  total_hours: number | null
  status: string
}

interface DepartmentStats {
  name: string
  total: number
  present: number
  absent: number
  rate: number
  trend?: 'up' | 'down' | 'stable'
  rank?: number
}

interface Birthday {
  id: number
  name: string
  birth_date: string
  position_name: string
  photo_url?: string
}

interface Vacation {
  id: number
  employee_name: string
  photo_url?: string
  position_name: string
  start_date: string
  end_date: string
  days: number
}

interface MonthlyComparison {
  currentMonth: number
  lastMonth: number
  growth: number
  percentChange: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    todayPresent: 0,
    todayAbsent: 0,
    monthAttendanceRate: 0,
    lateToday: 0,
    onTimeToday: 0,
    avgWorkHours: 0,
    employeeOfMonth: undefined
  })
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([])
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([])
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison>({
    currentMonth: 0,
    lastMonth: 0,
    growth: 0,
    percentChange: 0
  })
  const [loading, setLoading] = useState(true)
  const [animateNumbers, setAnimateNumbers] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      const today = format(new Date(), 'yyyy-MM-dd')
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

      const [employeesRes, attendanceRes, monthAttendanceRes, vacationsRes] = await Promise.all([
        axios.get('/api/employees', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/attendance', {
          headers: { Authorization: `Bearer ${token}` },
          params: { start_date: today, end_date: today }
        }),
        axios.get('/api/attendance', {
          headers: { Authorization: `Bearer ${token}` },
          params: { start_date: monthStart, end_date: monthEnd }
        }),
        axios.get(`/api/organization/vacations/month/${new Date().getFullYear()}/${new Date().getMonth() + 1}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const employees = employeesRes.data
      const todayAttendance = attendanceRes.data
      const monthAttendance = monthAttendanceRes.data

      const activeEmployees = employees.filter((e: any) => e.status === 'active')
      const presentToday = todayAttendance.filter((a: any) => a.entry_time).length
      const workingDays = new Date().getDate()
      const totalPossibleAttendance = activeEmployees.length * workingDays
      const monthRate = totalPossibleAttendance > 0 
        ? (monthAttendance.length / totalPossibleAttendance * 100) 
        : 0

      // Calcular pontualidade (entrada antes das 08:30)
      const onTime = todayAttendance.filter((a: any) => {
        if (!a.entry_time) return false
        const timeStr = a.entry_time.toString()
        if (!timeStr.includes(':')) return false
        
        const [hourStr, minuteStr] = timeStr.split(':')
        const hour = parseInt(hourStr, 10)
        const minute = parseInt(minuteStr, 10)
        return hour < 8 || (hour === 8 && minute <= 30)
      }).length

      // Calcular média de horas trabalhadas no mês
      const totalHours = monthAttendance.reduce((sum: number, att: any) => {
        const hours = att.total_hours ? parseFloat(att.total_hours.toString()) : 0
        return sum + hours
      }, 0)
      const avgWorkHours = monthAttendance.length > 0 ? totalHours / monthAttendance.length : 0

      // Calcular frequência por funcionário e encontrar o destaque do mês
      const employeeAttendanceMap = new Map<number, { name: string; count: number }>()
      monthAttendance.forEach((att: any) => {
        const emp = employees.find((e: any) => e.id === att.employee_id)
        if (emp && emp.status === 'active') {
          const current = employeeAttendanceMap.get(att.employee_id)
          if (current) {
            current.count++
          } else {
            employeeAttendanceMap.set(att.employee_id, { name: emp.name, count: 1 })
          }
        }
      })

      let employeeOfMonth: { name: string; rate: number } | undefined
      if (employeeAttendanceMap.size > 0) {
        const topEmployee = Array.from(employeeAttendanceMap.entries())
          .map(([id, data]) => ({
            name: data.name,
            rate: Math.round((data.count / workingDays) * 100)
          }))
          .sort((a, b) => b.rate - a.rate)[0]
        employeeOfMonth = topEmployee
      }

      // Comparação com mês anterior
      const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
      const lastMonthEnd = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
      
      let lastMonthAttendance: any[] = []
      try {
        const lastMonthRes = await axios.get('/api/attendance', {
          headers: { Authorization: `Bearer ${token}` },
          params: { start_date: lastMonthStart, end_date: lastMonthEnd }
        })
        lastMonthAttendance = lastMonthRes.data
      } catch (err) {
        console.log('Erro ao buscar dados do mês anterior:', err)
      }

      const lastMonthRate = lastMonthAttendance.length
      const currentMonthRate = monthAttendance.length
      const growth = currentMonthRate - lastMonthRate
      const percentChange = lastMonthRate > 0 ? Math.round((growth / lastMonthRate) * 100) : 0

      setMonthlyComparison({
        currentMonth: currentMonthRate,
        lastMonth: lastMonthRate,
        growth,
        percentChange
      })

      setStats({
        totalEmployees: employees.length,
        activeEmployees: activeEmployees.length,
        inactiveEmployees: employees.filter((e: any) => e.status === 'inactive').length,
        todayPresent: presentToday,
        todayAbsent: activeEmployees.length - presentToday,
        monthAttendanceRate: Math.round(monthRate),
        lateToday: presentToday - onTime,
        onTimeToday: onTime,
        avgWorkHours: Math.round(avgWorkHours * 10) / 10,
        employeeOfMonth
      })

      // Ativar animações após carregar dados
      setTimeout(() => setAnimateNumbers(true), 100)

      // Estatísticas por departamento
      const deptMap = new Map<string, { total: number; present: Set<number> }>()
      
      employees.forEach((emp: any) => {
        if (emp.status !== 'active') return
        const dept = emp.department_name || 'Sem Departamento'
        if (!deptMap.has(dept)) {
          deptMap.set(dept, { total: 0, present: new Set() })
        }
        deptMap.get(dept)!.total++
      })

      todayAttendance.forEach((att: any) => {
        const emp = employees.find((e: any) => e.id === att.employee_id)
        if (emp && emp.status === 'active') {
          const dept = emp.department_name || 'Sem Departamento'
          if (deptMap.has(dept)) {
            deptMap.get(dept)!.present.add(att.employee_id)
          }
        }
      })

      const deptStats: DepartmentStats[] = Array.from(deptMap.entries()).map(([name, data]) => {
        const present = data.present.size
        const total = data.total
        const rate = total > 0 ? Math.round((present / total) * 100) : 0
        
        // Simular tendência baseada na taxa (em produção, comparar com dados anteriores)
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (rate >= 90) trend = 'up'
        else if (rate < 70) trend = 'down'
        
        return {
          name,
          total,
          present,
          absent: total - present,
          rate,
          trend
        }
      }).sort((a, b) => b.rate - a.rate) // Ordenar por taxa, não por total

      // Adicionar ranking
      deptStats.forEach((dept, index) => {
        dept.rank = index + 1
      })

      setDepartmentStats(deptStats.slice(0, 5))
      setRecentAttendance(todayAttendance.slice(0, 10))

      // Buscar aniversariantes do mês
      console.log('🎂 Verificando aniversariantes...')
      console.log('📋 Total de funcionários:', employees.length)
      
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      console.log('📅 Mês atual:', currentMonth, '/', currentYear)
      
      // Debug: mostrar todos os funcionários ativos com suas datas
      employees.forEach((emp: any) => {
        if (emp.status === 'active') {
          console.log(`👤 ${emp.name}: birth_date = ${emp.birth_date} (${typeof emp.birth_date})`)
        }
      })
      
      const birthdaysThisMonth = employees
        .filter((emp: any) => {
          if (!emp.birth_date || emp.status !== 'active') {
            if (emp.status === 'active' && !emp.birth_date) {
              console.log(`⚠️ Funcionário ${emp.name} não tem data de nascimento`)
            }
            return false
          }
          // Criar Date diretamente da string ISO que vem do banco
          const birthDateStr = String(emp.birth_date)
          console.log(`🔍 Processando ${emp.name}: ${birthDateStr}`)
          
          const birthDate = new Date(birthDateStr)
          const birthMonth = birthDate.getMonth() + 1
          const birthDay = birthDate.getDate()
          
          console.log(`   📆 Data parseada: ${birthDay}/${birthMonth}/${birthDate.getFullYear()}`)
          console.log(`   🔢 Mês do aniversário: ${birthMonth}, Mês atual: ${currentMonth}`)
          
          const isThisMonth = birthMonth === currentMonth
          
          if (isThisMonth) {
            console.log(`   ✅ ANIVERSARIANTE DESTE MÊS!`)
          } else {
            console.log(`   ❌ Não é este mês`)
          }
          
          return isThisMonth
        })
        .map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          birth_date: emp.birth_date,
          position_name: emp.position_name || 'Não informado',
          photo_url: emp.photo_url
        }))
        .sort((a: any, b: any) => {
          // Ordenar por dia do mês
          const dayA = new Date(a.birth_date).getDate()
          const dayB = new Date(b.birth_date).getDate()
          return dayA - dayB
        })

      console.log('🎂 Total de aniversariantes do mês:', birthdaysThisMonth.length)
      setBirthdays(birthdaysThisMonth)

      // Processar férias do mês
      const vacationsData = vacationsRes.data || []
      console.log('🏖️ Férias encontradas:', vacationsData.length)
      setVacations(vacationsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total de Funcionários',
      value: stats.totalEmployees,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: `${stats.activeEmployees} ativos`,
      change: null
    },
    {
      title: 'Presentes Hoje',
      value: stats.todayPresent,
      icon: UserCheck,
      gradient: 'from-green-500 to-green-600',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600',
      subtitle: `${stats.onTimeToday} pontuais`,
      change: monthlyComparison.percentChange
    },
    {
      title: 'Ausentes Hoje',
      value: stats.todayAbsent,
      icon: UserX,
      gradient: 'from-red-500 to-red-600',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600',
      subtitle: `${stats.lateToday} atrasados`,
      change: null
    },
    {
      title: 'Taxa Mensal',
      value: `${stats.monthAttendanceRate}%`,
      icon: TrendingUp,
      gradient: 'from-purple-500 to-purple-600',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
      subtitle: 'Frequência do mês',
      change: monthlyComparison.percentChange
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Skeleton loader melhorado */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gray-200 dark:bg-gray-700 w-12 h-12 rounded-lg"></div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
        </div>
      </div>

      {/* Stats Grid com gradientes e animações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div 
            key={stat.title} 
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`h-1 bg-gradient-to-r ${stat.gradient}`}></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgLight} dark:bg-opacity-10 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-6 h-6 ${stat.textColor} dark:text-white`} />
                </div>
                {stat.change !== null && stat.change !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    stat.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    <span>{Math.abs(stat.change)}%</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.title}</p>
              <p className={`text-3xl font-bold text-gray-900 dark:text-white mb-1 transition-all duration-500 ${
                animateNumbers ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Métricas Adicionais - Nova Seção */}
      {(stats.avgWorkHours || stats.employeeOfMonth) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {stats.avgWorkHours && stats.avgWorkHours > 0 && (
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-sm p-6 border border-cyan-100 dark:border-gray-600">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-cyan-500 p-3 rounded-lg">
                  <Timer className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Média de Horas Trabalhadas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgWorkHours}h</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Por dia no mês atual</p>
            </div>
          )}
          
          {stats.employeeOfMonth && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-sm p-6 border border-amber-100 dark:border-gray-600">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-amber-500 p-3 rounded-lg animate-pulse">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Funcionário Destaque</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{stats.employeeOfMonth.name}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stats.employeeOfMonth.rate}% de presença este mês
              </p>
            </div>
          )}
        </div>
      )}

      {/* Department Stats & Recent Attendance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Department Stats com Ranking e Tendências */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ranking de Departamentos</h2>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Presença Hoje</span>
          </div>
          
          {departmentStats.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhum departamento cadastrado</p>
          ) : (
            <div className="space-y-3">
              {departmentStats.map((dept, index) => {
                const medals = ['🥇', '🥈', '🥉']
                const trendIcons = {
                  up: <ArrowUp className="w-4 h-4 text-green-500" />,
                  down: <ArrowDown className="w-4 h-4 text-red-500" />,
                  stable: <Minus className="w-4 h-4 text-gray-400" />
                }
                
                return (
                  <div 
                    key={dept.name} 
                    className={`group relative rounded-lg p-4 transition-all duration-300 ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-gray-700 dark:to-gray-600 border-2 border-yellow-300 dark:border-yellow-600' :
                      index === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-gray-600 border border-gray-300 dark:border-gray-500' :
                      index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-700 dark:to-gray-600 border border-orange-300 dark:border-orange-600' :
                      'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Ranking Badge */}
                      <div className="flex-shrink-0">
                        {index < 3 ? (
                          <span className="text-2xl">{medals[index]}</span>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">#{dept.rank}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Info do Departamento */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          <span className="font-semibold text-gray-900 dark:text-white truncate">{dept.name}</span>
                          {dept.trend && trendIcons[dept.trend]}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-2">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {dept.total}
                          </span>
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {dept.present}
                          </span>
                          <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            {dept.absent}
                          </span>
                        </div>
                        
                        {/* Barra de Progresso */}
                        <div className="relative w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              dept.rate >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 
                              dept.rate >= 80 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                              dept.rate >= 70 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                              dept.rate >= 50 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                              'bg-gradient-to-r from-red-400 to-red-500'
                            }`}
                            style={{ width: `${dept.rate}%` }}
                          >
                            <div className="h-full w-full animate-pulse opacity-50 bg-white"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Taxa de Presença */}
                      <div className="flex-shrink-0 text-right">
                        <div className={`text-2xl font-bold ${
                          dept.rate >= 80 ? 'text-green-600 dark:text-green-400' : 
                          dept.rate >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {dept.rate}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">presença</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Resumo Rápido</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pontuais Hoje</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.onTimeToday}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Antes das 08:30</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Atrasados Hoje</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lateToday}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Após 08:30</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 p-2 rounded-lg">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Inativos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inactiveEmployees}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Funcionários</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aniversariantes do Mês - Melhorado */}
      <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-sm p-6 mb-8 border border-pink-100 dark:border-gray-600">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1">
            <div className="bg-pink-500 p-2 rounded-lg">
              <Cake className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Aniversariantes de {format(new Date(), 'MMMM', { locale: ptBR })}
            </h2>
          </div>
          {birthdays.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="bg-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full animate-pulse">
                {birthdays.length} {birthdays.length === 1 ? 'pessoa' : 'pessoas'}
              </span>
              {birthdays.some(b => new Date(b.birth_date).getDate() === new Date().getDate()) && (
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce">
                  🎉 Hoje!
                </span>
              )}
            </div>
          )}
        </div>
        
        {birthdays.length === 0 ? (
          <div className="text-center py-8">
            <Cake className="w-16 h-16 text-pink-300 dark:text-pink-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum aniversariante este mês</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {birthdays.map((birthday) => {
              const birthDate = new Date(birthday.birth_date)
              const day = birthDate.getDate()
              const today = new Date().getDate()
              const currentMonth = new Date().getMonth()
              const isToday = day === today
              const daysUntil = day - today
              const isPast = day < today
              
              return (
                <div 
                  key={birthday.id}
                  className={`group relative flex items-center gap-3 p-4 rounded-xl transition-all duration-300 ${
                    isToday 
                      ? 'bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border-2 border-pink-400 shadow-lg scale-105 animate-pulse' 
                      : 'bg-white dark:bg-gray-700 border-2 border-pink-200 dark:border-gray-600 hover:border-pink-400 hover:shadow-md hover:scale-102'
                  }`}
                >
                  {isToday && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-bounce">
                      🎂 HOJE!
                    </div>
                  )}
                  
                  <div className="flex-shrink-0 relative">
                    {birthday.photo_url ? (
                      <div className="relative">
                        <img
                          src={birthday.photo_url}
                          alt={birthday.name}
                          className={`w-14 h-14 rounded-full object-cover border-3 ${
                            isToday ? 'border-pink-500 ring-4 ring-pink-200' : 'border-pink-300'
                          }`}
                        />
                        {isToday && (
                          <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-xs rounded-full p-1">
                            🎉
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border-3 ${
                        isToday 
                          ? 'bg-gradient-to-br from-pink-400 to-rose-500 border-pink-500 ring-4 ring-pink-200' 
                          : 'bg-gradient-to-br from-pink-200 to-pink-300 border-pink-300'
                      }`}>
                        <span className={`text-xl font-bold ${isToday ? 'text-white' : 'text-pink-700'}`}>
                          {birthday.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                      {birthday.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{birthday.position_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-xs font-medium ${
                        isToday ? 'text-pink-700 dark:text-pink-400' : 'text-pink-600 dark:text-pink-500'
                      }`}>
                        {format(birthDate, "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      {!isToday && !isPast && daysUntil > 0 && daysUntil <= 7 && (
                        <span className="text-xs bg-pink-200 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full">
                          {daysUntil === 1 ? 'Amanhã' : `${daysUntil} dias`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Férias do Mês */}
      {vacations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Umbrella className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Férias de {format(new Date(), 'MMMM', { locale: ptBR })}
            </h2>
            <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {vacations.length} {vacations.length === 1 ? 'pessoa' : 'pessoas'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vacations.map((vacation) => {
              const startDate = new Date(vacation.start_date)
              const endDate = new Date(vacation.end_date)
              const today = new Date()
              
              // Verificar se está de férias hoje
              const isOnVacationToday = today >= startDate && today <= endDate
              
              return (
                <div 
                  key={vacation.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    isOnVacationToday 
                      ? 'bg-blue-50 border-blue-300 shadow-md' 
                      : 'bg-gray-50 border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {vacation.photo_url ? (
                      <img
                        src={vacation.photo_url}
                        alt={vacation.employee_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-300"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center border-2 border-blue-300">
                        <span className="text-lg font-bold text-blue-700">
                          {vacation.employee_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {vacation.employee_name}
                      {isOnVacationToday && (
                        <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                          EM FÉRIAS 🏖️
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{vacation.position_name}</p>
                    <p className="text-xs text-blue-600 font-medium mt-0.5">
                      {format(startDate, "dd/MM", { locale: ptBR })} - {format(endDate, "dd/MM", { locale: ptBR })} ({vacation.days} dias)
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Attendance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Últimos Registros de Hoje</h2>
        
        {recentAttendance.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhum registro de frequência hoje</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Funcionário</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Entrada</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Saída</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Duração</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map((record) => {
                  // entry_time e exit_time agora são strings "HH:MM:SS"
                  const entryTimeStr = record.entry_time ? record.entry_time.toString() : null
                  const exitTimeStr = record.exit_time ? record.exit_time.toString() : null
                  
                  // Usar total_hours do banco se disponível
                  const duration = record.total_hours 
                    ? parseFloat(record.total_hours.toString())
                    : null

                  return (
                    <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 dark:bg-gray-900">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{record.employee_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {entryTimeStr && entryTimeStr.includes(':') ? entryTimeStr.substring(0, 5) : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {exitTimeStr && exitTimeStr.includes(':') ? exitTimeStr.substring(0, 5) : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {duration && !isNaN(duration) ? `${duration.toFixed(1)}h` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          exitTimeStr ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {exitTimeStr ? 'Completo' : 'Trabalhando'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
