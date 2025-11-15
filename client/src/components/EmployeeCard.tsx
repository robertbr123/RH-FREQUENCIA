import { useEffect, useState } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Printer, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface EmployeeCardProps {
  employeeId: number
  onClose: () => void
}

export default function EmployeeCard({ employeeId, onClose }: EmployeeCardProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [employeeId])

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/employee-card/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setData(response.data)
    } catch (error) {
      console.error('Erro ao carregar ficha:', error)
      alert('Erro ao carregar dados do funcionário')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { employee, stats } = data

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Não imprime */}
        <div className="flex items-center justify-between p-4 border-b print:hidden flex-shrink-0">
          <h2 className="text-xl font-bold">Ficha do Funcionário</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo para impressão - com scroll */}
        <div className="p-6 print:p-0 overflow-y-auto flex-1">
          {/* Cabeçalho da empresa */}
          <div className="text-center mb-6 print:mb-4">
            <h1 className="text-xl font-bold text-gray-900 print:text-xl">
              Sistema RH - Registro de Frequência
            </h1>
            <p className="text-gray-600 text-sm mt-1">Ficha Cadastral do Funcionário</p>
          </div>

          {/* Foto, Dados Principais e QR Code */}
          <div className="flex gap-4 mb-5 print:mb-4">
            <div className="flex-shrink-0">
              {employee.photo_url ? (
                <img
                  src={employee.photo_url}
                  alt={employee.name}
                  className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                  <span className="text-3xl text-gray-400">
                    {employee.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2 print:text-xl">
                {employee.name}
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Cargo:</span>
                  <span className="ml-2">{employee.position_name || '-'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Matrícula:</span>
                  <span className="ml-2">#{employee.id.toString().padStart(6, '0')}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Departamento:</span>
                  <span className="ml-2">{employee.department_name || '-'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Setor:</span>
                  <span className="ml-2">{employee.sector_name || '-'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Status:</span>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                      employee.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Data de Admissão:</span>
                  <span className="ml-2">
                    {format(new Date(employee.hire_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <div className="p-3 bg-white border-2 border-gray-300 rounded-lg">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: employee.id,
                    cpf: employee.cpf,
                    name: employee.name,
                    type: 'employee_card'
                  })}
                  size={120}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-gray-600 text-center">
                ID: {employee.id.toString().padStart(6, '0')}
              </p>
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="mb-5 print:mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-2 pb-1.5 border-b print:text-base">
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">CPF:</span>
                <span className="ml-2">{employee.cpf}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">RG:</span>
                <span className="ml-2">{employee.rg || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Data de Nascimento:</span>
                <span className="ml-2">
                  {employee.birth_date
                    ? format(new Date(employee.birth_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Gênero:</span>
                <span className="ml-2">{employee.gender || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Estado Civil:</span>
                <span className="ml-2">{employee.marital_status || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">PIS:</span>
                <span className="ml-2">{employee.pis || '-'}</span>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="mb-5 print:mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-2 pb-1.5 border-b print:text-base">
              Contato
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">Email:</span>
                <span className="ml-2">{employee.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Telefone:</span>
                <span className="ml-2">{employee.phone || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-gray-600">Endereço:</span>
                <span className="ml-2">{employee.address || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Cidade:</span>
                <span className="ml-2">{employee.city || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Estado:</span>
                <span className="ml-2">{employee.state || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">CEP:</span>
                <span className="ml-2">{employee.zip_code || '-'}</span>
              </div>
            </div>
          </div>

          {/* Contato de Emergência */}
          {(employee.emergency_contact || employee.emergency_phone) && (
            <div className="mb-5 print:mb-4">
              <h3 className="text-base font-bold text-gray-900 mb-2 pb-1.5 border-b print:text-base">
                Contato de Emergência
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Nome:</span>
                  <span className="ml-2">{employee.emergency_contact || '-'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Telefone:</span>
                  <span className="ml-2">{employee.emergency_phone || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Horário de Trabalho */}
          {employee.schedule_name && (
            <div className="mb-5 print:mb-4">
              <h3 className="text-base font-bold text-gray-900 mb-2 pb-1.5 border-b print:text-base">
                Horário de Trabalho
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Escala:</span>
                  <span className="ml-2">{employee.schedule_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Horário:</span>
                  <span className="ml-2">
                    {employee.start_time} às {employee.end_time}
                  </span>
                </div>
                {employee.break_start && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-600">Intervalo:</span>
                    <span className="ml-2">
                      {employee.break_start} às {employee.break_end}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dados Financeiros */}
          {(employee.salary || employee.bank_name) && (
            <div className="mb-5 print:mb-4">
              <h3 className="text-base font-bold text-gray-900 mb-2 pb-1.5 border-b print:text-base">
                Dados Financeiros
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {employee.salary && (
                  <div>
                    <span className="font-medium text-gray-600">Salário:</span>
                    <span className="ml-2">
                      R$ {parseFloat(employee.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {employee.bank_name && (
                  <>
                    <div>
                      <span className="font-medium text-gray-600">Banco:</span>
                      <span className="ml-2">{employee.bank_name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Conta:</span>
                      <span className="ml-2">{employee.bank_account || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Estatísticas de Frequência (últimos 30 dias) */}
          <div className="mb-5 print:mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-2 pb-1.5 border-b print:text-base">
              Frequência (Últimos 30 dias)
            </h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-blue-50 p-3 rounded-lg print:bg-gray-100">
                <div className="text-xl font-bold text-blue-600 print:text-xl">
                  {stats.total_days}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total de Dias</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg print:bg-gray-100">
                <div className="text-xl font-bold text-green-600 print:text-xl">
                  {stats.complete_days}
                </div>
                <div className="text-sm text-gray-600 mt-1">Dias Completos</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg print:bg-gray-100">
                <div className="text-xl font-bold text-yellow-600 print:text-xl">
                  {stats.incomplete_days}
                </div>
                <div className="text-sm text-gray-600 mt-1">Dias Incompletos</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg print:bg-gray-100">
                <div className="text-xl font-bold text-purple-600 print:text-xl">
                  {stats.avg_hours}h
                </div>
                <div className="text-sm text-gray-600 mt-1">Média de Horas</div>
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500 print:mt-4">
            <p>
              Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="mt-1">Sistema RH - Registro de Frequência</p>
          </div>
        </div>
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed, .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          .print\\:text-xl {
            font-size: 1.25rem !important;
          }
          .print\\:text-base {
            font-size: 1rem !important;
          }
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
        }
      `}</style>
    </div>
  )
}
