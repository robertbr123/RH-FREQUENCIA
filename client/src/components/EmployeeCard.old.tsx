import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Printer, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'
import { getInitials, getAvatarColors } from '../utils/avatarColors'

interface EmployeeCardProps {
  employeeId: number
  onClose: () => void
}

export default function EmployeeCard({ employeeId, onClose }: EmployeeCardProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

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
    if (!printRef.current || !data) return
    
    const printContent = printRef.current.innerHTML
    const employee = data.employee
    const avatarColors = getAvatarColors(employee.name)
    const initials = getInitials(employee.name)
    
    // Criar janela de impressão
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir')
      return
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ficha - ${employee.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            color: #333;
            line-height: 1.5;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            padding-bottom: 15px;
            border-bottom: 2px solid #4F46E5;
          }
          .header h1 { 
            font-size: 22px; 
            color: #4F46E5;
            margin-bottom: 5px;
          }
          .header p { font-size: 12px; color: #666; }
          .main-info { 
            display: flex; 
            gap: 20px; 
            margin-bottom: 20px;
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .photo { 
            width: 100px; 
            height: 100px; 
            border-radius: 10px;
            object-fit: cover;
            border: 2px solid #4F46E5;
          }
          .avatar-placeholder {
            width: 100px;
            height: 100px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: bold;
            color: white;
            background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
            border: 2px solid #4F46E5;
          }
          .employee-details { flex: 1; }
          .employee-name { 
            font-size: 20px; 
            font-weight: bold; 
            color: #1f2937;
            margin-bottom: 10px;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 5px 15px;
          }
          .info-item { font-size: 12px; }
          .info-item strong { color: #4b5563; }
          .codes { 
            display: flex; 
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }
          .qr-container {
            padding: 8px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
          .barcode-container {
            text-align: center;
          }
          .employee-id { 
            font-size: 11px; 
            color: #6b7280;
            font-weight: 600;
          }
          .section { 
            margin-bottom: 15px;
            padding: 12px;
            background: #f9fafb;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .section-title { 
            font-size: 14px; 
            font-weight: bold; 
            color: #4F46E5;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
          }
          .section-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 5px 15px;
          }
          .section-item { font-size: 11px; }
          .section-item strong { color: #4b5563; }
          .section-item.full { grid-column: span 2; }
          .stats { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 10px;
            margin-bottom: 15px;
          }
          .stat-card { 
            text-align: center; 
            padding: 10px;
            background: #f9fafb;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .stat-value { 
            font-size: 20px; 
            font-weight: bold; 
            color: #4F46E5;
          }
          .stat-label { font-size: 10px; color: #6b7280; }
          .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
          }
          .status-active { background: #dcfce7; color: #166534; }
          .status-inactive { background: #f3f4f6; color: #4b5563; }
          .footer { 
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            text-align: center; 
            font-size: 10px; 
            color: #9ca3af;
          }
          @media print {
            body { padding: 10px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `)
    
    printWindow.document.close()
    
    // Aguardar carregamento e imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
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
  const avatarColors = getAvatarColors(employee.name)
  const initials = getInitials(employee.name)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-2xl bg-white/90 dark:bg-gray-800/90 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-white/30 dark:border-gray-700/30">
        {/* Header - Não imprime */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-700/30 flex-shrink-0 backdrop-blur-xl bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-cyan-500/10 rounded-t-3xl">
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
        <div className="p-8 overflow-y-auto flex-1 backdrop-blur-xl">
          
          {/* ========== CONTEÚDO PARA IMPRESSÃO (invisível na tela) ========== */}
          <div ref={printRef} className="hidden">
            <div className="header">
              <h1>Sistema RH - Registro de Frequência</h1>
              <p>Ficha Cadastral do Funcionário</p>
            </div>

            <div className="main-info">
              ${employee.photo_url 
                ? `<img src="${employee.photo_url}" alt="${employee.name}" class="photo" />`
                : `<div class="avatar-placeholder">${initials}</div>`
              }
              
              <div className="employee-details">
                <div className="employee-name">{employee.name}</div>
                <div className="info-grid">
                  <div className="info-item"><strong>Cargo:</strong> {employee.position_name || '-'}</div>
                  <div className="info-item"><strong>Matrícula:</strong> #{employee.id.toString().padStart(6, '0')}</div>
                  <div className="info-item"><strong>Departamento:</strong> {employee.department_name || '-'}</div>
                  <div className="info-item"><strong>Setor:</strong> {employee.sector_name || '-'}</div>
                  <div className="info-item">
                    <strong>Status:</strong> 
                    <span className={`status-badge ${employee.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                      {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="info-item"><strong>Admissão:</strong> {format(new Date(employee.hire_date), 'dd/MM/yyyy', { locale: ptBR })}</div>
                </div>
              </div>

              <div className="codes">
                <div className="qr-container">
                  <QRCodeSVG
                    value={JSON.stringify({ id: employee.id, cpf: employee.cpf, name: employee.name, type: 'employee_card' })}
                    size={80}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="barcode-container">
                  <Barcode 
                    value={employee.id.toString().padStart(8, '0')} 
                    width={1.2}
                    height={35}
                    fontSize={10}
                    margin={0}
                    displayValue={true}
                  />
                </div>
                <div className="employee-id">Matrícula: {employee.id.toString().padStart(6, '0')}</div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Dados Pessoais</div>
              <div className="section-grid">
                <div className="section-item"><strong>CPF:</strong> {employee.cpf}</div>
                <div className="section-item"><strong>RG:</strong> {employee.rg || '-'}</div>
                <div className="section-item"><strong>Data Nasc.:</strong> {employee.birth_date ? format(new Date(employee.birth_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</div>
                <div className="section-item"><strong>Gênero:</strong> {employee.gender || '-'}</div>
                <div className="section-item"><strong>Estado Civil:</strong> {employee.marital_status || '-'}</div>
                <div className="section-item"><strong>PIS:</strong> {employee.pis || '-'}</div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Contato</div>
              <div className="section-grid">
                <div className="section-item"><strong>Email:</strong> {employee.email}</div>
                <div className="section-item"><strong>Telefone:</strong> {employee.phone || '-'}</div>
                <div className="section-item full"><strong>Endereço:</strong> {employee.address || '-'}</div>
                <div className="section-item"><strong>Cidade:</strong> {employee.city || '-'}</div>
                <div className="section-item"><strong>Estado:</strong> {employee.state || '-'}</div>
                <div className="section-item"><strong>CEP:</strong> {employee.zip_code || '-'}</div>
              </div>
            </div>

            {(employee.emergency_contact || employee.emergency_phone) && (
              <div className="section">
                <div className="section-title">Contato de Emergência</div>
                <div className="section-grid">
                  <div className="section-item"><strong>Nome:</strong> {employee.emergency_contact || '-'}</div>
                  <div className="section-item"><strong>Telefone:</strong> {employee.emergency_phone || '-'}</div>
                </div>
              </div>
            )}

            {employee.schedule_name && (
              <div className="section">
                <div className="section-title">Horário de Trabalho</div>
                <div className="section-grid">
                  <div className="section-item"><strong>Escala:</strong> {employee.schedule_name}</div>
                  <div className="section-item"><strong>Horário:</strong> {employee.start_time} às {employee.end_time}</div>
                  {employee.break_start && (
                    <div className="section-item full"><strong>Intervalo:</strong> {employee.break_start} às {employee.break_end}</div>
                  )}
                </div>
              </div>
            )}

            {(employee.salary || employee.bank_name) && (
              <div className="section">
                <div className="section-title">Dados Financeiros</div>
                <div className="section-grid">
                  {employee.salary && (
                    <div className="section-item"><strong>Salário:</strong> R$ {parseFloat(employee.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  )}
                  {employee.bank_name && (
                    <>
                      <div className="section-item"><strong>Banco:</strong> {employee.bank_name}</div>
                      <div className="section-item"><strong>Conta:</strong> {employee.bank_account || '-'}</div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="section">
              <div className="section-title">Frequência (Últimos 30 dias)</div>
              <div className="stats">
                <div className="stat-card">
                  <div className="stat-value">{stats.total_days}</div>
                  <div className="stat-label">Total de Dias</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.complete_days}</div>
                  <div className="stat-label">Dias Completos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.incomplete_days}</div>
                  <div className="stat-label">Dias Incompletos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.avg_hours}h</div>
                  <div className="stat-label">Média de Horas</div>
                </div>
              </div>
            </div>

            <div className="footer">
              <p>Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              <p>Sistema RH - Registro de Frequência</p>
            </div>
          </div>
          {/* ========== FIM DO CONTEÚDO PARA IMPRESSÃO ========== */}

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
