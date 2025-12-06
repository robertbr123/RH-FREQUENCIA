import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Navigation,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Map,
  Crosshair,
  Info
} from 'lucide-react'
import { toast } from '../utils/toast'

// ============ TIPOS ============
interface Location {
  id: number
  name: string
  description: string | null
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface LocationForm {
  name: string
  description: string
  latitude: string
  longitude: string
  radius_meters: string
  is_active: boolean
}

const DEFAULT_FORM: LocationForm = {
  name: '',
  description: '',
  latitude: '',
  longitude: '',
  radius_meters: '100',
  is_active: true
}

// ============ COMPONENTES AUXILIARES ============

function LocationCard({ 
  location, 
  onEdit, 
  onDelete, 
  onToggle 
}: { 
  location: Location
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 ${
      location.is_active 
        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
        : 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600 opacity-60'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className={`w-5 h-5 ${location.is_active ? 'text-primary-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-gray-900 dark:text-white">{location.name}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              location.is_active 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {location.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          
          {location.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{location.description}</p>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Navigation className="w-4 h-4" />
              <span>Lat: {parseFloat(String(location.latitude)).toFixed(6)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Navigation className="w-4 h-4 rotate-90" />
              <span>Lng: {parseFloat(String(location.longitude)).toFixed(6)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Target className="w-4 h-4" />
              <span>Raio: {location.radius_meters}m</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Atualizado em: {formatDate(location.updated_at || location.created_at)}
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={onToggle}
            className={`p-2 rounded-lg transition-colors ${
              location.is_active
                ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={location.is_active ? 'Desativar' : 'Ativar'}
          >
            {location.is_active ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal de formulário
function LocationModal({
  isOpen,
  onClose,
  onSave,
  form,
  setForm,
  isEditing,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  form: LocationForm
  setForm: (form: LocationForm) => void
  isEditing: boolean
  isLoading: boolean
}) {
  const [gettingLocation, setGettingLocation] = useState(false)

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste navegador')
      return
    }

    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm({
          ...form,
          latitude: position.coords.latitude.toFixed(8),
          longitude: position.coords.longitude.toFixed(8)
        })
        setGettingLocation(false)
        toast.success('Localização atual capturada!')
      },
      (error) => {
        console.error('Erro ao obter localização:', error)
        toast.error('Erro ao obter localização. Verifique as permissões.')
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary-600" />
            {isEditing ? 'Editar Localização' : 'Nova Localização'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Nome do Local <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Ex: Sede Principal"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Ex: Prédio administrativo"
            />
          </div>

          {/* Botão para capturar localização atual */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <Crosshair className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Usar Localização Atual
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Capture as coordenadas do seu dispositivo
                </p>
              </div>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {gettingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                {gettingLocation ? 'Obtendo...' : 'Capturar'}
              </button>
            </div>
          </div>

          {/* Latitude e Longitude */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Latitude <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="-9.9747"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Longitude <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="-67.8249"
              />
            </div>
          </div>

          {/* Raio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Raio Permitido (metros) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={form.radius_meters}
                onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="10000"
                  value={form.radius_meters}
                  onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-center"
                />
                <span className="text-gray-500 dark:text-gray-400">m</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              O funcionário precisa estar dentro deste raio para bater o ponto
            </p>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Status</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {form.is_active ? 'Local ativo para validação' : 'Local desativado'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                form.is_active ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                  form.is_active ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
            </label>
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium">Dica:</p>
              <p>Você pode usar o Google Maps para obter as coordenadas. Clique com o botão direito no mapa e copie as coordenadas.</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={isLoading || !form.name || !form.latitude || !form.longitude}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEditing ? 'Salvar Alterações' : 'Criar Localização'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ COMPONENTE PRINCIPAL ============
export default function GeolocSettings() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<LocationForm>(DEFAULT_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // Carregar localizações
  const loadLocations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/locations', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLocations(response.data)
    } catch (error) {
      console.error('Erro ao carregar localizações:', error)
      toast.error('Erro ao carregar localizações')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLocations()
  }, [loadLocations])

  // Abrir modal para criar
  const handleCreate = () => {
    setForm(DEFAULT_FORM)
    setEditingId(null)
    setIsModalOpen(true)
  }

  // Abrir modal para editar
  const handleEdit = (location: Location) => {
    setForm({
      name: location.name,
      description: location.description || '',
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      radius_meters: String(location.radius_meters),
      is_active: location.is_active
    })
    setEditingId(location.id)
    setIsModalOpen(true)
  }

  // Salvar (criar ou atualizar)
  const handleSave = async () => {
    if (!form.name || !form.latitude || !form.longitude) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const data = {
        name: form.name,
        description: form.description || null,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_meters: parseFloat(form.radius_meters) || 100,
        is_active: form.is_active
      }

      if (editingId) {
        await axios.put(`/api/locations/${editingId}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        })
        toast.success('Localização atualizada com sucesso!')
      } else {
        await axios.post('/api/locations', data, {
          headers: { Authorization: `Bearer ${token}` }
        })
        toast.success('Localização criada com sucesso!')
      }

      setIsModalOpen(false)
      loadLocations()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar localização')
    } finally {
      setSaving(false)
    }
  }

  // Toggle ativo/inativo
  const handleToggle = async (id: number) => {
    try {
      const token = localStorage.getItem('token')
      await axios.patch(`/api/locations/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      loadLocations()
    } catch (error) {
      toast.error('Erro ao alternar status')
    }
  }

  // Deletar
  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/locations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Localização removida com sucesso!')
      setDeleteConfirm(null)
      loadLocations()
    } catch (error) {
      toast.error('Erro ao remover localização')
    }
  }

  // Estatísticas
  const stats = useMemo(() => ({
    total: locations.length,
    active: locations.filter(l => l.is_active).length,
    inactive: locations.filter(l => !l.is_active).length
  }), [locations])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            Localizações Permitidas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure os locais onde os funcionários podem bater ponto
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-lg transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Novo Local
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Map className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Locais Cadastrados</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Locais Ativos</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <XCircle className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inactive}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Locais Inativos</p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium mb-1">Como funciona:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
            <li>Cadastre os locais onde os funcionários podem registrar ponto</li>
            <li>Defina o raio (em metros) de tolerância para cada local</li>
            <li>O funcionário precisa estar dentro do raio de pelo menos um local ativo</li>
            <li>Se nenhum local estiver cadastrado, a validação de geolocalização será desativada</li>
          </ul>
        </div>
      </div>

      {/* Lista de Localizações */}
      <div className="space-y-4">
        {locations.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma localização cadastrada
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Adicione locais para validar onde os funcionários podem bater ponto
            </p>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Adicionar Primeiro Local
            </button>
          </div>
        ) : (
          locations.map(location => (
            <LocationCard
              key={location.id}
              location={location}
              onEdit={() => handleEdit(location)}
              onDelete={() => setDeleteConfirm(location.id)}
              onToggle={() => handleToggle(location.id)}
            />
          ))
        )}
      </div>

      {/* Modal de Formulário */}
      <LocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        form={form}
        setForm={setForm}
        isEditing={!!editingId}
        isLoading={saving}
      />

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Confirmar Exclusão
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir esta localização? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS para animações */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  )
}
