import { useState, useEffect } from 'react'
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Coffee, 
  Heart, 
  Rocket,
  Shield,
  Palette,
  BarChart3,
  Users,
  Calendar,
  FileText,
  Database,
  Camera
} from 'lucide-react'

interface ImprovementsPopupProps {
  onClose: () => void
}

export default function ImprovementsPopup({ onClose }: ImprovementsPopupProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Animação de entrada
    setTimeout(() => setIsVisible(true), 100)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const improvements = [
    {
      icon: Shield,
      title: 'Correções de Bugs',
      items: [
        'Toast corrigido no Profile.tsx',
        'Classes Tailwind dinâmicas corrigidas no AttendanceAdmin',
      ],
      color: 'text-red-500 bg-red-100 dark:bg-red-900/30'
    },
    {
      icon: Palette,
      title: 'Melhorias de UI/UX',
      items: [
        'Novo design do Profile com avatar colorido',
        'Indicador de força de senha',
        'Headers com gradientes modernos',
        'Cards de estatísticas animados',
      ],
      color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30'
    },
    {
      icon: Calendar,
      title: 'Attendance (Ponto)',
      items: [
        'Visualização em calendário',
        'Toggle entre lista e calendário',
        'Busca por funcionário',
        'Exportação para Excel/CSV',
      ],
      color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30'
    },
    {
      icon: FileText,
      title: 'Reports (Relatórios)',
      items: [
        'Cards de estatísticas rápidas',
        'Novo header com ícone moderno',
        'Layout mais organizado',
      ],
      color: 'text-green-500 bg-green-100 dark:bg-green-900/30'
    },
    {
      icon: Users,
      title: 'Organização',
      items: [
        'Toggle entre cards e lista',
        'Design com gradientes',
        'Animações de hover',
        'Organograma visual',
      ],
      color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30'
    },
    {
      icon: Database,
      title: 'Backup',
      items: [
        'Cards de estatísticas do banco',
        'Visual moderno com gradientes',
        'Indicadores de status',
      ],
      color: 'text-teal-500 bg-teal-100 dark:bg-teal-900/30'
    },
    {
      icon: Camera,
      title: 'Profile',
      items: [
        'Upload de foto de perfil',
        'Avatar com iniciais coloridas',
        'Validação de senha em tempo real',
      ],
      color: 'text-pink-500 bg-pink-100 dark:bg-pink-900/30'
    },
    {
      icon: Database,
      title: 'Scanner',
      items: [
        'Estilo natalino para o scanner',
        'Melhora significativa na performance',
        'Refatoração do código',
      ],
      color: 'text-teal-500 bg-teal-100 dark:bg-teal-900/30'
    },
  ]

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
      isVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'
    }`}>
      <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden transition-all duration-300 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white relative overflow-hidden">
          {/* Sparkles decorativos */}
          <div className="absolute top-2 left-4 animate-pulse">
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </div>
          <div className="absolute top-4 right-20 animate-pulse delay-100">
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </div>
          <div className="absolute bottom-2 right-8 animate-pulse delay-200">
            <Sparkles className="w-5 h-5 text-yellow-300" />
          </div>
          
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Rocket className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">🎉 Novas Melhorias!</h2>
              <p className="text-white/80">Confira o que há de novo no sistema</p>
            </div>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {improvements.map((section, index) => {
              const Icon = section.icon
              return (
                <div 
                  key={section.title}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${section.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {section.title}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer com créditos */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                RA
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Desenvolvido com 💜 por</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg">Robert Albino</p>
              </div>
            </div>
            
            <a
              href="https://www.buymeacoffee.com/robertalbino"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Coffee className="w-5 h-5 group-hover:animate-bounce" />
              <span className="font-semibold">Me pague um café!</span>
              <Heart className="w-4 h-4 text-red-200 group-hover:text-red-100" />
            </a>
          </div>
          
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
            Obrigado por usar o sistema! Seu apoio é muito importante. ☕
          </p>
        </div>
      </div>
    </div>
  )
}
