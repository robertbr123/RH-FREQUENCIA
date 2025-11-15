// Sistema de notificações toast
// Versão simplificada sem dependências externas

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  duration?: number
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'
}

class ToastManager {
  private container: HTMLDivElement | null = null
  private toasts: Set<HTMLDivElement> = new Set()

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2'
      document.body.appendChild(this.container)
    }
  }

  private createToast(message: string, type: ToastType, options: ToastOptions = {}) {
    this.ensureContainer()
    
    const toast = document.createElement('div')
    const duration = options.duration || 3000

    // Cores por tipo
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    }

    // Ícones por tipo
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    }

    toast.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in-right min-w-[300px] max-w-md`
    toast.innerHTML = `
      <span class="text-xl font-bold">${icons[type]}</span>
      <span class="flex-1">${message}</span>
      <button class="text-white/80 hover:text-white ml-2" onclick="this.parentElement.remove()">✕</button>
    `

    this.container?.appendChild(toast)
    this.toasts.add(toast)

    // Auto remover
    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transform = 'translateX(100%)'
      setTimeout(() => {
        toast.remove()
        this.toasts.delete(toast)
      }, 300)
    }, duration)
  }

  success(message: string, options?: ToastOptions) {
    this.createToast(message, 'success', options)
  }

  error(message: string, options?: ToastOptions) {
    this.createToast(message, 'error', options)
  }

  warning(message: string, options?: ToastOptions) {
    this.createToast(message, 'warning', options)
  }

  info(message: string, options?: ToastOptions) {
    this.createToast(message, 'info', options)
  }

  // Toast de loading
  loading(message: string) {
    this.ensureContainer()
    
    const toast = document.createElement('div')
    toast.className = 'bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]'
    toast.innerHTML = `
      <div class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
      <span class="flex-1">${message}</span>
    `

    this.container?.appendChild(toast)
    return toast
  }

  // Remover toast de loading
  dismiss(toast: HTMLDivElement) {
    toast.remove()
    this.toasts.delete(toast)
  }
}

// Exportar instância global
export const toast = new ToastManager()

// Adicionar estilos de animação
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slide-in-right {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .animate-slide-in-right {
      animation: slide-in-right 0.3s ease-out;
    }
  `
  document.head.appendChild(style)
}
