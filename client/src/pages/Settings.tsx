import { useState, useEffect, FormEvent } from 'react'
import axios from 'axios'
import { Settings as SettingsIcon, Save } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

export default function Settings() {
  const { loadSettings } = useSettings()
  const [formData, setFormData] = useState({
    system_name: '',
    primary_color: '#3b82f6',
    logo_url: '',
    icon_url: '',
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
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

      alert('Configurações salvas com sucesso!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao salvar configurações')
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg">
            <SettingsIcon className="w-8 h-8 text-white" />
          </div>
          Configurações do Sistema
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Personalize a aparência e informações do sistema
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Aparência do Sistema */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Aparência do Sistema</h2>
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
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Cor Principal
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
              </div>
            </div>
          </div>

          {/* Informações da Empresa */}
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Informações da Empresa</h2>
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

        {/* Botão Salvar */}
        <div className="mt-6 flex justify-end">
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
