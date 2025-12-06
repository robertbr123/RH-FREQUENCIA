import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { 
  Clock, 
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  X
} from 'lucide-react'
import { format, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import HourBankCard from '../components/HourBankCard'
import Avatar from '../components/Avatar'

interface Employee {
  id: number
  name: string
  department_name?: string
  position_name?: string
  photo_url?: string
}

interface HourBankData {
  employee: {
    id: number
    name: string
    schedule: string
    dailyWorkHours: number
  }
  summary: {
    month: number
    year: number
    totalWorkedMinutes: number
    totalWorkedHours: number
    expectedMinutes: number
    expectedHours: number
    balanceMinutes: number
    balanceFormatted: string
    isPositive: boolean
  }
  dailyDetails: Array<{
    date: string
    worked: number
    expected: number
    balance: number
    isWorkday: boolean
    incomplete?: boolean
  }>
}

export default function HourBank() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [hourBankData, setHourBankData] = useState<HourBankData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const searchRef = useRef<HTMLDivElement>(null)

  const currentMonth = selectedMonth.getMonth() + 1
  const currentYear = selectedMonth.getFullYear()

  // Carregar lista de funcionários para autocomplete
  useEffect(() => {
    loadEmployees()
  }, [])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Recarregar dados quando mudar o mês
  useEffect(() => {
    if (selectedEmployee) {
      loadHourBank(selectedEmployee.id)
    }
  }, [selectedMonth])

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/employees?status=active', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEmployees(response.data)
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    }
  }

  const loadHourBank = async (employeeId: number) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/attendance/hour-bank/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { month: currentMonth, year: currentYear }
      })
      setHourBankData(response.data)
    } catch (error) {
      console.error('Erro ao carregar banco de horas:', error)
      setHourBankData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setSearchTerm(employee.name)
    setShowDropdown(false)
    loadHourBank(employee.id)
  }

  const handleClearSelection = () => {
    setSelectedEmployee(null)
    setSearchTerm('')
    setHourBankData(null)
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10) // Limitar a 10 resultados

  const handlePrevMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1))
  }

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1))
  }

  const monthName = format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Banco de Horas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Consulte o saldo de horas de um funcionário
          </p>
        </div>
        
        {/* Navegação de mês */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-medium text-indigo-700 dark:text-indigo-300 capitalize">
              {monthName}
            </span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Campo de Pesquisa */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Pesquisar Funcionário
        </label>
        <div ref={searchRef} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Digite o nome do funcionário..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowDropdown(true)
              if (!e.target.value) {
                setSelectedEmployee(null)
                setHourBankData(null)
              }
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 text-lg"
          />
          {selectedEmployee && (
            <button
              onClick={handleClearSelection}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}

          {/* Dropdown de resultados */}
          {showDropdown && searchTerm && !selectedEmployee && filteredEmployees.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-72 overflow-y-auto">
              {filteredEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <Avatar name={emp.name} photoUrl={emp.photo_url} size="sm" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{emp.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {emp.position_name || 'Sem cargo'} • {emp.department_name || 'Sem departamento'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showDropdown && searchTerm && !selectedEmployee && filteredEmployees.length === 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 text-center text-gray-500">
              Nenhum funcionário encontrado
            </div>
          )}
        </div>
      </div>

      {/* Estado Inicial - Sem seleção */}
      {!selectedEmployee && !loading && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="w-24 h-24 mx-auto mb-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-indigo-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Selecione um Funcionário
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Use o campo de pesquisa acima para encontrar e selecionar um funcionário. 
            O banco de horas será calculado automaticamente.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Calculando banco de horas...</p>
        </div>
      )}

      {/* Resultado - Funcionário Selecionado */}
      {selectedEmployee && hourBankData && !loading && (
        <div className="space-y-6">
          {/* Card do Funcionário */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <Avatar name={selectedEmployee.name} photoUrl={selectedEmployee.photo_url} size="lg" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedEmployee.name}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedEmployee.position_name || 'Sem cargo'} • {selectedEmployee.department_name || 'Sem departamento'}
                </p>
                {hourBankData.employee.schedule && (
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">
                    Horário: {hourBankData.employee.schedule} ({hourBankData.employee.dailyWorkHours}h/dia)
                  </p>
                )}
              </div>
            </div>

            {/* Resumo do Saldo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Horas Trabalhadas</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hourBankData.summary.totalWorkedHours.toFixed(1)}h
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Horas Esperadas</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hourBankData.summary.expectedHours}h
                </p>
              </div>

              <div className={`rounded-xl p-4 ${
                hourBankData.summary.isPositive 
                  ? 'bg-green-50 dark:bg-green-900/20' 
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className={`w-5 h-5 ${
                    hourBankData.summary.isPositive ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Saldo</span>
                </div>
                <p className={`text-2xl font-bold ${
                  hourBankData.summary.isPositive 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {hourBankData.summary.balanceFormatted}
                </p>
              </div>
            </div>
          </div>

          {/* Detalhes Diários */}
          <HourBankCard 
            employeeId={selectedEmployee.id} 
            month={currentMonth}
            year={currentYear}
          />
        </div>
      )}
    </div>
  )
}
