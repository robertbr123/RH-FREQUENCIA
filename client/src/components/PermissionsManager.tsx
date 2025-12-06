import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { 
  Shield, 
  Save, 
  RefreshCw, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
  UserCog,
  User,
  Home,
  Clock,
  FileText,
  Building,
  Settings,
  Database,
  QrCode,
  MapPin,
  Bell,
  HelpCircle
} from 'lucide-react'
import { toast } from '../utils/toast'

// Tipos
interface Permission {
  key: string
  label: string
  description: string
}

interface PermissionCategory {
  label: string
  icon: string
  permissions: Permission[]
}

interface PermissionDefinitions {
  [key: string]: PermissionCategory
}

interface PermissionsByRole {
  [role: string]: {
    [key: string]: boolean
  }
}

interface PermissionsData {
  definitions: PermissionDefinitions
  permissions: PermissionsByRole
  initialized: boolean
}

// Mapeamento de ícones
const ICON_MAP: { [key: string]: React.ReactNode } = {
  Home: <Home className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  Clock: <Clock className="w-5 h-5" />,
  QrCode: <QrCode className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  Building: <Building className="w-5 h-5" />,
  UserCog: <UserCog className="w-5 h-5" />,
  Settings: <Settings className="w-5 h-5" />,
  Database: <Database className="w-5 h-5" />,
  MapPin: <MapPin className="w-5 h-5" />,
  Bell: <Bell className="w-5 h-5" />,
  HelpCircle: <HelpCircle className="w-5 h-5" />
}

// Cores por role
const ROLE_COLORS = {
  admin: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
    accent: 'from-purple-500 to-purple-600'
  },
  gestor: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    accent: 'from-blue-500 to-blue-600'
  },
  operador: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700',
    accent: 'from-green-500 to-green-600'
  }
}

const ROLE_LABELS = {
  admin: 'Administrador',
  gestor: 'Gestor',
  operador: 'Operador'
}

const ROLE_DESCRIPTIONS = {
  admin: 'Acesso total ao sistema',
  gestor: 'Gerenciamento de equipe e frequência',
  operador: 'Operações básicas de ponto'
}

export default function PermissionsManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [data, setData] = useState<PermissionsData | null>(null)
  const [localPermissions, setLocalPermissions] = useState<PermissionsByRole>({})
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedRole, setSelectedRole] = useState<'admin' | 'gestor' | 'operador'>('gestor')
  const [hasChanges, setHasChanges] = useState(false)

  // Carregar permissões
  const loadPermissions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get<PermissionsData>('/api/permissions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setData(response.data)
      setLocalPermissions(response.data.permissions || {})
      setHasChanges(false)
    } catch (error) {
      console.error('Erro ao carregar permissões:', error)
      toast.error('Erro ao carregar permissões')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // Inicializar permissões
  const handleInitialize = async () => {
    setInitializing(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/permissions/initialize', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Permissões inicializadas com sucesso!')
      await loadPermissions()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao inicializar permissões')
    } finally {
      setInitializing(false)
    }
  }

  // Alternar permissão
  const togglePermission = (role: string, key: string) => {
    setLocalPermissions(prev => {
      const newPermissions = { ...prev }
      if (!newPermissions[role]) {
        newPermissions[role] = {}
      }
      newPermissions[role][key] = !newPermissions[role]?.[key]
      return newPermissions
    })
    setHasChanges(true)
  }

  // Alternar todas as permissões de uma categoria
  const toggleCategory = (role: string, category: string, enable: boolean) => {
    const categoryData = data?.definitions[category]
    if (!categoryData) return

    setLocalPermissions(prev => {
      const newPermissions = { ...prev }
      if (!newPermissions[role]) {
        newPermissions[role] = {}
      }
      categoryData.permissions.forEach(perm => {
        newPermissions[role][perm.key] = enable
      })
      return newPermissions
    })
    setHasChanges(true)
  }

  // Alternar expansão de categoria
  const toggleCategoryExpand = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Expandir/recolher todas
  const toggleAllCategories = (expand: boolean) => {
    if (expand && data) {
      setExpandedCategories(new Set(Object.keys(data.definitions)))
    } else {
      setExpandedCategories(new Set())
    }
  }

  // Salvar permissões
  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      await axios.put('/api/permissions', { permissions: localPermissions }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Permissões salvas com sucesso!')
      setHasChanges(false)
      await loadPermissions()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar permissões')
    } finally {
      setSaving(false)
    }
  }

  // Verificar se permissão está habilitada
  const isPermissionEnabled = (role: string, key: string): boolean => {
    return localPermissions[role]?.[key] ?? false
  }

  // Contar permissões habilitadas de uma categoria
  const countEnabledInCategory = (role: string, category: string): number => {
    const categoryData = data?.definitions[category]
    if (!categoryData) return 0
    return categoryData.permissions.filter(p => isPermissionEnabled(role, p.key)).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando permissões...</span>
      </div>
    )
  }

  if (!data?.initialized) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
          Sistema de Permissões não Inicializado
        </h3>
        <p className="text-amber-700 dark:text-amber-300 mb-4">
          As permissões padrão ainda não foram configuradas. Clique no botão abaixo para inicializar.
        </p>
        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {initializing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Inicializando...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Inicializar Permissões
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" />
            Gerenciamento de Permissões
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure o que cada nível de acesso pode visualizar e executar no sistema
          </p>
        </div>
        
        {hasChanges && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium rounded-full animate-pulse">
            <AlertCircle className="w-4 h-4" />
            Alterações não salvas
          </span>
        )}
      </div>

      {/* Seletor de Role */}
      <div className="grid grid-cols-3 gap-4">
        {(['admin', 'gestor', 'operador'] as const).map(role => {
          const colors = ROLE_COLORS[role]
          const isSelected = selectedRole === role
          const enabledCount = Object.values(localPermissions[role] || {}).filter(Boolean).length
          const totalCount = Object.values(data?.definitions || {}).reduce(
            (acc, cat) => acc + cat.permissions.length, 0
          )
          
          return (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                ${isSelected 
                  ? `${colors.border} ${colors.bg} shadow-lg scale-[1.02]` 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${colors.accent}`}>
                  {role === 'admin' && <Shield className="w-5 h-5 text-white" />}
                  {role === 'gestor' && <UserCog className="w-5 h-5 text-white" />}
                  {role === 'operador' && <User className="w-5 h-5 text-white" />}
                </div>
                <div className="text-left">
                  <div className={`font-semibold ${isSelected ? colors.text : 'text-gray-900 dark:text-white'}`}>
                    {ROLE_LABELS[role]}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {ROLE_DESCRIPTIONS[role]}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  Permissões ativas:
                </span>
                <span className={`font-semibold ${colors.text}`}>
                  {enabledCount}/{totalCount}
                </span>
              </div>
              {isSelected && (
                <div className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r ${colors.accent} rounded-full`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => toggleAllCategories(true)}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Expandir Tudo
          </button>
          <button
            onClick={() => toggleAllCategories(false)}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Recolher Tudo
          </button>
        </div>
      </div>

      {/* Lista de Categorias e Permissões */}
      <div className="space-y-3">
        {Object.entries(data?.definitions || {}).map(([categoryKey, category]) => {
          const isExpanded = expandedCategories.has(categoryKey)
          const enabledCount = countEnabledInCategory(selectedRole, categoryKey)
          const totalCount = category.permissions.length
          const allEnabled = enabledCount === totalCount
          const noneEnabled = enabledCount === 0
          const colors = ROLE_COLORS[selectedRole]
          
          return (
            <div 
              key={categoryKey}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200"
            >
              {/* Header da Categoria */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => toggleCategoryExpand(categoryKey)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    {ICON_MAP[category.icon] || <Shield className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {category.label}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {enabledCount} de {totalCount} permissões ativas
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Toggle All */}
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCategory(selectedRole, categoryKey, true) }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        allEnabled 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
                      }`}
                      title="Habilitar todas"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCategory(selectedRole, categoryKey, false) }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        noneEnabled 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
                      }`}
                      title="Desabilitar todas"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Lista de Permissões */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  {category.permissions.map((perm) => {
                    const enabled = isPermissionEnabled(selectedRole, perm.key)
                    
                    return (
                      <label
                        key={perm.key}
                        className={`
                          flex items-center justify-between p-4 cursor-pointer transition-colors
                          ${enabled 
                            ? `${colors.bg}` 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                          }
                          border-b border-gray-100 dark:border-gray-700 last:border-b-0
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-2 h-2 rounded-full transition-colors
                            ${enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                          `} />
                          <div>
                            <div className={`font-medium ${enabled ? colors.text : 'text-gray-700 dark:text-gray-300'}`}>
                              {perm.label}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {perm.description}
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => togglePermission(selectedRole, perm.key)}
                            className="sr-only"
                          />
                          <div className={`
                            w-11 h-6 rounded-full transition-colors duration-200
                            ${enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                          `}>
                            <div className={`
                              absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200
                              ${enabled ? 'translate-x-5' : 'translate-x-0.5'}
                            `} />
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={loadPermissions}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Recarregar
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salvar Permissões
            </>
          )}
        </button>
      </div>

      {/* Dica */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200">Dica</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              As alterações de permissões entram em vigor imediatamente após salvar. 
              Os usuários afetados precisarão fazer logout e login novamente para que as novas permissões sejam aplicadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
