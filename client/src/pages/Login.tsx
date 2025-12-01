import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Clock, AlertCircle, Search, Eye, EyeOff } from 'lucide-react'

// Componente de Floco de Neve
const Snowflake = ({ delay, duration, left }: { delay: number; duration: number; left: string }) => {
  const size = Math.random() * 15 + 8
  return (
    <div
      className="absolute top-0 text-white pointer-events-none select-none drop-shadow-lg"
      style={{
        left,
        animation: `snowfall ${duration}s linear ${delay}s infinite`,
        fontSize: `${size}px`,
        textShadow: '0 0 10px rgba(255,255,255,0.8)'
      }}
    >
      ❄
    </div>
  )
}

// Componente de Estrela Brilhante
const Star = ({ delay, left, top }: { delay: number; left: string; top: string }) => {
  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        left,
        top,
        animation: `twinkle ${2 + Math.random() * 2}s ease-in-out ${delay}s infinite`,
      }}
    >
      ✨
    </div>
  )
}

// Componente de Luz de Natal
const ChristmasLight = ({ delay, left, color }: { delay: number; left: string; color: string }) => {
  return (
    <div
      className="absolute top-0 w-3 h-3 rounded-full pointer-events-none"
      style={{
        left,
        backgroundColor: color,
        boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
        animation: `blink ${1 + Math.random()}s ease-in-out ${delay}s infinite`,
      }}
    />
  )
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [shakeError, setShakeError] = useState(false)
  const [snowflakes, setSnowflakes] = useState<Array<{ id: number; delay: number; duration: number; left: string }>>([])  
  const [stars, setStars] = useState<Array<{ id: number; delay: number; left: string; top: string }>>([])  
  const [christmasLights, setChristmasLights] = useState<Array<{ id: number; delay: number; left: string; color: string }>>([])  
  const { login } = useAuth()
  const navigate = useNavigate()

  // Gerar flocos de neve, estrelas e luzes de Natal
  useEffect(() => {
    // Mais neve!
    const flakes = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      delay: Math.random() * 15,
      duration: Math.random() * 8 + 12, // 12-20 segundos
      left: `${Math.random() * 100}%`,
    }))
    setSnowflakes(flakes)

    // Estrelas cintilantes
    const starArray = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      delay: Math.random() * 3,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
    }))
    setStars(starArray)

    // Luzes de Natal coloridas
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#ff0088']
    const lights = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      delay: Math.random() * 2,
      left: `${Math.random() * 100}%`,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
    setChristmasLights(lights)
  }, [])

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
      {/* Neve Caindo - Efeito de Natal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
        {snowflakes.map((flake) => (
          <Snowflake
            key={flake.id}
            delay={flake.delay}
            duration={flake.duration}
            left={flake.left}
          />
        ))}
      </div>

      {/* Estrelas Cintilantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-40">
        {stars.map((star) => (
          <Star
            key={star.id}
            delay={star.delay}
            left={star.left}
            top={star.top}
          />
        ))}
      </div>

      {/* Luzes de Natal Piscantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
        {christmasLights.map((light) => (
          <ChristmasLight
            key={light.id}
            delay={light.delay}
            left={light.left}
            color={light.color}
          />
        ))}
      </div>

      {/* Background temático de Natal */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1482517967863-00e15c9b44be?q=80&w=2070")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        ></div>
        {/* Overlay gradiente natalino */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/50 via-green-900/50 to-red-800/50"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-green-950/60 via-transparent to-red-950/40"></div>
      </div>
      
      {/* Brilho mágico de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-[500px] h-[500px] bg-green-500/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-yellow-400/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-red-400/15 rounded-full blur-3xl animate-float"></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Decoração de Natal */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-6xl animate-float drop-shadow-2xl">
          🎄
        </div>
        <div className="absolute -top-8 left-8 text-3xl animate-float-delayed drop-shadow-xl">
          🎅
        </div>
        <div className="absolute -top-8 right-8 text-3xl animate-float-slow drop-shadow-xl">
          🎁
        </div>
        
        {/* Card com Glassmorphism - Tema Natal */}
        <div className={`backdrop-blur-2xl bg-gradient-to-br from-red-900/20 via-green-900/20 to-red-800/20 border-2 border-white/30 rounded-3xl shadow-2xl p-8 transition-transform duration-150 relative overflow-hidden ${
          shakeError ? 'animate-shake' : ''
        }`}>
          {/* Brilho interno */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/10 via-transparent to-red-200/10 pointer-events-none"></div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-green-500 to-red-500 animate-pulse"></div>
          
          {/* Conteúdo do card */}
          <div className="relative z-10">
            {/* Logo e título */}
            <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-red-500/30 via-green-500/30 to-yellow-500/30 backdrop-blur-xl border-2 border-white/40 rounded-2xl shadow-2xl mb-4 transform transition-transform hover:scale-110 hover:rotate-6 duration-300 p-2 animate-pulse">
              <img 
                src="https://i.ibb.co/0RnSrqZ6/25567603-3f23-4326-bf53-bfb5b7ef6011.jpg" 
                alt="RH System Logo" 
                className="w-full h-full object-contain opacity-90"
              />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-red-200 via-yellow-100 to-green-200 bg-clip-text text-transparent mb-2 drop-shadow-2xl">
              🎄 RH SYSTEM 🎄
            </h2>
            <p className="text-sm text-yellow-100 font-bold drop-shadow-lg animate-pulse">
              ✨ Feliz Natal! ✨
            </p>
            <p className="text-xs text-white/80 font-medium mt-1">
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

      {/* Animações de Natal */}
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10vh) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) translateX(100px) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
          }
        }
        
        @keyframes blink {
          0%, 100% {
            opacity: 0.4;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  )
}
