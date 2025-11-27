import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Clock, AlertCircle, Search, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [shakeError, setShakeError] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setShakeError(false)
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err: any) {
      console.error('Login error:', err)
      const errorMessage = err.response?.data?.error || err.message || 'Erro ao fazer login. Verifique suas credenciais.'
      setError(String(errorMessage))
      
      // Trigger shake animation
      setShakeError(true)
      setTimeout(() => setShakeError(false), 650)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background com imagem do espaço girando */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-50 animate-earth-zoom"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        ></div>
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 via-blue-500/40 to-cyan-500/40"></div>
      </div>
      
      {/* Formas geométricas flutuantes de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-float-slow"></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Card com Glassmorphism */}
        <div className={`backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 transition-transform duration-150 ${shakeError ? 'animate-shake' : ''}`}>
          {/* Logo e título */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg mb-4 transform transition-transform hover:scale-110 duration-300 p-2">
              <img 
                src="https://i.ibb.co/0RnSrqZ6/25567603-3f23-4326-bf53-bfb5b7ef6011.jpg" 
                alt="RH System Logo" 
                className="w-full h-full object-contain opacity-90"
              />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
              RH SYSTEM
            </h2>
            <p className="text-sm text-white/80 font-medium">
              Sistema de Gestão de RH
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/20 backdrop-blur-xl border border-red-300/30 p-3 rounded-xl animate-slideDown">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
                  <p className="text-sm text-white font-medium">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-white/90 mb-2 drop-shadow">
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

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-2 drop-shadow">
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
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 drop-shadow" />
                    ) : (
                      <Eye className="w-5 h-5 drop-shadow" />
                    )}
                  </button>
                </div>
              </div>
            </div>

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

          <div className="text-center pt-6 mt-6 border-t border-white/10">
            <p className="text-xs text-white/60 font-medium">
              &copy; {new Date().getFullYear()} Sistema RH. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
