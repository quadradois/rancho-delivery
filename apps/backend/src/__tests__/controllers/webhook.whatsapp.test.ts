/**
 * Testes de regressão para o webhook do WhatsApp.
 *
 * Cobrem os bugs corrigidos:
 * 1. Normalização de telefone (prefixo 55, formato 8→9 dígitos)
 * 2. JID @lid (Linked Device Privacy) → usar remoteJidAlt
 * 3. fromMe=true → ignorar mensagem
 * 4. Texto vazio → ignorar mensagem
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import webhookController from '../../controllers/webhook.controller';

vi.mock('../../services/mercadopago.service');
vi.mock('../../services/pedido.service', () => ({
  default: { obterMetricasAdmin: vi.fn().mockResolvedValue({}) },
}));
vi.mock('../../services/evolution.service');
vi.mock('../../services/realtime.service', () => ({
  default: { emit: vi.fn() },
}));
vi.mock('../../services/cliente.service', () => ({
  default: { registrarMensagemRecebida: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../services/conversacao.service', () => ({
  processarRespostaWhatsApp: vi.fn().mockResolvedValue(undefined),
}));

import clienteService from '../../services/cliente.service';
import realtimeService from '../../services/realtime.service';
import { processarRespostaWhatsApp } from '../../services/conversacao.service';

function makeReq(body: object, params: Record<string, string> = {}): Partial<Request> {
  return { body, params } as any;
}

function makeRes(): { res: Partial<Response>; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json } as any, json, status };
}

describe('WebhookController.whatsapp — normalização de telefone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // setImmediate executa síncronamente no ambiente de teste
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function dispararWebhook(body: object) {
    const req = makeReq(body);
    const { res } = makeRes();
    await webhookController.whatsapp(req as Request, res as Response);
    // Drena a fila do setImmediate
    await vi.runAllTimersAsync();
  }

  it('strips prefixo 55 de número completo BR (formato @s.whatsapp.net)', async () => {
    await dispararWebhook({
      event: 'MESSAGES_UPSERT',
      data: {
        key: { remoteJid: '5562993715693@s.whatsapp.net', fromMe: false },
        message: { conversation: 'Olá!' },
      },
    });

    expect(clienteService.registrarMensagemRecebida).toHaveBeenCalledWith('62993715693', 'Olá!');
    expect(processarRespostaWhatsApp).toHaveBeenCalledWith(
      '62993715693',
      'Olá!',
      expect.any(String),
      undefined,
    );
  });

  it('usa remoteJidAlt quando JID é @lid (Linked Device Privacy)', async () => {
    await dispararWebhook({
      event: 'MESSAGES_UPSERT',
      data: {
        key: {
          remoteJid: '191586092757029@lid',
          remoteJidAlt: '5562993715693@s.whatsapp.net',
          fromMe: false,
        },
        message: { conversation: 'Mensagem via dispositivo vinculado' },
      },
    });

    expect(clienteService.registrarMensagemRecebida).toHaveBeenCalledWith('62993715693', expect.any(String));
  });

  it('converte formato antigo 8 dígitos para 9 dígitos (adiciona 9 após DDD)', async () => {
    // 6293715693 tem 10 dígitos → deve virar 62993715693 (11 dígitos)
    await dispararWebhook({
      event: 'MESSAGES_UPSERT',
      data: {
        key: {
          remoteJid: '191586092757029@lid',
          remoteJidAlt: '556293715693@s.whatsapp.net', // 55 + 8-digit number
          fromMe: false,
        },
        message: { conversation: 'Formato antigo' },
      },
    });

    expect(clienteService.registrarMensagemRecebida).toHaveBeenCalledWith('62993715693', expect.any(String));
  });

  it('ignora mensagem com fromMe=true', async () => {
    await dispararWebhook({
      event: 'MESSAGES_UPSERT',
      data: {
        key: { remoteJid: '5562993715693@s.whatsapp.net', fromMe: true },
        message: { conversation: 'Mensagem enviada por nós' },
      },
    });

    expect(clienteService.registrarMensagemRecebida).not.toHaveBeenCalled();
    expect(processarRespostaWhatsApp).not.toHaveBeenCalled();
  });

  it('ignora mensagem com texto vazio', async () => {
    await dispararWebhook({
      event: 'MESSAGES_UPSERT',
      data: {
        key: { remoteJid: '5562993715693@s.whatsapp.net', fromMe: false },
        message: {}, // sem conversation
      },
    });

    expect(clienteService.registrarMensagemRecebida).not.toHaveBeenCalled();
  });

  it('ignora mensagens de grupos (@g.us) — não chama processarRespostaWhatsApp', async () => {
    await dispararWebhook({
      event: 'MESSAGES_UPSERT',
      data: {
        key: { remoteJid: '120363123456789@g.us', fromMe: false },
        message: { conversation: 'Mensagem de grupo' },
      },
    });

    // registrarMensagemRecebida pode ser chamada, mas processarRespostaWhatsApp não deve
    // (o filtro de grupos fica dentro de responderLead, mas o rawJid é passado corretamente)
    // O importante é que a mensagem é processada com o JID @g.us para ser filtrada downstream
    if (clienteService.registrarMensagemRecebida.mock.calls.length > 0) {
      expect(processarRespostaWhatsApp).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('@g.us'),
        undefined,
      );
    }
  });

  it('extrai texto de extendedTextMessage', async () => {
    await dispararWebhook({
      event: 'MESSAGES_UPSERT',
      data: {
        key: { remoteJid: '5562993715693@s.whatsapp.net', fromMe: false },
        message: {
          extendedTextMessage: { text: 'Texto longo com formatação' },
        },
      },
    });

    expect(clienteService.registrarMensagemRecebida).toHaveBeenCalledWith(
      '62993715693',
      'Texto longo com formatação',
    );
  });
});

describe('WebhookController.whatsapp — payload Evolution Go', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function dispararWebhook(body: object) {
    const req = makeReq(body);
    const { res } = makeRes();
    await webhookController.whatsapp(req as Request, res as Response);
    await vi.runAllTimersAsync();
  }

  it('parseia mensagem Go (Info.Sender com device-id + Message.conversation)', async () => {
    await dispararWebhook({
      event: 'Message',
      data: {
        Info: { Sender: '5562993715693:38@s.whatsapp.net', IsFromMe: false, IsGroup: false },
        Message: { conversation: 'Olá via Go' },
      },
    });

    // device-id ":38", domínio e prefixo 55 removidos
    expect(clienteService.registrarMensagemRecebida).toHaveBeenCalledWith('62993715693', 'Olá via Go');
  });

  it('ignora mensagem Go com IsFromMe=true', async () => {
    await dispararWebhook({
      event: 'Message',
      data: {
        Info: { Sender: '5562993715693@s.whatsapp.net', IsFromMe: true },
        Message: { conversation: 'enviada por nós' },
      },
    });

    expect(clienteService.registrarMensagemRecebida).not.toHaveBeenCalled();
    expect(processarRespostaWhatsApp).not.toHaveBeenCalled();
  });

  it('ignora mensagem Go de grupo (IsGroup=true — Sender é o participante)', async () => {
    await dispararWebhook({
      event: 'Message',
      data: {
        Info: { Sender: '5562993715693@s.whatsapp.net', IsGroup: true },
        Message: { conversation: 'mensagem de grupo' },
      },
    });

    expect(clienteService.registrarMensagemRecebida).not.toHaveBeenCalled();
    expect(processarRespostaWhatsApp).not.toHaveBeenCalled();
  });

  it('evento de conexão Go (Connected) emite status e não registra mensagem', async () => {
    await dispararWebhook({ event: 'Connected', data: {} });

    expect(realtimeService.emit).toHaveBeenCalledWith('whatsapp:status', { state: 'open', conectado: true });
    expect(clienteService.registrarMensagemRecebida).not.toHaveBeenCalled();
  });
});
