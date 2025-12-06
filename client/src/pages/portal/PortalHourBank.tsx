import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, TrendingUp, TrendingDown, Clock, Calendar,
  Loader2, AlertCircle
} from 'lucide-react';
import { Snowfall } from '../../components/christmas';

interface HourBankData {
  days_worked: number;
  total_worked: number;
  total_expected: number;
  balance: number;
  work_hours_per_day: number;
}

export default function PortalHourBank() {
  const navigate = useNavigate();
  const [data, setData] = useState<HourBankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHourBank();
  }, []);

  const loadHourBank = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/portal/hour-bank');
      setData(response.data);
    } catch (err) {
      console.error('Erro ao carregar banco de horas:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(Math.abs(hours));
    const m = Math.round((Math.abs(hours) - h) * 60);
    const sign = hours < 0 ? '-' : '+';
    return `${sign}${h}h${m.toString().padStart(2, '0')}min`;
  };

  const formatHoursSimple = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}min`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pb-24">
      <Snowfall count={15} />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate('/portal')} className="text-white flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white font-semibold">Banco de Horas</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-20 pb-8 px-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : data && (
          <>
            {/* Card Principal - Saldo */}
            <div className={`rounded-2xl p-6 border ${
              data.balance >= 0 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  data.balance >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {data.balance >= 0 ? (
                    <TrendingUp className="w-8 h-8 text-green-400" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-400" />
                  )}
                </div>
                
                <p className="text-white/60 text-sm mb-1">Saldo Atual</p>
                <p className={`text-4xl font-bold ${
                  data.balance >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatHours(data.balance)}
                </p>
                <p className="text-white/40 text-xs mt-2">Últimos 30 dias</p>
              </div>
            </div>

            {/* Detalhes */}
            <div className="mt-6 space-y-4">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Horas Trabalhadas</p>
                    <p className="text-white font-semibold">{formatHoursSimple(data.total_worked)}</p>
                  </div>
                </div>
                
                {/* Barra de progresso */}
                <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                      data.balance >= 0 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ 
                      width: `${Math.min(100, (data.total_worked / data.total_expected) * 100)}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-white/50">
                  <span>0h</span>
                  <span>Meta: {formatHoursSimple(data.total_expected)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-white/50 text-xs">Dias Trabalhados</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{data.days_worked}</p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span className="text-white/50 text-xs">Carga Diária</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{data.work_hours_per_day}h</p>
                </div>
              </div>
            </div>

            {/* Informações */}
            <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <p className="text-blue-300 text-sm">
                <strong>ℹ️ Como funciona:</strong> O banco de horas é calculado comparando 
                as horas trabalhadas com a carga horária esperada (sua escala). 
                Horas extras geram saldo positivo, horas a menos geram saldo negativo.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
