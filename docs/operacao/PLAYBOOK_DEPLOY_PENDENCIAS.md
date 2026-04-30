# PLAYBOOK_DEPLOY_PENDENCIAS

**Data:** 2026-04-30  
**Projeto:** Sabor Express / Rancho Comida Caseira  
**Status:** Pre-Deploy (Go para staging, No-Go para producao)  
**Objetivo:** Organizar e executar todas as pendencias criticas para elevar maturidade de deploy.

## 1. Criterio de Go/No-Go

Liberar deploy de producao somente quando todos os itens abaixo estiverem concluidos:

- [x] Contrato Frontend x Backend de pedidos alinhado (teste automatizado bloqueado por ambiente)
- [x] Regra de taxa de entrega unificada entre frontend e backend
- [ ] Fluxo E2E validado: pedido -> pagamento -> webhook -> notificacao WhatsApp
- [~] Segredos e credenciais removidos de documentos e rotacionados
- [ ] Checklist de operacao (PM2/Nginx/SSL/Firewall/monitoramento) validado

## 2. Pendencias Criticas Encontradas

### P0 - Bloqueia producao

- [x] **P0.1 - Alinhar contrato de criacao de pedido (Frontend x Backend)**
  - Sintoma: frontend envia payload em formato diferente do esperado no backend.
  - Impacto: risco de falha ao finalizar pedido.
  - Evidencias:
    - `apps/frontend/src/app/checkout/page.tsx`
    - `apps/frontend/src/lib/api.ts`
    - `apps/backend/src/controllers/pedido.controller.ts`
  - Criterio de pronto:
    - `POST /api/pedidos` aceitando payload unico e documentado
    - teste de integracao passando para criacao real de pedido

- [x] **P0.2 - Unificar calculo de taxa de entrega**
  - Sintoma: frontend usa taxa fixa/CEP em pontos da UI, backend valida por bairro.
  - Impacto: divergencia de total exibido vs total cobrado.
  - Evidencias:
    - `apps/frontend/src/app/cart/page.tsx`
    - `apps/frontend/src/app/checkout/page.tsx`
    - `apps/backend/src/routes/bairro.routes.ts`
    - `apps/backend/src/controllers/bairro.controller.ts`
  - Criterio de pronto:
    - fonte unica de verdade no backend
    - frontend consumindo somente regra oficial da API

- [~] **P0.3 - Validacao E2E de pagamento e webhook (InfinitePay)**
  - Sintoma: fluxo existe em codigo, mas sem comprovacao operacional ponta a ponta em ambiente proximo de producao.
  - Impacto: pedido pode ficar sem confirmacao e sem notificacao ao dono.
  - Evidencias:
    - `apps/backend/src/services/pedido.service.ts`
    - `apps/backend/src/controllers/webhook.controller.ts`
    - `apps/backend/src/routes/webhook.routes.ts`
    - `apps/backend/src/services/evolution.service.ts`
  - Criterio de pronto:
    - criar pedido real
    - pagar (sandbox/producao controlada)
    - webhook confirmar status
    - WhatsApp enviado ao dono

- [~] **P0.4 - Seguranca de credenciais e segredos**
  - Sintoma: arquivo de handoff contem credenciais sensiveis em texto.
  - Impacto: risco de comprometimento de ambiente/producao.
  - Evidencias:
    - `docs/operacao/HANDOFF.md`
  - Criterio de pronto:
    - remover segredos de docs
    - rotacionar senhas/tokens/chaves
    - padronizar uso de placeholders

### P1 - Alto impacto (nao bloqueia deploy tecnico, mas aumenta risco)

- [ ] **P1.1 - Consolidar documentacao de integracao para runtime atual**
  - Sintoma: parte da documentacao ainda descreve Asaas enquanto runtime principal esta em InfinitePay.
  - Impacto: erro operacional, onboarding confuso, troubleshooting lento.
  - Evidencias:
    - `docs/integracoes/INTEGRACAO_ASAAS.md`
    - `docs/integracoes/API_ENDPOINTS.md`
    - `docs/planejamento/PLANEJAMENTO_SABOR_EXPRESS.md`
  - Criterio de pronto:
    - status de cada integracao claro: ativa, legada, futura
    - endpoint webhook oficial unico documentado
  - Status de execucao:
    - [x] Criado `docs/integracoes/INTEGRACAO_INFINITEPAY.md` como fonte oficial ativa
    - [x] `docs/integracoes/INTEGRACAO_ASAAS.md` marcado como legado
    - [x] `docs/integracoes/API_ENDPOINTS.md` atualizado para webhook oficial InfinitePay
    - [x] `docs/integracoes/INTEGRACAO_WHATSAPP.md` atualizado para fluxo InfinitePay

- [x] **P1.2 - Higienizar identidade de dominio/marca no codigo**
  - Sintoma: coexistencia de termos Sabor Express e Rancho em varios pontos.
  - Impacto: inconsistencias de UX, configuracao e operacao.
  - Evidencias:
    - `apps/frontend/src/contexts/CartContext.tsx` (`rancho:carrinho`)
    - `apps/frontend/src/app/admin/page.tsx` (textos)
    - `.env.example` (nomes e handles)
  - Criterio de pronto:
    - dicionario de naming oficial
    - texto, storage keys e envs harmonizados
  - Status de execucao:
    - [x] Criado dicionario em `docs/governanca/NAMING_OFICIAL.md`
    - [x] Storage key atualizada para `sabor-express:carrinho`
    - [x] Texto do painel admin harmonizado para Sabor Express

### P2 - Maturidade operacional

- [~] **P2.1 - Fechar observabilidade minima de producao**
  - Logs de negocio para pedidos e webhooks
  - Alertas para falha de webhook e falha de envio WhatsApp
  - Healthchecks monitorados (`/health`)
  - Status de execucao:
    - [x] Logs com contexto reforcados no webhook (pedido/evento/idempotencia)
    - [ ] Alertas externos ainda dependem da infraestrutura (monitoramento no servidor)

- [x] **P2.2 - Runbook de incidentes**
  - Procedimento para: pagamento confirmado sem pedido atualizado
  - Procedimento para: WhatsApp indisponivel
  - Procedimento para: rollback de release
  - Status de execucao:
    - [x] Criado `docs/operacao/RUNBOOK_INCIDENTES_DEPLOY.md`
    - [x] Criado `docs/operacao/RUNBOOK_E2E_INFINITEPAY.md`

## 3. Plano de Execucao (ordem recomendada)

1. Corrigir contrato de pedido (`P0.1`)
2. Corrigir taxa de entrega (`P0.2`)
3. Executar E2E completo de pagamento/webhook (`P0.3`)
4. Tratar credenciais e rotacao (`P0.4`)
5. Consolidar documentacao e naming (`P1.1`, `P1.2`)
6. Finalizar operacao e observabilidade (`P2.1`, `P2.2`)

## 4. Checklist Tecnico por Camada

### Backend
- [x] Validacao de schema de entrada do pedido com contrato final
- [~] Teste de integracao para `POST /api/pedidos` (arquivo atualizado, execucao bloqueada por ambiente)
- [~] Confirmacao de status via webhook InfinitePay (simulacao documentada, validacao real pendente)
- [x] Idempotencia basica no processamento do webhook
- [~] Logs estruturados com `pedidoId`, `pagamentoId`, `evento` (parcial, sem stack de observabilidade externa)

### Frontend
- [x] Checkout montando payload oficial
- [x] Total sempre baseado em regra oficial da API para taxa
- [x] Mensagens de erro claras para bairro nao atendido e falha de pagamento
- [ ] Fluxo de confirmacao `/pedido/[id]` cobrindo estados `PENDENTE` e `CONFIRMADO`

### Banco
- [ ] Migrations aplicadas sem drift
- [ ] Seed funcional para dados minimos (produtos/bairros)
- [ ] Indices necessarios para consulta de pedidos e webhooks validados

### Infra
- [ ] PM2 com restart policy e persistencia
- [ ] Nginx para frontend e API com headers corretos
- [ ] SSL ativo e renovacao automatica
- [ ] Firewall com portas minimas abertas

## 5. Checklist de Validacao Final (Go-Live)

- [ ] Pedido de teste criado pelo frontend em dominio final
- [ ] Pagamento aprovado no gateway
- [ ] Webhook recebido e logado
- [ ] Pedido atualizado para `CONFIRMADO`
- [ ] Notificacao WhatsApp entregue ao dono
- [ ] Painel admin visualiza novo pedido corretamente
- [ ] Sem segredos em repositorio/documentacao

## 6. Responsaveis e Evidencias

Preencher ao executar:

- Responsavel tecnico:
- Data da execucao:
- Ambiente validado: `staging` / `producao`
- Links de PRs:
- Evidencias (logs, prints, ids de pedido/webhook):

## 7. Resultado Atual

**Classificacao atual:** `NO-GO para producao`  
**Justificativa:** P0.3 pendente (validacao E2E real) e hardening operacional ainda aberto.

## 8. Atualizacao de Execucao (2026-04-30)

Implementacoes concluidas nesta rodada:

- [x] Contrato frontend/backend ajustado para payload oficial de `POST /api/pedidos`
- [x] Checkout atualizado para usar validacao de bairro/taxa pelo backend
- [x] Carrinho removido de taxa fixa local (taxa oficial no checkout)
- [x] Webhook InfinitePay com idempotencia para evitar reprocesamento
- [x] Testes de webhook e pedido atualizados para runtime InfinitePay
- [x] Credenciais sensiveis removidas de `docs/operacao/HANDOFF.md`
- [x] Documentacao oficial de integracao migrada para InfinitePay
- [x] Runbook E2E criado (`docs/operacao/RUNBOOK_E2E_INFINITEPAY.md`)
- [x] Runbook de incidentes criado (`docs/operacao/RUNBOOK_INCIDENTES_DEPLOY.md`)
- [x] Dicionario de naming oficial criado (`docs/governanca/NAMING_OFICIAL.md`)
- [x] Harmonizacao de storage key para `sabor-express:carrinho`

Pendencias bloqueadas nesta rodada:

- [ ] Execucao do pipeline automatizado (`typecheck`, `lint`, `test`, `build`)
  - Bloqueio: ambiente sem `node` no shell (`pnpm` falha com `exec: node: not found`)
- [ ] Regressao E2E real com gateway + webhook + WhatsApp em ambiente de homologacao/producao
- [ ] Rotacao real de segredos (acao operacional no servidor e provedores)
