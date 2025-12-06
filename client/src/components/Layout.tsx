import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useTheme } from '../context/ThemeContext'
import { useChristmasSeason } from '../hooks'
import { ChristmasLights } from './christmas'
import { LayoutDashboard, Users, Clock, LogOut, Building2, UserCog, UserCircle, Settings, FileText, Camera, Menu, X, ClipboardEdit, ChevronRight, Moon, Sun, Database, Pin, PinOff, Wallet, MapPin, Bell } from 'lucide-react'
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'

// ============ TIPOS ============
interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

interface TooltipProps {
  text: string
  children: React.ReactNode
  show: boolean
}

// ============ COMPONENTES MEMOIZADOS ============

// Tooltip para modo colapsado
const Tooltip = memo(({ text, children, show }: TooltipProps) => (
  <div className="relative group">
    {children}
    {show && (
      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
        {text}
        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
      </div>
    )}
  </div>
))

// Item de navegação memoizado
const NavItemComponent = memo(({ 
  item, 
  isActive, 
  isCollapsed, 
  onClick 
}: { 
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
  onClick: () => void
}) => {
  const content = (
    <Link
      to={item.href}
      onClick={onClick}
      className={`group flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden active:scale-95 ${
        isActive
          ? 'backdrop-blur-xl bg-gradient-to-r from-indigo-500/80 via-blue-500/80 to-cyan-500/80 text-white shadow-lg scale-105 border border-white/30'
          : 'text-gray-700 dark:text-gray-300 hover:backdrop-blur-xl hover:bg-gradient-to-r hover:from-indigo-50/70 hover:via-blue-50/70 hover:to-cyan-50/70 dark:hover:from-indigo-900/30 dark:hover:via-blue-900/30 dark:hover:to-cyan-900/30 hover:translate-x-1 hover:shadow-md hover:border hover:border-white/20'
      }`}
    >
      {isActive && <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>}
      <item.icon className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'} transition-all duration-300 ${
        isActive ? 'text-white scale-110' : 'text-gray-500 dark:text-gray-400 group-hover:scale-110 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
      }`} />
      <span className={`relative z-10 whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
        {item.name}
      </span>
      {isActive && !isCollapsed && <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />}
    </Link>
  )

  return isCollapsed ? (
    <Tooltip text={item.name} show={isCollapsed}>
      {content}
    </Tooltip>
  ) : content
})

// Botão de ação memoizado
const ActionButton = memo(({ 
  onClick, 
  icon: Icon, 
  label, 
  isCollapsed,
  iconClassName = '',
  className = '' 
}: { 
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  isCollapsed: boolean
  iconClassName?: string
  className?: string
}) => {
  const content = (
    <button
      onClick={onClick}
      className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 w-full text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 backdrop-blur-xl hover:bg-gradient-to-r hover:from-indigo-50/70 hover:via-blue-50/70 hover:to-cyan-50/70 dark:hover:from-indigo-900/30 dark:hover:via-blue-900/30 dark:hover:to-cyan-900/30 hover:shadow-md hover:border hover:border-white/30 transition-all duration-300 hover:scale-105 active:scale-95 group ${className}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'} transition-all duration-300 ${iconClassName}`} />
      <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
        {label}
      </span>
    </button>
  )

  return isCollapsed ? (
    <Tooltip text={label} show={isCollapsed}>
      {content}
    </Tooltip>
  ) : content
})

export default function Layout() {
  const { user, logout } = useAuth()
  const { settings } = useSettings()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const isChristmasSeason = useChristmasSeason()
  
  // Estados
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isPinned, setIsPinned] = useState(() =>
    localStorage.getItem('sidebarPinned') === 'true'
  )
  
  // Refs
  const touchStartXRef = useRef<number>(0)
  const touchEndXRef = useRef<number>(0)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Sidebar está colapsado quando não está com hover E não está fixado
  const isCollapsed = !isHovered && !isPinned

  // ============ SWIPE GESTURES ============
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(() => {
    const swipeDistance = touchEndXRef.current - touchStartXRef.current
    const minSwipeDistance = 50

    // Swipe da esquerda para direita (abrir menu)
    if (swipeDistance > minSwipeDistance && touchStartXRef.current < 50) {
      setMobileMenuOpen(true)
    }
    // Swipe da direita para esquerda (fechar menu)
    else if (swipeDistance < -minSwipeDistance && mobileMenuOpen) {
      setMobileMenuOpen(false)
    }
  }, [mobileMenuOpen])

  // Registrar eventos de touch
  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  // ============ HOVER FUNCTIONS ============
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  // ============ TOGGLE FUNCTIONS ============
  const togglePin = useCallback(() => {
    const newPinState = !isPinned
    setIsPinned(newPinState)
    localStorage.setItem('sidebarPinned', String(newPinState))
  }, [isPinned])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  // ============ NAVIGATION MEMOIZADA ============
  const navigation = useMemo<NavItem[]>(() => [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'gestor'] },
    { name: 'Funcionários', href: '/admin/employees', icon: Users, roles: ['admin', 'gestor'] },
    { name: 'Frequência', href: '/admin/attendance', icon: Clock, roles: ['admin', 'gestor'] },
    { name: 'Banco de Horas', href: '/admin/hour-bank', icon: Wallet, roles: ['admin', 'gestor'] },
    { name: 'Scanner', href: '/admin/scanner', icon: Camera, roles: ['admin', 'gestor', 'operador'] },
    { name: 'Relatórios', href: '/admin/reports', icon: FileText, roles: ['admin', 'gestor'] },
    { name: 'Admin Pontos', href: '/admin/attendance-admin', icon: ClipboardEdit, roles: ['admin'] },
    { name: 'Notificações', href: '/admin/notifications', icon: Bell, roles: ['admin', 'gestor'] },
    { name: 'Organização', href: '/admin/organization', icon: Building2, roles: ['admin'] },
    { name: 'Usuários', href: '/admin/users', icon: UserCog, roles: ['admin'] },
    { name: 'Geolocalização', href: '/admin/geolocation', icon: MapPin, roles: ['admin'] },
    { name: 'Backup', href: '/admin/backup', icon: Database, roles: ['admin'] },
    { name: 'Configurações', href: '/admin/settings', icon: Settings, roles: ['admin'] },
  ], [])

  // Filtrar navegação por role
  const filteredNavigation = useMemo(() => 
    navigation.filter(item => item.roles.includes(user?.role || '')),
    [navigation, user?.role]
  )

  // Largura do sidebar - transição suave entre estados
  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64'
  const marginLeft = isCollapsed ? 'lg:ml-20' : 'lg:ml-64'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-lg z-50 flex items-center justify-between px-4 border-b border-white/20 dark:border-gray-700/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white">{settings.system_name}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 active:scale-90"
        >
          <div className="relative w-6 h-6">
            <X className={`w-6 h-6 absolute transition-all duration-300 ${mobileMenuOpen ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'}`} />
            <Menu className={`w-6 h-6 absolute transition-all duration-300 ${mobileMenuOpen ? '-rotate-90 opacity-0' : 'rotate-0 opacity-100'}`} />
          </div>
        </button>
      </div>

      {/* Sidebar - Desktop com auto-collapse/expand */}
      <div 
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 ${sidebarWidth} overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-white/80 via-blue-50/70 to-cyan-50/70 dark:from-gray-900/80 dark:via-indigo-900/70 dark:to-blue-900/70 shadow-2xl border-r border-white/30 dark:border-gray-700/30 transform transition-all duration-300 ease-out z-40 ${
          // Mobile: controla com mobileMenuOpen
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Christmas Lights no topo do menu */}
          <ChristmasLights enabled={isChristmasSeason} />
          
          {/* Logo com Gradiente Moderno */}
          <div className={`flex items-center justify-center h-20 backdrop-blur-xl ${isChristmasSeason ? 'bg-gradient-to-r from-red-500/30 via-green-500/30 to-red-500/30' : 'bg-gradient-to-r from-indigo-500/30 via-blue-500/30 to-cyan-500/30'} text-white shadow-xl relative overflow-hidden border-b border-white/20 px-3`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-blue-400/10 to-cyan-400/10"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="backdrop-blur-xl bg-white/30 p-2.5 rounded-xl border border-white/30 shadow-lg transition-transform duration-300 hover:scale-105 flex-shrink-0">
                {isChristmasSeason ? (
                  <span className="text-xl">🎄</span>
                ) : (
                  <Clock className="w-6 h-6 drop-shadow-lg" />
                )}
              </div>
              <span className={`text-lg font-bold tracking-wide drop-shadow-lg whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                {settings.system_name}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <NavItemComponent
                  key={item.name}
                  item={item}
                  isActive={isActive}
                  isCollapsed={isCollapsed}
                  onClick={closeMobileMenu}
                />
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-3 border-t border-white/20 dark:border-gray-700/30 backdrop-blur-xl bg-gradient-to-br from-indigo-50/50 via-blue-50/50 to-cyan-50/50 dark:from-indigo-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 overflow-hidden">
            {/* Botão de Pin - apenas desktop */}
            <div className="hidden lg:block mb-2">
              <ActionButton
                onClick={togglePin}
                icon={isPinned ? Pin : PinOff}
                label={isPinned ? 'Menu Fixado' : 'Fixar Menu'}
                isCollapsed={isCollapsed}
                iconClassName={isPinned ? 'text-primary-500' : 'text-gray-500'}
              />
            </div>

            {/* Botão de Modo Escuro */}
            <ActionButton
              onClick={toggleTheme}
              icon={theme === 'dark' ? Sun : Moon}
              label={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
              isCollapsed={isCollapsed}
              iconClassName={theme === 'dark' ? 'text-yellow-500' : 'text-indigo-500'}
              className="mb-2"
            />
            
            {/* Link Meu Perfil */}
            <Tooltip text="Meu Perfil" show={isCollapsed}>
              <Link
                to="/admin/profile"
                className={`group flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 mb-2 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 backdrop-blur-xl hover:bg-gradient-to-r hover:from-indigo-50/70 hover:via-blue-50/70 hover:to-cyan-50/70 dark:hover:from-indigo-900/30 dark:hover:via-blue-900/30 dark:hover:to-cyan-900/30 hover:shadow-md hover:border hover:border-white/30 transition-all duration-300 hover:scale-105 active:scale-95`}
              >
                <UserCircle className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'} text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors`} />
                <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                  Meu Perfil
                </span>
              </Link>
            </Tooltip>

            {/* Card do usuário */}
            <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2 p-2' : 'gap-3 px-3 py-3'} backdrop-blur-xl bg-gradient-to-br from-white/70 via-blue-50/50 to-cyan-50/50 dark:from-gray-800/70 dark:via-indigo-900/30 dark:to-blue-900/30 rounded-xl shadow-lg border border-white/30 dark:border-gray-700/30`}>
              <div className="flex-shrink-0">
                <div className={`${isCollapsed ? 'w-9 h-9 text-sm' : 'w-10 h-10 text-sm'} rounded-full backdrop-blur-xl bg-gradient-to-br from-indigo-500/90 via-blue-500/90 to-cyan-500/90 flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/30 transition-all duration-300 hover:scale-110`}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className={`flex-1 min-w-0 transition-all duration-300 ${isCollapsed ? 'w-0 h-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {user?.role === 'admin' ? 'Administrador' : user?.role === 'gestor' ? 'Gestor' : 'Operador'}
                </p>
              </div>
              <Tooltip text="Sair" show={isCollapsed}>
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 hover:scale-110 active:scale-90 flex-shrink-0"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay para mobile - com animação melhorada */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobileMenu}
      />

      {/* Main Content */}
      <div className={`min-h-screen pt-16 lg:pt-0 transition-all duration-300 ease-out ${marginLeft}`}>
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
