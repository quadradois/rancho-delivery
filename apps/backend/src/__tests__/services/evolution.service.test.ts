import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EvolutionService } from '../../services/evolution.service';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => apiMock),
  },
}));

vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../config/database', () => ({
  default: {
    conexaoWhatsApp: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('EvolutionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EVOLUTION_API_URL = 'https://evolution.example.test';
    process.env.EVOLUTION_API_KEY = 'global-key';
    process.env.WHATSAPP_WEBHOOK_URL = 'https://rancho.delivery/webhook';
    process.env.WHATSAPP_WEBHOOK_EVENTS = 'MESSAGE,CONNECTION';
  });

  it('cria instância enviando token per-instância exigido pela Evolution', async () => {
    apiMock.post.mockResolvedValue({ data: { message: 'success' } });

    const service = new EvolutionService();
    const criada = await service.criarInstancia('EliezerAdmin');

    expect(criada).toBe(true);
    expect(apiMock.post).toHaveBeenCalledWith(
      '/instance/create',
      {
        name: 'EliezerAdmin',
        token: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      { headers: { apikey: 'global-key' } },
    );
  });

  it('garante instância e normaliza o QR Code retornado pela Evolution', async () => {
    apiMock.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'inst-1', name: 'EliezerAdmin', token: 'instance-token' }],
        },
      })
      .mockResolvedValueOnce({
        data: { data: { Connected: true, LoggedIn: false, Name: 'EliezerAdmin' } },
      })
      .mockResolvedValueOnce({ data: { data: { Qrcode: 'abc123' } } });
    apiMock.post.mockResolvedValue({ data: { message: 'success' } });

    const service = new EvolutionService();
    const setup = await service.garantirInstanciaEObterQrCode('EliezerAdmin');

    expect(apiMock.post).toHaveBeenCalledWith(
      '/instance/connect',
      { webhookUrl: 'https://rancho.delivery/webhook', subscribe: ['MESSAGE', 'CONNECTION'] },
      { headers: { apikey: 'instance-token' } },
    );
    expect(setup).toEqual({
      instanceName: 'EliezerAdmin',
      state: 'close',
      conectado: false,
      qrCodeBase64: 'data:image/png;base64,abc123',
    });
  });

  it('retorna false quando a criação da instância falha', async () => {
    apiMock.post.mockRejectedValue({ response: { data: { error: 'token inválido' } } });

    const service = new EvolutionService();
    const criada = await service.criarInstancia('EliezerAdmin');

    expect(criada).toBe(false);
  });

  it('não pede QR quando a instância já está conectada', async () => {
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'inst-1', name: 'EliezerAdmin', token: 'instance-token' }],
        },
      })
      .mockResolvedValueOnce({
        data: { data: { Connected: true, LoggedIn: true, Name: '' } },
      });

    const service = new EvolutionService();
    const setup = await service.garantirInstanciaEObterQrCode('EliezerAdmin');

    expect(apiMock.post).not.toHaveBeenCalled();
    expect(setup).toEqual({
      instanceName: 'EliezerAdmin',
      state: 'open',
      conectado: true,
      qrCodeBase64: null,
    });
  });

  it('preserva QR Code que já vem como data URI', async () => {
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'inst-1', name: 'EliezerAdmin', token: 'instance-token' }],
        },
      })
      .mockResolvedValueOnce({
        data: { Qrcode: 'data:image/png;base64,abc123' },
      });

    const service = new EvolutionService();
    const qr = await service.obterQrCode('EliezerAdmin');

    expect(qr).toBe('data:image/png;base64,abc123');
  });

  it('retorna null quando a Evolution não envia QR Code', async () => {
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'inst-1', name: 'EliezerAdmin', token: 'instance-token' }],
        },
      })
      .mockResolvedValueOnce({ data: { data: {} } });

    const service = new EvolutionService();
    const qr = await service.obterQrCode('EliezerAdmin');

    expect(qr).toBeNull();
  });

  it('retorna false quando a configuração da conexão falha', async () => {
    process.env.WHATSAPP_WEBHOOK_URL = '';
    apiMock.get.mockResolvedValueOnce({
      data: {
        data: [{ id: 'inst-1', name: 'EliezerAdmin', token: 'instance-token' }],
      },
    });
    apiMock.post.mockRejectedValue({ response: { data: { error: 'offline' } } });

    const service = new EvolutionService();
    const configurada = await service.configurarConexao('EliezerAdmin');

    expect(configurada).toBe(false);
    expect(apiMock.post).toHaveBeenCalledWith(
      '/instance/connect',
      { webhookUrl: undefined, subscribe: ['MESSAGE', 'CONNECTION'] },
      { headers: { apikey: 'instance-token' } },
    );
  });

  it('mapeia detalhes da instância conectada', async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        data: [{
          id: 'inst-1',
          name: 'EliezerAdmin',
          token: 'instance-token',
          connected: true,
          jid: '5562999990000:12@s.whatsapp.net',
          createdAt: '2026-06-06T18:57:59.123211-03:00',
        }],
      },
    });

    const service = new EvolutionService();
    const detalhes = await service.obterDetalhesInstancia('EliezerAdmin');

    expect(detalhes).toMatchObject({
      instanceName: 'EliezerAdmin',
      existe: true,
      conectado: true,
      state: 'open',
      telefone: '5562999990000',
      nomePerfil: 'EliezerAdmin',
      ultimaConexao: '2026-06-06T18:57:59.123211-03:00',
    });
  });
});
