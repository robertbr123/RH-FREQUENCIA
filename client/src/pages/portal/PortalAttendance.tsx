import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Calendar, Clock, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { Snowfall } from '../../components/christmas';
import { SkeletonAttendanceList } from '../../components/portal/Skeleton';

interface AttendanceRecord {
  date: string;
  entry_time: string | null;
  break_start: string | null;
  break_end: string | null;
  exit_time: string | null;
}

export default function PortalAttendance() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadAttendance();
  }, [currentMonth, currentYear]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/portal/attendance?month=${currentMonth}&year=${currentYear}`);
      setRecords(response.data);
    } catch (error) {
      console.error('Erro ao carregar frequência:', error);
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Ajustar para timezone local
    const [year, month, day] = dateStr.split('T')[0].split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
  };

  const isComplete = (record: AttendanceRecord) => {
    return record.entry_time && record.exit_time;
  };

  const isAbsent = (record: AttendanceRecord) => {
    return !record.entry_time && !record.exit_time && !record.break_start && !record.break_end;
  };

  const getRecordStatus = (record: AttendanceRecord): 'complete' | 'incomplete' | 'absent' => {
    if (isAbsent(record)) return 'absent';
    if (isComplete(record)) return 'complete';
    return 'incomplete';
  };

  const calculateHours = (record: AttendanceRecord) => {
    if (!record.entry_time || !record.exit_time) return null;

    const entry = record.entry_time.split(':').map(Number);
    const exit = record.exit_time.split(':').map(Number);
    
    let entryMinutes = entry[0] * 60 + entry[1];
    let exitMinutes = exit[0] * 60 + exit[1];

    // Descontar intervalo se houver
    if (record.break_start && record.break_end) {
      const breakStart = record.break_start.split(':').map(Number);
      const breakEnd = record.break_end.split(':').map(Number);
      const breakMinutes = (breakEnd[0] * 60 + breakEnd[1]) - (breakStart[0] * 60 + breakStart[1]);
      exitMinutes -= breakMinutes;
    }

    const totalMinutes = exitMinutes - entryMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Snowfall count={15} />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate('/portal')} className="text-white flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <h1 className="text-white font-semibold">Meu Ponto</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-20 pb-8 px-4 max-w-2xl mx-auto">
        {/* Seletor de Mês */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 mb-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={previousMonth}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">
                {monthNames[currentMonth - 1]} {currentYear}
              </p>
              <p className="text-white/50 text-sm">
                {records.length} registros
              </p>
            </div>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all"
              disabled={currentMonth === new Date().getMonth() + 1 && currentYear === new Date().getFullYear()}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lista de Registros */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          {loading ? (
            <SkeletonAttendanceList rows={8} />
          ) : records.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/50">Nenhum registro neste mês</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {/* Cabeçalho */}
              <div className="grid grid-cols-6 gap-2 p-3 bg-white/5 text-white/50 text-xs font-medium">
                <div>Data</div>
                <div className="text-center">Entrada</div>
                <div className="text-center">Int. Início</div>
                <div className="text-center">Int. Fim</div>
                <div className="text-center">Saída</div>
                <div className="text-right">Total</div>
              </div>

              {/* Registros */}
              {records.map((record) => {
                const status = getRecordStatus(record);
                return (
                  <div 
                    key={record.date}
                    className={`grid grid-cols-6 gap-2 p-3 text-sm ${
                      status === 'incomplete' ? 'bg-yellow-500/5' :
                      status === 'absent' ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <div className="text-white/80 capitalize text-xs">
                      {formatDate(record.date)}
                    </div>
                    <div className="text-center font-mono text-white">
                      {record.entry_time || <span className="text-white/30">--:--</span>}
                    </div>
                    <div className="text-center font-mono text-white">
                      {record.break_start || <span className="text-white/30">--:--</span>}
                    </div>
                    <div className="text-center font-mono text-white">
                      {record.break_end || <span className="text-white/30">--:--</span>}
                    </div>
                    <div className="text-center font-mono text-white">
                      {record.exit_time || <span className="text-white/30">--:--</span>}
                    </div>
                    <div className="text-right flex items-center justify-end gap-1">
                      {status === 'complete' ? (
                        <>
                          <span className="text-green-400 font-medium">
                            {calculateHours(record)}
                          </span>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </>
                      ) : status === 'absent' ? (
                        <>
                          <span className="text-red-400 text-xs">Falta</span>
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        </>
                      ) : (
                        <>
                          <span className="text-yellow-400">-</span>
                          <XCircle className="w-4 h-4 text-yellow-400" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legenda */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-white/50">
          <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400">Completo</span>
          </div>
          <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
            <XCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400">Incompleto</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400">Falta</span>
          </div>
        </div>
      </main>
    </div>
  );
}
