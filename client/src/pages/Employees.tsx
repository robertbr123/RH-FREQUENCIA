import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import { Plus, Search, Edit, Trash2, UserCircle, FileText, Upload, Download, Users, UserCheck, UserX, Briefcase } from 'lucide-react'
import EmployeeModal from '../components/EmployeeModal'
import EmployeeCard from '../components/EmployeeCard'
import ConfirmDialog from '../components/ConfirmDialog'
import { toast } from '../utils/toast'

interface Employee {
  id: number
  name: string
  email: string
  cpf: string
  position: string
  department: string
  phone: string
  status: string
  hire_date: string
  position_name?: string
  department_name?: string
  sector_name?: string
  photo_url?: string
  sector?: string
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedPosition, setSelectedPosition] = useState('')
  const [selectedSector, setSelectedSector] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [departments, setDepartments] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [sectors, setSectors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showCard, setShowCard] = useState(false)
  const [cardEmployeeId, setCardEmployeeId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    employeeId: null as number | null,
    employeeName: '',
    employeeStatus: 'active'
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  useEffect(() => {
    loadEmployees()
    loadFilters()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    applyFilters()
    // resetar página ao aplicar filtros
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedDepartment, selectedPosition, selectedSector, selectedStatus, employees])

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setEmployees(response.data)
      setFilteredEmployees(response.data)
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFilters = async () => {
    try {
      const token = localStorage.getItem('token')
      const [deptsRes, posRes, sectRes] = await Promise.all([
        axios.get('/api/organization/departments', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/organization/positions', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/organization/sectors', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      setDepartments(deptsRes.data)
      setPositions(posRes.data)
      setSectors(sectRes.data)
    } catch (error) {
      console.error('Erro ao carregar filtros:', error)
    }
  }

  const applyFilters = () => {
    let filtered = employees.filter((emp: Employee) => {
      const st = debouncedSearchTerm.toLowerCase()
      const matchSearch = !st || emp.name.toLowerCase().includes(st) ||
        emp.email.toLowerCase().includes(st) ||
        emp.department?.toLowerCase().includes(st) ||
        emp.department_name?.toLowerCase().includes(st)
      
      const matchDepartment = !selectedDepartment || 
        emp.department === selectedDepartment || 
        emp.department_name === selectedDepartment
      
      const matchPosition = !selectedPosition || 
        emp.position === selectedPosition || 
        emp.position_name === selectedPosition
      
      const matchSector = !selectedSector || 
        emp.sector === selectedSector || 
        emp.sector_name === selectedSector
      
      const matchStatus = !selectedStatus || emp.status === selectedStatus

      return matchSearch && matchDepartment && matchPosition && matchSector && matchStatus
    })
    setFilteredEmployees(filtered)
  }

  const handleDelete = async (id: number) => {
    const employee = employees.find((emp: Employee) => emp.id === id)
    setConfirmDialog({
      isOpen: true,
      employeeId: id,
      employeeName: employee?.name || '',
      employeeStatus: employee?.status || 'active'
    })
  }

  const confirmDelete = async () => {
    if (!confirmDialog.employeeId) return

    setIsDeleting(true)
    try {
      // Buscar dados completos do funcionário
      const token = localStorage.getItem('token')
      const employeeResponse = await axios.get(`/api/employees/${confirmDialog.employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      const employee = employeeResponse.data
      
      // Se estiver inativo, ativar; se ativo, desativar
      const isActive = confirmDialog.employeeStatus === 'active'
      const newStatus = isActive ? 'inactive' : 'active'
      
      // Atualizar apenas o status mantendo todos os outros dados
      await axios.put(`/api/employees/${confirmDialog.employeeId}`, {
        ...employee,
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      setConfirmDialog({ isOpen: false, employeeId: null, employeeName: '', employeeStatus: 'active' })
      toast.success(isActive ? 'Funcionário desativado com sucesso' : 'Funcionário ativado com sucesso')
      loadEmployees()
    } catch (error) {
      console.error('Erro ao alterar status do funcionário:', error)
      toast.error('Erro ao alterar status do funcionário')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedEmployee(null)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedEmployee(null)
    loadEmployees()
  }

  const handleViewCard = (id: number) => {
    setCardEmployeeId(id)
    setShowCard(true)
  }

  // Parser CSV simples com suporte a aspas, vírgulas e CRLF
  const parseCSV = (text: string) => {
    const rows: string[][] = []
    let row: string[] = []
    let current = ''
    let insideQuotes = false
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const next = text[i + 1]
      if (char === '"') {
        if (insideQuotes && next === '"') { // escape ""
          current += '"'
          i++
        } else {
          insideQuotes = !insideQuotes
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(current)
        current = ''
      } else if ((char === '\n' || (char === '\r' && next === '\n')) && !insideQuotes) {
        row.push(current)
        rows.push(row)
        row = []
        current = ''
        if (char === '\r' && next === '\n') i++
      } else {
        current += char
      }
    }
    if (current.length > 0 || row.length > 0) {
      row.push(current)
      rows.push(row)
    }
    // Remover linhas vazias
    const cleaned = rows.filter(r => r.some(v => v.trim() !== ''))
    return cleaned
  }

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const matrix = parseCSV(text)
      if (matrix.length < 2) {
        toast.warning('O CSV precisa de cabeçalho e pelo menos 1 linha')
        return
      }

      const headers = matrix[0].map(h => h.trim())
      const token = localStorage.getItem('token')
      
      let imported = 0
      let errors = 0

      const loadingToast = toast.loading('Importando funcionários...') as HTMLDivElement
      for (let i = 1; i < matrix.length; i++) {
        try {
          const values = matrix[i].map(v => v.trim())
          const employee: any = {}
          
          headers.forEach((header, index) => {
            if (values[index]) {
              employee[header] = values[index]
            }
          })

          await axios.post('/api/employees', employee, {
            headers: { Authorization: `Bearer ${token}` }
          })
          imported++
        } catch (error) {
          console.error(`Erro na linha ${i + 1}:`, error)
          errors++
        }
      }
      toast.dismiss(loadingToast)
      if (imported > 0) toast.success(`${imported} funcionário(s) importado(s)`) 
      if (errors > 0) toast.warning(`${errors} linha(s) com erro na importação`)
      loadEmployees()
    } catch (error) {
      console.error('Erro ao processar CSV:', error)
      toast.error('Erro ao processar arquivo CSV')
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedDepartment('')
    setSelectedPosition('')
    setSelectedSector('')
    setSelectedStatus('')
    setCurrentPage(1)
  }

  const exportFilteredCSV = () => {
    if (!filteredEmployees.length) {
      toast.info('Nenhum registro para exportar')
      return
    }
    const headers = ['id','name','email','cpf','position','department','phone','status','hire_date']
    const escape = (v: any) => {
      const s = (v ?? '').toString()
      if (s.includes('"')) return `"${s.replace(/"/g, '""')}"`
      if (s.includes(',') || s.includes('\n') || s.includes('\r')) return `"${s}"`
      return s
    }
    const rows = filteredEmployees.map((e: Employee) => [
      e.id,
      e.name,
      e.email,
      e.cpf,
      e.position_name || e.position || '',
      e.department_name || e.department || '',
      e.phone || '',
      e.status,
      (e.hire_date || '').toString().split('T')[0]
    ])
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.map(escape).join(','))].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'funcionarios-filtrados.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredEmployees.slice(start, end)
  }, [filteredEmployees, currentPage, pageSize])

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize))

  const downloadExampleCSV = () => {
    const csvContent = `name,email,cpf,rg,birth_date,gender,marital_status,address,city,state,zip_code,phone,emergency_contact,emergency_phone,position_id,department_id,sector_id,schedule_id,unit_id,hire_date,salary,bank_name,bank_account,pis
João Silva,joao.silva@email.com,123.456.789-00,12.345.678-9,1990-05-15,M,solteiro,Rua das Flores 123,São Paulo,SP,01234-567,(11) 98765-4321,Maria Silva,(11) 91234-5678,1,1,1,1,1,2024-01-15,3500.00,Banco do Brasil,12345-6,123.45678.90-1
Maria Santos,maria.santos@email.com,987.654.321-00,98.765.432-1,1985-08-20,F,casado,Av. Paulista 1000,São Paulo,SP,01310-100,(11) 99876-5432,José Santos,(11) 92345-6789,2,2,2,1,1,2024-02-01,4200.00,Caixa Econômica,54321-0,987.65432.10-9
Pedro Oliveira,pedro.oliveira@email.com,456.789.123-00,45.678.912-3,1992-11-10,M,divorciado,Rua dos Pinheiros 456,Rio de Janeiro,RJ,22070-000,(21) 98765-1234,Ana Oliveira,(21) 91234-8765,3,1,1,2,2,2024-03-10,5000.00,Itaú,98765-4,456.78912.30-5
Ana Costa,ana.costa@email.com,789.123.456-00,78.912.345-6,1988-02-28,F,solteiro,Rua Augusta 789,São Paulo,SP,01305-000,(11) 97654-3210,Carlos Costa,(11) 93456-7890,1,3,3,1,1,2024-04-05,3800.00,Bradesco,11111-2,789.12345.60-2`
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', 'exemplo-importacao-funcionarios.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Skeleton loader melhorado */}
        <div className="flex items-center justify-between mb-8">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse"></div>
          <div className="flex gap-3">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="ml-3 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">Funcionários</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Gerencie sua equipe de forma eficiente</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          <button
            onClick={downloadExampleCSV}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            <Download className="w-5 h-5 mr-2" />
            Baixar Exemplo
          </button>
          <button
            onClick={exportFilteredCSV}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            <Download className="w-5 h-5 mr-2" />
            Exportar CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Importar CSV
              </>
            )}
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Funcionário
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">Total</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">{employees.length}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border-2 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">Ativos</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                {employees.filter(e => e.status === 'active').length}
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-400 font-medium mb-1">Inativos</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-300">
                {employees.filter(e => e.status === 'inactive').length}
              </p>
            </div>
            <div className="bg-gray-500 p-3 rounded-lg group-hover:scale-110 transition-transform">
              <UserX className="w-6 h-6 text-white" />
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
              <Briefcase className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search com gradiente */}
      <div className="mb-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-purple-500 transition-colors w-5 h-5 z-10" />
          <input
            type="text"
            placeholder="🔍 Buscar por nome, email ou departamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="relative w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-purple-300"
          />
        </div>
      </div>

      {/* Filters com gradiente */}
      <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6 mb-6 border border-gray-200 dark:border-gray-600">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos Departamentos</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>{dept.name}</option>
            ))}
          </select>

          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos Cargos</option>
            {positions.map((pos) => (
              <option key={pos.id} value={pos.name}>{pos.name}</option>
            ))}
          </select>

          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos Setores</option>
            {sectors.map((sec) => (
              <option key={sec.id} value={sec.name}>{sec.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos Status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={clearFilters}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
          <div>
            Exibindo {filteredEmployees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredEmployees.length)} de {filteredEmployees.length}
          </div>
          <div className="flex items-center gap-3">
            <label>Tamanho da página:</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1) }}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md disabled:opacity-50"
              >
                Anterior
              </button>
              <span>Pag. {currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Employees Grid com gradientes e animações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedEmployees.map((employee, index) => (
          <div 
            key={employee.id} 
            className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Barra de gradiente no topo */}
            <div className={`h-1.5 bg-gradient-to-r ${
              employee.status === 'active' 
                ? 'from-green-400 via-emerald-500 to-teal-500' 
                : 'from-gray-300 via-gray-400 to-gray-500'
            }`}></div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  {employee.photo_url ? (
                    <div className="relative">
                      <img
                        src={employee.photo_url}
                        alt={employee.name}
                        className="w-14 h-14 rounded-full object-cover border-3 border-white dark:border-gray-600 shadow-md group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700 ${
                        employee.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                  ) : (
                    <div className={`relative bg-gradient-to-br ${
                      employee.status === 'active'
                        ? 'from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30'
                        : 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600'
                    } p-3 rounded-full group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                      <UserCircle className={`w-8 h-8 ${
                        employee.status === 'active'
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`} />
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700 ${
                        employee.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                  )}
                  <div className="ml-3">
                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {employee.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{employee.position_name || employee.position || '-'}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${
                  employee.status === 'active' 
                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 dark:from-green-900/40 dark:to-emerald-900/40 dark:text-green-400' 
                    : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 dark:from-gray-700 dark:to-gray-600 dark:text-gray-400'
                }`}>
                  {employee.status === 'active' ? '✓ Ativo' : '○ Inativo'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300 min-w-[100px]">📧 Email:</span>
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300 min-w-[100px]">🏢 Depto:</span>
                  <span className="truncate">{employee.department_name || employee.department || '-'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300 min-w-[100px]">📱 Telefone:</span>
                  <span>{employee.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewCard(employee.id)}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                  title="Ver Ficha"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Ficha
                </button>
                <button
                  onClick={() => handleEdit(employee)}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-400 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(employee.id)}
                  className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg hover:shadow-md hover:scale-105 transition-all duration-200 font-medium ${
                    employee.status === 'active'
                      ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-400'
                      : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-400'
                  }`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {employee.status === 'active' ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <UserCircle className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhum funcionário encontrado</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tente ajustar os filtros de busca</p>
          <button
            onClick={clearFilters}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {modalOpen && (
        <EmployeeModal
          employee={selectedEmployee}
          onClose={handleModalClose}
          onSave={handleModalClose}
        />
      )}

      {showCard && cardEmployeeId && (
        <EmployeeCard
          employeeId={cardEmployeeId}
          onClose={() => setShowCard(false)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, employeeId: null, employeeName: '', employeeStatus: 'active' })}
        onConfirm={confirmDelete}
        title={confirmDialog.employeeStatus === 'active' ? 'Desativar Funcionário' : 'Ativar Funcionário'}
        message={
          confirmDialog.employeeStatus === 'active'
            ? `Tem certeza que deseja desativar o funcionário "${confirmDialog.employeeName}"? Esta ação pode ser revertida posteriormente.`
            : `Tem certeza que deseja ativar o funcionário "${confirmDialog.employeeName}"?`
        }
        confirmText={confirmDialog.employeeStatus === 'active' ? 'Sim, Desativar' : 'Sim, Ativar'}
        cancelText="Cancelar"
        type={confirmDialog.employeeStatus === 'active' ? 'warning' : 'info'}
        isLoading={isDeleting}
      />
    </div>
  )
}
