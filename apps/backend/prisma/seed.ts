import { PrismaClient } from '@prisma/client';
import { logger } from '../src/config/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Iniciando seed do banco de dados...');

  // Criar bairros de exemplo
  const bairros = await prisma.bairro.createMany({
    data: [
      { nome: 'Setor Bueno', taxa: 6.00, ativo: true },
      { nome: 'Setor Oeste', taxa: 5.00, ativo: true },
      { nome: 'Setor Marista', taxa: 7.00, ativo: true },
      { nome: 'Jardim Goiás', taxa: 8.00, ativo: true },
      { nome: 'Setor Central', taxa: 5.00, ativo: true },
    ],
    skipDuplicates: true,
  });

  logger.info(`✅ ${bairros.count} bairros criados`);

  // Criar produtos de exemplo
  const produtos = await prisma.produto.createMany({
    data: [
      {
        nome: 'Marmita Executiva - Frango Grelhado',
        preco: 24.90,
        midia: 'https://placeholder.com/frango-grelhado.jpg',
        descricao: 'Peito de frango grelhado, arroz integral, feijão preto, salada verde e legumes no vapor. Refeição completa e balanceada.',
        categoria: 'Executiva',
        disponivel: true,
        ordem: 1,
      },
      {
        nome: 'Marmita Executiva - Carne Bovina',
        preco: 27.90,
        midia: 'https://placeholder.com/carne-bovina.jpg',
        descricao: 'Carne bovina acebolada, arroz branco, feijão carioca, farofa e vinagrete. Sabor tradicional.',
        categoria: 'Executiva',
        disponivel: true,
        ordem: 2,
      },
      {
        nome: 'Marmita Fit - Salmão',
        preco: 32.90,
        midia: 'https://placeholder.com/salmao.jpg',
        descricao: 'Salmão grelhado, quinoa, brócolis e cenoura. Opção leve e nutritiva.',
        categoria: 'Fit',
        disponivel: true,
        ordem: 3,
      },
      {
        nome: 'Marmita Vegetariana',
        preco: 22.90,
        midia: 'https://placeholder.com/vegetariana.jpg',
        descricao: 'Mix de legumes grelhados, arroz integral, feijão e salada. 100% vegetal.',
        categoria: 'Vegetariana',
        disponivel: true,
        ordem: 4,
      },
      {
        nome: 'Refrigerante Lata 350ml',
        preco: 5.00,
        midia: 'https://placeholder.com/refrigerante.jpg',
        descricao: 'Refrigerante gelado, diversos sabores disponíveis.',
        categoria: 'Bebidas',
        disponivel: true,
        ordem: 10,
      },
    ],
    skipDuplicates: true,
  });

  logger.info(`✅ ${produtos.count} produtos criados`);

  logger.info('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    logger.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
