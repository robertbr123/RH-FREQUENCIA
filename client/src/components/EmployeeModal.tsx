import { useState, useEffect, FormEvent } from 'react'
import axios from 'axios'
import { X } from 'lucide-react'
import { toast } from '../utils/toast'

interface Employee {
  id?: number
  name: string
  email: string
  cpf: string
  rg?: string
  birth_date?: string
  gender?: string
  marital_status?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  phone?: string
  emergency_contact?: string
  emergency_phone?: string
  position_id?: number
  department_id?: number
  sector_id?: number
  schedule_id?: number
  photo_url?: string
  status: string
  hire_date: string
  salary?: number
  bank_name?: string
  bank_account?: string
  pis?: string
}

interface Props {
  employee: Employee | null
  onClose: () => void
  onSave: () => void
}

export default function EmployeeModal({ employee, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<Employee>({
    name: '',
    email: '',
    cpf: '',
    rg: '',
    birth_date: '',
    gender: '',
    marital_status: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    emergency_contact: '',
    emergency_phone: '',
    position_id: undefined,
    department_id: undefined,
    sector_id: undefined,
    schedule_id: undefined,
    photo_url: '',
    status: 'active',
    hire_date: new Date().toISOString().split('T')[0],
    salary: undefined,
    bank_name: '',
    bank_account: '',
    pis: '',
  })
  const [loading, setLoading] = useState(false)
  const [positions, setPositions] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [sectors, setSectors] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'work' | 'financial'>('personal')

  // Funções de máscara
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '') // Remove tudo que não é dígito
      .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto após os 3 primeiros dígitos
      .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto após os 6 primeiros dígitos
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2') // Coloca hífen após os 9 primeiros dígitos
      .substring(0, 14) // Limita a 14 caracteres (xxx.xxx.xxx-xx)
  }

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '') // Remove tudo que não é dígito
      .replace(/(\d{2})(\d)/, '($1) $2') // Coloca parênteses em volta dos 2 primeiros dígitos
      .replace(/(\d{5})(\d)/, '$1-$2') // Coloca hífen após os 5 dígitos do número
      .substring(0, 15) // Limita a 15 caracteres ((xx) xxxxx-xxxx)
  }

  useEffect(() => {
    loadOptions()
    if (employee) {
      // Formatar datas para o formato YYYY-MM-DD
      const formattedEmployee = {
        ...employee,
        birth_date: employee.birth_date ? employee.birth_date.split('T')[0] : '',
        hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : new Date().toISOString().split('T')[0]
      }
      setFormData(formattedEmployee)
    }
  }, [employee])

  const loadOptions = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }

      const [posRes, depRes, secRes, schRes] = await Promise.all([
        axios.get('/api/organization/positions', config),
        axios.get('/api/organization/departments', config),
        axios.get('/api/organization/sectors', config),
        axios.get('/api/organization/schedules', config),
      ])

      setPositions(posRes.data)
      setDepartments(depRes.data)
      setSectors(secRes.data)
      setSchedules(schRes.data)
    } catch (error) {
      console.error('Erro ao carregar opções:', error)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }

      if (employee?.id) {
        await axios.put(`/api/employees/${employee.id}`, formData, config)
        toast.success('Funcionário atualizado com sucesso!')
      } else {
        await axios.post('/api/employees', formData, config)
        toast.success('Funcionário cadastrado com sucesso!')
      }

      onSave()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar funcionário')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'personal', label: 'Dados Pessoais' },
    { id: 'contact', label: 'Contato' },
    { id: 'work', label: 'Trabalho' },
    { id: 'financial', label: 'Financeiro' },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {employee ? 'Editar Funcionário' : 'Novo Funcionário'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Dados Pessoais */}
            {activeTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Foto do Funcionário (URL)
                    </label>
                    <input
                      type="url"
                      value={formData.photo_url || ''}
                      onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="https://exemplo.com/foto.jpg"
                    />
                    {formData.photo_url && (
                      <div className="mt-2">
                        <img
                          src={formData.photo_url}
                          alt="Preview"
                          className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
                    <input
                      type="text"
                      value={formData.rg || ''}
                      onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={formData.birth_date || ''}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
                    <select
                      value={formData.gender || ''}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado Civil
                    </label>
                    <select
                      value={formData.marital_status || ''}
                      onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PIS</label>
                    <input
                      type="text"
                      value={formData.pis || ''}
                      onChange={(e) => setFormData({ ...formData, pis: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Contato */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Rua, número, complemento"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <input
                      type="text"
                      value={formData.state || ''}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      maxLength={2}
                      placeholder="UF"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                    <input
                      type="text"
                      value={formData.zip_code || ''}
                      onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="00000-000"
                    />
                  </div>

                  <div className="col-span-2 border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-4">Contato de Emergência</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      value={formData.emergency_contact || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, emergency_contact: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={formData.emergency_phone || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, emergency_phone: maskPhone(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Trabalho */}
            {activeTab === 'work' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                    <select
                      value={formData.position_id || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, position_id: Number(e.target.value) || undefined })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Selecione...</option>
                      {positions.map((pos) => (
                        <option key={pos.id} value={pos.id}>
                          {pos.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departamento
                    </label>
                    <select
                      value={formData.department_id || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, department_id: Number(e.target.value) || undefined })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Selecione...</option>
                      {departments.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                          {dep.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Setor</label>
                    <select
                      value={formData.sector_id || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, sector_id: Number(e.target.value) || undefined })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Selecione...</option>
                      {sectors.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horário de Trabalho
                    </label>
                    <select
                      value={formData.schedule_id || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, schedule_id: Number(e.target.value) || undefined })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Selecione...</option>
                      {schedules.map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Admissão *
                    </label>
                    <input
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Financeiro */}
            {activeTab === 'financial' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salário</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.salary || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, salary: Number(e.target.value) || undefined })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                    <input
                      type="text"
                      value={formData.bank_name || ''}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conta Bancária
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account || ''}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Agência e Conta"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
