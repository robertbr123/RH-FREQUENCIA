import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../../context/PortalAuthContext';
import { AlertCircle, Eye, EyeOff, User, Lock, ArrowLeft } from 'lucide-react';
import { Snowfall, ChristmasLights, ChristmasBackground } from '../../components/christmas';

export default function PortalLogin() {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  const { login } = usePortalAuth();
  const navigate = useNavigate();

  // Formatar CPF enquanto digita
  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setShakeError(false);
    setLoading(true);

    try {
      await login(cpf, password);
      // Verificar se precisa trocar senha (do localStorage após login)
      const mustChange = localStorage.getItem('portal_must_change_password') === 'true';
      if (mustChange) {
        navigate('/portal/trocar-senha');
      } else {
        navigate('/portal');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao fazer login';
      setError(errorMessage);
      setShakeError(true);
      setTimeout(() => setShakeError(false), 650);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Efeitos de Natal */}
      <ChristmasBackground />
      <Snowfall count={30} />

      <div className="relative max-w-md w-full">
        {/* Card Principal */}
        <div className={`
          backdrop-blur-2xl bg-white/10 border border-white/20 
          rounded-3xl shadow-2xl p-8 transition-transform duration-150
          ${shakeError ? 'animate-shake' : ''}
        `}>
          <ChristmasLights count={10} />

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500/30 to-purple-500/30 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Portal do Funcionário
            </h2>
            <p className="text-sm text-white/70">
              Acesse com seu CPF e senha
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

            {/* Campo CPF */}
            <div>
              <label htmlFor="cpf" className="block text-sm font-semibold text-white/90 mb-2">
                CPF
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  id="cpf"
                  type="text"
                  required
                  value={cpf}
                  onChange={handleCpfChange}
                  maxLength={14}
                  className="w-full pl-11 pr-4 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/40 outline-none transition-all"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/40 outline-none transition-all"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Info primeiro acesso */}
            <div className="bg-blue-500/20 border border-blue-300/30 rounded-xl p-3">
              <p className="text-xs text-blue-200">
                <strong>Primeiro acesso?</strong> Use sua data de nascimento como senha (ddmmaaaa).
                Exemplo: 15031990
              </p>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Voltar para login admin */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <a
              href="/login"
              className="flex items-center justify-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o login administrativo
            </a>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 mt-4">
            <p className="text-xs text-white/50">
              &copy; {new Date().getFullYear()} Sistema RH
            </p>
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
  );
}
