'use client';

import { useEffect, useRef } from 'react';

type CockpitEventName = 'pedido:novo' | 'pedido:atualizado' | 'mensagem:nova' | 'metricas:atualizadas' | 'loja:status';

interface UseCockpitSocketOptions {
  onPedidoNovo?: (payload: any) => void;
  onPedidoAtualizado?: (payload: any) => void;
  onMensagemNova?: (payload: any) => void;
  onMetricasAtualizadas?: (payload: any) => void;
  onLojaStatus?: (payload: any) => void;
  onFallbackPoll?: () => void;
  fallbackIntervalMs?: number;
}

export function useCockpitSocket(options: UseCockpitSocketOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let source: EventSource | null = null;
    let fallbackTimer: number | null = null;

    const startFallbackPolling = () => {
      if (fallbackTimer) return;
      const interval = optionsRef.current.fallbackIntervalMs ?? 8000;
      fallbackTimer = window.setInterval(() => {
        optionsRef.current.onFallbackPoll?.();
      }, interval);
    };

    const isFirefox = typeof navigator !== 'undefined' && /Firefox/i.test(navigator.userAgent);
    if (isFirefox) {
      startFallbackPolling();
      return () => {
        if (fallbackTimer) window.clearInterval(fallbackTimer);
      };
    }

    const connect = () => {
      // Usa mesma origem do frontend (nginx/proxy) para evitar falhas de CORS/DNS no SSE.
      source = new EventSource('/api/admin/events');

      const onEvent = (eventName: CockpitEventName, handler?: (payload: any) => void) => {
        source?.addEventListener(eventName, (event: MessageEvent) => {
          try {
            const parsed = JSON.parse(event.data || '{}');
            handler?.(parsed?.data ?? parsed);
          } catch {
            handler?.(event.data);
          }
        });
      };

      onEvent('pedido:novo', optionsRef.current.onPedidoNovo);
      onEvent('pedido:atualizado', optionsRef.current.onPedidoAtualizado);
      onEvent('mensagem:nova', optionsRef.current.onMensagemNova);
      onEvent('metricas:atualizadas', optionsRef.current.onMetricasAtualizadas);
      onEvent('loja:status', optionsRef.current.onLojaStatus);

      source.onerror = () => {
        source?.close();
        startFallbackPolling();
      };
    };

    connect();

    return () => {
      if (fallbackTimer) window.clearInterval(fallbackTimer);
      source?.close();
    };
  }, []);
}

export default useCockpitSocket;
