/**
 * Testes unitários para o componente ProductCard
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ProductCard from '../../components/product/ProductCard';

// Mock do next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

const defaultProps = {
  id: 'prod-1',
  name: 'X-Burguer',
  description: 'Hambúrguer artesanal com queijo e bacon',
  price: 25.9,
  category: 'Lanche',
};

describe('ProductCard', () => {
  it('deve renderizar nome do produto', () => {
    render(<ProductCard {...defaultProps} />);
    expect(screen.getByText('X-Burguer')).toBeInTheDocument();
  });

  it('deve renderizar descrição do produto', () => {
    render(<ProductCard {...defaultProps} />);
    expect(screen.getByText('Hambúrguer artesanal com queijo e bacon')).toBeInTheDocument();
  });

  it('deve renderizar categoria do produto', () => {
    render(<ProductCard {...defaultProps} />);
    expect(screen.getByText('Lanche')).toBeInTheDocument();
  });

  it('deve renderizar preço formatado', () => {
    render(<ProductCard {...defaultProps} />);
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it('deve renderizar placeholder quando não há imagem', () => {
    render(<ProductCard {...defaultProps} />);
    expect(screen.getByText('foto do produto')).toBeInTheDocument();
  });

  it('deve renderizar imagem quando imageUrl é fornecida', () => {
    render(<ProductCard {...defaultProps} imageUrl="https://example.com/burger.jpg" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/burger.jpg');
    expect(img).toHaveAttribute('alt', 'X-Burguer');
  });

  it('deve chamar onAddToCart ao clicar no botão de adicionar', () => {
    const onAddToCart = vi.fn();
    render(<ProductCard {...defaultProps} onAddToCart={onAddToCart} />);

    const addButton = screen.getByRole('button', { name: /adicionar ao carrinho/i });
    fireEvent.click(addButton);

    expect(onAddToCart).toHaveBeenCalledWith('prod-1');
    expect(onAddToCart).toHaveBeenCalledTimes(1);
  });

  it('deve alternar favorito ao clicar no botão de favorito', () => {
    const onFavoriteToggle = vi.fn();
    render(<ProductCard {...defaultProps} onFavoriteToggle={onFavoriteToggle} />);

    const favButton = screen.getByRole('button', { name: /adicionar aos favoritos/i });
    fireEvent.click(favButton);

    expect(onFavoriteToggle).toHaveBeenCalledWith('prod-1', true);

    fireEvent.click(screen.getByRole('button', { name: /remover dos favoritos/i }));
    expect(onFavoriteToggle).toHaveBeenCalledWith('prod-1', false);
  });

  it('deve renderizar badge quando fornecido', () => {
    render(<ProductCard {...defaultProps} badge={{ text: 'Novo', variant: 'brand' }} />);
    expect(screen.getByText('Novo')).toBeInTheDocument();
  });

  it('deve renderizar preço original riscado quando há desconto', () => {
    render(<ProductCard {...defaultProps} originalPrice={35.9} />);
    expect(screen.getByText(/35/)).toBeInTheDocument();
  });

  it('não deve renderizar preço original quando é igual ao preço atual', () => {
    render(<ProductCard {...defaultProps} originalPrice={25.9} />);
    // Só deve aparecer um preço
    const prices = screen.getAllByText(/25/);
    expect(prices).toHaveLength(1);
  });

  it('deve renderizar avaliação quando reviewCount > 0', () => {
    render(<ProductCard {...defaultProps} rating={4.5} reviewCount={120} />);
    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });

  it('não deve renderizar avaliação quando reviewCount é 0', () => {
    render(<ProductCard {...defaultProps} rating={4.5} reviewCount={0} />);
    expect(screen.queryByText(/4\.5/)).not.toBeInTheDocument();
  });
});
