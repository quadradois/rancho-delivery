/**
 * Testes de regressão para conversacao.service.
 *
 * Cobrem os bugs corrigidos:
 * - eLojaAberta() deve ler o status do banco (LojaConfiguracao.status)
 *   e não usar horário hardcoded.
 * - processarRespostaWhatsApp() deve SEMPRE enviar a mensagem, inclusive
 *   quando humanRequired=true (a mensagem de despedida precisa chegar ao usuário).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '../../config/database';
import { responderLead, processarRespostaWhatsApp } from '../../services/conversacao.service';
import evolutionService from '../../services/evolution.service';

vi.mock('../../services/evolution.service', () => ({
  default: { enviarMensagem: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../services/realtime.service', () => ({
  default: { emit: vi.fn() },
}));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Olá! Como posso ajudar?' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    };
  },
}));
vi.mock('../../services/iaContexto.service', () => ({
  default: {
    construirContextoIA: vi.fn().mockResolvedValue({
      nomeAtendente: 'Ana',
      systemPromptBase: 'Cardápio: X',
    }),
  },
}));
vi.mock('../../agentes/tools/sessao', () => ({
  obterSessaoAtiva: vi.fn().mockResolvedValue(null),
  criarOuObterSessao: vi.fn(),
  atualizarItens: vi.fn(),
  atualizarEntrega: vi.fn(),
  finalizarSessao: vi.fn(),
  cancelarSessao: vi.fn(),
}));
vi.mock('../../agentes/cache', () => ({
  conversationCache: {
    getHistory: vi.fn().mockResolvedValue([]),
    setHistory: vi.fn().mockResolvedValue(undefined),
  },
}));

const RAW_JID_SUFFIX = '@s.whatsapp.net';

// Cada teste usa um telefone único para evitar interferência do throttle map (estado de módulo)
let phoneCounter = 60000000000;
function novoTelefone() {
  return String(++phoneCounter);
}

function rawJid(telefone: string) {
  return `55${telefone}${RAW_JID_SUFFIX}`;
}

function mockLojaStatus(status: 'ABERTO' | 'FECHADO' | 'PAUSADO', mensagemPausado?: string) {
  vi.mocked(prisma.lojaConfiguracao.findFirst).mockResolvedValue({
    id: 'loja_principal',
    status,
    mensagemPausado: mensagemPausado ?? null,
  } as any);
}

function mockLeadExistente(telefone: string) {
  vi.mocked(prisma.cliente.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.leadMarketing.findFirst).mockResolvedValue({
    id: 'lead-1',
    nome: 'Ivonet',
    bairro: 'Setor Bueno',
    status: 'ATIVO',
    telefone,
  } as any);
  vi.mocked(prisma.mensagemLead.findMany).mockResolvedValue([]);
  vi.mocked(prisma.mensagemLead.create).mockResolvedValue({} as any);
  vi.mocked(prisma.leadMarketing.update).mockResolvedValue({} as any);
}

describe('conversacao.service — eLojaAberta (regressão)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responde normalmente quando loja está ABERTA no banco', async () => {
    const tel = novoTelefone();
    mockLojaStatus('ABERTO');
    mockLeadExistente(tel);

    const resultado = await responderLead(tel, 'Olá!', rawJid(tel));

    expect(resultado).not.toBeNull();
    expect(resultado?.humanRequired).toBe(false);
    expect(resultado?.mensagem).not.toMatch(/fechad|voltamos/i);
  });

  it('retorna mensagem de fechado com lead existente quando loja está FECHADA', async () => {
    const tel = novoTelefone();
    mockLojaStatus('FECHADO');
    mockLeadExistente(tel);

    const resultado = await responderLead(tel, 'Olá!', rawJid(tel));

    expect(resultado).not.toBeNull();
    expect(resultado?.mensagem).toMatch(/fechad|breve/i);
    expect(resultado?.humanRequired).toBe(false);
  });

  it('usa mensagemPausado customizada quando loja está PAUSADA', async () => {
    const tel = novoTelefone();
    const mensagemCustom = 'Voltamos às 18h! Pedidos pelo site: ranchodelivery.com.br';
    mockLojaStatus('PAUSADO', mensagemCustom);
    mockLeadExistente(tel);

    const resultado = await responderLead(tel, 'Olá!', rawJid(tel));

    expect(resultado?.mensagem).toBe(mensagemCustom);
  });

  it('usa mensagem padrão quando PAUSADO sem mensagemPausado', async () => {
    const tel = novoTelefone();
    mockLojaStatus('PAUSADO', undefined);
    mockLeadExistente(tel);

    const resultado = await responderLead(tel, 'Olá!', rawJid(tel));

    expect(resultado?.mensagem).toBe('Estamos fechados no momento. Voltamos em breve! 😊');
  });

  it('ignora mensagens de grupos (@g.us) independente do status da loja', async () => {
    const tel = novoTelefone();
    mockLojaStatus('ABERTO');

    const resultado = await responderLead(tel, 'Olá!', '120363123456789@g.us');

    expect(resultado).toBeNull();
    expect(prisma.lojaConfiguracao.findFirst).not.toHaveBeenCalled();
  });

  it('retorna null quando não há lead nem cliente cadastrado', async () => {
    const tel = novoTelefone();
    mockLojaStatus('ABERTO');
    vi.mocked(prisma.cliente.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.leadMarketing.findFirst).mockResolvedValue(null);

    const resultado = await responderLead(tel, 'Olá!', rawJid(tel));

    expect(resultado).toBeNull();
  });

  it('não responde a lead com status CONVERTIDO', async () => {
    const tel = novoTelefone();
    mockLojaStatus('ABERTO');
    vi.mocked(prisma.cliente.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.leadMarketing.findFirst).mockResolvedValue({
      id: 'lead-1',
      nome: 'Ivonet',
      bairro: 'Setor Bueno',
      status: 'CONVERTIDO',
      telefone: tel,
    } as any);

    const resultado = await responderLead(tel, 'Olá!', rawJid(tel));

    expect(resultado).toBeNull();
  });

  it('não chama a IA quando loja está FECHADA (regressão principal)', async () => {
    const tel = novoTelefone();
    mockLojaStatus('FECHADO');
    mockLeadExistente(tel);

    await responderLead(tel, 'Qualquer mensagem', rawJid(tel));

    // Prisma de mensagemLead.findMany (histórico para IA) não deve ser chamado
    expect(prisma.mensagemLead.findMany).not.toHaveBeenCalled();
  });
});

describe('processarRespostaWhatsApp — sempre envia a resposta da IA (regressão)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('chama evolutionService.enviarMensagem com a resposta gerada pela IA', async () => {
    const tel = novoTelefone();
    mockLojaStatus('ABERTO');
    mockLeadExistente(tel);

    // Mock da IA retorna texto sem "atendente humano" (humanRequired=false)
    await processarRespostaWhatsApp(tel, 'Olá, tem delivery?', rawJid(tel));

    expect(evolutionService.enviarMensagem).toHaveBeenCalledWith({
      numero: tel,
      mensagem: expect.any(String),
    });
  });

  it('não envia quando não há lead ou cliente (responderLead retorna null)', async () => {
    const tel = novoTelefone();
    mockLojaStatus('ABERTO');
    vi.mocked(prisma.cliente.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.leadMarketing.findFirst).mockResolvedValue(null);

    await processarRespostaWhatsApp(tel, 'Olá!', rawJid(tel));

    expect(evolutionService.enviarMensagem).not.toHaveBeenCalled();
  });
});
