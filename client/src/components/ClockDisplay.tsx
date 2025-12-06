import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useClock, useChristmasSeason } from '../hooks'
import { Snowflake } from 'lucide-react'
import { useMemo, memo } from 'react'

interface ClockDisplayProps {
  isFullscreen?: boolean
}

// Componente do gorro de Papai Noel (SVG inline)
const SantaHat = memo(() => (
  <svg 
    viewBox="0 0 100 60" 
    className="absolute -top-8 -left-2 w-16 h-12 transform -rotate-12"
    style={{ filter: 'drop-shadow(2px 2px 3px rgba(0,0,0,0.3))' }}
  >
    {/* Gorro vermelho */}
    <path 
      d="M10 55 Q15 20 50 15 Q85 20 90 55 Z" 
      fill="#dc2626" 
      stroke="#b91c1c" 
      strokeWidth="1.5"
    />
    {/* Parte curvada do gorro */}
    <path 
      d="M50 15 Q70 5 85 25 Q95 35 98 45" 
      fill="#dc2626" 
      stroke="#b91c1c" 
      strokeWidth="1.5"
    />
    {/* Pompom branco */}
    <circle cx="98" cy="45" r="8" fill="#fefce8" stroke="#fde047" strokeWidth="1" />
    {/* Borda branca de pelo */}
    <ellipse cx="50" cy="57" rx="42" ry="7" fill="#fefce8" stroke="#fde047" strokeWidth="1" />
  </svg>
))

// Flocos de neve animados
const SnowflakesDecoration = memo(() => {
  const snowflakes = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: `${5 + i * 18}%`,
      delay: `${i * 0.8}s`,
      duration: `${6 + Math.random() * 3}s`,
      size: 12 + Math.random() * 6,
      opacity: 0.15 + Math.random() * 0.15
    })), []
  )

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {snowflakes.map(flake => (
        <Snowflake
          key={flake.id}
          className="absolute text-white animate-snowfall"
          style={{
            left: flake.left,
            top: '-20px',
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            animationDelay: flake.delay,
            animationDuration: flake.duration,
          }}
        />
      ))}
    </div>
  )
})

/**
 * Componente de relógio em tempo real com data e decorações sazonais
 * Otimizado para mobile
 */
export default function ClockDisplay({ isFullscreen = false }: ClockDisplayProps) {
  const currentTime = useClock()
  const isChristmas = useChristmasSeason()

  return (
    <div className={`relative bg-gradient-to-br ${isChristmas ? 'from-red-500 via-red-600 to-green-600' : 'from-primary-500 via-primary-600 to-purple-600'} rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-4 sm:p-8 mb-4 sm:mb-6 text-white overflow-hidden`}>
      {/* Decorações de Natal */}
      {isChristmas && <SnowflakesDecoration />}
      
      <div className="relative text-center">
        <div className="mb-2 sm:mb-3 relative inline-block">
          {/* Gorro de Papai Noel no relógio */}
          {isChristmas && <SantaHat />}
          
          <div className={`font-black tracking-tight mb-1 ${isFullscreen ? 'text-7xl sm:text-9xl' : 'text-4xl sm:text-6xl'} drop-shadow-2xl`}>
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="h-1 sm:h-2 w-20 sm:w-32 bg-white/30 rounded-full mx-auto"></div>
        </div>
        <div className={`font-semibold opacity-95 ${isFullscreen ? 'text-xl sm:text-4xl' : 'text-sm sm:text-2xl'} drop-shadow-lg`}>
          {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </div>
        
        {/* Mensagem de Natal sutil */}
        {isChristmas && (
          <div className="mt-2 sm:mt-3 text-xs sm:text-sm opacity-80 flex items-center justify-center gap-2">
            <Snowflake className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Boas Festas! 🎄</span>
            <Snowflake className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
        )}
      </div>
    </div>
  )
}
