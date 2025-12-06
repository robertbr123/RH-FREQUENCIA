import { useEffect, useState, memo } from 'react'

interface LightProps {
  left: string
  color: string
  delay: number
}

const Light = memo(({ left, color, delay }: LightProps) => (
  <div
    className="absolute top-0 w-2.5 h-2.5 rounded-full pointer-events-none"
    style={{
      left,
      backgroundColor: color,
      boxShadow: `0 0 15px ${color}, 0 0 30px ${color}`,
      animation: `christmas-blink ${1.5 + Math.random()}s ease-in-out ${delay}s infinite`,
    }}
  />
))

Light.displayName = 'Light'

interface ChristmasLightsProps {
  count?: number
  enabled?: boolean
}

const COLORS = ['#ff3333', '#33ff33', '#3333ff', '#ffff33', '#ff33ff', '#33ffff']

/**
 * Luzes de Natal piscantes no topo
 */
export default function ChristmasLights({ count = 15, enabled = true }: ChristmasLightsProps) {
  const [lights, setLights] = useState<LightProps[]>([])

  useEffect(() => {
    if (!enabled) return

    const lightsArray = Array.from({ length: count }, (_, i) => ({
      left: `${(i / count) * 100}%`,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 2,
    }))
    setLights(lightsArray)
  }, [count, enabled])

  if (!enabled || lights.length === 0) return null

  return (
    <div className="absolute top-0 left-0 right-0 h-4 overflow-visible pointer-events-none z-30">
      {/* Fio das luzes */}
      <div className="absolute top-1 left-0 right-0 h-0.5 bg-green-900/50" 
           style={{ 
             background: 'repeating-linear-gradient(90deg, #1a4a1a 0px, #1a4a1a 20px, transparent 20px, transparent 25px)' 
           }} 
      />
      
      {lights.map((light, i) => (
        <Light key={i} {...light} />
      ))}
      
      <style>{`
        @keyframes christmas-blink {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
