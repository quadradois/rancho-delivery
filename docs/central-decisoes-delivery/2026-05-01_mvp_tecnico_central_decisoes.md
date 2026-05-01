# MVP Tecnico — Central de Decisoes

**Data:** 2026-05-01  
**Demanda:** Central de Decisoes para Operacao de Delivery  
**Fase:** Planejamento pre-implementacao  
**Escopo recomendado:** Fase 1 — Antiesquecimento  

---

## 1. Objetivo do MVP

Construir uma primeira versao da Central de Decisoes focada em impedir que pedidos, clientes, pagamentos e gargalos criticos fiquem invisiveis durante alta demanda.

O MVP nao deve tentar resolver toda a operacao. Ele deve resolver bem a pergunta mais importante:

> O que exige atencao agora para evitar atraso, prejuizo ou cliente esquecido?

---

## 2. Contexto AS-IS identificado no codigo

O sistema ja possui bases importantes:

- Admin de pedidos em `apps/frontend/src/app/admin/pedidos/page.tsx`.
- Endpoints admin em `/api/admin/pedidos`.
- `statusPagamento` separado do status operacional em `Pedido`.
- `statusMudouEm` para calcular tempo no estagio atual.
- `PedidoTimeline` para historico basico.
- `MensagemCliente` com `lida`, `origem` e vinculo opcional com pedido.
- SSE/tempo real via `useCockpitSocket` e `realtimeService`.
- Metricas admin e eventos `pedido:novo`, `pedido:atualizado`, `mensagem:nova`, `metricas:atualizadas`.

O que ainda falta para uma Central de Decisoes real:

- Entidade persistente de alerta/decisao.
- Regras centralizadas de risco operacional.
- API especifica para fila de decisoes.
- Registro formal de resolucao de alertas.
- Severidade padronizada por evento.
- Proxima acao recomendada por alerta.
- Visao de "pedido como caso operacional".

---

## 3. Escopo do MVP

### Entra no MVP

1. Pedido pago aguardando confirmacao.
2. Pedido em preparo acima do SLA.
3. Pedido pronto ou em etapa de despacho sem entregador.
4. Cliente com mensagem humana nao lida acima do SLA.
5. Pedido cancelado com estorno necessario.
6. WhatsApp desconectado ou falha de envio operacional.
7. Fila unica de decisoes ordenada por severidade e tempo.
8. Resolucao/acknowledgement de alerta.
9. Timeline do pedido recebendo eventos relevantes.

### Fica fora do MVP

- Inteligencia preditiva avancada.
- Otimizacao automatica de rota.
- Modo pico automatico.
- Pontuacao historica de cliente/VIP.
- Sugestoes de IA para resposta.
- Controle completo de cozinha por tela separada.
- Relatorios analiticos detalhados.

Esses itens devem ser tratados em fases posteriores.

---

## 4. Casos criticos do MVP

### Caso 1 — Pedido pago sem confirmacao

**Condicao:** `statusPagamento = CONFIRMADO` e `status = AGUARDANDO_PAGAMENTO` por mais de 60 segundos.  
**Severidade inicial:** critica.  
**Proxima acao:** confirmar pedido.  
**Risco:** cliente pagou e cozinha ainda nao recebeu comando.

### Caso 2 — Cliente sem resposta

**Condicao:** existe `MensagemCliente` de origem `HUMANO`, `lida = false`, criada ha mais de 2 minutos.  
**Severidade inicial:** atencao.  
**Severidade critica:** acima de 5 minutos ou pedido em status critico.  
**Proxima acao:** responder cliente.  
**Risco:** cliente sente abandono e aumenta chance de reclamacao/cancelamento.

### Caso 3 — Preparo atrasado

**Condicao:** pedido em `PREPARANDO` com `tempoNoEstagio` maior que SLA configurado.  
**Severidade inicial:** atencao.  
**Severidade critica:** acima do limite critico.  
**Proxima acao:** verificar cozinha / atualizar cliente.  
**Risco:** atraso sem comunicacao.

### Caso 4 — Pedido pronto sem entregador

**Condicao:** pedido em etapa de despacho/rota sem `motoboyId` ou parado acima do SLA definido para entrega.  
**Severidade inicial:** critica.  
**Proxima acao:** atribuir entregador.  
**Risco:** comida parada, perda de qualidade e atraso final.

### Caso 5 — Estorno necessario

**Condicao:** `estornoNecessario = true` e `estornoRealizadoEm = null`.  
**Severidade inicial:** critica.  
**Proxima acao:** marcar estorno realizado ou iniciar procedimento financeiro.  
**Risco:** conflito financeiro e reclamacao.

### Caso 6 — WhatsApp indisponivel

**Condicao:** status de WhatsApp desconectado ou falha recente de envio em acao operacional.  
**Severidade inicial:** critica.  
**Proxima acao:** reconectar WhatsApp ou usar contato manual.  
**Risco:** automacoes e atendimento param sem o operador perceber.

---

## 5. Modelo mental da tela

A tela do MVP deve ser uma central de trabalho, nao uma pagina de metricas.

Layout recomendado:

- Coluna esquerda: Fila de Decisoes.
- Painel direito: Caso operacional selecionado.
- Topo: status da operacao, loja, WhatsApp, pedidos criticos.
- Acoes diretas no alerta e no pedido.

Cada alerta da fila deve mostrar:

- Severidade.
- Tipo de problema.
- Pedido vinculado quando existir.
- Cliente.
- Tempo de espera.
- Motivo claro.
- Proxima acao recomendada.
- Botao principal.
- Botao "resolver/ignorar com motivo" quando aplicavel.

---

## 6. Regras de prioridade inicial

Ordem recomendada da fila:

1. Alertas criticos nao resolvidos.
2. Alertas de atencao nao resolvidos.
3. Alertas informativos recentes.
4. Dentro da mesma severidade, ordenar pelo maior tempo pendente.
5. Pedido com cliente sem resposta sobe prioridade se tambem estiver atrasado.
6. Pedido pago sem confirmacao sempre fica acima de atraso comum.
7. Estorno necessario sempre fica acima de informativos operacionais.

---

## 7. Modelo minimo de dados

O MVP precisa de uma nova entidade persistente de alerta/decisao.

Campos essenciais:

- `id`
- `tipo`
- `severidade`
- `status`
- `pedidoId`
- `clienteTelefone`
- `titulo`
- `descricao`
- `motivo`
- `proximaAcao`
- `acaoPayload`
- `dedupeKey`
- `detectadoEm`
- `resolvidoEm`
- `resolvidoPor`
- `resolucaoMotivo`
- `criadoEm`
- `atualizadoEm`

Esse modelo evita recalcular tudo apenas na tela e permite auditoria operacional.

---

## 8. Eventos operacionais necessarios

Eventos que devem alimentar alertas e timeline:

- `PEDIDO_CRIADO`
- `PAGAMENTO_CONFIRMADO`
- `STATUS_ALTERADO`
- `MENSAGEM_CLIENTE_RECEBIDA`
- `MENSAGEM_OPERADOR_ENVIADA`
- `SLA_ATINGIDO`
- `MOTOBOY_ATRIBUIDO`
- `PEDIDO_CANCELADO`
- `ESTORNO_MARCADO`
- `WHATSAPP_FALHOU`
- `WHATSAPP_RECONECTADO`

No MVP, esses eventos podem ser registrados em `PedidoTimeline` quando vinculados a pedido. Para alertas globais, usar a nova entidade `PedidoAlerta` ou `AlertaOperacional`.

---

## 9. APIs minimas do MVP

Endpoints recomendados:

- `GET /api/admin/decisoes`
- `GET /api/admin/decisoes/metricas`
- `PATCH /api/admin/decisoes/:id/resolver`
- `POST /api/admin/decisoes/recalcular`
- `GET /api/admin/pedidos/:id/operacao`

Eventos SSE recomendados:

- `decisao:nova`
- `decisao:atualizada`
- `decisao:resolvida`
- `pedido:risco_atualizado`

---

## 10. Criterios de aceite

O MVP so deve ser considerado pronto quando:

- Pedido pago e nao confirmado aparece na fila de decisoes em ate 10 segundos.
- Mensagem humana nao lida ha mais de 2 minutos aparece na fila.
- Pedido em preparo acima do SLA aparece com severidade correta.
- Estorno necessario aparece como alerta critico.
- Cada alerta tem motivo, severidade, tempo pendente e proxima acao.
- Resolver alerta registra quem resolveu, quando resolveu e motivo quando necessario.
- A fila atualiza em tempo real ou por fallback de polling sem recarregar a tela.
- A tela nao perde o pedido selecionado ao receber evento.
- Alertas resolvidos nao voltam a aparecer sem uma nova causa real.
- Existe teste automatizado para pelo menos as regras criticas de geracao de alertas.

---

## 11. Plano tecnico macro

### Etapa 1 — Fundacao de dados

- Criar entidade de alerta operacional.
- Criar enums de tipo, severidade e status.
- Criar indices para fila aberta por severidade e data.

### Etapa 2 — Motor de alertas

- Criar service central de decisoes.
- Implementar regras de pedido pago sem confirmacao, cliente sem resposta, preparo atrasado e estorno.
- Garantir deduplicacao por `dedupeKey`.

### Etapa 3 — Contratos de API

- Criar endpoints `/api/admin/decisoes`.
- Expor lista, metricas e resolucao.
- Emitir eventos SSE quando alertas mudarem.

### Etapa 4 — UX do MVP

- Adicionar tela `/admin/decisoes` ou transformar `/admin/pedidos` em Central.
- Exibir fila de decisoes e painel do caso.
- Acoes diretas chamando APIs existentes quando possivel.

### Etapa 5 — Verificacao operacional

- Testes unitarios do motor de alertas.
- Teste integrado da fila de decisoes.
- Validacao manual em cenario de alta demanda simulado.

---

## 12. Decisao recomendada

Implementar a Central de Decisoes como evolucao do cockpit de pedidos, mas com endpoint e service proprios.

Nome recomendado:

- Backend service: `decisao.service.ts`
- Controller: `admin.decisao.controller.ts`
- Rotas: `/api/admin/decisoes`
- Frontend: `/admin/decisoes` ou primeira aba dentro de `/admin/pedidos`

Para evitar ruptura, a recomendacao inicial e criar `/admin/decisoes` como nova tela e reaproveitar componentes CRM existentes. Depois, se a experiencia ficar superior, ela pode substituir a entrada principal de pedidos.
