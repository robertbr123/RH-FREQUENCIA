/**
 * Componente de item com suporte a gestos de swipe
 * Permite arrastar para revelar ações (ex: deletar)
 */

import React, { useRef, useState, useCallback, ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  deleteLabel?: string;
  threshold?: number; // Porcentagem do swipe para ativar (0-1)
  disabled?: boolean;
  className?: string;
}

export function SwipeableItem({
  children,
  onDelete,
  onSwipeLeft,
  onSwipeRight,
  deleteLabel = 'Excluir',
  threshold = 0.3,
  disabled = false,
  className = ''
}: SwipeableItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);
  
  const { trigger: haptic } = useHapticFeedback();
  
  const deleteWidth = 80; // Largura do botão de delete

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setHasTriggeredHaptic(false);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || disabled) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    // Limitar o swipe para a esquerda (negativo) até o width do delete
    // e um pouco para a direita se já está revelado
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const maxLeft = -deleteWidth;
    const maxRight = translateX < 0 ? 0 : 50; // Permite voltar ou pequeno bounce
    
    let newTranslateX = diff;
    
    // Se estava com delete aberto, ajustar o diff
    if (translateX < 0) {
      newTranslateX = translateX + diff;
    }
    
    // Limitar o range
    newTranslateX = Math.max(maxLeft, Math.min(maxRight, newTranslateX));
    
    // Haptic feedback quando atinge threshold
    const thresholdPixels = containerWidth * threshold;
    if (Math.abs(newTranslateX) >= thresholdPixels && !hasTriggeredHaptic) {
      haptic('medium');
      setHasTriggeredHaptic(true);
    }
    
    setTranslateX(newTranslateX);
  }, [isDragging, startX, translateX, threshold, hasTriggeredHaptic, haptic, disabled]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const thresholdPixels = containerWidth * threshold;
    
    // Se passou do threshold para esquerda, manter aberto
    if (translateX < -thresholdPixels) {
      setTranslateX(-deleteWidth);
      onSwipeLeft?.();
    } 
    // Se passou do threshold para direita e tinha ação
    else if (translateX > thresholdPixels) {
      setTranslateX(0);
      onSwipeRight?.();
    }
    // Senão, voltar à posição normal
    else {
      setTranslateX(0);
    }
  }, [isDragging, translateX, threshold, onSwipeLeft, onSwipeRight, disabled]);

  const handleDelete = useCallback(() => {
    if (disabled) return;
    haptic('heavy');
    onDelete?.();
    // Animar para fora antes de deletar
    setTranslateX(-containerRef.current?.offsetWidth || -300);
    setTimeout(() => {
      setTranslateX(0);
    }, 300);
  }, [onDelete, haptic, disabled]);

  const handleClose = useCallback(() => {
    setTranslateX(0);
  }, []);

  // Fechar quando clicar fora
  const handleClickOutside = useCallback((e: React.MouseEvent) => {
    if (translateX < 0) {
      handleClose();
      e.preventDefault();
      e.stopPropagation();
    }
  }, [translateX, handleClose]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onClick={handleClickOutside}
    >
      {/* Botão de delete (fundo) */}
      {onDelete && (
        <div 
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500"
          style={{ width: deleteWidth }}
        >
          <button
            onClick={handleDelete}
            className="flex flex-col items-center justify-center text-white p-2 active:opacity-70"
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-xs mt-1">{deleteLabel}</span>
          </button>
        </div>
      )}
      
      {/* Conteúdo principal (desliza) */}
      <div
        className={`relative bg-inherit transition-transform ${
          isDragging ? 'duration-0' : 'duration-200'
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export default SwipeableItem;
