'use client';

import React from 'react';
import Button from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary de nível de aplicação.
 * Captura erros de renderização em qualquer componente filho
 * e exibe uma UI de fallback amigável.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
          <div className="text-center max-w-sm w-full">
            <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-red-500"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h1 className="font-brand text-2xl font-black uppercase text-neutral-900 mb-2">
              Algo deu errado
            </h1>
            <p className="text-neutral-500 text-sm mb-6">
              Ocorreu um erro inesperado. Tente recarregar a página ou volte ao início.
            </p>

            {this.state.error && (
              <details className="mb-6 text-left bg-neutral-100 rounded-xl p-4">
                <summary className="text-xs font-semibold text-neutral-500 cursor-pointer">
                  Detalhes do erro
                </summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-3">
              <Button onClick={this.handleReset} size="lg" className="w-full">
                Tentar novamente
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => { window.location.href = '/'; }}
              >
                Voltar ao início
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
