import { memo } from 'react'

/**
 * Background temático de Natal com gradientes e brilhos
 */
const ChristmasBackground = memo(() => (
  <div className="absolute inset-0">
    {/* Imagem de fundo sutil */}
    <div 
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1482517967863-00e15c9b44be?q=80&w=2070")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
    
    {/* Overlay gradiente natalino */}
    <div className="absolute inset-0 bg-gradient-to-br from-red-900/60 via-green-900/50 to-red-800/60" />
    <div className="absolute inset-0 bg-gradient-to-t from-green-950/50 via-transparent to-red-950/30" />
    
    {/* Brilhos mágicos sutis */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-green-500/15 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl animate-float-slow" />
    </div>
  </div>
))

ChristmasBackground.displayName = 'ChristmasBackground'

export default ChristmasBackground
