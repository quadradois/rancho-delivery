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
});

type ProdutoForm = {
  nome: string;
  descricao: string;
  preco: string;
  categoria: string;
  midia: string;
  disponivel: boolean;
  ordem: string;
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
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const payload = {
      nome: form.nome,
      descricao: form.descricao,
      preco: parseFloat(form.preco),
      categoria: form.categoria,
      midia: form.midia || undefined,
      disponivel: form.disponivel,
      ordem: parseInt(form.ordem) || 0,
    };
    try {
      if (isEdicao) {
        await fetch(`${baseUrl}/api/produtos/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Produto atualizado com sucesso!');
      } else {
        await fetch(`${baseUrl}/api/produtos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showSuccess('Produto cadastrado com sucesso!');
      }
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
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">Carregando produto...</p>
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
          className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-all"
          aria-label="Voltar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="font-brand text-3xl font-black uppercase text-neutral-900">
            {isEdicao ? 'Editar Produto' : 'Novo Produto'}
          </h1>
          <p className="text-neutral-500 mt-1">
            {isEdicao ? 'Atualize as informações do produto' : 'Preencha os dados do novo produto'}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <Input
          label="Nome do produto *"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          error={errors.nome}
          placeholder="Ex: X-Burguer Especial"
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-neutral-700">Descrição *</label>
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descreva o produto com detalhes..."
            rows={3}
            className={`w-full px-4 py-3 text-sm border rounded-xl outline-none resize-none transition-colors focus:border-red-500 ${
              errors.descricao ? 'border-red-400' : 'border-neutral-200'
            }`}
          />
          {errors.descricao && <span className="text-xs text-red-500 font-semibold">{errors.descricao}</span>}
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
          <label className="text-sm font-semibold text-neutral-700">Categoria *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm({ ...form, categoria: cat })}
                className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
                  form.categoria === cat
                    ? 'bg-red-500 text-white'
                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {errors.categoria && <span className="text-xs text-red-500 font-semibold">{errors.categoria}</span>}
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
          <div className="rounded-xl overflow-hidden border border-neutral-200 aspect-video bg-neutral-100">
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
            className="w-4 h-4 accent-red-500"
          />
          <span className="text-sm font-semibold text-neutral-700">Produto disponível no cardápio</span>
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
