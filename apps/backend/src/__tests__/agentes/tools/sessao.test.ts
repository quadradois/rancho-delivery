import { describe, it, expect, vi, beforeEach } from 'vitest';
import { obterSessaoAtiva, criarOuObterSessao, atualizarItens, finalizarSessao } from '../../../agentes/tools/sessao';
import prisma from '../../../config/database';

const TEL = '62999990001';
const SESSAO_BASE = {
  id: 'sess-1',
  clienteTelefone: TEL,
  status: 'ATIVA',
  itens: [],
  subtotal: '0',
  taxaEntrega: null,
  endereco: null,
  bairro: null,
  cep: null,
  lat: null,
  lng: null,
  criadoEm: new Date(),
  ultimaInteracaoEm: new Date(),
  expiradaEm: null,
  pedidoId: null,
};

describe('sessao', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('obterSessaoAtiva', () => {
    it('retorna null quando não há sessão ativa', async () => {
      vi.mocked(prisma.sessaoPedidoWhatsApp.findFirst).mockResolvedValue(null);
      const r = await obterSessaoAtiva(TEL);
      expect(r).toBeNull();
    });

    it('retorna sessão ativa com itens deserializados', async () => {
      const itens = [{ produtoId: 'p1', nome: 'Marmita', preco: 25, quantidade: 1 }];
      vi.mocked(prisma.sessaoPedidoWhatsApp.findFirst).mockResolvedValue({
        ...SESSAO_BASE,
        itens,
        subtotal: '25.00',
      } as any);

      const r = await obterSessaoAtiva(TEL);
      expect(r).not.toBeNull();
      expect(r!.itens).toHaveLength(1);
      expect(r!.subtotal).toBe(25);
    });
  });

  describe('criarOuObterSessao', () => {
    it('cria nova sessão quando não existe ativa', async () => {
      vi.mocked(prisma.sessaoPedidoWhatsApp.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.sessaoPedidoWhatsApp.create).mockResolvedValue({
        ...SESSAO_BASE,
      } as any);

      const r = await criarOuObterSessao(TEL);
      expect(prisma.sessaoPedidoWhatsApp.create).toHaveBeenCalled();
      expect(r.itens).toEqual([]);
    });

    it('retorna sessão existente sem criar nova', async () => {
      vi.mocked(prisma.sessaoPedidoWhatsApp.findFirst).mockResolvedValue({
        ...SESSAO_BASE,
      } as any);

      await criarOuObterSessao(TEL);
      expect(prisma.sessaoPedidoWhatsApp.create).not.toHaveBeenCalled();
    });
  });

  describe('atualizarItens', () => {
    it('calcula subtotal corretamente e persiste', async () => {
      const itens = [
        { produtoId: 'p1', nome: 'Marmita Frango', preco: 25, quantidade: 2 },
        { produtoId: 'p2', nome: 'Refrigerante', preco: 8, quantidade: 1 },
      ];
      vi.mocked(prisma.sessaoPedidoWhatsApp.update).mockResolvedValue({
        ...SESSAO_BASE,
        itens,
        subtotal: '58.00',
      } as any);

      const r = await atualizarItens('sess-1', itens);
      expect(r.subtotal).toBe(58); // 2*25 + 1*8
    });
  });

  describe('finalizarSessao', () => {
    it('marca sessão como FINALIZADA com pedidoId', async () => {
      vi.mocked(prisma.sessaoPedidoWhatsApp.update).mockResolvedValue({} as any);
      await finalizarSessao('sess-1', 'pedido-abc');
      expect(prisma.sessaoPedidoWhatsApp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FINALIZADA', pedidoId: 'pedido-abc' }),
        }),
      );
    });
  });
});
