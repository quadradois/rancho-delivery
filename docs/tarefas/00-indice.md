# TAREFAS — Módulo Mineração / ELYON Prospecting Engine
## Projeto: Rancho Delivery
**Atualizado em:** 2026-05-04 | **Responsável técnico inicial:** a definir

> Leia o `README.md` desta pasta primeiro para entender como usar o sistema.
> Este arquivo é o índice técnico — contexto, arquivos-chave e decisões de projeto.

---

## Como usar este sistema de tarefas

1. Cada sprint tem seu próprio arquivo detalhado (links abaixo)
2. Cada tarefa tem um ID único (`S1-T1`, `S2-T3`, etc.)
3. Ao iniciar uma tarefa: mude o status para `EM ANDAMENTO` e anote seu nome
4. Ao concluir: mude para `CONCLUÍDA` e registre a data
5. Se travar: mude para `BLOQUEADA`, anote o motivo no campo `Bloqueio`
6. **Nunca delete contexto já escrito** — apenas adicione informação

---

## Contexto do Módulo (leia antes de qualquer coisa)

O módulo `/admin/mineracao` é o motor de aquisição de leads do Rancho Delivery.
Ele minera dados de proprietários de imóveis da Prefeitura de Goiânia, enriquece
com telefones via Assertiva, e dispara campanhas via WhatsApp.

**Raio X completo:** [`docs/raio-x/2026-05-04_raio_x_admin_mineracao.md`](../raio-x/2026-05-04_raio_x_admin_mineracao.md)
**Visão futura:** Documentada no mesmo arquivo, seção 6 (TO-BE)

### Arquivos-chave que você vai mexer

| Arquivo | Papel |
|---------|-------|
| `apps/backend/src/services/mineracao.service.ts` | Serviço principal (1.275 linhas) |
| `apps/backend/src/controllers/admin.mineracao.controller.ts` | Controller HTTP |
| `apps/backend/src/routes/admin.mineracao.routes.ts` | Rotas |
| `apps/backend/src/controllers/webhook.controller.ts` | Webhook WhatsApp |
| `apps/backend/src/services/evolution.service.ts` | Envio de mensagens |
| `apps/backend/prisma/schema.prisma` | Schema do banco |
| `apps/frontend/src/app/admin/mineracao/page.tsx` | Wizard frontend |
| `apps/frontend/src/lib/api.ts` | Funções da API no frontend |

### Variáveis de ambiente relevantes (`.env` do backend)

```
ASSERTIVA_CLIENT_ID / ASSERTIVA_CLIENT_SECRET
MINERACAO_SCRAPER_CONCURRENCY=8
MINERACAO_ASSERTIVA_CONCURRENCY=6
MINERACAO_MAX_IPTUS=0
EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE_NAME
```

---

## Visão geral dos Sprints

| Sprint | Arquivo | Foco | Status |
|--------|---------|------|--------|
| Sprint 1 | [01-sprint-fundacao.md](01-sprint-fundacao.md) | Estabilidade e resiliência | 🔵 PRÓXIMO |
| Sprint 2 | [02-sprint-crescimento.md](02-sprint-crescimento.md) | IA de conversação + motor contínuo | ⏳ AGUARDANDO S1 |
| Sprint 3 | [03-sprint-inteligencia-visual.md](03-sprint-inteligencia-visual.md) | Mapa + analytics | ⏳ AGUARDANDO S2 |
| Sprint 4 | [04-sprint-score.md](04-sprint-score.md) | Score de propensidade | ⏳ AGUARDANDO 90 dias de dados |

---

## Resumo de status atual (atualizar a cada sprint)

```
Sprint 1:  0/5 tarefas concluídas
Sprint 2:  0/4 tarefas concluídas
Sprint 3:  0/3 tarefas concluídas
Sprint 4:  0/2 tarefas concluídas
```

---

## Dependências externas confirmadas

| Serviço | Status | Conta/Credencial |
|---------|--------|-----------------|
| Assertiva (CPF→Tel) | ✅ Ativo | `.env` ASSERTIVA_* |
| Evolution API (WhatsApp) | ✅ Ativo | `.env` EVOLUTION_* |
| API GIS Prefeitura Goiânia | ✅ Ativo | Pública, sem autenticação |
| Scraper SCCER Prefeitura | ✅ Ativo | Pública, sem autenticação |
| Claude API (Anthropic) | ❌ Não configurado | Necessário para Sprint 2 |

---

## Histórico de decisões técnicas

| Data | Decisão | Motivo |
|------|---------|--------|
| 2026-05-04 | Usar `node-cron` em vez de BullMQ/Redis | Redis não está instalado no servidor; node-cron é suficiente para o volume atual |
| 2026-05-04 | IA de conversação via Claude API | Já existe `ia.service.ts` no projeto como ponto de extensão natural |
| 2026-05-04 | Score por bairro adiado para Sprint 4 | Banco tem 0 conversões — score sem dados históricos seria ruído |
| 2026-05-04 | Mapa com Leaflet (não Mapbox) | Gratuito, sem chave de API, suficiente para o caso de uso |
