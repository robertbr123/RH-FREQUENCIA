import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import axios from 'axios'

// Tipos
interface PermissionCategory {
  label: string
  icon: string
  permissions: {
    key: string
    label: string
    description: string
  }[]
}

interface PermissionDefinitions {
  [key: string]: PermissionCategory
}

interface PermissionsContextType {
  permissions: { [key: string]: boolean }
  definitions: PermissionDefinitions
  loading: boolean
  hasPermission: (key: string) => boolean
  hasAnyPermission: (keys: string[]) => boolean
  hasAllPermissions: (keys: string[]) => boolean
  refreshPermissions: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

interface PermissionsProviderProps {
  children: ReactNode
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const [permissions, setPermissions] = useState<{ [key: string]: boolean }>({})
  const [definitions, setDefinitions] = useState<PermissionDefinitions>({})
  const [loading, setLoading] = useState(true)

  const loadPermissions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await axios.get('/api/permissions/my/all', {
        headers: { Authorization: `Bearer ${token}` }
      })

      setPermissions(response.data.permissions || {})
      setDefinitions(response.data.definitions || {})
    } catch (error) {
      console.error('Erro ao carregar permissões:', error)
      // Em caso de erro, assumir todas as permissões como true para não bloquear o sistema
      // Isso é importante para não quebrar o sistema se a API de permissões falhar
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // Verificar se tem uma permissão específica
  const hasPermission = useCallback((key: string): boolean => {
    // Se está carregando, assume que tem permissão (para não bloquear a UI)
    if (loading) return true
    
    // Se não há permissões carregadas, assume acesso total (fallback)
    if (Object.keys(permissions).length === 0) return true
    
    // Verificar permissão específica
    return permissions[key] === true
  }, [permissions, loading])

  // Verificar se tem pelo menos uma das permissões
  const hasAnyPermission = useCallback((keys: string[]): boolean => {
    if (loading) return true
    if (Object.keys(permissions).length === 0) return true
    return keys.some(key => permissions[key] === true)
  }, [permissions, loading])

  // Verificar se tem todas as permissões
  const hasAllPermissions = useCallback((keys: string[]): boolean => {
    if (loading) return true
    if (Object.keys(permissions).length === 0) return true
    return keys.every(key => permissions[key] === true)
  }, [permissions, loading])

  // Recarregar permissões
  const refreshPermissions = useCallback(async () => {
    setLoading(true)
    await loadPermissions()
  }, [loadPermissions])

  const value = {
    permissions,
    definitions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}

// HOC para proteger componentes
interface ProtectedProps {
  permission: string | string[]
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean
}

export function Protected({ permission, children, fallback = null, requireAll = false }: ProtectedProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()

  const permissions = Array.isArray(permission) ? permission : [permission]
  
  const hasAccess = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Hook para verificar permissão de menu
export function useMenuPermission(menuKey: string): boolean {
  const { hasPermission } = usePermissions()
  return hasPermission(`${menuKey}.view`)
}
