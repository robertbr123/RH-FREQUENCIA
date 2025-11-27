import { ReactNode } from 'react'

interface TooltipProps {
  children: ReactNode
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ children, text, position = 'top' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  return (
    <div className="relative group inline-block">
      {children}
      <div className={`
        absolute ${positionClasses[position]}
        px-3 py-2 
        bg-gray-900 dark:bg-gray-700 
        text-white text-xs 
        rounded-lg shadow-lg
        opacity-0 group-hover:opacity-100 
        transition-opacity duration-200
        whitespace-nowrap
        pointer-events-none
        z-50
      `}>
        {text}
        {/* Arrow */}
        <div className={`
          absolute w-2 h-2 
          bg-gray-900 dark:bg-gray-700 
          transform rotate-45
          ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
          ${position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
        `} />
      </div>
    </div>
  )
}
