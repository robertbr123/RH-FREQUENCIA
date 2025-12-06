import { memo } from 'react'

/**
 * Decorações de Natal (árvore, papai noel, presente)
 */
const ChristmasDecorations = memo(() => (
  <>
    {/* Árvore de Natal central */}
    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-5xl animate-float drop-shadow-xl">
      🎄
    </div>
    
    {/* Papai Noel */}
    <div className="absolute -top-6 left-6 text-2xl animate-float-delayed drop-shadow-lg">
      🎅
    </div>
    
    {/* Presente */}
    <div className="absolute -top-6 right-6 text-2xl animate-float-slow drop-shadow-lg">
      🎁
    </div>
  </>
))

ChristmasDecorations.displayName = 'ChristmasDecorations'

export default ChristmasDecorations
