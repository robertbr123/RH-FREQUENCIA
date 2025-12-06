import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../../context/PortalAuthContext';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Snowfall, ChristmasBackground } from '../../components/christmas';

export default function PortalChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { changePassword, mustChangePassword } = usePortalAuth();
  const navigate = useNavigate();

  const validatePassword = (password: string) => {
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      navigate('/portal');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <ChristmasBackground />
      <Snowfall count={25} />

      <div className="relative max-w-md w-full">
        <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 backdrop-blur-xl border border-yellow-500/30 rounded-2xl mb-4">
              <Lock className="w-8 h-8 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {mustChangePassword ? 'Criar Nova Senha' : 'Alterar Senha'}
            </h2>
            <p className="text-sm text-white/70">
              {mustChangePassword 
                ? 'Por segurança, crie uma nova senha para acessar o portal.'
                : 'Digite sua senha atual e a nova senha desejada.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Erro */}
            {error && (
              <div className="bg-red-500/20 backdrop-blur-xl border border-red-300/30 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
                  <p className="text-sm text-white font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Senha Atual (apenas se não for primeiro acesso) */}
            {!mustChangePassword && (
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Senha Atual
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-12 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/40 outline-none transition-all"
                    placeholder="Digite sua senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Nova Senha */}
            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-11 pr-12 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/40 outline-none transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-12 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/40 outline-none transition-all"
                  placeholder="Digite novamente"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Indicador de senhas iguais */}
              {confirmPassword && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${
                  newPassword === confirmPassword ? 'text-green-400' : 'text-red-400'
                }`}>
                  {newPassword === confirmPassword ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Senhas coincidem</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span>Senhas não coincidem</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Salvando...
                </span>
              ) : (
                'Salvar Nova Senha'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center pt-6 mt-6 border-t border-white/10">
            <p className="text-xs text-white/50">
              Sua senha é pessoal e intransferível
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
