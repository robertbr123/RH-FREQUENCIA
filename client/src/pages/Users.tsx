import { useState, useEffect } from 'react'
import axios from 'axios'
import { Users as UsersIcon, Plus, Edit, Trash2, Lock, UserCheck, UserX, Shield, Mail, List, LayoutGrid } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import LoadingSpinner, { SkeletonTable } from '../components/LoadingSpinner'
import { toast } from '../utils/toast'
import { getErrorMessage } from '../utils/errorMessages'

interface User {
  id: number
  username: string
  name: string
  email: string
  role: string
  department_id?: number
  status: string
  created_at: string
}

interface Department {
  id: number
  name: string
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    userId: null as number | null,
    userName: ''
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list')

  useEffect(() => {
    loadUsers()
    loadDepartments()
  }, [])

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUsers(response.data)
    } catch (error) {
      const message = getErrorMessage(error)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/organization/departments', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDepartments(response.data)
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error)
    }
  }

  const handleDelete = async (id: number) => {
    const user = users.find(u => u.id === id)
    setConfirmDialog({
      isOpen: true,
      userId: id,
      userName: user?.name || ''
    })
  }

  const confirmDelete = async () => {
    if (!confirmDialog.userId) return

    setIsDeleting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/users/${confirmDialog.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Usuário removido com sucesso!')
      setConfirmDialog({ isOpen: false, userId: null, userName: '' })
      loadUsers()
    } catch (error: any) {
      const message = getErrorMessage(error)
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
      gestor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      operador: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    }
    const labels = {
      admin: 'Administrador',
      gestor: 'Gestor',
      operador: 'Operador',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[role as keyof typeof colors]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    )
  }

  // Calcular estatísticas
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === 'active').length
  const inactiveUsers = users.filter(u => u.status === 'inactive').length
  const adminUsers = users.filter(u => u.role === 'admin').length

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header com Gradiente */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Gerenciamento de Usuários
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Controle de acesso e permissões do sistema</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Novo Usuário
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slide-in-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total de Usuários</p>
              <p className="text-3xl font-bold mt-2">{totalUsers}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <UsersIcon className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slide-in-up" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Usuários Ativos</p>
              <p className="text-3xl font-bold mt-2">{activeUsers}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <UserCheck className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slide-in-up" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Usuários Inativos</p>
              <p className="text-3xl font-bold mt-2">{inactiveUsers}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <UserX className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slide-in-up" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Administradores</p>
              <p className="text-3xl font-bold mt-2">{adminUsers}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Shield className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Toggle entre Cards e Lista */}
      <div className="flex items-center justify-end mb-6 gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Visualização:</span>
        <button
          onClick={() => setViewMode('cards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
            viewMode === 'cards'
              ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Cards
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
            viewMode === 'list'
              ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <List className="w-4 h-4" />
          Lista
        </button>
      </div>

      {/* Lista de Usuários */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-12 text-center">
          <UsersIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <p className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Nenhum usuário encontrado
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Clique em "Novo Usuário" para criar o primeiro usuário
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Visualização em Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user, index) => {
            const roleColors = {
              admin: 'from-purple-500 to-purple-600',
              gestor: 'from-blue-500 to-blue-600',
              operador: 'from-green-500 to-green-600',
            }
            const roleIcons = {
              admin: Shield,
              gestor: UsersIcon,
              operador: UserCheck,
            }
            const RoleIcon = roleIcons[user.role as keyof typeof roleIcons] || UserCheck
            const gradientColor = roleColors[user.role as keyof typeof roleColors] || 'from-gray-500 to-gray-600'

            return (
              <div
                key={user.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden animate-scale-in"
                style={{animationDelay: `${index * 0.05}s`}}
              >
                {/* Header do Card com Gradiente */}
                <div className={`bg-gradient-to-r ${gradientColor} p-6 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        <RoleIcon className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{user.name}</h3>
                        <p className="text-sm opacity-90">@{user.username}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    {user.email && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Nível:</span>
                      {getRoleBadge(user.role)}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}
                      >
                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingUser(user)
                        setShowModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm font-medium">Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-md"
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Deletar</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Visualização em Lista/Tabela */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Nome</th>
                <th className="px-6 py-4 text-left font-semibold">Usuário</th>
                <th className="px-6 py-4 text-left font-semibold">Email</th>
                <th className="px-6 py-4 text-left font-semibold">Nível</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => {
                const roleColors = {
                  admin: 'text-purple-600 dark:text-purple-400',
                  gestor: 'text-blue-600 dark:text-blue-400',
                  operador: 'text-green-600 dark:text-green-400',
                }
                const roleIcons = {
                  admin: Shield,
                  gestor: UsersIcon,
                  operador: UserCheck,
                }
                const RoleIcon = roleIcons[user.role as keyof typeof roleIcons] || UserCheck
                const roleColor = roleColors[user.role as keyof typeof roleColors] || 'text-gray-600'
                
                return (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${
                          user.role === 'admin' ? 'from-purple-500 to-purple-600' :
                          user.role === 'gestor' ? 'from-blue-500 to-blue-600' :
                          'from-green-500 to-green-600'
                        }`}>
                          <RoleIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{user.username}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {user.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}
                      >
                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(user)
                            setShowModal(true)
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <UserModal
          user={editingUser}
          departments={departments}
          onClose={() => {
            setShowModal(false)
            setEditingUser(null)
          }}
          onSave={() => {
            setShowModal(false)
            setEditingUser(null)
            loadUsers()
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, userId: null, userName: '' })}
        onConfirm={confirmDelete}
        title="Deletar Usuário"
        message={`Tem certeza que deseja deletar o usuário "${confirmDialog.userName}"? Esta ação não pode ser desfeita!`}
        confirmText="Sim, Deletar"
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}

// Modal Component
function UserModal({
  user,
  departments,
  onClose,
  onSave,
}: {
  user: User | null
  departments: Department[]
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'operador',
    department_id: user?.department_id || null,
    status: user?.status || 'active',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }

      // Validar se gestor tem departamento
      if (formData.role === 'gestor' && !formData.department_id) {
        toast.warning('Departamento é obrigatório para gestores')
        setLoading(false)
        return
      }

      const submitData = {
        ...formData,
        department_id: formData.department_id || null,
      }

      if (user) {
        // Editar
        await axios.put(`/api/users/${user.id}`, submitData, config)
        toast.success('Usuário atualizado com sucesso!')
      } else {
        // Criar
        if (!formData.password) {
          toast.warning('Senha é obrigatória para novos usuários')
          setLoading(false)
          return
        }
        await axios.post('/api/users', submitData, config)
        toast.success('Usuário criado com sucesso!')
      }

      onSave()
    } catch (error: any) {
      const message = getErrorMessage(error)
      toast.error(message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {user ? 'Editar Usuário' : 'Novo Usuário'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuário *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={!!user}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required={!user}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nível de Acesso *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value, department_id: e.target.value !== 'gestor' ? null : formData.department_id })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="operador">Operador</option>
              <option value="gestor">Gestor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {formData.role === 'gestor' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Departamento *
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.department_id || ''}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required={formData.role === 'gestor'}
              >
                <option value="">Selecione um departamento</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                O gestor terá acesso apenas aos funcionários deste departamento
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
