import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

interface Settings {
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
  require_photo: boolean
  enable_notifications: boolean
  enable_email_notifications: boolean
  auto_backup_enabled: boolean
  backup_frequency_days: number
}

interface SettingsContextType {
  settings: Settings
  loadSettings: () => Promise<void>
}

const defaultSettings: Settings = {
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
  attendance_tolerance_minutes: 5,
  max_daily_hours: 12,
  enable_facial_recognition: true,
  enable_qr_scanner: true,
  require_photo: false,
  enable_notifications: true,
  enable_email_notifications: false,
  auto_backup_enabled: false,
  backup_frequency_days: 7,
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loadSettings: async () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await axios.get('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data) {
        setSettings({ ...defaultSettings, ...response.data })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loadSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
