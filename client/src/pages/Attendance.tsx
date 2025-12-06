import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { 
  Calendar, 
  Download, 
  Filter, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AttendanceModal from '../components/AttendanceModal'
import { toast } from '../utils/toast'

interface AttendanceRecord {
  id: number
  employee_id: number
  employee_name: string
  position_name: string
  department_name: string
  check_in: string
  check_out: string | null
  status: string
  notes: string | null
  date?: string
}

interface DayAttendance {
  date: Date
  records: AttendanceRecord[]
  present: number
  absent: number
}

// Componente de Estatísticas
function StatsCard({ 
  icon: Icon, 
  title, 
  value, 
  subtitle,
  color 
}: { 
  icon: any
  title: string
  value: string | number
  subtitle?: string
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-emerald-600',
    yellow: 'from-yellow-500 to-orange-500',
    red: 'from-red-500 to-rose-600',
    purple: 'from-purple-500 to-purple-600'
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-white/70 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  )
}

// Componente de Calendário
function AttendanceCalendar({ 
  currentMonth, 
  attendanceByDay,
  onDayClick,
  selectedDate
}: { 
  currentMonth: Date
  attendanceByDay: Map<string, DayAttendance>
  onDayClick: (date: Date) => void
  selectedDate: Date | null
}) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Preencher dias vazios no início
  const startDay = getDay(monthStart)
  const emptyDays = Array(startDay).fill(null)

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}
        
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayData = attendanceByDay.get(dateKey)
          const hasRecords = dayData && dayData.records.length > 0
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const today = isToday(day)

          return (
            <button
              key={dateKey}
              onClick={() => onDayClick(day)}
              className={`
                aspect-square rounded-lg p-1 text-sm font-medium transition-all duration-200 relative
                ${today ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-800' : ''}
                ${isSelected ? 'bg-primary-500 text-white shadow-lg' : 
                  hasRecords ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' :
                  'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
              `}
            >
              <span>{format(day, 'd')}</span>
              {hasRecords && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Attendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null)

  useEffect(() => {
    loadDepartments()
  }, [])

  useEffect(() => {
    loadAttendance()
  }, [startDate, endDate])

  useEffect(() => {
    filterRecords()
  }, [records, selectedDepartment, searchTerm])

  // Estatísticas
  const stats = useMemo(() => {
    const uniqueEmployees = new Set(filteredRecords.map(r => r.employee_id))
    const completed = filteredRecords.filter(r => r.check_out)
    const inProgress = filteredRecords.filter(r => !r.check_out)
    
    // Calcular horas trabalhadas
    let totalMinutes = 0
    completed.forEach(r => {
      if (r.check_in && r.check_out) {
        const checkIn = new Date(r.check_in)
        const checkOut = new Date(r.check_out)
        totalMinutes += (checkOut.getTime() - checkIn.getTime()) / (1000 * 60)
      }
    })
    const totalHours = Math.floor(totalMinutes / 60)
    const remainingMinutes = Math.floor(totalMinutes % 60)

    return {
      total: filteredRecords.length,
      uniqueEmployees: uniqueEmployees.size,
      completed: completed.length,
      inProgress: inProgress.length,
      totalHours: `${totalHours}h ${remainingMinutes}m`
    }
  }, [filteredRecords])

  // Agrupar por dia para o calendário
  const attendanceByDay = useMemo(() => {
    const map = new Map<string, DayAttendance>()
    
    records.forEach(record => {
      const dateStr = record.check_in?.split('T')[0] || format(new Date(), 'yyyy-MM-dd')
      
      if (!map.has(dateStr)) {
        map.set(dateStr, {
          date: parseISO(dateStr),
          records: [],
          present: 0,
          absent: 0
        })
      }
      
      const dayData = map.get(dateStr)!
      dayData.records.push(record)
      dayData.present++
    })
    
    return map
  }, [records])

  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/organization/departments', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDepartments(response.data)
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error)
    }
  }

  const loadAttendance = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/attendance', {
        headers: { Authorization: `Bearer ${token}` },
        params: { start_date: startDate, end_date: endDate }
      })
      setRecords(response.data)
    } catch (error) {
      console.error('Erro ao carregar frequência:', error)
      toast.error('Erro ao carregar frequência')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadAttendance()
  }

  const filterRecords = () => {
    let filtered = [...records]
    
    if (selectedDepartment) {
      filtered = filtered.filter(r => r.department_name === selectedDepartment)
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(r => 
        r.employee_name?.toLowerCase().includes(term) ||
        r.position_name?.toLowerCase().includes(term)
      )
    }
    
    if (selectedCalendarDate) {
      const dateStr = format(selectedCalendarDate, 'yyyy-MM-dd')
      filtered = filtered.filter(r => r.check_in?.startsWith(dateStr))
    }
    
    setFilteredRecords(filtered)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    loadAttendance()
  }

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    setStartDate(format(startOfMonth(newMonth), 'yyyy-MM-dd'))
    setEndDate(format(endOfMonth(newMonth), 'yyyy-MM-dd'))
  }

  const handleDayClick = (date: Date) => {
    if (selectedCalendarDate && isSameDay(date, selectedCalendarDate)) {
      setSelectedCalendarDate(null)
    } else {
      setSelectedCalendarDate(date)
    }
  }

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-'
    
    if (dateStr.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      return dateStr.substring(0, 5)
    }
    
    if (dateStr.includes('T')) {
      const [datePart, timePart] = dateStr.split('T')
      const [year, month, day] = datePart.split('-')
      const time = timePart.split('.')[0].substring(0, 5)
      return `${day}/${month}/${year} ${time}`
    }
    
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  const exportToCSV = () => {
    const headers = ['Funcionário', 'Cargo', 'Departamento', 'Entrada', 'Saída', 'Status']
    const rows = filteredRecords.map(r => [
      r.employee_name,
      r.position_name || '-',
      r.department_name || '-',
      formatTime(r.check_in),
      r.check_out ? formatTime(r.check_out) : '-',
      r.check_out ? 'Completo' : 'Em andamento'
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frequencia_${startDate}_${endDate}.csv`
    a.click()
    toast.success('Arquivo exportado com sucesso!')
  }

  const exportToExcel = () => {
    // Gerar formato compatível com Excel
    const headers = ['Funcionário', 'Cargo', 'Departamento', 'Data', 'Entrada', 'Saída', 'Horas', 'Status']
    const rows = filteredRecords.map(r => {
      const checkIn = r.check_in ? new Date(r.check_in) : null
      const checkOut = r.check_out ? new Date(r.check_out) : null
      let hours = '-'
      
      if (checkIn && checkOut) {
        const diffMs = checkOut.getTime() - checkIn.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        hours = `${diffHours}h ${diffMinutes}m`
      }
      
      return [
        r.employee_name,
        r.position_name || '-',
        r.department_name || '-',
        checkIn ? format(checkIn, 'dd/MM/yyyy') : '-',
        checkIn ? format(checkIn, 'HH:mm') : '-',
        checkOut ? format(checkOut, 'HH:mm') : '-',
        hours,
        r.check_out ? 'Completo' : 'Em andamento'
      ]
    })

    // Formato tab-separated para Excel
    const tsv = [headers, ...rows].map(row => row.join('\t')).join('\n')
    const blob = new Blob(['\ufeff' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frequencia_${startDate}_${endDate}.xls`
    a.click()
    toast.success('Arquivo Excel exportado com sucesso!')
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Registro de Frequência</h1>
            <p className="text-gray-600 dark:text-gray-400">Acompanhe os registros de ponto dos funcionários</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          >
            <Calendar className="w-5 h-5" />
            Registrar Ponto
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          icon={Users}
          title="Total de Registros"
          value={stats.total}
          subtitle="no período"
          color="blue"
        />
        <StatsCard
          icon={Users}
          title="Funcionários"
          value={stats.uniqueEmployees}
          subtitle="com registro"
          color="purple"
        />
        <StatsCard
          icon={CheckCircle}
          title="Completos"
          value={stats.completed}
          subtitle="entrada e saída"
          color="green"
        />
        <StatsCard
          icon={AlertCircle}
          title="Em Andamento"
          value={stats.inProgress}
          subtitle="aguardando saída"
          color="yellow"
        />
        <StatsCard
          icon={TrendingUp}
          title="Horas Trabalhadas"
          value={stats.totalHours}
          subtitle="total do período"
          color="blue"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtros:</span>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <List className="w-4 h-4" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'calendar' 
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Calendário
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar funcionário..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent text-sm"
            />
          </div>

          {viewMode === 'list' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">De:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Até:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent text-sm"
                />
              </div>
            </>
          )}

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent text-sm"
          >
            <option value="">Todos os Departamentos</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>

          {selectedCalendarDate && (
            <button
              onClick={() => setSelectedCalendarDate(null)}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg text-sm"
            >
              <XCircle className="w-4 h-4" />
              {format(selectedCalendarDate, 'dd/MM/yyyy')}
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => handleMonthChange('prev')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <button
                  onClick={() => handleMonthChange('next')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
            
            <AttendanceCalendar
              currentMonth={currentMonth}
              attendanceByDay={attendanceByDay}
              onDayClick={handleDayClick}
              selectedDate={selectedCalendarDate}
            />

            {/* Legenda */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Legenda</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Dia com registros</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 ring-2 ring-primary-500 rounded" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Hoje</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary-500 rounded" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Dia selecionado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Records for Selected Day */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedCalendarDate 
                    ? `Registros de ${format(selectedCalendarDate, "dd 'de' MMMM", { locale: ptBR })}`
                    : 'Todos os Registros do Mês'
                  }
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredRecords.length} registro(s) encontrado(s)
                </p>
              </div>
              
              <div className="max-h-[600px] overflow-y-auto">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Nenhum registro encontrado</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredRecords.map((record) => (
                      <div key={record.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{record.employee_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {record.position_name || 'Sem cargo'} • {record.department_name || 'Sem departamento'}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            record.check_out 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          }`}>
                            {record.check_out ? 'Completo' : 'Em andamento'}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Clock className="w-4 h-4" />
                            Entrada: {formatTime(record.check_in)}
                          </span>
                          {record.check_out && (
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <Clock className="w-4 h-4" />
                              Saída: {formatTime(record.check_out)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">Nenhum registro encontrado</p>
              <p className="text-gray-500 dark:text-gray-500">Ajuste os filtros ou selecione outro período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold">Funcionário</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold">Cargo</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold">Departamento</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold">Entrada</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold">Saída</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-semibold text-gray-900 dark:text-white">{record.employee_name}</p>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">{record.position_name || '-'}</td>
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">{record.department_name || '-'}</td>
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(record.check_in)}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                        {record.check_out ? formatTime(record.check_out) : '-'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          record.check_out 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {record.check_out ? (
                            <><CheckCircle className="w-3 h-3" /> Completo</>
                          ) : (
                            <><AlertCircle className="w-3 h-3" /> Em andamento</>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalOpen && <AttendanceModal onClose={handleModalClose} />}
    </div>
  )
}
