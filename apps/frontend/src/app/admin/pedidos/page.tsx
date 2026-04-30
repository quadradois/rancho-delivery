'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency, formatTime } from '@/lib/utils';
import api, { Pedido } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'preparando', label: 'Preparando' },
  { value: 'saiu_entrega', label: 'A Caminho' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

const STATUS_BADGE: Record<string, { variant: 'gold' | 'green' | 'brand' | 'red' | 'dark'; label: string }> = {
  pendente:     { variant: 'gold',  label: 'Pendente' },
  confirmado:   { variant: 'green', label: 'Confirmado' },
  preparando:   { variant: 'gold',  label: 'Preparando' },
  saiu_entrega: { variant: 'brand', label: 'A Caminho' },
  entregue:     { variant: 'green', label: 'Entregue' },
  cancelado:    { variant: 'red',   label: 'Cancelado' },
};

export default function AdminPedidosPage() {
  const { showError } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  const carregarPedidos = useCallback(async () => {
    try {
      setLoading(true);
      // Busca pedidos recentes — usa telefone vazio para listar todos se a API suportar
      // Como a API atual lista por cliente, buscamos por um telefone genérico
      // Em produção, o backend deve ter um endpoint GET /pedidos para admin
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/pedidos`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setPedidos(Array.isArray(data) ? data : []);
      } else {
        setPedidos([]);
      }
    } catch {
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarPedidos();
    // Atualiza a cada 30s
    const interval = setInterval(carregarPedidos, 30000);
    return () => clearInterval(interval);
  }, [carregarPedidos]);

  const pedidosFiltrados = pedidos.filter((p) => {
    const matchStatus = statusFiltro === 'todos' || p.status === statusFiltro;
    const matchCliente =
      !buscaCliente ||
      p.clienteNome?.toLowerCase().includes(buscaCliente.toLowerCase()) ||
      p.clienteTelefone?.includes(buscaCliente);
    return matchStatus && matchCliente;
  });

  const totalPaginas = Math.ceil(pedidosFiltrados.length / POR_PAGINA);
  const pedidosPagina = pedidosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-brand text-3xl font-black uppercase text-neutral-900">Pedidos</h1>
          <p className="text-neutral-500 mt-1">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} no total</p>
        </div>
        <Button variant="outline" size="md" onClick={carregarPedidos}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        {/* Busca cliente */}
        <div className="relative flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por cliente ou telefone..."
            value={buscaCliente}
            onChange={(e) => { setBuscaCliente(e.target.value); setPagina(1); }}
            className="w-full h-10 pl-9 pr-4 text-sm border border-neutral-200 rounded-xl outline-none focus:border-red-500 transition-colors"
          />
        </div>

        {/* Status */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFiltro(opt.value); setPagina(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                statusFiltro === opt.value
                  ? 'bg-red-500 text-white'
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Tabela */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">Carregando pedidos...</p>
            </div>
          ) : pedidosPagina.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-neutral-400 font-semibold">Nenhum pedido encontrado</p>
              <p className="text-neutral-400 text-sm mt-1">Tente ajustar os filtros</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">#</th>
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Cliente</th>
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Total</th>
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Pagamento</th>
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Data</th>
                  <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {pedidosPagina.map((pedido) => {
                  const badge = STATUS_BADGE[pedido.status] ?? { variant: 'dark' as const, label: pedido.status };
                  return (
                    <tr
                      key={pedido.id}
                      className={`hover:bg-neutral-50 transition-colors cursor-pointer ${pedidoSelecionado?.id === pedido.id ? 'bg-red-50' : ''}`}
                      onClick={() => setPedidoSelecionado(pedidoSelecionado?.id === pedido.id ? null : pedido)}
                    >
                      <td className="px-6 py-4 font-brand font-black text-neutral-500">#{pedido.numero}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-neutral-900 text-sm">{pedido.clienteNome}</p>
                        <p className="text-xs text-neutral-400">{pedido.clienteTelefone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-brand font-black text-red-500">{formatCurrency(pedido.total)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 capitalize">
                        {pedido.formaPagamento?.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-400">
                        {formatTime(pedido.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPedidoSelecionado(pedidoSelecionado?.id === pedido.id ? null : pedido);
                          }}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          aria-label="Ver detalhes"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, pedidosFiltrados.length)} de {pedidosFiltrados.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50 transition-colors"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className={`w-8 h-8 text-sm font-semibold rounded-lg transition-colors ${
                      p === pagina ? 'bg-red-500 text-white' : 'border border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50 transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Painel de detalhes */}
        {pedidoSelecionado && (
          <div className="w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm p-6 space-y-4 self-start sticky top-8">
            <div className="flex items-center justify-between">
              <h2 className="font-brand text-lg font-black uppercase text-neutral-900">
                Pedido #{pedidoSelecionado.numero}
              </h2>
              <button
                onClick={() => setPedidoSelecionado(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
                aria-label="Fechar detalhes"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Status */}
            <div>
              <Badge
                variant={STATUS_BADGE[pedidoSelecionado.status]?.variant ?? 'dark'}
                size="md"
              >
                {STATUS_BADGE[pedidoSelecionado.status]?.label ?? pedidoSelecionado.status}
              </Badge>
            </div>

            {/* Cliente */}
            <div className="space-y-1 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Cliente</p>
              <p className="font-semibold text-neutral-900">{pedidoSelecionado.clienteNome}</p>
              <p className="text-neutral-500">{pedidoSelecionado.clienteTelefone}</p>
              {pedidoSelecionado.clienteEmail && (
                <p className="text-neutral-500">{pedidoSelecionado.clienteEmail}</p>
              )}
            </div>

            {/* Endereço */}
            <div className="space-y-1 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Endereço</p>
              <p className="text-neutral-700">
                {pedidoSelecionado.endereco.rua}, {pedidoSelecionado.endereco.numero}
                {pedidoSelecionado.endereco.complemento && ` - ${pedidoSelecionado.endereco.complemento}`}
              </p>
              <p className="text-neutral-500">{pedidoSelecionado.endereco.bairro} — CEP {pedidoSelecionado.endereco.cep}</p>
            </div>

            {/* Itens */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Itens</p>
              {pedidoSelecionado.itens.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-neutral-700">{item.quantidade}x {item.produto?.nome ?? item.produtoId}</span>
                  <span className="font-semibold text-neutral-900">{formatCurrency(item.precoUnitario * item.quantidade)}</span>
                </div>
              ))}
            </div>

            {/* Totais */}
            <div className="border-t border-neutral-100 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span>{formatCurrency(pedidoSelecionado.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Entrega</span>
                <span>{formatCurrency(pedidoSelecionado.taxaEntrega)}</span>
              </div>
              <div className="flex justify-between font-brand font-black text-base pt-1">
                <span className="text-neutral-900">Total</span>
                <span className="text-red-500">{formatCurrency(pedidoSelecionado.total)}</span>
              </div>
            </div>

            {/* Pagamento */}
            <div className="text-sm text-neutral-500">
              <span className="font-semibold text-neutral-700">Pagamento: </span>
              {pedidoSelecionado.formaPagamento?.replace('_', ' ')}
              {pedidoSelecionado.trocoParaValor && (
                <span> (troco para {formatCurrency(pedidoSelecionado.trocoParaValor)})</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
