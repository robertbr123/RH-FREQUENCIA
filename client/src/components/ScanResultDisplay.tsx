import { CheckCircle, XCircle, User, Building2, Briefcase, Calendar, ArrowRight, Sparkles, Clock, PartyPopper, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ScanResult {
  success: boolean
  message: string
  type?: 'punch' | 'completed' | 'duplicate' | 'error'
  punch_type?: 'entry' | 'break_start' | 'break_end' | 'exit'
  punch_time?: string
  next_punch?: string
  employee?: {
    id?: number
    name: string
    cpf?: string
    photo_url?: string
    department?: string
    position?: string
    schedule?: string
  }
  today_summary?: {
    entry?: string
    break_start?: string
    break_end?: string
    exit?: string
    hours_worked?: number
  }
}

interface ScanResultDisplayProps {
  result: ScanResult
  getPunchTypeLabel: (type: string) => string
  getPunchTypeColors: (type: string) => {
    bg: string
    border: string
    text: string
    icon: string
  }
  autoHideMessage?: string
}

// Ícones por tipo de ponto
const PUNCH_ICONS: Record<string, string> = {
  entry: '🌅',
  break_start: '☕',
  break_end: '💪',
  exit: '🌙'
}

// Mensagens motivacionais por tipo de ponto
const PUNCH_MESSAGES: Record<string, string[]> = {
  entry: ['Bom trabalho!', 'Vamos com tudo!', 'Excelente dia!', 'Sucesso hoje!'],
  break_start: ['Bom descanso!', 'Relaxe um pouco!', 'Aproveite!', 'Merecido!'],
  break_end: ['Vamos lá!', 'Força total!', 'Quase lá!', 'Continue assim!'],
  exit: ['Até amanhã!', 'Bom descanso!', 'Missão cumprida!', 'Ótimo trabalho!']
}

function getRandomMessage(type: string): string {
  const messages = PUNCH_MESSAGES[type] || ['Registrado!']
  return messages[Math.floor(Math.random() * messages.length)]
}

export default function ScanResultDisplay({
  result,
  getPunchTypeLabel,
  getPunchTypeColors,
  autoHideMessage = 'Reiniciando automaticamente...'
}: ScanResultDisplayProps) {
  const colors = result.success && result.punch_type
    ? getPunchTypeColors(result.punch_type)
    : { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', icon: 'text-gray-600' }

  const punchIcon = result.punch_type ? PUNCH_ICONS[result.punch_type] : '⏰'
  const motivationalMessage = result.punch_type ? getRandomMessage(result.punch_type) : ''

  // ========================================
  // CASO: Todos os pontos já registrados
  // ========================================
  if (result.type === 'completed') {
    return (
      <div className="w-full animate-scaleIn">
        <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-300">
          {/* Confetti effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-4 left-4 text-3xl animate-bounce">🎉</div>
            <div className="absolute top-4 right-4 text-3xl animate-bounce delay-100">🎊</div>
            <div className="absolute bottom-20 left-8 text-2xl animate-bounce delay-200">✨</div>
            <div className="absolute bottom-20 right-8 text-2xl animate-bounce delay-300">⭐</div>
          </div>

          <div className="relative p-6 sm:p-8">
            {/* Ícone principal */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-xl">
                <PartyPopper className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Título */}
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-purple-900 mb-2">
              Dia Completo! 🏆
            </h2>

            {/* Nome do funcionário */}
            {result.employee?.name && (
              <p className="text-lg text-center text-purple-700 font-medium mb-4">
                Parabéns, {result.employee.name.split(' ')[0]}!
              </p>
            )}

            {/* Mensagem */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4">
              <p className="text-center text-gray-700">
                {result.message}
              </p>
            </div>

            {/* Timeline do dia completo */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 text-center p-2 rounded-lg bg-green-100 text-green-800">
                  <span className="text-lg">🌅</span>
                  <p className="text-xs font-medium mt-1">✓</p>
                </div>
                <div className="w-2 h-0.5 bg-purple-300" />
                <div className="flex-1 text-center p-2 rounded-lg bg-yellow-100 text-yellow-800">
                  <span className="text-lg">☕</span>
                  <p className="text-xs font-medium mt-1">✓</p>
                </div>
                <div className="w-2 h-0.5 bg-purple-300" />
                <div className="flex-1 text-center p-2 rounded-lg bg-blue-100 text-blue-800">
                  <span className="text-lg">💪</span>
                  <p className="text-xs font-medium mt-1">✓</p>
                </div>
                <div className="w-2 h-0.5 bg-purple-300" />
                <div className="flex-1 text-center p-2 rounded-lg bg-purple-100 text-purple-800">
                  <span className="text-lg">🌙</span>
                  <p className="text-xs font-medium mt-1">✓</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-purple-100/50 px-6 py-3">
            <p className="text-center text-sm text-purple-600 animate-pulse">
              {autoHideMessage}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ========================================
  // CASO: Ponto duplicado (menos de 1 min)
  // ========================================
  if (result.type === 'duplicate') {
    return (
      <div className="w-full animate-scaleIn">
        <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300">
          <div className="relative p-6 sm:p-8">
            {/* Ícone de aviso */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-xl">
                <Clock className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-center text-amber-900 mb-2">
              Aguarde um Momento ⏱️
            </h2>

            {/* Nome do funcionário */}
            {result.employee?.name && (
              <p className="text-lg text-center text-amber-700 font-medium mb-4">
                Olá, {result.employee.name.split(' ')[0]}!
              </p>
            )}

            {/* Mensagem */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-center gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <p className="text-center text-gray-700">
                  {result.message}
                </p>
              </div>
              <p className="text-center text-sm text-amber-600 mt-3 font-medium">
                Aguarde 1 minuto entre registros
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-amber-100/50 px-6 py-3">
            <p className="text-center text-sm text-amber-600 animate-pulse">
              {autoHideMessage}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ========================================
  // CASO: Registro de ponto com sucesso
  // ========================================
  if (result.success) {
    return (
      <div className="w-full animate-scaleIn">
        {/* Card principal com gradiente */}
        <div className={`
          relative overflow-hidden rounded-3xl shadow-2xl
          ${colors.bg} ${colors.border} border-2
          transform transition-all duration-500
        `}>
          {/* Efeito de brilho animado */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -inset-[100%] animate-[spin_20s_linear_infinite] opacity-30">
              <div className="absolute top-1/2 left-1/2 w-[200%] h-8 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-white to-transparent" />
            </div>
          </div>

          <div className="relative p-6 sm:p-8">
            {/* Header com tipo de ponto */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-4xl animate-bounce">{punchIcon}</span>
              <div className="text-center">
                <h2 className={`text-2xl sm:text-3xl font-bold ${colors.text}`}>
                  {getPunchTypeLabel(result.punch_type || '')}
                </h2>
                <p className={`text-sm font-medium ${colors.text} opacity-80`}>
                  {result.punch_time || format(new Date(), 'HH:mm', { locale: ptBR })}
                </p>
              </div>
              <Sparkles className={`w-8 h-8 ${colors.icon} animate-pulse`} />
            </div>

            {/* Foto e info do funcionário */}
            <div className="flex flex-col items-center mb-6">
              {/* Avatar/Foto */}
              <div className="relative mb-4">
                <div className={`
                  w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden
                  ring-4 ${colors.border.replace('border', 'ring')} ring-offset-4 ring-offset-white
                  shadow-xl transform hover:scale-105 transition-transform
                `}>
                  {result.employee?.photo_url ? (
                    <img 
                      src={result.employee.photo_url} 
                      alt={result.employee.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full ${colors.bg} flex items-center justify-center`}>
                      <User className={`w-16 h-16 ${colors.icon} opacity-50`} />
                    </div>
                  )}
                </div>
                {/* Badge de sucesso */}
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 shadow-lg animate-scaleIn">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Nome do funcionário */}
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-1">
                {result.employee?.name || 'Funcionário'}
              </h3>

              {/* Cargo e departamento */}
              {(result.employee?.position || result.employee?.department) && (
                <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600">
                  {result.employee?.position && (
                    <span className="flex items-center gap-1 bg-white/50 px-3 py-1 rounded-full">
                      <Briefcase className="w-4 h-4" />
                      {result.employee.position}
                    </span>
                  )}
                  {result.employee?.department && (
                    <span className="flex items-center gap-1 bg-white/50 px-3 py-1 rounded-full">
                      <Building2 className="w-4 h-4" />
                      {result.employee.department}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Mensagem motivacional */}
            <div className="text-center mb-6">
              <p className={`text-lg font-semibold ${colors.text}`}>
                {motivationalMessage} ✨
              </p>
            </div>

            {/* Próximo ponto */}
            {result.next_punch && (
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 mb-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-600 dark:text-gray-300 text-sm">Próximo:</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{PUNCH_ICONS[result.next_punch] || '⏰'}</span>
                    {getPunchTypeLabel(result.next_punch)}
                  </span>
                </div>
              </div>
            )}

            {/* Resumo do dia - Timeline */}
            {result.today_summary && (
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Hoje
                  </span>
                </div>
                
                {/* Timeline visual */}
                <div className="flex items-center justify-between gap-1 sm:gap-2">
                  {/* Entrada */}
                  <div className={`flex-1 text-center p-2 rounded-lg transition-all ${
                    result.today_summary.entry ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="text-lg">🌅</span>
                    <p className="text-xs font-medium mt-1">
                      {result.today_summary.entry || '--:--'}
                    </p>
                  </div>

                  <div className="w-2 h-0.5 bg-gray-300" />

                  {/* Início Intervalo */}
                  <div className={`flex-1 text-center p-2 rounded-lg transition-all ${
                    result.today_summary.break_start ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="text-lg">☕</span>
                    <p className="text-xs font-medium mt-1">
                      {result.today_summary.break_start || '--:--'}
                    </p>
                  </div>

                  <div className="w-2 h-0.5 bg-gray-300" />

                  {/* Fim Intervalo */}
                  <div className={`flex-1 text-center p-2 rounded-lg transition-all ${
                    result.today_summary.break_end ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="text-lg">💪</span>
                    <p className="text-xs font-medium mt-1">
                      {result.today_summary.break_end || '--:--'}
                    </p>
                  </div>

                  <div className="w-2 h-0.5 bg-gray-300" />

                  {/* Saída */}
                  <div className={`flex-1 text-center p-2 rounded-lg transition-all ${
                    result.today_summary.exit ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="text-lg">🌙</span>
                    <p className="text-xs font-medium mt-1">
                      {result.today_summary.exit || '--:--'}
                    </p>
                  </div>
                </div>

                {/* Horas trabalhadas */}
                {result.today_summary.hours_worked !== undefined && Number(result.today_summary.hours_worked) > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Horas trabalhadas: </span>
                    <span className="font-bold text-green-600 text-lg">
                      {Number(result.today_summary.hours_worked).toFixed(1)}h
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer com auto-hide message */}
          <div className="bg-black/5 dark:bg-white/5 px-6 py-3">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              {autoHideMessage}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Erro - Design clean
  return (
    <div className="w-full animate-shake">
      <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-2 border-red-300 dark:border-red-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 sm:p-8">
          {/* Ícone de erro */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-300" />
            </div>
          </div>

          {/* Título */}
          <h3 className="text-xl font-bold text-red-900 dark:text-red-100 text-center mb-2">
            Ops! Algo deu errado
          </h3>

          {/* Mensagem de erro */}
          <p className="text-red-800 dark:text-red-200 text-center whitespace-pre-line">
            {result.message}
          </p>
        </div>

        {/* Footer */}
        <div className="bg-red-200/50 dark:bg-red-800/30 px-6 py-3">
          <p className="text-center text-sm text-red-700 dark:text-red-300">
            Tente novamente ou procure suporte
          </p>
        </div>
      </div>
    </div>
  )
}
