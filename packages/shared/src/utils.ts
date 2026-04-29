// Utilitários compartilhados

/**
 * Formata valor monetário para exibição
 * @param valor - Valor numérico
 * @returns String formatada (ex: "R$ 24,90")
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Formata telefone para exibição
 * @param telefone - Telefone no formato 55DDNNNNNNNNN
 * @returns String formatada (ex: "+55 (62) 99999-9999")
 */
export function formatarTelefone(telefone: string): string {
  const limpo = telefone.replace(/\D/g, '');
  
  if (limpo.length === 13) {
    // Com código do país: 55DDNNNNNNNNN
    return `+${limpo.slice(0, 2)} (${limpo.slice(2, 4)}) ${limpo.slice(4, 9)}-${limpo.slice(9)}`;
  } else if (limpo.length === 11) {
    // Sem código do país: DDNNNNNNNNN
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
  }
  
  return telefone;
}

/**
 * Normaliza telefone para formato padrão do banco
 * @param telefone - Telefone em qualquer formato
 * @returns String no formato 55DDNNNNNNNNN
 */
export function normalizarTelefone(telefone: string): string {
  const limpo = telefone.replace(/\D/g, '');
  
  if (limpo.length === 11) {
    return `55${limpo}`;
  }
  
  return limpo;
}

/**
 * Calcula subtotal de um item
 * @param preco - Preço unitário
 * @param quantidade - Quantidade
 * @returns Subtotal
 */
export function calcularSubtotal(preco: number, quantidade: number): number {
  return Number((preco * quantidade).toFixed(2));
}

/**
 * Calcula total do pedido
 * @param subtotal - Subtotal dos itens
 * @param taxaEntrega - Taxa de entrega
 * @returns Total
 */
export function calcularTotal(subtotal: number, taxaEntrega: number): number {
  return Number((subtotal + taxaEntrega).toFixed(2));
}

/**
 * Valida se um bairro está ativo
 * @param bairros - Lista de bairros
 * @param nomeBairro - Nome do bairro a validar
 * @returns Bairro encontrado ou null
 */
export function validarBairro(
  bairros: Array<{ nome: string; taxa: number; ativo: boolean }>,
  nomeBairro: string
): { nome: string; taxa: number } | null {
  const bairro = bairros.find(
    (b) => b.nome.toLowerCase() === nomeBairro.toLowerCase() && b.ativo
  );
  
  return bairro ? { nome: bairro.nome, taxa: bairro.taxa } : null;
}

/**
 * Gera código único de indicação
 * @param telefone - Telefone do indicador
 * @returns Código de indicação
 */
export function gerarCodigoIndicacao(telefone: string): string {
  const timestamp = Date.now().toString(36);
  const tel = telefone.slice(-4);
  return `SE${tel}${timestamp}`.toUpperCase();
}

/**
 * Formata data para exibição
 * @param data - Data a formatar
 * @returns String formatada (ex: "29/04/2026 às 14:30")
 */
export function formatarData(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

/**
 * Trunca texto com reticências
 * @param texto - Texto a truncar
 * @param limite - Limite de caracteres
 * @returns Texto truncado
 */
export function truncarTexto(texto: string, limite: number): string {
  if (texto.length <= limite) return texto;
  return `${texto.slice(0, limite)}...`;
}
