import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { ReactNode } from 'react'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: ReactNode
  onClose?: () => void
  className?: string
}

export default function Alert({ type, title, message, onClose, className = '' }: AlertProps) {
  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-500',
      iconColor: 'text-green-600 dark:text-green-400',
      textColor: 'text-green-800 dark:text-green-300',
      titleColor: 'text-green-900 dark:text-green-200'
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-500',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-800 dark:text-red-300',
      titleColor: 'text-red-900 dark:text-red-200'
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-500',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      textColor: 'text-yellow-800 dark:text-yellow-300',
      titleColor: 'text-yellow-900 dark:text-yellow-200'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-500',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-blue-800 dark:text-blue-300',
      titleColor: 'text-blue-900 dark:text-blue-200'
    }
  }

  const { icon: Icon, bg, border, iconColor, textColor, titleColor } = config[type]

  return (
    <div className={`${bg} border-l-4 ${border} rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-semibold ${titleColor} mb-1`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${textColor}`}>
            {message}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`ml-3 ${iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
