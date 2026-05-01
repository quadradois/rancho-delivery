'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { LojaStatusAdmin } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function useLojaStatus() {
  const [status, setStatus] = useState<LojaStatusAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const pollTimerRef = useRef<number | null>(null);

  const carregarStatus = useCallback(async () => {
    try {
      const data = await api.loja.obterStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarStatus();

    const iniciarFallback = () => {
      if (pollTimerRef.current) return;
      pollTimerRef.current = window.setInterval(() => {
        void carregarStatus();
      }, 8000);
    };

    const isFirefox = /Firefox/i.test(navigator.userAgent);
    if (isFirefox) {
      iniciarFallback();
      return () => {
        if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      };
    }

    const eventsUrl = `${API_BASE_URL}/api/loja/events`;
    const source = new EventSource(eventsUrl);

    source.addEventListener('loja:status', (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data || '{}');
        setStatus(parsed?.data ?? parsed);
      } catch {
        void carregarStatus();
      }
    });

    source.onerror = () => {
      source.close();
      iniciarFallback();
    };

    return () => {
      source.close();
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, [carregarStatus]);

  const lojaAberta = !status || status.status === 'ABERTO';
  const mensagem = useMemo(() => {
    if (!status || status.status === 'ABERTO') return null;
    if (status.status === 'PAUSADO') {
      return status.mensagem || 'Estamos pausados por alguns minutos. Volte já já.';
    }
    return status.mensagem || 'Estamos fechados no momento. Volte em nosso próximo horário de atendimento.';
  }, [status]);

  return { status, loading, lojaAberta, mensagem };
}

export default useLojaStatus;
