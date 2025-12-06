import React, { useState, FormEvent, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, CheckCircle, XCircle, Clock, Calendar, ArrowLeft, Briefcase, Building2, X } from 'lucide-react'

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
  status?: 'present' | 'vacation' | 'holiday' | 'absent'
  statusLabel?: string
}

interface AttendanceData {
  month: string
  present: number
  absent: number
  vacation?: number
  holidays?: number
  totalHours: number
  records: AttendanceRecord[]
  workdays?: number[] // Dias que o funcionário trabalha (0-6)
}

interface AdConfig {
  ad_enabled: boolean
  ad_title: string
  ad_subtitle: string
  ad_image_url: string
  ad_bg_color_from: string
  ad_bg_color_to: string
  ad_delay_seconds: number
  // Configurações de visibilidade
  ec_show_photo: boolean
  ec_show_matricula: boolean
  ec_show_position: boolean
  ec_show_department: boolean
  ec_show_punctuality: boolean
  ec_show_graph: boolean
  ec_show_stats: boolean
  ec_show_vacation_holidays: boolean
  ec_show_records_list: boolean
  ec_records_limit: number
  ec_custom_title: string
  ec_custom_subtitle: string
}

// Constantes para valores padrão
const DEFAULT_AD_CONFIG: AdConfig = {
  ad_enabled: true,
  ad_title: 'Prefeitura Municipal de Ipixuna',
  ad_subtitle: 'Juntos por um novo tempo',
  ad_image_url: '',
  ad_bg_color_from: '#15803d',
  ad_bg_color_to: '#16a34a',
  ad_delay_seconds: 3,
  ec_show_photo: true,
  ec_show_matricula: true,
  ec_show_position: true,
  ec_show_department: true,
  ec_show_punctuality: true,
  ec_show_graph: true,
  ec_show_stats: true,
  ec_show_vacation_holidays: true,
  ec_show_records_list: true,
  ec_records_limit: 10,
  ec_custom_title: 'Consulta de Frequência',
  ec_custom_subtitle: 'Digite seu CPF para verificar seus registros de ponto'
}

export default function EmployeeCheck() {
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [employee, setEmployee] = useState<EmployeeData | null>(null)
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [punctualityCount, setPunctualityCount] = useState(0)
  const [showGraph, setShowGraph] = useState(false)
  const [showAd, setShowAd] = useState(false)
  const [adDismissed, setAdDismissed] = useState(false)
  const [adConfig, setAdConfig] = useState<AdConfig>(DEFAULT_AD_CONFIG)

  // Carregar configuração do EmployeeCheck do banco de dados
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await axios.get('/api/settings/employee-check')
        if (response.data) {
          setAdConfig({
            ...DEFAULT_AD_CONFIG,
            ...response.data,
            // Garantir valores padrão para campos que podem ser null/undefined
            ad_title: response.data.ad_title || DEFAULT_AD_CONFIG.ad_title,
            ad_subtitle: response.data.ad_subtitle || DEFAULT_AD_CONFIG.ad_subtitle,
            ad_bg_color_from: response.data.ad_bg_color_from || DEFAULT_AD_CONFIG.ad_bg_color_from,
            ad_bg_color_to: response.data.ad_bg_color_to || DEFAULT_AD_CONFIG.ad_bg_color_to,
            ec_records_limit: response.data.ec_records_limit || DEFAULT_AD_CONFIG.ec_records_limit,
            ec_custom_title: response.data.ec_custom_title || DEFAULT_AD_CONFIG.ec_custom_title,
            ec_custom_subtitle: response.data.ec_custom_subtitle || DEFAULT_AD_CONFIG.ec_custom_subtitle
          })
        }
      } catch {
        // Usa configuração padrão em caso de erro
      }
    }
    loadConfig()
  }, [])

  // Mostrar propaganda após delay configurado
  useEffect(() => {
    if (adDismissed || !adConfig.ad_enabled) return
    const timer = setTimeout(() => {
      setShowAd(true)
    }, adConfig.ad_delay_seconds * 1000)
    return () => clearTimeout(timer)
  }, [adDismissed, adConfig.ad_enabled, adConfig.ad_delay_seconds])

  const dismissAd = () => {
    setShowAd(false)
    setAdDismissed(true)
  }

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
        cpf: cpfNumbers,
        month: selectedMonth
      })

      if (response.data.success) {
        if (response.data.attendance?.records) {
          // Calcular pontualidade (entrada antes das 08:30)
          const onTimeCount = response.data.attendance.records.filter((r: AttendanceRecord) => {
            if (!r.check_in) return false
            const [hour, minute] = r.check_in.split(':').map(Number)
            return hour < 8 || (hour === 8 && minute <= 30)
          }).length
          setPunctualityCount(onTimeCount)
        }
        
        setEmployee(response.data.employee)
        setAttendance(response.data.attendance)
      } else {
        setError(response.data.message || 'CPF não encontrado ou funcionário inativo.')
      }
    } catch (err: any) {
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
    setSelectedMonth(format(new Date(), 'yyyy-MM'))
    setPunctualityCount(0)
    setShowGraph(false)
  }

  // Recarregar dados quando mês mudar
  const handleMonthChange = async (newMonth: string) => {
    setSelectedMonth(newMonth)
    if (employee) {
      setLoading(true)
      try {
        const cpfNumbers = cpf.replace(/\D/g, '')
        const response = await axios.post('/api/employee-card/check-attendance', {
          cpf: cpfNumbers,
          month: newMonth
        })
        if (response.data.success) {
          setAttendance(response.data.attendance)
          
          // Recalcular pontualidade
          const onTimeCount = response.data.attendance.records.filter((r: AttendanceRecord) => {
            if (!r.check_in) return false
            const [hour, minute] = r.check_in.split(':').map(Number)
            return hour < 8 || (hour === 8 && minute <= 30)
          }).length
          setPunctualityCount(onTimeCount)
        }
      } catch (err) {
        // Erro silencioso ao carregar mês
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Background Gradient Intenso */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-blue-900/50 to-cyan-800/50"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/60 via-transparent to-indigo-950/40"></div>
      </div>
      
      {/* Brilhos Mágicos de Fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl animate-float-slow"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10 px-2 sm:px-0">
        {/* Header com Glassmorphism Intenso */}
        <div className="text-center mb-4 sm:mb-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-500/30 via-blue-500/30 to-cyan-500/30 backdrop-blur-xl border-2 border-white/40 rounded-2xl shadow-2xl mb-3 sm:mb-4 animate-pulse">
            <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-200 via-blue-100 to-cyan-200 bg-clip-text text-transparent mb-2 drop-shadow-2xl px-2">
            🔍 {adConfig.ec_custom_title}
          </h1>
          <p className="text-sm sm:text-base text-white/90 font-semibold drop-shadow-lg px-4">
            {adConfig.ec_custom_subtitle}
          </p>
        </div>

        {/* Card Principal com Glassmorphism Super Intenso */}
        <div className="backdrop-blur-2xl bg-gradient-to-br from-indigo-900/20 via-blue-900/20 to-cyan-800/20 border-2 border-white/30 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 mb-3 sm:mb-4 relative overflow-hidden transition-all duration-500 hover:shadow-cyan-500/20 hover:border-white/40">
          {/* Brilho Interno */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-200/10 via-transparent to-indigo-200/10 pointer-events-none"></div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 animate-pulse"></div>
          
          {/* Conteúdo */}
          <div className="relative z-10">
          {!employee ? (
            // Formulário de consulta com Glassmorphism
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2 sm:mb-3 drop-shadow">
                  CPF
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={handleCPFChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-4 sm:px-5 py-3 sm:py-4 text-base sm:text-lg bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-4 focus:ring-white/30 focus:border-white/40 outline-none transition-all hover:border-white/30"
                  disabled={loading}
                  autoFocus
                  inputMode="numeric"
                />
              </div>

              {error && (
                <div className="bg-red-500/20 backdrop-blur-xl border-2 border-red-300/30 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3 animate-shake">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0 mt-0.5" />
                  <p className="text-white text-xs sm:text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || cpf.replace(/\D/g, '').length !== 11}
                className="w-full bg-white/20 backdrop-blur-xl hover:bg-white/30 border-2 border-white/30 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
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
            // Resultado da consulta com animação
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              {/* Dados do Funcionário com Glassmorphism Intenso */}
              <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-500/30 via-blue-500/30 to-cyan-500/30 border-2 border-white/40 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-2xl transform hover:scale-[1.01] transition-all duration-300">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  {adConfig.ec_show_photo && employee.photo_url ? (
                    <img 
                      src={employee.photo_url} 
                      alt={employee.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-white/30 shadow-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold shadow-lg"
                    style={{ display: (adConfig.ec_show_photo && employee.photo_url) ? 'none' : 'flex' }}
                  >
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold truncate">{employee.name}</h2>
                    {adConfig.ec_show_matricula && (
                      <p className="text-white/80 text-xs sm:text-sm">Matrícula #{employee.matricula}</p>
                    )}
                  </div>
                </div>
                
                {(adConfig.ec_show_position || adConfig.ec_show_department) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20">
                    {adConfig.ec_show_position && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-white/80" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white/70">Cargo</p>
                          <p className="font-semibold text-xs sm:text-sm truncate">{employee.position_name || '-'}</p>
                        </div>
                      </div>
                    )}
                    {adConfig.ec_show_department && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-white/80" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white/70">Departamento</p>
                          <p className="font-semibold text-xs sm:text-sm truncate">{employee.department_name || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Seletor de Mês */}
              <div className="backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-xl p-3 sm:p-4">
                <label className="block text-xs sm:text-sm font-semibold text-white/90 mb-2 drop-shadow">
                  📅 Selecionar Mês
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  max={format(new Date(), 'yyyy-MM')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-lg text-white text-sm sm:text-base focus:ring-2 focus:ring-white/30 focus:border-white/40 outline-none transition-all"
                  disabled={loading}
                />
              </div>

              {/* Indicador de Pontualidade */}
              {adConfig.ec_show_punctuality && attendance && punctualityCount > 0 && (
                <div className="backdrop-blur-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/30 rounded-xl p-3 sm:p-4 animate-slide-up">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/30 backdrop-blur-xl rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-200" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-white">🎯 Pontualidade</p>
                        <p className="text-[10px] sm:text-xs text-white/70">Chegou no horário (até 08:30)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl sm:text-2xl font-bold text-white">{punctualityCount}</p>
                      <p className="text-[10px] sm:text-xs text-white/70">{attendance.present > 0 ? Math.round((punctualityCount / attendance.present) * 100) : 0}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all duration-1000"
                      style={{ width: `${attendance.present > 0 ? (punctualityCount / attendance.present) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Gráfico Visual de Frequência */}
              {adConfig.ec_show_graph && attendance && (
                <div className="backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-base font-bold text-white drop-shadow">📊 Visão Geral do Mês</h3>
                    <button
                      onClick={() => setShowGraph(!showGraph)}
                      className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors underline"
                    >
                      {showGraph ? 'Ocultar' : 'Mostrar'} Gráfico
                    </button>
                  </div>
                  
                  {showGraph && (
                    <div className="space-y-3 animate-fade-in">
                      {/* Barra de Presença */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs sm:text-sm text-white/80">✅ Presenças</span>
                          <span className="text-xs sm:text-sm font-bold text-green-300">{attendance.present} dias</span>
                        </div>
                        <div className="h-6 sm:h-8 bg-white/10 rounded-lg overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold transition-all duration-1000"
                            style={{ width: `${((attendance.present / (attendance.present + attendance.absent)) * 100) || 0}%` }}
                          >
                            {Math.round(((attendance.present / (attendance.present + attendance.absent)) * 100) || 0)}%
                          </div>
                        </div>
                      </div>
                      
                      {/* Barra de Faltas */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs sm:text-sm text-white/80">❌ Faltas</span>
                          <span className="text-xs sm:text-sm font-bold text-red-300">{attendance.absent} dias</span>
                        </div>
                        <div className="h-6 sm:h-8 bg-white/10 rounded-lg overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-red-500 to-rose-400 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold transition-all duration-1000"
                            style={{ width: `${((attendance.absent / (attendance.present + attendance.absent)) * 100) || 0}%` }}
                          >
                            {Math.round(((attendance.absent / (attendance.present + attendance.absent)) * 100) || 0)}%
                          </div>
                        </div>
                      </div>
                      
                      {/* Total de Horas */}
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-white/80">⏱️ Total de Horas</span>
                          <span className="text-base sm:text-lg font-bold text-blue-300">{attendance.totalHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] sm:text-xs text-white/60">Média por dia presente</span>
                          <span className="text-xs sm:text-sm font-semibold text-blue-200">
                            {attendance.present > 0 ? (attendance.totalHours / attendance.present).toFixed(1) : '0.0'}h
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Estatísticas */}
              {adConfig.ec_show_stats && attendance && (
                <>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2 drop-shadow-lg">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300 drop-shadow" />
                      {format(new Date(attendance.month + '-01'), 'MMMM yyyy', { locale: ptBR })}
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="backdrop-blur-xl bg-green-500/20 border-2 border-green-300/30 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center shadow-lg hover:scale-105 transition-transform duration-300">
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-200 mx-auto mb-1 sm:mb-2 drop-shadow" />
                        <p className="text-xl sm:text-2xl font-bold text-white drop-shadow">{attendance.present}</p>
                        <p className="text-[10px] sm:text-xs text-green-100 font-medium">Presenças</p>
                      </div>
                      
                      <div className="backdrop-blur-xl bg-red-500/20 border-2 border-red-300/30 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center shadow-lg hover:scale-105 transition-transform duration-300">
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-200 mx-auto mb-1 sm:mb-2 drop-shadow" />
                        <p className="text-xl sm:text-2xl font-bold text-white drop-shadow">{attendance.absent}</p>
                        <p className="text-[10px] sm:text-xs text-red-100 font-medium">Faltas</p>
                      </div>
                      
                      <div className="backdrop-blur-xl bg-blue-500/20 border-2 border-blue-300/30 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center shadow-lg hover:scale-105 transition-transform duration-300">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-200 mx-auto mb-1 sm:mb-2 drop-shadow" />
                        <p className="text-xl sm:text-2xl font-bold text-white drop-shadow">{attendance.totalHours.toFixed(1)}h</p>
                        <p className="text-[10px] sm:text-xs text-blue-100 font-medium">Total</p>
                      </div>
                    </div>
                    
                    {/* Férias e Feriados */}
                    {adConfig.ec_show_vacation_holidays && ((attendance.vacation && attendance.vacation > 0) || (attendance.holidays && attendance.holidays > 0)) && (
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3">
                        {attendance.vacation && attendance.vacation > 0 && (
                          <div className="backdrop-blur-xl bg-amber-500/20 border-2 border-amber-300/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center shadow-lg hover:scale-105 transition-transform duration-300">
                            <p className="text-lg sm:text-xl font-bold text-white drop-shadow">{attendance.vacation}</p>
                            <p className="text-[10px] sm:text-xs text-amber-100 font-medium">🏖️ Dias de Férias</p>
                          </div>
                        )}
                        {attendance.holidays && attendance.holidays > 0 && (
                          <div className="backdrop-blur-xl bg-purple-500/20 border-2 border-purple-300/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center shadow-lg hover:scale-105 transition-transform duration-300">
                            <p className="text-lg sm:text-xl font-bold text-white drop-shadow">{attendance.holidays}</p>
                            <p className="text-[10px] sm:text-xs text-purple-100 font-medium">🎉 Feriados</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Últimos Registros */}
              {adConfig.ec_show_records_list && attendance && (
                <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white mb-2 sm:mb-3 uppercase tracking-wide drop-shadow-lg">
                      📋 Últimos Registros
                    </h3>
                    
                    <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                      {attendance.records && attendance.records.length > 0 ? (
                        attendance.records.slice(0, adConfig.ec_records_limit).map((record, index) => {
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
                          
                          // Determinar se é dia de folga
                          const dayOfWeek = recordDate.getDay() // 0=dom, 6=sab
                          const workdays = attendance.workdays || []
                          const isWorkday = workdays.length === 0 || workdays.includes(dayOfWeek)
                          
                          // Determinar status do dia - agora usa status da API
                          let dayStatus = record.status || 'present'
                          let statusLabel = record.statusLabel || 'Presente'
                          
                          // Se não tem status da API, determinar localmente
                          if (!record.status) {
                            if (!checkInTime || checkInTime === '00:00:00') {
                              if (!isWorkday) {
                                dayStatus = 'off'
                                statusLabel = 'Folga'
                              } else {
                                dayStatus = 'absent'
                                statusLabel = 'Falta'
                              }
                            }
                          }
                          
                          // Definir estilos baseado no status
                          const getStatusStyles = () => {
                            switch (dayStatus) {
                              case 'vacation':
                                return {
                                  card: 'backdrop-blur-xl bg-amber-500/20 border-amber-300/30 hover:bg-amber-500/30',
                                  badge: 'bg-amber-500/30 border-amber-300/40 text-amber-100'
                                }
                              case 'holiday':
                                return {
                                  card: 'backdrop-blur-xl bg-purple-500/20 border-purple-300/30 hover:bg-purple-500/30',
                                  badge: 'bg-purple-500/30 border-purple-300/40 text-purple-100'
                                }
                              case 'present':
                                return {
                                  card: 'backdrop-blur-xl bg-green-500/20 border-green-300/30 hover:bg-green-500/30',
                                  badge: 'bg-green-500/30 border-green-300/40 text-green-100'
                                }
                              case 'off':
                                return {
                                  card: 'backdrop-blur-xl bg-gray-500/20 border-gray-300/30 hover:bg-gray-500/30',
                                  badge: 'bg-gray-500/30 border-gray-300/40 text-gray-100'
                                }
                              case 'absent':
                              default:
                                return {
                                  card: 'backdrop-blur-xl bg-red-500/20 border-red-300/30 hover:bg-red-500/30',
                                  badge: 'bg-red-500/30 border-red-300/40 text-red-100'
                                }
                            }
                          }
                          
                          const styles = getStatusStyles()
                          
                          // Emoji para o status
                          const statusEmoji = dayStatus === 'vacation' ? '🏖️' : 
                                              dayStatus === 'holiday' ? '🎉' :
                                              dayStatus === 'present' ? '✅' :
                                              dayStatus === 'off' ? '😴' : '❌'
                          
                          return (
                            <div
                              key={index}
                              className={`rounded-lg p-3 sm:p-4 border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${styles.card}`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                <span className="font-semibold text-white text-xs sm:text-sm drop-shadow">
                                  {format(recordDate, "dd/MM/yyyy - EEEE", { locale: ptBR })}
                                </span>
                                <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full backdrop-blur-xl border self-start sm:self-auto ${styles.badge}`}>
                                  {statusEmoji} {statusLabel}
                                </span>
                              </div>
                              
                              {dayStatus === 'present' && (
                                <div className="flex items-center flex-wrap gap-2 text-xs sm:text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-green-500/30 backdrop-blur-xl rounded border border-green-300/40">
                                      <span className="text-green-200 font-bold text-xs drop-shadow">↓</span>
                                    </div>
                                    <span className="font-semibold text-white drop-shadow">
                                      {checkInTime.substring(0, 5)}
                                    </span>
                                  </div>
                                  <span className="text-white/50 text-xs">→</span>
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-red-500/30 backdrop-blur-xl rounded border border-red-300/40">
                                      <span className="text-red-200 font-bold text-xs drop-shadow">↑</span>
                                    </div>
                                    <span className="font-semibold text-white drop-shadow">
                                      {checkOutTime ? checkOutTime.substring(0, 5) : '--:--'}
                                    </span>
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium text-yellow-200 bg-yellow-500/20 backdrop-blur-xl border border-yellow-300/30 px-2 py-1 rounded drop-shadow ml-auto">
                                    {record.hours.toFixed(1)}h
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-6 sm:py-8 text-white/70">
                          <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50 drop-shadow" />
                          <p className="text-xs sm:text-sm drop-shadow">Nenhum registro encontrado neste mês</p>
                        </div>
                      )}
                    </div>
                </div>
              )}

              {/* Botão Nova Consulta */}
              {attendance && (
                <button
                  onClick={handleReset}
                  className="w-full backdrop-blur-xl bg-white/20 hover:bg-white/30 border-2 border-white/30 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Nova Consulta</span>
                </button>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Botão Voltar */}
        <Link
          to="/admin/login"
          className="flex items-center justify-center gap-2 text-white hover:text-cyan-200 font-bold transition-colors drop-shadow-lg text-sm sm:text-base mt-2 sm:mt-0"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Fazer Login
        </Link>
      </div>

      {/* Propaganda Sutil - Mobile */}
      {showAd && adConfig.ad_enabled && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
          <div 
            className="mx-2 mb-2 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
            style={{ 
              background: `linear-gradient(to right, ${adConfig.ad_bg_color_from}f2, ${adConfig.ad_bg_color_to}f2)` 
            }}
          >
            {/* Botão fechar */}
            <button
              onClick={dismissAd}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            
            <div className="p-4">
              <div className="flex items-center gap-4">
                {/* Logo/Imagem da Propaganda */}
                <div className="flex-shrink-0">
                  {adConfig.ad_image_url ? (
                    <img 
                      src={adConfig.ad_image_url} 
                      alt={adConfig.ad_title}
                      className="w-16 h-16 object-contain rounded-lg bg-white/10 p-1"
                      onError={(e) => {
                        // Fallback caso a imagem não exista
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-16 h-16 bg-white/20 rounded-lg items-center justify-center"
                    style={{ display: adConfig.ad_image_url ? 'none' : 'flex' }}
                  >
                    <span className="text-2xl">🏛️</span>
                  </div>
                </div>
                
                {/* Texto */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm leading-tight">
                    {adConfig.ad_title}
                  </p>
                  {adConfig.ad_subtitle && (
                    <p className="text-yellow-300 text-xs font-semibold mt-1 italic">
                      "{adConfig.ad_subtitle}"
                    </p>
                  )}
                </div>
              </div>
              
              <button
                onClick={dismissAd}
                className="w-full mt-3 bg-white/20 hover:bg-white/30 text-white font-medium text-xs py-2 px-3 rounded-lg transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Style */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}
