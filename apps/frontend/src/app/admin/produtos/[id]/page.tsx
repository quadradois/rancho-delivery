'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import api, { Produto } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { z } from 'zod';

const produtoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  descricao: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  preco: z.number({ invalid_type_error: 'Preço inválido' }).positive('Preço deve ser positivo'),
  categoria: z.string().min(1, 'Selecione uma categoria'),
  midia: z.string().url('URL inválida').optional().or(z.literal('')),
  disponivel: z.boolean(),
  ordem: z.number().int().min(0),
  tempoPreparo: z.number().int().min(1, 'Tempo mínimo é 1 minuto'),
});

type ProdutoForm = {
  nome: string;
  descricao: string;
  preco: string;
  categoria: string;
  midia: string;
  disponivel: boolean;
  ordem: string;
  tempoPreparo: string;
};

type ProdutoErrors = Partial<Record<keyof ProdutoForm, string>>;

const CATEGORIAS = ['Lanche', 'Pizza', 'Bebida', 'Sobremesa', 'Combo'];

const FORM_VAZIO: ProdutoForm = {
  nome: '',
  descricao: '',
  preco: '',
  categoria: '',
  midia: '',
  disponivel: true,
  ordem: '0',
  tempoPreparo: '15',
};

export default function FormularioProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const { showSuccess, showError } = useToast();
  const isEdicao = params?.id && params.id !== 'novo';

  const [form, setForm] = useState<ProdutoForm>(FORM_VAZIO);
  const [errors, setErrors] = useState<ProdutoErrors>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(!!isEdicao);

  // Carrega produto para edição
  useEffect(() => {
    if (!isEdicao) return;
    const carregar = async () => {
      try {
        const produto = await api.produtos.buscarPorId(params.id as string);
        setForm({
          nome: produto.nome,
          descricao: produto.descricao,
          preco: String(produto.preco),
          categoria: produto.categoria,
          midia: produto.midia || produto.imagemUrl || '',
          disponivel: produto.disponivel !== false,
          ordem: String(produto.ordem || 0),
          tempoPreparo: String(produto.tempoPreparo || 15),
        });
      } catch (err) {
        showError('Erro ao carregar produto', err instanceof Error ? err.message : 'Tente novamente');
        router.push('/admin/produtos');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [isEdicao, params?.id]);

  const validar = (): boolean => {
    const result = produtoSchema.safeParse({
      nome: form.nome,
      descricao: form.descricao,
      preco: parseFloat(form.preco),
      categoria: form.categoria,
      midia: form.midia || undefined,
      disponivel: form.disponivel,
      ordem: parseInt(form.ordem) || 0,
      tempoPreparo: parseInt(form.tempoPreparo) || 0,
    });
    if (!result.success) {
      const erros: ProdutoErrors = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as keyof ProdutoForm;
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
    const payload = {
      nome: form.nome,
      descricao: form.descricao,
      preco: parseFloat(form.preco),
      categoria: form.categoria,
      midia: form.midia || undefined,
      disponivel: form.disponivel,
      ordem: parseInt(form.ordem) || 0,
      tempoPreparo: parseInt(form.tempoPreparo) || 15,
    };
    try {
      if (isEdicao) {
        await api.produtos.atualizar(params.id as string, payload);
        showSuccess('Produto atualizado com sucesso!');
      } else {
        await api.produtos.criar(payload);
        showSuccess('Produto cadastrado com sucesso!');
      }
      router.refresh();
      router.push('/admin/produtos');
    } catch (err) {
      showError('Erro ao salvar produto', err instanceof Error ? err.message : 'Tente novamente');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent" />
          <p className="text-sm text-[var(--color-text-secondary)]">Carregando produto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/admin/produtos')}
          className="rounded-xl p-2 text-[var(--color-text-tertiary)] transition-all hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]"
          aria-label="Voltar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="font-brand text-3xl font-black uppercase text-[var(--color-text-primary)]">
            {isEdicao ? 'Editar Produto' : 'Novo Produto'}
          </h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            {isEdicao ? 'Atualize as informações do produto' : 'Preencha os dados do novo produto'}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="space-y-5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <Input
          label="Nome do produto *"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          error={errors.nome}
          placeholder="Ex: X-Burguer Especial"
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-[var(--color-text-primary)]">Descrição *</label>
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descreva o produto com detalhes..."
            rows={3}
            className={`w-full resize-none rounded-xl border bg-[var(--color-surface-input)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] placeholder:opacity-90 outline-none transition-colors focus:border-[var(--color-accent)] ${
              errors.descricao ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
            }`}
          />
          {errors.descricao && <span className="text-xs font-semibold text-[var(--color-danger-text)]">{errors.descricao}</span>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Preço (R$) *"
            type="number"
            min="0"
            step="0.01"
            value={form.preco}
            onChange={(e) => setForm({ ...form, preco: e.target.value })}
            error={errors.preco}
            placeholder="0.00"
          />
          <Input
            label="Tempo de preparo (min) *"
            type="number"
            min="1"
            step="1"
            value={form.tempoPreparo}
            onChange={(e) => setForm({ ...form, tempoPreparo: e.target.value })}
            error={errors.tempoPreparo}
            placeholder="15"
            hint="Tempo médio de preparo em minutos"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ordem de exibição"
            type="number"
            min="0"
            value={form.ordem}
            onChange={(e) => setForm({ ...form, ordem: e.target.value })}
            error={errors.ordem}
            placeholder="0"
          />
        </div>

        {/* Categoria */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-[var(--color-text-primary)]">Categoria *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm({ ...form, categoria: cat })}
                className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
                  form.categoria === cat
                    ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {errors.categoria && <span className="text-xs font-semibold text-[var(--color-danger-text)]">{errors.categoria}</span>}
        </div>

        {/* URL da mídia */}
        <Input
          label="URL da imagem/vídeo"
          type="url"
          value={form.midia}
          onChange={(e) => setForm({ ...form, midia: e.target.value })}
          error={errors.midia}
          placeholder="https://exemplo.com/imagem.jpg"
          hint="URL da foto ou vídeo do produto (opcional)"
        />

        {/* Preview da imagem */}
        {form.midia && !errors.midia && (
          <div className="aspect-video overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.midia}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Disponível */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.disponivel}
            onChange={(e) => setForm({ ...form, disponivel: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Produto disponível no cardápio</span>
        </label>

        {/* Ações */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            size="md"
            className="flex-1"
            onClick={() => router.push('/admin/produtos')}
          >
            Cancelar
          </Button>
          <Button size="md" className="flex-1" onClick={handleSalvar} loading={salvando}>
            {isEdicao ? 'Salvar alterações' : 'Cadastrar produto'}
          </Button>
        </div>
      </div>
    </div>
  );
}
