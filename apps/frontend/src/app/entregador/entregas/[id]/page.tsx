'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { formatCurrency } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const MapaEntregador = dynamic(() => import('./_MapaEntregador'), { ssr: false });

interface EntregaDetalhe {
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

const FORMA_LABEL: Record<string, string> = {
  PIX: 'PIX ✓ (já pago)',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
};

export default function EntregaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entrega, setEntrega] = useState<EntregaDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState('');
  const [observacao, setObservacao] = useState('');
  const coordRef = useRef<{ lat: number; lng: number } | null>(null);

  const getToken = useCallback(() => localStorage.getItem('rancho:entregador:token'), []);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/entregador'); return; }

    // Captura posição GPS em background
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { coordRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => { /* GPS não disponível — ok */ }
      );
    }

    // Carrega a entrega da fila
    fetch(`${API_URL}/api/entregador/fila`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const found = json.data.find((e: EntregaDetalhe) => e.id === id);
          if (found) setEntrega(found);
          else setErro('Entrega não encontrada ou já confirmada');
        }
      })
      .catch(() => setErro('Sem conexão'))
      .finally(() => setCarregando(false));
  }, [id, getToken, router]);

  async function confirmarEntrega() {
    const token = getToken();
    if (!token || !entrega) return;
    setConfirmando(true);
    setErro('');
    try {
      const body: Record<string, unknown> = {};
      if (coordRef.current) {
        body.lat = coordRef.current.lat;
        body.lng = coordRef.current.lng;
      }
      if (observacao.trim()) body.observacao = observacao.trim();

      const res = await fetch(`${API_URL}/api/entregador/entregas/${id}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErro(json.error?.message ?? 'Erro ao confirmar');
        return;
      }
      setConfirmado(true);
      setTimeout(() => router.replace('/entregador/fila'), 2000);
    } catch {
      setErro('Sem conexão com o servidor');
    } finally {
      setConfirmando(false);
    }
  }

  function abrirNavegacao() {
    if (!entrega) return;
    const addr = encodeURIComponent(`${entrega.enderecoEntrega}, ${entrega.bairroEntrega}, Goiânia, GO`);
    if (entrega.lat && entrega.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${entrega.lat},${entrega.lng}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${addr}`, '_blank');
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">Carregando...</p>
      </div>
    );
  }

  if (confirmado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-6xl">✅</div>
        <h2 className="text-xl font-bold">Entrega confirmada!</h2>
        <p className="text-[var(--color-text-secondary)]">Voltando para a fila...</p>
      </div>
    );
  }

  if (erro && !entrega) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-[var(--color-danger-text)]">{erro}</p>
        <button onClick={() => router.back()} className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm">
          Voltar
        </button>
      </div>
    );
  }

  if (!entrega) return null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-[var(--color-text-secondary)]">
            ← Voltar
          </button>
          <h1 className="font-bold">Entrega — {entrega.clienteNome}</h1>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4 pb-8">
        {/* Mapa */}
        {entrega.lat && entrega.lng && (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)]" style={{ height: 220 }}>
            <MapaEntregador lat={entrega.lat} lng={entrega.lng} nome={entrega.clienteNome} endereco={entrega.enderecoEntrega} />
          </div>
        )}

        {/* Botão de navegação */}
        <button
          onClick={abrirNavegacao}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-base font-bold text-white"
        >
          <span>📍</span> Iniciar rota no Maps
        </button>

        {/* Endereço */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Endereço</p>
          <p className="mt-1 text-base font-semibold">{entrega.enderecoEntrega}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">{entrega.bairroEntrega}</p>
        </div>

        {/* Pagamento */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Pagamento</p>
          <p className="mt-1 font-semibold">{FORMA_LABEL[entrega.formaPagamento] ?? entrega.formaPagamento}</p>
          <p className="text-xl font-bold text-[var(--color-success)]">{formatCurrency(entrega.total)}</p>
          {entrega.trocoPara && (
            <p className="mt-1 font-semibold text-[var(--color-warning)]">
              Troco para: {formatCurrency(entrega.trocoPara)} → devolver {formatCurrency(entrega.trocoPara - entrega.total)}
            </p>
          )}
        </div>

        {/* Itens */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Itens</p>
          <div className="space-y-1.5">
            {entrega.itens.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm">{item.quantidade}x {item.nome}</span>
                <span className="text-sm font-medium">{formatCurrency(item.quantidade * item.precoUnitario)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Observação do pedido */}
        {entrega.observacao && (
          <div className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-warning-text)]">Observação</p>
            <p className="mt-1 text-sm text-[var(--color-warning-text)]">{entrega.observacao}</p>
          </div>
        )}

        {/* Observação da confirmação */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
            Observação ao confirmar (opcional)
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: porteiro recebeu, cliente ausente..."
            rows={2}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {erro && (
          <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-muted)] px-3 py-2 text-sm text-[var(--color-danger-text)]">
            {erro}
          </div>
        )}

        {/* Botão confirmar */}
        <button
          onClick={() => void confirmarEntrega()}
          disabled={confirmando}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-success)] text-lg font-bold text-white disabled:opacity-60"
        >
          {confirmando ? 'Confirmando...' : '✓ Confirmar entrega'}
        </button>
      </main>
    </div>
  );
}
