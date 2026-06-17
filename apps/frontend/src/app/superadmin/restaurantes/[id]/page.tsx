'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  superadminApi,
  type RestauranteResumo,
  type AssinaturaInfo,
  type Plano,
  type EstadoConta,
} from '@/lib/superadmin-client';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, Field, Select, TextInput, ESTADO_COR, ESTADOS } from '../../components/ui';

export default function RestauranteDetalhePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { showError, showSuccess } = useToast();

  const [restaurante, setRestaurante] = useState<RestauranteResumo | null>(null);
  const [assinatura, setAssinatura] = useState<AssinaturaInfo | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);

  // Form dados gerais
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [dominio, setDominio] = useState('');
  const [salvandoDados, setSalvandoDados] = useState(false);

  // Form assinatura
  const [estado, setEstado] = useState<EstadoConta>('TESTE');
  const [planoId, setPlanoId] = useState<string>('');
  const [salvandoAssin, setSalvandoAssin] = useState(false);

  // Cobrança (link Mercado Pago)
  const [emailCobranca, setEmailCobranca] = useState('');
  const [gerandoCobranca, setGerandoCobranca] = useState(false);
  const [linkCobranca, setLinkCobranca] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [r, a, p] = await Promise.all([
        superadminApi.obterRestaurante(id),
        superadminApi.obterAssinatura(id),
        superadminApi.listarPlanos(),
      ]);
      setRestaurante(r);
      setNome(r.nome);
      setSlug(r.slug);
      setDominio(r.dominio ?? '');
      setAssinatura(a);
      setEstado(a?.estado ?? 'TESTE');
      setPlanoId(a?.plano?.id ?? '');
      setPlanos(p);
    } catch (err) {
      showError('Falha ao carregar restaurante', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const salvarDados = async () => {
    setSalvandoDados(true);
    try {
      const r = await superadminApi.atualizarRestaurante(id, {
        nome: nome.trim(),
        slug: slug.trim(),
        dominio: dominio.trim() || null,
      });
      setRestaurante(r);
      showSuccess('Dados atualizados');
    } catch (err) {
      showError('Falha ao salvar', err instanceof Error ? err.message : undefined);
    } finally {
      setSalvandoDados(false);
    }
  };

  const alternarAtivo = async () => {
    if (!restaurante) return;
    const novoAtivo = !restaurante.ativo;
    try {
      const r = await superadminApi.atualizarRestaurante(id, { ativo: novoAtivo });
      setRestaurante(r);
      showSuccess(novoAtivo ? 'Restaurante reativado' : 'Restaurante suspenso');
    } catch (err) {
      showError('Falha ao alterar status', err instanceof Error ? err.message : undefined);
    }
  };

  const salvarAssinatura = async () => {
    setSalvandoAssin(true);
    try {
      const a = await superadminApi.definirAssinatura(id, { estado, planoId: planoId || null });
      setAssinatura(a);
      showSuccess('Assinatura atualizada');
    } catch (err) {
      showError('Falha ao salvar assinatura', err instanceof Error ? err.message : undefined);
    } finally {
      setSalvandoAssin(false);
    }
  };

  const gerarCobranca = async () => {
    setGerandoCobranca(true);
    setLinkCobranca(null);
    try {
      const { url } = await superadminApi.gerarCobranca(id, { email: emailCobranca.trim() || undefined });
      setLinkCobranca(url);
      showSuccess('Link de cobrança gerado');
    } catch (err) {
      showError('Falha ao gerar cobrança', err instanceof Error ? err.message : undefined);
    } finally {
      setGerandoCobranca(false);
    }
  };

  const copiarLink = async () => {
    if (!linkCobranca) return;
    try {
      await navigator.clipboard.writeText(linkCobranca);
      showSuccess('Link copiado');
    } catch {
      showError('Não foi possível copiar');
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Carregando…</p>;
  }
  if (!restaurante) {
    return (
      <div>
        <Link href="/superadmin" className="text-sm" style={{ color: 'var(--color-accent)' }}>
          ← Voltar
        </Link>
        <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
          Restaurante não encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <Link href="/superadmin" className="text-sm" style={{ color: 'var(--color-accent)' }}>
        ← Restaurantes
      </Link>

      <header className="mb-6 mt-3 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{restaurante.nome}</h1>
        {!restaurante.ativo && <Badge texto="suspenso" cor="var(--color-danger)" />}
      </header>

      <div className="grid gap-4">
        <Card>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Dados
          </h2>
          <div className="grid gap-3">
            <Field label="Nome">
              <TextInput value={nome} onChange={(e) => setNome(e.target.value)} />
            </Field>
            <Field label="Slug">
              <TextInput value={slug} onChange={(e) => setSlug(e.target.value)} />
            </Field>
            <Field label="Domínio próprio">
              <TextInput value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="(nenhum)" />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={salvarDados} disabled={salvandoDados || !nome.trim() || !slug.trim()}>
              {salvandoDados ? 'Salvando…' : 'Salvar dados'}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Assinatura
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Plano">
              <Select value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
                <option value="">Grátis (sem plano)</option>
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estado da conta">
              <Select value={estado} onChange={(e) => setEstado(e.target.value as EstadoConta)}>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Atual: {assinatura ? assinatura.estado : 'Grátis'}
            </span>
            <Button onClick={salvarAssinatura} disabled={salvandoAssin}>
              {salvandoAssin ? 'Salvando…' : 'Salvar assinatura'}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Cobrança
          </h2>
          <p className="mb-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Gera o link de assinatura no Mercado Pago (usa o preço do plano acima). Envie pro dono autorizar — o
            pagamento atualiza o estado da conta sozinho.
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="E-mail do dono (opcional)">
                <TextInput
                  type="email"
                  value={emailCobranca}
                  onChange={(e) => setEmailCobranca(e.target.value)}
                  placeholder="dono@restaurante.com"
                />
              </Field>
            </div>
            <Button onClick={gerarCobranca} disabled={gerandoCobranca}>
              {gerandoCobranca ? 'Gerando…' : 'Gerar link'}
            </Button>
          </div>
          {linkCobranca && (
            <div
              className="mt-4 flex items-center gap-2 rounded-lg border p-3"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-input)' }}
            >
              <a
                href={linkCobranca}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate text-xs"
                style={{ color: 'var(--color-accent)' }}
              >
                {linkCobranca}
              </a>
              <Button variant="ghost" onClick={copiarLink}>
                Copiar
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Status da conta
          </h2>
          <p className="mb-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {restaurante.ativo
              ? 'A conta está ativa — o restaurante acessa o painel e o app.'
              : 'A conta está suspensa — o login e o acesso por domínio ficam bloqueados.'}
          </p>
          <Button variant={restaurante.ativo ? 'danger' : 'primary'} onClick={alternarAtivo}>
            {restaurante.ativo ? 'Suspender restaurante' : 'Reativar restaurante'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
