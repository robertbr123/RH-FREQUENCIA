import { useState, useEffect } from 'react'
import axios from 'axios'
import { Calendar, Download, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AttendanceModal from '../components/AttendanceModal'

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
}

export default function Attendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')

  useEffect(() => {
    loadDepartments()
  }, [])

  useEffect(() => {
    loadAttendance()
  }, [startDate, endDate])

  useEffect(() => {
    filterRecords()
  }, [records, selectedDepartment])

  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/departments', {
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
    } finally {
      setLoading(false)
    }
  }

  const filterRecords = () => {
    if (!selectedDepartment) {
      setFilteredRecords(records)
    } else {
      setFilteredRecords(records.filter(r => r.department_name === selectedDepartment))
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    loadAttendance()
  }

  const exportToCSV = () => {
    const headers = ['Funcionário', 'Cargo', 'Departamento', 'Entrada', 'Saída', 'Status']
    const rows = filteredRecords.map(r => [
      r.employee_name,
      r.position_name || '-',
      r.department_name || '-',
      format(new Date(r.check_in), 'dd/MM/yyyy HH:mm'),
      r.check_out ? format(new Date(r.check_out), 'dd/MM/yyyy HH:mm') : '-',
      r.check_out ? 'Completo' : 'Em andamento'
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frequencia_${startDate}_${endDate}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Registro de Frequência</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Calendar className="w-5 h-5 mr-2" />
          Registrar Ponto
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">De:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Até:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Departamento:</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
            >
              <option value="">Todos</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={exportToCSV}
            className="ml-auto flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Nenhum registro encontrado para o período selecionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Funcionário</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Cargo</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Departamento</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Entrada</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Saída</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:bg-gray-900">
                    <td className="py-4 px-6 text-sm text-gray-900 dark:text-white">{record.employee_name}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">{record.position_name || '-'}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">{record.department_name || '-'}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(record.check_in), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                      {record.check_out 
                        ? format(new Date(record.check_out), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : '-'
                      }
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.check_out 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.check_out ? 'Completo' : 'Em andamento'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && <AttendanceModal onClose={handleModalClose} />}
    </div>
  )
}
