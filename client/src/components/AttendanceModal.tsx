import { useState, useEffect, FormEvent } from 'react'
import axios from 'axios'
import { X } from 'lucide-react'

interface Employee {
  id: number
  name: string
  position: string
}

interface Props {
  onClose: () => void
}

export default function AttendanceModal({ onClose }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [action, setAction] = useState<'check-in' | 'check-out'>('check-in')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      const response = await axios.get('/api/employees', { params: { status: 'active' } })
      setEmployees(response.data)
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) return

    setLoading(true)
    try {
      await axios.post(`/api/attendance/${action}`, {
        employee_id: parseInt(selectedEmployee),
        notes
      })
      onClose()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao registrar ponto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Registrar Ponto</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Funcionário *</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Selecione um funcionário</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {emp.position}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ação *</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="check-in"
                  checked={action === 'check-in'}
                  onChange={(e) => setAction(e.target.value as 'check-in')}
                  className="mr-2"
                />
                Entrada
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="check-out"
                  checked={action === 'check-out'}
                  onChange={(e) => setAction(e.target.value as 'check-out')}
                  className="mr-2"
                />
                Saída
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Adicione observações (opcional)"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
