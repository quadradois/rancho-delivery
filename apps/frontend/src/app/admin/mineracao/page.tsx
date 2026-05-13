'use client';

import Link from 'next/link';

function sanitizarNome(nome: string | null | undefined): string | null {
  if (!nome) return null;
  return nome.replace(/^ESP[ÓO]LIO\s+DE\s+/i, '').replace(/^HERAN[CÇ]A\s+DE\s+/i, '').replace(/^SUCESSORES?\s+DE\s+/i, '').replace(/^MASSA\s+FALIDA\s+DE\s+/i, '').trim() || null;
}
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import api, { ExecucaoMineracao, IptuMineracao, LeadMarketing, LocalMineracao, MetricasCampanha, MineracaoJobProgresso } from '@/lib/api';
import { CrmButton, CrmCard, CrmInput, CrmSelect } from '@/components/crm';
import AnalyticsTerritorios from './components/AnalyticsTerritorios';

const MapaCobertura = dynamic(() => import('./components/MapaCobertura'), { ssr: false });

type AbaView = 'mineracao' | 'mapa' | 'analytics';

type ModoMineracao = 'bairro' | 'rua' | 'condominio';

const FASE_LABEL: Record<string, string> = {
  LOOKUP: 'Localizando proprietários',
  SCRAPING: 'Coletando dados da prefeitura',
  ASSERTIVA: 'Enriquecendo contatos',
  SALVANDO: 'Salvando leads',
};

export default function MineracaoPage() {
  const [aba, setAba] = useState<AbaView>('mineracao');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [modo, setModo] = useState<ModoMineracao>('condominio');
  const [termo, setTermo] = useState('');
  const [locais, setLocais] = useState<LocalMineracao[]>([]);
  const [localSelecionado, setLocalSelecionado] = useState<LocalMineracao | null>(null);
  const [iptus, setIptus] = useState<IptuMineracao[]>([]);
  const [iptusSelecionados, setIptusSelecionados] = useState<string[]>([]);
  const [execucao, setExecucao] = useState<ExecucaoMineracao | null>(null);
  const [leads, setLeads] = useState<LeadMarketing[]>([]);
  const [campanhaNome, setCampanhaNome] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState<MineracaoJobProgresso | null>(null);
  const [metricas, setMetricas] = useState<MetricasCampanha | null>(null);
  const [historico, setHistorico] = useState<ExecucaoMineracao[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const origemAtual = useMemo(() => (execucao ? `${execucao.modo}:${execucao.termo}` : ''), [execucao]);
  const todosSelecionados = iptus.length > 0 && iptusSelecionados.length === iptus.length;

  useEffect(() => {
    api.adminMineracao.listarExecucoes(20)
      .then(setHistorico)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const campanhaId = execucao?.campanha?.id;
    if (step === 3 && campanhaId) {
      api.adminMineracao.obterMetricasCampanha(campanhaId)
        .then(setMetricas)
        .catch(() => {});
    }
  }, [step, execucao]);

  async function buscarLocais() {
    if (!termo.trim()) return;
    setLoading(true);
    setErro('');
    setErro('');
    try {
      setLocais(await api.adminMineracao.buscarLocais({ modo, q: termo.trim() }));
      setLocalSelecionado(null);
      setIptus([]);
      setIptusSelecionados([]);
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  async function selecionarLocal(local: LocalMineracao) {
    setLoading(true);
    setErro('');
    try {
      setLocalSelecionado(local);
      const data = await api.adminMineracao.listarIptus({
        modo: local.modo,
        nome: local.nome,
        bairro: local.bairro,
        logradouro: local.logradouro,
        limit: 10000,
      });
      setIptus(data);
      setIptusSelecionados(data.map((item) => item.nrinscr));
      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  function alternarIptu(nrinscr: string) {
    setIptusSelecionados((atuais) => atuais.includes(nrinscr) ? atuais.filter((item) => item !== nrinscr) : [...atuais, nrinscr]);
  }

  function alternarTodos() {
    setIptusSelecionados(todosSelecionados ? [] : iptus.map((item) => item.nrinscr));
  }

  function selecionarApenasAltaQualidade() {
    setIptusSelecionados(iptus.filter((i) => (i.score ?? 0) >= 80).map((i) => i.nrinscr));
  }

  async function executarMineracao() {
    if (!localSelecionado || iptusSelecionados.length === 0) return;
    setLoading(true);
    setErro('');
    setProgresso(null);

    try {
      const { runId } = await api.adminMineracao.executar({
        modo,
        termo: localSelecionado.nome,
        filtros: {
          iptus: iptusSelecionados,
          bairro: localSelecionado.bairro,
          logradouro: localSelecionado.logradouro,
          origemLabel: localSelecionado.nome,
        },
      });

      const ex = await new Promise<ExecucaoMineracao>((resolve, reject) => {
        pollingRef.current = setInterval(async () => {
          try {
            const job = await api.adminMineracao.obterStatusJob(runId);
            if (job.progresso) setProgresso(job.progresso);
            if (job.status === 'CONCLUIDO') {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
              resolve(job.resultado as ExecucaoMineracao);
            } else if (job.status === 'FALHA') {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
              reject(new Error(job.erro || 'Falha na mineração'));
            }
          } catch (e) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            reject(e);
          }
        }, 2000);
      });

      setExecucao(ex);
      const ls = await api.adminMineracao.listarLeads({ origem: `${ex.modo}:${ex.termo}`, status: 'ATIVO' });
      setLeads(ls);
      if (ls.length === 0) {
        setErro('Nenhum contato útil foi retornado para os IPTUs selecionados. A campanha não foi criada.');
        setStep(3);
        return;
      }
      const nome = `Mineração ${localSelecionado.nome} - ${new Date(ex.criadoEm).toLocaleDateString('pt-BR')}`;
      if (ex.campanha?.nome) {
        setCampanhaNome(ex.campanha.nome);
      } else {
        const campanha = await api.adminMineracao.criarCampanha({
          nome,
          mensagem: 'Olá! Somos o Rancho Comida Caseira. Estamos na sua região com entrega rápida e promoções especiais hoje. Quer receber o cardápio?',
          filtro: { runId: ex.runId, origemMineracao: `${ex.modo}:${ex.termo}`, leadIds: ls.map((lead) => lead.id), iptus: iptusSelecionados },
        });
        setCampanhaNome(campanha.nome);
      }
      setStep(3);
    } catch (error) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      const message = error instanceof Error ? error.message : 'Erro ao executar mineração';
      setErro(message);
      setStep(3);
    } finally {
      setLoading(false);
      setProgresso(null);
    }
  }

  function novaMineracao() {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setStep(1);
    setTermo('');
    setLocais([]);
    setLocalSelecionado(null);
    setIptus([]);
    setIptusSelecionados([]);
    setExecucao(null);
    setLeads([]);
    setCampanhaNome('');
    setErro('');
    setProgresso(null);
    setMetricas(null);
    api.adminMineracao.listarExecucoes(20).then(setHistorico).catch(() => {});
  }

  function minerarBairro(bairro: string) {
    setModo('bairro');
    setTermo(bairro);
    setAba('mineracao');
    setStep(1);
  }

  return (
    <div className="space-y-4 p-5 md:p-6">
      <div>
        <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Mineração de Leads</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Busque o local, selecione os IPTUs e processe a campanha.</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {(['mineracao', 'mapa', 'analytics'] as AbaView[]).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              aba === a
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {a === 'mineracao' ? 'Mineração' : a === 'mapa' ? 'Mapa de Cobertura' : 'Analytics'}
          </button>
        ))}
      </div>

      {aba === 'mapa' && (
        <CrmCard className="p-4 md:p-5">
          <MapaCobertura onMinerarBairro={minerarBairro} />
        </CrmCard>
      )}

      {aba === 'analytics' && (
        <CrmCard className="p-4 md:p-5">
          <AnalyticsTerritorios />
        </CrmCard>
      )}

      {aba === 'mineracao' && <CrmCard className="p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          <span className={step >= 1 ? 'text-[var(--color-accent)]' : ''}>1. Local</span>
          <span>-</span>
          <span className={step >= 2 ? 'text-[var(--color-accent)]' : ''}>2. IPTUs</span>
          <span>-</span>
          <span className={step >= 3 ? 'text-[var(--color-accent)]' : ''}>3. Resultado</span>
          <span>-</span>
          <span className={step >= 4 ? 'text-[var(--color-accent)]' : ''}>4. Gestão</span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[220px_1fr_160px]">
              <CrmSelect label="Tipo de busca" value={modo} onChange={(e) => setModo(e.target.value as ModoMineracao)}>
                <option value="condominio">Condomínio/Prédio</option>
                <option value="bairro">Bairro</option>
                <option value="rua">Rua</option>
              </CrmSelect>
              <CrmInput label="Termo" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Ex: Buriti, Opus, Bueno" />
              <div className="flex items-end">
                <CrmButton className="w-full" onClick={() => void buscarLocais()} disabled={loading}>{loading ? 'Buscando...' : 'Buscar'}</CrmButton>
              </div>
            </div>

            <div className="space-y-2">
              {locais.map((local) => (
                <button
                  key={`${local.modo}-${local.nome}-${local.bairro || ''}-${local.logradouro || ''}`}
                  type="button"
                  onClick={() => void selecionarLocal(local)}
                  className="flex w-full items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left text-sm hover:border-[var(--color-accent)]"
                >
                  <span>
                    <span className="block font-semibold text-[var(--color-text-primary)]">{local.nome}</span>
                    <span className="block text-xs text-[var(--color-text-secondary)]">{local.logradouro || '-'} · {local.bairro || '-'}</span>
                  </span>
                  <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">{local.totalIptus} IPTUs</span>
                </button>
              ))}
              {termo && locais.length === 0 && !loading && <p className="text-sm text-[var(--color-text-secondary)]">Nenhum local encontrado.</p>}
            </div>
          </div>
        )}

        {step === 2 && localSelecionado && (
          <div className="space-y-4">
            <div className="rounded-md border border-[var(--color-border)] p-3 text-sm">
              <p className="font-semibold text-[var(--color-text-primary)]">{localSelecionado.nome}</p>
              <p className="text-[var(--color-text-secondary)]">{localSelecionado.logradouro || '-'} · {localSelecionado.bairro || '-'}</p>
              <p className="text-[var(--color-text-secondary)]">{iptusSelecionados.length} de {iptus.length} IPTUs selecionados</p>
            </div>

            {loading && progresso && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{FASE_LABEL[progresso.fase] ?? progresso.fase}</span>
                  <span>{progresso.percentual}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-2 rounded-full bg-[var(--color-accent)] transition-all duration-500"
                    style={{ width: `${progresso.percentual}%` }}
                  />
                </div>
              </div>
            )}
            {loading && !progresso && (
              <p className="text-xs text-[var(--color-text-secondary)]">Iniciando mineração...</p>
            )}

            <div className="flex justify-between gap-2">
              <CrmButton variant="ghost" onClick={() => setStep(1)} disabled={loading}>Voltar</CrmButton>
              <div className="flex flex-wrap gap-2">
                <CrmButton
                  variant="ghost"
                  onClick={selecionarApenasAltaQualidade}
                  disabled={loading}
                  title="Seleciona apenas os IPTUs com score 80+ (maior chance de retornar telefone)"
                >
                  Selecionar score alto
                </CrmButton>
                <CrmButton variant="ghost" onClick={alternarTodos} disabled={loading}>{todosSelecionados ? 'Desmarcar todos' : 'Selecionar todos'}</CrmButton>
                <CrmButton
                  onClick={() => void executarMineracao()}
                  disabled={loading || iptusSelecionados.length === 0}
                  title="Busca telefones via Assertiva para os imóveis selecionados e cria uma campanha"
                >
                  {loading ? 'Buscando telefones...' : `Buscar telefones (${iptusSelecionados.length})`}
                </CrmButton>
              </div>
            </div>

            <div className="max-h-[360px] space-y-2 overflow-auto text-sm">
              {iptus.map((item) => {
                const score = item.score ?? 0;
                const scoreColor =
                  score >= 80 ? 'bg-[var(--color-success-muted)] text-[var(--color-success-text)]' :
                  score >= 50 ? 'bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]' :
                  'bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]';
                const scoreLabel =
                  score >= 80 ? 'Alta' :
                  score >= 50 ? 'Média' :
                  'Baixa';
                const scoreTitle =
                  (item.telefonesConhecidos ?? 0) > 0 ? `${item.telefonesConhecidos} telefone(s) já no cache` :
                  item.telefonesConhecidos === 0 ? 'Assertiva já tentou e não retornou telefone' :
                  'Ainda não consultado na Assertiva';
                return (
                  <label key={item.nrinscr} className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--color-border)] p-3">
                    <input className="mt-1" type="checkbox" checked={iptusSelecionados.includes(item.nrinscr)} onChange={() => alternarIptu(item.nrinscr)} />
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="block font-semibold text-[var(--color-text-primary)]">
                          {sanitizarNome(item.nomePessoa) || item.nrinscr}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreColor}`}
                          title={scoreTitle}
                        >
                          {scoreLabel} · {score}
                        </span>
                      </span>
                      <span className="block text-xs text-[var(--color-text-secondary)]">
                        {item.endereco || item.nmlogradou || '-'} · {item.bairro || item.nmbairro || '-'}
                      </span>
                      {item.cpfCnpj && (
                        <span className="block text-xs text-[var(--color-text-tertiary)]">CPF {item.cpfCnpj}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (execucao || erro) && (
          <div className="space-y-3">
            <div className="rounded-md border border-[var(--color-border)] p-3 text-sm">
              <p className="font-semibold">{erro ? 'Mineração não concluída' : `Execução concluída: ${execucao?.termo}`}</p>
              {erro && <p className="text-[var(--color-danger-text)]">{erro}</p>}
              <p className="text-[var(--color-text-secondary)]">Leads encontrados: {leads.length}</p>
              {campanhaNome && <p className="text-[var(--color-text-secondary)]">Campanha criada automaticamente: {campanhaNome}</p>}
            </div>

            {/* Funil da Mineração — diagnóstico de onde os leads foram perdidos */}
            {execucao && execucao.duracoes && (
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
                <p className="mb-3 font-semibold text-[var(--color-text-primary)]">Funil da Mineração</p>
                <div className="space-y-1 text-[var(--color-text-secondary)]">
                  {(() => {
                    const d = execucao.duracoes as any;
                    const totalImoveis = d.proprietariosEncontrados || execucao.totalImoveis || 0;
                    const semCpf = d.imoveisSemCpf ?? 0;
                    const comCpf = totalImoveis - semCpf;
                    const docsUnicos = d.docsConsultados ?? 0;
                    const semTelefone = d.docsSemTelefone ?? 0;
                    const cacheHit = d.docsCacheHit ?? 0;
                    const contatos = d.contatosConsolidados ?? leads.length;
                    const pct = (n: number, base: number) => base > 0 ? Math.round((n / base) * 100) : 0;
                    return (
                      <>
                        <p>📋 <b>{totalImoveis}</b> imóveis localizados no Geo360</p>
                        {semCpf > 0 && (
                          <p className="pl-4 text-xs text-[var(--color-warning-text)]">
                            ⚠️ {semCpf} sem CPF cadastrado ({pct(semCpf, totalImoveis)}%) — não puderam ser enriquecidos
                          </p>
                        )}
                        <p>↓ <b>{comCpf}</b> com CPF · {docsUnicos} CPFs únicos {docsUnicos < comCpf && `(${comCpf - docsUnicos} duplicados)`}</p>
                        <p className="pl-4 text-xs">📞 Assertiva: {docsUnicos - semTelefone} retornaram telefone · {semTelefone} sem telefone ({pct(semTelefone, docsUnicos)}%)</p>
                        {cacheHit > 0 && (
                          <p className="pl-4 text-xs text-[var(--color-text-tertiary)]">💾 {cacheHit} via cache local (economizou consultas)</p>
                        )}
                        <p className="font-medium text-[var(--color-text-primary)]">
                          ↓ <b>{contatos}</b> contatos finais ({pct(contatos, totalImoveis)}% do total)
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {metricas && (
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
                <p className="mb-3 font-semibold text-[var(--color-text-primary)]">Funil da Campanha</p>
                <div className="space-y-1 text-[var(--color-text-secondary)]">
                  <p>{metricas.totalDestinatarios} destinatários</p>
                  <p className="pl-3 text-xs">↓ {metricas.enviados > 0 ? ((metricas.enviados / metricas.totalDestinatarios) * 100).toFixed(0) : 0}% entregues</p>
                  <p>{metricas.enviados} enviados · {metricas.falhas} falhas</p>
                  <p className="pl-3 text-xs">↓ {metricas.taxaConversao} converteram</p>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {metricas.conversoes > 0 ? `🎉 ${metricas.conversoes} viraram clientes` : '0 conversões até agora — atualiza automaticamente'}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs">
                  <span className="text-[var(--color-text-secondary)]">Custo estimado: R$ {metricas.custoTotal.toFixed(2)}</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">ROI estimado: {metricas.roiMultiplo}</span>
                </div>
              </div>
            )}

            <div className="max-h-[220px] space-y-2 overflow-auto text-sm">
              {leads.map((lead) => (
                <div key={lead.id} className="rounded-md border border-[var(--color-border)] p-2">
                  <p className="font-semibold">{lead.nome || 'Sem nome'} · {lead.telefone}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {lead.cpfCnpj ? `CPF/CNPJ ${lead.cpfCnpj}` : 'Sem CPF/CNPJ'} · {lead.telefones?.length || 1} telefone(s)
                  </p>
                  <p className="text-[var(--color-text-secondary)]">{lead.endereco || '-'} · {lead.bairro || '-'}</p>
                </div>
              ))}
              {leads.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">Nenhum contato útil retornado para os IPTUs selecionados.</p>}
            </div>
            <div className="flex justify-end">
              {erro ? <CrmButton onClick={() => setStep(2)}>Voltar aos IPTUs</CrmButton> : <CrmButton onClick={() => setStep(4)} title="Ver e gerenciar a campanha criada">Ver campanha criada</CrmButton>}
            </div>
          </div>
        )}

        {step === 4 && execucao && (
          <div className="space-y-3">
            <CrmInput
              label="Origem dos leads"
              value={origemAtual}
              readOnly
              title="Identificador automático da mineração que gerou estes leads. Útil para rastrear ROI por bairro/rua/condomínio."
            />
            <div className="flex justify-end gap-2">
              <Link href="/admin/campanhas" className="inline-flex">
                <CrmButton variant="ghost">Ver campanhas</CrmButton>
              </Link>
              <CrmButton onClick={novaMineracao}>Nova mineração</CrmButton>
            </div>
          </div>
        )}
      </CrmCard>}

      {aba === 'mineracao' && historico.length > 0 && (
        <CrmCard className="p-4 md:p-5">
          <p className="mb-3 font-semibold text-[var(--color-text-primary)]">Histórico de Minerações</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="pb-2 pr-4">Data</th>
                  <th className="pb-2 pr-4">Modo</th>
                  <th className="pb-2 pr-4">Termo</th>
                  <th className="pb-2 pr-4 text-right">IPTUs</th>
                  <th className="pb-2 pr-4 text-right">Leads</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((ex) => (
                  <tr key={ex.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2 pr-4 text-[var(--color-text-secondary)]">
                      {new Date(ex.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="py-2 pr-4 capitalize text-[var(--color-text-secondary)]">{ex.modo}</td>
                    <td className="py-2 pr-4 font-medium text-[var(--color-text-primary)]">{ex.termo}</td>
                    <td className="py-2 pr-4 text-right text-[var(--color-text-secondary)]">{ex.totalIptus.toLocaleString('pt-BR')}</td>
                    <td className="py-2 pr-4 text-right text-[var(--color-text-secondary)]">{ex.contatosGerados.toLocaleString('pt-BR')}</td>
                    <td className="py-2 text-center">
                      {ex.status === 'SUCESSO'
                        ? <span className="text-green-600">✓</span>
                        : <span className="text-red-500">✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CrmCard>
      )}
    </div>
  );
}
