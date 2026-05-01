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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      source = new EventSource(`${baseUrl}/api/admin/events`);

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
