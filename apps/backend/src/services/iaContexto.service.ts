import prisma from '../config/database';

export interface IAContexto {
  systemPromptBase: string;
  cardapioTexto: string;
  nomeAtendente: string;
}

interface VozMarca {
  tom?: string;
  formalidade?: string;
  evitar?: string[];
  preferir?: string[];
  exemplosBons?: string[];
  exemplosRuins?: string[];
}

interface HorariosDia {
  abre: string;
  fecha: string;
}

interface IAHorarios {
  segunda_sabado?: HorariosDia;
  domingo?: HorariosDia;
  [key: string]: HorariosDia | undefined;
}

export async function construirContextoIA(): Promise<IAContexto> {
  const [config, produtos] = await Promise.all([
    prisma.lojaConfiguracao.findUnique({ where: { id: 'loja_principal' } }),
    prisma.produto.findMany({
      where: { disponivel: true },
      select: { nome: true, descricao: true, preco: true, categoria: true },
      orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }],
    }),
  ]);

  const nomeAtendente = config?.iaNomeAtendente || 'Maria';

  // Monta contexto da loja
  const partes: string[] = [];

  if (config?.iaDescricaoNegocio) {
    partes.push(`## Sobre o restaurante\n${config.iaDescricaoNegocio}`);
  } else {
    partes.push(`## Sobre o restaurante\nRancho Delivery — delivery de marmitas caseiras em Goiânia.`);
  }

  if (config?.iaDiferenciais) {
    const diferenciais = config.iaDiferenciais as string[];
    if (Array.isArray(diferenciais) && diferenciais.length > 0) {
      partes.push(`## Diferenciais\n${diferenciais.map((d) => `- ${d}`).join('\n')}`);
    }
  }

  // Cardápio ao vivo
  const cardapioTexto = montarCardapio(produtos);
  if (cardapioTexto) {
    partes.push(`## Cardápio atual (preços vigentes)\n${cardapioTexto}`);
  }

  // Horários
  if (config?.iaHorarios) {
    const h = config.iaHorarios as IAHorarios;
    const linhas: string[] = [];
    if (h.segunda_sabado) linhas.push(`Segunda a Sábado: ${h.segunda_sabado.abre} às ${h.segunda_sabado.fecha}`);
    if (h.domingo) linhas.push(`Domingo: ${h.domingo.abre} às ${h.domingo.fecha}`);
    if (linhas.length > 0) partes.push(`## Horário de funcionamento\n${linhas.join('\n')}`);
  } else {
    partes.push(`## Horário de funcionamento\nSegunda a Sábado: 10h às 22h\nDomingo: 11h às 21h`);
  }

  // Política de frete
  if (config?.iaPoliticaFrete) {
    partes.push(`## Taxa de entrega\n${config.iaPoliticaFrete}`);
  } else {
    partes.push(`## Taxa de entrega\nR$ 5 (frete grátis no primeiro pedido)`);
  }

  if (config?.iaPoliticaPrimeiroPedido) {
    partes.push(`## Primeiro pedido\n${config.iaPoliticaPrimeiroPedido}`);
  }

  // Voz da marca
  let instrucoesTom = '';
  if (config?.iaVozMarca) {
    const voz = config.iaVozMarca as VozMarca;
    const linhas: string[] = [];
    if (voz.tom) linhas.push(`Tom: ${voz.tom}`);
    if (voz.formalidade) linhas.push(`Formalidade: ${voz.formalidade}`);
    if (voz.preferir?.length) linhas.push(`Preferir: ${voz.preferir.join(', ')}`);
    if (voz.evitar?.length) linhas.push(`Evitar: ${voz.evitar.join(', ')}`);
    if (voz.exemplosBons?.length) linhas.push(`Exemplos bons:\n${voz.exemplosBons.map((e) => `  "${e}"`).join('\n')}`);
    if (voz.exemplosRuins?.length) linhas.push(`Exemplos ruins:\n${voz.exemplosRuins.map((e) => `  "${e}"`).join('\n')}`);
    if (linhas.length > 0) instrucoesTom = `## Voz da marca\n${linhas.join('\n')}`;
  }

  if (instrucoesTom) partes.push(instrucoesTom);

  const systemPromptBase = partes.join('\n\n');

  return { systemPromptBase, cardapioTexto, nomeAtendente };
}

function montarCardapio(produtos: { nome: string; descricao: string; preco: unknown; categoria: string }[]): string {
  if (produtos.length === 0) return '';

  const porCategoria = new Map<string, typeof produtos>();
  for (const p of produtos) {
    const cat = p.categoria || 'Outros';
    if (!porCategoria.has(cat)) porCategoria.set(cat, []);
    porCategoria.get(cat)!.push(p);
  }

  const linhas: string[] = [];
  for (const [cat, itens] of porCategoria) {
    linhas.push(`**${cat}**`);
    for (const p of itens) {
      const preco = Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      linhas.push(`- ${p.nome} — ${preco}${p.descricao ? ` (${p.descricao.slice(0, 80)})` : ''}`);
    }
  }
  return linhas.join('\n');
}

export default { construirContextoIA };
