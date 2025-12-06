import React, { memo } from 'react'
import { LucideIcon, ArrowUp, ArrowDown } from 'lucide-react'

// ============================================
// ESTILOS GLASSMORPHISM CENTRALIZADOS
// ============================================

export const glassStyles = {
  card: 'backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/30',
  cardHover: 'hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105',
  cardSolid: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  gradient: {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600',
    pink: 'from-pink-500 to-pink-600',
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
  },
  bgLight: {
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    green: 'bg-green-50 dark:bg-green-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20',
    pink: 'bg-pink-50 dark:bg-pink-900/20',
  },
  text: {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    purple: 'text-purple-600 dark:text-purple-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    pink: 'text-pink-600 dark:text-pink-400',
  }
}

// ============================================
// TIPOS COMPARTILHADOS
// ============================================

export type ColorVariant = 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'pink' | 'indigo' | 'cyan'

export interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: ColorVariant
  subtitle?: string
  change?: number | null
  onClick?: () => void
  delay?: number
}

// ============================================
// COMPONENTE STAT CARD COMPACTO
// ============================================

export const StatCard = memo(function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  change,
  onClick,
  delay = 0
}: StatCardProps) {
  const gradientClass = glassStyles.gradient[color] || glassStyles.gradient.blue
  const textClass = glassStyles.text[color as keyof typeof glassStyles.text] || glassStyles.text.blue

  return (
    <div
      onClick={onClick}
      className={`group ${glassStyles.card} rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
      role="button"
      tabIndex={0}
      aria-label={`${title}: ${value}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Barra lateral colorida */}
      <div className="flex">
        <div className={`w-1.5 bg-gradient-to-b ${gradientClass}`} />
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${gradientClass} shadow-sm`}>
                <Icon className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                  {change !== null && change !== undefined && change !== 0 && (
                    <span className={`flex items-center text-xs font-semibold ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(change)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            {subtitle && (
              <span className={`text-xs ${textClass} bg-opacity-10 px-2 py-1 rounded-full hidden sm:inline-block`}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

// ============================================
// COMPONENTE SKELETON LOADER
// ============================================

export function StatCardSkeleton() {
  return (
    <div className={`${glassStyles.card} rounded-xl shadow-sm p-6 animate-pulse`}>
      <div className="flex items-center justify-between mb-4">
        <div className="bg-gray-200 dark:bg-gray-700 w-12 h-12 rounded-lg" />
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
    </div>
  )
}

// ============================================
// COMPONENTE PROGRESS BAR
// ============================================

interface ProgressBarProps {
  value: number
  max?: number
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'purple'
  showLabel?: boolean
  height?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  color = 'blue',
  showLabel = false,
  height = 'md',
  animated = true
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)
  
  const colorClasses = {
    green: 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600',
    yellow: 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600',
    red: 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600',
    blue: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600',
    purple: 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600',
  }

  const heightClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
  }

  return (
    <div className="w-full">
      <div className={`relative w-full backdrop-blur-xl bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden border border-white/30 ${heightClasses[height]}`}>
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          {animated && <div className="absolute inset-0 bg-white/30 animate-pulse" />}
        </div>
      </div>
      {showLabel && (
        <div className="flex justify-between items-center mt-1 text-xs text-gray-600 dark:text-gray-400">
          <span>0%</span>
          <span className="font-semibold">{Math.round(percentage)}%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// COMPONENTE BADGE
// ============================================

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  animated?: boolean
}

export function Badge({ children, variant = 'neutral', size = 'sm', animated = false }: BadgeProps) {
  const variantClasses = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  }

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${animated ? 'animate-pulse' : ''}`}>
      {children}
    </span>
  )
}

// ============================================
// COMPONENTE AVATAR
// ============================================

interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  highlight?: boolean
}

export function Avatar({ src, name, size = 'md', highlight = false }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-14 h-14 text-xl',
  }

  const initial = name.charAt(0).toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 ${
          highlight ? 'border-pink-500 ring-4 ring-pink-200' : 'border-gray-300'
        }`}
      />
    )
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold ${
      highlight
        ? 'bg-gradient-to-br from-pink-400 to-rose-500 text-white border-2 border-pink-500 ring-4 ring-pink-200'
        : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-white border-2 border-gray-300'
    }`}>
      {initial}
    </div>
  )
}

// ============================================
// COMPONENTE CARD CONTAINER
// ============================================

interface CardProps {
  children: React.ReactNode
  title?: string
  icon?: LucideIcon
  className?: string
  gradient?: string
}

export function Card({ children, title, icon: Icon, className = '', gradient }: CardProps) {
  return (
    <div className={`${glassStyles.card} rounded-2xl shadow-lg p-6 ${className}`}>
      {(title || Icon) && (
        <div className="flex items-center gap-2 mb-4">
          {Icon && (
            <div className={`p-2 rounded-lg ${gradient ? `bg-gradient-to-br ${gradient}` : 'bg-gray-100 dark:bg-gray-700'}`}>
              <Icon className={`w-5 h-5 ${gradient ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />
            </div>
          )}
          {title && (
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

// ============================================
// COMPONENTE EMPTY STATE
// ============================================

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  iconColor?: string
}

export function EmptyState({ icon: Icon, message, iconColor = 'text-gray-300 dark:text-gray-600' }: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      <Icon className={`w-16 h-16 ${iconColor} mx-auto mb-3`} aria-hidden="true" />
      <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  )
}
