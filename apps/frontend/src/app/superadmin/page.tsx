'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { superadminApi, type RestauranteResumo } from '@/lib/superadmin-client';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Drawer, Field, TextInput, ESTADO_COR } from './components/ui';

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function NovoRestauranteModal({ onClose, onCriado }: { onClose: () => void; onCriado: () => void }) {
  const { showError, showSuccess } = useToast();
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [dominio, setDominio] = useState('');
  const [salvando, setSalvando] = useState(false);

  const slugEfetivo = slugTouched ? slug : slugify(nome);

  const salvar = async () => {
    setSalvando(true);
    try {
      await superadminApi.criarRestaurante({
        nome: nome.trim(),
        slug: slugEfetivo,
        dominio: dominio.trim() || null,
      });
      showSuccess('Restaurante cadastrado');
      onCriado();
      onClose();
    } catch (err) {
      showError('Falha ao cadastrar', err instanceof Error ? err.message : undefined);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Novo restaurante"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || !nome.trim() || !slugEfetivo}>{salvando ? 'Salvando…' : 'Cadastrar'}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nome">
          <TextInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Cantina da Praça" />
        </Field>
        <Field label="Slug (identificador único)">
          <TextInput
            value={slugEfetivo}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="cantina-da-praca"
          />
        </Field>
        <Field label="Domínio próprio (opcional)">
          <TextInput value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="app.cantina.com.br" />
        </Field>
      </div>
    </Drawer>
  );
}

export default function RestaurantesPage() {
  const { showError } = useToast();
  const [restaurantes, setRestaurantes] = useState<RestauranteResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoAberto, setNovoAberto] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setRestaurantes(await superadminApi.listarRestaurantes());
    } catch (err) {
      showError('Falha ao carregar restaurantes', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="w-full">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Restaurantes</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {loading ? 'Carregando…' : `${restaurantes.length} restaurante(s) na plataforma`}
          </p>
        </div>
        <Button onClick={() => setNovoAberto(true)}>Novo restaurante</Button>
      </header>

      {!loading && restaurantes.length === 0 && (
        <div
          className="rounded-xl border p-10 text-center text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Nenhum restaurante cadastrado ainda.
        </div>
      )}

      <div className="grid gap-3">
        {restaurantes.map((r) => (
          <Link
            key={r.id}
            href={`/superadmin/restaurantes/${r.id}`}
            className="flex items-center justify-between rounded-xl border p-4 transition hover:border-[var(--color-border-strong)]"
            style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{r.nome}</span>
                {!r.ativo && <Badge texto="suspenso" cor="var(--color-danger)" />}
              </div>
              <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {r.slug}
                {r.dominio ? ` · ${r.dominio}` : ''}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {r.assinatura ? (
                <>
                  {r.assinatura.plano && <Badge texto={r.assinatura.plano} cor="var(--color-accent)" />}
                  <Badge texto={r.assinatura.estado} cor={ESTADO_COR[r.assinatura.estado]} />
                </>
              ) : (
                <Badge texto="Grátis" cor="var(--color-text-secondary)" />
              )}
            </div>
          </Link>
        ))}
      </div>

      {novoAberto && <NovoRestauranteModal onClose={() => setNovoAberto(false)} onCriado={carregar} />}
    </div>
  );
}
