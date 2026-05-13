'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// Tom de alerta gerado via Web Audio API — sem arquivo externo
function tocarAlerta() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const tempos = [0, 0.25, 0.5];
    tempos.forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.6, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.2);
    });
  } catch {}
}

function vibrar() {
  if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 600]);
}

async function notificarBrowser(quantidade: number) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'denied') return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission === 'granted') {
    new Notification('🛵 Novo pedido!', {
      body: `${quantidade} pedido(s) aguardando entrega.`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'novo-pedido',
      // renotify: true, // não suportado em todos os browsers
    });
  }
}

interface EntregaFila {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  enderecoEntrega: string;
  bairroEntrega: string;
  lat: number | null;
  lng: number | null;
  total: number;
  formaPagamento: string;
  trocoPara: number | null;
  observacao: string | null;
  saiuEm: string;
  itens: { nome: string; quantidade: number; precoUnitario: number }[];
}

interface EntregaHistorico {
  id: string;
  clienteNome: string;
  enderecoEntrega: string;
  bairroEntrega: string;
  total: number;
  entregueEm: string;
}

const FORMA_LABEL: Record<string, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
};

export default function FilaPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [fila, setFila] = useState<EntregaFila[]>([]);
  const [historico, setHistorico] = useState<EntregaHistorico[]>([]);
  const [aba, setAba] = useState<'fila' | 'historico'>('fila');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [alerta, setAlerta] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  const getToken = useCallback(() => {
    return localStorage.getItem('rancho:entregador:token');
  }, []);

  const sair = useCallback(() => {
    localStorage.removeItem('rancho:entregador:token');
    localStorage.removeItem('rancho:entregador:nome');
    router.replace('/entregador');
  }, [router]);

  // Renova o token silenciosamente ao montar — evita expiração no meio do turno
  useEffect(() => {
    const token = localStorage.getItem('rancho:entregador:token');
    if (!token) return;
    fetch(`${API_URL}/api/entregador/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.token) {
          localStorage.setItem('rancho:entregador:token', json.data.token);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregar = useCallback(async () => {
    const token = getToken();
    if (!token) { router.replace('/entregador'); return; }

    setCarregando(true);
    setErro('');
    try {
      const [resFila, resHist] = await Promise.all([
        fetch(`${API_URL}/api/entregador/fila`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/entregador/historico`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (resFila.status === 401) { sair(); return; }
      const jsonFila = await resFila.json();
      const jsonHist = await resHist.json();
      if (jsonFila.success) setFila(jsonFila.data);
      if (jsonHist.success) setHistorico(jsonHist.data);
    } catch {
      setErro('Sem conexão. Toque para tentar novamente.');
    } finally {
      setCarregando(false);
    }
  }, [getToken, router, sair]);

  useEffect(() => {
    setNome(localStorage.getItem('rancho:entregador:nome') ?? '');
    void carregar();

    const interval = setInterval(() => { void carregar(); }, 30000);

    // Renova o token a cada 6h para turnos longos
    const refreshInterval = setInterval(() => {
      const token = localStorage.getItem('rancho:entregador:token');
      if (!token) return;
      fetch(`${API_URL}/api/entregador/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data?.token) {
            localStorage.setItem('rancho:entregador:token', json.data.token);
          }
        })
        .catch(() => {});
    }, 6 * 60 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(refreshInterval);
    };
  }, [carregar]);

  // GPS — envia localização a cada 20s enquanto a fila estiver aberta
  useEffect(() => {
    const token = getToken();
    if (!token || !navigator.geolocation) return;

    let watchId: number | null = null;
    let lastSentAt = 0;

    const enviarCoords = (lat: number, lng: number) => {
      const agora = Date.now();
      if (agora - lastSentAt < 15000) return; // throttle 15s
      lastSentAt = agora;
      fetch(`${API_URL}/api/entregador/localizacao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat, lng }),
      }).catch(() => {});
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => enviarCoords(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [getToken]);

  // SSE — alerta instantâneo de novo pedido
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Pede permissão de notificação ao montar
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const url = `${API_URL}/api/entregador/events?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    sseRef.current = source;

    source.addEventListener('entregador:novo_pedido', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        tocarAlerta();
        vibrar();
        void notificarBrowser(data.quantidade ?? 1);
        setAlerta(true);
        void carregar();
        setTimeout(() => setAlerta(false), 5000);
      } catch {}
    });

    source.onerror = () => {
      // Reconecta automaticamente via EventSource nativo
    };

    return () => {
      source.close();
      sseRef.current = null;
    };
  }, [getToken, carregar]);

  const totalHoje = historico.reduce((s, e) => s + e.total, 0);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🛵</span>
              <span className="font-bold">{nome || 'Entregador'}</span>
            </div>
            {historico.length > 0 && (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Hoje: {historico.length} entrega(s) · {formatCurrency(totalHoje)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void carregar()}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium"
            >
              Atualizar
            </button>
            <button
              onClick={sair}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="mt-3 flex gap-1 rounded-lg bg-[var(--color-surface-secondary)] p-1">
          {(['fila', 'historico'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors ${
                aba === a
                  ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {a === 'fila' ? `Fila${fila.length > 0 ? ` (${fila.length})` : ''}` : 'Histórico hoje'}
            </button>
          ))}
        </div>
      </header>

      {/* Banner de alerta */}
      {alerta && (
        <div className="animate-pulse border-b border-[var(--color-success)] bg-[var(--color-success)] px-4 py-3 text-center text-base font-bold text-white">
          🛵 Novo pedido chegou! Puxe para atualizar.
        </div>
      )}

      {/* Conteúdo */}
      <main className="flex-1 p-4">
        {carregando && (
          <div className="flex items-center justify-center py-16 text-[var(--color-text-secondary)]">
            Carregando...
          </div>
        )}

        {erro && (
          <button onClick={() => void carregar()} className="w-full rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-muted)] p-4 text-sm text-[var(--color-danger-text)]">
            {erro}
          </button>
        )}

        {!carregando && !erro && aba === 'fila' && (
          <>
            {fila.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--color-text-secondary)]">
                <span className="mb-3 text-4xl">✅</span>
                <p className="font-medium">Nenhuma entrega pendente</p>
                <p className="text-sm">Você está em dia!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fila.map((entrega, idx) => (
                  <Link
                    key={entrega.id}
                    href={`/entregador/entregas/${entrega.id}`}
                    className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 active:bg-[var(--color-surface-hover)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-bold text-white">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold">{entrega.clienteNome}</div>
                          <div className="text-sm text-[var(--color-text-secondary)]">{entrega.bairroEntrega}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[var(--color-success)]">{formatCurrency(entrega.total)}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{FORMA_LABEL[entrega.formaPagamento] ?? entrega.formaPagamento}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      {entrega.enderecoEntrega}
                    </div>
                    {entrega.trocoPara && (
                      <div className="mt-1 text-sm font-medium text-[var(--color-warning)]">
                        Troco p/ {formatCurrency(entrega.trocoPara)}
                      </div>
                    )}
                    {entrega.observacao && (
                      <div className="mt-1 rounded bg-[var(--color-surface-secondary)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
                        {entrega.observacao}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        {entrega.itens.length} item(s)
                      </span>
                      <span className="text-xs font-semibold text-[var(--color-accent)]">
                        Ver detalhes →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {!carregando && !erro && aba === 'historico' && (
          <>
            {historico.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--color-text-secondary)]">
                <span className="mb-3 text-4xl">📦</span>
                <p className="font-medium">Sem entregas hoje ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historico.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                    <div>
                      <div className="font-medium">{e.clienteNome}</div>
                      <div className="text-sm text-[var(--color-text-secondary)]">{e.enderecoEntrega}</div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">
                        {new Date(e.entregueEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[var(--color-success)]">{formatCurrency(e.total)}</div>
                      <div className="mt-1 text-xs text-[var(--color-success)]">✓ Entregue</div>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3 text-center">
                  <span className="text-sm font-semibold">Total do dia: {formatCurrency(totalHoje)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
