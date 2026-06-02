// Sanitiza a resposta da IA antes de enviar ao cliente

// Remove blocos XML internos (CoT, thinking, reasoning)
const TAGS_INTERNAS = ['thinking', 'cot', 'reasoning', 'inner_monologue', 'scratchpad'];
const regexTagsInternas = new RegExp(
  `<(${TAGS_INTERNAS.join('|')})[^>]*>[\\s\\S]*?<\\/\\1>`,
  'gi',
);

// Links permitidos — qualquer outro link é removido
const DOMINIO_PERMITIDO = /rancho\.delivery/i;

function removerLinksNaoPermitidos(texto: string): string {
  // Remove URLs que não sejam do domínio permitido
  return texto.replace(/https?:\/\/[^\s)>\]"']+/gi, (url) => {
    return DOMINIO_PERMITIDO.test(url) ? url : '[link removido]';
  });
}

function removerBlocosJson(texto: string): string {
  // Remove blocos JSON acidentais (```json ... ```)
  return texto.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/gi, '').trim();
}

function normalizarAspas(texto: string): string {
  // Aspas curvas → aspas retas
  return texto
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[«»]/g, '"'); // guillemets
}

export function sanitizarResposta(texto: string): string {
  let r = texto;
  r = r.replace(regexTagsInternas, '');
  r = removerBlocosJson(r);
  r = normalizarAspas(r);
  r = removerLinksNaoPermitidos(r);
  r = r.trim();
  return r;
}
