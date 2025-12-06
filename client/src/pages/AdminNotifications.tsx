import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Bell, Send, Users, User, Search, X, CheckCircle, 
  AlertTriangle, Info, AlertCircle, Trash2, Calendar
} from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  department_name: string;
  position_name: string;
  photo_url: string | null;
}

interface Department {
  id: number;
  name: string;
}

interface SentNotification {
  id: number;
  employee_id: number;
  employee_name: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  sent_by_name: string;
}

type NotificationType = 'info' | 'warning' | 'success' | 'error';

export default function AdminNotifications() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Formulário
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('info');
  const [link, setLink] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'department' | 'individual'>('individual');
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  
  // Busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empRes, deptRes, notifRes] = await Promise.all([
        axios.get('/api/employees?status=active'),
        axios.get('/api/organization/departments'),
        axios.get('/api/admin/notifications/history')
      ]);
      
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
      setSentNotifications(notifRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = !filterDepartment || emp.department_name === departments.find(d => d.id === filterDepartment)?.name;
    return matchSearch && matchDept;
  });

  const toggleEmployee = (id: number) => {
    setSelectedEmployees(prev => 
      prev.includes(id) 
        ? prev.filter(e => e !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o título e a mensagem' });
      return;
    }

    let targetEmployees: number[] = [];
    
    if (targetType === 'all') {
      targetEmployees = employees.map(e => e.id);
    } else if (targetType === 'department' && selectedDepartment) {
      const deptName = departments.find(d => d.id === selectedDepartment)?.name;
      targetEmployees = employees.filter(e => e.department_name === deptName).map(e => e.id);
    } else if (targetType === 'individual') {
      targetEmployees = selectedEmployees;
    }

    if (targetEmployees.length === 0) {
      setFeedback({ type: 'error', message: 'Selecione pelo menos um destinatário' });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      await axios.post('/api/admin/notifications/send', {
        title,
        message,
        type,
        link: link || null,
        employee_ids: targetEmployees
      });

      setFeedback({ 
        type: 'success', 
        message: `Notificação enviada para ${targetEmployees.length} funcionário(s)!` 
      });

      // Limpar formulário
      setTitle('');
      setMessage('');
      setType('info');
      setLink('');
      setSelectedEmployees([]);
      setSelectedDepartment(null);
      
      // Recarregar histórico
      const notifRes = await axios.get('/api/admin/notifications/history');
      setSentNotifications(notifRes.data);

    } catch (error: any) {
      setFeedback({ 
        type: 'error', 
        message: error.response?.data?.error || 'Erro ao enviar notificação' 
      });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja remover esta notificação?')) return;
    
    try {
      await axios.delete(`/api/admin/notifications/${id}`);
      setSentNotifications(prev => prev.filter(n => n.id !== id));
      setFeedback({ type: 'success', message: 'Notificação removida' });
    } catch (error) {
      setFeedback({ type: 'error', message: 'Erro ao remover notificação' });
    }
  };

  const typeConfig = {
    info: { icon: Info, color: 'blue', label: 'Informação' },
    warning: { icon: AlertTriangle, color: 'yellow', label: 'Aviso' },
    success: { icon: CheckCircle, color: 'green', label: 'Sucesso' },
    error: { icon: AlertCircle, color: 'red', label: 'Urgente' }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <Bell className="w-7 h-7 text-blue-500" />
            Notificações para Funcionários
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Envie avisos e comunicados para o Portal do Funcionário
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            showHistory 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Calendar className="w-4 h-4" />
          {showHistory ? 'Nova Notificação' : 'Histórico'}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          feedback.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showHistory ? (
        /* Histórico de Notificações */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-white">Notificações Enviadas</h2>
          </div>
          
          {sentNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma notificação enviada ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {sentNotifications.map((notif) => {
                const TypeIcon = typeConfig[notif.type as NotificationType]?.icon || Info;
                const color = typeConfig[notif.type as NotificationType]?.color || 'blue';
                
                return (
                  <div key={notif.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
                          <TypeIcon className={`w-5 h-5 text-${color}-500`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-gray-800 dark:text-white">{notif.title}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              notif.is_read 
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' 
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            }`}>
                              {notif.is_read ? 'Lida' : 'Não lida'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notif.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Para: {notif.employee_name}
                            </span>
                            <span>Enviado por: {notif.sent_by_name}</span>
                            <span>{formatDate(notif.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Remover notificação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Formulário de Nova Notificação */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Formulário */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Nova Notificação
            </h2>
            
            <div className="space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Notificação
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(typeConfig) as [NotificationType, typeof typeConfig.info][]).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setType(key)}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          type === key 
                            ? `border-${config.color}-500 bg-${config.color}-50 dark:bg-${config.color}-900/30` 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 text-${config.color}-500`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Aviso Importante"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={255}
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite a mensagem..."
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Link (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link (opcional)
                </label>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Ex: /portal/solicitacoes"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">O funcionário será redirecionado ao clicar na notificação</p>
              </div>

              {/* Botão Enviar */}
              <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !message.trim()}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Notificação
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Coluna Direita - Destinatários */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Destinatários
            </h2>

            {/* Tipo de Destinatário */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTargetType('individual')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  targetType === 'individual'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setTargetType('department')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  targetType === 'department'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                Departamento
              </button>
              <button
                onClick={() => setTargetType('all')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  targetType === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
            </div>

            {targetType === 'all' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-400 text-sm">
                <Users className="w-5 h-5 inline mr-2" />
                A notificação será enviada para <strong>{employees.length}</strong> funcionários ativos.
              </div>
            )}

            {targetType === 'department' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selecione o Departamento
                </label>
                <select
                  value={selectedDepartment || ''}
                  onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="">Selecione...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {selectedDepartment && (
                  <p className="text-sm text-gray-500 mt-2">
                    {employees.filter(e => e.department_name === departments.find(d => d.id === selectedDepartment)?.name).length} funcionário(s) neste departamento
                  </p>
                )}
              </div>
            )}

            {targetType === 'individual' && (
              <>
                {/* Busca e Filtros */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar funcionário..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                    />
                  </div>
                  <select
                    value={filterDepartment || ''}
                    onChange={(e) => setFilterDepartment(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                  >
                    <option value="">Todos depts.</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* Selecionados */}
                {selectedEmployees.length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-green-700 dark:text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        {selectedEmployees.length} selecionado(s)
                      </span>
                      <button
                        onClick={() => setSelectedEmployees([])}
                        className="text-green-700 dark:text-green-400 text-sm hover:underline"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                )}

                {/* Selecionar Todos */}
                <button
                  onClick={selectAll}
                  className="w-full mb-2 py-2 text-sm text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                >
                  {selectedEmployees.length === filteredEmployees.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>

                {/* Lista de Funcionários */}
                <div className="max-h-[350px] overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                  {filteredEmployees.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">Nenhum funcionário encontrado</p>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => toggleEmployee(emp.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          selectedEmployees.includes(emp.id)
                            ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedEmployees.includes(emp.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 dark:border-gray-500'
                        }`}>
                          {selectedEmployees.includes(emp.id) && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        {emp.photo_url ? (
                          <img src={emp.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-800 dark:text-white">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.department_name}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
