import { CampanhaStatus, LeadStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import proj4 from 'proj4';
import prisma from '../config/database';
import evolutionService from './evolution.service';
import { logger } from '../config/logger';
import realtimeService from './realtime.service';
import { atualizarProgresso } from './mineracao.queue';

// Remove prefixos legais do nome do proprietário para uso em mensagens
function sanitizarNomeLead(nome: string | null | undefined): string | null {
  if (!nome) return null;
  return nome
    .replace(/^ESP[ÓO]LIO\s+DE\s+/i, '')
    .replace(/^HERAN[CÇ]A\s+DE\s+/i, '')
    .replace(/^SUCESSORES?\s+DE\s+/i, '')
    .replace(/^MASSA\s+FALIDA\s+DE\s+/i, '')
    .trim() || null;
}

// SIRGAS 2000 / UTM zone 22S (wkid 31982) → WGS84
const PROJ_SIRGAS22S = '+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const PROJ_WGS84 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';

function utmParaWgs84(x: number, y: number): { lat: number; lng: number } {
  const [lng, lat] = proj4(PROJ_SIRGAS22S, PROJ_WGS84, [x, y]);
  return { lat, lng };
}

function centroidePoligono(rings: number[][][]): { x: number; y: number } | null {
  const ring = rings?.[0];
  if (!ring || ring.length < 3) return null;
  let sumX = 0, sumY = 0;
  for (const [x, y] of ring) { sumX += x; sumY += y; }
  return { x: sumX / ring.length, y: sumY / ring.length };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type ModoMineracao = 'bairro' | 'rua' | 'condominio' | 'empreendimento' | 'endereco' | 'iptu';

interface ExecutarMineracaoInput {
  modo: ModoMineracao;
  termo: string;
  filtros?: Record<string, unknown>;
  criadoPor?: string;
}

interface ProprietarioBase {
  nrinscr: string;
  nome: string | null;
  cpfCnpj: string | null;
  endereco: string | null;
  bairro: string | null;
}

interface ContatoMinerado {
  nome: string | null;
  telefone: string;
  telefones: string[];
  cpfCnpj: string | null;
  endereco: string | null;
  bairro: string | null;
}

interface MineracaoResultado {
  contatos: ContatoMinerado[];
  totalImoveis: number;
  totalIptusEncontrados: number;
  totalIptusProcessados: number;
  proprietariosEncontrados: number;
  imoveisSemCpf: number;
  docsConsultados: number;
  docsCacheHit: number;
  docsAssertivaConsultados: number;
  docsSemTelefone: number;
  falhasScraper: number;
}

type ImovelPrefeituraAttrs = Record<string, unknown> & {
  OBJECTID?: number | string | null;
  nrinscr?: string | null;
  instatus?: number | string | null;
  inposfisc?: number | string | null;
  cdlogradou?: number | string | null;
  tplogradou?: string | null;
  nmlogradou?: string | null;
  nrimovel?: string | null;
  incompl?: string | null;
  nrquadra?: string | null;
  nrlote?: string | null;
  cdbairro?: number | string | null;
  nmbairro?: string | null;
  cdedificio?: number | string | null;
  nmedificio?: string | null;
  _latitude?: number | null;
  _longitude?: number | null;
};

export class MineracaoService {
  private assertivaCache = new Map<string, { expiresAt: number; value: { telefones: string[]; emails: string[] } }>();
  private assertivaTokenCache: { token: string; expiresAt: number } | null = null;

  private maxIptusPorExecucao() {
    const raw = process.env.MINERACAO_MAX_IPTUS;
    if (!raw || raw.trim().toLowerCase() === 'none' || raw.trim() === '0') return Number.MAX_SAFE_INTEGER;
    const value = Number(raw);
    return Math.max(1, Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER);
  }

  private assertivaConcurrency() {
    const value = Number(process.env.MINERACAO_ASSERTIVA_CONCURRENCY || 6);
    return Math.min(10, Math.max(1, Number.isFinite(value) ? value : 6));
  }

  private assertivaConfigurada() {
    return Boolean(process.env.ASSERTIVA_CLIENT_ID?.trim() && process.env.ASSERTIVA_CLIENT_SECRET?.trim());
  }

  async executarMineracao(input: ExecutarMineracaoInput, externalRunId?: string) {
    const runId = externalRunId || randomUUID();
    const startedAt = Date.now();

    try {
      const resultado = await this.minerarContatos(input, runId);
      const candidatos = resultado.contatos;

      let upserts = 0;
      for (const c of candidatos) {
        const salvo = await this.salvarLeadMinerado(c, `${input.modo}:${input.termo}`);
        if (salvo) upserts++;
      }

      const exec = await prisma.execucaoMineracao.create({
        data: {
          runId,
          modo: input.modo,
          termo: input.termo,
          filtros: (input.filtros || {}) as Prisma.InputJsonValue,
          status: 'SUCESSO',
          totalImoveis: resultado.totalImoveis,
          totalIptus: resultado.totalIptusProcessados,
          contatosGerados: upserts,
          contatosUteis: upserts,
          duracoes: {
            totalMs: Date.now() - startedAt,
            iptusEncontrados: resultado.totalIptusEncontrados,
            iptusProcessados: resultado.totalIptusProcessados,
            proprietariosEncontrados: resultado.proprietariosEncontrados,
            imoveisSemCpf: resultado.imoveisSemCpf,
            docsConsultados: resultado.docsConsultados,
            docsCacheHit: resultado.docsCacheHit,
            docsAssertivaConsultados: resultado.docsAssertivaConsultados,
            docsSemTelefone: resultado.docsSemTelefone,
            contatosConsolidados: candidatos.length,
          } as Prisma.InputJsonValue,
          criadoPor: input.criadoPor,
        },
      });

      const campanha = await this.criarCampanhaAutomaticaMineracao({
        exec,
        iptus: Array.isArray(input.filtros?.iptus)
          ? input.filtros.iptus.map((iptu) => String(iptu)).filter(Boolean)
          : [],
        criadoPor: input.criadoPor,
      }).catch((error) => {
        logger.error('Erro ao criar campanha automática da mineração:', error);
        return null;
      });

      return { ...exec, campanha };
    } catch (error: any) {
      await prisma.execucaoMineracao.create({
        data: {
          runId,
          modo: input.modo,
          termo: input.termo,
          filtros: (input.filtros || {}) as Prisma.InputJsonValue,
          status: 'FALHA',
          erro: error?.message || 'erro',
          duracoes: { totalMs: Date.now() - startedAt } as Prisma.InputJsonValue,
          criadoPor: input.criadoPor,
        },
      });
      throw error;
    }
  }

  async listarExecucoes(limit = 30) {
    return prisma.execucaoMineracao.findMany({ orderBy: { criadoEm: 'desc' }, take: Math.min(100, Math.max(1, limit)) });
  }

  async listarCampanhas(limit = 50) {
    return prisma.campanhaMarketing.findMany({
      orderBy: { criadoEm: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
      include: {
        destinatarios: {
          select: { id: true, statusEnvio: true },
        },
      },
    });
  }

  async obterMetricasCampanha(campanhaId: string) {
    const campanha = await prisma.campanhaMarketing.findUnique({
      where: { id: campanhaId },
      select: {
        id: true,
        nome: true,
        destinatarios: {
          select: {
            statusEnvio: true,
            lead: { select: { status: true, clienteTelefone: true } },
          },
        },
      },
    });
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');

    const total = campanha.destinatarios.length;
    const enviados = campanha.destinatarios.filter((d) => d.statusEnvio === 'ENVIADO').length;
    const falhas = campanha.destinatarios.filter((d) => d.statusEnvio === 'FALHA').length;
    const convertidos = campanha.destinatarios.filter((d) => d.lead?.status === 'CONVERTIDO');
    const conversoes = convertidos.length;
    const taxaConversao = enviados > 0 ? ((conversoes / enviados) * 100).toFixed(1) + '%' : '0.0%';

    // Receita: soma dos pedidos dos leads convertidos
    const telefones = convertidos
      .map((d) => d.lead?.clienteTelefone)
      .filter((t): t is string => Boolean(t));

    let receitaGerada = 0;
    if (telefones.length > 0) {
      const agg = await prisma.pedido.aggregate({
        where: { clienteTelefone: { in: telefones }, status: { not: 'CANCELADO' } },
        _sum: { total: true },
      });
      receitaGerada = Number(agg._sum.total ?? 0);
    }

    const custoEstimadoPorMensagem = 0.05;
    const custoTotal = Number((enviados * custoEstimadoPorMensagem).toFixed(2));
    const roiMultiplo = custoTotal > 0
      ? (receitaGerada / custoTotal).toFixed(1) + 'x'
      : '—';

    return {
      campanhaId: campanha.id,
      nome: campanha.nome,
      totalDestinatarios: total,
      enviados,
      falhas,
      conversoes,
      taxaConversao,
      custoEstimadoPorMensagem,
      custoTotal,
      receitaGerada: Number(receitaGerada.toFixed(2)),
      roiMultiplo,
    };
  }

  async obterCampanha(campanhaId: string) {
    const campanha = await prisma.campanhaMarketing.findUnique({
      where: { id: campanhaId },
      include: {
        destinatarios: {
          include: {
            lead: {
              select: {
                id: true,
                telefone: true,
                cpfCnpj: true,
                telefones: true,
                nome: true,
                endereco: true,
                bairro: true,
                origemMineracao: true,
                status: true,
                convertidoEm: true,
                clienteTelefone: true,
                criadoEm: true,
              },
            },
          },
          orderBy: { criadoEm: 'desc' },
        },
      },
    });
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');
    return campanha;
  }

  async listarLeadsEngajados(limit = 50) {
    const leads = await prisma.leadMarketing.findMany({
      where: { ultimaInteracaoEm: { not: null } },
      orderBy: { ultimaInteracaoEm: 'desc' },
      take: Math.min(200, limit),
      select: {
        id: true, telefone: true, nome: true, bairro: true, status: true,
        humanRequired: true, ultimaInteracaoEm: true, criadoEm: true,
        mensagens: {
          orderBy: { criadoEm: 'desc' },
          take: 1,
          select: { texto: true, origem: true, criadoEm: true },
        },
      },
    });
    return leads.map((l) => ({
      ...l,
      ultimaMensagem: l.mensagens[0] || null,
      mensagens: undefined,
    }));
  }

  async obterConversaLead(leadId: string) {
    const lead = await prisma.leadMarketing.findUnique({
      where: { id: leadId },
      include: { mensagens: { orderBy: { criadoEm: 'asc' } } },
    });
    if (!lead) throw new Error('LEAD_NAO_ENCONTRADO');
    await prisma.mensagemLead.updateMany({
      where: { leadId, lida: false },
      data: { lida: true },
    });
    return lead;
  }

  async listarLeads(filtro?: { status?: LeadStatus; origem?: string; q?: string }) {
    return prisma.leadMarketing.findMany({
      where: {
        ...(filtro?.status ? { status: filtro.status } : {}),
        ...(filtro?.origem ? { origemMineracao: { contains: filtro.origem, mode: 'insensitive' } } : {}),
        ...(filtro?.q
          ? {
              OR: [
                { nome: { contains: filtro.q, mode: 'insensitive' } },
                { telefone: { contains: filtro.q } },
                { endereco: { contains: filtro.q, mode: 'insensitive' } },
                { bairro: { contains: filtro.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { criadoEm: 'desc' },
      take: 500,
    });
  }

  private async salvarLeadMinerado(contato: ContatoMinerado, origemMineracao: string) {
    const cpfCnpj = this.normalizarDoc(contato.cpfCnpj);
    const telefones = this.normalizarTelefones(contato.telefones.length > 0 ? contato.telefones : [contato.telefone]);
    const telefonePrincipal = telefones[0] || String(contato.telefone || '').replace(/\D/g, '');
    if (!telefonePrincipal) return false;

    const dataBase = {
      cpfCnpj,
      nome: sanitizarNomeLead(contato.nome),
      endereco: contato.endereco,
      bairro: contato.bairro,
      origemMineracao,
      status: LeadStatus.ATIVO,
    };

    if (cpfCnpj) {
      const existentePorDoc = await prisma.leadMarketing.findUnique({ where: { cpfCnpj } });
      if (existentePorDoc) {
        const telefonesMesclados = this.normalizarTelefones([
          ...this.telefonesDoLead(existentePorDoc.telefones),
          existentePorDoc.telefone,
          ...telefones,
        ]);
        const telefoneAtualizado = await this.telefoneDisponivelParaLead(telefonesMesclados[0] || telefonePrincipal, existentePorDoc.id)
          ? (telefonesMesclados[0] || telefonePrincipal)
          : existentePorDoc.telefone;
        await prisma.leadMarketing.update({
          where: { id: existentePorDoc.id },
          data: {
            ...dataBase,
            telefone: telefoneAtualizado,
            telefones: telefonesMesclados as Prisma.InputJsonValue,
          },
        });
        await this.invalidarLeadsLegadosDuplicados(existentePorDoc.id, telefonesMesclados);
        return true;
      }

      const existentePorTelefone = await prisma.leadMarketing.findFirst({
        where: { telefone: { in: telefones } },
        orderBy: { criadoEm: 'desc' },
      });
      if (existentePorTelefone) {
        const telefonesMesclados = this.normalizarTelefones([
          ...this.telefonesDoLead(existentePorTelefone.telefones),
          existentePorTelefone.telefone,
          ...telefones,
        ]);
        await prisma.leadMarketing.update({
          where: { id: existentePorTelefone.id },
          data: {
            ...dataBase,
            telefone: telefonesMesclados[0] || existentePorTelefone.telefone,
            telefones: telefonesMesclados as Prisma.InputJsonValue,
          },
        });
        await this.invalidarLeadsLegadosDuplicados(existentePorTelefone.id, telefonesMesclados);
        return true;
      }
    }

    await prisma.leadMarketing.upsert({
      where: { telefone: telefonePrincipal },
      update: {
        ...dataBase,
        telefones: telefones as Prisma.InputJsonValue,
      },
      create: {
        telefone: telefonePrincipal,
        ...dataBase,
        telefones: telefones as Prisma.InputJsonValue,
      },
    });
    await this.invalidarLeadsLegadosDuplicadosPorCpf(cpfCnpj, telefones);
    return true;
  }

  async buscarLocais(input: { modo: ModoMineracao; termo: string; cidade?: string }) {
    const termo = input.termo.trim();
    if (!termo) return [];

    const contains = { contains: termo, mode: 'insensitive' as const };

    // Busca na nova tabela Imóveis
    const where: any = {
      ...(input.cidade ? { cidade: input.cidade } : {}),
      ...(input.modo === 'rua' || input.modo === 'endereco'
        ? { endereco: contains }
        : { bairro: contains }),
    };

    const rows = await (prisma as any).imovelRancho.findMany({
      where,
      select: { bairro: true, endereco: true, inscricaoCartografica: true, cidade: true },
      take: 5000,
      orderBy: [{ bairro: 'asc' }, { endereco: 'asc' }],
    });

    const grupos = new Map<string, {
      modo: ModoMineracao;
      nome: string;
      bairro: string | null;
      cidade: string;
      tipo: 'BAIRRO' | 'RUA' | 'CONDOMINIO';
      totalIptus: number;
    }>();

    for (const row of rows) {
      const nome = input.modo === 'rua' || input.modo === 'endereco' ? row.endereco : row.bairro;
      if (!nome) continue;
      const key = [input.modo, nome, row.bairro || '', row.cidade].join('|');
      const atual = grupos.get(key);
      if (atual) { atual.totalIptus += 1; continue; }
      grupos.set(key, {
        modo: input.modo,
        nome,
        bairro: row.bairro,
        cidade: row.cidade,
        tipo: input.modo === 'rua' || input.modo === 'endereco' ? 'RUA' : 'BAIRRO',
        totalIptus: 1,
      });
    }

    return [...grupos.values()].sort((a, b) => b.totalIptus - a.totalIptus).slice(0, 50);
  }

  async listarIptusLocal(input: { modo: ModoMineracao; nome: string; bairro?: string; logradouro?: string; limit?: number; cidade?: string }) {
    const limit = Math.max(1, Number(input.limit || 5000));

    const where: any = {
      ...(input.cidade ? { cidade: input.cidade } : {}),
      ...(input.modo === 'rua' || input.modo === 'endereco'
        ? {
            endereco: { contains: input.nome, mode: 'insensitive' },
            ...(input.bairro ? { bairro: input.bairro } : {}),
          }
        : {
            bairro: { contains: input.nome, mode: 'insensitive' },
          }),
    };

    const rows = await (prisma as any).imovelRancho.findMany({
      where,
      select: {
        inscricaoCartografica: true,
        cpfCnpj: true,
        nomePessoa: true,
        bairro: true,
        endereco: true,
        cep: true,
        cidade: true,
        latitude: true,
        longitude: true,
      },
      orderBy: [{ bairro: 'asc' }, { endereco: 'asc' }],
      take: limit,
    });

    // Batch lookup do cache Assertiva para os CPFs encontrados
    const cpfs = rows
      .map((r: any) => this.normalizarDoc(r.cpfCnpj))
      .filter((c: string | null): c is string => Boolean(c));
    const cacheAssertiva = cpfs.length > 0
      ? await prisma.assertivaConsultaCache.findMany({
          where: { cpfCnpj: { in: cpfs } },
          select: { cpfCnpj: true, telefones: true },
        })
      : [];
    const cacheMap = new Map<string, number>(); // CPF → quantidade de telefones
    for (const c of cacheAssertiva) {
      const lista = Array.isArray(c.telefones) ? c.telefones : [];
      cacheMap.set(c.cpfCnpj, lista.length);
    }

    const enriquecidos = rows.map((r: any) => {
      const cpfNorm = this.normalizarDoc(r.cpfCnpj);
      const telefonesCache = cpfNorm ? cacheMap.get(cpfNorm) : undefined;
      const score = this.calcularScoreLead({
        temCpf: Boolean(cpfNorm),
        temNome: Boolean((r.nomePessoa || '').trim()),
        telefonesCache,
      });
      return { ...r, nrinscr: r.inscricaoCartografica, score, telefonesConhecidos: telefonesCache ?? null };
    });

    // Ordena por score decrescente para destacar os melhores leads no topo
    return enriquecidos.sort((a: any, b: any) => b.score - a.score);
  }

  private calcularScoreLead(input: { temCpf: boolean; temNome: boolean; telefonesCache: number | undefined }): number {
    let score = 0;
    if (input.temCpf) score += 30;
    if (input.temNome) score += 20;
    if (input.telefonesCache === undefined) {
      // Sem cache — sera consultado, score neutro
      score += 30;
    } else if (input.telefonesCache > 0) {
      // Tem telefone confirmado — alta qualidade
      score += 50;
    } else {
      // Já consultamos e Assertiva não retornou — baixa probabilidade
      score -= 20;
    }
    return Math.max(0, Math.min(100, score));
  }

  async sincronizarImoveisPrefeitura(input?: { limite?: number; lote?: number; objectIdMinimo?: number }) {
    const limite = Math.min(50000, Math.max(1, Number(input?.limite || 2000)));
    const lote = Math.min(500, Math.max(50, Number(input?.lote || 250)));
    const where = input?.objectIdMinimo ? `OBJECTID > ${input.objectIdMinimo}` : '1=1';
    let offset = 0;
    let salvos = 0;

    while (salvos < limite) {
      const restantes = limite - salvos;
      const atual = Math.min(lote, restantes);
      const imoveis = await this.consultarMapaPrefeitura(where, atual, offset);
      if (imoveis.length === 0) break;
      salvos += await this.salvarImoveisPrefeitura(imoveis);
      offset += imoveis.length;
      if (imoveis.length < atual) break;
    }

    return { salvos, limite, lote };
  }

  async criarCampanha(input: { nome: string; mensagem: string; filtro?: Record<string, unknown>; criadoPor?: string }) {
    const filtro = input.filtro || {};
    const runId = typeof filtro.runId === 'string' ? filtro.runId : undefined;
    if (runId) {
      const existente = await prisma.campanhaMarketing.findFirst({
        where: { filtro: { path: ['runId'], equals: runId } },
        include: {
          destinatarios: {
            select: { id: true, statusEnvio: true },
          },
        },
        orderBy: { criadoEm: 'desc' },
      });
      if (existente) return existente;
    }

    const origemMineracao = typeof filtro.origemMineracao === 'string' ? filtro.origemMineracao : undefined;
    const leadIds = Array.isArray(filtro.leadIds)
      ? filtro.leadIds.map((id) => String(id)).filter(Boolean)
      : [];
    let leads = await prisma.leadMarketing.findMany({
      where: {
        status: LeadStatus.ATIVO,
        ...(leadIds.length > 0 ? { id: { in: leadIds } } : {}),
        ...(leadIds.length === 0 && origemMineracao ? { origemMineracao, cpfCnpj: { not: null } } : {}),
      },
      select: { id: true },
      take: 2000,
      orderBy: { criadoEm: 'desc' },
    });
    if (leads.length === 0 && leadIds.length === 0 && origemMineracao) {
      leads = await prisma.leadMarketing.findMany({
        where: {
          status: LeadStatus.ATIVO,
          origemMineracao,
        },
        select: { id: true },
        take: 2000,
        orderBy: { criadoEm: 'desc' },
      });
    }

    if (leads.length === 0) {
      throw new Error('CAMPANHA_SEM_LEADS');
    }

    const campanha = await prisma.campanhaMarketing.create({
      data: {
        nome: input.nome,
        mensagem: input.mensagem,
        filtro: filtro as Prisma.InputJsonValue,
        status: CampanhaStatus.RASCUNHO,
        criadoPor: input.criadoPor,
        destinatarios: {
          create: leads.map((lead) => ({
            leadId: lead.id,
            statusEnvio: 'PENDENTE',
          })),
        },
      },
      include: {
        destinatarios: {
          select: { id: true, statusEnvio: true },
        },
      },
    });
    return campanha;
  }

  private async criarCampanhaAutomaticaMineracao(input: {
    exec: { runId: string; modo: string; termo: string; criadoEm: Date };
    iptus: string[];
    criadoPor?: string;
  }) {
    const origemMineracao = `${input.exec.modo}:${input.exec.termo}`;
    const dataLabel = new Date(input.exec.criadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return this.criarCampanha({
      nome: `Mineração ${input.exec.termo} - ${dataLabel}`,
      mensagem: this.mensagemPadraoCampanhaMineracao(),
      filtro: {
        runId: input.exec.runId,
        origemMineracao,
        iptus: input.iptus,
      },
      criadoPor: input.criadoPor,
    });
  }

  private mensagemPadraoCampanhaMineracao() {
    return 'Olá! Somos o Rancho Comida Caseira. Estamos na sua região com entrega rápida e promoções especiais hoje. Quer receber o cardápio?';
  }

  private aplicarPlaceholders(mensagem: string, lead: { nome?: string | null; bairro?: string | null }): string {
    // Primeiro nome — pega palavra inicial e capitaliza
    const primeiroNome = (lead.nome || '').trim().split(/\s+/)[0] || '';
    const nomeFormatado = primeiroNome
      ? primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase()
      : '';
    const bairro = (lead.bairro || '').trim();

    let resultado = mensagem
      .replace(/\{\{\s*nome\s*\}\}/gi, nomeFormatado)
      .replace(/\{\{\s*bairro\s*\}\}/gi, bairro);

    // Limpa artefatos quando placeholder ficou vazio (ex: "Olá ," → "Olá,")
    resultado = resultado
      .replace(/\s+([,.!?])/g, '$1')       // " ," → ","
      .replace(/\s{2,}/g, ' ')              // múltiplos espaços
      .replace(/\(\s*\)/g, '')              // parênteses vazios
      .trim();

    return resultado;
  }

  async dispararCampanha(campanhaId: string) {
    let campanha = await prisma.campanhaMarketing.findUnique({
      where: { id: campanhaId },
      include: {
        destinatarios: {
          include: {
            lead: true,
          },
          orderBy: { criadoEm: 'asc' },
        },
      },
    });
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');
    if (campanha.status === CampanhaStatus.DESATIVADA) throw new Error('CAMPANHA_DESATIVADA');

    if (campanha.destinatarios.length === 0) {
      await this.vincularDestinatariosCampanhaLegada(campanha.id, (campanha.filtro || {}) as Record<string, any>);
      campanha = await prisma.campanhaMarketing.findUnique({
        where: { id: campanhaId },
        include: {
          destinatarios: {
            include: {
              lead: true,
            },
            orderBy: { criadoEm: 'asc' },
          },
        },
      });
    }
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');
    if (campanha.destinatarios.length === 0) throw new Error('CAMPANHA_SEM_DESTINATARIOS');

    await prisma.campanhaMarketing.update({ where: { id: campanha.id }, data: { status: CampanhaStatus.ENVIANDO } });

    const filtro = (campanha.filtro || {}) as Record<string, any>;
    const runId = typeof filtro.runId === 'string' ? filtro.runId : undefined;
    // Processa apenas pendentes — destinatários em FALHA exigem ação explícita (botão "Reenviar falhas")
    const destinatarios = campanha.destinatarios.filter((destinatario) => destinatario.statusEnvio === 'PENDENTE');

    let enviados = 0;
    let falhas = 0;
    let ignorados = 0;
    let processados = 0;
    const total = destinatarios.length;

    // Evento inicial
    realtimeService.emit('campanha:envio_progresso', {
      campanhaId: campanha.id, processados: 0, enviados: 0, falhas: 0, ignorados: 0, total, percentual: 0,
    });

    for (const destinatario of destinatarios) {
      const lead = destinatario.lead;
      const existeCliente = await prisma.cliente.findUnique({ where: { telefone: lead.telefone }, select: { telefone: true } });
      if (existeCliente) {
        await prisma.leadMarketing.update({ where: { id: lead.id }, data: { status: LeadStatus.CONVERTIDO, convertidoEm: new Date(), clienteTelefone: existeCliente.telefone } });
        await prisma.campanhaDestinatario.update({
          where: { id: destinatario.id },
          data: {
            statusEnvio: 'IGNORADO_CONVERTIDO',
            enviadoEm: new Date(),
            motivoFalha: 'LEAD_JA_E_CLIENTE',
          },
        });
        ignorados++;
      } else {
        const mensagemPersonalizada = this.aplicarPlaceholders(campanha.mensagem, lead);
        const resultado = await evolutionService.enviarMensagemDetalhado({ numero: lead.telefone, mensagem: mensagemPersonalizada });
        if (resultado.ok) enviados++; else falhas++;

        await prisma.campanhaDestinatario.update({
          where: { id: destinatario.id },
          data: {
            statusEnvio: resultado.ok ? 'ENVIADO' : 'FALHA',
            enviadoEm: new Date(),
            motivoFalha: resultado.ok ? null : resultado.motivo || 'WHATSAPP_ENVIO_FALHOU',
            tentativas: { increment: 1 },
          },
        }).catch(() => null);
      }

      processados++;

      // Emite progresso a cada 5 envios ou no final
      if (processados % 5 === 0 || processados === total) {
        realtimeService.emit('campanha:envio_progresso', {
          campanhaId: campanha.id,
          processados, enviados, falhas, ignorados, total,
          percentual: Math.round((processados / total) * 100),
        });
      }
    }

    await prisma.campanhaMarketing.update({
      where: { id: campanha.id },
      data: {
        status: CampanhaStatus.CONCLUIDA,
        enviadaEm: new Date(),
        erro: falhas > 0 ? `${falhas} falhas no envio` : null,
      },
    });

    realtimeService.emit('campanha:envio_concluido', {
      campanhaId: campanha.id, enviados, falhas, ignorados, total,
    });

    return { campanhaId: campanha.id, runId: runId || null, enviados, falhas, total };
  }

  async atualizarMensagemCampanha(campanhaId: string, mensagem: string) {
    const campanha = await prisma.campanhaMarketing.findUnique({ where: { id: campanhaId } });
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');
    if (campanha.status === CampanhaStatus.ENVIANDO) throw new Error('CAMPANHA_EM_ENVIO');
    if (campanha.status === CampanhaStatus.CONCLUIDA) throw new Error('CAMPANHA_CONCLUIDA');
    const texto = mensagem.trim();
    if (!texto) throw new Error('MENSAGEM_VAZIA');
    return prisma.campanhaMarketing.update({
      where: { id: campanhaId },
      data: { mensagem: texto },
      include: { destinatarios: { select: { id: true, statusEnvio: true } } },
    });
  }

  // Motivos de falha considerados permanentes — não vale a pena tentar de novo
  private motivosPermanentes = new Set([
    'NUMERO_INVALIDO',
    'INSTANCIA_NAO_AUTORIZADA',
    'CLIENTE_400',
    'CLIENTE_401',
    'CLIENTE_403',
    'CLIENTE_404',
  ]);

  async removerDestinatarioCampanha(campanhaId: string, destinatarioId: string) {
    const campanha = await prisma.campanhaMarketing.findUnique({ where: { id: campanhaId } });
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');
    if (campanha.status === CampanhaStatus.ENVIANDO) throw new Error('CAMPANHA_EM_ENVIO');
    if (campanha.status === CampanhaStatus.CONCLUIDA) throw new Error('CAMPANHA_CONCLUIDA');

    const destinatario = await prisma.campanhaDestinatario.findFirst({
      where: { id: destinatarioId, campanhaId },
    });
    if (!destinatario) throw new Error('DESTINATARIO_NAO_ENCONTRADO');
    if (destinatario.statusEnvio === 'ENVIADO') throw new Error('DESTINATARIO_JA_ENVIADO');

    await prisma.campanhaDestinatario.delete({ where: { id: destinatarioId } });
    return { removido: true, destinatarioId };
  }

  async adicionarLeadManualCampanha(campanhaId: string, input: { telefone: string; nome?: string; bairro?: string }) {
    const campanha = await prisma.campanhaMarketing.findUnique({ where: { id: campanhaId } });
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');
    if (campanha.status === CampanhaStatus.ENVIANDO) throw new Error('CAMPANHA_EM_ENVIO');
    if (campanha.status === CampanhaStatus.CONCLUIDA) throw new Error('CAMPANHA_CONCLUIDA');

    const telefoneLimpo = input.telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 13) {
      throw new Error('TELEFONE_INVALIDO');
    }

    // Upsert do lead
    const lead = await prisma.leadMarketing.upsert({
      where: { telefone: telefoneLimpo },
      update: {
        nome: input.nome || undefined,
        bairro: input.bairro || undefined,
      },
      create: {
        telefone: telefoneLimpo,
        nome: input.nome,
        bairro: input.bairro,
        origemMineracao: 'manual:teste',
        status: LeadStatus.ATIVO,
      },
    });

    // Adiciona à campanha (idempotente)
    const existente = await prisma.campanhaDestinatario.findFirst({
      where: { campanhaId, leadId: lead.id },
    });
    if (existente) {
      return { adicionado: false, ja_existia: true, leadId: lead.id };
    }

    await prisma.campanhaDestinatario.create({
      data: {
        campanhaId,
        leadId: lead.id,
        statusEnvio: 'PENDENTE',
      },
    });

    return { adicionado: true, leadId: lead.id };
  }

  async reenviarFalhas(campanhaId: string) {
    const campanha = await prisma.campanhaMarketing.findUnique({ where: { id: campanhaId } });
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');
    if (campanha.status === CampanhaStatus.ENVIANDO) throw new Error('CAMPANHA_EM_ENVIO');

    // Pega destinatários com FALHA, motivo transitório, < 3 tentativas
    const candidatos = await prisma.campanhaDestinatario.findMany({
      where: {
        campanhaId,
        statusEnvio: 'FALHA',
        tentativas: { lt: 3 },
      },
      include: { lead: true },
    });

    const elegiveis = candidatos.filter(
      (d) => !d.motivoFalha || !this.motivosPermanentes.has(d.motivoFalha),
    );

    if (elegiveis.length === 0) {
      return { reenviados: 0, recuperados: 0, total: 0 };
    }

    // Volta status pra PENDENTE
    await prisma.campanhaDestinatario.updateMany({
      where: { id: { in: elegiveis.map((e) => e.id) } },
      data: { statusEnvio: 'PENDENTE' },
    });

    // Dispara em background (não bloqueia o request)
    setImmediate(() => {
      this.dispararCampanha(campanhaId).catch((err) =>
        logger.error('reenviarFalhas: erro ao redisparar campanha', err),
      );
    });

    return { reenviados: elegiveis.length, total: candidatos.length, ignorados: candidatos.length - elegiveis.length };
  }

  async agendarCampanha(campanhaId: string, agendadaPara: Date) {
    const campanha = await prisma.campanhaMarketing.findUnique({ where: { id: campanhaId } });
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');
    if (campanha.status === CampanhaStatus.ENVIANDO) throw new Error('CAMPANHA_EM_ENVIO');
    if (campanha.status === CampanhaStatus.CONCLUIDA) throw new Error('CAMPANHA_CONCLUIDA');
    if (agendadaPara.getTime() < Date.now() + 30_000) {
      throw new Error('AGENDAMENTO_PASSADO');
    }
    return prisma.campanhaMarketing.update({
      where: { id: campanhaId },
      data: { status: CampanhaStatus.AGENDADA, agendadaPara },
      include: { destinatarios: { select: { id: true, statusEnvio: true } } },
    });
  }

  async cancelarAgendamento(campanhaId: string) {
    const campanha = await prisma.campanhaMarketing.findUnique({ where: { id: campanhaId } });
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');
    if (campanha.status !== CampanhaStatus.AGENDADA) throw new Error('CAMPANHA_NAO_AGENDADA');
    return prisma.campanhaMarketing.update({
      where: { id: campanhaId },
      data: { status: CampanhaStatus.RASCUNHO, agendadaPara: null },
      include: { destinatarios: { select: { id: true, statusEnvio: true } } },
    });
  }

  async processarCampanhasAgendadas(): Promise<{ disparadas: number }> {
    const agora = new Date();
    const pendentes = await prisma.campanhaMarketing.findMany({
      where: { status: CampanhaStatus.AGENDADA, agendadaPara: { lte: agora } },
      select: { id: true, nome: true },
      take: 10,
    });
    if (pendentes.length === 0) return { disparadas: 0 };

    for (const c of pendentes) {
      logger.info(`campanha.agendada.disparando id=${c.id} nome="${c.nome}"`);
      this.dispararCampanha(c.id).catch((err) => {
        logger.error(`campanha.agendada.falha id=${c.id}:`, err);
      });
    }
    return { disparadas: pendentes.length };
  }

  async atualizarStatusCampanha(campanhaId: string, status: CampanhaStatus) {
    const campanha = await prisma.campanhaMarketing.findUnique({ where: { id: campanhaId } });
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');
    if (campanha.status === CampanhaStatus.ENVIANDO) throw new Error('CAMPANHA_EM_ENVIO');
    if (status !== CampanhaStatus.RASCUNHO && status !== CampanhaStatus.DESATIVADA) {
      throw new Error('STATUS_CAMPANHA_INVALIDO');
    }

    return prisma.campanhaMarketing.update({
      where: { id: campanhaId },
      data: { status },
      include: {
        destinatarios: {
          select: { id: true, statusEnvio: true },
        },
      },
    });
  }

  async atualizarLead(id: string, input: {
    nome?: string | null;
    telefone?: string;
    bairro?: string | null;
    endereco?: string | null;
    notas?: string | null;
    status?: LeadStatus;
  }) {
    const lead = await prisma.leadMarketing.findUnique({ where: { id } });
    if (!lead) throw new Error('LEAD_NAO_ENCONTRADO');

    if (input.telefone && input.telefone !== lead.telefone) {
      const existe = await prisma.leadMarketing.findUnique({ where: { telefone: input.telefone } });
      if (existe) throw new Error('TELEFONE_EM_USO');
    }

    return prisma.leadMarketing.update({
      where: { id },
      data: {
        ...(input.nome !== undefined && { nome: input.nome }),
        ...(input.telefone !== undefined && { telefone: input.telefone }),
        ...(input.bairro !== undefined && { bairro: input.bairro }),
        ...(input.endereco !== undefined && { endereco: input.endereco }),
        ...(input.notas !== undefined && { notas: input.notas }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });
  }

  async excluirCampanha(campanhaId: string) {
    const campanha = await prisma.campanhaMarketing.findUnique({ where: { id: campanhaId } });
    if (!campanha) throw new Error('CAMPANHA_NAO_ENCONTRADA');
    if (campanha.status === CampanhaStatus.ENVIANDO) throw new Error('CAMPANHA_EM_ENVIO');
    await prisma.campanhaMarketing.delete({ where: { id: campanhaId } });
    return { id: campanhaId, removida: true };
  }

  private async vincularDestinatariosCampanhaLegada(campanhaId: string, filtro: Record<string, any>) {
    const origemMineracao = typeof filtro.origemMineracao === 'string' ? filtro.origemMineracao : undefined;
    const leadIds = Array.isArray(filtro.leadIds)
      ? filtro.leadIds.map((id) => String(id)).filter(Boolean)
      : [];
    if (!origemMineracao && leadIds.length === 0) return 0;

    let leads = await prisma.leadMarketing.findMany({
      where: {
        status: LeadStatus.ATIVO,
        ...(leadIds.length > 0 ? { id: { in: leadIds } } : {}),
        ...(leadIds.length === 0 && origemMineracao ? { origemMineracao, cpfCnpj: { not: null } } : {}),
      },
      select: { id: true },
      take: 2000,
      orderBy: { criadoEm: 'desc' },
    });
    if (leads.length === 0 && leadIds.length === 0 && origemMineracao) {
      leads = await prisma.leadMarketing.findMany({
        where: {
          status: LeadStatus.ATIVO,
          origemMineracao,
        },
        select: { id: true },
        take: 2000,
        orderBy: { criadoEm: 'desc' },
      });
    }

    for (const lead of leads) {
      const existe = await prisma.campanhaDestinatario.findFirst({
        where: { campanhaId, leadId: lead.id },
        select: { id: true },
      });
      if (existe) continue;
      await prisma.campanhaDestinatario.create({
        data: {
          campanhaId,
          leadId: lead.id,
          statusEnvio: 'PENDENTE',
        },
      });
    }

    return leads.length;
  }

  private async minerarContatos(input: ExecutarMineracaoInput, runId: string): Promise<MineracaoResultado> {
    // Fase 1 — Lookup direto no Imóveis (CPF, nome, endereço já enriquecidos)
    const iptusFiltro = Array.isArray(input.filtros?.iptus)
      ? input.filtros!.iptus!.map((i) => String(i).trim()).filter(Boolean)
      : [];

    if (iptusFiltro.length === 0) {
      throw new Error('MINERACAO_SEM_IPTUS');
    }

    const iptus = iptusFiltro.slice(0, this.maxIptusPorExecucao());

    const progressoLookup = { processados: 0, total: iptus.length, fase: 'LOOKUP' as const, percentual: 5 };
    atualizarProgresso(runId, progressoLookup);
    realtimeService.emit('mineracao:progresso', { runId, ...progressoLookup });

    const imoveisRows = await (prisma as any).imovelRancho.findMany({
      where: { inscricaoCartografica: { in: iptus } },
      select: {
        inscricaoCartografica: true,
        cpfCnpj: true,
        nomePessoa: true,
        endereco: true,
        bairro: true,
      },
    });

    const base: ProprietarioBase[] = imoveisRows.map((r: any) => ({
      nrinscr: r.inscricaoCartografica,
      nome: sanitizarNomeLead(r.nomePessoa),
      cpfCnpj: r.cpfCnpj,
      endereco: r.endereco,
      bairro: r.bairro,
    }));

    const imoveisSemCpf = base.filter((p) => !p.cpfCnpj).length;

    logger.info(`mineracao.lookup_imoveis modo=${input.modo} termo="${input.termo}" iptusSolicitados=${iptus.length} encontrados=${base.length} semCpf=${imoveisSemCpf}`);

    if (base.length === 0) {
      throw new Error('IMOVEIS_SEM_PROPRIETARIOS');
    }

    const progressoLookupFim = { processados: base.length, total: iptus.length, fase: 'LOOKUP' as const, percentual: 10 };
    atualizarProgresso(runId, progressoLookupFim);
    realtimeService.emit('mineracao:progresso', { runId, ...progressoLookupFim });

    if (!this.assertivaConfigurada()) {
      throw new Error('ASSERTIVA_NAO_CONFIGURADA');
    }

    await this.assertivaToken();

    const docs = [...new Set(base.map((b) => this.normalizarDoc(b.cpfCnpj)).filter((d): d is string => Boolean(d)))];
    if (docs.length === 0) {
      throw new Error('IMOVEIS_SEM_DOCUMENTOS');
    }

    const enrichMap = new Map<string, { telefones: string[]; emails: string[] }>();
    let docsCacheHit = 0;
    let docsAssertivaConsultados = 0;
    let processadosAssertiva = 0;
    const totalDocs = docs.length;

    const enriquecidos = await this.mapLimit(docs, this.assertivaConcurrency(), async (doc) => {
      let enriched: { telefones: string[]; emails: string[] };
      const cached = this.assertivaCache.get(doc);
      if (cached && cached.expiresAt > Date.now()) {
        docsCacheHit++;
        enriched = cached.value;
      } else {
        const persistido = await this.buscarAssertivaCachePersistente(doc);
        if (persistido) {
          docsCacheHit++;
          this.assertivaCache.set(doc, { expiresAt: persistido.expiresAt, value: persistido.value });
          enriched = persistido.value;
        } else {
          docsAssertivaConsultados++;
          enriched = await this.consultarAssertivaComRetry(doc);
          if (enriched.telefones.length > 0 || enriched.emails.length > 0) {
            const expiresAt = this.assertivaCacheExpiresAt();
            this.assertivaCache.set(doc, { expiresAt, value: enriched });
            await this.salvarAssertivaCachePersistente(doc, enriched, expiresAt);
          }
        }
      }
      processadosAssertiva++;
      if (processadosAssertiva % 10 === 0 || processadosAssertiva === totalDocs) {
        const percentual = 10 + Math.round((processadosAssertiva / totalDocs) * 80);
        const progresso = { processados: processadosAssertiva, total: totalDocs, fase: 'ASSERTIVA' as const, percentual };
        atualizarProgresso(runId, progresso);
        realtimeService.emit('mineracao:progresso', { runId, ...progresso });
      }
      return { doc, enriched };
    });
    for (const item of enriquecidos) enrichMap.set(item.doc, item.enriched);

    const contatosPorDocumento = new Map<string, ContatoMinerado>();

    for (const p of base) {
      const doc = this.normalizarDoc(p.cpfCnpj);
      const enriched = doc ? enrichMap.get(doc) : undefined;
      const telefones = this.normalizarTelefones(enriched?.telefones || []);
      if (telefones.length === 0) continue;
      const key = doc || telefones[0];
      const existente = contatosPorDocumento.get(key);
      if (existente) {
        existente.telefones = this.normalizarTelefones([...existente.telefones, ...telefones]);
        if (!existente.telefone) existente.telefone = existente.telefones[0] || telefones[0];
        continue;
      }
      contatosPorDocumento.set(key, {
        nome: p.nome,
        telefone: telefones[0],
        telefones,
        cpfCnpj: doc,
        endereco: p.endereco,
        bairro: p.bairro || input.termo,
      });
    }

    const consolidados = [...contatosPorDocumento.values()];

    // Contabiliza CPFs que Assertiva não retornou nenhum telefone
    const docsSemTelefone = docs.filter((d) => {
      const e = enrichMap.get(d);
      return !e || e.telefones.length === 0;
    }).length;

    if (consolidados.length === 0) {
      throw new Error('ASSERTIVA_SEM_TELEFONES_UTEIS');
    }
    logger.info(`mineracao.concluida modo=${input.modo} termo="${input.termo}" iptusProcessados=${iptus.length} proprietarios=${base.length} semCpf=${imoveisSemCpf} docs=${docs.length} cacheHit=${docsCacheHit} assertivaConsultas=${docsAssertivaConsultados} semTelefone=${docsSemTelefone} contatos=${consolidados.length}`);
    return {
      contatos: consolidados,
      totalImoveis: base.length,
      totalIptusEncontrados: iptus.length,
      totalIptusProcessados: iptus.length,
      proprietariosEncontrados: base.length,
      imoveisSemCpf,
      docsConsultados: docs.length,
      docsCacheHit,
      docsAssertivaConsultados,
      docsSemTelefone,
      falhasScraper: 0,
    };
  }


  private async consultarMapaPrefeitura(where: string, resultRecordCount: number, resultOffset: number) {
    const url = 'https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_BaseTeste/FeatureServer/3/query';
    const params = new URLSearchParams({
      f: 'json',
      where,
      outFields: 'OBJECTID,nrinscr,instatus,inposfisc,cdlogradou,tplogradou,nmlogradou,nrimovel,incompl,nrquadra,nrlote,cdbairro,nmbairro,cdedificio,nmedificio',
      returnGeometry: 'true',
      orderByFields: 'OBJECTID',
      resultRecordCount: String(resultRecordCount),
      resultOffset: String(resultOffset),
    });
    const { data } = await axios.get(`${url}?${params.toString()}`, { timeout: 30000 });
    const features = Array.isArray(data?.features) ? data.features : [];
    const wkid = data?.spatialReference?.wkid ?? 31982;
    return features.map((f: any) => {
      const attrs = (f.attributes || {}) as ImovelPrefeituraAttrs;
      const geo = f.geometry;
      if (geo?.rings) {
        const c = centroidePoligono(geo.rings as number[][][]);
        if (c) {
          const wgs = wkid === 4326
            ? { lat: c.y, lng: c.x }
            : utmParaWgs84(c.x, c.y);
          attrs._latitude = wgs.lat;
          attrs._longitude = wgs.lng;
        }
      }
      return attrs;
    }) as ImovelPrefeituraAttrs[];
  }

  private async salvarImoveisPrefeitura(imoveis: ImovelPrefeituraAttrs[]) {
    let salvos = 0;
    for (const imovel of imoveis) {
      const nrinscr = this.str(imovel.nrinscr);
      if (!nrinscr) continue;
      await prisma.imovelPrefeitura.upsert({
        where: { nrinscr },
        update: this.imovelAttrsParaPrisma(imovel),
        create: {
          nrinscr,
          ...this.imovelAttrsParaPrisma(imovel),
        },
      });
      salvos++;
    }
    return salvos;
  }

  private imovelAttrsParaPrisma(imovel: ImovelPrefeituraAttrs) {
    return {
      objectId: this.num(imovel.OBJECTID),
      instatus: this.num(imovel.instatus),
      inposfisc: this.num(imovel.inposfisc),
      cdlogradou: this.num(imovel.cdlogradou),
      tplogradou: this.str(imovel.tplogradou),
      nmlogradou: this.str(imovel.nmlogradou),
      nrimovel: this.str(imovel.nrimovel),
      incompl: this.str(imovel.incompl),
      nrquadra: this.str(imovel.nrquadra),
      nrlote: this.str(imovel.nrlote),
      cdbairro: this.num(imovel.cdbairro),
      nmbairro: this.str(imovel.nmbairro),
      cdedificio: this.num(imovel.cdedificio),
      nmedificio: this.str(imovel.nmedificio),
      latitude: imovel._latitude ?? null,
      longitude: imovel._longitude ?? null,
      raw: imovel as Prisma.InputJsonValue,
    };
  }

  private async consultarAssertivaComRetry(doc: string): Promise<{ telefones: string[]; emails: string[] }> {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.consultarAssertiva(doc);
      } catch (err: any) {
        const status = err?.response?.status ?? (err?.message?.includes('429') ? 429 : null);
        if (status === 429 && tentativa < 2) {
          const retryAfter = parseInt(String(err?.response?.headers?.['retry-after'] ?? '10'), 10);
          logger.warn(`mineracao.assertiva_rate_limit doc=${this.mascararDoc(doc)} tentativa=${tentativa + 1} aguardando=${retryAfter}s`);
          await sleep(retryAfter * 1000);
          continue;
        }
        logger.warn(`mineracao.assertiva_falha_final doc=${this.mascararDoc(doc)} tentativa=${tentativa + 1} erro=${err?.message}`);
        return { telefones: [], emails: [] };
      }
    }
    return { telefones: [], emails: [] };
  }

  private async consultarAssertiva(doc: string) {
    const token = await this.assertivaToken();
    if (!token) return { telefones: [], emails: [] };
    const isCpf = doc.length === 11;
    const endpoint = isCpf
      ? 'https://api.assertivasolucoes.com.br/localize/v3/cpf'
      : 'https://api.assertivasolucoes.com.br/localize/v3/cnpj';
    const query = new URLSearchParams({
      [isCpf ? 'cpf' : 'cnpj']: doc,
      idFinalidade: this.assertivaIdFinalidade(),
    });

    try {
      const { data } = await axios.get(`${endpoint}?${query.toString()}`, {
        timeout: 30000,
        headers: { Authorization: `Bearer ${token}` },
      });
      const resposta = data?.resposta;
      if (typeof resposta === 'string' && /par[aâ]metros obrigat[oó]rios/i.test(resposta)) {
        throw new Error('ASSERTIVA_PARAMETROS_INVALIDOS');
      }
      return {
        telefones: this.extrairTelefonesAssertiva(data),
        emails: this.extrairEmailsAssertiva(data),
      };
    } catch (error: any) {
      if (error instanceof Error && error.message === 'ASSERTIVA_PARAMETROS_INVALIDOS') {
        throw error;
      }
      const status = error?.response?.status;
      const code = error?.response?.data?.codigo || error?.response?.data?.code || error?.code || status || 'erro';
      logger.warn(`mineracao.assertiva_falha doc=${this.mascararDoc(doc)} erro=${code}`);
      throw new Error(`ASSERTIVA_CONSULTA_FALHOU:${code}`);
    }
  }

  private async assertivaToken() {
    if (this.assertivaTokenCache && this.assertivaTokenCache.expiresAt > Date.now()) {
      return this.assertivaTokenCache.token;
    }

    const clientId = process.env.ASSERTIVA_CLIENT_ID;
    const clientSecret = process.env.ASSERTIVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('ASSERTIVA_NAO_CONFIGURADA');
    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    try {
      const { data } = await axios.post('https://api.assertivasolucoes.com.br/oauth2/v3/token', body.toString(), {
        timeout: 20000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basic}`,
        },
      });
      if (!data?.access_token) throw new Error('ASSERTIVA_TOKEN_AUSENTE');
      const expiresIn = Number(data.expires_in || 3600);
      this.assertivaTokenCache = { token: data.access_token, expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000 };
      return data.access_token;
    } catch (error: any) {
      const code = error?.response?.data?.error || error?.code || 'erro';
      throw new Error(code === 'invalid_request' ? 'ASSERTIVA_CREDENCIAIS_INVALIDAS' : `ASSERTIVA_AUTH_FALHOU:${code}`);
    }
  }

  private assertivaIdFinalidade() {
    const value = Number(process.env.ASSERTIVA_ID_FINALIDADE || 1);
    if (!Number.isFinite(value) || value <= 0) return '1';
    return String(Math.trunc(value));
  }

  private assertivaCacheTtlDias() {
    const value = Number(process.env.ASSERTIVA_CACHE_TTL_DIAS || 365);
    return Math.max(1, Number.isFinite(value) ? Math.trunc(value) : 365);
  }

  private assertivaCacheExpiresAt() {
    return Date.now() + this.assertivaCacheTtlDias() * 24 * 60 * 60 * 1000;
  }

  private async buscarAssertivaCachePersistente(doc: string) {
    const cached = await prisma.assertivaConsultaCache.findUnique({ where: { cpfCnpj: doc } });
    if (!cached || cached.expiraEm.getTime() <= Date.now()) return null;
    return {
      expiresAt: cached.expiraEm.getTime(),
      value: {
        telefones: this.normalizarTelefones(this.arrayJsonStrings(cached.telefones)),
        emails: this.arrayJsonStrings(cached.emails),
      },
    };
  }

  private async salvarAssertivaCachePersistente(doc: string, value: { telefones: string[]; emails: string[] }, expiresAt: number, raw?: unknown) {
    await prisma.assertivaConsultaCache.upsert({
      where: { cpfCnpj: doc },
      update: {
        tipoDocumento: doc.length === 11 ? 'CPF' : 'CNPJ',
        telefones: this.normalizarTelefones(value.telefones) as Prisma.InputJsonValue,
        emails: value.emails as Prisma.InputJsonValue,
        raw: (raw || null) as Prisma.InputJsonValue,
        consultadoEm: new Date(),
        expiraEm: new Date(expiresAt),
      },
      create: {
        cpfCnpj: doc,
        tipoDocumento: doc.length === 11 ? 'CPF' : 'CNPJ',
        telefones: this.normalizarTelefones(value.telefones) as Prisma.InputJsonValue,
        emails: value.emails as Prisma.InputJsonValue,
        raw: (raw || null) as Prisma.InputJsonValue,
        expiraEm: new Date(expiresAt),
      },
    });
  }

  private arrayJsonStrings(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item || '')).filter(Boolean);
  }

  private extrairTelefonesAssertiva(data: any) {
    const telefones = new Set<string>();
    const roots = [
      data?.resposta?.feedbackTelefones,
      data?.resposta?.telefones,
      data?.resposta?.dadosCadastrais?.telefones,
      data?.resposta?.contatos?.telefones,
      data?.telefones,
    ];

    for (const root of roots) {
      this.coletarTelefonesAssertiva(root, telefones, true);
    }

    return [...telefones];
  }

  private coletarTelefonesAssertiva(value: any, output: Set<string>, contextoTelefone = false) {
    if (value === null || value === undefined) return;

    if (typeof value === 'string' || typeof value === 'number') {
      if (!contextoTelefone) return;
      const telefone = String(value).replace(/\D/g, '');
      if (telefone.length >= 10 && telefone.length <= 11) output.add(telefone);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) this.coletarTelefonesAssertiva(item, output, contextoTelefone);
      return;
    }

    if (typeof value !== 'object') return;

    const ddd = String(value.ddd || value.DDD || '').replace(/\D/g, '');
    const numero = String(value.numero || value.telefone || value.fone || value.celular || '').replace(/\D/g, '');
    if (ddd && numero) {
      const telefone = `${ddd}${numero}`;
      if (telefone.length >= 10 && telefone.length <= 11) output.add(telefone);
    }

    for (const [key, child] of Object.entries(value)) {
      const normalizedKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const isPhoneKey = /(telefone|fone|celular|whatsapp|movel|moveis|fixo|fixos)/.test(normalizedKey);
      this.coletarTelefonesAssertiva(child, output, contextoTelefone || isPhoneKey);
    }
  }

  private extrairEmailsAssertiva(data: any) {
    const emails = new Set<string>();
    const roots = [
      data?.resposta?.emails,
      data?.resposta?.email,
      data?.resposta?.contatos?.emails,
      data?.emails,
    ];

    for (const root of roots) {
      this.coletarEmailsAssertiva(root, emails);
    }

    return [...emails];
  }

  private coletarEmailsAssertiva(value: any, output: Set<string>) {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') {
      const matches = value.match(/[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+/g) || [];
      for (const email of matches) output.add(email.toLowerCase());
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) this.coletarEmailsAssertiva(item, output);
      return;
    }
    if (typeof value !== 'object') return;
    for (const child of Object.values(value)) this.coletarEmailsAssertiva(child, output);
  }

  private mascararDoc(doc: string) {
    const only = doc.replace(/\D/g, '');
    if (only.length <= 4) return '****';
    return `${only.slice(0, 3)}***${only.slice(-2)}`;
  }

  private async mapLimit<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>) {
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex++;
        results[currentIndex] = await worker(items[currentIndex], currentIndex);
      }
    });

    await Promise.all(runners);
    return results;
  }

  private normalizarDoc(doc?: string | null) {
    const only = String(doc || '').replace(/\D/g, '');
    if (only.length === 11 || only.length === 14) return only;
    return null;
  }

  private normalizarTelefones(telefones: Array<string | null | undefined>) {
    return [...new Set(
      telefones
        .map((telefone) => String(telefone || '').replace(/\D/g, ''))
        .filter((telefone) => telefone.length >= 10 && telefone.length <= 11)
    )].sort((a, b) => Number(this.telefonePreferencial(b)) - Number(this.telefonePreferencial(a)));
  }

  private telefonePreferencial(telefone: string) {
    return telefone.length === 11 && telefone[2] === '9';
  }

  private telefonesDoLead(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) return [];
    return this.normalizarTelefones(value.map((telefone) => String(telefone || '')));
  }

  private async telefoneDisponivelParaLead(telefone: string, leadId: string) {
    const existente = await prisma.leadMarketing.findUnique({ where: { telefone }, select: { id: true } });
    return !existente || existente.id === leadId;
  }

  private async invalidarLeadsLegadosDuplicados(leadPrincipalId: string, telefones: string[]) {
    if (telefones.length === 0) return;
    await prisma.leadMarketing.updateMany({
      where: {
        id: { not: leadPrincipalId },
        cpfCnpj: null,
        telefone: { in: telefones },
      },
      data: { status: LeadStatus.INVALIDO },
    });
  }

  private async invalidarLeadsLegadosDuplicadosPorCpf(cpfCnpj: string | null, telefones: string[]) {
    if (!cpfCnpj) return;
    const principal = await prisma.leadMarketing.findUnique({ where: { cpfCnpj }, select: { id: true } });
    if (!principal) return;
    await this.invalidarLeadsLegadosDuplicados(principal.id, telefones);
  }


  async coberturaMapa() {
    const rows = await prisma.$queryRaw<Array<{
      bairro: string;
      total_imoveis: bigint;
      total_leads: bigint;
      total_clientes: bigint;
      lat: number | null;
      lng: number | null;
    }>>`
      SELECT
        i.nmbairro AS bairro,
        COUNT(DISTINCT i.nrinscr) AS total_imoveis,
        COUNT(DISTINCT l.id) AS total_leads,
        COUNT(DISTINCT c.telefone) AS total_clientes,
        AVG(i.latitude) AS lat,
        AVG(i.longitude) AS lng
      FROM imoveis_prefeitura i
      LEFT JOIN leads_marketing l ON l.bairro = i.nmbairro
      LEFT JOIN clientes c ON c.bairro = i.nmbairro
      WHERE i.nmbairro IS NOT NULL
      GROUP BY i.nmbairro
      ORDER BY total_imoveis DESC
      LIMIT 200
    `;

    return rows.map((r) => {
      const totalImoveis = Number(r.total_imoveis);
      const totalLeads = Number(r.total_leads);
      const totalClientes = Number(r.total_clientes);
      const taxaPenetracao = totalImoveis > 0 ? totalClientes / totalImoveis : 0;
      let nivelCobertura: 'VIRGEM' | 'BAIXO' | 'MEDIO' | 'ALTO' = 'VIRGEM';
      if (taxaPenetracao >= 0.1) nivelCobertura = 'ALTO';
      else if (taxaPenetracao >= 0.03) nivelCobertura = 'MEDIO';
      else if (taxaPenetracao > 0) nivelCobertura = 'BAIXO';
      return {
        nome: r.bairro,
        totalImoveis,
        totalLeads,
        totalClientes,
        taxaPenetracao: Math.round(taxaPenetracao * 1000) / 1000,
        centroide: r.lat ? { lat: r.lat, lng: r.lng } : null,
        nivelCobertura,
      };
    });
  }

  async analytics(periodo: '30d' | '90d' | 'all') {
    const diasAtras = periodo === '30d' ? 30 : periodo === '90d' ? 90 : null;
    const dataInicio = diasAtras ? new Date(Date.now() - diasAtras * 86400000) : new Date(0);

    const [totalLeads, totalConvertidos, porBairroRaw, porCampanhaRaw, evolucaoRaw] = await Promise.all([
      prisma.leadMarketing.count({ where: { criadoEm: { gte: dataInicio } } }),
      prisma.leadMarketing.count({ where: { status: 'CONVERTIDO', criadoEm: { gte: dataInicio } } }),
      prisma.$queryRaw<Array<{ bairro: string; leads: bigint; convertidos: bigint }>>`
        SELECT
          bairro,
          COUNT(*) AS leads,
          COUNT(CASE WHEN status = 'CONVERTIDO' THEN 1 END) AS convertidos
        FROM leads_marketing
        WHERE bairro IS NOT NULL AND criado_em >= ${dataInicio}
        GROUP BY bairro
        ORDER BY convertidos DESC, leads DESC
        LIMIT 20
      `,
      prisma.$queryRaw<Array<{ id: string; nome: string; enviados: bigint; convertidos: bigint }>>`
        SELECT
          c.id,
          c.nome,
          COUNT(DISTINCT d.id) AS enviados,
          COUNT(DISTINCT CASE WHEN l.status = 'CONVERTIDO' THEN l.id END) AS convertidos
        FROM campanhas_marketing c
        LEFT JOIN campanhas_destinatarios d ON d.campanha_id = c.id
        LEFT JOIN leads_marketing l ON l.id = d.lead_id
        WHERE c.criado_em >= ${dataInicio}
        GROUP BY c.id, c.nome
        ORDER BY convertidos DESC
        LIMIT 20
      `,
      prisma.$queryRaw<Array<{ semana: string; novos_leads: bigint; conversoes: bigint }>>`
        SELECT
          TO_CHAR(DATE_TRUNC('week', criado_em), 'IYYY-"W"IW') AS semana,
          COUNT(*) AS novos_leads,
          COUNT(CASE WHEN status = 'CONVERTIDO' THEN 1 END) AS conversoes
        FROM leads_marketing
        WHERE criado_em >= ${dataInicio}
        GROUP BY semana
        ORDER BY semana ASC
      `,
    ]);

    const taxaConversaoGeral = totalLeads > 0 ? ((totalConvertidos / totalLeads) * 100).toFixed(1) + '%' : '0%';

    return {
      periodo,
      resumo: {
        totalLeads,
        totalConvertidos,
        taxaConversaoGeral,
      },
      porBairro: porBairroRaw.map((r) => ({
        bairro: r.bairro,
        leads: Number(r.leads),
        convertidos: Number(r.convertidos),
        taxaConversao: Number(r.leads) > 0 ? ((Number(r.convertidos) / Number(r.leads)) * 100).toFixed(1) + '%' : '0%',
      })),
      porCampanha: porCampanhaRaw.map((r) => ({
        campanhaId: r.id,
        nome: r.nome,
        enviados: Number(r.enviados),
        convertidos: Number(r.convertidos),
        roi: Number(r.enviados) > 0 ? (Number(r.convertidos) / Number(r.enviados) * 100).toFixed(1) + '%' : '0%',
      })),
      evolucaoSemanal: evolucaoRaw.map((r) => ({
        semana: r.semana,
        novosLeads: Number(r.novos_leads),
        conversoes: Number(r.conversoes),
      })),
    };
  }

  async sincronizarCoordenadas(runId: string): Promise<{ atualizados: number; total: number }> {
    const total = await prisma.imovelPrefeitura.count({ where: { latitude: null, objectId: { not: null } } });
    let atualizados = 0;
    let offset = 0;
    const lote = 300;

    while (true) {
      const rows = await prisma.imovelPrefeitura.findMany({
        where: { latitude: null, objectId: { not: null } },
        select: { objectId: true, nrinscr: true },
        orderBy: { objectId: 'asc' },
        take: lote,
        skip: offset,
      });
      if (rows.length === 0) break;

      const minId = rows[0].objectId!;
      const maxId = rows[rows.length - 1].objectId!;
      try {
        const features = await this.consultarMapaPrefeitura(
          `OBJECTID >= ${minId} AND OBJECTID <= ${maxId}`,
          lote,
          0,
        );
        for (const f of features) {
          if (f._latitude != null && f.nrinscr) {
            await prisma.imovelPrefeitura.update({
              where: { nrinscr: String(f.nrinscr) },
              data: { latitude: f._latitude, longitude: f._longitude },
            }).catch(() => {});
            atualizados++;
          }
        }
      } catch (err) {
        logger.warn(`sincronizarCoordenadas lote objectId ${minId}-${maxId} falhou:`, err);
      }

      atualizarProgresso(runId, { processados: offset, total, fase: 'SCRAPING', percentual: Math.round((offset / total) * 100) });
      offset += lote;
      await sleep(200); // respeitoso com a API da prefeitura
    }

    return { atualizados, total };
  }

  private str(value: unknown) {
    const text = String(value ?? '').trim();
    return text || null;
  }

  private num(value: unknown) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
}

export default new MineracaoService();
