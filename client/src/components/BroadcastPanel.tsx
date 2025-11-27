import { useState, useEffect } from 'react';
import { Send, Users, X } from 'lucide-react';
import axios from 'axios';
import { toast } from '../utils/toast';

interface Manager {
  id: number;
  username: string;
  email: string;
  employee_name: string;
}

interface BroadcastPanelProps {
  onClose: () => void;
}

export default function BroadcastPanel({ onClose }: BroadcastPanelProps) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<number[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadManagers();
  }, []);

  const loadManagers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/broadcast/managers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setManagers(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar gestores:', error);
      
      if (error.response?.status === 403) {
        const errorData = error.response.data;
        toast.error(`Acesso negado: ${errorData.error}. Seu role: ${errorData.yourRole}, necessário: ${errorData.requiredRole}`);
      } else {
        toast.error('Erro ao carregar lista de gestores');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleManager = (managerId: number) => {
    setSelectedManagers(prev =>
      prev.includes(managerId)
        ? prev.filter(id => id !== managerId)
        : [...prev, managerId]
    );
  };

  const toggleAll = () => {
    if (selectedManagers.length === managers.length) {
      setSelectedManagers([]);
    } else {
      setSelectedManagers(managers.map(m => m.id));
    }
  };

  const handleSend = async () => {
    if (selectedManagers.length === 0) {
      toast.error('Selecione pelo menos um gestor');
      return;
    }

    if (!message.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/broadcast/send',
        {
          recipientIds: selectedManagers,
          subject: subject || 'Mensagem do Administrador',
          message: message.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Mensagem enviada para ${selectedManagers.length} gestor(es)`);
      setSubject('');
      setMessage('');
      setSelectedManagers([]);
      onClose();
    } catch (error: any) {
      console.error('Erro ao enviar broadcast:', error);
      
      if (error.response?.data?.needsMigration) {
        toast.error('Sistema de chat não configurado. Execute a migração no Neon Console.');
        return;
      }
      
      toast.error(error.response?.data?.error || 'Erro ao enviar mensagens');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Enviar Mensagem para Gestores
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Manager Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Destinatários ({selectedManagers.length} selecionados)
            </label>
            <button
              onClick={toggleAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedManagers.length === managers.length ? 'Desmarcar' : 'Selecionar'} Todos
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
            {managers.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                Nenhum gestor cadastrado
              </p>
            ) : (
              managers.map(manager => (
                <label
                  key={manager.id}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedManagers.includes(manager.id)}
                    onChange={() => toggleManager(manager.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {manager.employee_name || manager.username}
                    </p>
                    <p className="text-xs text-gray-500">{manager.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assunto (opcional)
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Mensagem do Administrador"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensagem *
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={handleSend}
          disabled={sending || selectedManagers.length === 0 || !message.trim()}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {sending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Enviar para {selectedManagers.length} Gestor(es)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
