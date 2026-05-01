'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api, { Bairro } from '@/lib/api';

interface ViaCepData {
  bairro: string;
  logradouro: string;
  localidade: string;
  uf: string;
  cep: string;
}

const FORM_VAZIO = {
  cep: '',
  nome: '',
  logradouro: '',
  localidade: '',
  taxa: '',
  tempoEntrega: '30',
  ativo: true,
  linkIfood: '',
  link99food: '',
  linkOutro: '',
  nomeOutro: '',
};

export default function AdminBairrosPage() {
  const { showSuccess, showError } = useToast();
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Bairro | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [loadingCep, setLoadingCep] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mostrarMarketplaces, setMostrarMarketplaces] = useState(false);

  const carregarBairros = useCallback(async () => {
    try {
      setLoading(true);
      const todos = await api.bairros.listarTodos();
      setBairros(todos);
    } catch (err) {
      showError('Erro ao carregar bairros', err instanceof Error ? err.message : 'Tente novamente');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { carregarBairros(); }, [carregarBairros]);

  // Consulta ViaCEP ao digitar CEP no modal
  const handleCepChange = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '').slice(0, 8);
    const formatado = cepLimpo.length > 5 ? `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}` : cepLimpo;
    setForm(p => ({ ...p, cep: formatado, nome: '', logradouro: '', localidade: '' }));

    if (cepLimpo.length !== 8) return;

    setLoadingCep(true);
    try {
      const data: ViaCepData = await api.bairros.consultarViaCep(cepLimpo);

      if (!data) {
        showError('CEP não encontrado', 'Verifique o CEP digitado');
        return;
      }

      setForm(p => ({
        ...p,
        nome: data.bairro,
        logradouro: data.logradouro,
        localidade: `${data.localidade}/${data.uf}`,
      }));
    } catch (err) {
      showError('Erro ao consultar CEP', err instanceof Error ? err.message : 'Tente novamente');
    } finally {
      setLoadingCep(false);
    }
  };

  const abrirModalNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setMostrarMarketplaces(false);
    setModalAberto(true);
  };

  const abrirModalEditar = (bairro: Bairro) => {
    setEditando(bairro);
    setForm({
      cep: bairro.cep || '',
      nome: bairro.nome,
      logradouro: '',
      localidade: '',
      taxa: String(bairro.taxa),
      tempoEntrega: String(bairro.tempoEntrega ?? bairro.tempoEntregaMin ?? 30),
      ativo: bairro.ativo,
      linkIfood: bairro.linkIfood || '',
      link99food: bairro.link99food || '',
      linkOutro: bairro.linkOutro || '',
      nomeOutro: bairro.nomeOutro || '',
    });
    setMostrarMarketplaces(!!(bairro.linkIfood || bairro.link99food || bairro.linkOutro));
    setModalAberto(true);
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.taxa) {
      showError('Preencha os campos obrigatórios', 'Nome e taxa são obrigatórios');
      return;
    }

    setSalvando(true);
    const payload = {
      nome: form.nome,
      cep: form.cep.replace(/\D/g, '') || undefined,
      taxa: parseFloat(form.taxa),
      tempoEntrega: parseInt(form.tempoEntrega) || 30,
      ativo: form.ativo,
      linkIfood: form.linkIfood || undefined,
      link99food: form.link99food || undefined,
      linkOutro: form.linkOutro || undefined,
      nomeOutro: form.nomeOutro || undefined,
    };

    try {
      if (editando) {
        await api.bairros.atualizar(editando.id, payload);
        showSuccess('Bairro atualizado com sucesso!');
      } else {
        await api.bairros.criar(payload);
        showSuccess('Bairro cadastrado com sucesso!');
      }
      setModalAberto(false);
      carregarBairros();
    } catch (err) {
      showError('Erro ao salvar bairro', err instanceof Error ? err.message : 'Tente novamente');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    try {
      await api.bairros.excluir(id);
      showSuccess('Bairro excluído com sucesso!');
      setConfirmandoExclusao(null);
      carregarBairros();
    } catch (err) {
      showError('Erro ao excluir bairro', err instanceof Error ? err.message : 'Tente novamente');
    }
  };

  const handleToggleAtivo = async (bairro: Bairro) => {
    try {
      await api.bairros.atualizar(bairro.id, { ativo: !bairro.ativo });
      setBairros((prev) => prev.map((item) => item.id === bairro.id ? { ...item, ativo: !bairro.ativo } : item));
      showSuccess(bairro.ativo ? 'Bairro desativado' : 'Bairro ativado');
    } catch (err) {
      showError('Erro ao alterar status', err instanceof Error ? err.message : 'Tente novamente');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-brand text-3xl font-black uppercase text-[var(--color-text-primary)]">Bairros</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">{bairros.length} bairro{bairros.length !== 1 ? 's' : ''} cadastrado{bairros.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="md" onClick={abrirModalNovo}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Bairro
        </Button>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent" />
            <p className="text-[var(--color-text-secondary)] text-sm">Carregando bairros...</p>
          </div>
        ) : bairros.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[var(--color-text-tertiary)] font-semibold">Nenhum bairro cadastrado</p>
            <p className="text-[var(--color-text-tertiary)] text-sm mt-1">Clique em &ldquo;Novo Bairro&rdquo; para começar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Bairro</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">CEP Ref.</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Taxa</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Tempo</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Marketplaces</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Status</th>
                <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {bairros.map((bairro) => (
                <tr key={bairro.id} className="hover:bg-[var(--color-surface-raised)] transition-colors">
                  <td className="px-6 py-4 font-semibold text-[var(--color-text-primary)] text-sm">{bairro.nome}</td>
                  <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] font-mono">
                    {bairro.cep ? bairro.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-brand font-black text-[var(--color-accent)]">{formatCurrency(bairro.taxa)}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] font-semibold">
                    {bairro.tempoEntrega ?? bairro.tempoEntregaMin ?? 30} min
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {bairro.linkIfood && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-danger-subtle)] text-[var(--color-danger-text)] font-bold">iFood</span>}
                      {bairro.link99food && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-warning-subtle)] text-[var(--color-warning-text)] font-bold">99Food</span>}
                      {bairro.linkOutro && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] font-bold">{bairro.nomeOutro || 'Outro'}</span>}
                      {!bairro.linkIfood && !bairro.link99food && !bairro.linkOutro && <span className="text-[var(--color-text-disabled)] text-sm">—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={bairro.ativo ? 'green' : 'red'} size="sm">
                      {bairro.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {confirmandoExclusao === bairro.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-[var(--color-text-secondary)]">Confirmar?</span>
                        <button onClick={() => handleExcluir(bairro.id)}
                          className="px-2 py-1 text-xs font-bold text-[var(--color-danger-text)] hover:bg-[var(--color-danger-subtle)] rounded-lg transition-colors">
                          Sim
                        </button>
                        <button onClick={() => setConfirmandoExclusao(null)}
                          className="px-2 py-1 text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] rounded-lg transition-colors">
                          Não
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleToggleAtivo(bairro)}
                          className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                            bairro.ativo
                              ? 'text-[var(--color-warning-text)] hover:bg-[var(--color-warning-subtle)]'
                              : 'text-[var(--color-success-text)] hover:bg-[var(--color-success-subtle)]'
                          }`}>
                          {bairro.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button onClick={() => abrirModalEditar(bairro)}
                          className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-info-text)] hover:bg-[var(--color-info-subtle)] rounded-lg transition-all">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button onClick={() => setConfirmandoExclusao(bairro.id)}
                          className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-danger-text)] hover:bg-[var(--color-danger-subtle)] rounded-lg transition-all">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalAberto(false)} />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-brand text-xl font-black uppercase text-[var(--color-text-primary)]">
                  {editando ? 'Editar Bairro' : 'Novo Bairro'}
                </h2>
                <button onClick={() => setModalAberto(false)}
                  className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] rounded-xl transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* CEP — consulta ViaCEP */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-[var(--color-text-primary)]">CEP de referência</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="00000-000"
                      value={form.cep}
                      onChange={e => handleCepChange(e.target.value)}
                      maxLength={9}
                      className="w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-input)] px-4 pr-10 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] placeholder:opacity-90 outline-none transition-colors focus:border-[var(--color-accent)]"
                    />
                    {loadingCep && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">O nome do bairro será preenchido automaticamente pelo ViaCEP</p>
                </div>

                {/* Nome — ViaCEP sugere, operador pode ajustar */}
                <div className="flex flex-col gap-1">
                  <Input
                    label="Nome do bairro *"
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Preenchido pelo CEP ou digitado manualmente"
                  />
                  {form.localidade && (
                    <p className="text-xs text-[var(--color-text-tertiary)]">{form.localidade}</p>
                  )}
                </div>

                {/* Taxa e Tempo */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Taxa de entrega (R$) *"
                    type="number"
                    min="0"
                    step="0.50"
                    value={form.taxa}
                    onChange={e => setForm(p => ({ ...p, taxa: e.target.value }))}
                    placeholder="0.00"
                  />
                  <Input
                    label="Tempo de entrega (min) *"
                    type="number"
                    min="1"
                    step="5"
                    value={form.tempoEntrega}
                    onChange={e => setForm(p => ({ ...p, tempoEntrega: e.target.value }))}
                    placeholder="30"
                    hint="Tempo médio em minutos"
                  />
                </div>

                {/* Ativo */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.ativo}
                    onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))}
                    className="h-4 w-4 accent-[var(--color-accent)]" />
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">Bairro ativo para entrega</span>
                </label>

                {/* Marketplaces — expansível */}
                <div className="border-t border-[var(--color-border)] pt-4">
                  <button
                    type="button"
                    onClick={() => setMostrarMarketplaces(p => !p)}
                    className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`transition-transform ${mostrarMarketplaces ? 'rotate-90' : ''}`}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    Links de marketplace (opcional)
                  </button>

                  {mostrarMarketplaces && (
                    <div className="mt-4 space-y-3">
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        Quando o cliente estiver fora da área de entrega, esses links serão exibidos como alternativa.
                      </p>
                      <Input label="Link iFood" value={form.linkIfood}
                        onChange={e => setForm(p => ({ ...p, linkIfood: e.target.value }))}
                        placeholder="https://www.ifood.com.br/delivery/..." type="url" />
                      <Input label="Link 99Food" value={form.link99food}
                        onChange={e => setForm(p => ({ ...p, link99food: e.target.value }))}
                        placeholder="https://99app.com/..." type="url" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Nome do outro marketplace" value={form.nomeOutro}
                          onChange={e => setForm(p => ({ ...p, nomeOutro: e.target.value }))}
                          placeholder="Ex: Rappi" />
                        <Input label="Link" value={form.linkOutro}
                          onChange={e => setForm(p => ({ ...p, linkOutro: e.target.value }))}
                          placeholder="https://..." type="url" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" size="md" className="flex-1" onClick={() => setModalAberto(false)}>
                    Cancelar
                  </Button>
                  <Button size="md" className="flex-1" onClick={handleSalvar} loading={salvando}>
                    {editando ? 'Salvar alterações' : 'Cadastrar bairro'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
