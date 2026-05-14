'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import api, { CampanhaMarketing } from '@/lib/api';
import { CrmButton, CrmCard } from '@/components/crm';
import { useCockpitSocket, type CampanhaEnvioProgresso } from '@/hooks/useCockpitSocket';

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

const ENVIO_CLASS: Record<string, string> = {
  PENDENTE: 'bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]',
  ENVIADO: 'bg-[var(--color-success-muted)] text-[var(--color-success-text)]',
  FALHA: 'bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]',
  IGNORADO_CONVERTIDO: 'bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)]',
};

const ENVIO_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  ENVIADO: 'Enviado',
  FALHA: 'Falha',
  IGNORADO_CONVERTIDO: 'Já é cliente',
};

const MOTIVO_FALHA_LABEL: Record<string, string> = {
  NUMERO_INVALIDO: 'Número inválido (permanente)',
  INSTANCIA_NAO_AUTORIZADA: 'WhatsApp não autorizado (permanente)',
  INSTANCIA_DESCONECTADA: 'WhatsApp desconectado',
  RATE_LIMIT: 'Limite de envios atingido',
  REDE: 'Falha de rede',
  WHATSAPP_ENVIO_FALHOU: 'Falha no envio',
  LEAD_JA_E_CLIENTE: 'Lead já é cliente',
};

function motivoLabel(motivo: string | null | undefined) {
  if (!motivo) return null;
  if (MOTIVO_FALHA_LABEL[motivo]) return MOTIVO_FALHA_LABEL[motivo];
  if (motivo.startsWith('HTTP_')) return `Erro HTTP ${motivo.replace('HTTP_', '')}`;
  if (motivo.startsWith('EVOLUTION_')) return `Erro servidor WhatsApp ${motivo.replace('EVOLUTION_', '')}`;
  if (motivo.startsWith('CLIENTE_')) return `Erro cliente ${motivo.replace('CLIENTE_', '')}`;
  return motivo;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function envioClass(status: string) {
  return ENVIO_CLASS[status] || 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]';
}

export default function CampanhaDetalhePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [campanha, setCampanha] = useState<CampanhaMarketing | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [erro, setErro] = useState('');
  const [envioProgresso, setEnvioProgresso] = useState<CampanhaEnvioProgresso | null>(null);
  const [mensagemEditada, setMensagemEditada] = useState('');
  const [editandoMensagem, setEditandoMensagem] = useState(false);
  const [salvandoMensagem, setSalvandoMensagem] = useState(false);
  const [iaAberta, setIaAberta] = useState(false);
  const [iaIntencao, setIaIntencao] = useState('');
  const [iaGerando, setIaGerando] = useState(false);
  const [iaVariacoes, setIaVariacoes] = useState<Array<{ titulo: string; mensagem: string }>>([]);
  const [iaErro, setIaErro] = useState('');
  const [agendarAberto, setAgendarAberto] = useState(false);
  const [agendarData, setAgendarData] = useState('');
  const [agendarHora, setAgendarHora] = useState('14:00');
  const [addLeadAberto, setAddLeadAberto] = useState(false);
  const [addLeadTelefone, setAddLeadTelefone] = useState('');
  const [addLeadNome, setAddLeadNome] = useState('');
  const [addLeadBairro, setAddLeadBairro] = useState('');
  const [addLeadSalvando, setAddLeadSalvando] = useState(false);
  const [editLead, setEditLead] = useState<{ leadId: string; nome: string; telefone: string; bairro: string; endereco: string; notas: string; status: string } | null>(null);
  const [editLeadSalvando, setEditLeadSalvando] = useState(false);

  useCockpitSocket({
    onCampanhaEnvioProgresso: (p) => {
      if (p.campanhaId === params.id) setEnvioProgresso(p);
    },
    onCampanhaEnvioConcluido: (p) => {
      if (p.campanhaId === params.id) {
        setEnvioProgresso(null);
        void carregar();
      }
    },
  });

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const data = await api.adminMineracao.obterCampanha(params.id);
      setCampanha(data);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao carregar campanha');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [params.id]);

  const metricas = useMemo(() => {
    const destinatarios = campanha?.destinatarios || [];
    return {
      total: destinatarios.length,
      pendentes: destinatarios.filter((d) => d.statusEnvio === 'PENDENTE').length,
      enviados: destinatarios.filter((d) => d.statusEnvio === 'ENVIADO').length,
      falhas: destinatarios.filter((d) => d.statusEnvio === 'FALHA').length,
      convertidos: destinatarios.filter((d) => d.statusEnvio === 'IGNORADO_CONVERTIDO').length,
    };
  }, [campanha]);

  async function disparar() {
    if (!campanha) return;
    setLoadingAction(true);
    setErro('');
    try {
      await api.adminMineracao.dispararCampanha(campanha.id);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao disparar campanha');
    } finally {
      setLoadingAction(false);
    }
  }

  async function alternarStatus() {
    if (!campanha) return;
    setLoadingAction(true);
    setErro('');
    try {
      await api.adminMineracao.atualizarStatusCampanha(campanha.id, campanha.status === 'DESATIVADA' ? 'RASCUNHO' : 'DESATIVADA');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao atualizar campanha');
    } finally {
      setLoadingAction(false);
    }
  }

  async function excluir() {
    if (!campanha) return;
    const confirmado = window.confirm(`Apagar a campanha "${campanha.nome}"? Os leads não serão apagados.`);
    if (!confirmado) return;
    setLoadingAction(true);
    setErro('');
    try {
      await api.adminMineracao.excluirCampanha(campanha.id);
      router.push('/admin/campanhas');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao apagar campanha');
    } finally {
      setLoadingAction(false);
    }
  }

  function abrirEdicao() {
    if (!campanha) return;
    setMensagemEditada(campanha.mensagem);
    setEditandoMensagem(true);
  }

  async function salvarMensagem() {
    if (!campanha) return;
    if (!mensagemEditada.trim()) {
      setErro('A mensagem não pode ficar vazia');
      return;
    }
    setSalvandoMensagem(true);
    setErro('');
    try {
      await api.adminMineracao.atualizarMensagemCampanha(campanha.id, mensagemEditada);
      setEditandoMensagem(false);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao salvar mensagem');
    } finally {
      setSalvandoMensagem(false);
    }
  }

  async function gerarComIA() {
    if (!iaIntencao.trim()) {
      setIaErro('Descreva a intenção da campanha primeiro');
      return;
    }
    setIaGerando(true);
    setIaErro('');
    setIaVariacoes([]);
    try {
      const { variacoes } = await api.adminMineracao.gerarVariacoesMensagem({ intencao: iaIntencao });
      setIaVariacoes(variacoes);
    } catch (error) {
      setIaErro(error instanceof Error ? error.message : 'Erro ao gerar variações');
    } finally {
      setIaGerando(false);
    }
  }

  function escolherVariacao(mensagem: string) {
    setMensagemEditada(mensagem);
    setEditandoMensagem(true);
    setIaAberta(false);
    setIaVariacoes([]);
  }

  function presetAmanha14h(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
    return d;
  }

  function presetDaquiUmaHora(): Date {
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  function abrirAgendamento() {
    const inicial = presetAmanha14h();
    setAgendarData(inicial.toISOString().slice(0, 10));
    setAgendarHora('14:00');
    setAgendarAberto(true);
  }

  async function agendarComData(data: Date) {
    if (!campanha) return;
    setLoadingAction(true);
    setErro('');
    try {
      await api.adminMineracao.agendarCampanha(campanha.id, data.toISOString());
      setAgendarAberto(false);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao agendar campanha');
    } finally {
      setLoadingAction(false);
    }
  }

  async function agendarCustom() {
    if (!agendarData) {
      setErro('Selecione uma data');
      return;
    }
    const [hh, mm] = agendarHora.split(':');
    const data = new Date(`${agendarData}T${hh.padStart(2, '0')}:${(mm || '00').padStart(2, '0')}:00`);
    if (Number.isNaN(data.getTime())) {
      setErro('Data ou hora inválida');
      return;
    }
    await agendarComData(data);
  }

  async function reenviarFalhas() {
    if (!campanha) return;
    const confirma = window.confirm('Reenviar mensagens para os destinatários que falharam por motivo transitório (rede, instância desconectada, rate limit)?');
    if (!confirma) return;
    setLoadingAction(true);
    setErro('');
    try {
      const r = await api.adminMineracao.reenviarFalhasCampanha(campanha.id);
      if (r.reenviados === 0) {
        setErro(r.total === 0 ? 'Nenhuma falha encontrada' : 'Nenhuma falha elegível para reenvio (motivos permanentes ou máximo de tentativas atingido)');
      }
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao reenviar falhas');
    } finally {
      setLoadingAction(false);
    }
  }

  async function removerDestinatario(destinatarioId: string, nome: string | null) {
    if (!campanha) return;
    const confirma = window.confirm(`Remover ${nome || 'este destinatário'} da campanha? O lead continua no sistema, só sai desta campanha.`);
    if (!confirma) return;
    setLoadingAction(true);
    setErro('');
    try {
      await api.adminMineracao.removerDestinatarioCampanha(campanha.id, destinatarioId);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao remover destinatário');
    } finally {
      setLoadingAction(false);
    }
  }

  async function adicionarLeadManual() {
    if (!campanha) return;
    if (!addLeadTelefone.trim()) {
      setErro('Telefone é obrigatório');
      return;
    }
    setAddLeadSalvando(true);
    setErro('');
    try {
      const r = await api.adminMineracao.adicionarLeadManualCampanha(campanha.id, {
        telefone: addLeadTelefone.trim(),
        nome: addLeadNome.trim() || undefined,
        bairro: addLeadBairro.trim() || undefined,
      });
      if (r.ja_existia) {
        setErro('Esse lead já está na campanha');
      } else {
        setAddLeadAberto(false);
        setAddLeadTelefone('');
        setAddLeadNome('');
        setAddLeadBairro('');
        await carregar();
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao adicionar lead');
    } finally {
      setAddLeadSalvando(false);
    }
  }

  function abrirEdicaoLead(destinatario: NonNullable<CampanhaMarketing['destinatarios']>[number]) {
    const lead = destinatario.lead;
    setEditLead({
      leadId: lead?.id ?? '',
      nome: lead?.nome ?? '',
      telefone: lead?.telefone ?? '',
      bairro: lead?.bairro ?? '',
      endereco: (lead as any)?.endereco ?? '',
      notas: (lead as any)?.notas ?? '',
      status: (lead as any)?.status ?? 'ATIVO',
    });
  }

  async function salvarEdicaoLead() {
    if (!editLead || !campanha) return;
    setEditLeadSalvando(true);
    setErro('');
    try {
      await api.adminMineracao.atualizarLead(editLead.leadId, {
        nome: editLead.nome || null,
        telefone: editLead.telefone || undefined,
        bairro: editLead.bairro || null,
        endereco: editLead.endereco || null,
        notas: editLead.notas || null,
        status: editLead.status,
      });
      setEditLead(null);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao salvar lead');
    } finally {
      setEditLeadSalvando(false);
    }
  }

  async function cancelarAgendamento() {
    if (!campanha) return;
    setLoadingAction(true);
    setErro('');
    try {
      await api.adminMineracao.cancelarAgendamentoCampanha(campanha.id);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao cancelar agendamento');
    } finally {
      setLoadingAction(false);
    }
  }

  if (carregando) {
    return (
      <div className="space-y-4 p-5 md:p-6">
        <p className="text-sm text-[var(--color-text-secondary)]">Carregando campanha...</p>
      </div>
    );
  }

  if (!campanha) {
    return (
      <div className="space-y-4 p-5 md:p-6">
        <Link href="/admin/campanhas" className="text-sm text-[var(--color-accent)]">Voltar para campanhas</Link>
        <CrmCard className="border-[var(--color-danger)] p-4 text-sm text-[var(--color-danger-text)]">
          {erro || 'Campanha não encontrada.'}
        </CrmCard>
      </div>
    );
  }

  const origem = typeof campanha.filtro?.origemMineracao === 'string' ? campanha.filtro.origemMineracao : '-';
  const iptus = Array.isArray(campanha.filtro?.iptus) ? campanha.filtro.iptus.length : 0;

  return (
    <div className="space-y-4 p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/admin/campanhas" className="text-sm text-[var(--color-accent)]">Voltar para campanhas</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">{campanha.nome}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[campanha.status]}`}>
              {STATUS_LABEL[campanha.status]}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">Criada em {formatDate(campanha.criadoEm)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <CrmButton
            onClick={() => void disparar()}
            disabled={loadingAction || campanha.status === 'ENVIANDO' || campanha.status === 'DESATIVADA' || campanha.status === 'AGENDADA'}
            title="Envia a mensagem da campanha para todos os destinatários pendentes via WhatsApp"
          >
            {loadingAction ? 'Iniciando envio...' : 'Enviar agora'}
          </CrmButton>
          {campanha.status === 'AGENDADA' ? (
            <CrmButton
              variant="ghost"
              onClick={() => void cancelarAgendamento()}
              disabled={loadingAction}
              title="Cancela o agendamento e volta a campanha para rascunho"
            >
              Cancelar agendamento
            </CrmButton>
          ) : (
            <CrmButton
              variant="ghost"
              onClick={abrirAgendamento}
              disabled={loadingAction || campanha.status === 'ENVIANDO' || campanha.status === 'DESATIVADA' || campanha.status === 'CONCLUIDA'}
              title="Agenda o envio para uma data/hora específica"
            >
              📅 Agendar envio
            </CrmButton>
          )}
          {metricas.falhas > 0 && (
            <CrmButton
              variant="ghost"
              onClick={() => void reenviarFalhas()}
              disabled={loadingAction || campanha.status === 'ENVIANDO'}
              title="Tenta reenviar apenas mensagens que falharam por motivo transitório (rede, instância desconectada, rate limit). Falhas permanentes (número inválido) são ignoradas."
            >
              🔄 Reenviar {metricas.falhas} falha{metricas.falhas > 1 ? 's' : ''}
            </CrmButton>
          )}
          <CrmButton
            variant="ghost"
            onClick={() => void alternarStatus()}
            disabled={loadingAction || campanha.status === 'ENVIANDO' || campanha.status === 'AGENDADA'}
            title={campanha.status === 'DESATIVADA' ? 'Volta a campanha para o estado de rascunho (pode ser editada e disparada)' : 'Pausa a campanha — impede novos envios'}
          >
            {campanha.status === 'DESATIVADA' ? 'Reativar campanha' : 'Pausar campanha'}
          </CrmButton>
          <CrmButton
            variant="danger"
            onClick={() => void excluir()}
            disabled={loadingAction || campanha.status === 'ENVIANDO'}
            title="Remove a campanha permanentemente — os leads permanecem no sistema"
          >
            Apagar campanha
          </CrmButton>
        </div>
      </div>

      {erro && (
        <CrmCard className="border-[var(--color-danger)] p-3 text-sm text-[var(--color-danger-text)]">
          {erro}
        </CrmCard>
      )}

      {campanha.status === 'AGENDADA' && campanha.agendadaPara && (
        <CrmCard className="border-[var(--color-info)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-info-text)]">📅 Campanha agendada</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Será disparada automaticamente em <b>{formatDate(campanha.agendadaPara)}</b>
              </p>
            </div>
            <CrmButton variant="ghost" onClick={() => void cancelarAgendamento()} disabled={loadingAction}>
              Cancelar
            </CrmButton>
          </div>
        </CrmCard>
      )}

      {agendarAberto && (
        <CrmCard className="border-[var(--color-accent)] p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">📅 Agendar envio da campanha</p>
          <div className="mb-3 flex flex-wrap gap-2">
            <CrmButton variant="ghost" onClick={() => void agendarComData(presetDaquiUmaHora())} disabled={loadingAction}>
              Daqui a 1 hora
            </CrmButton>
            <CrmButton variant="ghost" onClick={() => void agendarComData(presetAmanha14h())} disabled={loadingAction}>
              Amanhã às 14h
            </CrmButton>
          </div>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">Data</label>
              <input
                type="date"
                value={agendarData}
                onChange={(e) => setAgendarData(e.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2 text-sm text-[var(--color-text-primary)]"
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">Hora</label>
              <input
                type="time"
                value={agendarHora}
                onChange={(e) => setAgendarHora(e.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2 text-sm text-[var(--color-text-primary)]"
              />
            </div>
            <CrmButton onClick={() => void agendarCustom()} disabled={loadingAction}>
              {loadingAction ? 'Agendando...' : 'Agendar'}
            </CrmButton>
            <CrmButton variant="ghost" onClick={() => setAgendarAberto(false)} disabled={loadingAction}>
              Fechar
            </CrmButton>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            💡 Melhor horário para envio: <b>terça a sexta, 14h–17h</b> (maior taxa de resposta)
          </p>
        </CrmCard>
      )}

      {envioProgresso && (
        <CrmCard className="p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-[var(--color-text-primary)]">
              Enviando mensagens — {envioProgresso.processados} de {envioProgresso.total}
            </span>
            <span className="text-[var(--color-text-secondary)]">{envioProgresso.percentual}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
            <div
              className="h-full bg-[var(--color-accent)] transition-all"
              style={{ width: `${envioProgresso.percentual}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-text-secondary)]">
            <span>✅ {envioProgresso.enviados} enviados</span>
            <span>⚠️ {envioProgresso.falhas} falhas</span>
            <span>↪️ {envioProgresso.ignorados} já clientes</span>
          </div>
        </CrmCard>
      )}

      <div className="grid gap-3 md:grid-cols-5">
        <CrmCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Destinatários</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{metricas.total}</p>
        </CrmCard>
        <CrmCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Pendentes</p>
          <p className="text-2xl font-bold text-[var(--color-warning-text)]">{metricas.pendentes}</p>
        </CrmCard>
        <CrmCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Enviados</p>
          <p className="text-2xl font-bold text-[var(--color-success-text)]">{metricas.enviados}</p>
        </CrmCard>
        <CrmCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Falhas</p>
          <p className="text-2xl font-bold text-[var(--color-danger-text)]">{metricas.falhas}</p>
        </CrmCard>
        <CrmCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]" title="Leads que já tinham cadastro como cliente — não receberam mensagem (evita spam)">Já é cliente</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{metricas.convertidos}</p>
        </CrmCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <CrmCard className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Mensagem</p>
            {!editandoMensagem && campanha.status !== 'ENVIANDO' && campanha.status !== 'CONCLUIDA' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={abrirEdicao}
                  className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setIaAberta(!iaAberta)}
                  className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
                  title="Gerar variações da mensagem com IA"
                >
                  ✨ Gerar com IA
                </button>
              </div>
            )}
          </div>

          {!editandoMensagem ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">{campanha.mensagem}</p>
          ) : (
            <div className="space-y-2">
              <textarea
                value={mensagemEditada}
                onChange={(e) => setMensagemEditada(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2 text-sm text-[var(--color-text-primary)]"
                placeholder="Escreva a mensagem que será enviada por WhatsApp..."
              />
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Dica: use <code>{'{{nome}}'}</code> para o nome do destinatário e <code>{'{{bairro}}'}</code> para o bairro.
              </p>
              <div className="flex gap-2">
                <CrmButton onClick={() => void salvarMensagem()} disabled={salvandoMensagem}>
                  {salvandoMensagem ? 'Salvando...' : 'Salvar mensagem'}
                </CrmButton>
                <CrmButton variant="ghost" onClick={() => setEditandoMensagem(false)} disabled={salvandoMensagem}>
                  Cancelar
                </CrmButton>
              </div>
            </div>
          )}

          {iaAberta && (
            <div className="mt-4 rounded-md border border-[var(--color-accent)] bg-[var(--color-surface-raised)] p-3 space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold text-[var(--color-text-primary)]">Descreva a intenção da campanha</p>
                <textarea
                  value={iaIntencao}
                  onChange={(e) => setIaIntencao(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text-primary)]"
                  placeholder="Ex: Lançamento da nova marmita executiva com 20% de desconto na primeira semana"
                />
              </div>
              <div className="flex gap-2">
                <CrmButton onClick={() => void gerarComIA()} disabled={iaGerando}>
                  {iaGerando ? 'Gerando...' : 'Gerar 3 variações'}
                </CrmButton>
                <CrmButton variant="ghost" onClick={() => { setIaAberta(false); setIaVariacoes([]); setIaErro(''); }} disabled={iaGerando}>
                  Fechar
                </CrmButton>
              </div>
              {iaErro && <p className="text-xs text-[var(--color-danger-text)]">{iaErro}</p>}
              {iaVariacoes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">Escolha uma das variações:</p>
                  {iaVariacoes.map((v, i) => (
                    <div key={i} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                      <p className="mb-1 text-xs font-semibold text-[var(--color-accent)]">{v.titulo}</p>
                      <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{v.mensagem}</p>
                      <button
                        type="button"
                        onClick={() => escolherVariacao(v.mensagem)}
                        className="mt-2 text-xs font-semibold text-[var(--color-accent)] hover:underline"
                      >
                        Usar esta mensagem →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {campanha.erro && <p className="mt-3 text-sm text-[var(--color-danger-text)]">Erro: {campanha.erro}</p>}
        </CrmCard>

        <CrmCard className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Origem</p>
          <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
            <p>Origem: <span className="font-semibold text-[var(--color-text-primary)]">{origem}</span></p>
            <p>IPTUs selecionados: <span className="font-semibold text-[var(--color-text-primary)]">{iptus}</span></p>
            <p>Último envio: <span className="font-semibold text-[var(--color-text-primary)]">{formatDate(campanha.enviadaEm)}</span></p>
          </div>
        </CrmCard>
      </div>

      <CrmCard className="overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] p-4">
          <div>
            <p className="font-sora text-lg font-semibold text-[var(--color-text-primary)]">Destinatários</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Leads vinculados a esta campanha. Apagar a campanha não apaga os leads.</p>
          </div>
          {campanha.status !== 'ENVIANDO' && campanha.status !== 'CONCLUIDA' && (
            <CrmButton variant="ghost" onClick={() => setAddLeadAberto(!addLeadAberto)} title="Adiciona um lead manualmente à campanha (útil para testes ou contatos avulsos)">
              + Adicionar lead manual
            </CrmButton>
          )}
        </div>

        {addLeadAberto && (
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Adicionar lead manualmente</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">Telefone (com DDD) *</label>
                <input
                  type="tel"
                  value={addLeadTelefone}
                  onChange={(e) => setAddLeadTelefone(e.target.value)}
                  placeholder="62999999999"
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">Nome (opcional)</label>
                <input
                  type="text"
                  value={addLeadNome}
                  onChange={(e) => setAddLeadNome(e.target.value)}
                  placeholder="Maria"
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">Bairro (opcional)</label>
                <input
                  type="text"
                  value={addLeadBairro}
                  onChange={(e) => setAddLeadBairro(e.target.value)}
                  placeholder="Jardim Mont Serrat"
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text-primary)]"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <CrmButton onClick={() => void adicionarLeadManual()} disabled={addLeadSalvando}>
                {addLeadSalvando ? 'Adicionando...' : 'Adicionar'}
              </CrmButton>
              <CrmButton variant="ghost" onClick={() => setAddLeadAberto(false)} disabled={addLeadSalvando}>
                Cancelar
              </CrmButton>
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
              💡 O nome e bairro são usados como placeholders <code>{'{{nome}}'}</code> e <code>{'{{bairro}}'}</code> na mensagem. Os placeholders <code>{'{{nome}}'}</code> e <code>{'{{bairro}}'}</code> são opcionais — se vazios, o sistema remove sem deixar artefatos.
            </p>
          </div>
        )}

        {editLead && (
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Editar lead</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">Nome</label>
                <input type="text" value={editLead.nome} onChange={(e) => setEditLead({ ...editLead, nome: e.target.value })}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text-primary)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">Telefone</label>
                <input type="tel" value={editLead.telefone} onChange={(e) => setEditLead({ ...editLead, telefone: e.target.value })}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text-primary)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">Bairro</label>
                <input type="text" value={editLead.bairro} onChange={(e) => setEditLead({ ...editLead, bairro: e.target.value })}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text-primary)]" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">Endereço</label>
                <input type="text" value={editLead.endereco} onChange={(e) => setEditLead({ ...editLead, endereco: e.target.value })}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text-primary)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">Status</label>
                <select value={editLead.status} onChange={(e) => setEditLead({ ...editLead, status: e.target.value })}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text-primary)]">
                  <option value="ATIVO">Ativo</option>
                  <option value="CONVERTIDO">Convertido</option>
                  <option value="INATIVO">Inativo</option>
                  <option value="INVALIDO">Inválido</option>
                </select>
              </div>
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">Notas internas</label>
                <textarea value={editLead.notas} onChange={(e) => setEditLead({ ...editLead, notas: e.target.value })} rows={2}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text-primary)]" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <CrmButton onClick={() => void salvarEdicaoLead()} disabled={editLeadSalvando}>
                {editLeadSalvando ? 'Salvando...' : 'Salvar'}
              </CrmButton>
              <CrmButton variant="ghost" onClick={() => setEditLead(null)} disabled={editLeadSalvando}>
                Cancelar
              </CrmButton>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-raised)] text-left text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
              <tr>
                <th className="px-4 py-2 font-semibold">Lead</th>
                <th className="px-4 py-2 font-semibold">Telefone</th>
                <th className="px-4 py-2 font-semibold">Bairro</th>
                <th className="px-4 py-2 font-semibold">Envio</th>
                <th className="px-4 py-2 font-semibold">Data</th>
                <th className="px-4 py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {(campanha.destinatarios || []).map((destinatario) => (
                <tr key={destinatario.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--color-text-primary)]">{destinatario.lead?.nome || 'Sem nome'}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{destinatario.lead?.cpfCnpj ? `CPF/CNPJ ${destinatario.lead.cpfCnpj}` : 'Sem CPF/CNPJ'}</p>
                    <p className="max-w-[420px] truncate text-xs text-[var(--color-text-secondary)]">{destinatario.lead?.endereco || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-primary)]">
                    <p>{destinatario.lead?.telefone || '-'}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{destinatario.lead?.telefones?.length || 1} telefone(s)</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{destinatario.lead?.bairro || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${envioClass(destinatario.statusEnvio)}`}>
                      {ENVIO_LABEL[destinatario.statusEnvio] ?? destinatario.statusEnvio}
                    </span>
                    {destinatario.motivoFalha && <p className="mt-1 text-xs text-[var(--color-danger-text)]">{motivoLabel(destinatario.motivoFalha)}</p>}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(destinatario.enviadoEm || destinatario.criadoEm)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {destinatario.lead?.id && (
                        <button
                          type="button"
                          onClick={() => abrirEdicaoLead(destinatario)}
                          className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
                          title="Editar dados deste lead"
                        >
                          Editar
                        </button>
                      )}
                      {destinatario.statusEnvio !== 'ENVIADO' && campanha.status !== 'ENVIANDO' && campanha.status !== 'CONCLUIDA' && (
                        <button
                          type="button"
                          onClick={() => void removerDestinatario(destinatario.id, destinatario.lead?.nome ?? null)}
                          disabled={loadingAction}
                          className="text-xs font-semibold text-[var(--color-danger-text)] hover:underline disabled:opacity-50"
                          title="Remove este destinatário da campanha (não apaga o lead do sistema)"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(campanha.destinatarios || []).length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]" colSpan={6}>
                    Nenhum destinatário vinculado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CrmCard>
    </div>
  );
}
