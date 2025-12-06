import { useEffect, useState, memo } from 'react'

interface SnowflakeProps {
  delay: number
  duration: number
  left: string
  size: number
}

const Snowflake = memo(({ delay, duration, left, size }: SnowflakeProps) => (
  <div
    className="absolute top-0 text-white pointer-events-none select-none opacity-70"
    style={{
      left,
      animation: `snowfall ${duration}s linear ${delay}s infinite`,
      fontSize: `${size}px`,
    }}
  >
    ❄
  </div>
))

Snowflake.displayName = 'Snowflake'

interface SnowfallProps {
  count?: number
  enabled?: boolean
}

/**
 * Componente de neve caindo - otimizado para performance
 */
export default function Snowfall({ count = 40, enabled = true }: SnowfallProps) {
  const [snowflakes, setSnowflakes] = useState<SnowflakeProps[]>([])

  useEffect(() => {
    if (!enabled) return

    const flakes = Array.from({ length: count }, () => ({
      delay: Math.random() * 10,
      duration: Math.random() * 8 + 15,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 10 + 8,
    }))
    setSnowflakes(flakes)
  }, [count, enabled])

  if (!enabled || snowflakes.length === 0) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {snowflakes.map((flake, i) => (
        <Snowflake key={i} {...flake} />
      ))}
      
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10vh) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% { opacity: 0.7; }
          90% { opacity: 0.7; }
          100% {
            transform: translateY(110vh) translateX(50px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
