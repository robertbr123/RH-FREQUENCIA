interface OnlineStatusBarProps {
  isOnline: boolean
  isFullscreen?: boolean
}

/**
 * Barra de status online/offline fixa na parte inferior
 */
export default function OnlineStatusBar({ isOnline, isFullscreen = false }: OnlineStatusBarProps) {
  return (
    <div className={`fixed bottom-0 left-0 right-0 ${
      isFullscreen ? 'px-6 py-4' : 'px-6 py-3'
    } flex items-center justify-center gap-3 ${
      isOnline 
        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-t border-green-200 dark:border-green-900' 
        : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-t border-red-200 dark:border-red-900'
    }`}>
      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} ${isOnline ? '' : 'animate-pulse'}`}></div>
      <span className={`font-medium ${isFullscreen ? 'text-base' : 'text-sm'}`}>
        Sistema {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}
