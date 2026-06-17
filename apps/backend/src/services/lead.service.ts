import prisma from '../config/database';

/**
 * Leads do site institucional do FoodFlow (foodflow.ia.br). Nível plataforma
 * (sem tenantId) — captura pública + listagem pelo super-admin.
 */
export interface LeadInput {
  nome: string;
  restaurante: string;
  contato: string;
  email?: string | null;
  mensagem?: string | null;
}

export async function criarLead(dados: LeadInput) {
  const lead = await prisma.lead.create({
    data: {
      nome: dados.nome,
      restaurante: dados.restaurante,
      contato: dados.contato,
      email: dados.email ?? null,
      mensagem: dados.mensagem ?? null,
      origem: 'site',
    },
    select: { id: true, criadoEm: true },
  });
  return lead;
}

export async function listarLeads() {
  return prisma.lead.findMany({ orderBy: { criadoEm: 'desc' }, take: 500 });
}
