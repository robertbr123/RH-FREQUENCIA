import { useState, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'

// ============================================
// TIPOS
// ============================================

export interface Stats {
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

export interface RecentAttendance {
  id: number
  employee_name: string
  entry_time: string | null
  break_start_time: string | null
  break_end_time: string | null
  exit_time: string | null
  total_hours: number | null
  status: string
}

export interface DepartmentStats {
  name: string
  total: number
  present: number
  absent: number
  rate: number
  trend?: 'up' | 'down' | 'stable'
  rank?: number
}

export interface Birthday {
  id: number
  name: string
  birth_date: string
  position_name: string
  photo_url?: string
  phone?: string
}

export interface Vacation {
  id: number
  employee_name: string
  photo_url?: string
  position_name: string
  start_date: string
  end_date: string
  days: number
}

export interface MonthlyComparison {
  currentMonth: number
  lastMonth: number
  growth: number
  percentChange: number
}

export interface TopPerformer {
  name: string
  rate: number
  badge: string
  streak: number
}

export interface LowAttendanceEmployee {
  name: string
  rate: number
  days_absent: number
}

export interface WeeklyData {
  date: string
  dayOfWeek: number
  isWeekend: boolean
  presentCount: number
  totalEmployees: number
  rate: number
}

// ============================================
// CONSTANTES
// ============================================

const TIMEZONE = 'America/Rio_Branco'
const ON_TIME_HOUR = 8
const ON_TIME_MINUTE = 30
const LOW_ATTENDANCE_THRESHOLD = 70
const ATTENDANCE_GOAL = 95

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Retorna a data local no formato YYYY-MM-DD
 */
const getLocalDate = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(new Date())
}

/**
 * Calcula se o funcionário chegou no horário
 */
const isOnTime = (entryTime: string | null): boolean => {
  if (!entryTime) return false
  const timeStr = entryTime.toString()
  if (!timeStr.includes(':')) return false
  
  const [hourStr, minuteStr] = timeStr.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)
  return hour < ON_TIME_HOUR || (hour === ON_TIME_HOUR && minute <= ON_TIME_MINUTE)
}

/**
 * Calcula badge baseado na taxa de presença
 */
const calculateBadge = (rate: number): string => {
  if (rate === 100) return '🏆 Perfeito'
  if (rate >= 95) return '⭐ Excelente'
  if (rate >= 85) return '👍 Muito Bom'
  if (rate >= 75) return '✅ Bom'
  return ''
}

/**
 * Extrai dia e mês de uma data no formato string
 */
const extractDayMonth = (dateStr: string): { day: number; month: number } => {
  const dateOnly = String(dateStr).split('T')[0]
  const [, month, day] = dateOnly.split('-').map(Number)
  return { day, month }
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useDashboardData() {
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
  const [error, setError] = useState<string | null>(null)
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([])
  const [lowAttendance, setLowAttendance] = useState<LowAttendanceEmployee[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])

  const attendanceGoal = ATTENDANCE_GOAL

  // Calcular estatísticas por departamento
  const calculateDepartmentStats = useCallback((
    employees: any[],
    todayAttendance: any[]
  ): DepartmentStats[] => {
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
      
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (rate >= 90) trend = 'up'
      else if (rate < 70) trend = 'down'
      
      return { name, total, present, absent: total - present, rate, trend }
    }).sort((a, b) => b.rate - a.rate)

    deptStats.forEach((dept, index) => {
      dept.rank = index + 1
    })

    return deptStats.slice(0, 5)
  }, [])

  // Calcular aniversariantes do mês
  const calculateBirthdays = useCallback((employees: any[]): Birthday[] => {
    const currentMonth = new Date().getMonth() + 1
    
    return employees
      .filter((emp: any) => {
        if (!emp.birth_date || emp.status !== 'active') return false
        const { month } = extractDayMonth(emp.birth_date)
        return month === currentMonth
      })
      .map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        birth_date: emp.birth_date,
        position_name: emp.position_name || 'Não informado',
        photo_url: emp.photo_url,
        phone: emp.phone
      }))
      .sort((a: Birthday, b: Birthday) => {
        const dayA = extractDayMonth(a.birth_date).day
        const dayB = extractDayMonth(b.birth_date).day
        return dayA - dayB
      })
  }, [])

  // Calcular top performers e baixa frequência
  const calculatePerformance = useCallback((
    employeeAttendanceMap: Map<number, { name: string; count: number }>,
    workingDays: number
  ): { topPerformers: TopPerformer[]; lowAttendance: LowAttendanceEmployee[] } => {
    const performanceList = Array.from(employeeAttendanceMap.entries())
      .map(([, data]) => {
        const rate = Math.round((data.count / workingDays) * 100)
        return {
          name: data.name,
          rate,
          badge: calculateBadge(rate),
          streak: data.count
        }
      })
      .sort((a, b) => b.rate - a.rate)

    const topPerformers = performanceList.slice(0, 5)

    const lowAttendance = performanceList
      .filter(emp => emp.rate < LOW_ATTENDANCE_THRESHOLD)
      .map(emp => ({
        name: emp.name,
        rate: emp.rate,
        days_absent: workingDays - emp.streak
      }))
      .slice(0, 5)

    return { topPerformers, lowAttendance }
  }, [])

  // Carregar dados do dashboard
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      const today = getLocalDate()
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

      const [employeesRes, attendanceRes, monthAttendanceRes, vacationsRes, weeklyRes] = await Promise.all([
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
        }),
        axios.get('/api/attendance/weekly-stats', { headers: { Authorization: `Bearer ${token}` } })
      ])

      const employees = employeesRes.data
      const todayAttendance = attendanceRes.data
      const monthAttendance = monthAttendanceRes.data
      
      // Dados semanais reais
      setWeeklyData(weeklyRes.data || [])

      const activeEmployees = employees.filter((e: any) => e.status === 'active')
      const presentToday = todayAttendance.filter((a: any) => a.entry_time).length
      const workingDays = new Date().getDate()
      const totalPossibleAttendance = activeEmployees.length * workingDays
      const monthRate = totalPossibleAttendance > 0 
        ? (monthAttendance.length / totalPossibleAttendance * 100) 
        : 0

      // Calcular pontualidade
      const onTime = todayAttendance.filter((a: any) => isOnTime(a.entry_time)).length

      // Calcular média de horas trabalhadas
      const totalHours = monthAttendance.reduce((sum: number, att: any) => {
        const hours = att.total_hours ? parseFloat(att.total_hours.toString()) : 0
        return sum + hours
      }, 0)
      const avgWorkHours = monthAttendance.length > 0 ? totalHours / monthAttendance.length : 0

      // Mapear frequência por funcionário
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

      // Encontrar funcionário destaque
      let employeeOfMonth: { name: string; rate: number } | undefined
      if (employeeAttendanceMap.size > 0) {
        const topEmployee = Array.from(employeeAttendanceMap.entries())
          .map(([, data]) => ({
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
      } catch {
        // Silently handle error for last month data
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

      // Calcular outras estatísticas
      setDepartmentStats(calculateDepartmentStats(employees, todayAttendance))
      setRecentAttendance(todayAttendance.slice(0, 10))
      setBirthdays(calculateBirthdays(employees))
      setVacations(vacationsRes.data || [])

      const { topPerformers: top, lowAttendance: low } = calculatePerformance(
        employeeAttendanceMap,
        workingDays
      )
      setTopPerformers(top)
      setLowAttendance(low)

    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados do dashboard. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [calculateDepartmentStats, calculateBirthdays, calculatePerformance])

  // Carregar dados ao montar
  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Memoizar dados para evitar recálculos
  const memoizedStats = useMemo(() => stats, [stats])
  const memoizedDepartmentStats = useMemo(() => departmentStats, [departmentStats])
  const memoizedBirthdays = useMemo(() => birthdays, [birthdays])
  const memoizedVacations = useMemo(() => vacations, [vacations])
  const memoizedWeeklyData = useMemo(() => weeklyData, [weeklyData])

  return {
    stats: memoizedStats,
    recentAttendance,
    departmentStats: memoizedDepartmentStats,
    birthdays: memoizedBirthdays,
    vacations: memoizedVacations,
    weeklyData: memoizedWeeklyData,
    monthlyComparison,
    topPerformers,
    lowAttendance,
    loading,
    error,
    attendanceGoal,
    refresh: loadDashboardData
  }
}
