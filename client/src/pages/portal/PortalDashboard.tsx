import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../../context/PortalAuthContext';
import { useServerTime } from '../../hooks';
import axios from 'axios';
import { 
  Clock, Calendar, TrendingUp, Bell, Camera, 
  ChevronRight, User, LogOut, Menu, X, Home,
  FileText, Briefcase, CheckCircle, Inbox
} from 'lucide-react';
import { Snowfall, ChristmasLights } from '../../components/christmas';
import PortalOnboarding from '../../components/portal/PortalOnboarding';

interface TodayPunches {
  entry: string | null;
  break_start: string | null;
  break_end: string | null;
  exit: string | null;
}

interface HourBankData {
  balance: number;
  days_worked: number;
  total_worked: number;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function PortalDashboard() {
  const { employee, logout, hasSeenOnboarding, setOnboardingComplete } = usePortalAuth();
  const navigate = useNavigate();
  const { formattedTime, formattedDate } = useServerTime(); // Horário sincronizado com servidor
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayPunches, setTodayPunches] = useState<TodayPunches>({ entry: null, break_start: null, break_end: null, exit: null });
  const [nextPunch, setNextPunch] = useState<string>('entry');
  const [hourBank, setHourBank] = useState<HourBankData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Verificar se deve mostrar onboarding
  useEffect(() => {
    if (!hasSeenOnboarding && employee) {
      setShowOnboarding(true);
    }
  }, [hasSeenOnboarding, employee]);

  // Carregar dados
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [todayRes, hourBankRes, notificationsRes] = await Promise.all([
        axios.get('/api/portal/attendance/today'),
        axios.get('/api/portal/hour-bank'),
        axios.get('/api/portal/notifications')
      ]);

      setTodayPunches(todayRes.data.punches);
      setNextPunch(todayRes.data.nextPunch);
      setHourBank(hourBankRes.data);
      setNotifications(notificationsRes.data.notifications.slice(0, 5));
      setUnreadCount(notificationsRes.data.unread_count);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleOnboardingComplete = () => {
    setOnboardingComplete();
    setShowOnboarding(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const punchLabels: Record<string, string> = {
    entry: 'Entrada',
    break_start: 'Início Intervalo',
    break_end: 'Fim Intervalo',
    exit: 'Saída',
    completed: 'Completo'
  };

  const menuItems = [
    { icon: Home, label: 'Início', path: '/portal', active: true },
    { icon: Camera, label: 'Registrar Ponto', path: '/portal/ponto' },
    { icon: Calendar, label: 'Meu Ponto', path: '/portal/frequencia' },
    { icon: TrendingUp, label: 'Banco de Horas', path: '/portal/banco-horas' },
    { icon: Briefcase, label: 'Férias', path: '/portal/ferias' },
    { icon: FileText, label: 'Solicitações', path: '/portal/solicitacoes' },
    { icon: Inbox, label: 'Caixa de Entrada', path: '/portal/inbox' },
    { icon: Bell, label: 'Lembretes', path: '/portal/notificacoes' },
    { icon: User, label: 'Meus Dados', path: '/portal/perfil' },
  ];

  // Mostrar onboarding se for primeira vez
  if (showOnboarding && employee) {
    return (
      <PortalOnboarding 
        onComplete={handleOnboardingComplete}
        employeeName={employee.name}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Snowfall count={20} />
      
      {/* Header Mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setSidebarOpen(true)} className="text-white">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-white font-semibold">Portal do Funcionário</h1>
          <div className="relative">
            <Bell className="w-6 h-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 border-r border-white/10">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {employee?.photo_url ? (
                  <img src={employee.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-sm">{employee?.name}</p>
                  <p className="text-white/50 text-xs">{employee?.position}</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-white/70">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    item.active 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 flex-col bg-slate-900/50 backdrop-blur-xl border-r border-white/10">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            {employee?.photo_url ? (
              <img src={employee.photo_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/30" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-blue-500/30 flex items-center justify-center border-2 border-blue-500/30">
                <User className="w-7 h-7 text-white" />
              </div>
            )}
            <div>
              <p className="text-white font-semibold">{employee?.name}</p>
              <p className="text-white/50 text-sm">{employee?.position}</p>
              <p className="text-white/30 text-xs">{employee?.department}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                item.active 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 pt-20 lg:pt-0 p-4 lg:p-8">
        {/* Header Desktop */}
        <header className="hidden lg:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Olá, {employee?.name?.split(' ')[0]}! 👋</h1>
            <p className="text-white/50 capitalize">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <Bell className="w-6 h-6 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Relógio e Ponto */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
          {/* Relógio Grande */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <ChristmasLights count={8} />
            <div className="text-center py-4">
              <p className="text-6xl lg:text-7xl font-bold text-white font-mono tracking-wider">
                {formattedTime}
              </p>
              <p className="text-white/50 mt-2 capitalize">{formattedDate}</p>
            </div>
            
            {/* Botão de Registro */}
            <button
              onClick={() => navigate('/portal/ponto')}
              disabled={nextPunch === 'completed'}
              className={`w-full mt-4 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 ${
                nextPunch === 'completed'
                  ? 'bg-green-500/20 text-green-400 cursor-default'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
              }`}
            >
              {nextPunch === 'completed' ? (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Ponto completo hoje
                </>
              ) : (
                <>
                  <Camera className="w-6 h-6" />
                  Registrar {punchLabels[nextPunch]}
                </>
              )}
            </button>
          </div>

          {/* Resumo do Dia */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Hoje
            </h3>
            <div className="space-y-3">
              {[
                { key: 'entry', label: 'Entrada', color: 'green' },
                { key: 'break_start', label: 'Início Intervalo', color: 'yellow' },
                { key: 'break_end', label: 'Fim Intervalo', color: 'blue' },
                { key: 'exit', label: 'Saída', color: 'red' },
              ].map((punch) => (
                <div key={punch.key} className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">{punch.label}</span>
                  <span className={`font-mono ${
                    todayPunches[punch.key as keyof TodayPunches] 
                      ? 'text-white' 
                      : 'text-white/30'
                  }`}>
                    {todayPunches[punch.key as keyof TodayPunches] || '--:--'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cards de Informação */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Banco de Horas */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Banco de Horas
              </h3>
              <button onClick={() => navigate('/portal/banco-horas')} className="text-blue-400 hover:text-blue-300">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {hourBank && (
              <div className="text-center">
                <p className={`text-3xl font-bold ${
                  hourBank.balance >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {hourBank.balance >= 0 ? '+' : ''}{hourBank.balance.toFixed(1)}h
                </p>
                <p className="text-white/50 text-sm mt-1">Saldo atual</p>
              </div>
            )}
          </div>

          {/* Próximas Férias */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-green-400" />
                Férias
              </h3>
              <button onClick={() => navigate('/portal/ferias')} className="text-blue-400 hover:text-blue-300">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center">
              <p className="text-white/50 text-sm">Consulte seu saldo de férias</p>
            </div>
          </div>

          {/* Notificações */}
          <div 
            className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 cursor-pointer hover:bg-white/10 transition-all"
            onClick={() => navigate('/portal/inbox')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-400" />
                Notificações
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">
                    {unreadCount} novas
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            {notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.slice(0, 3).map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`text-sm p-2 rounded-lg ${
                      notif.is_read ? 'bg-white/5' : 'bg-blue-500/10 border border-blue-500/20'
                    }`}
                  >
                    <p className="text-white/80 truncate">{notif.title}</p>
                  </div>
                ))}
                {notifications.length > 3 && (
                  <p className="text-blue-400 text-xs text-center mt-2">Ver todas →</p>
                )}
              </div>
            ) : (
              <p className="text-white/50 text-sm text-center">Nenhuma notificação</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
