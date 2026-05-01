# Checklist Cockpit — Frontend × Backend

> Divisão de responsabilidades para implementação paralela.
> Design system do CRM é **separado** do design system do site de pedidos.
> Referência: [TASK_COCKPIT_RANCHO.md](./TASK_COCKPIT_RANCHO.md)

---

## Premissas de divisão

| Regra | Descrição |
|---|---|
| **Frontend-first** | Componentes podem ser construídos com dados mockados antes da API existir |
| **Design System CRM** | Tokens, cores e componentes do admin ficam em `apps/frontend/src/design-system/crm/` — nunca misturar com o DS do site |
| **Contratos de API** | Backend define os tipos/shapes dos endpoints; frontend consome via `services/` |
| **WebSocket** | Pedidos em tempo real via WS ou SSE — backend emite, frontend escuta |

---

## DESIGN SYSTEM CRM *(pré-requisito para tudo no frontend)*

> O usuário está criando o DS em paralelo. Estas tarefas desbloqueiam os componentes abaixo.

- [ ] Definir paleta de cores do CRM (neutros, status, acentos — separada do vermelho/amarelo do site)
- [ ] Definir tipografia (fonte, escala de tamanhos, pesos)
- [ ] Tokens base: espaçamento, border-radius, sombras, z-index
- [ ] Componente `CrmBadge` — variantes por status operacional
- [ ] Componente `CrmButton` — variantes primary, ghost, danger
- [ ] Componente `CrmCard` — container padrão do cockpit
- [ ] Componente `CrmTab` / `CrmTabPanel` — abas do painel direito
- [ ] Componente `CrmTimer` — exibe tempo com mudança de cor por SLA
- [ ] Componente `CrmInput` / `CrmSelect` — campos de formulário
- [ ] Componente `CrmModal` — dialogs de confirmação e formulários
- [ ] Componente `CrmToast` / `CrmAlert` — banners e notificações inline

---

## FRONTEND

### F1 — Layout Geral (estrutura split-panel)

- [ ] Layout cockpit: painel esquerdo fixo (lista) + painel direito dinâmico (detalhe)
- [ ] Substituir layout do `/admin` para suportar a nova estrutura sem quebrar rotas existentes
- [ ] Responsividade mínima: colapsar painel direito em telas menores

### F2 — Top Bar

- [ ] Barra de métricas em tempo real: 6 contadores com cores corretas
- [ ] Contador "Aguardando Aprovação" pisca quando > 0
- [ ] Botão Abrir / Fechar / Pausar com 3 estados visuais distintos
- [ ] Campo de mensagem configurável no estado PAUSADO
- [ ] Indicador WhatsApp: ponto verde/vermelho no canto

### F3 — Lista de Pedidos (painel esquerdo)

- [ ] Card compacto com todos os campos: `#ID`, ícone pagamento, timer, nome, bairro, itens, total, badge msg
- [ ] Ícone de pagamento: 3 variantes visuais (🔒 pago · ⏳ pendente · ❌ expirado)
- [ ] Botão **CONFIRMAR** visível no card (sem abrir o pedido)
- [ ] Botão CONFIRMAR desabilitado + tooltip quando pagamento PENDENTE
- [ ] Badge de mensagem não lida com contador
- [ ] Timer com mudança de cor automática por SLA (amarelo → vermelho)
- [ ] Card pisca quando SLA vermelho
- [ ] Badge "Sem pedir há X dias" no card quando aplicável
- [ ] Ordenação automática: Aguardando → SLA vermelho → SLA amarelo → chegada
- [ ] Scroll infinito ou virtualização para listas longas

### F4 — Aba Pedido

- [ ] Flow visual de status (linha do tempo horizontal/vertical clicável)
- [ ] Lista de itens: qtd · nome · valor unitário · subtotal · taxa · total
- [ ] Forma de pagamento + status do pagamento
- [ ] Observações do cliente
- [ ] Banner amarelo "⚠️ Não esqueça as bebidas" condicional
- [ ] Toggle "Imprimir comanda" visível e desativado com label "em breve"

### F5 — Aba Entrega

- [ ] Exibição do endereço completo
- [ ] Botão de edição rápida inline (edição sem modal)
- [ ] Alerta "⚠️ Endereço diferente do cadastro" condicional
- [ ] Campo de seleção de motoboy (busca por nome)
- [ ] Status visual do motoboy: Disponível / Em rota / Indisponível
- [ ] Campo de observação de entrega

### F6 — Aba Cliente

- [ ] Dados do cliente: nome, telefone, endereço, origem
- [ ] Estatísticas: total pedidos, valor gasto, 1º pedido, último pedido, dia favorito
- [ ] Top 3 produtos mais pedidos
- [ ] Botão "Chamar no WhatsApp" com mensagem pré-pronta para copiar
- [ ] Botão "Adicionar à lista negra" com modal de motivo obrigatório
- [ ] Banner vermelho no topo do pedido quando cliente está na lista negra
- [ ] Alerta de confirmação ao confirmar pedido de cliente na lista negra

### F7 — Aba WhatsApp

- [ ] Renderização do histórico de mensagens (bolhas, timestamp, remetente)
- [ ] Tag visual `[AUTO]` em cinza nas mensagens automáticas do sistema
- [ ] Campo de digitação + botão enviar
- [ ] Badge de não lida some ao abrir a aba
- [ ] Aba **IA** como tab desativada com label "Agente IA — em breve"

### F8 — Aba Timeline

- [ ] Lista cronológica imutável de eventos
- [ ] Formato: `[HH:mm] · [Ator] · [Ação]` com diferenciação visual por ator (Sistema / Operador)

### F9 — Alertas Sonoros

- [ ] Integração Web Audio API: sino (pedido novo), notificação curta (WhatsApp), bip suave/repetido (SLA)
- [ ] Service Worker para sons funcionarem com a aba em background
- [ ] Toggle de som no cockpit (mute/unmute)

### F10 — Criação de Pedido Manual

- [ ] Modal / drawer com formulário: nome, telefone, bairro, endereço, itens, observação
- [ ] Cálculo automático da taxa ao selecionar bairro
- [ ] Seleção de fluxo: Pix ou Dinheiro
- [ ] Fluxo Pix: exibe link gerado para copiar
- [ ] Fluxo Dinheiro: campo adicional "Valor em dinheiro" para troco

### F11 — Cancelamento

- [ ] Modal de cancelamento com dropdown de 6 motivos obrigatórios
- [ ] Exibição do banner de estorno quando pagamento estava CONFIRMADO
- [ ] Botão "Marcar estorno realizado" visível apenas para admin

---

## BACKEND

### B1 — Endpoints base do Cockpit

- [ ] `GET /api/admin/pedidos` — lista todos os pedidos (sem filtro de cliente), com paginação e filtros por status
- [ ] `GET /api/admin/pedidos/:id` — detalhe completo: itens, cliente, endereço, pagamento, timeline
- [ ] `PATCH /api/admin/pedidos/:id/status` — avança o status do pedido com registro na timeline

### B2 — Tempo real

- [ ] Implementar WebSocket ou SSE no servidor
- [ ] Emitir evento `pedido:novo` ao criar pedido (via webhook de pagamento)
- [ ] Emitir evento `pedido:atualizado` ao mudar status
- [ ] Emitir evento `mensagem:nova` ao receber mensagem WhatsApp

### B3 — Controle da Loja

- [ ] `GET /api/admin/loja/status` — retorna estado atual (ABERTO / FECHADO / PAUSADO)
- [ ] `PATCH /api/admin/loja/status` — muda estado; campo `mensagem` obrigatório para PAUSADO
- [ ] Site de pedidos consome o status e exibe tela "fora do horário" quando necessário

### B4 — Mensagens Automáticas

- [ ] Disparar mensagem automática ao status `CONFIRMADO`
- [ ] Disparar mensagem automática ao status `EM_ROTA`
- [ ] Disparar mensagem automática ao status `ENTREGUE`
- [ ] Disparar mensagem automática ao status `CANCELADO` (com motivo + aviso de estorno se aplicável)
- [ ] Registrar cada envio na timeline com timestamp e ator `SISTEMA`

### B5 — WhatsApp (Evolution API)

- [ ] `GET /api/admin/clientes/:telefone/mensagens` — histórico completo de mensagens
- [ ] `POST /api/admin/clientes/:telefone/mensagens` — envio de mensagem pelo operador
- [ ] Campo `origem: HUMANO | SISTEMA | IA` em todas as mensagens no banco
- [ ] `GET /api/admin/whatsapp/status` — retorna se Evolution API está conectada

### B6 — Dados do Cliente

- [ ] `GET /api/admin/clientes/:telefone` — dados + estatísticas: total pedidos, gasto, frequência, dia favorito, top produtos
- [ ] Calcular e retornar flag `diasSemPedir` com base no último pedido
- [ ] `POST /api/admin/clientes/:telefone/lista-negra` — adiciona à lista negra com motivo
- [ ] `DELETE /api/admin/clientes/:telefone/lista-negra` — remove da lista negra

### B7 — Motoboys

- [ ] Modelo `Motoboy` no banco: nome, telefone, status (DISPONIVEL / EM_ROTA / INDISPONIVEL)
- [ ] `GET /api/admin/motoboys` — lista com status atual
- [ ] `PATCH /api/admin/pedidos/:id/motoboy` — atribui motoboy ao pedido + registra na timeline

### B8 — Pedido Manual

- [ ] `POST /api/admin/pedidos/manual` — cria pedido com campos do formulário
- [ ] Fluxo Pix: gerar link InfinitePay e retornar, status `AGUARDANDO_PAGAMENTO`
- [ ] Fluxo Dinheiro: criar pedido diretamente como `CONFIRMADO`, pagamento `DINHEIRO_ENTREGA`

### B9 — Cancelamento

- [ ] `POST /api/admin/pedidos/:id/cancelar` — motivo obrigatório, registra na timeline
- [ ] Lógica: se pagamento CONFIRMADO → setar `estorno_necessario = true`
- [ ] `PATCH /api/admin/pedidos/:id/estorno` — marca estorno como realizado (apenas admin)
- [ ] Regra: cancelamento nunca deleta o pedido

### B10 — SLA e Timeline

- [ ] Registrar timestamp de entrada em cada status no pedido (`timestamps_status` JSON ou tabela própria)
- [ ] Calcular e retornar `tempoNoEstagio` em segundos em cada pedido da lista
- [ ] `GET /api/admin/pedidos/:id/timeline` — log completo e imutável de ações

### B11 — Métricas Top Bar

- [ ] `GET /api/admin/metricas` — retorna contadores por status + receita do dia
- [ ] Endpoint otimizado com query única para não gerar N queries por contador

---

## Critério de Pronto (espelho da TASK)

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

---

## Ordem sugerida de implementação

### Fase 1 — Fundação *(desbloqueante)*
1. **DS CRM:** tokens + componentes base (`CrmBadge`, `CrmButton`, `CrmCard`, `CrmTab`, `CrmTimer`)
2. **B1:** `GET /api/admin/pedidos` e `GET /api/admin/pedidos/:id`
3. **F1:** Layout split-panel + migração do admin

### Fase 2 — Cockpit funcional com dados reais
4. **F3 + F4:** Lista de pedidos + Aba Pedido (com dados reais do B1)
5. **B10:** Timestamps de SLA + `tempoNoEstagio`
6. **F3 timer:** SLA visual com cores
7. **B1 PATCH status + B4:** Avançar status + mensagens automáticas

### Fase 3 — Tempo real + comunicação
8. **B2:** WebSocket/SSE
9. **F — WebSocket client:** lista atualiza sem reload
10. **B5 + F7:** WhatsApp histórico + envio no cockpit

### Fase 4 — Dados do cliente + operações
11. **B6 + F6:** Aba Cliente com estatísticas
12. **B7 + F5:** Motoboys
13. **B8 + F10:** Pedido manual
14. **B9 + F11:** Cancelamento com estorno

### Fase 5 — Polimento
15. **F2:** Top Bar métricas + botão loja
16. **F9:** Alertas sonoros (Web Audio API + Service Worker)
17. **F8:** Aba Timeline

---

*Última atualização: 2026-05-01*
