# CLAUDE.md

Diretrizes de comportamento para reduzir erros comuns de LLM ao programar neste repositório.

**Tradeoff:** estas diretrizes priorizam **cautela sobre velocidade**. Para tarefas triviais, use bom senso.

## 1. Pensar antes de codar

**Não presuma. Não esconda confusão. Exponha tradeoffs.**

Antes de implementar:
- Declare suas premissas explicitamente. Se houver incerteza, pergunte.
- Se existem múltiplas interpretações, apresente-as — não escolha em silêncio.
- Se existe uma abordagem mais simples, diga. Discorde quando fizer sentido.
- Se algo está obscuro, pare. Nomeie o que confunde. Pergunte.

## 2. Simplicidade primeiro

**O mínimo de código que resolve o problema. Nada especulativo.**

- Nenhuma funcionalidade além do que foi pedido.
- Nenhuma abstração para código de uso único.
- Nenhuma "flexibilidade"/"configurabilidade" que não foi solicitada.
- Nenhum tratamento de erro para cenários impossíveis.
- Se escreveu 200 linhas e dá para 50, reescreva.

Pergunte-se: "Um(a) engenheiro(a) sênior diria que isto está complicado demais?" Se sim, simplifique.

## 3. Mudanças cirúrgicas

**Toque só no necessário. Limpe só a sua própria bagunça.**

Ao editar código existente:
- Não "melhore" código, comentários ou formatação adjacentes.
- Não refatore o que não está quebrado.
- Siga o estilo existente, mesmo que você faria diferente.
- Se notar código morto não relacionado, **avise** — não apague.

Quando suas mudanças criam órfãos:
- Remova imports/variáveis/funções que **as suas** mudanças deixaram sem uso.
- Não remova código morto pré-existente sem que peçam.

O teste: toda linha alterada deve rastrear diretamente ao pedido do usuário.

## 4. Execução orientada a meta

**Defina critérios de sucesso. Itere até verificar.**

Transforme tarefas em metas verificáveis:
- "Adicionar validação" → "Escrever testes para entradas inválidas e fazê-los passar"
- "Corrigir o bug" → "Escrever um teste que reproduz o bug e fazê-lo passar"
- "Refatorar X" → "Garantir que os testes passam antes e depois"

Para tarefas com vários passos, declare um plano breve:
```
1. [Passo] → verifica: [checagem]
2. [Passo] → verifica: [checagem]
3. [Passo] → verifica: [checagem]
```

Critérios fortes permitem iterar sozinho. Critérios fracos ("faça funcionar") exigem esclarecimento constante.

---

## Convenções do projeto (rancho-delivery)

- **Monorepo pnpm:** `apps/backend` (Node/TS + Express + Prisma + PostgreSQL), `apps/frontend` (Next.js), `packages/shared`. Rode scripts com `pnpm --filter @rancho-delivery/backend <script>`.
- **Verificar antes do push:** `typecheck`, `test` e `lint` do backend. No lint, `@typescript-eslint/no-explicit-any` é *warning* (não quebra); apenas *errors* quebram o CI.
- **Migrations:** o CI roda `db:migrate:deploy` num **banco zerado** — toda migration precisa ser reproduzível do zero. Não faça `ALTER`/`RENAME` de tabela que nenhuma migration criou. (O `_prisma_migrations` veio de backup e está parcialmente fora de sincronia.)
- **Fonte externa de cadastro:** isolada em `apps/backend/src/config/fonteCadastro.ts` — único lugar que referencia o domínio/credenciais do fornecedor. Não espalhar. **Não usar** o gateway PostgREST do portal (expõe dados pessoais de terceiros — proibido); usar só a interface pública pretendida.
- **WhatsApp (Evolution Go):** `.env` guarda só `EVOLUTION_API_URL` + chave global + webhook. O **nome da instância é dado de conexão** (tabela `conexoes_whatsapp`, uma `principal`), nunca hardcoded. Servidor é multi-tenant: sempre selecionar a instância por nome.
- **LGPD:** tratar apenas dado imobiliário + nome/CPF do proprietário (base legal: legítimo interesse, com opt-out). Ignorar qualquer dado pessoal sensível.

---

**Estas diretrizes estão funcionando se:** menos mudanças desnecessárias nos diffs, menos retrabalho por excesso de complexidade, e perguntas de esclarecimento **antes** da implementação — não depois do erro.
