# Base de Conhecimento da IA para Geração de Mensagens

**Data de Criação:** 2026-05-13
**Prioridade:** P1
**Status:** Concluído
**Fase Relacionada:** F02 — Mineração de contatos · F03 — Agente WhatsApp

## Contexto

Em 2026-05-13 implementamos a geração de variações de mensagem com Claude (`campanhaIA.service.ts`). Hoje a IA recebe apenas a **intenção** descrita pelo operador (ex: "Lançamento da marmita executiva") e gera 3 versões da mensagem.

O system prompt atual é genérico e hardcoded — menciona apenas:
- "Rancho Delivery, delivery de marmitas caseiras em Goiânia"
- Placeholders `{{nome}}` e `{{bairro}}`
- Regras gerais de tom

**A IA não conhece** os pratos reais do cardápio, valores atualizados, horário de funcionamento, diferenciais do restaurante, ou estilo de comunicação da marca. Resultado: mensagens corretas no formato mas **genéricas no conteúdo** — não conseguem mencionar "marmita do dia", promoções específicas, ou usar a voz autêntica do restaurante.

O mesmo problema existe no agente IA do WhatsApp (`conversacao.service.ts`) — o SYSTEM_PROMPT lista produtos e preços, mas é **hardcoded no código** e desatualiza facilmente.

## Problema

Sem base de conhecimento estruturada:

1. **Mensagens genéricas:** "Conheça nossas marmitas deliciosas" em vez de "A marmita de feijoada de quinta sai por R$ 22 hoje"
2. **Risco de informação errada:** SYSTEM_PROMPT do agente está hardcoded ("Marmita individual: R$ 18, frete grátis no primeiro pedido") — se mudar o preço no admin, a IA continua falando R$ 18 e prometendo frete grátis
3. **Tom inconsistente:** sem definição de voz da marca, cada variação sai com um estilo diferente
4. **Falta de contexto operacional:** IA não sabe os horários reais, dia que abre/fecha, raio de entrega
5. **Manutenção difícil:** mudanças no cardápio exigem deploy de código (não basta editar no admin)

## Escopo Futuro

### B1 — Tabela de conhecimento da loja
- Nova tabela `IAContextoLoja` ou expandir `LojaConfiguracao` com campos:
  - `descricaoNegocio` — 2-3 parágrafos sobre o restaurante
  - `vozMarca` — JSON com tom, vocabulário, exemplos do que dizer/não dizer
  - `diferenciais` — array de pontos fortes ("comida caseira de verdade", "entrega rápida")
  - `horariosAtendimento` — JSON estruturado
  - `politicaFrete` — texto livre
  - `politicaPrimeiroPedido` — texto livre (cupom, desconto, frete grátis, etc.)

### B2 — Sincronização automática do cardápio
- A IA puxa **em runtime** os produtos disponíveis (`Produto.disponivel = true`)
- Inclui no contexto: nome, descrição, preço atual, categoria
- Atualizações de preço/disponibilidade refletem automaticamente
- Opcional: marcador `destaqueIA: boolean` para limitar quais produtos a IA pode mencionar

### B3 — UI de gestão da base
- Página `/admin/configuracoes/ia-conhecimento`
- Campos editáveis pelo dono do restaurante (sem precisar de dev)
- Preview: gerar uma mensagem de exemplo ao salvar — operador vê o impacto antes de aprovar
- Botão "Testar com prompt" para validar mudanças

### B4 — Refator do SYSTEM_PROMPT do agente WhatsApp
- Mover `SYSTEM_PROMPT` de `conversacao.service.ts` para a base de conhecimento
- Montar o prompt em runtime a partir dos dados do banco
- Garante consistência: a mesma voz/informação usada no agente outbound (`campanhaIA`) e no agente WhatsApp inbound (`conversacao`)

### B5 — Templates por categoria
- Operador cria templates reutilizáveis: "Promoção", "Lançamento", "Reativação"
- IA gera variações sobre o template em vez de partir do zero
- Cada template tem placeholders próprios já sugeridos

## Impactos

**Positivos:**
- Mensagens mais autênticas e específicas → maior taxa de resposta
- Eliminação do risco de informação desatualizada
- Operador atualiza o cardápio uma vez e a IA acompanha
- Consistência entre canal outbound (campanha) e inbound (WhatsApp recebido)
- Base para evoluir para personalização por segmento de lead (ex: "vegetariano" vs "executivo")

**Negativos/Trade-offs:**
- Aumenta o consumo de tokens Anthropic (contexto maior em cada chamada)
- Risco de "vazamento" de informação interna se mal configurada (a IA pode revelar coisas que não deveria)
- Curadoria de base de conhecimento é trabalho contínuo do dono do restaurante

**Dependências:**
- ✅ Anthropic SDK configurada (já implementado)
- ✅ Tabela `Produto` com nome/descrição/preço (já existe)
- ✅ Tabela `LojaConfiguracao` (já existe — basta expandir)
- ⏳ Definição da voz/posicionamento do restaurante (trabalho do dono)
- ⏳ Levantamento dos diferenciais reais do Rancho Delivery

## Critério de Pronto Futuro

- [ ] Tabela/campos no banco armazenando base de conhecimento estruturada
- [ ] Página `/admin/configuracoes/ia-conhecimento` com formulário completo
- [ ] `campanhaIA.service.ts` puxando contexto da base ao gerar variações
- [ ] `conversacao.service.ts` puxando contexto da base no SYSTEM_PROMPT (substitui o hardcoded)
- [ ] Cardápio puxado em runtime (produtos disponíveis com preço atual)
- [ ] Botão "Preview" no admin que gera mensagem-exemplo com a base atual
- [ ] Documentação para o dono do restaurante de como preencher cada campo
- [ ] Audit log: quando a base muda, registrar quem/quando/o quê alterou
- [ ] Templates de campanha pré-cadastrados (B5) — opcional para v1

## Estimativa

**Complexidade:** Média
**Tempo Estimado:** 3-4 dias

## Notas Adicionais

### Estrutura sugerida da `IAContextoLoja` (esboço)

```typescript
{
  descricaoNegocio: "O Rancho é um delivery de comida caseira em Goiânia. Famílias goianas confiam na gente desde 2018...",

  vozMarca: {
    tom: "caloroso, próximo, brasileiro",
    formalidade: "informal mas educado",
    evitar: ["URGENTE", "GRÁTIS!!!", caixa alta excessiva, emojis em excesso],
    preferir: ["você", "nosso", "aqui no Rancho"],
    exemplos_bons: ["Olá Maria! Que tal almoçar hoje sem dor de cabeça?"],
    exemplos_ruins: ["PROMOÇÃO IMPERDÍVEL!!! CLIQUE JÁ!!!"]
  },

  diferenciais: [
    "Comida caseira de verdade — feita por mães goianas",
    "Entrega rápida (até 40min)",
    "Marmita do dia muda toda hora — sempre fresca"
  ],

  horariosAtendimento: {
    segunda_sabado: { abre: "10:00", fecha: "22:00" },
    domingo: { abre: "11:00", fecha: "21:00" }
  },

  politicaFrete: "R$ 5 fixo dentro de 3km, R$ 1,20 por km adicional até 12km",

  politicaPrimeiroPedido: "Frete grátis no primeiro pedido — cupom RANCHO5 automático",

  bairrosAtendidos: ["Jardim Mont Serrat", "Setor Bueno", ...] // ou puxa de outra tabela
}
```

### Como o prompt final fica montado

```
SYSTEM_PROMPT base (regras gerais)
+ descricaoNegocio
+ vozMarca (instruções claras)
+ diferenciais (bullet list)
+ horarios (formato natural)
+ cardápio atual (puxado em runtime)
+ contexto específico (lead, bairro, intenção)
```

### Custo estimado de tokens

Hoje cada chamada de `gerarVariacoesMensagem` usa ~300 tokens de input. Com a base completa pode ir para ~1200-1500 tokens. **Cache de prompt do Anthropic** torna isso barato — pagamos a base 1x e fica em cache por 5 min. Vale implementar com `cache_control` nas seções estáticas.

### Itens relacionados no backlog

- Quando este item for implementado, vai melhorar significativamente o **#2 do raio-x** (mensagens com IA) e o **agente WhatsApp** (conversacao.service.ts)
- Pode preceder o item [`2026-05-13-recomendacao-proxima-mineracao-ia.md`](2026-05-13-recomendacao-proxima-mineracao-ia.md) — quanto mais contexto a IA tem, melhor a sugestão de bairro

### Pré-trabalho necessário antes de implementar

1. Sentar com o dono do restaurante e levantar:
   - O que diferencia o Rancho Delivery dos concorrentes?
   - Qual a voz da marca? (formal / informal / divertida / técnica)
   - Quais palavras/expressões SEMPRE usar? Quais NUNCA usar?
   - Há histórias do negócio que valem ser mencionadas?
2. Tirar print das melhores mensagens já mandadas (manuais) para a IA aprender o padrão
3. Definir o que NUNCA deve ser dito pela IA (linhas vermelhas)

## Histórico de Mudanças

| Data | Mudança | Autor |
|------|---------|-------|
| 2026-05-13 | Criação do item — surgiu durante a sessão de melhorias da mineração outbound | Claude |
