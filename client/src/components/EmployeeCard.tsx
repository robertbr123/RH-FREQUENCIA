import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Printer, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Avatar from './Avatar'
import HourBankCard from './HourBankCard'
import { getInitials } from '../utils/avatarColors'

// Tentar importar react-barcode dinamicamente
let Barcode: any = null
try {
  Barcode = require('react-barcode').default
} catch {
  // react-barcode não instalado
}

interface EmployeeCardProps {
  employeeId: number
  onClose: () => void
}

export default function EmployeeCard({ employeeId, onClose }: EmployeeCardProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const printContentRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<HTMLDivElement>(null)
  const barcodeRef = useRef<HTMLDivElement>(null)

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
    if (!data) return
    
    const { employee, stats } = data
    const initials = getInitials(employee.name)
    
    // Capturar QR Code e Barcode como SVG
    const qrSvg = qrRef.current?.querySelector('svg')?.outerHTML || ''
    const barcodeSvg = barcodeRef.current?.querySelector('svg')?.outerHTML || ''
    
    // Gerar código de barras simples se não houver o componente
    const matricula = employee.id.toString().padStart(8, '0')
    const barcodeHtml = barcodeSvg || `
      <div style="text-align: center; font-family: 'Libre Barcode 39', monospace; font-size: 32px; letter-spacing: 2px;">
        *${matricula}*
      </div>
      <div style="text-align: center; font-size: 11px; margin-top: 4px;">${matricula}</div>
    `
    
    // Criar janela de impressão
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir')
      return
    }
    
    const formatDate = (dateStr: string) => {
      try {
        return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR })
      } catch {
        return '-'
      }
    }
    
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ficha - ${employee.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            padding: 25px; 
            color: #333;
            line-height: 1.6;
            background: white;
          }
          .header { 
            text-align: center; 
            margin-bottom: 25px; 
            padding-bottom: 15px;
            border-bottom: 3px solid #4F46E5;
          }
          .header h1 { 
            font-size: 24px; 
            color: #4F46E5;
            margin-bottom: 5px;
          }
          .header p { font-size: 13px; color: #666; }
          
          .main-info { 
            display: flex; 
            gap: 25px; 
            margin-bottom: 25px;
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          
          .photo-container {
            flex-shrink: 0;
          }
          .photo { 
            width: 110px; 
            height: 110px; 
            border-radius: 12px;
            object-fit: cover;
            border: 3px solid #4F46E5;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .avatar-placeholder {
            width: 110px;
            height: 110px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            font-weight: bold;
            color: white;
            background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
            border: 3px solid #4F46E5;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          
          .employee-details { flex: 1; }
          .employee-name { 
            font-size: 22px; 
            font-weight: bold; 
            color: #1e293b;
            margin-bottom: 12px;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 8px 20px;
          }
          .info-item { font-size: 13px; color: #475569; }
          .info-item strong { color: #1e293b; font-weight: 600; }
          
          .codes { 
            display: flex; 
            flex-direction: column;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
          }
          .qr-container {
            padding: 10px;
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .qr-container svg {
            display: block;
          }
          .barcode-container {
            text-align: center;
            padding: 8px 12px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          .barcode-container svg {
            display: block;
            max-width: 120px;
          }
          .employee-id { 
            font-size: 11px; 
            color: #64748b;
            font-weight: 600;
            background: #f1f5f9;
            padding: 4px 10px;
            border-radius: 20px;
          }
          
          .section { 
            margin-bottom: 18px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
          }
          .section-title { 
            font-size: 15px; 
            font-weight: 700; 
            color: #4F46E5;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
          }
          .section-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 6px 20px;
          }
          .section-item { font-size: 12px; color: #475569; }
          .section-item strong { color: #1e293b; font-weight: 600; }
          .section-item.full { grid-column: span 2; }
          
          .stats { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 12px;
          }
          .stat-card { 
            text-align: center; 
            padding: 15px 10px;
            background: white;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .stat-value { 
            font-size: 24px; 
            font-weight: bold; 
            color: #4F46E5;
          }
          .stat-label { 
            font-size: 11px; 
            color: #64748b;
            margin-top: 4px;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            margin-left: 5px;
          }
          .status-active { background: #dcfce7; color: #166534; }
          .status-inactive { background: #f1f5f9; color: #475569; }
          
          .footer { 
            margin-top: 25px;
            padding-top: 15px;
            border-top: 2px solid #e2e8f0;
            text-align: center; 
            font-size: 11px; 
            color: #94a3b8;
          }
          .footer p { margin: 3px 0; }
          
          @media print {
            body { padding: 15px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sistema RH - Registro de Frequência</h1>
          <p>Ficha Cadastral do Funcionário</p>
        </div>

        <div class="main-info">
          <div class="photo-container">
            ${employee.photo_url 
              ? `<img src="${employee.photo_url}" alt="${employee.name}" class="photo" />`
              : `<div class="avatar-placeholder">${initials}</div>`
            }
          </div>
          
          <div class="employee-details">
            <div class="employee-name">${employee.name}</div>
            <div class="info-grid">
              <div class="info-item"><strong>Cargo:</strong> ${employee.position_name || '-'}</div>
              <div class="info-item"><strong>Matrícula:</strong> #${employee.id.toString().padStart(6, '0')}</div>
              <div class="info-item"><strong>Departamento:</strong> ${employee.department_name || '-'}</div>
              <div class="info-item"><strong>Setor:</strong> ${employee.sector_name || '-'}</div>
              <div class="info-item">
                <strong>Status:</strong> 
                <span class="status-badge ${employee.status === 'active' ? 'status-active' : 'status-inactive'}">
                  ${employee.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div class="info-item"><strong>Admissão:</strong> ${formatDate(employee.hire_date)}</div>
            </div>
          </div>

          <div class="codes">
            <div class="qr-container">
              ${qrSvg}
            </div>
            <div class="barcode-container">
              ${barcodeHtml}
            </div>
            <div class="employee-id">Matrícula: ${employee.id.toString().padStart(6, '0')}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📋 Dados Pessoais</div>
          <div class="section-grid">
            <div class="section-item"><strong>CPF:</strong> ${employee.cpf || '-'}</div>
            <div class="section-item"><strong>RG:</strong> ${employee.rg || '-'}</div>
            <div class="section-item"><strong>Data Nasc.:</strong> ${employee.birth_date ? formatDate(employee.birth_date) : '-'}</div>
            <div class="section-item"><strong>Gênero:</strong> ${employee.gender || '-'}</div>
            <div class="section-item"><strong>Estado Civil:</strong> ${employee.marital_status || '-'}</div>
            <div class="section-item"><strong>PIS:</strong> ${employee.pis || '-'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📞 Contato</div>
          <div class="section-grid">
            <div class="section-item"><strong>Email:</strong> ${employee.email || '-'}</div>
            <div class="section-item"><strong>Telefone:</strong> ${employee.phone || '-'}</div>
            <div class="section-item full"><strong>Endereço:</strong> ${employee.address || '-'}</div>
            <div class="section-item"><strong>Cidade:</strong> ${employee.city || '-'}</div>
            <div class="section-item"><strong>Estado:</strong> ${employee.state || '-'}</div>
            <div class="section-item"><strong>CEP:</strong> ${employee.zip_code || '-'}</div>
          </div>
        </div>

        ${(employee.emergency_contact || employee.emergency_phone) ? `
        <div class="section">
          <div class="section-title">🚨 Contato de Emergência</div>
          <div class="section-grid">
            <div class="section-item"><strong>Nome:</strong> ${employee.emergency_contact || '-'}</div>
            <div class="section-item"><strong>Telefone:</strong> ${employee.emergency_phone || '-'}</div>
          </div>
        </div>
        ` : ''}

        ${employee.schedule_name ? `
        <div class="section">
          <div class="section-title">⏰ Horário de Trabalho</div>
          <div class="section-grid">
            <div class="section-item"><strong>Escala:</strong> ${employee.schedule_name}</div>
            <div class="section-item"><strong>Horário:</strong> ${employee.start_time || '-'} às ${employee.end_time || '-'}</div>
            ${employee.break_start ? `
            <div class="section-item full"><strong>Intervalo:</strong> ${employee.break_start} às ${employee.break_end}</div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        ${(employee.salary || employee.bank_name) ? `
        <div class="section">
          <div class="section-title">💰 Dados Financeiros</div>
          <div class="section-grid">
            ${employee.salary ? `
            <div class="section-item"><strong>Salário:</strong> R$ ${parseFloat(employee.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            ` : ''}
            ${employee.bank_name ? `
            <div class="section-item"><strong>Banco:</strong> ${employee.bank_name}</div>
            <div class="section-item"><strong>Conta:</strong> ${employee.bank_account || '-'}</div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">📊 Frequência (Últimos 30 dias)</div>
          <div class="stats">
            <div class="stat-card">
              <div class="stat-value">${stats.total_days}</div>
              <div class="stat-label">Total de Dias</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.complete_days}</div>
              <div class="stat-label">Dias Completos</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.incomplete_days}</div>
              <div class="stat-label">Dias Incompletos</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.avg_hours}h</div>
              <div class="stat-label">Média de Horas</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          <p>Sistema RH - Registro de Frequência</p>
        </div>
      </body>
      </html>
    `
    
    printWindow.document.write(printHtml)
    printWindow.document.close()
    
    // Aguardar carregamento das imagens e imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-700 dark:text-gray-300">Carregando ficha...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { employee, stats } = data

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-2xl bg-white/90 dark:bg-gray-800/90 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-white/30 dark:border-gray-700/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-700/30 flex-shrink-0 backdrop-blur-xl bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-cyan-500/10 rounded-t-3xl">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
            Ficha do Funcionário
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 backdrop-blur-xl bg-indigo-500/80 hover:bg-indigo-600/90 text-white rounded-xl transition-all duration-200 hover:scale-105 shadow-lg border border-white/20"
            >
              <Printer className="w-4 h-4" />
              Imprimir Ficha
            </button>
            <button
              onClick={onClose}
              className="p-2.5 backdrop-blur-xl bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-600/70 text-gray-700 dark:text-gray-300 rounded-xl transition-all duration-200 hover:scale-105 border border-white/20 dark:border-gray-600/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <div className="p-8 overflow-y-auto flex-1 backdrop-blur-xl">
          {/* Cabeçalho da empresa */}
          <div className="text-center mb-8 backdrop-blur-xl bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-cyan-900/10 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              Sistema RH - Registro de Frequência
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Ficha Cadastral do Funcionário</p>
          </div>

          {/* Foto, Dados Principais e Códigos */}
          <div className="flex gap-6 mb-6 backdrop-blur-xl bg-white/50 dark:bg-gray-800/50 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20">
            <div className="flex-shrink-0">
              <Avatar
                name={employee.name}
                photoUrl={employee.photo_url}
                size="xl"
                showStatus
                isActive={employee.status === 'active'}
              />
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-3">
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

            {/* QR Code e Código de Barras */}
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <div ref={qrRef} className="p-4 backdrop-blur-xl bg-white/70 dark:bg-gray-700/50 border-2 border-indigo-200/50 dark:border-indigo-700/30 rounded-2xl shadow-lg">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: employee.id,
                    cpf: employee.cpf,
                    name: employee.name,
                    type: 'employee_card'
                  })}
                  size={100}
                  level="H"
                  includeMargin={false}
                />
              </div>
              {Barcode && (
                <div ref={barcodeRef} className="backdrop-blur-xl bg-white/70 dark:bg-gray-700/50 px-3 py-2 rounded-lg border border-indigo-200/30 dark:border-indigo-700/30">
                  <Barcode 
                    value={employee.id.toString().padStart(8, '0')} 
                    width={1.5}
                    height={40}
                    fontSize={11}
                    margin={0}
                    displayValue={true}
                  />
                </div>
              )}
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 backdrop-blur-xl bg-white/50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full border border-white/30">
                Matrícula: {employee.id.toString().padStart(6, '0')}
              </p>
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="mb-6 backdrop-blur-xl bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-cyan-900/10 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20">
            <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-indigo-200/50 dark:border-indigo-700/30">
              📋 Dados Pessoais
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">CPF:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.cpf}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">RG:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.rg || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Data de Nascimento:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">
                  {employee.birth_date
                    ? format(new Date(employee.birth_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Gênero:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.gender || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Estado Civil:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.marital_status || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">PIS:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.pis || '-'}</span>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="mb-5 backdrop-blur-xl bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-cyan-900/10 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20">
            <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-indigo-200/50 dark:border-indigo-700/30">
              📞 Contato
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Email:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Telefone:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.phone || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-gray-600 dark:text-gray-400">Endereço:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.address || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Cidade:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.city || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Estado:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.state || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">CEP:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.zip_code || '-'}</span>
              </div>
            </div>
          </div>

          {/* Contato de Emergência */}
          {(employee.emergency_contact || employee.emergency_phone) && (
            <div className="mb-5 backdrop-blur-xl bg-gradient-to-r from-orange-50/50 via-amber-50/50 to-yellow-50/50 dark:from-orange-900/10 dark:via-amber-900/10 dark:to-yellow-900/10 p-6 rounded-2xl border border-orange-200/30 dark:border-orange-700/20">
              <h3 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-orange-200/50 dark:border-orange-700/30">
                🚨 Contato de Emergência
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Nome:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.emergency_contact || '-'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Telefone:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.emergency_phone || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Horário de Trabalho */}
          {employee.schedule_name && (
            <div className="mb-5 backdrop-blur-xl bg-gradient-to-r from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-cyan-900/10 p-6 rounded-2xl border border-white/30 dark:border-gray-700/20">
              <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-indigo-200/50 dark:border-indigo-700/30">
                ⏰ Horário de Trabalho
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Escala:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.schedule_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Horário:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {employee.start_time} às {employee.end_time}
                  </span>
                </div>
                {employee.break_start && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Intervalo:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {employee.break_start} às {employee.break_end}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dados Financeiros */}
          {(employee.salary || employee.bank_name) && (
            <div className="mb-5 backdrop-blur-xl bg-gradient-to-r from-green-50/50 via-emerald-50/50 to-teal-50/50 dark:from-green-900/10 dark:via-emerald-900/10 dark:to-teal-900/10 p-6 rounded-2xl border border-green-200/30 dark:border-green-700/20">
              <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-green-200/50 dark:border-green-700/30">
                💰 Dados Financeiros
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {employee.salary && (
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Salário:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      R$ {parseFloat(employee.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {employee.bank_name && (
                  <>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Banco:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.bank_name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Conta:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">{employee.bank_account || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Estatísticas de Frequência */}
          <div className="mb-6 backdrop-blur-xl bg-gradient-to-r from-purple-50/50 via-violet-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:via-violet-900/10 dark:to-indigo-900/10 p-6 rounded-2xl border border-purple-200/30 dark:border-purple-700/20">
            <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-4 pb-2 border-b border-purple-200/50 dark:border-purple-700/30">
              📊 Frequência (Últimos 30 dias)
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="backdrop-blur-xl bg-blue-500/10 dark:bg-blue-500/20 p-4 rounded-2xl border border-blue-200/30 dark:border-blue-700/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.total_days}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">Total de Dias</div>
              </div>
              <div className="backdrop-blur-xl bg-green-500/10 dark:bg-green-500/20 p-4 rounded-2xl border border-green-200/30 dark:border-green-700/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.complete_days}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">Dias Completos</div>
              </div>
              <div className="backdrop-blur-xl bg-yellow-500/10 dark:bg-yellow-500/20 p-4 rounded-2xl border border-yellow-200/30 dark:border-yellow-700/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.incomplete_days}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">Dias Incompletos</div>
              </div>
              <div className="backdrop-blur-xl bg-purple-500/10 dark:bg-purple-500/20 p-4 rounded-2xl border border-purple-200/30 dark:border-purple-700/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.avg_hours}h
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">Média de Horas</div>
              </div>
            </div>
          </div>

          {/* Banco de Horas */}
          <div className="mb-6">
            <HourBankCard employeeId={employee.id} />
          </div>

          {/* Rodapé */}
          <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/30 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="mt-1">Sistema RH - Registro de Frequência</p>
          </div>
        </div>
      </div>
    </div>
  )
}
