import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useTheme } from '../context/ThemeContext'
import { LayoutDashboard, Users, Clock, LogOut, Building2, UserCog, UserCircle, Settings, FileText, Camera, Menu, X, ClipboardEdit, ChevronRight, Moon, Sun } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export default function Layout() {
  const { user, logout } = useAuth()
  const { settings } = useSettings()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasInteractedRef = useRef(false)

  // Função para mostrar o sidebar
  const showSidebar = () => {
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
      {!sidebarVisible && (
        <div 
          className="hidden lg:block fixed inset-y-0 left-0 w-2 bg-primary-500/30 hover:bg-primary-500/50 transition-colors z-30 cursor-pointer"
          onMouseEnter={showSidebar}
        />
      )}

      {/* Sidebar - Desktop com auto-hide */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 transform transition-all duration-300 z-40 ${
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
          <div className="flex items-center justify-center h-20 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                <Clock className="w-7 h-7" />
              </div>
              <span className="text-xl font-bold tracking-wide">{settings.system_name}</span>
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
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg scale-105'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-50 dark:hover:from-gray-700 dark:hover:to-indigo-900/20 hover:translate-x-1 hover:shadow-md'
                  }`}
                >
                  {isActive && <div className="absolute inset-0 bg-white/10"></div>}
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
          <div className="p-4 border-t-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900/20">
            {/* Botão de Modo Escuro */}
            <button
              onClick={toggleTheme}
              className="flex items-center w-full px-4 py-3 mb-3 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-white hover:to-indigo-50 dark:hover:from-gray-800 dark:hover:to-indigo-900/30 hover:shadow-md transition-all duration-300 hover:scale-105 group"
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
              className="group flex items-center px-4 py-3 mb-3 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-white hover:to-indigo-50 dark:hover:from-gray-800 dark:hover:to-indigo-900/30 hover:shadow-md transition-all duration-300 hover:scale-105"
            >
              <UserCircle className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              Meu Perfil
            </Link>
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20 rounded-xl shadow-lg border-2 border-indigo-200 dark:border-indigo-800">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
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
