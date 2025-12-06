import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, FileText, Clock, CheckCircle, XCircle, 
  Loader2, AlertTriangle, Calendar, MessageSquare, Plus
} from 'lucide-react';
import { Snowfall } from '../../components/christmas';

interface Request {
  id: number;
  request_type: string;
  status: string;
  data: any;
  justification: string;
  review_note: string;
  created_at: string;
  reviewed_at: string;
}

export default function PortalRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/portal/requests');
      setRequests(response.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar solicitações:', err);
      setError(err.response?.data?.error || 'Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'rejected': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'cancelled': return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      default: return 'text-white/50 bg-white/10 border-white/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'rejected': return 'Rejeitado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ponto_ajuste': return 'Ajuste de Ponto';
      case 'ferias': return 'Férias';
      case 'declaracao': return 'Declaração';
      case 'documento': return 'Documento';
      case 'abono': return 'Abono de Falta';
      case 'hora_extra': return 'Hora Extra';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ponto_ajuste': return <Clock className="w-5 h-5 text-blue-400" />;
      case 'ferias': return <Calendar className="w-5 h-5 text-green-400" />;
      case 'declaracao': return <FileText className="w-5 h-5 text-purple-400" />;
      case 'documento': return <FileText className="w-5 h-5 text-orange-400" />;
      default: return <MessageSquare className="w-5 h-5 text-gray-400" />;
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
          <h1 className="text-white font-semibold">Minhas Solicitações</h1>
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
            {/* Lista de Solicitações */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Solicitações
                </h2>
                <span className="text-white/50 text-sm">{requests.length} total</span>
              </div>

              {requests.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/50 mb-2">Nenhuma solicitação encontrada</p>
                  <p className="text-white/30 text-sm">
                    Você ainda não fez nenhuma solicitação ao RH
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {requests.map((request) => (
                    <div key={request.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-white/5">
                          {getTypeIcon(request.request_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-white font-medium">
                                {getTypeLabel(request.request_type)}
                              </p>
                              <p className="text-white/50 text-xs mt-0.5">
                                {formatDate(request.created_at)}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${getStatusColor(request.status)}`}>
                              {getStatusIcon(request.status)}
                              {getStatusLabel(request.status)}
                            </span>
                          </div>
                          
                          {request.justification && (
                            <p className="text-white/60 text-sm mt-2 line-clamp-2">
                              {request.justification}
                            </p>
                          )}
                          
                          {request.review_note && (
                            <div className="mt-2 p-2 bg-white/5 rounded-lg">
                              <p className="text-white/40 text-xs mb-1">Resposta do RH:</p>
                              <p className="text-white/70 text-sm">{request.review_note}</p>
                            </div>
                          )}

                          {request.data && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {request.data.date && (
                                <span className="px-2 py-1 bg-white/5 rounded text-xs text-white/60">
                                  Data: {request.data.date}
                                </span>
                              )}
                              {request.data.punch_type && (
                                <span className="px-2 py-1 bg-white/5 rounded text-xs text-white/60">
                                  Tipo: {request.data.punch_type}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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
                  Para criar novas solicitações, entre em contato com o setor de RH da sua empresa.
                </span>
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
