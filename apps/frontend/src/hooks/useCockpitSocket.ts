'use client';

import { useEffect, useRef } from 'react';

type CockpitEventName =
  | 'pedido:novo'
  | 'pedido:atualizado'
  | 'mensagem:nova'
  | 'metricas:atualizadas'
  | 'loja:status';

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
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let fallbackStarted = false;
    let closedByCleanup = false;

    const startFallbackPolling = () => {
      if (fallbackTimer || fallbackStarted) return;
      fallbackStarted = true;
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
      if (closedByCleanup || fallbackStarted) return;
      // Usa mesma origem do frontend (nginx/proxy) para evitar falhas de CORS/DNS no SSE.
      const token = window.localStorage.getItem('rancho:admin:token');
      const eventsUrl = token ? `/api/admin/events?token=${encodeURIComponent(token)}` : '/api/admin/events';
      source = new EventSource(eventsUrl);

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

      source.onopen = () => {
        reconnectAttempts = 0;
      };

      source.onerror = () => {
        source?.close();
        if (fallbackStarted) return;

        if (reconnectAttempts >= 4) {
          startFallbackPolling();
          return;
        }

        const delayMs = Math.min(1000 * 2 ** reconnectAttempts, 8000);
        reconnectAttempts += 1;
        if (reconnectTimer) window.clearTimeout(reconnectTimer);
        reconnectTimer = window.setTimeout(() => {
          connect();
        }, delayMs);
      };
    };

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (fallbackTimer) window.clearInterval(fallbackTimer);
      source?.close();
    };
  }, []);
}

export default useCockpitSocket;
