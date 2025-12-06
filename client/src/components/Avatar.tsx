import { getAvatarProps } from '../utils/avatarColors'

interface AvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showStatus?: boolean
  isActive?: boolean
}

const sizeClasses = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
}

const statusSizeClasses = {
  xs: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
  sm: 'w-3 h-3 -bottom-0.5 -right-0.5',
  md: 'w-3.5 h-3.5 -bottom-1 -right-1',
  lg: 'w-4 h-4 -bottom-1 -right-1',
  xl: 'w-5 h-5 -bottom-1 -right-1',
}

export default function Avatar({ 
  name, 
  photoUrl, 
  size = 'md', 
  className = '',
  showStatus = false,
  isActive = true
}: AvatarProps) {
  const { initials, gradientClass, textClass } = getAvatarProps(name)

  return (
    <div className={`relative inline-flex ${className}`}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-md`}
        />
      ) : (
        <div
          className={`
            ${sizeClasses[size]} 
            ${gradientClass}
            rounded-full 
            flex items-center justify-center 
            font-bold ${textClass}
            shadow-md
            border-2 border-white/30
            transition-transform duration-200
            hover:scale-105
          `}
          title={name}
        >
          {initials}
        </div>
      )}
      
      {showStatus && (
        <span
          className={`
            absolute ${statusSizeClasses[size]}
            rounded-full 
            border-2 border-white dark:border-gray-700
            ${isActive ? 'bg-green-500' : 'bg-gray-400'}
          `}
        />
      )}
    </div>
  )
}
