import { useState, useEffect, FormEvent } from 'react'
import axios from 'axios'
import { X, Calendar, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface AbsenceModalProps {
  onClose: () => void
  onSave: () => void
  employeeId?: number
}

interface Employee {
  id: number
  name: string
  position_name?: string
}

export default function AbsenceModal({ onClose, onSave, employeeId }: AbsenceModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [formData, setFormData] = useState({
    employee_id: employeeId || '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    absence_type: 'folga',
    observation: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!employeeId) {
      loadEmployees()
    }
  }, [employeeId])

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEmployees(response.data.filter((e: any) => e.status === 'active'))
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/absences', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      onSave()
      onClose()
    } catch (error: any) {
      console.error('Erro ao salvar ausência:', error)
      setError(error.response?.data?.error || 'Erro ao salvar ausência')
    } finally {
      setLoading(false)
    }
  }

  const absenceTypes = [
    { value: 'folga', label: 'Folga' },
    { value: 'atestado', label: 'Atestado Médico' },
    { value: 'licenca', label: 'Licença' },
    { value: 'falta_justificada', label: 'Falta Justificada' },
    { value: 'outros', label: 'Outros' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Registrar Ausência</h2>
                <p className="text-blue-100 text-sm mt-1">Folga, atestado ou outra ausência</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {!employeeId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Funcionário *
              </label>
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Selecione um funcionário</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.position_name ? `- ${emp.position_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Data Inicial *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Data Final *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Ausência *
            </label>
            <select
              value={formData.absence_type}
              onChange={(e) => setFormData({ ...formData, absence_type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              {absenceTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Observação / Justificativa
              </div>
            </label>
            <textarea
              value={formData.observation}
              onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
              rows={4}
              placeholder="Adicione detalhes sobre a ausência (opcional)..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Dica:</strong> Esta ausência será exibida no relatório de ponto do funcionário no período selecionado.
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-all"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Ausência'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
