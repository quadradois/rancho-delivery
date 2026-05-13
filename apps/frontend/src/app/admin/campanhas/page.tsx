'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import api, { CampanhaMarketing } from '@/lib/api';
import { CrmButton, CrmCard } from '@/components/crm';

const STATUS_LABEL: Record<CampanhaMarketing['status'], string> = {
  RASCUNHO: 'Rascunho',
  AGENDADA: 'Agendada',
  ENVIANDO: 'Enviando',
  CONCLUIDA: 'Concluída',
  FALHA: 'Falha',
  DESATIVADA: 'Desativada',
};

const STATUS_CLASS: Record<CampanhaMarketing['status'], string> = {
  RASCUNHO: 'bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]',
  AGENDADA: 'bg-[var(--color-info-muted)] text-[var(--color-info-text)]',
  ENVIANDO: 'bg-[var(--color-info-muted)] text-[var(--color-info-text)]',
  CONCLUIDA: 'bg-[var(--color-success-muted)] text-[var(--color-success-text)]',
  FALHA: 'bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]',
  DESATIVADA: 'bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)]',
};

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState<CampanhaMarketing[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    const data = await api.adminMineracao.listarCampanhas(100);
    setCampanhas(data);
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function disparar(id: string) {
    setLoadingId(id);
    setErro('');
    try {
      await api.adminMineracao.dispararCampanha(id);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao disparar campanha');
    } finally {
      setLoadingId(null);
    }
  }

  async function alternarStatus(campanha: CampanhaMarketing) {
    const status = campanha.status === 'DESATIVADA' ? 'RASCUNHO' : 'DESATIVADA';
    setLoadingId(campanha.id);
    setErro('');
    try {
      await api.adminMineracao.atualizarStatusCampanha(campanha.id, status);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao atualizar campanha');
    } finally {
      setLoadingId(null);
    }
  }

  async function excluir(campanha: CampanhaMarketing) {
    const confirmado = window.confirm(`Apagar a campanha "${campanha.nome}"? Os leads não serão apagados.`);
    if (!confirmado) return;
    setLoadingId(campanha.id);
    setErro('');
    try {
      await api.adminMineracao.excluirCampanha(campanha.id);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao apagar campanha');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="p-5 md:p-6 space-y-4">
      <div>
        <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Campanhas</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Gestão e disparo das campanhas de leads de mineração.</p>
      </div>

      {erro && (
        <CrmCard className="border-[var(--color-danger)] p-3 text-sm text-[var(--color-danger-text)]">
          {erro}
        </CrmCard>
      )}

      <CrmCard className="p-4 md:p-5">
        <div className="space-y-2">
          {campanhas.map((c) => (
            <div key={c.id} className="rounded-md border border-[var(--color-border)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-text-primary)]">{c.nome}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Criada em {new Date(c.criadoEm).toLocaleString('pt-BR')}</p>
                  {c.enviadaEm && <p className="text-xs text-[var(--color-text-secondary)]">Enviada em: {new Date(c.enviadaEm).toLocaleString('pt-BR')}</p>}
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-2">{c.mensagem}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Destinatários: {c.destinatarios?.length || 0}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <Link href={`/admin/campanhas/${c.id}`} className="inline-flex">
                    <CrmButton size="sm" variant="ghost">Abrir</CrmButton>
                  </Link>
                  <CrmButton size="sm" onClick={() => void disparar(c.id)} disabled={loadingId === c.id || c.status === 'ENVIANDO' || c.status === 'DESATIVADA'}>
                    {loadingId === c.id ? 'Processando...' : 'Disparar'}
                  </CrmButton>
                  <CrmButton size="sm" variant="ghost" onClick={() => void alternarStatus(c)} disabled={loadingId === c.id || c.status === 'ENVIANDO'}>
                    {c.status === 'DESATIVADA' ? 'Reativar' : 'Desativar'}
                  </CrmButton>
                  <CrmButton size="sm" variant="danger" onClick={() => void excluir(c)} disabled={loadingId === c.id || c.status === 'ENVIANDO'}>
                    Apagar
                  </CrmButton>
                </div>
              </div>
            </div>
          ))}
          {campanhas.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">Nenhuma campanha criada.</p>}
        </div>
      </CrmCard>
    </div>
  );
}
