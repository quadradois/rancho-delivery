'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Produto } from '@/lib/api';
import { CrmButton, CrmModal } from '@/components/crm';

interface ClienteRapido {
  telefone: string;
  nome: string;
  endereco: string;
  bairro: string;
  topProdutos: Array<{ id: string; nome: string; preco: number }>;
}

interface ModalPedidoManualProps {
  open: boolean;
  onClose: () => void;
  produtos: Produto[];
  onBuscarCliente: (telefone: string) => Promise<ClienteRapido | null>;
  onCriar: (dados: {
    cliente: { nome: string; telefone: string; endereco: string; bairro: string; cep?: string };
    itens: Array<{ produtoId: string; quantidade: number }>;
    pagamentoMetodo: 'PIX' | 'DINHEIRO';
    valorDinheiro?: number;
    observacao?: string;
  }) => Promise<void>;
}

type Passo = 1 | 2 | 3;

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ModalPedidoManual({
  open,
  onClose,
  produtos,
  onBuscarCliente,
  onCriar,
}: ModalPedidoManualProps) {
  const [passo, setPasso] = useState<Passo>(1);
  const [buscando, setBuscando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState<ClienteRapido | null>(null);

  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');

  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');

  const [pagamento, setPagamento] = useState<'PIX' | 'DINHEIRO'>('PIX');
  const [valorDinheiro, setValorDinheiro] = useState('');

  const telefoneRef = useRef<HTMLInputElement>(null);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setPasso(1);
      setTelefone('');
      setNome('');
      setEndereco('');
      setBairro('');
      setProdutoId(produtos[0]?.id || '');
      setQuantidade(1);
      setObservacao('');
      setBuscaProduto('');
      setPagamento('PIX');
      setValorDinheiro('');
      setClienteEncontrado(null);
      setTimeout(() => telefoneRef.current?.focus(), 100);
    }
  }, [open, produtos]);

  const buscarCliente = useCallback(async (tel: string) => {
    if (tel.length < 8) return;
    setBuscando(true);
    try {
      const cliente = await onBuscarCliente(tel);
      if (cliente) {
        setClienteEncontrado(cliente);
        setNome(cliente.nome);
        setEndereco(cliente.endereco);
        setBairro(cliente.bairro);
        if (cliente.topProdutos.length > 0) {
          setProdutoId(cliente.topProdutos[0].id);
        }
      } else {
        setClienteEncontrado(null);
      }
    } finally {
      setBuscando(false);
    }
  }, [onBuscarCliente]);

  const produtosFiltrados = buscaProduto
    ? produtos.filter((p) => p.nome.toLowerCase().includes(buscaProduto.toLowerCase()))
    : produtos;

  // Produtos favoritos do cliente aparecem primeiro
  const produtosOrdenados = clienteEncontrado?.topProdutos.length
    ? [
        ...clienteEncontrado.topProdutos.filter((tp) => produtos.find((p) => p.id === tp.id)),
        ...produtosFiltrados.filter((p) => !clienteEncontrado.topProdutos.find((tp) => tp.id === p.id)),
      ]
    : produtosFiltrados;

  const produtoSelecionado = produtos.find((p) => p.id === produtoId);

  const handleCriar = async () => {
    if (!telefone || !nome || !endereco || !bairro || !produtoId) return;
    setCriando(true);
    try {
      await onCriar({
        cliente: { nome, telefone, endereco, bairro },
        itens: [{ produtoId, quantidade }],
        pagamentoMetodo: pagamento,
        valorDinheiro: pagamento === 'DINHEIRO' ? Number(valorDinheiro || 0) : undefined,
        observacao: observacao || undefined,
      });
      onClose();
    } finally {
      setCriando(false);
    }
  };

  const passoLabel = ['Cliente', 'Produto', 'Pagamento'];

  return (
    <CrmModal open={open} onClose={onClose} title="Pedido manual">
      {/* Indicador de passos */}
      <div className="mb-4 flex items-center gap-2">
        {([1, 2, 3] as Passo[]).map((p) => (
          <React.Fragment key={p}>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${passo === p ? 'bg-[var(--color-accent)] text-white' : passo > p ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)]'}`}>
              {passo > p ? '✓' : p}
            </div>
            <span className={`text-xs ${passo === p ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>
              {passoLabel[p - 1]}
            </span>
            {p < 3 && <div className="h-px flex-1 bg-[var(--color-border)]" />}
          </React.Fragment>
        ))}
      </div>

      {/* Passo 1 — Cliente */}
      {passo === 1 && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">Telefone</label>
            <div className="flex gap-2">
              <input
                ref={telefoneRef}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                onBlur={() => void buscarCliente(telefone)}
                placeholder="Ex: 62999999999"
                className="h-9 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
              />
              <CrmButton size="sm" variant="ghost" onClick={() => void buscarCliente(telefone)} disabled={buscando}>
                {buscando ? '...' : 'Buscar'}
              </CrmButton>
            </div>
            {clienteEncontrado && (
              <p className="mt-1 text-[11px] text-[var(--color-success-text)]">Cliente encontrado: {clienteEncontrado.nome}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cliente" className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">Endereço</label>
              <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número" className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">Bairro</label>
              <input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
            </div>
          </div>
          <div className="flex justify-end">
            <CrmButton disabled={!telefone || !nome || !endereco || !bairro} onClick={() => setPasso(2)}>
              Próximo →
            </CrmButton>
          </div>
        </div>
      )}

      {/* Passo 2 — Produto */}
      {passo === 2 && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">Buscar produto</label>
            <input
              autoFocus
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              placeholder="Digite o nome..."
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-auto rounded-md border border-[var(--color-border)]">
            {produtosOrdenados.slice(0, 20).map((p) => {
              const isFav = clienteEncontrado?.topProdutos.some((tp) => tp.id === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProdutoId(p.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-hover)] ${produtoId === p.id ? 'bg-[var(--color-accent-muted)]' : ''}`}
                >
                  <span className="flex items-center gap-1">
                    {isFav && <span className="text-[10px]">⭐</span>}
                    {p.nome}
                  </span>
                  <span className="text-[var(--color-text-tertiary)]">{formatCurrency(p.preco)}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Qtd:</label>
            <input
              type="number"
              min={1}
              max={20}
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
              className="h-9 w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
            />
            {produtoSelecionado && (
              <span className="text-sm font-semibold text-[var(--color-accent)]">
                {formatCurrency(produtoSelecionado.preco * quantidade)}
              </span>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">Observação (opcional)</label>
            <input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: sem cebola" className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
          </div>
          <div className="flex justify-between">
            <CrmButton variant="ghost" onClick={() => setPasso(1)}>← Voltar</CrmButton>
            <CrmButton disabled={!produtoId} onClick={() => setPasso(3)}>Próximo →</CrmButton>
          </div>
        </div>
      )}

      {/* Passo 3 — Pagamento */}
      {passo === 3 && (
        <div className="space-y-3">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-sm">
            <p className="font-semibold text-[var(--color-text-primary)]">{nome}</p>
            <p className="text-[var(--color-text-secondary)]">{endereco} · {bairro}</p>
            <p className="mt-1 text-[var(--color-text-secondary)]">
              {produtoSelecionado?.nome} × {quantidade}
              {produtoSelecionado && ` = ${formatCurrency(produtoSelecionado.preco * quantidade)}`}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-[var(--color-text-secondary)]">Forma de pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              <CrmButton variant={pagamento === 'PIX' ? 'primary' : 'ghost'} onClick={() => setPagamento('PIX')}>PIX</CrmButton>
              <CrmButton variant={pagamento === 'DINHEIRO' ? 'primary' : 'ghost'} onClick={() => setPagamento('DINHEIRO')}>Dinheiro</CrmButton>
            </div>
          </div>
          {pagamento === 'DINHEIRO' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">Valor em dinheiro</label>
              <input
                autoFocus
                type="number"
                value={valorDinheiro}
                onChange={(e) => setValorDinheiro(e.target.value)}
                placeholder="Ex: 50.00"
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
              />
            </div>
          )}
          <div className="flex justify-between">
            <CrmButton variant="ghost" onClick={() => setPasso(2)}>← Voltar</CrmButton>
            <CrmButton onClick={() => void handleCriar()} disabled={criando}>
              {criando ? 'Criando...' : 'Criar pedido'}
            </CrmButton>
          </div>
        </div>
      )}
    </CrmModal>
  );
}