// Seed do Control Plane do FoodFlow — catálogo de módulos + planos + assinatura
// do Rancho. IDEMPOTENTE (upsert/find-or-create): pode rodar quantas vezes quiser.
//   tsx prisma/seed-foodflow.ts
import dotenv from 'dotenv';
dotenv.config();

// Catálogo inicial (a composição/preço dos planos é ajustável depois no painel).
const MODULOS = [
  { chave: 'cardapio',        nome: 'Cardápio',                       core: true },
  { chave: 'pedidos',         nome: 'Pedidos',                        core: true },
  { chave: 'pagamentos',      nome: 'Pagamentos',                     core: true },
  { chave: 'entregas',        nome: 'Entregas & Motoboys',            core: true },
  { chave: 'relatorios',      nome: 'Relatórios',                     core: true },
  { chave: 'crm',             nome: 'Clientes / CRM',                 core: true },
  { chave: 'aura-atendente',  nome: 'AURA — Atendente IA',            core: false },
  { chave: 'aura-prospeccao', nome: 'AURA — Prospecção / Mineração',  core: false },
  { chave: 'aura-campanhas',  nome: 'AURA — Campanhas de Marketing',  core: false },
  { chave: 'dominio-proprio', nome: 'Domínio próprio',                core: false },
];
const PREMIUM_CHAVES = ['aura-atendente', 'aura-prospeccao', 'aura-campanhas', 'dominio-proprio'];

async function main() {
  const prisma = (await import('../src/config/database')).default as any;

  for (const m of MODULOS) {
    await prisma.modulo.upsert({
      where: { chave: m.chave },
      update: { nome: m.nome, core: m.core, ativo: true },
      create: { chave: m.chave, nome: m.nome, core: m.core },
    });
  }
  console.log(`módulos: ${MODULOS.length} upserted`);

  async function findOrCreatePlano(nome: string, preco: number) {
    const ex = await prisma.plano.findFirst({ where: { nome } });
    return ex ?? prisma.plano.create({ data: { nome, preco } });
  }
  const basico = await findOrCreatePlano('Básico', 0);
  const premium = await findOrCreatePlano('Premium', 0);
  console.log(`planos: Básico(${basico.id}) Premium(${premium.id})`);

  const premiumModulos = await prisma.modulo.findMany({ where: { chave: { in: PREMIUM_CHAVES } } });
  for (const mod of premiumModulos) {
    await prisma.planoModulo.upsert({
      where: { planoId_moduloId: { planoId: premium.id, moduloId: mod.id } },
      update: {},
      create: { planoId: premium.id, moduloId: mod.id },
    });
  }
  console.log(`plano Premium: ${premiumModulos.length} módulos vinculados`);

  // Assinatura do Rancho (Premium, ATIVA). tenant.id === 'rancho' (= TENANT_PADRAO).
  const rancho = await prisma.tenant.findUnique({ where: { slug: 'rancho' } });
  if (rancho) {
    const ja = await prisma.assinatura.findUnique({ where: { tenantId: rancho.id } });
    if (ja) {
      console.log('assinatura Rancho já existe — mantida');
    } else {
      await prisma.assinatura.create({ data: { tenantId: rancho.id, planoId: premium.id, estado: 'ATIVA' } });
      console.log('assinatura Rancho criada (Premium / ATIVA)');
    }
  } else {
    console.log('tenant rancho não encontrado (?)');
  }

  console.log('✅ seed control plane concluído');
  process.exit(0);
}

main().catch((e) => { console.error('seed ERRO', e); process.exit(1); });
