'use client';

import { useEffect, useRef } from 'react';

type CockpitEventName = 'pedido:novo' | 'pedido:atualizado' | 'mensagem:nova';

interface UseCockpitSocketOptions {
  onPedidoNovo?: (payload: any) => void;
  onPedidoAtualizado?: (payload: any) => void;
  onMensagemNova?: (payload: any) => void;
}

export function useCockpitSocket(options: UseCockpitSocketOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;

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

      source.onerror = () => {
        source?.close();
        if (reconnectTimer) window.clearTimeout(reconnectTimer);
        reconnectTimer = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      source?.close();
    };
  }, []);
}

export default useCockpitSocket;
