'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import api, { Bairro } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { z } from 'zod';

const bairroSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  taxaEntrega: z.number({ invalid_type_error: 'Taxa inválida' }).min(0, 'Taxa não pode ser negativa'),
  tempoEntregaMin: z.number({ invalid_type_error: 'Tempo inválido' }).min(1, 'Tempo mínimo é 1 minuto'),
  ativo: z.boolean(),
});

type BairroForm = {
  nome: string;
  taxaEntrega: string;
  tempoEntregaMin: string;
  ativo: boolean;
};

type BairroErrors = Partial<Record<keyof BairroForm, string>>;

const FORM_VAZIO: BairroForm = { nome: '', taxaEntrega: '', tempoEntregaMin: '', ativo: true };

export default function AdminBairrosPage() {
  const { showSuccess, showError } = useToast();
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Bairro | null>(null);
  const [form, setForm] = useState<BairroForm>(FORM_VAZIO);
  const [errors, setErrors] = useState<BairroErrors>({});
  const [salvando, setSalvando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const carregarBairros = async () => {
    try {
      setLoading(true);
      const data = await api.bairros.listar();
      setBairros(Array.isArray(data) ? data : []);
    } catch (err) {
      showError('Erro ao carregar bairros', err instanceof Error ? err.message : 'Tente novamente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarBairros(); }, []);

  const abrirModal = (bairro?: Bairro) => {
    if (bairro) {
      setEditando(bairro);
      setForm({
        nome: bairro.nome,
        taxaEntrega: String(bairro.taxaEntrega),
        tempoEntregaMin: String(bairro.tempoEntregaMin),
        ativo: bairro.ativo,
      });
    } else {
      setEditando(null);
      setForm(FORM_VAZIO);
    }
    setErrors({});
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    setForm(FORM_VAZIO);
    setErrors({});
  };

  const validar = (): boolean => {
    const result = bairroSchema.safeParse({
      nome: form.nome,
      taxaEntrega: parseFloat(form.taxaEntrega),
      tempoEntregaMin: parseInt(form.tempoEntregaMin),
      ativo: form.ativo,
    });
    if (!result.success) {
      const erros: BairroErrors = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as keyof BairroForm;
        if (field) erros[field] = e.message;
      });
      setErrors(erros);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSalvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const payload = {
      nome: form.nome,
      taxaEntrega: parseFloat(form.taxaEntrega),
      tempoEntregaMin: parseInt(form.tempoEntregaMin),
      ativo: form.ativo,
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
      fecharModal();
      carregarBairros();
    } catch (err) {
      showError('Erro ao salvar bairro', err instanceof Error ? err.message : 'Tente novamente');
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async (id: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    try {
      await fetch(`${baseUrl}/api/bairros/${id}`, { method: 'DELETE' });
      showSuccess('Bairro excluído com sucesso!');
      setBairros((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      showError('Erro ao excluir bairro', err instanceof Error ? err.message : 'Tente novamente');
    } finally {
      setConfirmDelete(null);
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
        <Button size="md" onClick={() => abrirModal()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
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
            <p className="text-neutral-400 text-sm mt-1">Cadastre os bairros atendidos e suas taxas de entrega</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Bairro</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Taxa de Entrega</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Tempo Estimado</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Status</th>
                <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {bairros.map((bairro) => (
                <tr key={bairro.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-neutral-900">{bairro.nome}</td>
                  <td className="px-6 py-4">
                    <span className="font-brand font-black text-red-500">{formatCurrency(bairro.taxaEntrega)}</span>
                  </td>
                  <td className="px-6 py-4 text-neutral-600 text-sm">{bairro.tempoEntregaMin} min</td>
                  <td className="px-6 py-4">
                    <Badge variant={bairro.ativo ? 'green' : 'red'} size="sm">
                      {bairro.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => abrirModal(bairro)}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        aria-label="Editar bairro"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {confirmDelete === bairro.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(bairro.id)} className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">Confirmar</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-xs font-bold text-neutral-500 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">Cancelar</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(bairro.id)}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          aria-label="Excluir bairro"
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
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={fecharModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-brand text-xl font-black uppercase text-neutral-900">
              {editando ? 'Editar Bairro' : 'Novo Bairro'}
            </h2>

            <Input
              label="Nome do bairro *"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              error={errors.nome}
              placeholder="Ex: Centro"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Taxa de entrega (R$) *"
                type="number"
                min="0"
                step="0.01"
                value={form.taxaEntrega}
                onChange={(e) => setForm({ ...form, taxaEntrega: e.target.value })}
                error={errors.taxaEntrega}
                placeholder="0.00"
              />
              <Input
                label="Tempo estimado (min) *"
                type="number"
                min="1"
                value={form.tempoEntregaMin}
                onChange={(e) => setForm({ ...form, tempoEntregaMin: e.target.value })}
                error={errors.tempoEntregaMin}
                placeholder="30"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-sm font-semibold text-neutral-700">Bairro ativo (aceita pedidos)</span>
            </label>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="md" className="flex-1" onClick={fecharModal}>Cancelar</Button>
              <Button size="md" className="flex-1" onClick={handleSalvar} loading={salvando}>
                {editando ? 'Salvar alterações' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
