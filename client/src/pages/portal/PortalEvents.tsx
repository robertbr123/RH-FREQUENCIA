import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Calendar, MapPin, Clock, QrCode,
  Loader2, AlertTriangle, CheckCircle, ChevronDown,
  ChevronUp, RefreshCw, Download, ExternalLink
} from 'lucide-react';
import { Snowfall } from '../../components/christmas';

interface CheckInRecord {
  type: 'CHECKED_IN' | 'CHECKED_OUT';
  time: string;
  checkOutTime?: string;
}

interface Event {
  id: string;
  eventId: string;
  eventName: string;
  eventDescription: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  qrCode: string;
  qrCodeImage: string;
  registeredAt: string;
  checkIns: CheckInRecord[];
  lastCheckIn: CheckInRecord | null;
}

interface ParticipantData {
  id: string;
  name: string;
  email: string;
  document: string;
}

export default function PortalEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/integration/checkin/events');
      setEvents(response.data.events || []);
      setParticipant(response.data.participant || null);
    } catch (err: any) {
      console.error('Erro ao carregar eventos:', err);
      if (err.response?.status === 503) {
        setError('Sistema de eventos não disponível no momento');
      } else {
        setError(err.response?.data?.error || 'Erro ao carregar eventos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isEventActive = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  };

  const isEventFuture = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    return start > now;
  };

  const getEventStatus = (event: Event) => {
    if (isEventActive(event.eventStartDate, event.eventEndDate)) {
      return { label: 'Em andamento', color: 'text-green-400 bg-green-500/20' };
    }
    if (isEventFuture(event.eventStartDate)) {
      return { label: 'Próximo', color: 'text-blue-400 bg-blue-500/20' };
    }
    return { label: 'Encerrado', color: 'text-white/50 bg-white/10' };
  };

  const getCheckInStatus = (lastCheckIn: CheckInRecord | null) => {
    if (!lastCheckIn) {
      return { label: 'Não fez check-in', color: 'text-yellow-400' };
    }
    if (lastCheckIn.type === 'CHECKED_IN') {
      return { label: 'Check-in realizado', color: 'text-green-400' };
    }
    return { label: 'Check-out realizado', color: 'text-blue-400' };
  };

  const downloadQRCode = (qrCodeImage: string, eventName: string) => {
    const link = document.createElement('a');
    link.href = qrCodeImage;
    link.download = `qrcode-${eventName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h1 className="text-white font-semibold">Meus Eventos</h1>
          <button 
            onClick={handleRefresh}
            className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            disabled={refreshing}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
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
            <p className="text-white mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 text-center">
            <QrCode className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h2 className="text-white font-semibold mb-2">Nenhum evento encontrado</h2>
            <p className="text-white/60 text-sm">
              Você ainda não está inscrito em nenhum evento ativo.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total de Eventos</p>
                  <p className="text-2xl font-bold text-white">{events.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Lista de Eventos */}
            {events.map((event) => {
              const status = getEventStatus(event);
              const checkInStatus = getCheckInStatus(event.lastCheckIn);
              const isExpanded = expandedEvent === event.id;

              return (
                <div 
                  key={event.id}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
                >
                  {/* Cabeçalho do Evento */}
                  <button
                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h3 className="text-white font-semibold text-lg">{event.eventName}</h3>
                        {event.eventDescription && (
                          <p className="text-white/60 text-sm mt-1 line-clamp-2">
                            {event.eventDescription}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex items-center">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-white/50" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-white/50" />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/60">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(event.eventStartDate)}</span>
                      </div>
                      {event.eventLocation && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{event.eventLocation}</span>
                        </div>
                      )}
                      <div className={`flex items-center gap-1 ${checkInStatus.color}`}>
                        <CheckCircle className="w-4 h-4" />
                        <span>{checkInStatus.label}</span>
                      </div>
                    </div>
                  </button>

                  {/* Conteúdo Expandido */}
                  {isExpanded && (
                    <div className="border-t border-white/10 p-4">
                      {/* QR Code */}
                      <div className="flex flex-col items-center mb-6">
                        <div className="bg-white p-4 rounded-xl mb-3">
                          <img 
                            src={event.qrCodeImage} 
                            alt="QR Code do evento"
                            className="w-48 h-48"
                          />
                        </div>
                        <p className="text-white/40 text-xs font-mono mb-3">{event.qrCode}</p>
                        <button
                          onClick={() => downloadQRCode(event.qrCodeImage, event.eventName)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Baixar QR Code
                        </button>
                      </div>

                      {/* Detalhes do Evento */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/60">Início</span>
                          <span className="text-white">{formatDateTime(event.eventStartDate)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/60">Término</span>
                          <span className="text-white">{formatDateTime(event.eventEndDate)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/60">Inscrito em</span>
                          <span className="text-white">{formatDateTime(event.registeredAt)}</span>
                        </div>
                      </div>

                      {/* Histórico de Check-ins */}
                      {event.checkIns.length > 0 && (
                        <div className="border-t border-white/10 pt-4">
                          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Histórico de Check-ins
                          </h4>
                          <div className="space-y-2">
                            {event.checkIns.map((checkIn, index) => (
                              <div 
                                key={index}
                                className="flex items-center justify-between text-sm bg-white/5 rounded-lg p-2"
                              >
                                <span className={`font-medium ${
                                  checkIn.type === 'CHECKED_IN' ? 'text-green-400' : 'text-blue-400'
                                }`}>
                                  {checkIn.type === 'CHECKED_IN' ? 'Check-in' : 'Check-out'}
                                </span>
                                <span className="text-white/60">
                                  {formatDateTime(checkIn.time)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
