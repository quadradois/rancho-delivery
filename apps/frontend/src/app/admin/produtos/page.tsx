'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import api, { Produto } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const CATEGORIAS = ['Todos', 'Lanche', 'Pizza', 'Bebida', 'Sobremesa', 'Combo'];

export default function AdminProdutosPage() {
  const { showSuccess, showError } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos');
  const [pagina, setPagina] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const POR_PAGINA = 10;

  const carregarProdutos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.produtos.listar();
      setProdutos(Array.isArray(data) ? data : []);
    } catch (err) {
      showError('Erro ao carregar produtos', err instanceof Error ? err.message : 'Tente novamente');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  const handleDelete = async (id: string) => {
    try {
      await api.produtos.excluir(id);
      showSuccess('Produto excluído com sucesso!');
      setProdutos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      showError('Erro ao excluir produto', err instanceof Error ? err.message : 'Tente novamente');
    } finally {
      setConfirmDelete(null);
    }
  };

  const produtosFiltrados = produtos.filter((p) => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaFiltro === 'Todos' || p.categoria === categoriaFiltro;
    return matchBusca && matchCategoria;
  });

  const totalPaginas = Math.ceil(produtosFiltrados.length / POR_PAGINA);
  const produtosPagina = produtosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-brand text-3xl font-black uppercase text-[var(--color-text-primary)]">Produtos</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">{produtos.length} produto{produtos.length !== 1 ? 's' : ''} cadastrado{produtos.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/produtos/novo">
          <Button size="md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Produto
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm md:flex-row">
        {/* Busca */}
        <div className="relative flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-input)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] placeholder:opacity-90 outline-none transition-colors focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Categoria */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategoriaFiltro(cat); setPagina(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                categoriaFiltro === cat
                  ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                  : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent" />
            <p className="text-[var(--color-text-secondary)] text-sm">Carregando produtos...</p>
          </div>
        ) : produtosPagina.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[var(--color-text-tertiary)] font-semibold">Nenhum produto encontrado</p>
            <p className="text-[var(--color-text-tertiary)] text-sm mt-1">Tente ajustar os filtros ou cadastre um novo produto</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Produto</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Categoria</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Preço</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Status</th>
                <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {produtosPagina.map((produto) => (
                <tr key={produto.id} className="hover:bg-[var(--color-surface-raised)] transition-colors">
                  {/* Produto */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[var(--color-surface-raised)] rounded-xl overflow-hidden flex-shrink-0">
                        {produto.midia || produto.imagemUrl ? (
                          <Image
                            src={produto.midia || produto.imagemUrl || ''}
                            alt={produto.nome}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--color-text-disabled)]">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)] text-sm">{produto.nome}</p>
                        <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-1 max-w-[200px]">{produto.descricao}</p>
                      </div>
                    </div>
                  </td>

                  {/* Categoria */}
                  <td className="px-6 py-4">
                    <Badge variant="outline" size="sm">{produto.categoria}</Badge>
                  </td>

                  {/* Preço */}
                  <td className="px-6 py-4">
                    <span className="font-brand font-black text-[var(--color-accent)]">{formatCurrency(produto.preco)}</span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <Badge variant={produto.disponivel !== false ? 'green' : 'red'} size="sm">
                      {produto.disponivel !== false ? 'Disponível' : 'Indisponível'}
                    </Badge>
                  </td>

                  {/* Ações */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/produtos/${produto.id}`}>
                        <button className="p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--color-info-subtle)] hover:text-[var(--color-info-text)] rounded-lg transition-all" aria-label="Editar produto">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </Link>
                      {confirmDelete === produto.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(produto.id)}
                            className="px-2 py-1 text-xs font-bold text-[var(--color-text-on-accent)] bg-[var(--color-danger)] rounded-lg hover:bg-[var(--color-danger-hover)] transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 text-xs font-bold text-[var(--color-text-secondary)] bg-[var(--color-surface-raised)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(produto.id)}
                          className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-danger-text)] hover:bg-[var(--color-danger-subtle)] rounded-lg transition-all"
                          aria-label="Excluir produto"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, produtosFiltrados.length)} de {produtosFiltrados.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                Anterior
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPagina(p)}
                  className={`w-8 h-8 text-sm font-semibold rounded-lg transition-colors ${
                    p === pagina ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]' : 'border border-[var(--color-border)] hover:bg-[var(--color-surface-raised)]'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
