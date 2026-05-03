'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { ClienteResumoAdmin, MensagemClienteAdmin } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import { CrmButton, CrmCard } from '@/components/crm';

interface ClienteLeadPageProps {
  params: { telefone: string };
}

export default function ClienteLeadPage({ params }: ClienteLeadPageProps) {
  const telefone = useMemo(() => decodeURIComponent(params.telefone || ''), [params.telefone]);
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [resumo, setResumo] = useState<ClienteResumoAdmin | null>(null);
  const [mensagens, setMensagens] = useState<MensagemClienteAdmin[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const carregar = useCallback(async () => {
    if (!telefone) return;
    setLoading(true);
    try {
      const [r, m] = await Promise.all([
        api.adminClientes.obterResumo(telefone),
        api.adminClientes.listarMensagens(telefone, false),
      ]);
      setResumo(r);
      setMensagens(m);
    } catch (error: any) {
      showError('Falha ao carregar lead', error?.message || 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [telefone, showError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const enviarMensagem = useCallback(async () => {
    const texto = novaMensagem.trim();
    if (!texto || !telefone) return;

    setSending(true);
    try {
      const enviada = await api.adminClientes.enviarMensagem(telefone, texto);
      setMensagens((prev) => [enviada, ...prev]);
      setNovaMensagem('');
      showSuccess('Mensagem enviada', 'Cliente acionado no WhatsApp.');
    } catch (error: any) {
      showError('Falha ao enviar mensagem', error?.message || 'Tente novamente.');
    } finally {
      setSending(false);
    }
  }, [novaMensagem, telefone, showError, showSuccess]);

  return (
    <div className="p-5 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Gestão do Lead</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Visão completa do cliente e ações de relacionamento</p>
        </div>
        <Link
          href="/admin/clientes"
          className="h-9 inline-flex items-center rounded-md border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text-secondary)]"
        >
          Voltar para clientes
        </Link>
      </div>

      {loading ? (
        <CrmCard className="p-4 text-sm text-[var(--color-text-secondary)]">Carregando lead...</CrmCard>
      ) : !resumo ? (
        <CrmCard className="p-4 text-sm text-[var(--color-text-secondary)]">Lead não encontrado.</CrmCard>
      ) : (
        <>
          <CrmCard className="p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)]">Cliente</p>
                <p className="text-base font-semibold text-[var(--color-text-primary)]">{resumo.nome}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">{resumo.telefone}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">{resumo.bairro}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)]">Pedidos</p>
                <p className="text-xl font-bold">{resumo.totalPedidos}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)]">Total gasto</p>
                <p className="text-xl font-bold">{formatCurrency(resumo.valorGasto)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)]">Dias sem pedir</p>
                <p className="text-xl font-bold">{resumo.diasSemPedir ?? '—'}</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-[var(--color-text-secondary)] grid gap-1">
              <p>Último pedido: {resumo.ultimoPedido ? new Date(resumo.ultimoPedido).toLocaleString('pt-BR') : '—'}</p>
              <p>Primeiro pedido: {resumo.primeiroPedido ? new Date(resumo.primeiroPedido).toLocaleString('pt-BR') : '—'}</p>
              <p>Dia favorito: {resumo.diaFavorito || '—'}</p>
              <p>Top produtos: {resumo.topProdutos.length ? resumo.topProdutos.map((p) => `${p.nome} (${p.quantidade})`).join(' · ') : '—'}</p>
              <p>Status cadastro: {resumo.ativo ? 'Ativo' : 'Desativado'}</p>
              <p>Blacklist: {resumo.emListaNegra ? `Sim (Nível ${resumo.nivelListaNegra || 1})` : 'Não'}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <CrmButton
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await api.adminClientes.atualizarAtivo(resumo.telefone, !resumo.ativo);
                    showSuccess('Status atualizado', `${resumo.nome} agora está ${resumo.ativo ? 'desativado' : 'ativo'}.`);
                    void carregar();
                  } catch (error: any) {
                    showError('Falha ao atualizar status', error?.message || 'Tente novamente.');
                  }
                }}
              >
                {resumo.ativo ? 'Desativar cliente' : 'Reativar cliente'}
              </CrmButton>
              {resumo.emListaNegra ? (
                <CrmButton
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await api.adminClientes.removerListaNegra(resumo.telefone);
                      showSuccess('Blacklist atualizada', `${resumo.nome} removido da blacklist.`);
                      void carregar();
                    } catch (error: any) {
                      showError('Falha ao remover blacklist', error?.message || 'Tente novamente.');
                    }
                  }}
                >
                  Remover blacklist
                </CrmButton>
              ) : (
                <CrmButton
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    const motivo = window.prompt(`Motivo da blacklist para ${resumo.nome}:`, 'Bloqueio manual pelo atendente');
                    if (!motivo) return;
                    try {
                      await api.adminClientes.adicionarListaNegra(resumo.telefone, motivo);
                      showSuccess('Blacklist atualizada', `${resumo.nome} foi adicionado à blacklist.`);
                      void carregar();
                    } catch (error: any) {
                      showError('Falha ao adicionar blacklist', error?.message || 'Tente novamente.');
                    }
                  }}
                >
                  Adicionar blacklist
                </CrmButton>
              )}
              <CrmButton
                size="sm"
                variant="danger"
                onClick={async () => {
                  const ok = window.confirm(`Excluir cliente ${resumo.nome}? Esta ação só é permitida para cliente sem pedidos.`);
                  if (!ok) return;
                  try {
                    await api.adminClientes.excluir(resumo.telefone);
                    showSuccess('Cliente excluído', `${resumo.nome} removido do cadastro.`);
                    router.push('/admin/clientes');
                  } catch (error: any) {
                    showError('Falha ao excluir cliente', error?.message || 'Se já tem pedidos, desative em vez de excluir.');
                  }
                }}
              >
                Excluir cliente
              </CrmButton>
            </div>
          </CrmCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <CrmCard className="p-4 space-y-3">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Ação de relacionamento</h2>
              <textarea
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                placeholder="Digite a mensagem para enviar no WhatsApp"
                rows={5}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-2">
                <CrmButton size="sm" onClick={() => void enviarMensagem()} disabled={sending || !novaMensagem.trim()}>
                  {sending ? 'Enviando...' : 'Enviar WhatsApp'}
                </CrmButton>
                <CrmButton size="sm" variant="ghost" onClick={() => void carregar()}>
                  Atualizar histórico
                </CrmButton>
              </div>
            </CrmCard>

            <CrmCard className="p-4 space-y-3">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Histórico de mensagens</h2>
              {mensagens.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">Nenhuma mensagem registrada.</p>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                  {mensagens.map((msg) => (
                    <div key={msg.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                      <p className="text-xs text-[var(--color-text-tertiary)]">{msg.origem} · {new Date(msg.criadoEm).toLocaleString('pt-BR')}</p>
                      <p className="text-sm text-[var(--color-text-primary)] mt-1">{msg.texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </CrmCard>
          </div>
        </>
      )}
    </div>
  );
}
