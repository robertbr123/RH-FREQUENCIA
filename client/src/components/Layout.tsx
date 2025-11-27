import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useTheme } from '../context/ThemeContext'
import { LayoutDashboard, Users, Clock, LogOut, Building2, UserCog, UserCircle, Settings, FileText, Camera, Menu, X, ClipboardEdit, ChevronRight, Moon, Sun, Database, Pin, PinOff } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export default function Layout() {
  const { user, logout } = useAuth()
  const { settings } = useSettings()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [isPinned, setIsPinned] = useState(
    localStorage.getItem('sidebarPinned') === 'true'
  )
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasInteractedRef = useRef(false)

  // Função para mostrar o sidebar
  const showSidebar = () => {
    if (isPinned) return // Não esconde se está fixado
    hasInteractedRef.current = true
    setSidebarVisible(true)
    // Limpar timer anterior se existir
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  // Função para iniciar o timer de esconder
  const startHideTimer = () => {
    if (isPinned) return // Não esconde se está fixado
    // Só inicia o timer se já houve interação
    if (!hasInteractedRef.current) {
      return
    }
    
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }
    hideTimerRef.current = setTimeout(() => {
      setSidebarVisible(false)
    }, 3000) // 3 segundos
  }

  // Toggle pin
  const togglePin = () => {
    const newPinState = !isPinned
    setIsPinned(newPinState)
    localStorage.setItem('sidebarPinned', String(newPinState))
    if (newPinState) {
      setSidebarVisible(true)
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
    }
  }, [])

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'gestor'] },
    { name: 'Funcionários', href: '/employees', icon: Users, roles: ['admin', 'gestor'] },
    { name: 'Frequência', href: '/attendance', icon: Clock, roles: ['admin', 'gestor'] },
    { name: 'Scanner', href: '/scanner', icon: Camera, roles: ['admin', 'gestor', 'operador'] },
    { name: 'Relatórios', href: '/reports', icon: FileText, roles: ['admin', 'gestor'] },
    { name: 'Admin Pontos', href: '/attendance-admin', icon: ClipboardEdit, roles: ['admin'] },
    { name: 'Organização', href: '/organization', icon: Building2, roles: ['admin'] },
    { name: 'Usuários', href: '/users', icon: UserCog, roles: ['admin'] },
    { name: 'Backup', href: '/backup', icon: Database, roles: ['admin'] },
    { name: 'Configurações', href: '/settings', icon: Settings, roles: ['admin'] },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 shadow-md z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <span className="font-bold text-gray-900 dark:text-white">{settings.system_name}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Indicador de hover quando sidebar está escondido - apenas desktop */}
      {!sidebarVisible && !isPinned && (
        <div 
          className="hidden lg:block fixed inset-y-0 left-0 w-2 bg-primary-500/30 hover:bg-primary-500/50 transition-colors z-30 cursor-pointer"
          onMouseEnter={showSidebar}
        />
      )}

      {/* Sidebar - Desktop com auto-hide */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 backdrop-blur-2xl bg-gradient-to-br from-white/80 via-blue-50/70 to-cyan-50/70 dark:from-gray-900/80 dark:via-indigo-900/70 dark:to-blue-900/70 shadow-2xl border-r border-white/30 dark:border-gray-700/30 transform transition-all duration-300 z-40 ${
          // Mobile: controla com mobileMenuOpen
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          // Desktop: controla com sidebarVisible
          sidebarVisible ? 'lg:translate-x-0' : 'lg:-translate-x-64'
        }`}
        onMouseEnter={showSidebar}
        onMouseLeave={startHideTimer}
      >
        <div className="flex flex-col h-full">
          {/* Logo com Gradiente Moderno */}
          <div className="flex items-center justify-center h-20 backdrop-blur-xl bg-gradient-to-r from-indigo-500/30 via-blue-500/30 to-cyan-500/30 text-white shadow-xl relative overflow-hidden border-b border-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-blue-400/10 to-cyan-400/10"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="backdrop-blur-xl bg-white/30 p-2.5 rounded-xl border border-white/30 shadow-lg">
                <Clock className="w-7 h-7 drop-shadow-lg" />
              </div>
              <span className="text-xl font-bold tracking-wide drop-shadow-lg">{settings.system_name}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              // Verificar se o usuário tem permissão para ver este item
              if (item.roles && !item.roles.includes(user?.role || '')) {
                return null
              }
              
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? 'backdrop-blur-xl bg-gradient-to-r from-indigo-500/80 via-blue-500/80 to-cyan-500/80 text-white shadow-lg scale-105 border border-white/30'
                      : 'text-gray-700 dark:text-gray-300 hover:backdrop-blur-xl hover:bg-gradient-to-r hover:from-indigo-50/70 hover:via-blue-50/70 hover:to-cyan-50/70 dark:hover:from-indigo-900/30 dark:hover:via-blue-900/30 dark:hover:to-cyan-900/30 hover:translate-x-1 hover:shadow-md hover:border hover:border-white/20'
                  }`}
                >
                  {isActive && <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>}
                  <item.icon className={`w-5 h-5 mr-3 transition-transform duration-300 ${
                    isActive ? 'text-white scale-110' : 'text-gray-500 dark:text-gray-400 group-hover:scale-110 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                  }`} />
                  <span className="relative z-10">{item.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-white/20 dark:border-gray-700/30 backdrop-blur-xl bg-gradient-to-br from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/20 dark:via-blue-900/20 dark:to-cyan-900/20">
            {/* Botão de Pin (apenas desktop) */}
            <button
              onClick={togglePin}
              className="hidden lg:flex items-center w-full px-4 py-2 mb-2 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-400 backdrop-blur-xl hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-md hover:border hover:border-white/30 transition-all duration-200 group"
            >
              {isPinned ? (
                <>
                  <Pin className="w-4 h-4 mr-2 text-primary-500" />
                  Sidebar Fixada
                </>
              ) : (
                <>
                  <PinOff className="w-4 h-4 mr-2 text-gray-500" />
                  Fixar Sidebar
                </>
              )}
            </button>

            {/* Botão de Modo Escuro */}
            <button
              onClick={toggleTheme}
              className="flex items-center w-full px-4 py-3 mb-3 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 backdrop-blur-xl hover:bg-gradient-to-r hover:from-indigo-50/70 hover:via-blue-50/70 hover:to-cyan-50/70 dark:hover:from-indigo-900/30 dark:hover:via-blue-900/30 dark:hover:to-cyan-900/30 hover:shadow-md hover:border hover:border-white/30 transition-all duration-300 hover:scale-105 group"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-5 h-5 mr-3 text-yellow-500" />
                  Modo Claro
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5 mr-3 text-indigo-500" />
                  Modo Escuro
                </>
              )}
            </button>
            
            <Link
              to="/profile"
              className="group flex items-center px-4 py-3 mb-3 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 backdrop-blur-xl hover:bg-gradient-to-r hover:from-indigo-50/70 hover:via-blue-50/70 hover:to-cyan-50/70 dark:hover:from-indigo-900/30 dark:hover:via-blue-900/30 dark:hover:to-cyan-900/30 hover:shadow-md hover:border hover:border-white/30 transition-all duration-300 hover:scale-105"
            >
              <UserCircle className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              Meu Perfil
            </Link>
            <div className="flex items-center gap-3 px-4 py-3 backdrop-blur-xl bg-gradient-to-br from-white/70 via-blue-50/50 to-cyan-50/50 dark:from-gray-800/70 dark:via-indigo-900/30 dark:to-blue-900/30 rounded-xl shadow-lg border border-white/30 dark:border-gray-700/30">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full backdrop-blur-xl bg-gradient-to-br from-indigo-500/90 via-blue-500/90 to-cyan-500/90 flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-white/30">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {user?.role === 'admin' ? 'Administrador' : user?.role === 'gestor' ? 'Gestor' : 'Operador'}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 hover:scale-110"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      {/* Overlay para mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className={`min-h-screen pt-16 lg:pt-0 transition-all duration-300 ${
        sidebarVisible ? 'lg:ml-64' : 'lg:ml-0'
      }`}>
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
