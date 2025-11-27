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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-2xl bg-white/90 dark:bg-gray-800/90 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-white/30 dark:border-gray-700/30">
        {/* Header - Não imprime */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-700/30 print:hidden flex-shrink-0 backdrop-blur-xl bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-cyan-500/10 rounded-t-3xl">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">Ficha do Funcionário</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 backdrop-blur-xl bg-indigo-500/80 hover:bg-indigo-600/90 text-white rounded-xl transition-all duration-200 hover:scale-105 shadow-lg border border-white/20"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-2.5 backdrop-blur-xl bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-600/70 text-gray-700 dark:text-gray-300 rounded-xl transition-all duration-200 hover:scale-105 border border-white/20 dark:border-gray-600/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo para impressão - com scroll */}
        <div className="p-8 print:p-0 overflow-y-auto flex-1 backdrop-blur-xl">
          {/* Cabeçalho da empresa */}
          <div className="text-center mb-8 print:mb-4 backdrop-blur-xl bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-cyan-900/10 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20 print:bg-white print:border-gray-300">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent print:text-xl print:text-gray-900 print:bg-none">
              Sistema RH - Registro de Frequência
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Ficha Cadastral do Funcionário</p>
          </div>

          {/* Foto, Dados Principais e QR Code */}
          <div className="flex gap-6 mb-6 print:mb-4 backdrop-blur-xl bg-white/50 dark:bg-gray-800/50 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20 print:bg-white print:border-gray-300">
            <div className="flex-shrink-0">
              {employee.photo_url ? (
                <img
                  src={employee.photo_url}
                  alt={employee.name}
                  className="w-28 h-28 rounded-2xl object-cover border-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-indigo-100 to-cyan-100 dark:from-indigo-900/30 dark:to-cyan-900/30 flex items-center justify-center border-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-lg">
                  <span className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                    {employee.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-3 print:text-xl print:text-gray-900 print:bg-none">
                {employee.name}
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Cargo:</span>
                  <span className="text-gray-900 dark:text-gray-100">{employee.position_name || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Matrícula:</span>
                  <span className="text-gray-900 dark:text-gray-100">#{employee.id.toString().padStart(6, '0')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Departamento:</span>
                  <span className="text-gray-900 dark:text-gray-100">{employee.department_name || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Setor:</span>
                  <span className="text-gray-900 dark:text-gray-100">{employee.sector_name || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Status:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xl ${
                      employee.status === 'active'
                        ? 'bg-green-500/20 text-green-700 dark:text-green-300 border border-green-500/30'
                        : 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30'
                    }`}
                  >
                    {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Data de Admissão:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {format(new Date(employee.hire_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <div className="p-4 backdrop-blur-xl bg-white/70 dark:bg-gray-700/50 border-2 border-indigo-200/50 dark:border-indigo-700/30 rounded-2xl shadow-lg">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: employee.id,
                    cpf: employee.cpf,
                    name: employee.name,
                    type: 'employee_card'
                  })}
                  size={130}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 backdrop-blur-xl bg-white/50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full border border-white/30">
                ID: {employee.id.toString().padStart(6, '0')}
              </p>
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="mb-6 print:mb-4 backdrop-blur-xl bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-cyan-900/10 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20 print:bg-white print:border-gray-300">
            <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-indigo-200/50 dark:border-indigo-700/30 print:text-base print:text-gray-900 print:bg-none print:border-gray-300">
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
          <div className="mb-5 print:mb-4 backdrop-blur-xl bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-cyan-900/10 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20 print:bg-white print:border-gray-300 print:p-4 print:rounded">
            <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-indigo-200/50 dark:border-indigo-700/30 print:text-base print:text-gray-900 print:bg-none print:border-gray-300">
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
            <div className="mb-5 print:mb-4 backdrop-blur-xl bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-cyan-900/10 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20 print:bg-white print:border-gray-300 print:p-4 print:rounded">
              <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-indigo-200/50 dark:border-indigo-700/30 print:text-base print:text-gray-900 print:bg-none print:border-gray-300">
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
            <div className="mb-5 print:mb-4 backdrop-blur-xl bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-cyan-900/10 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20 print:bg-white print:border-gray-300 print:p-4 print:rounded">
              <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-indigo-200/50 dark:border-indigo-700/30 print:text-base print:text-gray-900 print:bg-none print:border-gray-300">
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
            <div className="mb-5 print:mb-4 backdrop-blur-xl bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-cyan-900/10 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20 print:bg-white print:border-gray-300 print:p-4 print:rounded">
              <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-indigo-200/50 dark:border-indigo-700/30 print:text-base print:text-gray-900 print:bg-none print:border-gray-300">
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
          <div className="mb-6 print:mb-4 backdrop-blur-xl bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-cyan-900/10 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20 print:bg-white print:border-gray-300">
            <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-indigo-200/50 dark:border-indigo-700/30 print:text-base print:text-gray-900 print:bg-none print:border-gray-300">
              Frequência (Últimos 30 dias)
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="backdrop-blur-xl bg-blue-500/10 dark:bg-blue-500/20 p-4 rounded-2xl print:bg-gray-100 border border-blue-200/30 dark:border-blue-700/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 print:text-xl">
                  {stats.total_days}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">Total de Dias</div>
              </div>
              <div className="backdrop-blur-xl bg-green-500/10 dark:bg-green-500/20 p-4 rounded-2xl print:bg-gray-100 border border-green-200/30 dark:border-green-700/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 print:text-xl">
                  {stats.complete_days}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">Dias Completos</div>
              </div>
              <div className="backdrop-blur-xl bg-yellow-500/10 dark:bg-yellow-500/20 p-4 rounded-2xl print:bg-gray-100 border border-yellow-200/30 dark:border-yellow-700/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 print:text-xl">
                  {stats.incomplete_days}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">Dias Incompletos</div>
              </div>
              <div className="backdrop-blur-xl bg-purple-500/10 dark:bg-purple-500/20 p-4 rounded-2xl print:bg-gray-100 border border-purple-200/30 dark:border-purple-700/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 print:text-xl">
                  {stats.avg_hours}h
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">Média de Horas</div>
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
          @page {
            margin: 1cm;
            size: A4;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: white !important;
          }
          
          /* Esconde TUDO primeiro */
          body * {
            visibility: hidden !important;
          }
          
          /* Mostra apenas o conteúdo da ficha */
          .fixed,
          .fixed *,
          .fixed > div,
          .fixed > div * {
            visibility: visible !important;
          }
          
          /* Reset completo do container */
          .fixed {
            position: static !important;
            inset: 0 !important;
            background: white !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          
          /* Modal interno */
          .fixed > div {
            background: white !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            max-height: none !important;
            width: 100% !important;
            display: block !important;
            flex-direction: column !important;
          }
          
          /* Área de conteúdo */
          .overflow-y-auto {
            overflow: visible !important;
            max-height: none !important;
            padding: 15px !important;
            background: white !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          
          /* REMOVE TODOS OS EFEITOS GLASS */
          * {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            background-image: none !important;
            box-shadow: none !important;
            text-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Todas as divs com blur viram brancas simples */
          .backdrop-blur-xl,
          .backdrop-blur-2xl,
          .backdrop-blur-sm,
          [class*="backdrop-blur"] {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            background: white !important;
            background-color: white !important;
            background-image: none !important;
          }
          
          /* Fundos com gradiente viram brancos */
          .bg-gradient-to-r,
          .bg-gradient-to-br,
          .bg-gradient-to-l,
          .bg-gradient-to-t,
          .bg-gradient-to-b,
          [class*="bg-gradient"] {
            background: white !important;
            background-color: white !important;
            background-image: none !important;
          }
          
          /* Fundos com transparência viram brancos */
          [class*="bg-white/"],
          [class*="bg-gray-800/"],
          [class*="bg-indigo-"],
          [class*="bg-blue-"],
          [class*="bg-cyan-"],
          [class*="from-"],
          [class*="via-"],
          [class*="to-"] {
            background: white !important;
            background-color: white !important;
            background-image: none !important;
          }
          
          /* Textos com gradiente viram pretos */
          .bg-clip-text,
          [class*="bg-clip-text"] {
            background: none !important;
            background-image: none !important;
            -webkit-background-clip: unset !important;
            background-clip: unset !important;
            -webkit-text-fill-color: black !important;
            color: black !important;
          }
          
          /* Seções principais */
          .mb-6,
          .mb-5,
          .mb-8 {
            background: white !important;
            background-color: white !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 6px !important;
            padding: 12px !important;
            margin-bottom: 12px !important;
            page-break-inside: avoid !important;
          }
          
          /* Títulos de seção */
          h1, h2, h3, h4, h5, h6 {
            color: black !important;
            background: none !important;
            background-image: none !important;
            -webkit-background-clip: unset !important;
            background-clip: unset !important;
            -webkit-text-fill-color: black !important;
          }
          
          /* Bordas coloridas viram cinzas */
          [class*="border-indigo"],
          [class*="border-blue"],
          [class*="border-cyan"],
          [class*="border-white"],
          [class*="border-gray-700"] {
            border-color: #d1d5db !important;
          }
          
          /* Cards de estatísticas */
          [class*="bg-blue-500"],
          [class*="bg-green-500"],
          [class*="bg-yellow-500"],
          [class*="bg-purple-500"],
          [class*="bg-red-500"] {
            background: #f9fafb !important;
            background-color: #f9fafb !important;
            border: 1px solid #d1d5db !important;
          }
          
          /* Textos coloridos viram pretos */
          [class*="text-blue"],
          [class*="text-green"],
          [class*="text-yellow"],
          [class*="text-purple"],
          [class*="text-indigo"],
          [class*="text-cyan"] {
            color: black !important;
          }
          
          /* Remove efeitos hover e transições */
          [class*="hover:"],
          [class*="transition"] {
            transform: none !important;
            transition: none !important;
          }
          
          /* Esconde header */
          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Imagens */
          img {
            max-width: 100% !important;
            page-break-inside: avoid !important;
            border: 1px solid #e5e7eb !important;
          }
          
          /* QR Code */
          svg {
            page-break-inside: avoid !important;
          }
          
          /* Grid e Flex mantém */
          .grid {
            display: grid !important;
          }
          
          .flex {
            display: flex !important;
          }
          
          /* Tamanhos de fonte */
          .print\\:text-xl {
            font-size: 1.25rem !important;
          }
          
          .print\\:text-base {
            font-size: 1rem !important;
          }
          
          /* Força fundo branco em tudo */
          .print\\:bg-white {
            background: white !important;
            background-color: white !important;
          }
          
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          .print\\:text-gray-900 {
            color: black !important;
          }
          
          .print\\:bg-none {
            background: none !important;
            background-image: none !important;
          }
        }
      `}</style>
    </div>
  )
}
