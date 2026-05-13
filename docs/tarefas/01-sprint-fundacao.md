# Sprint 1 — Fundação e Resiliência
**Objetivo:** Tornar o pipeline de mineração confiável antes de escalar.
**Pré-requisito:** Nenhum — pode começar hoje.
**Estimativa total:** ~2 dias de dev

> **Por que este sprint primeiro?**
> O sistema funciona, mas falhas externas (scraper, Assertiva) são silenciosas —
> o operador não sabe que dados foram perdidos. Antes de adicionar qualquer feature
> nova, precisamos garantir que o que já existe funciona de forma auditável.

---

## Tarefas

---

### S1-T1 — Retry com backoff no scraper de IPTU

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 3h
**Prioridade:** 🔴 Alta

#### Contexto
O scraper busca dados de proprietários em `https://www.goiania.go.gov.br/sistemas/sccer/`.
Quando um IPTU falha por timeout ou erro HTTP, o código atual **descarta silenciosamente**
e segue para o próximo. Isso significa que proprietários são perdidos sem nenhum registro.

#### Arquivo a modificar
`apps/backend/src/services/mineracao.service.ts`

Localizar a função que faz o scraping individual de cada IPTU.
Buscar por: `scrapearIptu` ou `sccer` ou `certidão` no arquivo.

#### O que implementar

1. Envolver a chamada HTTP do scraper em um loop de retry:
   ```typescript
   // Até 3 tentativas com backoff exponencial
   // Tentativa 1: imediato
   // Tentativa 2: aguarda 1.000ms
   // Tentativa 3: aguarda 3.000ms
   ```

2. Se após 3 tentativas ainda falhar: registrar na nova tabela `scraper_erros`
   (ver S1-T2 para criar essa tabela)

3. Retornar `null` para o IPTU que falhou — o pipeline continua com os demais

#### Schema da tabela de erros (criar em S1-T2 antes de usar aqui)
```typescript
interface ScraperErro {
  nrinscr: string;    // IPTU que falhou
  runId: string;      // ID da execução
  tentativas: number; // quantas vezes tentou
  ultimoErro: string; // mensagem de erro
  httpStatus?: number;
}
```

#### Critério de aceite
- [ ] Uma mineração de 50 IPTUs onde 5 falham não interrompe o pipeline
- [ ] Os 5 IPTUs falhos aparecem logados (console.error ou tabela)
- [ ] Os 45 restantes são processados normalmente
- [ ] Nenhum erro não tratado (unhandled promise rejection) no log do PM2

---

### S1-T2 — Tabela de log de erros do scraper

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 1h
**Prioridade:** 🔴 Alta
**Depende de:** Nada (pode fazer antes de S1-T1)

#### Contexto
Hoje não existe nenhum registro de quais IPTUs falharam no scraping.
Essa tabela cria auditabilidade e permite **reprocessar apenas os falhos** no futuro.

#### Arquivo a modificar
`apps/backend/prisma/schema.prisma`

#### O que adicionar no schema

```prisma
model ScraperErro {
  id          String   @id @default(cuid())
  nrinscr     String   @db.VarChar(14)
  runId       String   @map("run_id") @db.VarChar(64)
  tentativas  Int      @default(1)
  ultimoErro  String   @db.Text
  httpStatus  Int?     @map("http_status")
  criadoEm    DateTime @default(now()) @map("criado_em")

  @@map("scraper_erros")
  @@index([runId])
  @@index([nrinscr])
  @@index([criadoEm])
}
```

#### Comandos após editar o schema
```bash
cd apps/backend
npx prisma migrate dev --name add_scraper_erros
npx prisma generate
```

#### Critério de aceite
- [ ] Migration executa sem erro
- [ ] Tabela `scraper_erros` existe no banco
- [ ] `prisma generate` atualiza o Prisma Client sem erros

---

### S1-T3 — Handler de rate limit (429) da Assertiva

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 2h
**Prioridade:** 🟡 Média
**Depende de:** Nada

#### Contexto
A Assertiva é uma API paga que cobra por consulta. Se a API retornar 429 (Too Many Requests),
o código atual **ignora o erro e segue em frente** — o CPF é marcado como sem telefone quando
na verdade só estava com rate limit. Resultado: dados perdidos + crédito desperdiçado na próxima
execução quando o cache não bater.

#### Arquivo a modificar
`apps/backend/src/services/mineracao.service.ts`

Buscar pela função que chama a Assertiva. Procurar por: `assertiva` ou `localize/v3` no arquivo.

#### O que implementar

1. Detectar resposta 429 do axios (já está no catch do axios como `error.response.status === 429`)

2. Em caso de 429: aguardar o tempo indicado no header `Retry-After` (se presente) ou usar
   backoff padrão de 5s, 15s, 30s

3. Máximo de 3 retentativas por CPF/CNPJ

4. Se após 3 tentativas ainda 429: **não salvar no cache** e retornar `null`
   — isso garante que a próxima execução vai tentar de novo

#### Atenção importante
O cache da Assertiva (`assertiva_consultas_cache`) só deve ser gravado em respostas de sucesso
(2xx). Hoje provavelmente já é assim, mas confirmar.

#### Critério de aceite
- [ ] Um mock/teste manual com 429 não descarta o CPF silenciosamente
- [ ] O log mostra: `"Assertiva 429 para CPF X — tentativa 2/3"`
- [ ] CPFs que receberam 429 em todas as tentativas NÃO aparecem no cache
- [ ] A concorrência de 6 threads é reduzida automaticamente após o primeiro 429
  (opcional mas recomendado: reduzir para 2 threads até passar)

---

### S1-T4 — Job assíncrono com node-cron (substituir execução síncrona)

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 4h
**Prioridade:** 🔴 Alta
**Depende de:** S1-T1, S1-T2 (recomendado ter antes)

#### Contexto
Hoje, quando o operador clica "Processar" no wizard, a requisição HTTP fica aberta até a
mineração terminar. Com 300+ IPTUs isso causa timeout do browser (120s). O backend processa
mas o frontend não recebe o resultado.

A solução é: POST → retorna `runId` imediatamente → mineração roda em background →
frontend faz polling pelo resultado.

#### Arquivos a modificar
1. `apps/backend/package.json` — adicionar dependência
2. `apps/backend/src/services/mineracao.service.ts` — separar execução em background
3. `apps/backend/src/controllers/admin.mineracao.controller.ts` — mudar resposta do POST
4. `apps/frontend/src/app/admin/mineracao/page.tsx` — mudar para polling por runId

#### Passo a passo

**Backend — instalar dependência:**
```bash
cd apps/backend
npm install node-cron
npm install --save-dev @types/node-cron
```

**Backend — criar fila em memória simples:**

Criar arquivo: `apps/backend/src/services/mineracao.queue.ts`

```typescript
// Fila em memória simples (suficiente para uso de um operador por vez)
// Se escalar para múltiplos operadores simultâneos, migrar para BullMQ

type JobStatus = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'FALHA';

interface Job {
  runId: string;
  status: JobStatus;
  input: any;
  resultado?: any;
  erro?: string;
  iniciadoEm?: Date;
  concluidoEm?: Date;
}

const jobs = new Map<string, Job>();

export function enfileirar(runId: string, input: any): void {
  jobs.set(runId, { runId, status: 'PENDENTE', input });
}

export function obterJob(runId: string): Job | undefined {
  return jobs.get(runId);
}

export function atualizarJob(runId: string, update: Partial<Job>): void {
  const job = jobs.get(runId);
  if (job) jobs.set(runId, { ...job, ...update });
}

// Limpa jobs com mais de 2 horas para evitar vazamento de memória
export function limparJobsAntigos(): void {
  const limite = new Date(Date.now() - 2 * 60 * 60 * 1000);
  for (const [runId, job] of jobs.entries()) {
    if (job.concluidoEm && job.concluidoEm < limite) jobs.delete(runId);
  }
}
```

**Backend — modificar controller:**

Em `admin.mineracao.controller.ts`, método `executar()`:
```typescript
// ANTES: await mineracaoService.executarMineracao(input) — bloqueia até terminar
// DEPOIS:
const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
enfileirar(runId, input);

// Dispara em background sem await
setImmediate(() => {
  atualizarJob(runId, { status: 'PROCESSANDO', iniciadoEm: new Date() });
  mineracaoService.executarMineracao({ ...input, runId })
    .then(resultado => atualizarJob(runId, { status: 'CONCLUIDO', resultado, concluidoEm: new Date() }))
    .catch(erro => atualizarJob(runId, { status: 'FALHA', erro: erro.message, concluidoEm: new Date() }));
});

// Retorna imediatamente
return res.status(202).json({ success: true, data: { runId, status: 'PENDENTE' } });
```

**Backend — adicionar endpoint de status:**

Em `admin.mineracao.routes.ts`:
```
GET /admin/mineracao/jobs/:runId  →  retorna status do job em memória
```

**Frontend — polling por runId:**

Em `page.tsx`, após receber `runId`:
```typescript
// Poll a cada 3s até status ser CONCLUIDO ou FALHA
// Timeout máximo de 10 minutos
// Exibir spinner com mensagem "Minerando X IPTUs..."
```

#### Critério de aceite
- [ ] POST `/executar` retorna em < 500ms com `{ runId, status: 'PENDENTE' }`
- [ ] GET `/jobs/:runId` retorna status correto (PENDENTE/PROCESSANDO/CONCLUIDO/FALHA)
- [ ] Mineração de 500 IPTUs completa sem timeout do frontend
- [ ] Se o backend reiniciar durante o job: o frontend recebe FALHA (não trava para sempre)
- [ ] Jobs com mais de 2h são removidos da memória automaticamente

---

### S1-T5 — SSE de progresso no wizard (barra de progresso)

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 3h
**Prioridade:** 🟡 Média
**Depende de:** S1-T4 (job assíncrono deve estar pronto)

#### Contexto
Com o job assíncrono (S1-T4), o frontend sabe que a mineração está rodando, mas não sabe
quanto avançou. O operador fica olhando para um spinner sem informação. Isso gera ansiedade
e chamadas de suporte ("travou?").

O projeto já usa SSE (Server-Sent Events) no módulo de pedidos (`realtime.service.ts`).
Vamos reutilizar a mesma infraestrutura.

#### Arquivos a modificar
1. `apps/backend/src/services/realtime.service.ts` — adicionar emissão de progresso
2. `apps/backend/src/services/mineracao.service.ts` — emitir eventos durante o loop
3. `apps/frontend/src/app/admin/mineracao/page.tsx` — escutar SSE e exibir progresso

#### O que implementar

**Backend — emitir progresso durante scraping:**

No loop de scraping de IPTUs, após cada lote de 10 processados:
```typescript
realtimeService.emit('mineracao:progresso', {
  runId,
  processados: contador,
  total: totalIptus,
  fase: 'scraping', // ou 'assertiva'
  percentual: Math.round((contador / totalIptus) * 100),
});
```

**Frontend — escutar e exibir:**

O `realtime.service.ts` do frontend já conecta em SSE. Adicionar listener para
`mineracao:progresso` e exibir:

```
[ ████████████░░░░░░░░ ] 60% — Consultando proprietários (180/300)
```

Com as fases visíveis:
- Fase 1: Buscando imóveis na Prefeitura
- Fase 2: Consultando proprietários (scraping)
- Fase 3: Enriquecendo com telefones (Assertiva)
- Fase 4: Salvando leads

#### Critério de aceite
- [ ] Barra de progresso aparece no wizard durante execução
- [ ] Progresso atualiza em tempo real (sem refresh de página)
- [ ] Fases são visíveis ("Scraping 45/300")
- [ ] Se a conexão SSE cair, faz fallback para polling (já implementado em S1-T4)
- [ ] Barra desaparece quando mineração conclui ou falha

---

## Checklist final do Sprint 1

Antes de declarar o Sprint 1 concluído, confirmar:

- [ ] S1-T1: Retry no scraper implementado e testado
- [ ] S1-T2: Tabela `scraper_erros` criada e migration rodada em produção
- [ ] S1-T3: Handler 429 Assertiva implementado
- [ ] S1-T4: Job assíncrono funcionando — mineração de 500 IPTUs não faz timeout
- [ ] S1-T5: Barra de progresso visível no wizard
- [ ] Nenhum `console.log` novo adicionado sem ser `logger.info/warn/error` do Winston
- [ ] Nenhuma variável de ambiente nova adicionada sem documentar no INDEX.md

## Notas do dev (preencher ao trabalhar)

```
Data:
Dev:
Observações:


```
