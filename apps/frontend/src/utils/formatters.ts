/**
 * Utilitários de formatação
 * 
 * Funções para formatar valores para exibição
 */

/**
 * Formata um valor numérico para o formato de moeda brasileira (R$)
 * 
 * @param valor - Valor numérico a ser formatado
 * @returns String formatada no padrão "R$ 0,00"
 * 
 * @example
 * formatarPreco(24.90) // "R$ 24,90"
 * formatarPreco(1234.56) // "R$ 1.234,56"
 * formatarPreco(0) // "R$ 0,00"
 */
export const formatarPreco = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

/**
 * Formata um número de telefone brasileiro
 * 
 * @param telefone - Número de telefone (apenas dígitos)
 * @returns String formatada no padrão "(00) 00000-0000" ou "(00) 0000-0000"
 * 
 * @example
 * formatarTelefone("11987654321") // "(11) 98765-4321"
 * formatarTelefone("1134567890") // "(11) 3456-7890"
 */
export const formatarTelefone = (telefone: string): string => {
  const cleaned = telefone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return telefone;
};

/**
 * Formata uma data para o formato brasileiro
 * 
 * @param data - Data a ser formatada
 * @param incluirHora - Se deve incluir a hora (padrão: false)
 * @returns String formatada no padrão "dd/mm/aaaa" ou "dd/mm/aaaa às hh:mm"
 * 
 * @example
 * formatarData(new Date('2026-04-29')) // "29/04/2026"
 * formatarData(new Date('2026-04-29T14:30:00'), true) // "29/04/2026 às 14:30"
 */
export const formatarData = (data: Date | string, incluirHora = false): string => {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  
  const opcoes: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  
  if (incluirHora) {
    opcoes.hour = '2-digit';
    opcoes.minute = '2-digit';
  }
  
  return new Intl.DateTimeFormat('pt-BR', opcoes).format(dataObj);
};

/**
 * Trunca um texto para um tamanho máximo, adicionando reticências
 * 
 * @param texto - Texto a ser truncado
 * @param tamanhoMaximo - Tamanho máximo do texto
 * @returns Texto truncado com reticências se necessário
 * 
 * @example
 * truncarTexto("Lorem ipsum dolor sit amet", 10) // "Lorem ipsu..."
 * truncarTexto("Curto", 10) // "Curto"
 */
export const truncarTexto = (texto: string, tamanhoMaximo: number): string => {
  if (texto.length <= tamanhoMaximo) {
    return texto;
  }
  
  return texto.slice(0, tamanhoMaximo) + '...';
};

/**
 * Formata um número para exibição com separador de milhares
 * 
 * @param numero - Número a ser formatado
 * @returns String formatada com separador de milhares
 * 
 * @example
 * formatarNumero(1234567) // "1.234.567"
 * formatarNumero(123) // "123"
 */
export const formatarNumero = (numero: number): string => {
  return new Intl.NumberFormat('pt-BR').format(numero);
};
