import { useState, useEffect } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, Edit2, Save, X, UserCheck } from 'lucide-react'

interface Employee {
  id: number
  name: string
  position_name?: string
  department_name?: string
}

interface Punch {
  id: number
  punch_type: 'entry' | 'break_start' | 'break_end' | 'exit'
  punch_time: string
  is_late?: boolean
  is_early?: boolean
}

interface PunchEdit {
  punch_type: string
  time: string
}

export default function AttendanceAdmin() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [punches, setPunches] = useState<Punch[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<PunchEdit>({ punch_type: '', time: '' })

  const punchTypeLabels: Record<string, string> = {
    entry: 'Entrada',
    break_start: 'Início do Intervalo',
    break_end: 'Fim do Intervalo',
    exit: 'Saída'
  }

  const punchTypeColors: Record<string, string> = {
    entry: 'green',
    break_start: 'yellow',
    break_end: 'blue',
    exit: 'red'
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    if (selectedEmployee && selectedDate) {
      loadPunches()
    }
  }, [selectedEmployee, selectedDate])

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setEmployees(response.data.filter((e: any) => e.status === 'active'))
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    }
  }

  const loadPunches = async () => {
    if (!selectedEmployee) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/attendance/punches', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          employee_id: selectedEmployee,
          date: selectedDate
        }
      })
      setPunches(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar pontos:', error)
      setPunches([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (punch: Punch) => {
    setEditing(punch.id)
    
    // A API agora retorna punch_time como string "HH:MM:SS" já na timezone correta
    const punchTimeStr = punch.punch_time.toString()
    let timeStr = ''
    
    if (punchTimeStr.includes(':')) {
      // Formato HH:MM:SS
      timeStr = punchTimeStr.substring(0, 5) // Pega HH:MM
    } else {
      // Fallback para formato antigo
      timeStr = '00:00'
    }
    
    console.log('Editando ponto:', {
      original: punch.punch_time,
      extracted: timeStr,
      type: punch.punch_type
    })
    
    setEditValues({
      punch_type: punch.punch_type,
      time: timeStr
    })
  }

  const handleSave = async (punchId: number) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(`/api/attendance/punches/${punchId}`, {
        punch_type: editValues.punch_type,
        time: editValues.time
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setEditing(null)
      loadPunches()
      alert('Ponto atualizado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao atualizar ponto:', error)
      alert(error.response?.data?.error || 'Erro ao atualizar ponto')
    }
  }

  const handleDelete = async (punchId: number) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/attendance/punches/${punchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      loadPunches()
      alert('Ponto excluído com sucesso!')
    } catch (error: any) {
      console.error('Erro ao excluir ponto:', error)
      alert(error.response?.data?.error || 'Erro ao excluir ponto')
    }
  }

  const handleCancel = () => {
    setEditing(null)
    setEditValues({ punch_type: '', time: '' })
  }

  const employee = employees.find(e => e.id === selectedEmployee)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg">
            <UserCheck className="w-8 h-8 text-white" />
          </div>
          Admin - Gerenciar Pontos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Visualize e corrija registros de ponto dos funcionários
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Funcionário
            </label>
            <select
              value={selectedEmployee || ''}
              onChange={(e) => setSelectedEmployee(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
            >
              <option value="">Selecione um funcionário</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {emp.position_name || 'Sem cargo'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Data
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Informações do Funcionário */}
      {employee && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Funcionário Selecionado</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Nome:</span>
              <span className="ml-2 font-medium text-blue-900">{employee.name}</span>
            </div>
            <div>
              <span className="text-blue-700">Cargo:</span>
              <span className="ml-2 font-medium text-blue-900">{employee.position_name || '-'}</span>
            </div>
            <div>
              <span className="text-blue-700">Departamento:</span>
              <span className="ml-2 font-medium text-blue-900">{employee.department_name || '-'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Pontos */}
      {selectedEmployee && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Registros do Dia {selectedDate.split('-').reverse().join('/')}
            </h2>
            {loading && <span className="text-gray-500 dark:text-gray-400">Carregando...</span>}
          </div>

          {punches.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Nenhum registro encontrado para esta data</p>
            </div>
          )}

          {punches.length > 0 && (
            <div className="space-y-4">
              {punches.map((punch) => (
                <div
                  key={punch.id}
                  className={`border-2 border-${punchTypeColors[punch.punch_type]}-200 bg-${punchTypeColors[punch.punch_type]}-50 rounded-lg p-4`}
                >
                  {editing === punch.id ? (
                    // Modo Edição
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Tipo de Ponto</label>
                          <select
                            value={editValues.punch_type}
                            onChange={(e) => setEditValues({ ...editValues, punch_type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                          >
                            <option value="entry">Entrada</option>
                            <option value="break_start">Início do Intervalo</option>
                            <option value="break_end">Fim do Intervalo</option>
                            <option value="exit">Saída</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Horário</label>
                          <input
                            type="time"
                            value={editValues.time}
                            onChange={(e) => setEditValues({ ...editValues, time: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(punch.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Save className="w-4 h-4" />
                          Salvar
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          <X className="w-4 h-4" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo Visualização
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Clock className={`w-5 h-5 text-${punchTypeColors[punch.punch_type]}-600`} />
                          <span className={`font-bold text-lg text-${punchTypeColors[punch.punch_type]}-900`}>
                            {punchTypeLabels[punch.punch_type]}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {punch.punch_time}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {(() => {
                            const [year, month, day] = selectedDate.split('-').map(Number)
                            const dateObj = new Date(year, month - 1, day)
                            return format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          })()}
                        </div>
                        {punch.is_late && (
                          <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                            ATRASADO
                          </span>
                        )}
                        {punch.is_early && (
                          <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            ADIANTADO
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(punch)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(punch.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instruções */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Atenção</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
          <li>Edições e exclusões são permanentes e afetam os relatórios</li>
          <li>Sempre verifique o tipo de ponto antes de salvar</li>
          <li>Horários fora da tolerância serão marcados como atrasado/adiantado</li>
        </ul>
      </div>
    </div>
  )
}
