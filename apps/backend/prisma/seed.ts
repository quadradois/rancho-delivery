import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes (opcional)
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.bairro.deleteMany();

  console.log('✅ Dados antigos removidos');

  // Criar Bairros
  const bairros = await prisma.bairro.createMany({
    data: [
      {
        nome: 'Centro',
        taxa: 3.99,
        ativo: true,
      },
      {
        nome: 'Bela Vista',
        taxa: 4.99,
        ativo: true,
      },
      {
        nome: 'Jardins',
        taxa: 5.99,
        ativo: true,
      },
      {
        nome: 'Vila Mariana',
        taxa: 4.99,
        ativo: true,
      },
    ],
  });

  console.log(`✅ ${bairros.count} bairros criados`);

  // Criar Produtos
  const produtos = [
    // Pratos principais — Jantinha do Rancho
    {
      nome: 'Frango Caipira Assado',
      descricao: 'Frango caipira temperado na vinha-d\'alhos, assado lentamente com alecrim e alho. Acompanha arroz, feijão e farofa.',
      preco: 32.90,
      categoria: 'Lanche',
      midia: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400',
      disponivel: true,
      ordem: 1,
    },
    {
      nome: 'Costela no Bafo',
      descricao: 'Costela bovina cozida no bafo por 6 horas, desfiando no garfo. Acompanha mandioca cozida e vinagrete.',
      preco: 42.90,
      categoria: 'Lanche',
      midia: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
      disponivel: true,
      ordem: 2,
    },
    {
      nome: 'Carne Moída Refogada',
      descricao: 'Carne moída temperada com cheiro-verde, tomate e cebola. Acompanha arroz, feijão, ovo frito e farofa.',
      preco: 28.90,
      categoria: 'Lanche',
      midia: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400',
      disponivel: true,
      ordem: 3,
    },
    {
      nome: 'Peixe Frito na Brasa',
      descricao: 'Filé de tilápia temperado com limão e ervas, frito na hora. Acompanha arroz, pirão e salada.',
      preco: 35.90,
      categoria: 'Lanche',
      midia: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
      disponivel: true,
      ordem: 4,
    },
    {
      nome: 'Linguiça Caipira Grelhada',
      descricao: 'Linguiça artesanal de porco grelhada na brasa. Acompanha arroz, feijão tropeiro e couve refogada.',
      preco: 29.90,
      categoria: 'Lanche',
      midia: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
      disponivel: true,
      ordem: 5,
    },

    // Combos
    {
      nome: 'Jantinha Completa',
      descricao: 'Escolha sua proteína + arroz + feijão + farofa + salada + suco natural 500ml.',
      preco: 39.90,
      categoria: 'Combo',
      midia: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
      disponivel: true,
      ordem: 6,
    },
    {
      nome: 'Combo Família Rancho',
      descricao: '2 proteínas à escolha + arroz grande + feijão + farofa + 2 sucos naturais.',
      preco: 74.90,
      categoria: 'Combo',
      midia: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
      disponivel: true,
      ordem: 7,
    },

    // Acompanhamentos
    {
      nome: 'Mandioca Frita',
      descricao: 'Mandioca cozida e frita na hora, crocante por fora e macia por dentro. Porção 300g.',
      preco: 14.90,
      categoria: 'Sobremesa',
      midia: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=400',
      disponivel: true,
      ordem: 8,
    },
    {
      nome: 'Arroz com Feijão',
      descricao: 'Arroz branco soltinho e feijão carioca temperado com bacon e alho. Porção individual.',
      preco: 9.90,
      categoria: 'Sobremesa',
      midia: 'https://images.unsplash.com/photo-1536304993881-ff86e0c9b915?w=400',
      disponivel: true,
      ordem: 9,
    },

    // Bebidas
    {
      nome: 'Suco de Caju Natural',
      descricao: 'Suco de caju fresco, sem conservantes. 500ml.',
      preco: 9.90,
      categoria: 'Bebida',
      midia: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400',
      disponivel: true,
      ordem: 10,
    },
    {
      nome: 'Suco de Maracujá',
      descricao: 'Suco de maracujá natural com um toque de mel. 500ml.',
      preco: 9.90,
      categoria: 'Bebida',
      midia: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400',
      disponivel: true,
      ordem: 11,
    },
    {
      nome: 'Água Mineral',
      descricao: 'Água mineral sem gás gelada. 500ml.',
      preco: 3.50,
      categoria: 'Bebida',
      midia: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
      disponivel: true,
      ordem: 12,
    },

    // Sobremesas
    {
      nome: 'Pudim de Leite',
      descricao: 'Pudim de leite condensado caseiro com calda de caramelo. Receita da vovó.',
      preco: 12.90,
      categoria: 'Sobremesa',
      midia: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400',
      disponivel: true,
      ordem: 13,
    },
    {
      nome: 'Canjica com Amendoim',
      descricao: 'Canjica cremosa com leite de coco e amendoim torrado. Porção 300ml.',
      preco: 10.90,
      categoria: 'Sobremesa',
      midia: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400',
      disponivel: true,
      ordem: 14,
    },
  ];

  for (const produto of produtos) {
    await prisma.produto.create({ data: produto });
  }

  console.log(`✅ ${produtos.length} produtos criados`);

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
