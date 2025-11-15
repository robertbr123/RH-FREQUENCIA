import { useState, useEffect } from 'react'
import axios from 'axios'
import { Building2, Briefcase, Users, Clock, Plus, Edit, Trash2, Calendar, Umbrella, Layers, MapPin, Award, List, LayoutGrid } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from '../utils/toast'
import ConfirmDialog from '../components/ConfirmDialog'

interface Position {
  id: number
  name: string
  description: string
}

interface Department {
  id: number
  name: string
  description: string
}

interface Sector {
  id: number
  name: string
  description: string
  department_id: number
  department_name?: string
}

interface Schedule {
  id: number
  name: string
  start_time: string
  end_time: string
  break_start: string
  break_end: string
  workdays: string[]
}

interface Holiday {
  id: number
  name: string
  date: string
  type: 'municipal' | 'estadual' | 'federal' | 'facultativo'
  description?: string
  recurring: boolean
}

interface Vacation {
  id: number
  employee_id: number
  employee_name: string
  position_name?: string
  photo_url?: string
  year: number
  month: number
  start_date: string
  end_date: string
  days: number
  notes?: string
}

type TabType = 'positions' | 'departments' | 'sectors' | 'schedules' | 'holidays' | 'vacations'

interface Employee {
  id: number
  name: string
  position_name?: string
}

export default function Organization() {
  const [activeTab, setActiveTab] = useState<TabType>('positions')
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list')

  useEffect(() => {
    loadData()
  }, [activeTab, selectedYear])

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }

      switch (activeTab) {
        case 'positions':
          const posRes = await axios.get('/api/organization/positions', config)
          setPositions(posRes.data)
          break
        case 'departments':
          const depRes = await axios.get('/api/organization/departments', config)
          setDepartments(depRes.data)
          break
        case 'sectors':
          const secRes = await axios.get('/api/organization/sectors', config)
          setSectors(secRes.data)
          break
        case 'schedules':
          const schRes = await axios.get('/api/organization/schedules', config)
          setSchedules(schRes.data)
          break
        case 'holidays':
          const holRes = await axios.get('/api/organization/holidays', config)
          setHolidays(holRes.data)
          break
        case 'vacations':
          const vacRes = await axios.get('/api/organization/vacations', {
            ...config,
            params: { year: selectedYear }
          })
          setVacations(vacRes.data)
          break
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }
      const res = await axios.get('/api/employees', config)
      setEmployees(res.data.filter((emp: any) => emp.status === 'active'))
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    }
  }

  const handleSave = async (data: any) => {
    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }
      const endpoint = `/api/organization/${activeTab}`

      console.log('handleSave - editingItem:', editingItem)
      console.log('handleSave - editingItem.id:', editingItem?.id)
      console.log('handleSave - data:', data)

      if (editingItem && editingItem.id) {
        console.log('Fazendo PUT para:', `${endpoint}/${editingItem.id}`)
        await axios.put(`${endpoint}/${editingItem.id}`, data, config)
      } else {
        console.log('Fazendo POST para:', endpoint)
        await axios.post(endpoint, data, config)
      }

      setShowModal(false)
      setEditingItem(null)
      loadData()
    } catch (error: any) {
      console.error('Erro no handleSave:', error)
      alert(error.response?.data?.error || 'Erro ao salvar')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar?')) return

    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }
      await axios.delete(`/api/organization/${activeTab}/${id}`, config)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao deletar')
    }
  }

  const tabs = [
    { id: 'positions', label: 'Cargos', icon: Briefcase },
    { id: 'departments', label: 'Departamentos', icon: Building2 },
    { id: 'sectors', label: 'Setores', icon: Users },
    { id: 'schedules', label: 'Horários', icon: Clock },
    { id: 'holidays', label: 'Feriados', icon: Calendar },
    { id: 'vacations', label: 'Férias', icon: Umbrella },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
            Organização
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Gerencie a estrutura organizacional da empresa</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold"
        >
          <Plus className="w-5 h-5" />
          Adicionar
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">Cargos</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">{positions.length}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 dark:text-purple-400 font-medium mb-1">Departamentos</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">{departments.length}</p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border-2 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mb-1">Setores</p>
              <p className="text-3xl font-bold text-amber-900 dark:text-amber-300">{sectors.length}</p>
            </div>
            <div className="bg-amber-500 p-3 rounded-lg group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl p-4 border-2 border-teal-200 dark:border-teal-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-teal-700 dark:text-teal-400 font-medium mb-1">Horários</p>
              <p className="text-3xl font-bold text-teal-900 dark:text-teal-300">{schedules.length}</p>
            </div>
            <div className="bg-teal-500 p-3 rounded-lg group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs com gradiente */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md mb-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <nav className="flex overflow-x-auto p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`group flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-300 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${
                  isActive ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'
                }`} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Carregando...</p>
          </div>
        ) : activeTab === 'vacations' ? (
          <div className="p-6">
            {/* Year selector */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Férias {selectedYear}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedYear(selectedYear - 1)}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  ‹ {selectedYear - 1}
                </button>
                <button
                  onClick={() => setSelectedYear(new Date().getFullYear())}
                  className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded hover:bg-primary-200 dark:hover:bg-primary-800"
                >
                  Hoje
                </button>
                <button
                  onClick={() => setSelectedYear(selectedYear + 1)}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {selectedYear + 1} ›
                </button>
              </div>
            </div>

            {/* 12-month grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[
                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
              ].map((monthName, index) => {
                const monthNumber = index + 1
                const monthVacations = vacations.filter(v => v.month === monthNumber)
                const currentMonth = new Date().getMonth() + 1
                const currentYear = new Date().getFullYear()
                
                const isCurrentMonth = monthNumber === currentMonth && selectedYear === currentYear
                const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && monthNumber < currentMonth)
                
                return (
                  <div
                    key={monthNumber}
                    className={`border rounded-lg p-4 ${
                      isCurrentMonth
                        ? 'border-blue-500 bg-blue-50'
                        : isPastMonth
                        ? 'border-gray-300 bg-gray-50'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-semibold ${
                        isCurrentMonth ? 'text-blue-700' : 'text-gray-900'
                      }`}>
                        {monthName}
                      </h3>
                      <button
                        onClick={() => {
                          setEditingItem({ month: monthNumber, year: selectedYear })
                          setShowModal(true)
                        }}
                        className="text-primary-600 hover:text-primary-800"
                        title="Adicionar férias"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {monthVacations.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Nenhuma férias</p>
                    ) : (
                      <div className="space-y-2">
                        {monthVacations.map((vacation) => (
                          <div
                            key={vacation.id}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-sm"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {vacation.photo_url ? (
                                <img
                                  src={vacation.photo_url}
                                  alt={vacation.employee_name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-semibold">
                                  {vacation.employee_name.charAt(0)}
                                </div>
                              )}
                              <span className="font-medium text-gray-900 dark:text-white truncate flex-1">
                                {vacation.employee_name}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 ml-8">
                              {vacation.position_name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 ml-8 mt-1">
                              {new Date(vacation.start_date).toLocaleDateString('pt-BR')} - {new Date(vacation.end_date).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-xs text-primary-600 font-semibold ml-8">
                              {vacation.days} {vacation.days === 1 ? 'dia' : 'dias'}
                            </div>
                            {vacation.notes && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 ml-8 mt-1 italic">
                                {vacation.notes}
                              </div>
                            )}
                            <div className="flex gap-2 mt-2 ml-8">
                              <button
                                onClick={() => {
                                  setEditingItem(vacation)
                                  setShowModal(true)
                                }}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(vacation.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Toggle entre Cards e Lista */}
            <div className="flex items-center justify-end mb-6 gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Visualização:</span>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'cards'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>

            {viewMode === 'cards' ? (
            /* Grid de Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTab === 'positions' && positions.map((item, index) => (
                <div 
                  key={item.id} 
                  className="group bg-gradient-to-br from-white to-blue-50 dark:from-gray-700 dark:to-blue-900/20 rounded-xl p-5 border-2 border-blue-200 dark:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                        <Briefcase className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 min-h-[40px]">{item.description}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(item)
                        setShowModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}

              {activeTab === 'departments' && departments.map((item, index) => (
                <div 
                  key={item.id} 
                  className="group bg-gradient-to-br from-white to-purple-50 dark:from-gray-700 dark:to-purple-900/20 rounded-xl p-5 border-2 border-purple-200 dark:border-purple-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {item.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 min-h-[40px]">{item.description}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(item)
                        setShowModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}

              {activeTab === 'sectors' && sectors.map((item, index) => (
                <div 
                  key={item.id} 
                  className="group bg-gradient-to-br from-white to-amber-50 dark:from-gray-700 dark:to-amber-900/20 rounded-xl p-5 border-2 border-amber-200 dark:border-amber-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                        <Layers className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">{item.department_name}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 min-h-[40px]">{item.description}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(item)
                        setShowModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-700 dark:text-amber-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}

              {activeTab === 'schedules' && schedules.map((item, index) => (
                <div 
                  key={item.id} 
                  className="group bg-gradient-to-br from-white to-teal-50 dark:from-gray-700 dark:to-teal-900/20 rounded-xl p-5 border-2 border-teal-200 dark:border-teal-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                          {item.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">⏰ Horário:</span>
                      <span>{item.start_time} - {item.end_time}</span>
                    </div>
                    {item.break_start && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">☕ Intervalo:</span>
                        <span>{item.break_start} - {item.break_end}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(item)
                        setShowModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 text-teal-700 dark:text-teal-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}

              {activeTab === 'holidays' && holidays.map((item, index) => (
                <div 
                  key={item.id} 
                  className="group bg-gradient-to-br from-white to-rose-50 dark:from-gray-700 dark:to-rose-900/20 rounded-xl p-5 border-2 border-rose-200 dark:border-rose-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-xs text-rose-600 dark:text-rose-500 font-medium">
                          {format(new Date(item.date.split('T')[0] + 'T12:00:00'), 'dd/MM/yyyy')}
                          {item.recurring && ' (Anual)'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${ 
                      item.type === 'federal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      item.type === 'estadual' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      item.type === 'municipal' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(item)
                        setShowModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 text-rose-700 dark:text-rose-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
            ) : (
            /* Visualização em Lista/Tabela */
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                  <tr>
                    {activeTab === 'positions' && (
                      <>
                        <th className="px-6 py-4 text-left font-semibold">Cargo</th>
                        <th className="px-6 py-4 text-left font-semibold">Descrição</th>
                        <th className="px-6 py-4 text-center font-semibold">Ações</th>
                      </>
                    )}
                    {activeTab === 'departments' && (
                      <>
                        <th className="px-6 py-4 text-left font-semibold">Departamento</th>
                        <th className="px-6 py-4 text-left font-semibold">Descrição</th>
                        <th className="px-6 py-4 text-center font-semibold">Ações</th>
                      </>
                    )}
                    {activeTab === 'sectors' && (
                      <>
                        <th className="px-6 py-4 text-left font-semibold">Setor</th>
                        <th className="px-6 py-4 text-left font-semibold">Departamento</th>
                        <th className="px-6 py-4 text-left font-semibold">Descrição</th>
                        <th className="px-6 py-4 text-center font-semibold">Ações</th>
                      </>
                    )}
                    {activeTab === 'schedules' && (
                      <>
                        <th className="px-6 py-4 text-left font-semibold">Horário</th>
                        <th className="px-6 py-4 text-left font-semibold">Entrada/Saída</th>
                        <th className="px-6 py-4 text-left font-semibold">Intervalo</th>
                        <th className="px-6 py-4 text-center font-semibold">Ações</th>
                      </>
                    )}
                    {activeTab === 'holidays' && (
                      <>
                        <th className="px-6 py-4 text-left font-semibold">Feriado</th>
                        <th className="px-6 py-4 text-left font-semibold">Data</th>
                        <th className="px-6 py-4 text-left font-semibold">Tipo</th>
                        <th className="px-6 py-4 text-center font-semibold">Ações</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activeTab === 'positions' && positions.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.description}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item)
                              setShowModal(true)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'departments' && departments.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.description}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item)
                              setShowModal(true)
                            }}
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'sectors' && sectors.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-6 py-4 text-amber-600 dark:text-amber-400 font-medium">{item.department_name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.description}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item)
                              setShowModal(true)
                            }}
                            className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'schedules' && schedules.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.start_time} - {item.end_time}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.break_start ? `${item.break_start} - ${item.break_end}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item)
                              setShowModal(true)
                            }}
                            className="p-2 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'holidays' && holidays.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {format(new Date(item.date.split('T')[0] + 'T12:00:00'), 'dd/MM/yyyy')}
                        {item.recurring && <span className="ml-2 text-rose-600 dark:text-rose-400">(Anual)</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${ 
                          item.type === 'federal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          item.type === 'estadual' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          item.type === 'municipal' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item)
                              setShowModal(true)
                            }}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* Empty state */}
            {((activeTab === 'positions' && positions.length === 0) ||
              (activeTab === 'departments' && departments.length === 0) ||
              (activeTab === 'sectors' && sectors.length === 0) ||
              (activeTab === 'schedules' && schedules.length === 0) ||
              (activeTab === 'holidays' && holidays.length === 0)) && (
              <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="flex justify-center mb-4">
                  {activeTab === 'positions' && <Briefcase className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
                  {activeTab === 'departments' && <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
                  {activeTab === 'sectors' && <Layers className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
                  {activeTab === 'schedules' && <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
                  {activeTab === 'holidays' && <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
                </div>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nenhum registro encontrado
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Clique em "Adicionar" para criar o primeiro registro
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && activeTab === 'vacations' ? (
        <VacationModal
          item={editingItem}
          employees={employees}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false)
            setEditingItem(null)
          }}
        />
      ) : showModal ? (
        <OrganizationModal
          type={activeTab}
          item={editingItem}
          departments={departments}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false)
            setEditingItem(null)
          }}
        />
      ) : null}
    </div>
  )
}

// Modal Component
function OrganizationModal({
  type,
  item,
  departments,
  onSave,
  onClose,
}: {
  type: TabType
  item: any
  departments: Department[]
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState(
    item || {
      name: '',
      description: '',
      department_id: '',
      start_time: '08:00',
      end_time: '17:00',
      break_start: '12:00',
      break_end: '13:00',
      workdays: ['1', '2', '3', '4', '5'],
      date: new Date().toISOString().split('T')[0],
      type: 'municipal',
      recurring: false,
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const weekdays = [
    { value: '0', label: 'Dom' },
    { value: '1', label: 'Seg' },
    { value: '2', label: 'Ter' },
    { value: '3', label: 'Qua' },
    { value: '4', label: 'Qui' },
    { value: '5', label: 'Sex' },
    { value: '6', label: 'Sáb' },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          {item ? 'Editar' : 'Adicionar'}{' '}
          {type === 'positions'
            ? 'Cargo'
            : type === 'departments'
            ? 'Departamento'
            : type === 'sectors'
            ? 'Setor'
            : type === 'holidays'
            ? 'Feriado'
            : 'Horário'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {type !== 'schedules' && type !== 'holidays' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>
          )}

          {type === 'sectors' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Departamento *
              </label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Selecione...</option>
                {departments.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'schedules' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Entrada *
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Saída *</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Início Intervalo
                  </label>
                  <input
                    type="time"
                    value={formData.break_start}
                    onChange={(e) => setFormData({ ...formData, break_start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fim Intervalo
                  </label>
                  <input
                    type="time"
                    value={formData.break_end}
                    onChange={(e) => setFormData({ ...formData, break_end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dias de Trabalho
                </label>
                <div className="flex gap-2">
                  {weekdays.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        const days = formData.workdays || []
                        if (days.includes(day.value)) {
                          setFormData({
                            ...formData,
                            workdays: days.filter((d: string) => d !== day.value),
                          })
                        } else {
                          setFormData({ ...formData, workdays: [...days, day.value] })
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        (formData.workdays || []).includes(day.value)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'holidays' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="municipal">Municipal</option>
                  <option value="estadual">Estadual</option>
                  <option value="federal">Federal</option>
                  <option value="facultativo">Ponto Facultativo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  rows={2}
                  placeholder="Observações adicionais (opcional)"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.recurring}
                  onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <label htmlFor="recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Feriado Anual (Repete todo ano)
                </label>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Vacation Modal Component
function VacationModal({
  item,
  employees,
  onSave,
  onClose,
}: {
  item: any
  employees: { id: number; name: string; position_name?: string }[]
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState(
    item || {
      employee_id: '',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      start_date: '',
      end_date: '',
      notes: '',
    }
  )

  // Debug do item recebido
  useEffect(() => {
    console.log('VacationModal - item recebido:', item)
    if (item) {
      console.log('VacationModal - item.id:', item.id)
      setFormData({
        id: item.id, // Garantir que o ID seja preservado
        employee_id: item.employee_id || '',
        year: item.year || new Date().getFullYear(),
        month: item.month || new Date().getMonth() + 1,
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        days: item.days || 0,
        notes: item.notes || '',
      })
    }
  }, [item])

  // Auto-calculate days when dates change
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      setFormData((prev: any) => ({ ...prev, days }))
    }
  }, [formData.start_date, formData.end_date])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.employee_id || formData.employee_id === '') {
      alert('Selecione um funcionário')
      return
    }
    if (!formData.year || isNaN(formData.year)) {
      alert('Ano inválido')
      return
    }
    if (!formData.month || isNaN(formData.month)) {
      alert('Mês inválido')
      return
    }
    if (!formData.start_date || !formData.end_date) {
      alert('Preencha as datas de início e fim')
      return
    }
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      alert('Data de fim deve ser maior ou igual à data de início')
      return
    }

    // Garantir que employee_id é um número válido e preservar ID se existir
    const dataToSend = {
      ...formData,
      employee_id: parseInt(formData.employee_id),
      year: parseInt(formData.year),
      month: parseInt(formData.month)
    }

    // Se tem ID, é uma edição
    if (item?.id) {
      dataToSend.id = item.id
    }

    console.log('VacationModal - dataToSend:', dataToSend)
    onSave(dataToSend)
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          {item?.id ? 'Editar' : 'Adicionar'} Férias
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Funcionário *
            </label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value ? parseInt(e.target.value) : '' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={!!item?.id}
            >
              <option value="">Selecione...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.position_name ? `- ${emp.position_name}` : ''}
                </option>
              ))}
            </select>
            {item?.id && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Funcionário não pode ser alterado após criação
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ano *
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : new Date().getFullYear() })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                min={2020}
                max={2100}
                required
                disabled={!!item?.id}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mês *
              </label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value ? parseInt(e.target.value) : new Date().getMonth() + 1 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
                disabled={!!item?.id}
              >
                {monthNames.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {item?.id && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ano e mês não podem ser alterados após criação
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Início *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Fim *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          {formData.start_date && formData.end_date && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
              <p className="text-sm text-primary-900">
                <span className="font-semibold">Duração:</span>{' '}
                {formData.days || 0} {formData.days === 1 ? 'dia' : 'dias'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observações
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Observações adicionais (opcional)"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
