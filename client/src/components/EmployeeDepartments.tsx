import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, Star, Building2, Clock, Calendar } from 'lucide-react'
import { toast } from '../utils/toast'

interface EmployeeDepartment {
  id: number
  employee_id: number
  department_id: number
  schedule_id: number | null
  is_primary: boolean
  start_date: string
  end_date: string | null
  notes: string | null
  department_name: string
  schedule_name: string | null
  start_time?: string
  end_time?: string
  break_start?: string
  break_end?: string
}

interface Department {
  id: number
  name: string
}

interface Schedule {
  id: number
  name: string
  start_time: string
  end_time: string
}

interface Props {
  employeeId: number
  employeeName: string
  departments: Department[]
  schedules: Schedule[]
  onUpdate?: () => void
}

export default function EmployeeDepartments({ 
  employeeId, 
  employeeName, 
  departments, 
  schedules,
  onUpdate 
}: Props) {
  const [employeeDepartments, setEmployeeDepartments] = useState<EmployeeDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newDept, setNewDept] = useState({
    department_id: '',
    schedule_id: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    loadEmployeeDepartments()
  }, [employeeId])

  const loadEmployeeDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/employees/${employeeId}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEmployeeDepartments(response.data)
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error)
      toast.error('Erro ao carregar departamentos do funcionário')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDepartment = async () => {
    if (!newDept.department_id) {
      toast.error('Selecione um departamento')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(`/api/employees/${employeeId}/departments`, {
        department_id: Number(newDept.department_id),
        schedule_id: newDept.schedule_id ? Number(newDept.schedule_id) : null,
        start_date: newDept.start_date,
        notes: newDept.notes || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success('Departamento adicionado com sucesso!')
      setShowAddForm(false)
      setNewDept({
        department_id: '',
        schedule_id: '',
        start_date: new Date().toISOString().split('T')[0],
        notes: ''
      })
      loadEmployeeDepartments()
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao adicionar departamento')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveDepartment = async (deptLinkId: number) => {
    if (!confirm('Tem certeza que deseja remover este departamento?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/employees/${employeeId}/departments/${deptLinkId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success('Departamento removido com sucesso!')
      loadEmployeeDepartments()
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao remover departamento')
    }
  }

  const handleSetPrimary = async (deptLinkId: number) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(`/api/employees/${employeeId}/departments/${deptLinkId}/set-primary`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success('Departamento definido como principal!')
      loadEmployeeDepartments()
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao definir departamento principal')
    }
  }

  const handleUpdateSchedule = async (deptLinkId: number, scheduleId: number | null) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(`/api/employees/${employeeId}/departments/${deptLinkId}`, {
        schedule_id: scheduleId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success('Horário atualizado!')
      loadEmployeeDepartments()
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar horário')
    }
  }

  // Filtrar departamentos que ainda não foram adicionados
  const availableDepartments = departments.filter(
    dept => !employeeDepartments.some(ed => ed.department_id === dept.id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary-600" />
          Departamentos de {employeeName}
        </h3>
        {availableDepartments.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        )}
      </div>

      {/* Formulário de adição */}
      {showAddForm && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento *
              </label>
              <select
                value={newDept.department_id}
                onChange={(e) => setNewDept({ ...newDept, department_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione...</option>
                {availableDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário de Trabalho
              </label>
              <select
                value={newDept.schedule_id}
                onChange={(e) => setNewDept({ ...newDept, schedule_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione...</option>
                {schedules.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name} ({sch.start_time} - {sch.end_time})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Início
              </label>
              <input
                type="date"
                value={newDept.start_date}
                onChange={(e) => setNewDept({ ...newDept, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <input
                type="text"
                value={newDept.notes}
                onChange={(e) => setNewDept({ ...newDept, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddDepartment}
              className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de departamentos */}
      {employeeDepartments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum departamento vinculado</p>
          <p className="text-sm">Clique em "Adicionar" para vincular departamentos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {employeeDepartments.map((ed) => (
            <div
              key={ed.id}
              className={`p-4 rounded-lg border ${
                ed.is_primary 
                  ? 'border-primary-300 bg-primary-50' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {ed.department_name}
                    </span>
                    {ed.is_primary && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                        <Star className="w-3 h-3" />
                        Principal
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <select
                        value={ed.schedule_id || ''}
                        onChange={(e) => handleUpdateSchedule(
                          ed.id, 
                          e.target.value ? Number(e.target.value) : null
                        )}
                        className="text-sm border-0 bg-transparent focus:ring-0 p-0 pr-6 cursor-pointer hover:text-primary-600"
                      >
                        <option value="">Sem horário definido</option>
                        {schedules.map((sch) => (
                          <option key={sch.id} value={sch.id}>
                            {sch.name} ({sch.start_time} - {sch.end_time})
                          </option>
                        ))}
                      </select>
                    </div>

                    {ed.start_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Desde {new Date(ed.start_date).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                  </div>

                  {ed.notes && (
                    <p className="mt-1 text-sm text-gray-500 italic">{ed.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {!ed.is_primary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(ed.id)}
                      className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded"
                      title="Definir como principal"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  {employeeDepartments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(ed.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      title="Remover departamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p className="font-medium mb-1">💡 Sobre múltiplos departamentos:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>O funcionário pode trabalhar em vários departamentos</li>
          <li>Cada departamento pode ter um horário de trabalho diferente</li>
          <li>O departamento <strong>Principal</strong> é usado em relatórios e como padrão</li>
          <li>Clique na estrela para definir outro departamento como principal</li>
        </ul>
      </div>
    </div>
  )
}
