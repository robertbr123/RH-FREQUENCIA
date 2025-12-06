/**
 * Gera uma cor consistente baseada no nome do usuário
 * A mesma pessoa sempre terá a mesma cor
 */

// Paleta de cores vibrantes e agradáveis
const AVATAR_COLORS = [
  { bg: 'from-rose-400 to-pink-500', text: 'text-white', bgSolid: 'bg-rose-500' },
  { bg: 'from-orange-400 to-amber-500', text: 'text-white', bgSolid: 'bg-orange-500' },
  { bg: 'from-amber-400 to-yellow-500', text: 'text-white', bgSolid: 'bg-amber-500' },
  { bg: 'from-lime-400 to-green-500', text: 'text-white', bgSolid: 'bg-lime-500' },
  { bg: 'from-emerald-400 to-teal-500', text: 'text-white', bgSolid: 'bg-emerald-500' },
  { bg: 'from-cyan-400 to-blue-500', text: 'text-white', bgSolid: 'bg-cyan-500' },
  { bg: 'from-blue-400 to-indigo-500', text: 'text-white', bgSolid: 'bg-blue-500' },
  { bg: 'from-indigo-400 to-purple-500', text: 'text-white', bgSolid: 'bg-indigo-500' },
  { bg: 'from-purple-400 to-pink-500', text: 'text-white', bgSolid: 'bg-purple-500' },
  { bg: 'from-pink-400 to-rose-500', text: 'text-white', bgSolid: 'bg-pink-500' },
  { bg: 'from-red-400 to-rose-500', text: 'text-white', bgSolid: 'bg-red-500' },
  { bg: 'from-teal-400 to-cyan-500', text: 'text-white', bgSolid: 'bg-teal-500' },
  { bg: 'from-sky-400 to-blue-500', text: 'text-white', bgSolid: 'bg-sky-500' },
  { bg: 'from-violet-400 to-purple-500', text: 'text-white', bgSolid: 'bg-violet-500' },
  { bg: 'from-fuchsia-400 to-pink-500', text: 'text-white', bgSolid: 'bg-fuchsia-500' },
]

/**
 * Gera um hash numérico a partir de uma string
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Converte para 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Retorna as cores do avatar baseadas no nome
 */
export function getAvatarColors(name: string): { bg: string; text: string; bgSolid: string } {
  const hash = hashString(name.toLowerCase().trim())
  const index = hash % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

/**
 * Extrai as iniciais do nome (até 2 caracteres)
 */
export function getInitials(name: string): string {
  if (!name) return '?'
  
  const parts = name.trim().split(/\s+/).filter(Boolean)
  
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    // Apenas um nome: pega as 2 primeiras letras
    return parts[0].substring(0, 2).toUpperCase()
  }
  
  // Múltiplos nomes: pega primeira letra do primeiro e último nome
  const first = parts[0][0]
  const last = parts[parts.length - 1][0]
  
  return (first + last).toUpperCase()
}

/**
 * Componente helper - retorna props para usar em um avatar
 */
export function getAvatarProps(name: string) {
  const colors = getAvatarColors(name)
  const initials = getInitials(name)
  
  return {
    initials,
    gradientClass: `bg-gradient-to-br ${colors.bg}`,
    textClass: colors.text,
    solidClass: colors.bgSolid,
  }
}
