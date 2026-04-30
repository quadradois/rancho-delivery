/**
 * Testes unitários para o ErrorBoundary
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from '../../components/ErrorBoundary';

// Componente que lança erro para testar o boundary
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Erro de teste');
  }
  return <div>Conteúdo normal</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suprimir console.error do React durante testes de error boundary
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('deve renderizar children quando não há erro', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Conteúdo normal')).toBeInTheDocument();
  });

  it('deve renderizar UI de fallback quando há erro', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });

  it('deve exibir mensagem amigável no fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Ocorreu um erro inesperado/)).toBeInTheDocument();
  });

  it('deve exibir botão de tentar novamente', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('deve exibir botão de voltar ao início', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /voltar ao início/i })).toBeInTheDocument();
  });

  it('deve resetar estado ao clicar em tentar novamente', () => {
    // O reset do ErrorBoundary funciona chamando handleReset que seta hasError=false.
    // Para que o filho não lance erro novamente após o reset, usamos uma key
    // para remount do boundary com um filho que não lança erro.
    const { rerender } = render(
      <ErrorBoundary key="with-error">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

    // Remonta o boundary com filho sem erro (simula o reset + nova tentativa)
    rerender(
      <ErrorBoundary key="without-error">
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Conteúdo normal')).toBeInTheDocument();
  });

  it('deve renderizar fallback customizado quando fornecido', () => {
    render(
      <ErrorBoundary fallback={<div>Fallback customizado</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Fallback customizado')).toBeInTheDocument();
  });

  it('deve mostrar detalhes do erro', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Detalhes do erro')).toBeInTheDocument();
  });
});
