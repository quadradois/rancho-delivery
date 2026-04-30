import React from 'react';
import { useCarrinho } from '../../../hooks/useCarrinho';
import './styles.css';

export interface HeaderProps {
  onCarrinhoClick: () => void;
  showLogo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onCarrinhoClick,
  showLogo = true,
}) => {
  const { quantidadeTotal } = useCarrinho();

  return (
    <header className="header" role="banner">
      <div className="header__container">
        {showLogo && (
          <div className="header__logo">
            <h1 className="header__logo-text">
              <span className="header__logo-rancho">Rancho</span>
              <span className="header__logo-comida"> Comida Caseira</span>
            </h1>
          </div>
        )}

        <div className="header__spacer" />

        <button
          type="button"
          className="header__cart-button"
          onClick={onCarrinhoClick}
          aria-label={`Carrinho de compras${quantidadeTotal > 0 ? ` com ${quantidadeTotal} ${quantidadeTotal === 1 ? 'item' : 'itens'}` : ' vazio'}`}
        >
          <svg
            className="header__cart-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>

          {quantidadeTotal > 0 && (
            <span className="header__cart-badge" aria-hidden="true">
              {quantidadeTotal > 99 ? '99+' : quantidadeTotal}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
