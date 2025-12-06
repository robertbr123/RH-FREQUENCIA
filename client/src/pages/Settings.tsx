import { useState, useEffect, FormEvent, useCallback, useMemo, useRef } from 'react'
import axios from 'axios'
import { 
  Settings as SettingsIcon, 
  Save, 
  Palette, 
  Building2, 
  Clock, 
  Shield, 
  Bell, 
  Database, 
  Globe,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Upload,
  X,
  Image,
  Eye,
  Megaphone,
  Users,
  FileText,
  MapPin,
  Lock
} from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import { toast } from '../utils/toast'
import Tooltip from '../components/Tooltip'
import PermissionsManager from '../components/PermissionsManager'

// ============================================
// TIPOS
// ============================================

interface FormData {
  system_name: string
  primary_color: string
  logo_url: string
  icon_url: string
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  timezone: string
  date_format: string
  time_format: string
  language: string
  attendance_tolerance_minutes: number
  max_daily_hours: number
  enable_facial_recognition: boolean
  enable_qr_scanner: boolean
  require_geolocation: boolean
  require_photo: boolean
  enable_notifications: boolean
  enable_email_notifications: boolean
  auto_backup_enabled: boolean
  backup_frequency_days: number
  // Campos de propaganda
  ad_enabled: boolean
  ad_title: string
  ad_subtitle: string
  ad_image_url: string
  ad_bg_color_from: string
  ad_bg_color_to: string
  ad_delay_seconds: number
  // Campos do EmployeeCheck
  ec_show_photo: boolean
  ec_show_matricula: boolean
  ec_show_position: boolean
  ec_show_department: boolean
  ec_show_punctuality: boolean
  ec_show_graph: boolean
  ec_show_stats: boolean
  ec_show_vacation_holidays: boolean
  ec_show_records_list: boolean
  ec_records_limit: number
  ec_custom_title: string
  ec_custom_subtitle: string
}

interface ValidationErrors {
  [key: string]: string
}

type TabType = 'appearance' | 'company' | 'system' | 'attendance' | 'employee-check' | 'permissions'

// ============================================
// VALORES PADRÃO
// ============================================

const DEFAULT_VALUES: FormData = {
  system_name: 'RH System',
  primary_color: '#3b82f6',
  logo_url: '',
  icon_url: '',
  company_name: '',
  company_address: '',
  company_phone: '',
  company_email: '',
  timezone: 'America/Sao_Paulo',
  date_format: 'dd/MM/yyyy',
  time_format: '24h',
  language: 'pt-BR',
  attendance_tolerance_minutes: 15,
  max_daily_hours: 8,
  enable_facial_recognition: true,
  enable_qr_scanner: true,
  require_geolocation: false,
  require_photo: false,
  enable_notifications: true,
  enable_email_notifications: false,
  auto_backup_enabled: false,
  backup_frequency_days: 7,
  // Propaganda
  ad_enabled: true,
  ad_title: 'Prefeitura Municipal de Ipixuna',
  ad_subtitle: 'Juntos por um novo tempo',
  ad_image_url: '',
  ad_bg_color_from: '#15803d',
  ad_bg_color_to: '#16a34a',
  ad_delay_seconds: 3,
  // EmployeeCheck
  ec_show_photo: true,
  ec_show_matricula: true,
  ec_show_position: true,
  ec_show_department: true,
  ec_show_punctuality: true,
  ec_show_graph: true,
  ec_show_stats: true,
  ec_show_vacation_holidays: true,
  ec_show_records_list: true,
  ec_records_limit: 10,
  ec_custom_title: 'Consulta de Frequência',
  ec_custom_subtitle: 'Digite seu CPF para verificar seus registros de ponto',
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

// Skeleton Loading para cada tab
function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-48" />
      <div className="grid grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Badge de alterações não salvas
function UnsavedBadge({ show }: { show: boolean }) {
  if (!show) return null
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full animate-pulse">
      <AlertCircle className="w-3 h-3" />
      Alterações não salvas
    </span>
  )
}

// Preview de cor em tempo real
function ColorPreview({ color }: { color: string }) {
  return (
    <div className="mt-3 p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
        <Eye className="w-4 h-4" />
        Preview da cor principal:
      </p>
      <div className="flex items-center gap-4">
        <button 
          type="button"
          style={{ backgroundColor: color }}
          className="px-4 py-2 text-white rounded-lg font-medium shadow-lg transition-transform hover:scale-105"
        >
          Botão Exemplo
        </button>
        <span style={{ color }} className="font-semibold">
          Link de Exemplo
        </span>
        <div 
          style={{ backgroundColor: color }}
          className="w-8 h-8 rounded-full shadow-lg"
        />
      </div>
    </div>
  )
}

// Upload de imagem com drag-and-drop
function ImageUpload({ 
  label, 
  value, 
  onChange, 
  previewSize = 'normal',
  placeholder 
}: { 
  label: string
  value: string
  onChange: (url: string) => void
  previewSize?: 'normal' | 'small'
  placeholder: string
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      await uploadFile(file)
    } else {
      toast.error('Por favor, selecione uma imagem válida')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await uploadFile(file)
    }
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    try {
      // Converter para base64 ou usar URL temporária
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        onChange(result)
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error('Erro ao fazer upload da imagem')
      setIsUploading(false)
    }
  }

  const previewClass = previewSize === 'small' ? 'h-10 w-10' : 'h-16'

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      
      {/* URL Input */}
      <div className="flex gap-2 mb-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent transition-all"
          placeholder={placeholder}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            title="Remover imagem"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200
          ${isDragging 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Carregando...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-2">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Arraste uma imagem ou clique para selecionar
            </span>
          </div>
        )}
      </div>

      {/* Preview */}
      {value && (
        <div className="mt-3 flex items-center gap-3">
          <div className={`${previewClass} bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center`}>
            <img 
              src={value} 
              alt="Preview" 
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = ''
                onChange('')
                toast.error('Erro ao carregar imagem')
              }}
            />
          </div>
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Imagem carregada
          </span>
        </div>
      )}
    </div>
  )
}

// Card de Toggle com animação
function ToggleCard({ 
  icon, 
  title, 
  description, 
  checked, 
  onChange,
  disabled = false
}: {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={`
      flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 group
      ${checked 
        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700' 
        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
    `}>
      <div className="flex items-center gap-3">
        <div className={`
          flex-shrink-0 p-2 rounded-lg transition-colors
          ${checked 
            ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400' 
            : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30'
          }
        `}>
          {icon}
        </div>
        <div>
          <div className={`font-medium ${checked ? 'text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-white'}`}>
            {title}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
        </div>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div className={`
          w-11 h-6 rounded-full transition-colors duration-200
          ${checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}
        `}>
          <div className={`
            absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}
          `} />
        </div>
      </div>
    </label>
  )
}

// Tab Button com badge
function TabButton({ 
  active, 
  onClick, 
  icon: Icon, 
  label,
  hasChanges = false
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  hasChanges?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 flex items-center gap-2
        ${active
          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
        }
      `}
    >
      <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
      {label}
      {hasChanges && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
      )}
    </button>
  )
}

// Input com validação
function ValidatedInput({
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  tooltip,
  min,
  max,
  required = false
}: {
  label: string
  type?: string
  value: string | number
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  tooltip?: string
  min?: number
  max?: number
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
        {tooltip && (
          <Tooltip text={tooltip}>
            <span className="text-gray-400 cursor-help">ⓘ</span>
          </Tooltip>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className={`
          w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent transition-all
          ${error 
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
            : 'border-gray-300 dark:border-gray-600'
          }
        `}
        placeholder={placeholder}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1 animate-slideDown">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function Settings() {
  const { loadSettings } = useSettings()
  const [activeTab, setActiveTab] = useState<TabType>('appearance')
  const [formData, setFormData] = useState<FormData>(DEFAULT_VALUES)
  const [originalData, setOriginalData] = useState<FormData>(DEFAULT_VALUES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  
  // Detectar alterações não salvas
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalData)
  }, [formData, originalData])

  // Detectar alterações por tab
  const getTabChanges = useCallback((tab: TabType): boolean => {
    const tabFields: Record<TabType, (keyof FormData)[]> = {
      appearance: ['system_name', 'primary_color', 'logo_url', 'icon_url'],
      company: ['company_name', 'company_address', 'company_phone', 'company_email'],
      attendance: ['attendance_tolerance_minutes', 'max_daily_hours', 'enable_facial_recognition', 'enable_qr_scanner', 'require_geolocation', 'require_photo'],
      system: ['timezone', 'date_format', 'time_format', 'language', 'enable_notifications', 'enable_email_notifications', 'auto_backup_enabled', 'backup_frequency_days'],
      'employee-check': ['ad_enabled', 'ad_title', 'ad_subtitle', 'ad_image_url', 'ad_bg_color_from', 'ad_bg_color_to', 'ad_delay_seconds', 'ec_show_photo', 'ec_show_matricula', 'ec_show_position', 'ec_show_department', 'ec_show_punctuality', 'ec_show_graph', 'ec_show_stats', 'ec_show_vacation_holidays', 'ec_show_records_list', 'ec_records_limit', 'ec_custom_title', 'ec_custom_subtitle'],
      'permissions': [] // Permissões têm gerenciamento próprio
    }
    
    return tabFields[tab].some(field => formData[field] !== originalData[field])
  }, [formData, originalData])

  // Confirmação antes de sair
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Carregar dados
  useEffect(() => {
    loadSettingsData()
  }, [])

  const loadSettingsData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setFormData(response.data)
      setOriginalData(response.data)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  // Validação em tempo real
  const validate = useCallback((data: FormData): ValidationErrors => {
    const newErrors: ValidationErrors = {}

    if (!data.system_name.trim()) {
      newErrors.system_name = 'Nome do sistema é obrigatório'
    }

    if (data.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.company_email)) {
      newErrors.company_email = 'E-mail inválido'
    }

    if (data.company_phone && !/^[\d\s()\-+]+$/.test(data.company_phone)) {
      newErrors.company_phone = 'Telefone inválido'
    }

    if (data.attendance_tolerance_minutes < 0 || data.attendance_tolerance_minutes > 60) {
      newErrors.attendance_tolerance_minutes = 'Deve ser entre 0 e 60 minutos'
    }

    if (data.max_daily_hours < 1 || data.max_daily_hours > 24) {
      newErrors.max_daily_hours = 'Deve ser entre 1 e 24 horas'
    }

    if (data.backup_frequency_days < 1 || data.backup_frequency_days > 30) {
      newErrors.backup_frequency_days = 'Deve ser entre 1 e 30 dias'
    }

    return newErrors
  }, [])

  // Atualizar campo com validação
  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      const newErrors = validate(newData)
      setErrors(newErrors)
      return newData
    })
  }, [validate])

  // Reset para valores padrão
  const handleReset = useCallback(() => {
    setFormData(DEFAULT_VALUES)
    setErrors({})
    setShowResetConfirm(false)
    toast.info('Valores restaurados para o padrão')
  }, [])

  // Cancelar alterações
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      if (confirm('Tem certeza que deseja descartar as alterações?')) {
        setFormData(originalData)
        setErrors({})
      }
    }
  }, [hasUnsavedChanges, originalData])

  // Salvar
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validate(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error('Corrija os erros antes de salvar')
      return
    }

    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      await axios.put('/api/settings', formData, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setOriginalData(formData)
      await loadSettings()

      toast.success('Configurações salvas com sucesso!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-64 animate-pulse" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-96 mt-2 animate-pulse" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <SettingsSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg transform transition-transform hover:scale-105">
              <SettingsIcon className="w-8 h-8 text-white" />
            </div>
            Configurações do Sistema
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Personalize a aparência, comportamento e regras do sistema
          </p>
        </div>
        <UnsavedBadge show={hasUnsavedChanges} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <TabButton
            active={activeTab === 'appearance'}
            onClick={() => setActiveTab('appearance')}
            icon={Palette}
            label="Aparência"
            hasChanges={getTabChanges('appearance')}
          />
          <TabButton
            active={activeTab === 'company'}
            onClick={() => setActiveTab('company')}
            icon={Building2}
            label="Empresa"
            hasChanges={getTabChanges('company')}
          />
          <TabButton
            active={activeTab === 'attendance'}
            onClick={() => setActiveTab('attendance')}
            icon={Clock}
            label="Ponto"
            hasChanges={getTabChanges('attendance')}
          />
          <TabButton
            active={activeTab === 'system'}
            onClick={() => setActiveTab('system')}
            icon={Globe}
            label="Sistema"
            hasChanges={getTabChanges('system')}
          />
          <TabButton
            active={activeTab === 'employee-check'}
            onClick={() => setActiveTab('employee-check')}
            icon={Users}
            label="Consulta Pública"
            hasChanges={getTabChanges('employee-check')}
          />
          <TabButton
            active={activeTab === 'permissions'}
            onClick={() => setActiveTab('permissions')}
            icon={Lock}
            label="Permissões"
            hasChanges={false}
          />
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
          
          {/* Tab: Aparência */}
          <div className={`transition-all duration-300 ${activeTab === 'appearance' ? 'block' : 'hidden'}`}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Palette className="w-6 h-6 text-primary-600" />
                Aparência do Sistema
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <ValidatedInput
                    label="Nome do Sistema"
                    value={formData.system_name}
                    onChange={(v) => updateField('system_name', v)}
                    error={errors.system_name}
                    placeholder="RH System"
                    required
                  />

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      Cor Principal
                      <Tooltip text="Cor usada em botões, links e destaques">
                        <span className="text-gray-400 cursor-help">ⓘ</span>
                      </Tooltip>
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => updateField('primary_color', e.target.value)}
                        className="h-12 w-20 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer transition-transform hover:scale-105"
                      />
                      <input
                        type="text"
                        value={formData.primary_color}
                        onChange={(e) => updateField('primary_color', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent transition-all"
                        placeholder="#3b82f6"
                      />
                    </div>
                    <ColorPreview color={formData.primary_color} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <ImageUpload
                    label="Logo do Sistema"
                    value={formData.logo_url}
                    onChange={(url) => updateField('logo_url', url)}
                    placeholder="https://exemplo.com/logo.png"
                  />

                  <ImageUpload
                    label="Ícone (Favicon)"
                    value={formData.icon_url}
                    onChange={(url) => updateField('icon_url', url)}
                    previewSize="small"
                    placeholder="https://exemplo.com/icon.png"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tab: Empresa */}
          <div className={`transition-all duration-300 ${activeTab === 'company' ? 'block' : 'hidden'}`}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary-600" />
                Informações da Empresa
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <ValidatedInput
                      label="Nome da Empresa"
                      value={formData.company_name}
                      onChange={(v) => updateField('company_name', v)}
                      placeholder="Nome da sua empresa"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Endereço
                    </label>
                    <textarea
                      value={formData.company_address}
                      onChange={(e) => updateField('company_address', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent transition-all resize-none"
                      rows={3}
                      placeholder="Endereço completo da empresa"
                    />
                  </div>

                  <ValidatedInput
                    label="Telefone"
                    type="tel"
                    value={formData.company_phone}
                    onChange={(v) => updateField('company_phone', v)}
                    error={errors.company_phone}
                    placeholder="(00) 0000-0000"
                  />

                  <ValidatedInput
                    label="E-mail"
                    type="email"
                    value={formData.company_email}
                    onChange={(v) => updateField('company_email', v)}
                    error={errors.company_email}
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tab: Ponto */}
          <div className={`transition-all duration-300 ${activeTab === 'attendance' ? 'block' : 'hidden'}`}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary-600" />
                Configurações de Ponto
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <ValidatedInput
                    label="Tolerância (minutos)"
                    type="number"
                    value={formData.attendance_tolerance_minutes}
                    onChange={(v) => updateField('attendance_tolerance_minutes', parseInt(v) || 0)}
                    error={errors.attendance_tolerance_minutes}
                    tooltip="Minutos de tolerância para entrada/saída sem marcar atraso"
                    min={0}
                    max={60}
                  />

                  <ValidatedInput
                    label="Horas Máximas Diárias"
                    type="number"
                    value={formData.max_daily_hours}
                    onChange={(v) => updateField('max_daily_hours', parseInt(v) || 8)}
                    error={errors.max_daily_hours}
                    min={1}
                    max={24}
                  />
                </div>

                <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Métodos de Registro</h3>
                  
                  <ToggleCard
                    icon={<Shield className="w-5 h-5" />}
                    title="Reconhecimento Facial"
                    description="Permitir registro de ponto por reconhecimento facial"
                    checked={formData.enable_facial_recognition}
                    onChange={(checked) => updateField('enable_facial_recognition', checked)}
                  />

                  <ToggleCard
                    icon={<span className="text-lg">📱</span>}
                    title="Scanner QR Code"
                    description="Permitir registro de ponto via QR Code"
                    checked={formData.enable_qr_scanner}
                    onChange={(checked) => updateField('enable_qr_scanner', checked)}
                  />

                  <ToggleCard
                    icon={<MapPin className="w-5 h-5" />}
                    title="Exigir Geolocalização"
                    description="Validar localização do funcionário ao bater ponto (configure os locais permitidos em Geolocalização)"
                    checked={formData.require_geolocation}
                    onChange={(checked) => updateField('require_geolocation', checked)}
                  />

                  <ToggleCard
                    icon={<Image className="w-5 h-5" />}
                    title="Foto Obrigatória"
                    description="Exigir foto no cadastro de funcionários"
                    checked={formData.require_photo}
                    onChange={(checked) => updateField('require_photo', checked)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tab: Sistema */}
          <div className={`transition-all duration-300 ${activeTab === 'system' ? 'block' : 'hidden'}`}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary-600" />
                Configurações do Sistema
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Fuso Horário
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => updateField('timezone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent transition-all"
                    >
                      <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                      <option value="America/Manaus">Manaus (GMT-4)</option>
                      <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                      <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Formato de Data
                    </label>
                    <select
                      value={formData.date_format}
                      onChange={(e) => updateField('date_format', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent transition-all"
                    >
                      <option value="dd/MM/yyyy">DD/MM/AAAA</option>
                      <option value="MM/dd/yyyy">MM/DD/AAAA</option>
                      <option value="yyyy-MM-dd">AAAA-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Formato de Hora
                    </label>
                    <select
                      value={formData.time_format}
                      onChange={(e) => updateField('time_format', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent transition-all"
                    >
                      <option value="24h">24 horas</option>
                      <option value="12h">12 horas (AM/PM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Idioma
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => updateField('language', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent transition-all"
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Bell className="w-5 h-5" />
                    Notificações
                  </h3>
                  
                  <ToggleCard
                    icon={<Bell className="w-5 h-5" />}
                    title="Notificações no Sistema"
                    description="Alertas e avisos internos do sistema"
                    checked={formData.enable_notifications}
                    onChange={(checked) => updateField('enable_notifications', checked)}
                  />

                  <ToggleCard
                    icon={<span className="text-lg">📧</span>}
                    title="Notificações por E-mail"
                    description="Enviar alertas importantes por e-mail"
                    checked={formData.enable_email_notifications}
                    onChange={(checked) => updateField('enable_email_notifications', checked)}
                  />
                </div>

                <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5" />
                    Backup Automático
                  </h3>
                  
                  <ToggleCard
                    icon={<Database className="w-5 h-5" />}
                    title="Ativar Backup Automático"
                    description="Criar backups periodicamente de forma automática"
                    checked={formData.auto_backup_enabled}
                    onChange={(checked) => updateField('auto_backup_enabled', checked)}
                  />

                  {formData.auto_backup_enabled && (
                    <div className="mt-4 pl-4 border-l-2 border-primary-300 dark:border-primary-700 animate-slideDown">
                      <ValidatedInput
                        label="Frequência (dias)"
                        type="number"
                        value={formData.backup_frequency_days}
                        onChange={(v) => updateField('backup_frequency_days', parseInt(v) || 7)}
                        error={errors.backup_frequency_days}
                        min={1}
                        max={30}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab: Consulta Pública (EmployeeCheck) */}
          <div className={`transition-all duration-300 ${activeTab === 'employee-check' ? 'block' : 'hidden'}`}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-primary-600" />
                Consulta Pública de Frequência
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Configure a página de consulta pública onde funcionários podem verificar sua frequência via CPF.
              </p>
              
              <div className="space-y-8">
                {/* Seção: Personalização da Página */}
                <div className="space-y-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Palette className="w-5 h-5" />
                    Personalização da Página
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ValidatedInput
                      label="Título da Página"
                      value={formData.ec_custom_title}
                      onChange={(v) => updateField('ec_custom_title', v)}
                      placeholder="Consulta de Frequência"
                      tooltip="Título exibido no topo da página"
                    />
                    <ValidatedInput
                      label="Subtítulo"
                      value={formData.ec_custom_subtitle}
                      onChange={(v) => updateField('ec_custom_subtitle', v)}
                      placeholder="Digite seu CPF para verificar..."
                      tooltip="Texto explicativo abaixo do título"
                    />
                  </div>
                </div>

                {/* Seção: Informações do Funcionário */}
                <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5" />
                    Informações do Funcionário
                  </h3>
                  
                  <ToggleCard
                    icon={<Image className="w-5 h-5" />}
                    title="Foto do Funcionário"
                    description="Exibir foto de perfil do funcionário"
                    checked={formData.ec_show_photo}
                    onChange={(checked) => updateField('ec_show_photo', checked)}
                  />
                  <ToggleCard
                    icon={<FileText className="w-5 h-5" />}
                    title="Número de Matrícula"
                    description="Exibir número de matrícula do funcionário"
                    checked={formData.ec_show_matricula}
                    onChange={(checked) => updateField('ec_show_matricula', checked)}
                  />
                  <ToggleCard
                    icon={<Shield className="w-5 h-5" />}
                    title="Cargo"
                    description="Exibir cargo/função do funcionário"
                    checked={formData.ec_show_position}
                    onChange={(checked) => updateField('ec_show_position', checked)}
                  />
                  <ToggleCard
                    icon={<Building2 className="w-5 h-5" />}
                    title="Departamento"
                    description="Exibir departamento/setor do funcionário"
                    checked={formData.ec_show_department}
                    onChange={(checked) => updateField('ec_show_department', checked)}
                  />
                </div>

                {/* Seção: Estatísticas e Gráficos */}
                <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Eye className="w-5 h-5" />
                    Estatísticas e Visualizações
                  </h3>
                  
                  <ToggleCard
                    icon={<Clock className="w-5 h-5" />}
                    title="Indicador de Pontualidade"
                    description="Mostrar taxa de chegadas no horário"
                    checked={formData.ec_show_punctuality}
                    onChange={(checked) => updateField('ec_show_punctuality', checked)}
                  />
                  <ToggleCard
                    icon={<span className="text-lg">📊</span>}
                    title="Gráfico de Frequência"
                    description="Exibir gráfico visual com barras de presença/falta"
                    checked={formData.ec_show_graph}
                    onChange={(checked) => updateField('ec_show_graph', checked)}
                  />
                  <ToggleCard
                    icon={<span className="text-lg">📈</span>}
                    title="Cards de Estatísticas"
                    description="Mostrar cards com presenças, faltas e total de horas"
                    checked={formData.ec_show_stats}
                    onChange={(checked) => updateField('ec_show_stats', checked)}
                  />
                  <ToggleCard
                    icon={<span className="text-lg">🏖️</span>}
                    title="Férias e Feriados"
                    description="Exibir contagem de dias de férias e feriados"
                    checked={formData.ec_show_vacation_holidays}
                    onChange={(checked) => updateField('ec_show_vacation_holidays', checked)}
                  />
                </div>

                {/* Seção: Lista de Registros */}
                <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5" />
                    Lista de Registros
                  </h3>
                  
                  <ToggleCard
                    icon={<span className="text-lg">📋</span>}
                    title="Lista de Registros Detalhados"
                    description="Exibir lista com cada dia de trabalho e horários"
                    checked={formData.ec_show_records_list}
                    onChange={(checked) => updateField('ec_show_records_list', checked)}
                  />
                  
                  {formData.ec_show_records_list && (
                    <div className="mt-4 pl-4 border-l-2 border-primary-300 dark:border-primary-700 animate-slideDown">
                      <ValidatedInput
                        label="Limite de Registros"
                        type="number"
                        value={formData.ec_records_limit}
                        onChange={(v) => updateField('ec_records_limit', parseInt(v) || 10)}
                        tooltip="Quantidade máxima de registros a exibir na lista"
                        min={5}
                        max={50}
                      />
                    </div>
                  )}
                </div>

                {/* Seção: Propaganda */}
                <div className="space-y-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Megaphone className="w-5 h-5 text-green-600" />
                    Propaganda / Publicidade
                  </h3>
                  
                  <ToggleCard
                    icon={<Megaphone className="w-5 h-5" />}
                    title="Exibir Propaganda"
                    description="Mostrar banner de propaganda após alguns segundos"
                    checked={formData.ad_enabled}
                    onChange={(checked) => updateField('ad_enabled', checked)}
                  />

                  {formData.ad_enabled && (
                    <div className="space-y-4 mt-4 animate-slideDown">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ValidatedInput
                          label="Título da Propaganda"
                          value={formData.ad_title}
                          onChange={(v) => updateField('ad_title', v)}
                          placeholder="Ex: Prefeitura Municipal"
                        />
                        <ValidatedInput
                          label="Slogan"
                          value={formData.ad_subtitle}
                          onChange={(v) => updateField('ad_subtitle', v)}
                          placeholder="Ex: Juntos por um novo tempo"
                        />
                      </div>

                      <ImageUpload
                        label="Logo da Propaganda"
                        value={formData.ad_image_url}
                        onChange={(url) => updateField('ad_image_url', url)}
                        placeholder="https://exemplo.com/logo.png"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Cor Inicial
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={formData.ad_bg_color_from}
                              onChange={(e) => updateField('ad_bg_color_from', e.target.value)}
                              className="h-10 w-14 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={formData.ad_bg_color_from}
                              onChange={(e) => updateField('ad_bg_color_from', e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Cor Final
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={formData.ad_bg_color_to}
                              onChange={(e) => updateField('ad_bg_color_to', e.target.value)}
                              className="h-10 w-14 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={formData.ad_bg_color_to}
                              onChange={(e) => updateField('ad_bg_color_to', e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                        <ValidatedInput
                          label="Delay (segundos)"
                          type="number"
                          value={formData.ad_delay_seconds}
                          onChange={(v) => updateField('ad_delay_seconds', parseInt(v) || 3)}
                          min={1}
                          max={30}
                        />
                      </div>

                      {/* Preview da Propaganda */}
                      <div className="mt-4 p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Preview:
                        </p>
                        <div 
                          className="rounded-xl shadow-lg overflow-hidden"
                          style={{ background: `linear-gradient(to right, ${formData.ad_bg_color_from}, ${formData.ad_bg_color_to})` }}
                        >
                          <div className="p-3 flex items-center gap-3">
                            {formData.ad_image_url ? (
                              <img src={formData.ad_image_url} alt="" className="w-12 h-12 object-contain rounded-lg bg-white/10 p-1" />
                            ) : (
                              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-xl">🏛️</div>
                            )}
                            <div>
                              <p className="text-white font-bold text-sm">{formData.ad_title || 'Título'}</p>
                              <p className="text-yellow-300 text-xs italic">"{formData.ad_subtitle || 'Slogan'}"</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab: Permissões */}
          <div className={`transition-all duration-300 ${activeTab === 'permissions' ? 'block' : 'hidden'}`}>
            <div className="p-6">
              <PermissionsManager />
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar Padrão
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={!hasUnsavedChanges}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || Object.keys(errors).length > 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Modal de Confirmação de Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md mx-4 animate-slideUp">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Restaurar Valores Padrão?
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Esta ação irá restaurar todas as configurações para os valores padrão do sistema. Suas alterações atuais serão perdidas.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Restaurar Padrão
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
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .animate-slideDown { animation: slideDown 0.2s ease-out; }
      `}</style>
    </div>
  )
}
