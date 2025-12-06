import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, Search, Eye, EyeOff, AlertTriangle, User } from 'lucide-react'
import { useCapsLock } from '../hooks'

// Componentes de Natal
import { 
  Snowfall, 
  ChristmasLights, 
  ChristmasDecorations, 
  ChristmasBackground 
} from '../components/christmas'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [shakeError, setShakeError] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const isCapsLock = useCapsLock()
  const { login } = useAuth()
  const navigate = useNavigate()

  // Carregar "lembrar-me" do localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername')
    if (savedUsername) {
      setUsername(savedUsername)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setShakeError(false)
    setLoading(true)

    try {
      await login(username, password)
      
      // Salvar ou remover username do localStorage
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username)
      } else {
        localStorage.removeItem('rememberedUsername')
      }
      
      navigate('/admin')
    } catch (err: any) {
      console.error('Login error:', err)
      const errorMessage = err.response?.data?.error || err.message || 'Erro ao fazer login. Verifique suas credenciais.'
      setError(String(errorMessage))
      
      setShakeError(true)
      setTimeout(() => setShakeError(false), 650)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Efeitos de Natal */}
      <ChristmasBackground />
      <Snowfall count={35} />
      
      <div className="relative max-w-md w-full">
        {/* Decorações */}
        <ChristmasDecorations />
        
        {/* Card Principal */}
        <div className={`
          backdrop-blur-2xl bg-gradient-to-br from-red-900/25 via-green-900/20 to-red-800/25 
          border-2 border-white/30 rounded-3xl shadow-2xl p-8 
          transition-transform duration-150 relative overflow-hidden
          ${shakeError ? 'animate-shake' : ''}
        `}>
          {/* Luzes no topo do card */}
          <ChristmasLights count={12} />
          
          {/* Brilho interno sutil */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/5 via-transparent to-red-200/5 pointer-events-none" />
          
          <div className="relative z-10">
            {/* Logo e título */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500/30 via-green-500/30 to-yellow-500/30 backdrop-blur-xl border-2 border-white/40 rounded-2xl shadow-2xl mb-4 p-2">
                <img 
                  src="https://i.ibb.co/0RnSrqZ6/25567603-3f23-4326-bf53-bfb5b7ef6011.jpg" 
                  alt="RH System Logo" 
                  className="w-full h-full object-contain opacity-90"
                />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-red-200 via-yellow-100 to-green-200 bg-clip-text text-transparent mb-2">
                🎄 RH SYSTEM 🎄
              </h2>
              <p className="text-sm text-yellow-100/90 font-medium">
                ✨ Feliz Natal! ✨
              </p>
              <p className="text-xs text-white/70 mt-1">
                Sistema de Gestão de RH
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Erro */}
              {error && (
                <div className="bg-red-500/20 backdrop-blur-xl border border-red-300/30 p-3 rounded-xl animate-slideDown">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
                    <p className="text-sm text-white font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Campos */}
              <div className="space-y-4">
                {/* Usuário */}
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-white/90 mb-2">
                    Usuário
                  </label>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:border-white/40 outline-none transition-all duration-200 hover:border-white/30"
                    placeholder="Digite seu usuário"
                    autoComplete="username"
                  />
                </div>

                {/* Senha */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:border-white/40 outline-none transition-all duration-200 hover:border-white/30"
                      placeholder="Digite sua senha"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Aviso de Caps Lock */}
                  {isCapsLock && (
                    <div className="flex items-center gap-1.5 mt-2 text-yellow-300 text-xs animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Caps Lock está ativado</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lembrar-me */}
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/30 bg-white/10 text-green-500 focus:ring-green-500/50 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-white/80 cursor-pointer select-none">
                  Lembrar meu usuário
                </label>
              </div>

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-white/20 backdrop-blur-xl hover:bg-white/30 border border-white/30 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Entrando...
                  </span>
                ) : (
                  'Entrar no Sistema'
                )}
              </button>
            </form>

            {/* Divisor */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white/10 backdrop-blur-xl rounded-full text-white/80 font-medium">ou</span>
              </div>
            </div>

            {/* Botão de Consulta */}
            <Link
              to="/employee-check"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/10 backdrop-blur-xl hover:bg-white/20 border border-white/20 hover:border-white/30 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Search className="w-5 h-5" />
              Consultar Minha Frequência
            </Link>

            {/* Link para Portal do Funcionário */}
            <Link
              to="/portal/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-400/30 hover:border-blue-400/50 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] mt-3"
            >
              <User className="w-5 h-5" />
              Portal do Funcionário
            </Link>

            {/* Footer */}
            <div className="text-center pt-6 mt-6 border-t border-white/10">
              <p className="text-xs text-white/60 font-medium">
                &copy; {new Date().getFullYear()} Sistema RH. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Animação de shake */}
      <style>{`
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
