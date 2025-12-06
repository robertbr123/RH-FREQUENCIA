import { useMemo } from 'react'

/**
 * Hook para verificar se estamos no período natalino
 * Período: 1 de Dezembro até 6 de Janeiro (Dia de Reis)
 */
export function useChristmasSeason(): boolean {
  return useMemo(() => {
    const now = new Date()
    const month = now.getMonth() + 1 // 1-12
    const day = now.getDate()
    
    // Dezembro inteiro OU Janeiro até dia 6 (Dia de Reis)
    return (month === 12) || (month === 1 && day <= 6)
  }, [])
}

/**
 * Função pura para verificar período natalino (para componentes que não usam hooks)
 */
export function isChristmasSeason(): boolean {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  return (month === 12) || (month === 1 && day <= 6)
}
