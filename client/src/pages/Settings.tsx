import { useState, useEffect, FormEvent } from 'react'
import axios from 'axios'
import { Settings as SettingsIcon, Save, Palette, Building2, Clock, Shield, Bell, Database, Globe } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import { toast } from '../utils/toast'
import Tooltip from '../components/Tooltip'

export default function Settings() {
  const { loadSettings } = useSettings()
  const [activeTab, setActiveTab] = useState<'appearance' | 'company' | 'system' | 'attendance'>('appearance')
  const [formData, setFormData] = useState({
    system_name: '',
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
    require_photo: false,
    enable_notifications: true,
    enable_email_notifications: false,
    auto_backup_enabled: false,
    backup_frequency_days: 7,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      await axios.put('/api/settings', formData, {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Recarregar configurações no contexto
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg">
            <SettingsIcon className="w-8 h-8 text-white" />
          </div>
          Configurações do Sistema
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Personalize a aparência, comportamento e regras do sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'appearance'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
            }`}
          >
            <Palette className="w-5 h-5" />
            Aparência
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'company'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
            }`}
          >
            <Building2 className="w-5 h-5" />
            Empresa
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'attendance'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
            }`}
          >
            <Clock className="w-5 h-5" />
            Ponto
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'system'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
            }`}
          >
            <Globe className="w-5 h-5" />
            Sistema
          </button>
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          
          {/* Tab: Aparência */}
          {activeTab === 'appearance' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Palette className="w-6 h-6 text-primary-600" />
                Aparência do Sistema
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Nome do Sistema
                    </label>
                    <input
                      type="text"
                      value={formData.system_name}
                      onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                      placeholder="RH System"
                    />
                  </div>

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
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="h-12 w-20 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      URL do Logo
                    </label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                      placeholder="https://exemplo.com/logo.png"
                    />
                    {formData.logo_url && (
                      <img src={formData.logo_url} alt="Preview" className="mt-2 h-12 object-contain" />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      URL do Ícone
                    </label>
                    <input
                      type="url"
                      value={formData.icon_url}
                      onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                      placeholder="https://exemplo.com/icon.png"
                    />
                    {formData.icon_url && (
                      <img src={formData.icon_url} alt="Preview" className="mt-2 h-8 w-8 object-contain" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Empresa */}
          {activeTab === 'company' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary-600" />
                Informações da Empresa
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Nome da Empresa
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                      placeholder="Nome da sua empresa"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Endereço
                    </label>
                    <textarea
                      value={formData.company_address}
                      onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                      rows={3}
                      placeholder="Endereço completo da empresa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={formData.company_phone}
                      onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                      placeholder="(00) 0000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.company_email}
                      onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                      placeholder="contato@empresa.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Ponto */}
          {activeTab === 'attendance' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary-600" />
                Configurações de Ponto
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      Tolerância (minutos)
                      <Tooltip text="Minutos de tolerância para entrada/saída sem marcar atraso">
                        <span className="text-gray-400 cursor-help">ⓘ</span>
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={formData.attendance_tolerance_minutes}
                      onChange={(e) => setFormData({ ...formData, attendance_tolerance_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Horas Máximas Diárias
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={formData.max_daily_hours}
                      onChange={(e) => setFormData({ ...formData, max_daily_hours: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Métodos de Registro</h3>
                  
                  <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <Shield className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Reconhecimento Facial</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Permitir registro por face</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.enable_facial_recognition}
                      onChange={(e) => setFormData({ ...formData, enable_facial_recognition: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <span className="text-xl">📱</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Scanner QR Code</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Permitir registro por QR</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.enable_qr_scanner}
                      onChange={(e) => setFormData({ ...formData, enable_qr_scanner: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <span className="text-xl">📸</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Foto Obrigatória</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Exigir foto no cadastro</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.require_photo}
                      onChange={(e) => setFormData({ ...formData, require_photo: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Sistema */}
          {activeTab === 'system' && (
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
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
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
                      onChange={(e) => setFormData({ ...formData, date_format: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
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
                      onChange={(e) => setFormData({ ...formData, time_format: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
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
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notificações
                  </h3>
                  
                  <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Notificações no Sistema</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Alertas e avisos internos</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.enable_notifications}
                      onChange={(e) => setFormData({ ...formData, enable_notifications: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Notificações por E-mail</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Enviar alertas por e-mail</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.enable_email_notifications}
                      onChange={(e) => setFormData({ ...formData, enable_email_notifications: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </label>
                </div>

                <div className="space-y-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Backup Automático
                  </h3>
                  
                  <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Ativar Backup Automático</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Criar backups periodicamente</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.auto_backup_enabled}
                      onChange={(e) => setFormData({ ...formData, auto_backup_enabled: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </label>

                  {formData.auto_backup_enabled && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Frequência (dias)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={formData.backup_frequency_days}
                        onChange={(e) => setFormData({ ...formData, backup_frequency_days: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botão Salvar */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={loadSettingsData}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  )
}
