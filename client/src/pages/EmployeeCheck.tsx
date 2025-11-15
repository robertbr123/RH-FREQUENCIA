import { useState, FormEvent } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, CheckCircle, XCircle, Clock, Calendar, ArrowLeft, Briefcase, Building2 } from 'lucide-react'

interface EmployeeData {
  id: number
  name: string
  photo_url?: string
  position_name: string
  department_name: string
  matricula: string
}

interface AttendanceRecord {
  date: string
  check_in: string
  check_out: string | null
  hours: number
}

interface AttendanceData {
  month: string
  present: number
  absent: number
  totalHours: number
  records: AttendanceRecord[]
}

export default function EmployeeCheck() {
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [employee, setEmployee] = useState<EmployeeData | null>(null)
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return value
  }

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value)
    setCpf(formatted)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setEmployee(null)
    setAttendance(null)

    // Validar CPF
    const cpfNumbers = cpf.replace(/\D/g, '')
    if (cpfNumbers.length !== 11) {
      setError('CPF inválido. Digite os 11 dígitos.')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/api/employee-card/check-attendance', {
        cpf: cpfNumbers
      })

      if (response.data.success) {
        console.log('✅ Dados recebidos:', response.data)
        console.log('📊 Attendance completo:', JSON.stringify(response.data.attendance, null, 2))
        console.log('📝 Records length:', response.data.attendance?.records?.length)
        console.log('📝 Records:', response.data.attendance?.records)
        
        if (response.data.attendance?.records) {
          console.log('🔍 Primeiro registro detalhado:', response.data.attendance.records[0])
        }
        
        setEmployee(response.data.employee)
        setAttendance(response.data.attendance)
      } else {
        setError(response.data.message || 'CPF não encontrado ou funcionário inativo.')
      }
    } catch (err: any) {
      console.error('Erro ao consultar:', err)
      if (err.response?.status === 429) {
        setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError('Erro ao consultar frequência. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setCpf('')
    setEmployee(null)
    setAttendance(null)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4">
            <Clock className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Consulta de Frequência
          </h1>
          <p className="text-gray-600">
            Digite seu CPF para verificar seus registros de ponto
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-4">
          {!employee ? (
            // Formulário de consulta
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  CPF
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={handleCPFChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                  disabled={loading}
                  autoFocus
                  inputMode="numeric"
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || cpf.replace(/\D/g, '').length !== 11}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold py-4 px-6 rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Consultar Frequência
                  </>
                )}
              </button>
            </form>
          ) : (
            // Resultado da consulta
            <div className="space-y-6">
              {/* Dados do Funcionário */}
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  {employee.photo_url ? (
                    <img 
                      src={employee.photo_url} 
                      alt={employee.name}
                      className="w-16 h-16 rounded-full object-cover border-4 border-white/30 shadow-lg"
                      onError={(e) => {
                        // Fallback para avatar se a imagem falhar
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg"
                    style={{ display: employee.photo_url ? 'none' : 'flex' }}
                  >
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{employee.name}</h2>
                    <p className="text-primary-100 text-sm">Matrícula #{employee.matricula}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary-100" />
                    <div>
                      <p className="text-xs text-primary-100">Cargo</p>
                      <p className="font-semibold text-sm">{employee.position_name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary-100" />
                    <div>
                      <p className="text-xs text-primary-100">Departamento</p>
                      <p className="font-semibold text-sm">{employee.department_name || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estatísticas */}
              {attendance && (
                <>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      {format(new Date(attendance.month + '-01'), 'MMMM yyyy', { locale: ptBR })}
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-green-50 rounded-xl p-4 text-center border-2 border-green-100">
                        <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-700">{attendance.present}</p>
                        <p className="text-xs text-green-600 font-medium">Presenças</p>
                      </div>
                      
                      <div className="bg-red-50 rounded-xl p-4 text-center border-2 border-red-100">
                        <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-700">{attendance.absent}</p>
                        <p className="text-xs text-red-600 font-medium">Faltas</p>
                      </div>
                      
                      <div className="bg-blue-50 rounded-xl p-4 text-center border-2 border-blue-100">
                        <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-700">{attendance.totalHours.toFixed(1)}h</p>
                        <p className="text-xs text-blue-600 font-medium">Total</p>
                      </div>
                    </div>
                  </div>

                  {/* Últimos Registros */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      Últimos Registros
                    </h3>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {attendance.records && attendance.records.length > 0 ? (
                        attendance.records.map((record, index) => {
                          // Parse da data de forma segura
                          let recordDate: Date
                          try {
                            // Formato: YYYY-MM-DD
                            const [year, month, day] = record.date.split('-').map(Number)
                            recordDate = new Date(year, month - 1, day)
                          } catch {
                            recordDate = new Date()
                          }
                          
                          // Horários já vem no formato HH:MM:SS da API
                          const checkInTime = record.check_in || '00:00:00'
                          const checkOutTime = record.check_out || null
                          
                          return (
                            <div
                              key={index}
                              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-gray-900">
                                  {format(recordDate, "dd/MM/yyyy - EEEE", { locale: ptBR })}
                                </span>
                                <span className="text-sm font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                                  {record.hours.toFixed(1)}h
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded">
                                    <span className="text-green-600 font-bold text-xs">↓</span>
                                  </div>
                                  <span className="font-semibold text-gray-700">
                                    {checkInTime.substring(0, 5)}
                                  </span>
                                  <span className="text-xs text-gray-500">Entrada</span>
                                </div>
                                <span className="text-gray-300">→</span>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded">
                                    <span className="text-red-600 font-bold text-xs">↑</span>
                                  </div>
                                  <span className="font-semibold text-gray-700">
                                    {checkOutTime ? checkOutTime.substring(0, 5) : '--:--'}
                                  </span>
                                  <span className="text-xs text-gray-500">Saída</span>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Nenhum registro encontrado neste mês</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botão Nova Consulta */}
                  <button
                    onClick={handleReset}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Nova Consulta
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Botão Voltar */}
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para Login
        </Link>
      </div>
    </div>
  )
}
