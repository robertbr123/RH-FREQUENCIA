import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Calendar, Sun, Clock, CheckCircle, 
  XCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { Snowfall } from '../../components/christmas';

interface Vacation {
  id: number;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  notes: string;
}

interface VacationBalance {
  acquired_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
  hire_date: string;
  next_acquisition_date: string;
}

export default function PortalVacations() {
  const navigate = useNavigate();
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [balance, setBalance] = useState<VacationBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVacations();
  }, []);

  const loadVacations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/portal/vacations');
      setVacations(response.data.vacations || []);
      setBalance(response.data.balance || null);
    } catch (err: any) {
      console.error('Erro ao carregar férias:', err);
      setError(err.response?.data?.error || 'Erro ao carregar dados de férias');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/20';
      default: return 'text-white/50 bg-white/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'rejected': return 'Rejeitado';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pb-24">
      <Snowfall count={15} />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate('/portal')} className="text-white flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <h1 className="text-white font-semibold">Minhas Férias</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-20 px-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-white">{error}</p>
          </div>
        ) : (
          <>
            {/* Saldo de Férias */}
            {balance && (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-6">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Sun className="w-5 h-5 text-yellow-400" />
                  Saldo de Férias
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/10 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">{balance.available_days}</p>
                    <p className="text-white/60 text-sm">Dias Disponíveis</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-400">{balance.used_days}</p>
                    <p className="text-white/60 text-sm">Dias Utilizados</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/50">Data de Admissão</p>
                    <p className="text-white">{formatDate(balance.hire_date)}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Próxima Aquisição</p>
                    <p className="text-white">{formatDate(balance.next_acquisition_date)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Histórico de Férias */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Histórico de Férias
                </h2>
              </div>

              {vacations.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/50">Nenhum registro de férias encontrado</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {vacations.map((vacation) => (
                    <div key={vacation.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-medium">
                            {formatDate(vacation.start_date)} - {formatDate(vacation.end_date)}
                          </p>
                          <p className="text-white/60 text-sm mt-1">
                            {vacation.days} dias
                          </p>
                          {vacation.notes && (
                            <p className="text-white/40 text-xs mt-1">{vacation.notes}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(vacation.status || 'completed')}`}>
                          {getStatusLabel(vacation.status || 'completed')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Informação */}
            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-400 text-sm flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  Para solicitar férias, entre em contato com o setor de RH da sua empresa.
                </span>
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
