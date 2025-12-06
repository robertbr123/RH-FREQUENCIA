import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { Clock, TrendingUp, TrendingDown, Calendar, AlertCircle, CheckCircle } from 'lucide-react'

interface HourBankData {
  employee: {
    id: number
    name: string
    schedule: string
    dailyWorkHours: number
  }
  summary: {
    month: number
    year: number
    totalWorkedMinutes: number
    totalWorkedHours: number
    expectedMinutes: number
    expectedHours: number
    balanceMinutes: number
    balanceFormatted: string
    isPositive: boolean
  }
  dailyDetails: Array<{
    date: string
    worked: number
    expected: number
    balance: number
    isWeekend: boolean
    incomplete?: boolean
  }>
}

interface HourBankCardProps {
  employeeId: number
  month?: number
  year?: number
  compact?: boolean
}

export default function HourBankCard({ employeeId, month, year, compact = false }: HourBankCardProps) {
  const [data, setData] = useState<HourBankData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentMonth = month || new Date().getMonth() + 1
  const currentYear = year || new Date().getFullYear()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/attendance/hour-bank/${employeeId}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { month: currentMonth, year: currentYear }
        })
        setData(response.data)
        setError(null)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao carregar banco de horas')
      } finally {
        setLoading(false)
      }
    }

    if (employeeId) {
      fetchData()
    }
  }, [employeeId, currentMonth, currentYear])

  const monthName = useMemo(() => {
    const date = new Date(currentYear, currentMonth - 1)
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }, [currentMonth, currentYear])

  if (loading) {
    return (
      <div className="animate-pulse bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { summary } = data

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        summary.isPositive 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}>
        <div className={`p-2 rounded-lg ${summary.isPositive ? 'bg-green-500' : 'bg-red-500'}`}>
          <Clock className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Banco de Horas</p>
          <p className={`text-lg font-bold ${summary.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {summary.balanceFormatted}
          </p>
        </div>
        {summary.isPositive ? (
          <TrendingUp className="w-5 h-5 text-green-500 ml-auto" />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-500 ml-auto" />
        )}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Banco de Horas</h3>
              <p className="text-white/70 text-sm capitalize">{monthName}</p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${
            summary.isPositive 
              ? 'bg-green-500/30 text-green-100' 
              : 'bg-red-500/30 text-red-100'
          }`}>
            {summary.balanceFormatted}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Horas Trabalhadas</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {summary.totalWorkedHours.toFixed(1)}h
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Horas Esperadas</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {summary.expectedHours}h
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>Progresso do Mês</span>
          <span>{Math.round((summary.totalWorkedHours / summary.expectedHours) * 100)}%</span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              summary.isPositive 
                ? 'bg-gradient-to-r from-green-400 to-green-600' 
                : 'bg-gradient-to-r from-yellow-400 to-orange-500'
            }`}
            style={{ 
              width: `${Math.min(100, (summary.totalWorkedHours / summary.expectedHours) * 100)}%` 
            }}
          />
        </div>
      </div>

      {/* Status */}
      <div className={`px-4 py-3 flex items-center gap-2 ${
        summary.isPositive 
          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
      }`}>
        {summary.isPositive ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Saldo positivo de horas extras</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Horas a compensar: {summary.balanceFormatted.replace('-', '')}</span>
          </>
        )}
      </div>
    </div>
  )
}
