# RAIO-X FUNCIONAL / PRODUTO - `/admin/pedidos`

Data: 2026-05-02  
Modulo analisado: `/admin/pedidos`  
Escopo: analise funcional, produto, UX operacional, regras de negocio, comunicacao, pagamento, entrega, automacao e prontidao comercial.

> Analise feita por leitura estatica do codigo. Nenhum arquivo de produto foi alterado durante a analise original.

## 1. Resumo executivo

O modulo `/admin/pedidos` ja e um cockpit operacional relevante: lista pedidos, destaca urgencias, usa SSE/fallback, tem som, metricas, WhatsApp, motoboys, pedido manual, timeline, cancelamento e gestao de loja.

A maturidade funcional e boa para um MVP interno de delivery com Pix, mas ainda fragil para operacao comercial plena. O maior risco e a inconsistencia entre pagamento, status e operacao: o checkout mostra cartao/dinheiro/Pix, mas o pedido publico enviado ao backend nao persiste forma de pagamento nem troco. O banco tambem nao possui campos dedicados para forma de pagamento/troco.

Classificacao geral: **GO com ressalvas**.

## 2. Objetivo do modulo

A finalidade real do modulo e ser o painel de controle da operacao:

- Receber pedidos.
- Identificar urgencias.
- Acompanhar pagamento.
- Mover status.
- Organizar entrega.
- Conversar com cliente.
- Resolver excecoes.

A dor operacional que deveria resolver e reduzir esquecimento, atraso, erro de preparo, erro de entrega e comunicacao ruim em horario de pico.

## 3. Usuario-alvo e contexto de uso

Usuarios principais:

- Operador de balcao.
- Gestor/admin.
- Atendente de WhatsApp.
- Responsavel pela expedicao/entrega.

Contexto de uso:

- Tempo real.
- Durante pico de pedidos.
- Com pressao por decisao rapida.
- Principalmente em desktop/notebook, possivelmente tablet.

O operador precisa decidir rapidamente se deve aceitar, preparar, despachar, responder, cancelar, acionar entregador ou cobrar cliente.

## 4. Jornada atual do pedido

Fluxo atual encontrado:

1. Cliente faz pedido no site.
2. Backend valida bairro atendido e produto disponivel.
3. Pedido e criado como `AGUARDANDO_PAGAMENTO`.
4. `statusPagamento` inicia como `PENDENTE`.
5. Sistema tenta gerar link InfinitePay.
6. Webhook confirma pagamento.
7. Pedido vira `CONFIRMADO`.
8. Operador avanca para `PREPARANDO`.
9. Operador avanca para `SAIU_ENTREGA`.
10. Operador avanca para `ENTREGUE`.

Fluxos paralelos:

- `AGUARDANDO_PAGAMENTO` pode virar `EXPIRADO`.
- `EXPIRADO` pode virar `ABANDONADO`.
- Pedido pode ser cancelado em alguns status.
- Pedido pago cancelado marca necessidade de estorno.

O fluxo e logico, mas incompleto para restaurante/delivery comercial porque nao contempla claramente:

- Retirada.
- Consumo local.
- Pedido pronto aguardando entregador.
- Pagamento na entrega vindo do checkout.
- Produto indisponivel depois do pedido recebido.

## 5. Analise dos status

Status existentes no backend:

- `PENDENTE`
- `AGUARDANDO_PAGAMENTO`
- `CONFIRMADO`
- `PREPARANDO`
- `SAIU_ENTREGA`
- `ENTREGUE`
- `EXPIRADO`
- `ABANDONADO`
- `CANCELADO`

Status exibidos nos filtros principais:

- Todos
- Pag. Pendente
- Aprovacao
- Preparo
- Em rota
- Entregue
- Cancelado

Status problematicos:

- `CONFIRMADO`: ambiguo. No backend representa pagamento confirmado/status aceito; na UI aparece como "Aprovacao"; para o cliente a mensagem diz que o pedido ja esta sendo preparado.
- `PENDENTE`: existe no backend, mas praticamente nao aparece no fluxo principal da UI.
- `EXPIRADO` e `ABANDONADO`: existem no backend, mas nao aparecem como filtros principais.
- `SAIU_ENTREGA`: funciona para delivery, mas nao serve para retirada/consumo local.

Status faltantes recomendados:

- `PAGO_AGUARDANDO_ACEITE`
- `ACEITO`
- `EM_PREPARO`
- `PRONTO`
- `AGUARDANDO_ENTREGADOR`
- `PRONTO_RETIRADA`
- `EM_ROTA`
- `FINALIZADO`

Sequencia ideal para MVP comercial:

1. `AGUARDANDO_PAGAMENTO`
2. `PAGO_AGUARDANDO_ACEITE`
3. `EM_PREPARO`
4. `PRONTO` ou `AGUARDANDO_ENTREGADOR`
5. `EM_ROTA`
6. `ENTREGUE`
7. `CANCELADO`

Para retirada:

1. `AGUARDANDO_PAGAMENTO`
2. `PAGO_AGUARDANDO_ACEITE`
3. `EM_PREPARO`
4. `PRONTO_RETIRADA`
5. `RETIRADO`

## 6. Acoes disponiveis para o operador

Acoes existentes:

- Ver lista de pedidos.
- Buscar pedido.
- Filtrar por status.
- Selecionar pedido.
- Confirmar pedido.
- Avancar status.
- Cancelar pedido.
- Atribuir motoboy.
- Alterar endereco/bairro.
- Enviar WhatsApp.
- Ver cliente e historico.
- Usar lista negra.
- Ver timeline.
- Criar pedido manual.
- Alterar status da loja.
- Ver fila urgente.
- Ver metricas e relatorio.
- Ver sugestoes de IA.

Acoes insuficientes ou inseguras:

- Botao "Avancar status" e generico.
- Nao ha confirmacao para avancar etapas sensiveis.
- Cancelamento fica disponivel mesmo em contextos onde deveria ser bloqueado.
- Nao ha impressao ou compartilhamento com cozinha.
- Nao ha acao especifica "Pronto" ou "Aguardando entregador".
- Nao ha edicao/substituicao de item.
- Nao ha acao explicita para "verificar pagamento Pix agora".

## 7. Clareza das informacoes na tela

Informacoes claras:

- Numero do pedido.
- Cliente.
- Telefone.
- Bairro.
- Resumo de itens.
- Timer/SLA.
- Status de pagamento.
- Total.
- Endereco.
- Itens.
- Taxa de entrega.
- Motoboy.
- Timeline.

Informacoes fracas ou ausentes:

- Horario absoluto do pedido na lista.
- Status operacional na lista.
- Forma de pagamento.
- Troco.
- Observacao do pedido em destaque.
- Observacao por item em destaque.
- Complemento/ponto de referencia separado.
- Tipo de atendimento: entrega, retirada ou consumo local.
- ID/link de pagamento.
- Data/hora de confirmacao de pagamento.
- Responsavel pela acao de forma amigavel.
- Historico com valores antigos e novos.

Ponto critico: o backend retorna `observacao` e observacoes dos itens, mas a aba principal exibe apenas itens e valores. Isso aumenta risco de erro de preparo.

## 8. Regras de negocio

### Regras explicitas

- Valida bairro atendido antes de criar pedido.
- Valida produto existente e disponivel.
- Cria pedido do site como `AGUARDANDO_PAGAMENTO`.
- Cria `statusPagamento=PENDENTE`.
- Gera link InfinitePay.
- Webhook aprovado atualiza pedido para `CONFIRMADO`.
- Existe matriz de transicoes permitidas no backend.
- Cancelamento via rota dedicada exige motivo.
- Cancelamento pago marca `estornoNecessario`.
- Alteracao de endereco valida bairro e recalcula taxa.
- Existem permissoes por perfil: admin, operador e viewer.

### Regras implicitas

- Site opera efetivamente como Pix, mesmo que o checkout mostre outras formas.
- `CONFIRMADO` equivale a pagamento confirmado/aguardando acao.
- Pedido e sempre tratado como delivery.
- Motoboy e opcional para avancar fluxo.
- Pedido manual dinheiro e confirmado automaticamente.

### Regras ausentes

- Forma de pagamento persistida.
- Troco persistido.
- Tipo de atendimento persistido.
- Retirada/balcao/consumo local.
- Produto indisponivel apos pedido criado.
- Estorno automatico ou conciliacao financeira.
- Reabertura controlada.
- Bloqueio de cancelamento em `ENTREGUE`/`CANCELADO`.
- Reconciliacao manual Pix.
- Alteracao de itens com recalculo e auditoria.
- Regra de permissao por acao sensivel no frontend.

### Regras contraditorias

- Checkout mostra dinheiro/cartao/Pix, mas o payload nao envia pagamento.
- Banco nao possui campos dedicados para forma de pagamento/troco.
- Pedido manual dinheiro pode passar pelo fluxo comum que tenta gerar Pix antes de confirmar dinheiro.
- Mensagem de `CONFIRMADO` ao cliente diz que ja esta em preparo, mas a UI trata como "Aprovacao".

## 9. Comunicacao com cliente

Eventos que notificam automaticamente hoje:

- `CONFIRMADO`
- `SAIU_ENTREGA`
- `ENTREGUE`
- `CANCELADO`

Eventos que deveriam notificar automaticamente:

- Pedido aceito/confirmado pela loja.
- Pedido saiu para entrega.
- Pedido entregue.
- Pedido cancelado.

Eventos que deveriam ser manuais ou configuraveis:

- Em preparo.
- Aguardando entregador.
- Pedido atrasado.
- Produto indisponivel.
- Alteracao de endereco.

Eventos que nao precisam notificar sempre:

- Mudancas internas de motoboy.
- Ajustes de endereco internos.
- Marcacao de estorno como realizado, salvo se houver mensagem financeira ao cliente.

Riscos:

- Spam se cada microetapa notificar.
- Mensagem de cancelamento generica demais.
- Cliente pode receber "pedido em preparo" cedo demais.
- WhatsApp manual pode ser usado fora do contexto do pedido.

## 10. Pagamento

O modulo mostra `statusPagamento`, mas nao mostra:

- Forma de pagamento.
- Troco.
- Gateway.
- ID/link de pagamento.
- Data/hora da confirmacao.
- Necessidade de cobrar na entrega.

Riscos:

- Pedido ser tratado como Pix mesmo quando cliente escolheu dinheiro/cartao.
- Operador nao saber se precisa levar maquininha.
- Operador nao saber se precisa levar troco.
- Pedido ficar travado se webhook Pix falhar.
- Estorno ser apenas uma marcacao manual, sem processo financeiro real.

Regras necessarias:

- Separar status financeiro de status operacional.
- Persistir `formaPagamento`.
- Persistir `trocoPara`.
- Permitir "verificar Pix agora".
- Definir estorno manual ou automatico.
- Bloquear preparo quando pagamento online esta pendente.
- Permitir pagamento na entrega com fluxo operacional proprio.

## 11. Entrega e logistica

Pontos positivos:

- Endereco e bairro aparecem no detalhe.
- Taxa de entrega aparece.
- Endereco pode ser alterado.
- Bairro alterado recalcula taxa.
- Motoboy pode ser atribuido.
- Existe painel de motoboys.
- Existe fila urgente.

Gaps:

- Nao ha status `AGUARDANDO_ENTREGADOR`.
- Metrica `aguardandoEntregador` existe no contrato, mas retorna 0.
- Nao ha botao "copiar endereco".
- Nao ha link para mapa.
- CEP/complemento/referencia nao aparecem como campos separados.
- Nao ha ETA operacional por bairro/produto.
- Nao ha retirada.
- Nao ha consumo local.

## 12. UX/UI operacional

Pontos fortes:

- Fila urgente.
- Modo pico.
- Cards com timer.
- Metricas no topo.
- Sons e notificacoes.
- SSE com fallback.
- Central WhatsApp.
- Painel de motoboys.

Pontos fracos:

- Header com muitos botoes.
- Lista nao mostra status operacional explicitamente.
- Informacoes criticas ficam escondidas em abas.
- Observacoes nao aparecem no ticket principal.
- Botao principal e generico: "Avancar status".
- Cancelamento tem motivo padrao ja selecionado.
- Layout admin com sidebar fixa tende a ser ruim em celular.

Em horario de pico, o operador precisa de uma tela tipo "ticket operacional", nao uma ficha distribuida em abas.

## 13. Friccoes e gargalos

Pontos onde o operador pode errar:

- Nao ver observacao do cliente.
- Nao perceber observacao por item.
- Nao ver forma de pagamento.
- Nao saber se precisa de troco.
- Confundir `CONFIRMADO` com "aceito pela cozinha".
- Cancelar pedido finalizado.
- Esquecer de atribuir motoboy.
- Nao saber o proximo passo.
- Nao perceber pagamento Pix travado.
- Marcar estorno como realizado sem confirmacao.
- Criar pedido manual dinheiro e ainda gerar fluxo Pix.
- Perder contexto do cliente ao alternar entre pedido e WhatsApp.

## 14. Gaps funcionais

Gaps principais:

- Persistencia de forma de pagamento.
- Persistencia de troco.
- Persistencia de tipo de atendimento.
- Observacoes visiveis no ticket principal.
- Impressao/compartilhamento de pedido.
- Status logistico intermediario.
- Reconciliacao Pix.
- Fluxo de produto indisponivel.
- Bloqueio de acoes finais.
- Templates WhatsApp contextuais.
- Auditoria com diferencas de valor.
- Mobile operacional.

## 15. Oportunidades de melhoria

### Quick wins

- Mostrar status operacional na lista.
- Mostrar horario do pedido na lista.
- Mostrar tempo decorrido desde criacao.
- Exibir observacao do pedido no topo do detalhe.
- Exibir observacao dos itens junto dos itens.
- Renomear `CONFIRMADO` na UI para algo menos ambiguo.
- Desabilitar cancelar em `ENTREGUE`, `CANCELADO`, `EXPIRADO`, `ABANDONADO`.
- Adicionar confirmacao para `ENTREGUE`, cancelamento e estorno.
- Adicionar "Copiar endereco".
- Adicionar "Abrir WhatsApp".

### Melhorias importantes

- Persistir `formaPagamento`.
- Persistir `trocoPara`.
- Persistir `tipoAtendimento`.
- Separar status financeiro de status operacional.
- Criar `AGUARDANDO_ENTREGADOR` ou `PRONTO`.
- Reconciliar Pix manualmente.
- Criar ticket de cozinha/impressao.
- Permitir motivo de cancelamento com texto livre.

### Futuro

- Painel de cozinha.
- App/portal do entregador.
- Agrupamento inteligente de rotas.
- Estoque integrado.
- SLA configuravel por produto/bairro.
- Relatorio de gargalos por etapa.

### Evitar por enquanto

- Roteirizacao complexa.
- Chatbot autonomo decidindo cancelamentos.
- IA enviando mensagens sensiveis sem aprovacao.
- Marketplace completo de entregadores.
- Edicao complexa de pedidos antes de consolidar status/pagamento.

## 16. Oportunidades de IA/automacao

| Automacao | Dor resolvida | Como funcionaria | Dados necessarios | Risco | Impacto | Esforco | Prioridade |
|---|---|---|---|---|---|---|---|
| Alerta de atraso | Pedido esquecido | Destacar pedido por SLA/status | `statusMudouEm`, status, SLA | Baixo | Alto | Baixo | Alta |
| Proxima acao sugerida | Duvida operacional | CTA contextual por status | status, pagamento, motoboy | Baixo | Alto | Baixo | Alta |
| Resumo inteligente | Leitura lenta | Gerar resumo de itens, obs, pagamento e entrega | pedido completo | Medio | Alto | Medio | Alta |
| Observacao critica | Erro na cozinha | Detectar termos como "sem", "alergia", "troco", "urgente" | observacoes | Medio | Alto | Medio | Alta |
| Mensagens por status | Trabalho manual | Templates aprovados por evento | status, cliente, ETA | Medio | Medio | Baixo | Media |
| Pagamento pendente | Preparo indevido | Alertar/bloquear se Pix pendente | statusPagamento, gateway | Baixo | Alto | Medio | Alta |
| Cliente recorrente | Atendimento melhor | Mostrar preferencias/ultimos pedidos | historico cliente | Baixo | Medio | Medio | Media |
| Relatorio de gargalos | Gestao operacional | Calcular tempos por etapa | timeline/statusMudouEm | Baixo | Alto | Medio | Alta |

## 17. Metricas recomendadas

Metricas que deveriam existir:

- Tempo medio ate pagamento.
- Tempo medio ate aceite.
- Tempo medio em preparo.
- Tempo aguardando entregador.
- Tempo em rota.
- Pedidos atrasados por etapa.
- Cancelamentos por motivo.
- Estornos pendentes.
- Pedidos por status.
- Pedidos por horario.
- Ticket medio.
- Formas de pagamento mais usadas.
- Taxa de recompra.
- Mensagens sem resposta.
- Tempo medio de resposta WhatsApp.
- Pedidos com observacao critica.
- Falhas de Pix/webhook.
- Pedidos por bairro.
- Tempo medio por bairro.

## 18. Matriz impacto x esforco

| Recomendacao | Dor resolvida | Impacto | Esforco | Prioridade |
|---|---|---|---|---|
| Persistir forma de pagamento/troco | Cobranca errada | Alto | Medio | P0 |
| Exibir observacoes no ticket | Preparo errado | Alto | Baixo | P0 |
| Bloquear cancelar status finais | Erro grave | Alto | Baixo | P0 |
| Renomear status/CTA | Confusao operacional | Alto | Baixo | P0 |
| Criar status aguardando entregador | Gargalo logistico | Alto | Medio | P1 |
| Verificar Pix manual | Pedido travado | Alto | Medio | P1 |
| Imprimir/compartilhar pedido | Operacao cozinha | Medio | Baixo | P1 |
| Copiar endereco/WhatsApp | Agilidade | Medio | Baixo | P1 |
| Templates WhatsApp | Padronizacao | Medio | Medio | P2 |
| Painel entregador | Escala logistica | Alto | Alto | P3 |

## 19. Fluxo ideal recomendado

Fluxo recomendado para MVP comercial:

1. Pedido entra como `AGUARDANDO_PAGAMENTO` se Pix.
2. Pedido entra como `AGUARDANDO_ACEITE` se pagamento na entrega.
3. Quando Pix confirma, vira `PAGO_AGUARDANDO_ACEITE`.
4. Operador aceita ou cancela com motivo.
5. Aceito vira `EM_PREPARO`.
6. Cozinha finaliza e pedido vira `PRONTO` ou `AGUARDANDO_ENTREGADOR`.
7. Motoboy e atribuido.
8. Pedido vira `EM_ROTA`.
9. Pedido vira `ENTREGUE`.
10. Cancelamento sempre exige motivo.
11. Se pedido cancelado estava pago, abre pendencia de estorno.

Tela principal ideal:

- Ticket completo sem depender de abas.
- Cliente e telefone.
- Endereco, bairro, complemento e referencia.
- Tipo de atendimento.
- Forma de pagamento e troco.
- Status financeiro.
- Status operacional.
- Itens, quantidades e observacoes.
- Total, subtotal e taxa.
- Tempo desde entrada.
- Proxima acao recomendada.
- Acoes seguras e contextuais.

## 20. Go / No-Go

Classificacao: **GO com ressalvas**.

O modulo esta pronto para piloto assistido em operacao Pix/delivery controlada. Nao esta pronto para venda ampla como sistema completo de restaurante/delivery multiforma de pagamento.

O que ja esta bom:

- Cockpit em tempo real.
- Fila urgente.
- Metricas.
- WhatsApp integrado.
- Motoboys.
- Status operacional basico.
- Cancelamento com motivo.
- Auditoria basica.

O que impede uso comercial pleno:

- Pagamento/troco nao persistidos.
- Observacoes criticas pouco visiveis.
- Status ambiguo.
- Ausencia de retirada/local.
- Ausencia de status aguardando entregador.
- Risco de cancelamento em status final.

Minimo aceitavel para MVP funcional:

- Corrigir pagamento.
- Mostrar observacoes.
- Bloquear acoes finais indevidas.
- Ajustar nomenclatura de status.
- Transformar detalhe do pedido em ticket operacional.

## 21. Recomendacao final

Maior risco atual:

- Inconsistencia de pagamento e falta de visibilidade de observacoes.

Maior oportunidade:

- Transformar a tela em um ticket operacional orientado a proxima acao, separando status financeiro de status operacional.

Primeira melhoria a fazer:

- Persistir e exibir `formaPagamento`, `trocoPara`, observacoes do pedido e observacoes dos itens.

O que nao deve ser implementado agora:

- Roteirizacao avancada.
- Automacoes autonomas de atendimento.
- CRM complexo.
- Painel de entregador completo antes de estabilizar fluxo basico.

Proximo prompt recomendado:

> Faca uma especificacao funcional P0/P1 para corrigir pagamento, observacoes, status e cancelamento no `/admin/pedidos`, sem implementar.

