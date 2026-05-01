# Plano de Execução — Cockpit Rancho

> Documento único de controle. Substitui os checklists anteriores.
> Cruza: TASK_COCKPIT_RANCHO + TASK_SEPARACAO_DESIGN_SYSTEMS + estado atual do código.
> Atualizado em: 2026-05-01

---

## Estado atual do código (diagnóstico)

| O que existe | Problema |
|---|---|
| `apps/frontend/src/styles/design-system.css` | Tokens do site (madeira/brasa) carregados globalmente — contamina o admin |
| `apps/frontend/src/app/layout.tsx` | Importa `design-system.css` e carrega Alfa Slab One para TODAS as rotas |
| `apps/frontend/src/app/admin/layout.tsx` | Sidebar funcional, mas usa Tailwind genérico + tokens do site |
| `apps/frontend/src/app/admin/pedidos/page.tsx` | Tabela + painel lateral básico — polling a cada 30s, sem WebSocket |
| `tailwind.config.js` | Só tem `Rustic Printed` e `Nunito` — sem Sora/DM Sans do CRM |
| `packages/shared/styles/` | Pasta não existe ainda |

---

## Andamento real (2026-05-01)

### Já entregue recentemente

- [x] Pedido nasce antes do pagamento e fica em `AGUARDANDO_PAGAMENTO`
- [x] Expiração automática de checkout (`EXPIRADO`) + abandono (`ABANDONADO`)
- [x] Métricas de abandono em `GET /api/pedidos/metricas/abandono`
- [x] Webhook InfinitePay com validação robusta de token (inclui `Bearer ...`)
- [x] Correção operacional de pedido pago não confirmado (caso `#BJHFIO`)

### Gap atual para o Cockpit

- [ ] Endpoints ainda estão em `/api/pedidos`; plano do cockpit prevê `/api/admin/...`
- [x] Design systems separados por produto/rota (FASE 0 concluída e deployado)
- [x] Admin com base CRM (tokens CRM + dark/light persistente)

### Execução sugerida para agora (ordem de impacto)

1. Fechar **FASE 0** completa (tokens, fontes, layout por rota, tailwind)
2. Entregar **B1a/B1b** em `/api/admin/pedidos` sem quebrar `/api/pedidos` atual
3. Montar **split-panel F1 + card F3a** consumindo `/api/admin/pedidos`
4. Migrar polling para SSE/WebSocket somente após F1/F3 estáveis

---

## Fases de execução

---

## FASE 0 — Separação dos Design Systems ⚡ *pré-requisito de tudo*

> Bloqueante. Nada do Cockpit deve ser construído antes desta fase.

### 0.1 — Criar tokens CSS separados

- [x] Criar `packages/shared/styles/tokens.site.css`
  - Copiar todos os tokens de `apps/frontend/src/styles/design-system.css`
  - Paleta: `--madeira-*`, `--brasa-*`, `--mel-campo`, `--bege-*`, `--cinza-couro`, `--verde-campo`, `--fuligem`
  - Fontes: `Rustic Printed`, `Nunito`, `Alfa Slab One`

- [x] Criar `packages/shared/styles/tokens.crm.css`
  - Extrair do `Rancho_CRM_DesignSystem.html` (fonte de verdade)
  - Primitivos: escala `--brasa-50` → `--brasa-900`, escala `--neutral-0` → `--neutral-950`
  - Dark mode padrão em `:root, .dark-mode { ... }`
  - Light mode override em `.light-mode { ... }`
  - Tipografia: `--font-display: 'Sora'`, `--font-body: 'DM Sans'`, `--font-mono: 'JetBrains Mono'`
  - Dimensões cockpit: `--sidebar-width: 220px`, `--topbar-height: 64px`

### 0.2 — Isolar fontes por produto

- [x] `apps/frontend/src/app/layout.tsx` (root — site de pedidos)
  - Remover Alfa Slab One do `<head>` (já existe via CSS import)
  - Garantir que carrega APENAS as fontes do site: `Alfa Slab One`, `Nunito`
  - **Não** carregar Sora nem DM Sans aqui

- [x] `apps/frontend/src/app/admin/layout.tsx` (cockpit)
  - Adicionar `<link>` Google Fonts: `Sora:wght@400;500;600;700` + `DM+Sans:opsz,wght@9..40,400..700` + `JetBrains+Mono`
  - Adicionar `<html className="dark-mode">` por padrão
  - Persistir preferência `dark-mode` / `light-mode` no `localStorage`

### 0.3 — Isolar tokens CSS por rota

- [x] `apps/frontend/src/app/layout.tsx`
  - Importar apenas `tokens.site.css` (ou manter o `design-system.css` atual renomeado)
  - **Remover** qualquer token `--color-bg`, `--color-surface` que conflite com o CRM

- [x] `apps/frontend/src/app/admin/layout.tsx`
  - Importar apenas `tokens.crm.css`
  - Aplicar `className="dark-mode"` no wrapper raiz do layout

### 0.4 — Tailwind: fontes do CRM

- [x] `apps/frontend/tailwind.config.js`
  - Adicionar `sora: ['Sora', 'sans-serif']`
  - Adicionar `dm-sans: ['DM Sans', 'sans-serif']`
  - Adicionar `mono-crm: ['JetBrains Mono', 'monospace']`

### 0.5 — Verificação

- [x] Site de pedidos: fundo `--madeira-fundo`, títulos `Alfa Slab One`, sem token `--color-bg` do CRM
- [x] Admin: dark mode ativo por padrão, superfícies `--color-surface`, acento `--color-accent` (#D4601C), títulos Sora
- [x] Toggle dark/light no admin funcionando e persistindo no localStorage
- [x] Nenhuma tela misturando tokens dos dois sistemas

### 0.6 — Evidências de execução

- [x] Commit GitHub (backend abandono/webhook): `7531603`
- [x] Commit GitHub (separação DS + tema CRM): `8c7d6bc`
- [x] Deploy em produção concluído após correção de permissão em `.next/server`

---

## FASE 1 — Componentes Base do CRM

> Com tokens disponíveis, construir os blocos visuais reutilizáveis.
> Todos os componentes em: `apps/frontend/src/components/crm/`

### Frontend

- [x] `CrmBadge` — variantes: `pending` (amber), `preparing` (blue), `waiting` (yellow), `on-route` (green), `delivered` (neutral), `cancelled` (red), `paid` (green), `unpaid` (neutral), `expired` (red)
- [x] `CrmButton` — variantes: `primary`, `ghost`, `danger`, `success`; tamanhos `sm`, `md`, `lg`
- [x] `CrmCard` — container com `--color-surface` e `--color-border`, variante `raised`
- [x] `CrmTab` + `CrmTabPanel` — abas horizontais com indicador ativo
- [x] `CrmTimer` — exibe `MM:ss` com mudança de cor: normal → `--color-warning-text` → `--color-danger-text`; suporte a animação de piscar
- [x] `CrmInput` / `CrmSelect` — campos com `--color-surface-input`, focus em `--color-border-focus`
- [x] `CrmModal` — dialog com backdrop, usado para cancelamento e pedido manual
- [x] `CrmAvatar` — initial letter avatar para operador/cliente

---

## FASE 2 — Layout Split-Panel + Lista de Pedidos

> Estrutura central do cockpit. Consome o endpoint B1 abaixo.

### Backend

- [x] **B1a** `GET /api/admin/pedidos`
  - Retorna todos os pedidos ordenados por urgência (status + tempo no estágio)
  - Campos: id, numero, status, statusPagamento, clienteNome, clienteTelefone, bairro, itens resumidos, total, createdAt, `tempoNoEstagio` (segundos)
  - Filtros opcionais: `?status=` e `?busca=`

- [x] **B1b** `GET /api/admin/pedidos/:id`
  - Detalhe completo: itens com produto, endereço, pagamento, observações, motoboy, timeline resumida

- [ ] **B10a** Timestamps por estágio
  - Registrar `timestamps_status` (JSON ou tabela) ao mudar status
  - Retornar `tempoNoEstagio` calculado em cada pedido

### Frontend

- [x] **F1** Layout split-panel
  - Painel esquerdo fixo (320px): lista de pedidos com scroll
  - Painel direito flex: detalhe do pedido selecionado com abas
  - Substituir `apps/frontend/src/app/admin/layout.tsx` para suportar nova estrutura
  - Top bar global (64px altura `--topbar-height`)

- [x] **F3a** Card de pedido compacto
  - Campos: `#numero`, ícone pagamento (3 estados), timer (`CrmTimer`), nome + bairro, itens resumidos, total, badge mensagem não lida
  - Botão **CONFIRMAR** visível no card
  - Botão CONFIRMAR desabilitado + tooltip quando `statusPagamento !== CONFIRMADO`
  - Seleção do card destaca painel direito

- [x] **F3b** Ordenação automática da lista
  - Aguardando Aprovação → SLA vermelho → SLA amarelo → ordem de chegada

- [x] **F3c** SLA visual no `CrmTimer`
  - Tabela hard-coded: Aprovação (2/3/5min), Preparo (20/25/35min), Aguard.Entregador (5/8/12min), Em Rota (40/50/60min)
  - Alerta vermelho: card inteiro pisca

- [x] **F4** Aba Pedido
  - Flow visual de status clicável (avança estágio via PATCH)
  - Lista de itens, subtotal, taxa, total
  - Forma de pagamento + status
  - Observações do cliente
  - Banner amarelo condicional: "⚠️ Não esqueça as bebidas"
  - Toggle "Imprimir comanda" visível e desativado ("em breve")

---

## FASE 3 — Avançar Status + Mensagens Automáticas

### Backend

- [x] **B1c** `PATCH /api/admin/pedidos/:id/status`
  - Valida transição de status (não permite voltar)
  - Registra na timeline: `{ timestamp, ator: 'OPERADOR', acao: 'Status → X' }`
  - Dispara mensagem automática quando aplicável (ver B4)

- [x] **B4** Mensagens automáticas por status
  - `CONFIRMADO` → envia via Evolution API: "Olá [nome]! Seu pedido foi confirmado..."
  - `EM_ROTA` → envia: "Seu pedido saiu para entrega..."
  - `ENTREGUE` → envia: "Pedido entregue! Bom apetite!..."
  - `CANCELADO` → envia com motivo + aviso de estorno se pagamento confirmado
  - Cada envio registrado na timeline com ator `SISTEMA`

### Frontend

- [x] Flow de status no F4 chama `PATCH /api/admin/pedidos/:id/status`
- [x] Feedback visual após mudança de status (toast CRM)

---

## FASE 4 — Tempo Real (WebSocket / SSE)

### Backend

- [x] **B2a** WebSocket ou SSE no servidor Express
- [x] **B2b** Emitir `pedido:novo` ao criar pedido (via webhook de pagamento confirmado)
- [x] **B2c** Emitir `pedido:atualizado` ao mudar status
- [x] **B2d** Emitir `mensagem:nova` ao receber mensagem WhatsApp

### Frontend

- [x] **F — WS Client** hook `useCockpitSocket()`
  - Conecta ao servidor
  - Atualiza lista de pedidos ao receber `pedido:novo` e `pedido:atualizado`
  - Remove polling de 30s da página atual
- [x] Métricas da Top Bar atualizadas em tempo real (derivadas do estado da lista)

---

## FASE 5 — WhatsApp + Aba Cliente

### Backend

- [ ] **B5a** `GET /api/admin/clientes/:telefone/mensagens` — histórico completo
- [ ] **B5b** `POST /api/admin/clientes/:telefone/mensagens` — envio pelo operador
  - Registra com `origem: HUMANO`
  - Envia via Evolution API
- [ ] **B5c** Campo `origem: HUMANO | SISTEMA | IA` em todas as mensagens no banco
- [ ] **B5d** `GET /api/admin/whatsapp/status` — retorna se Evolution API está conectada

- [ ] **B6a** `GET /api/admin/clientes/:telefone`
  - Dados + estatísticas: total pedidos, valor gasto, frequência, dia favorito, top 3 produtos, `diasSemPedir`
- [ ] **B6b** `POST /api/admin/clientes/:telefone/lista-negra` — motivo obrigatório
- [ ] **B6c** `DELETE /api/admin/clientes/:telefone/lista-negra`

### Frontend

- [ ] **F7** Aba WhatsApp
  - Bolhas de mensagem com timestamp e remetente
  - Tag `[AUTO]` em cinza nas mensagens com `origem: SISTEMA`
  - Campo de digitação + enviar
  - Badge de não lida some ao abrir aba
  - Aba **IA** como tab desativada: "Agente IA — em breve"

- [ ] **F6** Aba Cliente
  - Dados + estatísticas
  - Badge "Sem pedir há X dias" condicional
  - Botão "Chamar no WhatsApp" → abre aba WhatsApp com texto pré-pronto
  - Botão "Adicionar à lista negra" com modal + motivo obrigatório
  - Banner vermelho se cliente na lista negra
  - Alerta antes de confirmar pedido de cliente na lista negra

- [ ] Indicador WhatsApp na Top Bar (verde/vermelho) consumindo B5d

---

## FASE 6 — Operações

### Backend

- [ ] **B7a** Modelo `Motoboy` no banco: nome, telefone, status
- [ ] **B7b** `GET /api/admin/motoboys`
- [ ] **B7c** `PATCH /api/admin/pedidos/:id/motoboy`

- [ ] **B8** `POST /api/admin/pedidos/manual`
  - Fluxo Pix: gera link InfinitePay, status `AGUARDANDO_PAGAMENTO`
  - Fluxo Dinheiro: status `CONFIRMADO`, pagamento `DINHEIRO_ENTREGA`

- [ ] **B9a** `POST /api/admin/pedidos/:id/cancelar`
  - Motivo obrigatório
  - Se pagamento CONFIRMADO: `estorno_necessario = true` + registra na timeline
  - Regra absoluta: nunca deleta o pedido
- [ ] **B9b** `PATCH /api/admin/pedidos/:id/estorno` — apenas admin

- [ ] **B3a** `GET /api/admin/loja/status`
- [ ] **B3b** `PATCH /api/admin/loja/status` — ABERTO / FECHADO / PAUSADO (PAUSADO exige `mensagem`)

### Frontend

- [ ] **F5** Aba Entrega
  - Endereço com edição rápida inline
  - Alerta de endereço diferente do histórico
  - Seleção de motoboy (busca, status visual)
  - Observação de entrega

- [ ] **F10** Modal de Pedido Manual
  - Formulário: nome, telefone, bairro, endereço, itens, observação
  - Cálculo automático da taxa pelo bairro
  - Toggle Pix / Dinheiro
  - Pix: exibe link para copiar
  - Dinheiro: campo "Valor em dinheiro"

- [ ] **F11** Modal de Cancelamento
  - Dropdown com 6 motivos obrigatórios
  - Banner de estorno quando `statusPagamento === CONFIRMADO`
  - Botão "Marcar estorno realizado" apenas para admin

- [ ] **F2 — Botão Abrir/Fechar/Pausar**
  - 3 estados visuais distintos na top bar
  - Campo de mensagem configurável quando PAUSADO
  - Persiste estado consumindo B3

---

## FASE 7 — Polimento Final

### Frontend

- [ ] **F2 — Top Bar métricas**
  - 6 contadores com cores corretas
  - "Aguardando Aprovação" pisca quando > 0

- [ ] **F9 — Alertas sonoros**
  - Web Audio API: sino (pedido novo), notificação curta (WhatsApp), bip suave/repetido (SLA)
  - Service Worker para funcionar com aba em background
  - Toggle mute/unmute no cockpit

- [ ] **F8 — Aba Timeline**
  - Log cronológico imutável
  - Formato: `HH:mm · Ator · Ação` com diferenciação visual por ator

### Backend

- [ ] **B11** `GET /api/admin/metricas`
  - Query única retornando todos os contadores por status + receita do dia
  - Consumido pelo WebSocket/SSE para push em tempo real

---

## Critério de Pronto (aceite final)

- [ ] Pedido novo aparece na lista em tempo real sem recarregar a página
- [ ] Botão CONFIRMAR bloqueado para pedidos com pagamento pendente
- [ ] Mudar para Confirmado dispara mensagem automática no WhatsApp
- [ ] Mudar para Em Rota dispara mensagem automática no WhatsApp
- [ ] Mudar para Entregue dispara mensagem automática no WhatsApp
- [ ] Cancelamento com pagamento confirmado exibe alerta de estorno
- [ ] SLA muda cor do timer conforme tabela de tempos
- [ ] Som toca quando chega pedido novo (funciona com aba em background)
- [ ] Som toca quando chega mensagem WhatsApp
- [ ] Operador responde WhatsApp sem sair do cockpit
- [ ] Pedido manual funciona nos dois fluxos (Pix e dinheiro)
- [ ] Timeline registra todas as ações com timestamp e ator
- [ ] Botão Abrir/Fechar/Pausar loja reflete no site em tempo real
- [ ] Lista negra alerta operador antes de confirmar pedido
- [ ] Aba IA visível e desativada com label "em breve"
- [ ] Campo `origem: HUMANO | SISTEMA | IA` em todas as mensagens no banco
- [ ] Site de pedidos e Cockpit sem contaminação de tokens entre si
- [ ] Toggle dark/light no cockpit funcional e persistindo

---

## Dependências críticas (não pular)

```
FASE 0 (tokens) → FASE 1 (componentes CRM)
                → FASE 2 (layout + lista)
                     ↓
               FASE 3 (status + msgs)
                     ↓
               FASE 4 (tempo real)
                     ↓
          FASE 5            FASE 6
     (WA + Cliente)    (Operações)
          ↓                  ↓
               FASE 7 (polimento)
```

---

*Documentos de referência nesta pasta:*
- `TASK_COCKPIT_RANCHO.md` — spec completa do cockpit
- `TASK_SEPARACAO_DESIGN_SYSTEMS.md` — spec da separação dos DS
- `Rancho_CRM_DesignSystem.html` — fonte de verdade dos tokens CRM
