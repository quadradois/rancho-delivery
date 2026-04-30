/**
 * BottomSheet - Componente de painel deslizante inferior
 * 
 * Componente reutilizável para exibir conteúdo em um painel que desliza
 * de baixo para cima, com overlay e animações suaves.
 * 
 * Features:
 * - Animação slide up/down
 * - Overlay com backdrop
 * - Fechamento ao clicar fora
 * - Fechamento com tecla ESC
 * - Suporte a diferentes alturas
 * - Acessibilidade completa
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import './styles.css';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxHeight?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  maxHeight = '80vh',
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  /**
   * Fecha o bottom sheet ao pressionar ESC
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [closeOnEscape, isOpen, onClose]
  );

  /**
   * Fecha o bottom sheet ao clicar no backdrop
   */
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdropClick && event.target === event.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  /**
   * Previne scroll do body quando o bottom sheet está aberto
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  /**
   * Foca no bottom sheet quando aberto
   */
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div
      className="bottom-sheet-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
      aria-hidden="true"
    >
      <div
        ref={sheetRef}
        className="bottom-sheet"
        style={{ maxHeight }}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Bottom Sheet'}
        tabIndex={-1}
      >
        {/* Handle (barra de arraste visual) */}
        <div className="bottom-sheet__handle" aria-hidden="true">
          <div className="bottom-sheet__handle-bar" />
        </div>

        {/* Header */}
        {title && (
          <div className="bottom-sheet__header">
            <h2 className="bottom-sheet__title">{title}</h2>
            <button
              type="button"
              className="bottom-sheet__close"
              onClick={onClose}
              aria-label="Fechar"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="bottom-sheet__content">{children}</div>
      </div>
    </div>
  );

  // Renderiza no portal para evitar problemas de z-index
  return createPortal(content, document.body);
};

export default BottomSheet;
