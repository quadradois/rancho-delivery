# RAIO-X AS-IS / TO-BE — Módulo `/admin/mineracao`
## Projeto: Rancho Delivery
**Data:** 2026-05-04 | **Escopo:** Backend · Frontend · DB · Integrações · Performance · UX · Segurança

> **Legenda:** ✅ OK | ⚠️ Atenção | ❌ Ausente/Crítico | 🔴 Risco Alto | 🟡 Risco Médio | 🟢 Risco Baixo

---

## 1. VISÃO GERAL DO MÓDULO

O módulo `/admin/mineracao` é o **motor de aquisição de leads** do Rancho Delivery. Ele permite que o operador localize proprietários de imóveis em Goiânia por bairro, rua ou condomínio, enriqueça os dados com telefones via Assertiva, deduplique contatos e dispare campanhas de WhatsApp — tudo em um único wizard de 4 etapas.

**Stack:**
- **Backend:** Node.js 20 · TypeScript · Express · Prisma ORM · PostgreSQL
- **Frontend:** Next.js 14.1.0 · React 18.2.0 · TypeScript 5.3.3 · Tailwind CSS 3.4.1
- **Dados:** API GIS Prefeitura de Goiânia · Scraper HTML SCCER · Assertiva Soluções (CPF/CNPJ → telefone)
- **Mensageria:** Evolution API (WhatsApp Business)
- **Localização:** `/var/www/rancho-delivery/`

---

## 2. MAPA DE ARQUITETURA ATUAL (AS-IS)

```
┌───────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 14.1.0)                                        │
│  /apps/frontend/src/                                              │
│                                                                   │
│  app/admin/mineracao/page.tsx  ←── MEGA-componente (~400 linhas)  │
│    Wizard 4 etapas:                                               │
│      [1] Busca Local → [2] Seleção IPTUs → [3] Resultado          │
│                                          → [4] Gestão             │
│  components/crm/CrmButton, CrmCard, CrmInput, CrmSelect           │
│  lib/api.ts  ←── adminMineracao.* (7 funções)                    │
│  lib/api-client.ts  ←── HTTP client centralizado                  │
└────────────────────┬──────────────────────────────────────────────┘
                     │ REST (sem realtime / polling)
                     ▼
┌───────────────────────────────────────────────────────────────────┐
│  BACKEND (Express + TypeScript)                                    │
│  /apps/backend/src/                                               │
│                                                                   │
│  routes/admin.mineracao.routes.ts     ←── 12 rotas HTTP           │
│  controllers/admin.mineracao.controller.ts  ←── 12 métodos        │
│  services/mineracao.service.ts        ←── 1.275 linhas            │
│    ├── executarMineracao()            ←── orquestrador principal   │
│    ├── buscarLocais()                 ←── API GIS Prefeitura       │
│    ├── listarIptusLocal()             ←── filtro local DB          │
│    ├── scrapearIptu()                 ←── HTML SCCER (concurr. 8)  │
│    ├── consultarAssertiva()           ←── API REST + cache DB      │
│    ├── salvarLeadMinerado()           ←── upsert c/ dedup          │
│    ├── criarCampanha()                ←── campanha automática      │
│    └── dispararCampanha()             ←── loop p/ cada lead        │
│  middlewares/adminAuth.middleware.ts  ←── JWT HS256                │
└────────────────────┬──────────────────────────────────────────────┘
                     │ Prisma ORM
                     ▼
┌───────────────────────────────────────────────────────────────────┐
│  BANCO DE DADOS (PostgreSQL)                                       │
│                                                                   │
│  leads_marketing          ←── contatos minerados + status         │
│  execucoes_mineracao      ←── log de cada run                     │
│  imoveis_prefeitura       ←── cache local do GIS                  │
│  campanhas_marketing      ←── campanha + mensagem + filtro        │
│  campanhas_destinatarios  ←── lead × campanha × status envio      │
│  assertiva_consultas_cache ←── cache CPF/CNPJ → telefone (365d)   │
└───────────────────────────────────────────────────────────────────┘
         │               │               │               │
         ▼               ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────────┐
│ API GIS      │ │ Scraper HTML │ │Assertiva │ │ Evolution API    │
│ Prefeitura   │ │ SCCER/IPTU   │ │CPF→Fone  │ │ WhatsApp         │
│ (imóveis)    │ │ (proprietár.)│ │ (enrich.)│ │ (campanhas)      │
└──────────────┘ └──────────────┘ └──────────┘ └──────────────────┘
```

---

## 3. FLUXO DE EXECUÇÃO AS-IS

### 3.1 Wizard do Frontend (4 Etapas)

```
Etapa 1 — Busca Local
  └─ Usuário escolhe [condominio | bairro | rua] + digita termo
  └─ GET /admin/mineracao/locais?modo=...&q=...
  └─ Exibe lista de locais com totalIptus

Etapa 2 — Seleção de IPTUs
  └─ GET /admin/mineracao/iptus?modo=...&nome=...&limit=10000
  └─ Checkboxes individuais + "Selecionar todos"
  └─ "Processar selecionados" → POST /admin/mineracao/executar

Etapa 3 — Resultado
  └─ Exibe: totalImoveis, contatosGerados, contatosUteis, erro
  └─ Lista leads do run (GET /admin/mineracao/leads?runId=...&status=ATIVO)
  └─ Campanha criada automaticamente (nome gerado automaticamente)

Etapa 4 — Gestão
  └─ Origem: "modo:termo" (ex.: condominio:Residencial Alpha)
  └─ Link para /admin/campanhas
  └─ Botão "Nova Mineração" reinicia wizard
```

### 3.2 Fluxo de Execução Backend

```
POST /executar
  │
  ├─[1] Validação (modo + termo obrigatórios)
  │
  ├─[2] Busca imóveis no DB local (imoveis_prefeitura)
  │       Fallback → API GIS Prefeitura Goiânia
  │
  ├─[3] Extrai IPTUs filtrados (pode ser lista do frontend)
  │       Aplica limite MINERACAO_MAX_IPTUS (0 = sem limite)
  │
  ├─[4] Scraper HTML paralelo (concorrência: 8 threads)
  │       Para cada IPTU → SCCER Prefeitura
  │       Extrai: nome, CPF/CNPJ, endereço via regex
  │       Timeout: 5s por IPTU
  │
  ├─[5] Enriquecimento Assertiva paralelo (concorrência: 6 threads)
  │       Para cada CPF/CNPJ → verifica cache (365 dias)
  │       Cache miss → API Assertiva → persiste cache
  │       Retorna: telefones[], emails[]
  │
  ├─[6] Deduplicação e salvamento de leads
  │       Se existe CPF/CNPJ → merge telefones
  │       Se existe telefone → merge dados
  │       Novo → insert
  │       Invalida duplicados legados
  │
  ├─[7] Cria campanha automática + run log (ExecucaoMineracao)
  │
  └─[8] Retorna resultado com métricas
```

### 3.3 Disparo de Campanha

```
POST /campanhas/:id/disparar
  │
  ├─ Status → ENVIANDO
  ├─ Para cada destinatário PENDENTE:
  │     ├─ Verifica se lead já é cliente ativo
  │     │     └─ Sim → status = IGNORADO_CONVERTIDO (pula)
  │     ├─ Envia via Evolution API (WhatsApp)
  │     │     ├─ Sucesso → status = ENVIADO
  │     │     └─ Falha → status = FALHA + motivoFalha
  │     └─ Commit por destinatário
  └─ Status → CONCLUIDA | FALHA (se todos falharam)
```

---

## 4. DIAGNÓSTICO AS-IS

### 4.1 Frontend

| Item | Status | Observação |
|------|--------|------------|
| Wizard linear (4 etapas) | ✅ | UX clara para o operador |
| Seleção granular de IPTUs | ✅ | Checkbox individual + "todos" |
| Feedback de resultado | ✅ | Métricas básicas exibidas |
| Recuperação de erro | ⚠️ | Polling de 1.5s sem timeout máximo |
| Progresso durante execução | ❌ | Sem barra de progresso / streaming |
| Histórico de execuções | ❌ | Endpoint existe, não está na UI |
| Filtros de leads na UI | ❌ | Endpoint existe, não está na UI |
| Testes | ❌ | Sem cobertura de testes |
| Componente único de 400+ linhas | 🟡 | Sem separação de responsabilidades |
| Estado via useState local | 🟡 | Sem gerenciamento de estado robusto |

### 4.2 Backend

| Item | Status | Observação |
|------|--------|------------|
| Serviço estruturado (1.275 linhas) | ⚠️ | Arquivo muito longo, múltiplas responsabilidades |
| Deduplicação de leads | ✅ | Merge por CPF e por telefone |
| Cache Assertiva 365 dias | ✅ | Evita custo redundante |
| Concorrência configurável | ✅ | `p-limit` para scraper e Assertiva |
| Scraper frágil (regex em HTML) | 🔴 | Quebra silenciosamente se layout mudar |
| Timeout sem retry | 🟡 | IPTUs com timeout são descartados |
| Campanha disparada sequencialmente | 🟡 | Sem fila, bloqueia a requisição |
| Sem job assíncrono (queue) | 🔴 | Mineração de 1000+ IPTUs pode timeout HTTP |
| Sem logs estruturados | ⚠️ | Apenas console.log/error |
| Autenticação por permissão | ✅ | `clientes:gerenciar` em todas as rotas |
| Testes | ❌ | Sem cobertura de testes |
| Rate limit Assertiva | ⚠️ | Concorrência fixa, sem tratamento de 429 |

### 4.3 Banco de Dados

| Item | Status | Observação |
|------|--------|------------|
| Índices em leads_marketing | ✅ | status, origemMineracao, bairro |
| Índices em imoveis_prefeitura | ✅ | nmbairro, nmlogradou, nmedificio |
| Cache Assertiva com TTL | ✅ | expiraEm indexado |
| Sem particionamento | ⚠️ | leads_marketing pode crescer muito |
| Sem soft-delete | ⚠️ | Exclusão de campanha é física |
| Chave única por telefone | ✅ | Deduplicação garantida em DB |
| Chave única CPF/CNPJ | ✅ | Deduplicação garantida em DB |

### 4.4 Integrações Externas

| Integração | Status | Risco | Observação |
|------------|--------|-------|------------|
| API GIS Prefeitura Goiânia | ✅ | 🟡 | Sem SLA, sem autenticação |
| Scraper SCCER (HTML) | ⚠️ | 🔴 | Frágil, sem monitoring, falhas silenciosas |
| Assertiva (CPF/CNPJ → Tel.) | ✅ | 🟡 | Custo por consulta, cache 365 dias |
| Evolution API (WhatsApp) | ✅ | 🟡 | Dependente de instância "rancho-comida" |

---

## 5. PRINCIPAIS RISCOS AS-IS

| # | Risco | Impacto | Probabilidade |
|---|-------|---------|---------------|
| R1 | Scraper HTML quebra sem alerta se Prefeitura mudar layout | Alto | Alta |
| R2 | Mineração de >500 IPTUs faz timeout HTTP (sem job assíncrono) | Alto | Média |
| R3 | Disparo de campanha bloqueia requisição HTTP por minutos | Médio | Alta |
| R4 | Rate limit Assertiva (429) não tratado → perda silenciosa de dados | Médio | Média |
| R5 | Sem observabilidade: erros individuais de scraper não são rastreados | Médio | Alta |
| R6 | Leads inválidos permanecem no banco sem expiração automática | Baixo | Alta |

---

## 6. VISÃO TO-BE

### 6.1 Princípios da Evolução

1. **Resiliência:** falhas externas não devem interromper o pipeline nem corromper dados
2. **Observabilidade:** cada etapa da mineração deve ser auditável e rastreável
3. **Escalabilidade:** suportar lotes de 5.000+ IPTUs sem degradar a UX
4. **Feedback em tempo real:** o operador deve saber exatamente o que está acontecendo
5. **Autonomia de campanha:** o disparo deve ser assíncrono, com retentativa automática

### 6.2 Arquitetura TO-BE

```
┌───────────────────────────────────────────────────────────────────┐
│  FRONTEND TO-BE                                                    │
│                                                                   │
│  app/admin/mineracao/                                             │
│    page.tsx              ←── orquestrador leve (<100 linhas)      │
│    components/           ←── LocalSearch, IptuSelector,           │
│                               RunProgress, LeadsList,             │
│                               CampanhaPanel                       │
│    hooks/useMineracao.ts ←── estado + SSE progress stream         │
│    hooks/useLeads.ts     ←── filtro, paginação, export            │
│                                                                   │
│  NOVO: Barra de progresso SSE (% IPTUs processados)              │
│  NOVO: Histórico de execuções (tabela paginada)                   │
│  NOVO: Filtros de leads na UI (status, bairro, origem)           │
│  NOVO: Export CSV de leads                                        │
└────────────────────┬──────────────────────────────────────────────┘
                     │ REST + SSE (progress stream)
                     ▼
┌───────────────────────────────────────────────────────────────────┐
│  BACKEND TO-BE                                                     │
│                                                                   │
│  services/mineracao/                                              │
│    MineracaoOrchestrator.ts  ←── coordena o pipeline              │
│    ScraperService.ts         ←── scraper com retry + monitoring   │
│    AssertivaService.ts       ←── rate-limit aware + retry 429    │
│    LeadRepository.ts         ←── upsert + dedup                  │
│    MineracaoProgressEmitter  ←── SSE progress por runId          │
│                                                                   │
│  NOVO: Job assíncrono via BullMQ (Redis)                         │
│    queue: mineracao-jobs                                          │
│    queue: campanha-jobs                                           │
│  NOVO: Retry automático (3x) por IPTU falho                      │
│  NOVO: Logs estruturados (Winston/Pino) + sentry                 │
│  NOVO: Rate-limit handler Assertiva (backoff exponencial)        │
└────────────────────┬──────────────────────────────────────────────┘
                     │ Prisma ORM
                     ▼
┌───────────────────────────────────────────────────────────────────┐
│  BANCO DE DADOS TO-BE                                             │
│                                                                   │
│  leads_marketing         ←── + campo opt_out_em, nota_interna    │
│  execucoes_mineracao     ←── + campo progresso (JSON streaming)   │
│  imoveis_prefeitura      ←── + ttl_cache (revalidação 30 dias)   │
│  scraperErros            ←── NOVA: log de falhas por IPTU        │
│  campanhas_marketing     ←── + soft-delete (deletado_em)         │
│                                                                   │
│  NOVO: Particionamento leads_marketing por criadoEm (semestral)  │
└───────────────────────────────────────────────────────────────────┘
         │               │               │               │
         ▼               ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────────┐
│ API GIS      │ │ Scraper HTML │ │Assertiva │ │ Evolution API    │
│ Prefeitura   │ │ SCCER        │ │ + cache  │ │ WhatsApp         │
│ + revalidação│ │ + retry 3x  │ │ + backoff│ │ + retry / queue  │
│ 30 dias      │ │ + alertas   │ │ exp. 429 │ │ assíncrona       │
└──────────────┘ └──────────────┘ └──────────┘ └──────────────────┘
```

### 6.3 Melhorias Prioritárias TO-BE

#### PRIORIDADE 1 — Resiliência Imediata (Sprint 1)

| Melhoria | Arquivo Alvo | Esforço |
|----------|-------------|---------|
| Retry 3x com backoff no scraper por IPTU | `services/mineracao.service.ts` | P |
| Handler 429 Assertiva com backoff exponencial | `services/mineracao.service.ts` | P |
| Log estruturado de falhas por IPTU (tabela `scraper_erros`) | Schema + service | M |
| Timeout de polling no frontend (máx. 5 min) | `app/admin/mineracao/page.tsx` | P |

#### PRIORIDADE 2 — Escalabilidade (Sprint 2)

| Melhoria | Arquivo Alvo | Esforço |
|----------|-------------|---------|
| Job assíncrono BullMQ para execução de mineração | `services/mineracao.job.ts` + Redis | G |
| SSE de progresso (% IPTUs processados) | Backend event + hook frontend | M |
| Barra de progresso visual no wizard | `page.tsx` → `RunProgress.tsx` | P |
| Disparo de campanha via fila assíncrona | `services/campanha.job.ts` | M |

#### PRIORIDADE 3 — Observabilidade (Sprint 3)

| Melhoria | Arquivo Alvo | Esforço |
|----------|-------------|---------|
| Dashboard de execuções na UI (histórico) | Nova seção no wizard | M |
| Filtros de leads na UI (status, bairro, origem, data) | `page.tsx` → `LeadsList.tsx` | M |
| Export CSV de leads | Backend endpoint + botão UI | P |
| Alert automático se taxa de falha scraper > 30% | Service + notificação WhatsApp | M |
| Soft-delete para campanhas | Prisma migration + controller | P |

#### PRIORIDADE 4 — Qualidade de Código (Sprint 4)

| Melhoria | Arquivo Alvo | Esforço |
|----------|-------------|---------|
| Quebrar `mineracao.service.ts` em 4 serviços | Refactor | G |
| Quebrar `page.tsx` em 5 componentes | Refactor | M |
| Testes unitários do serviço de scraping | `__tests__/` | M |
| Testes de integração do pipeline completo | `__tests__/` | G |

> **Esforço:** P = Pequeno (< 4h) · M = Médio (4–16h) · G = Grande (> 16h)

---

## 7. COMPARATIVO AS-IS vs TO-BE

| Dimensão | AS-IS | TO-BE |
|----------|-------|-------|
| **Tamanho máximo de lote** | ~300 IPTUs (timeout HTTP) | 10.000+ IPTUs (job assíncrono) |
| **Feedback de progresso** | Nenhum (tela trava) | Barra de progresso em tempo real (SSE) |
| **Resiliência do scraper** | Falha silenciosa | Retry 3x + log auditável + alerta |
| **Rate limit Assertiva** | Ignora 429 | Backoff exponencial + retry |
| **Disparo de campanha** | Síncrono (bloqueia HTTP) | Assíncrono (BullMQ) |
| **Histórico de execuções** | Endpoint existe, sem UI | Tabela paginada no wizard |
| **Gestão de leads** | Sem filtros na UI | Filtros completos + export CSV |
| **Observabilidade** | console.log | Logs estruturados + métricas |
| **Testes** | 0% cobertura | >60% cobertura (serviços críticos) |
| **Tamanho do componente principal** | ~400 linhas (monolito) | <100 linhas + 5 sub-componentes |
| **Tamanho do serviço principal** | 1.275 linhas (monolito) | 4 serviços de ~300 linhas cada |
| **Campanhas deletadas** | Exclusão física permanente | Soft-delete com histórico |

---

## 8. MAPA DE ARQUIVOS

### Frontend

| Arquivo | Status | Papel |
|---------|--------|-------|
| `app/admin/mineracao/page.tsx` | ⚠️ Monolito | Wizard completo — candidato à quebra |
| `lib/api.ts` | ✅ | 7 funções `adminMineracao.*` |
| `lib/api-client.ts` | ✅ | HTTP client centralizado |
| `components/crm/CrmButton.tsx` | ✅ | Botão reutilizável |
| `components/crm/CrmCard.tsx` | ✅ | Container |
| `components/crm/CrmInput.tsx` | ✅ | Input + CrmSelect |

### Backend

| Arquivo | Status | Papel |
|---------|--------|-------|
| `routes/admin.mineracao.routes.ts` | ✅ | 12 rotas, auth OK |
| `controllers/admin.mineracao.controller.ts` | ✅ | 12 métodos, bem separados |
| `services/mineracao.service.ts` | 🔴 Monolito | 1.275 linhas, 4 responsabilidades |

### Banco de Dados

| Tabela | Status | Papel |
|--------|--------|-------|
| `leads_marketing` | ✅ | Contatos minerados |
| `execucoes_mineracao` | ✅ | Histórico de runs |
| `imoveis_prefeitura` | ✅ | Cache GIS local |
| `campanhas_marketing` | ⚠️ | Sem soft-delete |
| `campanhas_destinatarios` | ✅ | Lead × campanha |
| `assertiva_consultas_cache` | ✅ | Cache 365 dias |

---

## 9. CONCLUSÃO

O módulo `/admin/mineracao` está **funcionalmente completo e operacional**, com uma lógica de deduplicação sofisticada, cache inteligente e integração com múltiplas fontes externas. Os principais débitos técnicos concentram-se em três pontos:

1. **Risco operacional imediato:** O scraper HTML não tem retry nem alertas — qualquer mudança no site da Prefeitura interrompe silenciosamente a coleta de dados. Isso deve ser tratado com prioridade.

2. **Escalabilidade bloqueada:** Lotes grandes de IPTUs causam timeout HTTP pois a execução é síncrona. A introdução de um job assíncrono (BullMQ) com SSE de progresso desbloquearia lotes de 5.000–10.000 IPTUs.

3. **Débito de observabilidade:** Sem logs estruturados e sem métricas, incidentes são descobertos pelo operador (UX ruim) antes de serem detectados pelo sistema.

O caminho recomendado é endereçar os itens de **Prioridade 1 (resiliência)** no próximo sprint, antes de evoluir a UX e escalar os lotes.
