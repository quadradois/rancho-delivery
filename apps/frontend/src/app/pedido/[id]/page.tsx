'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@/components/layout/AppBar';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StatusTracker from '@/components/ui/StatusTracker';
import { formatCurrency, formatTime } from '@/lib/utils';
import api, { Pedido } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface OrderPageProps {
  params: {
    id: string;
  };
}

export default function OrderPage({ params }: OrderPageProps) {
  const router = useRouter();
  const { showError } = useToast();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);

  const statusNormalizado = (pedido?.status || '').toString().toLowerCase();
  const enderecoTexto = pedido?.cliente?.endereco || '';
  const bairroTexto = pedido?.cliente?.bairro || '';
  const criadoEm = pedido?.createdAt || pedido?.criadoEm || '';

  useEffect(() => {
    const loadPedido = async () => {
      try {
        setLoading(true);
        const data = await api.pedidos.buscarPorId(params.id);
        setPedido(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar pedido';
        showError('Erro ao carregar pedido', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadPedido();

    // Atualizar a cada 30 segundos
    const interval = setInterval(loadPedido, 30000);
    return () => clearInterval(interval);
  }, [params.id, showError]);

  const getStatusSteps = () => {
    if (!pedido) return [];

    const steps = [
      {
        id: 'pendente',
        label: 'Recebido',
        icon: '📝',
        status: 'done' as const,
      },
      {
        id: 'confirmado',
        label: 'Confirmado',
        icon: '✓',
        status: statusNormalizado === 'pendente' ? 'pending' as const : 'done' as const,
      },
      {
        id: 'preparando',
        label: 'Preparando',
        icon: '👨‍🍳',
        status: 
          statusNormalizado === 'preparando' ? 'active' as const :
          ['saiu_entrega', 'entregue'].includes(statusNormalizado) ? 'done' as const :
          'pending' as const,
      },
      {
        id: 'saiu_entrega',
        label: 'A caminho',
        icon: '🛵',
        status: 
          statusNormalizado === 'saiu_entrega' ? 'active' as const :
          statusNormalizado === 'entregue' ? 'done' as const :
          'pending' as const,
      },
      {
        id: 'entregue',
        label: 'Entregue',
        icon: '🏠',
        status: statusNormalizado === 'entregue' ? 'done' as const : 'pending' as const,
      },
    ];

    return steps;
  };

  const getStatusBadge = () => {
    if (!pedido) return null;

    const statusMap: Record<string, { variant: 'gold' | 'green' | 'brand' | 'red'; text: string }> = {
      pendente: { variant: 'gold' as const, text: 'Aguardando' },
      confirmado: { variant: 'green' as const, text: 'Confirmado' },
      preparando: { variant: 'gold' as const, text: 'Em Preparo' },
      saiu_entrega: { variant: 'brand' as const, text: 'A Caminho' },
      entregue: { variant: 'green' as const, text: 'Entregue' },
      cancelado: { variant: 'red' as const, text: 'Cancelado' },
    };

    const status = statusMap[statusNormalizado] || { variant: 'gold' as const, text: 'Aguardando' };
    return <Badge variant={status.variant} size="lg">{status.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#1A0D06' }}>
        <AppBar title="Carregando..." />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#D4601C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#9A7B5C]">Carregando pedido...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#1A0D06' }}>
        <AppBar title="Pedido não encontrado" onBack={() => router.push('/')} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: '#3E2214' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4601C" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className="font-display text-2xl text-[#F4E8CC] mb-2">Pedido não encontrado</h2>
            <p className="text-[#9A7B5C] mb-6">Não foi possível encontrar este pedido</p>
            <Button onClick={() => router.push('/')}>Voltar ao Cardápio</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1A0D06' }}>
      <AppBar title={`Pedido #${pedido.numero}`} onBack={() => router.push('/')} />

      <main className="flex-1 overflow-y-auto pb-6">
        <div className="container py-6 max-w-2xl space-y-6">
          {/* Success Message */}
          <div className="rounded-2xl p-6 text-center" style={{ background: '#251208', border: '2px solid #4A7840' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#4A7840' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="font-display text-2xl text-[#F4E8CC] mb-2">Pedido Confirmado!</h2>
            <p className="text-[#9A7B5C] mb-4">Seu pedido foi recebido e está sendo preparado com carinho</p>
            {getStatusBadge()}
          </div>

          {/* Status Tracker */}
          <div className="rounded-2xl p-6" style={{ background: '#251208', border: '1px solid #3E2214' }}>
            <h3 className="font-body font-extrabold text-lg uppercase text-[#F4E8CC] mb-6">
              Acompanhe seu Pedido
            </h3>
            <StatusTracker steps={getStatusSteps()} />

            <div className="mt-6 pt-6" style={{ borderTop: '1px solid #3E2214' }}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#9A7B5C]">Tempo estimado:</span>
                <span className="font-bold text-[#F4E8CC]">{pedido.tempoEstimadoMin} minutos</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-[#9A7B5C]">Pedido realizado:</span>
                <span className="font-bold text-[#F4E8CC]">{criadoEm ? formatTime(criadoEm) : '--:--'}</span>
              </div>
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div className="rounded-2xl p-6" style={{ background: '#251208', border: '1px solid #3E2214' }}>
            <h3 className="font-body font-extrabold text-lg uppercase text-[#F4E8CC] mb-4">
              Endereço de Entrega
            </h3>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-[#F4E8CC]">{pedido.clienteNome}</p>
              <p className="text-[#9A7B5C]">{pedido.clienteTelefone}</p>
              <p className="text-[#9A7B5C] mt-2">{enderecoTexto || 'Endereço não informado'}</p>
              <p className="text-[#9A7B5C]">{bairroTexto || 'Bairro não informado'}</p>
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="rounded-2xl p-6" style={{ background: '#251208', border: '1px solid #3E2214' }}>
            <h3 className="font-body font-extrabold text-lg uppercase text-[#F4E8CC] mb-4">
              Itens do Pedido
            </h3>
            <div className="space-y-3">
              {pedido.itens.map((item) => (
                <div key={item.id} className="flex items-start gap-3 pb-3 last:border-0" style={{ borderBottom: '1px solid #3E2214' }}>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#3E2214' }}>
                    <span className="text-xl">🍽️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#F4E8CC]">{item.produto.nome}</p>
                    <p className="text-xs text-[#9A7B5C]">Quantidade: {item.quantidade}</p>
                    {(item.observacoes || item.observacao) && (
                      <p className="text-xs text-[#9A7B5C] mt-1">Obs: {item.observacoes || item.observacao}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#F4E8CC]">{formatCurrency((item.precoUnitario || item.precoUnit) * item.quantidade)}</p>
                    <p className="text-xs text-[#9A7B5C]">{formatCurrency(item.precoUnitario || item.precoUnit)} cada</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo do Pagamento */}
          <div className="rounded-2xl p-6" style={{ background: '#251208', border: '1px solid #3E2214' }}>
            <h3 className="font-body font-extrabold text-lg uppercase text-[#F4E8CC] mb-4">
              Resumo do Pagamento
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#9A7B5C]">Subtotal</span>
                <span className="font-semibold text-[#F4E8CC]">{formatCurrency(pedido.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9A7B5C]">Taxa de entrega</span>
                <span className="font-semibold text-[#F4E8CC]">{formatCurrency(pedido.taxaEntrega)}</span>
              </div>
              <div className="flex justify-between pt-3" style={{ borderTop: '1px solid #3E2214' }}>
                <span className="font-body font-extrabold text-md uppercase text-[#F4E8CC]">Total</span>
                <span className="font-display text-xl text-[#E87830]">{formatCurrency(pedido.total)}</span>
              </div>
              <div className="pt-3" style={{ borderTop: '1px solid #3E2214' }}>
                <div className="flex justify-between text-sm">
                  <span className="text-[#9A7B5C]">Forma de pagamento:</span>
                  <span className="font-semibold text-[#F4E8CC] capitalize">{pedido.formaPagamento.replace('_', ' ')}</span>
                </div>
                {pedido.trocoParaValor && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#9A7B5C]">Troco para:</span>
                    <span className="font-semibold text-[#F4E8CC]">{formatCurrency(pedido.trocoParaValor)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Observações */}
          {(pedido.observacoes || pedido.observacao) && (
            <div className="rounded-2xl p-4" style={{ background: '#3E2214', border: '1px solid #5C3418' }}>
              <p className="text-sm font-semibold text-[#E8A040] mb-1">Observações:</p>
              <p className="text-sm text-[#E8D4B0]">{pedido.observacoes || pedido.observacao}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button variant="outline" size="lg" className="w-full" onClick={() => router.push('/')}>
              Fazer Novo Pedido
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
