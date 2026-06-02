import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verificarEntrada, resetarSpam } from '../../agentes/guardrails';
import prisma from '../../config/database';

describe('guardrails.verificarEntrada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Blacklist', () => {
    it('bloqueia telefone na blacklist', async () => {
      vi.mocked(prisma.blacklistWhatsApp.findUnique).mockResolvedValue({
        telefone: '62999990000',
        motivo: 'spam',
        criadoEm: new Date(),
      });

      const r = await verificarEntrada('62999990000', 'olá');
      expect(r.passou).toBe(false);
      expect((r as any).motivo).toBe('BLACKLIST');
    });

    it('permite telefone fora da blacklist', async () => {
      vi.mocked(prisma.blacklistWhatsApp.findUnique).mockResolvedValue(null);

      const r = await verificarEntrada('62999990001', 'olá');
      expect(r.passou).toBe(true);
    });
  });

  describe('Spam', () => {
    it('bloqueia após 5 mensagens na mesma janela de 60s', async () => {
      vi.mocked(prisma.blacklistWhatsApp.findUnique).mockResolvedValue(null);
      const tel = '62900000001';
      resetarSpam(tel);

      for (let i = 0; i < 5; i++) {
        const r = await verificarEntrada(tel, 'ping');
        expect(r.passou).toBe(true);
      }

      // 6ª mensagem → bloqueada
      const r = await verificarEntrada(tel, 'ping');
      expect(r.passou).toBe(false);
      expect((r as any).motivo).toBe('SPAM');
    });
  });

  describe('Opt-out', () => {
    it.each([
      'não me mande mais nada',
      'me tira da lista',
      'sai da lista',
      'sair da lista',
      'para de me enviar mensagens',
      'não quero mais receber',
    ])('detecta opt-out em: "%s"', async (texto) => {
      vi.mocked(prisma.blacklistWhatsApp.findUnique).mockResolvedValue(null);
      const tel = `629999${Math.random().toString().slice(2, 7)}`;
      resetarSpam(tel);

      const r = await verificarEntrada(tel, texto);
      expect(r.passou).toBe(false);
      expect((r as any).motivo).toBe('OPT_OUT');
      expect((r as any).resposta?.toLowerCase()).toContain('não vou mais');
    });
  });

  describe('Comprimento', () => {
    it('bloqueia texto maior que 2000 chars', async () => {
      vi.mocked(prisma.blacklistWhatsApp.findUnique).mockResolvedValue(null);
      const tel = '62900000099';
      resetarSpam(tel);

      const r = await verificarEntrada(tel, 'a'.repeat(2001));
      expect(r.passou).toBe(false);
      expect((r as any).motivo).toBe('TEXTO_MUITO_LONGO');
    });

    it('permite texto com exatamente 2000 chars', async () => {
      vi.mocked(prisma.blacklistWhatsApp.findUnique).mockResolvedValue(null);
      const tel = '62900000098';
      resetarSpam(tel);

      const r = await verificarEntrada(tel, 'a'.repeat(2000));
      expect(r.passou).toBe(true);
    });
  });
});
