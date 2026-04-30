'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Bairro {
  id: string;
  nome: string;
  cep?: string;
  taxa: number;
  ativo: boolean;
  linkIfood?: string;
  link99food?: string;
  linkOutro?: string;
  nomeOutro?: string;
}

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

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const carregarBairros = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/bairros/todos`);
      const json = await res.json();
      setBairros(json.data ?? []);
    } catch {
      showError('Erro ao carregar bairros', 'Tente novamente');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, showError]);

  useEffect(() => { carregarBairros(); }, [carregarBairros]);

  // Consulta ViaCEP ao digitar CEP no modal
  const handleCepChange = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '').slice(0, 8);
    const formatado = cepLimpo.length > 5 ? `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}` : cepLimpo;
    setForm(p => ({ ...p, cep: formatado, nome: '', logradouro: '', localidade: '' }));

    if (cepLimpo.length !== 8) return;

    setLoadingCep(true);
    try {
      const res = await fetch(`${baseUrl}/api/bairros/viacep/${cepLimpo}`);
      const json = await res.json();
      const data: ViaCepData = json.data;

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
    } catch {
      showError('Erro ao consultar CEP', 'Tente novamente');
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
      ativo: form.ativo,
      linkIfood: form.linkIfood || undefined,
      link99food: form.link99food || undefined,
      linkOutro: form.linkOutro || undefined,
      nomeOutro: form.nomeOutro || undefined,
    };

    try {
      if (editando) {
        await fetch(`${baseUrl}/api/bairros/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Bairro atualizado com sucesso!');
      } else {
        await fetch(`${baseUrl}/api/bairros`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Bairro cadastrado com sucesso!');
      }
      setModalAberto(false);
      carregarBairros();
    } catch {
      showError('Erro ao salvar bairro', 'Tente novamente');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    try {
      await fetch(`${baseUrl}/api/bairros/${id}`, { method: 'DELETE' });
      showSuccess('Bairro excluído com sucesso!');
      setConfirmandoExclusao(null);
      carregarBairros();
    } catch {
      showError('Erro ao excluir bairro', 'Tente novamente');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-brand text-3xl font-black uppercase text-neutral-900">Bairros</h1>
          <p className="text-neutral-500 mt-1">{bairros.length} bairro{bairros.length !== 1 ? 's' : ''} cadastrado{bairros.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="md" onClick={abrirModalNovo}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Bairro
        </Button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">Carregando bairros...</p>
          </div>
        ) : bairros.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-neutral-400 font-semibold">Nenhum bairro cadastrado</p>
            <p className="text-neutral-400 text-sm mt-1">Clique em &ldquo;Novo Bairro&rdquo; para começar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Bairro</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">CEP Ref.</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Taxa</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Marketplaces</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Status</th>
                <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {bairros.map((bairro) => (
                <tr key={bairro.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-neutral-900 text-sm">{bairro.nome}</td>
                  <td className="px-6 py-4 text-sm text-neutral-500 font-mono">
                    {bairro.cep ? bairro.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-brand font-black text-red-500">{formatCurrency(bairro.taxa)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {bairro.linkIfood && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">iFood</span>}
                      {bairro.link99food && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-bold">99Food</span>}
                      {bairro.linkOutro && <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-bold">{bairro.nomeOutro || 'Outro'}</span>}
                      {!bairro.linkIfood && !bairro.link99food && !bairro.linkOutro && <span className="text-neutral-300 text-sm">—</span>}
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
                        <span className="text-xs text-neutral-500">Confirmar?</span>
                        <button onClick={() => handleExcluir(bairro.id)}
                          className="px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          Sim
                        </button>
                        <button onClick={() => setConfirmandoExclusao(null)}
                          className="px-2 py-1 text-xs font-bold text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors">
                          Não
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => abrirModalEditar(bairro)}
                          className="p-2 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button onClick={() => setConfirmandoExclusao(bairro.id)}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
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
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-brand text-xl font-black uppercase text-neutral-900">
                  {editando ? 'Editar Bairro' : 'Novo Bairro'}
                </h2>
                <button onClick={() => setModalAberto(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-700 rounded-xl transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* CEP — consulta ViaCEP */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-neutral-700">CEP de referência</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="00000-000"
                      value={form.cep}
                      onChange={e => handleCepChange(e.target.value)}
                      maxLength={9}
                      className="w-full h-11 px-4 pr-10 text-sm border border-neutral-200 rounded-xl outline-none focus:border-red-500 transition-colors"
                    />
                    {loadingCep && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400">O nome do bairro será preenchido automaticamente pelo ViaCEP</p>
                </div>

                {/* Nome — travado, vem do ViaCEP */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-neutral-700">Nome do bairro</label>
                  <div className={`h-11 px-4 flex items-center rounded-xl text-sm border ${
                    form.nome ? 'border-green-200 bg-green-50 text-neutral-700' : 'border-neutral-200 bg-neutral-50 text-neutral-400'
                  }`}>
                    {form.nome || 'Preenchido automaticamente pelo CEP'}
                    {form.nome && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A7840" strokeWidth="2.5" className="ml-auto flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  {form.localidade && (
                    <p className="text-xs text-neutral-400">{form.localidade}</p>
                  )}
                </div>

                {/* Taxa */}
                <Input
                  label="Taxa de entrega (R$) *"
                  type="number"
                  min="0"
                  step="0.50"
                  value={form.taxa}
                  onChange={e => setForm(p => ({ ...p, taxa: e.target.value }))}
                  placeholder="0.00"
                />

                {/* Ativo */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.ativo}
                    onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))}
                    className="w-4 h-4 accent-red-500" />
                  <span className="text-sm font-semibold text-neutral-700">Bairro ativo para entrega</span>
                </label>

                {/* Marketplaces — expansível */}
                <div className="border-t border-neutral-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setMostrarMarketplaces(p => !p)}
                    className="flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-700 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`transition-transform ${mostrarMarketplaces ? 'rotate-90' : ''}`}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    Links de marketplace (opcional)
                  </button>

                  {mostrarMarketplaces && (
                    <div className="mt-4 space-y-3">
                      <p className="text-xs text-neutral-400">
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
