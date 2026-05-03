# Especificacao Funcional e Tecnica P0/P1 — `/admin/pedidos`

**Data:** 2026-05-02  
**Modulo:** `/admin/pedidos`  
**Tipo:** Planejamento pre-implementacao  
**Fonte base:** `docs/raio-x/Raio X Operacional/raio-x-funcional-produto-admin-pedidos.md`  
**Status:** Decisoes tecnicas finais incorporadas; pronto para virar backlog tecnico  

---

## 1. Objetivo

Corrigir os principais riscos funcionais do modulo `/admin/pedidos` antes de ampliar uso comercial:

- Pagamento e troco precisam refletir a escolha real do cliente.
- Observacoes criticas precisam aparecer no ticket operacional.
- Status e acoes precisam orientar o operador sem ambiguidade.
- Acoes perigosas precisam ter bloqueios e confirmacoes.
- Fluxo de entrega precisa ter uma etapa clara de prontidao/despacho.

Esta especificacao nao implementa nada. Ela define escopo, regras, contratos esperados, criterios de aceite, riscos e ordem recomendada de execucao.

---

## 2. Problema resumido

O cockpit atual ja e util para operacao em tempo real, mas ainda permite confusoes graves:

- O checkout exibe Pix, cartao e dinheiro, mas o pedido criado nao persiste forma de pagamento nem troco.
- O operador ve `statusPagamento`, mas nao ve se precisa cobrar na entrega, levar maquininha ou levar troco.
- Observacoes do pedido e dos itens nao ficam destacadas no ticket principal.
- `CONFIRMADO` mistura pagamento confirmado, aceite da loja e inicio de preparo.
- O botao "Avancar status" nao diz qual sera a proxima etapa.
- Acoes sensiveis, como cancelar, entregar e marcar estorno, precisam de protecao melhor.

---

## 3. Principios de produto e engenharia

1. **Operacao primeiro:** em horario de pico, o operador deve entender o proximo passo em ate poucos segundos.
2. **Separar financeiro de operacional:** pagamento nao deve ser confundido com preparo ou entrega.
3. **Compatibilidade progressiva:** mudancas de banco devem ser aditivas e seguras para pedidos existentes.
4. **Sem refator grande no P0:** corrigir riscos sem redesenhar todo o cockpit.
5. **Auditoria minima:** acoes sensiveis devem ficar rastreaveis em timeline.
6. **Teste antes de expansao:** cada mudanca P0 precisa ter criterio de aceite e teste minimo.

---

## 4. Escopo

### Entra no P0

- Persistir e exibir forma de pagamento.
- Persistir e exibir troco para dinheiro.
- Criar `StatusPagamento.A_RECEBER` para pagamento na entrega.
- Persistir `tipoAtendimento` com default `ENTREGA`.
- Ajustar checkout, pedido manual, API e admin para nao perder dados de pagamento.
- Exibir observacao geral e observacao por item no ticket principal.
- Corrigir labels/CTAs para reduzir ambiguidade de status.
- Bloquear acoes perigosas em status finais.
- Exigir confirmacao para acoes sensiveis.
- Melhorar mensagem/fluxo de cancelamento e estorno manual.

### Entra no P1

- Criar status operacional `PRONTO`.
- Tratar "aguardando entregador" como estado derivado de `PRONTO` sem entregador/despacho.
- Expor "verificar Pix agora" ou reconciliacao manual assistida.
- Adicionar impressao de ticket via `window.print` com CSS dedicado.
- Adicionar copiar endereco, abrir WhatsApp e templates contextuais.
- Implementar fluxos funcionais de retirada e consumo local sobre `tipoAtendimento`.
- Melhorar metricas por etapa operacional.

### Fica fora por enquanto

- Roteirizacao avancada.
- App completo de entregador.
- Painel de cozinha separado.
- Edicao complexa de itens com recalculo financeiro.
- Estorno automatico no gateway.
- Chatbot autonomo para cancelar, negociar ou responder sem aprovacao humana.

---

## 5. Priorizacao

| Prioridade | Item | Motivo |
|---|---|---|
| P0 | Forma de pagamento e troco | Evita cobranca errada e falha na entrega |
| P0 | `StatusPagamento.A_RECEBER` | Separa pagamento na entrega de pagamento confirmado |
| P0 | `tipoAtendimento = ENTREGA` | Cria base segura para retirada e consumo local no P1 |
| P0 | Observacoes no ticket | Evita preparo errado |
| P0 | Labels e CTA de status | Evita decisao errada do operador |
| P0 | Bloqueio de acoes finais | Evita regressao operacional grave |
| P0 | Confirmacoes sensiveis | Reduz cliques acidentais |
| P1 | `PRONTO` e aguardando entregador derivado | Reduz gargalo logistico sem inflar enum operacional |
| P1 | Verificar Pix | Reduz pedido travado por webhook |
| P1 | Impressao via `window.print` | Melhora operacao de cozinha com menor complexidade tecnica |
| P1 | Copiar endereco/WhatsApp | Acelera atendimento |
| P1 | Retirada e consumo local | Expande operacao usando base criada no P0 |

---

## 6. P0 — Especificacao funcional

### P0.1 — Pagamento real no pedido

#### Dor

O cliente pode escolher dinheiro/cartao/Pix no checkout, mas o backend recebe apenas dados de cliente, itens e observacao. O admin nao sabe a forma real de pagamento nem troco.

#### Resultado esperado

Todo pedido deve ter forma de pagamento clara e exibida no admin:

- Pix online.
- Dinheiro na entrega.
- Cartao credito na entrega.
- Cartao debito na entrega.

Para dinheiro, o pedido deve exibir:

- Valor total.
- Troco para quanto, se informado.
- Valor estimado de troco, se `trocoPara > total`.
- Alerta se `trocoPara < total`.

#### Regras funcionais

- Pedido Pix online inicia com `statusPagamento = PENDENTE` e exige confirmacao do gateway antes de preparo.
- Pedido com pagamento na entrega deve iniciar com `statusPagamento = A_RECEBER`, mas operacionalmente pode ser aceito pela loja.
- Pedido dinheiro sem troco informado deve exibir "Sem troco informado".
- Pedido dinheiro com troco informado menor que o total deve ser rejeitado na API.
- Pedido cartao deve exibir tipo de cartao e "cobrar na entrega".
- Pagamento por cartao na entrega e informativo no P0: nao ha baixa financeira automatica nem conciliacao operacional nesta fase.
- O modelo deve preservar `formaPagamento` e dados necessarios para conciliacao futura.
- Pedido manual deve seguir as mesmas regras do checkout.

#### Criterios de aceite

- Ao criar pedido em dinheiro com troco, o admin mostra forma de pagamento e troco.
- Ao criar pedido em cartao, o admin mostra que deve cobrar na entrega.
- Pedido em dinheiro/cartao inicia com `statusPagamento = A_RECEBER`.
- Ao criar pedido Pix, o admin mostra Pix e status financeiro pendente ate webhook.
- Pedido dinheiro/cartao nao gera obrigatoriamente link Pix.
- Pedido com `trocoPara` menor que total retorna erro de validacao.
- Lista e detalhe do admin exibem forma de pagamento sem abrir abas secundarias.

---

### P0.2 — Observacoes no ticket operacional

#### Dor

Observacoes do cliente e observacoes por item podem existir, mas nao ficam evidentes no ticket principal do operador.

#### Resultado esperado

O operador deve ver observacoes antes de avancar o pedido.

#### Regras funcionais

- Observacao geral deve aparecer em destaque no topo do ticket.
- Observacao por item deve aparecer imediatamente abaixo do item.
- Observacoes devem aparecer tambem em modo pico.
- Observacoes com termos criticos devem receber destaque visual simples.
- Termos criticos iniciais: `sem`, `tirar`, `alergia`, `alergico`, `troco`, `urgente`, `nao colocar`, `separado`.

#### Criterios de aceite

- Pedido com observacao geral mostra bloco "Observacao do cliente".
- Item com observacao mostra a observacao junto ao item.
- Pedido sem observacao nao ocupa espaco visual desnecessario.
- Modo pico continua exibindo observacoes criticas.

---

### P0.3 — Status, nomenclatura e proxima acao

#### Dor

`CONFIRMADO` e ambiguo. A UI usa "Aprovacao", enquanto a mensagem ao cliente sugere preparo iniciado.

#### Resultado esperado

O operador deve entender o significado operacional de cada estado e qual acao sera executada.

#### Regras funcionais

- No P0, evitar trocar enum se isso aumentar o risco. Corrigir primeiro labels e CTAs.
- Label de `AGUARDANDO_PAGAMENTO`: "Aguardando pagamento".
- Label funcional de `CONFIRMADO` no admin: "Aguardando preparo".
- Label de `PREPARANDO`: "Em preparo".
- Label de `SAIU_ENTREGA`: "Em rota".
- Botao "Avancar status" deve virar CTA contextual:
  - `AGUARDANDO_PAGAMENTO` com pagamento confirmado: "Aceitar pedido".
  - `CONFIRMADO`: "Iniciar preparo".
  - `PREPARANDO`: "Enviar para entrega".
  - `SAIU_ENTREGA`: "Marcar entregue".
- Tooltip ou texto auxiliar deve explicar por que uma acao esta bloqueada.

#### Criterios de aceite

- Nenhum botao principal exibe apenas "Avancar status".
- Pedido com Pix pendente mostra acao bloqueada com motivo claro.
- Status atual aparece na lista e no detalhe com o mesmo label.
- O cliente nao recebe mensagem que prometa preparo antes da loja realmente aceitar/iniciar preparo.

---

### P0.4 — Bloqueios de acoes perigosas

#### Dor

Acoes como cancelar, entregar e marcar estorno podem causar prejuizo se acionadas no contexto errado.

#### Resultado esperado

Estados finais devem ser protegidos, e acoes sensiveis devem exigir confirmacao.

#### Regras funcionais

- Pedido `ENTREGUE`, `CANCELADO`, `EXPIRADO` ou `ABANDONADO` nao pode ser cancelado pelo fluxo normal.
- Pedido `ENTREGUE` nao pode voltar ou ser alterado por acoes comuns.
- "Marcar entregue" exige confirmacao.
- "Cancelar pedido" exige confirmacao e motivo.
- "Marcar estorno realizado" exige confirmacao separada.
- Cancelamento de pedido pago deve manter `estornoNecessario = true` ate baixa manual.
- Cancelamento de pedido com `statusPagamento = PENDENTE` ou `A_RECEBER` deve encerrar a cobranca como cancelada no fluxo operacional.

#### Criterios de aceite

- Botao cancelar nao aparece ou fica bloqueado para status finais.
- Cancelamento sem motivo nao e permitido.
- Cancelamento pago cria pendencia de estorno.
- Marcar estorno realizado sem confirmacao nao e possivel.
- Timeline registra cancelamento, motivo e operador.

---

### P0.5 — Ticket operacional minimo

#### Dor

As informacoes estao divididas em abas, e dados criticos podem ficar escondidos.

#### Resultado esperado

O painel principal do pedido deve funcionar como ticket operacional.

#### Conteudo minimo visivel no ticket

- Numero do pedido.
- Status operacional.
- Status financeiro.
- Forma de pagamento.
- Troco, se houver.
- Cliente.
- Telefone/WhatsApp.
- Endereco e bairro.
- Taxa de entrega.
- Itens.
- Observacoes por item.
- Observacao geral.
- Total.
- Tempo no estagio.
- Proxima acao.

#### Criterios de aceite

- Operador consegue preparar corretamente um pedido sem abrir aba secundaria.
- Dados financeiros aparecem junto do pedido.
- Observacoes aparecem junto do item ou em bloco de destaque.

---

## 7. P1 — Especificacao funcional

### P1.1 — Status `PRONTO` e estado derivado "aguardando entregador"

#### Dor

Hoje o pedido sai de `PREPARANDO` direto para `SAIU_ENTREGA`. Isso mistura cozinha pronta com despacho.

#### Resultado esperado

Criar etapa clara entre cozinha e entrega:

- `PRONTO` como status operacional persistido.
- "Aguardando entregador" como estado derivado de pedido `PRONTO` ainda nao despachado/sem entregador atribuido.

#### Regras funcionais

- Pedido em preparo deve poder virar `PRONTO`.
- Pedido pronto sem motoboy deve aparecer como gargalo.
- Ao atribuir motoboy e despachar, pedido vira `SAIU_ENTREGA` ou `EM_ROTA`.
- Metrica `aguardandoEntregador` deve ser calculada a partir de pedidos `PRONTO` ainda nao despachados.

#### Criterios de aceite

- Operador consegue marcar pedido como pronto sem dizer que saiu para entrega.
- Pedido pronto sem motoboy aparece como pendencia operacional.
- Nao existe enum/status persistido `AGUARDANDO_ENTREGADOR` no P1.
- Painel de metricas mostra quantidade aguardando entregador.

---

### P1.2 — Verificacao manual de Pix

#### Dor

Se o webhook falhar, o pedido pode ficar travado em pagamento pendente.

#### Resultado esperado

Operador/admin deve poder consultar ou reprocessar pagamento Pix de forma assistida.

#### Regras funcionais

- Mostrar `pagamentoId` quando existir.
- Mostrar quando o link Pix foi criado.
- Mostrar quando o pagamento expira.
- Criar acao "Verificar pagamento" para pedidos Pix pendentes.
- Se gateway confirmar pagamento, atualizar status financeiro e timeline.
- Se gateway nao confirmar, manter pendente e mostrar retorno claro.

#### Criterios de aceite

- Pedido Pix pendente possui acao visivel de verificacao.
- Resultado da verificacao aparece em toast/mensagem clara.
- Timeline registra verificacao manual.

---

### P1.3 — Impressao de pedido

#### Dor

Cozinha e expedicao podem precisar de um ticket fisico.

#### Resultado esperado

Gerar uma visualizacao enxuta para impressao usando `window.print` e CSS dedicado.

#### Conteudo do ticket

- Numero do pedido.
- Horario.
- Cliente.
- Forma de pagamento e troco.
- Endereco.
- Itens e observacoes.
- Total.
- Observacao geral.

#### Criterios de aceite

- Botao "Imprimir" gera ticket sem layout pesado.
- Impressao usa `window.print` com stylesheet dedicado para ticket.
- Ticket impresso inclui observacoes.
- Ticket nao inclui elementos desnecessarios do painel admin.

---

### P1.4 — Acoes rapidas de entrega e contato

#### Dor

Operador perde tempo copiando informacoes manualmente.

#### Resultado esperado

Adicionar acoes rapidas:

- Copiar endereco.
- Abrir WhatsApp do cliente.
- Copiar resumo do pedido.
- Copiar link de acompanhamento, quando existir.

#### Criterios de aceite

- Copiar endereco copia endereco completo e bairro.
- Abrir WhatsApp usa telefone do cliente.
- Copiar resumo inclui numero, itens, total e endereco.

---

### P1.5 — Retirada e consumo local

#### Dor

O P0 cria `tipoAtendimento` com default `ENTREGA`, mas a experiencia funcional ainda trata a operacao como delivery.

#### Resultado esperado

Implementar comportamento operacional para:

- `RETIRADA`
- `CONSUMO_LOCAL`

#### Regras funcionais

- O campo `tipoAtendimento` ja deve existir desde o P0 com default `ENTREGA`.
- Retirada nao deve exigir taxa de entrega.
- Consumo local nao deve exigir endereco completo.
- UI do admin deve mostrar tipo de atendimento.

#### Criterios de aceite

- Pedidos existentes aparecem como `ENTREGA`.
- Admin mostra tipo de atendimento.
- Checkout/admin permitem criar pedidos `RETIRADA` e `CONSUMO_LOCAL`.
- Nenhuma regra de entrega quebra pedidos antigos.

---

## 8. Especificacao tecnica

### 8.1 Banco de dados

Mudancas recomendadas para P0:

- Adicionar enum `FormaPagamentoPedido`:
  - `PIX`
  - `DINHEIRO`
  - `CARTAO_CREDITO`
  - `CARTAO_DEBITO`
- Adicionar campo `formaPagamento` em `Pedido`, com default `PIX`.
- Adicionar campo decimal opcional `trocoPara`.
- Adicionar valor `A_RECEBER` em `StatusPagamento` para dinheiro/cartao na entrega.
- Adicionar enum `TipoAtendimentoPedido`:
  - `ENTREGA`
  - `RETIRADA`
  - `CONSUMO_LOCAL`
- Adicionar campo `tipoAtendimento`, com default `ENTREGA`.
- No P0, criar a base tecnica e gravar `ENTREGA` por default; criacao funcional de `RETIRADA` e `CONSUMO_LOCAL` fica no P1.

Mudancas recomendadas para P1:

- Adicionar status operacional `PRONTO`.
- Nao adicionar `AGUARDANDO_ENTREGADOR` como enum persistido; calcular como estado derivado de `PRONTO` ainda nao despachado.
- Implementar regras funcionais para `RETIRADA` e `CONSUMO_LOCAL`.

Regras de compatibilidade:

- Campos novos devem ter default ou ser nullable quando necessario.
- Pedidos antigos devem ser tratados como `formaPagamento = PIX` e `tipoAtendimento = ENTREGA`.
- Backfill deve ser explicito se houver pedidos antigos em dinheiro criados manualmente sem persistencia.

### 8.2 API publica de pedidos

Endpoint afetado:

- `POST /api/pedidos`

Contrato recomendado:

```json
{
  "cliente": {
    "nome": "Cliente",
    "telefone": "62999999999",
    "endereco": "Rua X, n 10",
    "bairro": "Centro",
    "cep": "74000000"
  },
  "itens": [
    {
      "produtoId": "produto-id",
      "quantidade": 1,
      "observacao": "sem cebola"
    }
  ],
  "observacao": "portao azul",
  "pagamento": {
    "forma": "DINHEIRO",
    "trocoPara": 100
  },
  "tipoAtendimento": "ENTREGA"
}
```

Validacoes:

- `pagamento.forma` obrigatoria.
- `trocoPara` permitido apenas para `DINHEIRO`.
- `trocoPara` deve ser maior ou igual ao total.
- Pix online deve continuar gerando link de pagamento.
- Pagamento na entrega nao deve depender de link Pix.

### 8.3 API admin de pedidos

Endpoints afetados:

- `GET /api/admin/pedidos`
- `GET /api/admin/pedidos/:id`
- `POST /api/admin/pedidos/manual`
- `PATCH /api/admin/pedidos/:id/status`
- `POST /api/admin/pedidos/:id/cancelar`
- `PATCH /api/admin/pedidos/:id/estorno`

Campos adicionais na lista:

- `formaPagamento`
- `trocoPara`
- `tipoAtendimento`
- `observacaoCritica`
- `statusOperacionalLabel`
- `proximaAcao`

Campos adicionais no detalhe:

- `formaPagamento`
- `trocoPara`
- `trocoCalculado`
- `tipoAtendimento`
- `pagamentoResumo`
- `observacoesCriticas`
- `proximaAcao`

Contrato recomendado para `proximaAcao`:

```json
{
  "tipo": "INICIAR_PREPARO",
  "label": "Iniciar preparo",
  "habilitada": true,
  "motivoBloqueio": null,
  "requerConfirmacao": false
}
```

### 8.4 Service de pedidos

Responsabilidades novas:

- Validar pagamento conforme forma.
- Evitar geracao de Pix para dinheiro/cartao.
- Definir status financeiro inicial por forma de pagamento.
- Calcular troco.
- Gerar resumo operacional do pedido.
- Bloquear transicoes sensiveis no backend.
- Registrar timeline de acoes sensiveis.

Ponto importante: bloqueios nao devem existir apenas no frontend. A API deve proteger status finais e transicoes invalidas.

### 8.5 Frontend admin

Mudancas P0:

- Lista mostra status operacional e forma de pagamento.
- Detalhe vira ticket operacional.
- Observacoes aparecem no painel principal.
- CTA contextual substitui "Avancar status".
- Cancelar/entregar/estorno exigem confirmacao.
- Acoes bloqueadas mostram motivo.

Mudancas P1:

- Mostrar status `PRONTO` e indicador derivado "aguardando entregador".
- Botao "Verificar Pix".
- Botao "Imprimir".
- Botao "Copiar endereco".
- Botao "Abrir WhatsApp".

### 8.6 Frontend checkout

Mudancas P0:

- Enviar forma de pagamento selecionada.
- Enviar troco quando dinheiro.
- Ajustar texto do botao final:
  - Pix: "Confirmar e pagar".
  - Dinheiro/cartao: "Confirmar pedido".
- Para pagamento na entrega, nao redirecionar para gateway.

### 8.7 Pedido manual

Mudancas P0:

- Suportar Pix, dinheiro, cartao credito e cartao debito.
- Dinheiro deve persistir troco.
- Cartao deve persistir tipo.
- Pix deve gerar link.
- Pedido manual em dinheiro/cartao nao deve criar link Pix desnecessario.

---

## 9. Matriz de regras de pagamento

| Forma | Link Pix | Status financeiro inicial | Pode preparar antes de gateway? | Informacao critica |
|---|---|---|---|---|
| Pix | Sim | `PENDENTE` | Nao | Aguardar confirmacao |
| Dinheiro | Nao | `A_RECEBER` | Sim, apos aceite | Troco |
| Cartao credito | Nao | `A_RECEBER` | Sim, apos aceite | Levar maquininha |
| Cartao debito | Nao | `A_RECEBER` | Sim, apos aceite | Levar maquininha |

`A_RECEBER` e obrigatorio no P0 para dinheiro e cartao na entrega. Nao usar `CONFIRMADO` para representar pagamento que ainda sera recebido.

---

## 10. Matriz de status e acoes

| Status atual | Condicao financeira | Acao principal | Bloqueio |
|---|---|---|---|
| `AGUARDANDO_PAGAMENTO` | Pix pendente | Aguardar pagamento | Nao preparar |
| `AGUARDANDO_PAGAMENTO` | Pix confirmado | Aceitar pedido | Confirmacao opcional |
| `CONFIRMADO` | Pago ou a receber | Iniciar preparo | Label admin: "Aguardando preparo" |
| `PREPARANDO` | Pago ou a receber | Enviar para entrega no P0; marcar pronto no P1 | P1 cria `PRONTO` |
| `PRONTO` | Pago ou a receber | Despachar pedido | P1; "aguardando entregador" e derivado |
| `SAIU_ENTREGA` | Pago ou a receber | Marcar entregue | Requer confirmacao |
| `ENTREGUE` | Qualquer | Nenhuma acao comum | Bloqueado |
| `CANCELADO` | Qualquer | Estorno se necessario | Bloqueado para status |
| `EXPIRADO` | Expirado | Ver/recuperar fora do P0 | Bloqueado |
| `ABANDONADO` | Expirado | Ver/recuperar fora do P0 | Bloqueado |

---

## 11. Criterios de aceite por prioridade

### P0 pronto

- Checkout envia forma de pagamento e troco.
- Backend persiste forma de pagamento e troco.
- Backend cria pedidos dinheiro/cartao com `statusPagamento = A_RECEBER`.
- Backend persiste `tipoAtendimento = ENTREGA` por default.
- Admin lista e detalhe exibem forma de pagamento.
- Pedido dinheiro mostra troco ou "sem troco informado".
- Pedido cartao mostra tipo e cobranca na entrega.
- Pedido Pix continua aguardando confirmacao antes de preparo.
- Observacao geral aparece no ticket principal.
- Observacao por item aparece junto do item.
- CTA contextual substitui "Avancar status".
- Cancelar status final nao e possivel via UI nem API.
- Marcar entregue exige confirmacao.
- Cancelar exige motivo e confirmacao.
- Estorno realizado exige confirmacao.
- Timeline registra acoes sensiveis.
- Testes cobrem criacao de pedido por forma de pagamento e bloqueios principais.

### P1 pronto

- Existe status operacional `PRONTO`.
- Pedido pronto sem motoboy vira pendencia visivel.
- `aguardandoEntregador` deixa de ser sempre 0.
- "Aguardando entregador" e calculado como estado derivado, nao como status persistido.
- Pix pendente possui acao de verificacao manual.
- Ticket pode ser impresso via `window.print` com CSS dedicado.
- Endereco pode ser copiado em um clique.
- WhatsApp do cliente pode ser aberto em um clique.
- Retirada e consumo local funcionam usando `tipoAtendimento`.

---

## 12. Plano de execucao recomendado

### Fase 0 — Revisao final antes de codigo

- Validar nomes tecnicos finais dos enums e campos antes da migration.
- Revisar impactos de `StatusPagamento.A_RECEBER` em queries, filtros, dashboards e testes existentes.
- Revisar textos finais da UI para `CONFIRMADO` como "Aguardando preparo".
- Revisar plano de rollback/compatibilidade da migration aditiva.

### Fase 1 — Banco e contratos P0

- Criar migration aditiva.
- Atualizar tipos compartilhados/API.
- Garantir defaults para pedidos antigos.

### Fase 2 — Backend P0

- Atualizar validacoes de pedido.
- Atualizar criacao publica.
- Atualizar pedido manual.
- Atualizar contratos admin.
- Proteger acoes sensiveis no service.
- Registrar timeline.

### Fase 3 — Frontend P0

- Atualizar checkout.
- Atualizar pedido manual.
- Atualizar lista admin.
- Atualizar ticket principal.
- Trocar CTA generico por CTA contextual.
- Adicionar confirmacoes.

### Fase 4 — Testes P0

- Unitarios de service.
- Integracao de API de criacao.
- Teste de controller admin.
- Teste manual de checkout Pix/dinheiro/cartao.
- Smoke operacional no admin.

### Fase 5 — P1

- Status `PRONTO`.
- Estado derivado "aguardando entregador".
- Metrica real de aguardando entregador.
- Verificacao Pix.
- Impressao via `window.print` com CSS dedicado.
- Acoes rapidas.

---

## 13. Plano de testes minimo

### Backend

- Criar pedido Pix: gera link e fica financeiro pendente.
- Criar pedido dinheiro: nao gera Pix, persiste forma e troco.
- Criar pedido dinheiro/cartao: inicia com `statusPagamento = A_RECEBER`.
- Criar pedido cartao: nao gera Pix, persiste tipo e exibe cobranca na entrega.
- Criar pedido sem `tipoAtendimento`: persiste default `ENTREGA`.
- Rejeitar dinheiro com troco menor que total.
- Cancelar pedido pago: marca estorno necessario.
- Impedir cancelamento de pedido entregue.
- Impedir transicao invalida em status final.

### Frontend

- Checkout envia `pagamento`.
- Admin lista mostra forma de pagamento.
- Admin mostra `CONFIRMADO` como "Aguardando preparo".
- Ticket mostra observacoes.
- CTA muda conforme status.
- Confirmacao aparece para entregar/cancelar/estorno.

### Smoke operacional

1. Criar pedido Pix e confirmar webhook simulado.
2. Aceitar pedido e iniciar preparo.
3. Criar pedido dinheiro com troco.
4. Verificar troco no admin.
5. Cancelar pedido pago e validar estorno pendente.
6. Tentar cancelar pedido entregue e validar bloqueio.
7. Criar pedido com observacao por item e validar exibicao no ticket.

---

## 14. Riscos e mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Mudanca de enum quebrar dados antigos | Alto | Migration aditiva, defaults e testes de leitura |
| `A_RECEBER` exigir ajustes em muitos pontos | Medio | Mapear todos os usos de `statusPagamento` na Fase 0 antes de implementar |
| Checkout sem compatibilidade com pedidos antigos | Medio | Backend aceitar payload antigo temporariamente com default Pix |
| Operador confundir label novo | Medio | Labels consistentes na lista, detalhe e mensagem ao cliente |
| Link Pix gerado para dinheiro/cartao | Alto | Separar fluxo de criacao por forma de pagamento |
| Bloqueio so no frontend | Alto | Reforcar regras no backend |
| Confirmacoes demais causarem lentidao | Medio | Confirmar apenas acoes irreversiveis/sensiveis |

---

## 15. Decisoes fechadas e premissas de implementacao

Decisoes finais incorporadas nesta especificacao:

1. Criar `StatusPagamento.A_RECEBER` no P0.
2. Exibir `CONFIRMADO` como "Aguardando preparo" no admin.
3. Criar `PRONTO` no P1; "aguardando entregador" sera estado derivado.
4. Pagamento por cartao na entrega sera informativo no P0 e preparado para conciliacao futura.
5. Impressao no P1 sera via `window.print` com CSS dedicado.
6. `tipoAtendimento` entra no P0 como campo default `ENTREGA`; retirada e consumo local ficam para P1.

Premissas para implementacao:

- As mudancas de banco devem ser aditivas e com defaults seguros.
- `CONFIRMADO` nao deve ser usado como label financeiro.
- Cartao na entrega nao tera conciliacao automatica no P0.
- `AGUARDANDO_ENTREGADOR` nao deve ser persistido como status no P1.
- `RETIRADA` e `CONSUMO_LOCAL` nao devem alterar o comportamento P0, apenas usar a base tecnica criada.

---

## 16. Definicao de pronto

Esta especificacao deve ser considerada pronta para virar backlog quando:

- P0 for quebrado em tarefas pequenas.
- Cada tarefa tiver criterios de aceite.
- Migrations forem revisadas antes de execucao.
- Plano de teste estiver aceito.
- Houver ambiente seguro para validar checkout e admin.

---

## 17. Backlog sugerido

### P0

- [ ] Implementar modelo financeiro P0: `formaPagamento`, `trocoPara`, `A_RECEBER`.
- [ ] Persistir `tipoAtendimento` com default `ENTREGA`.
- [ ] Criar migration aditiva.
- [ ] Atualizar DTO de criacao de pedido.
- [ ] Atualizar checkout para enviar pagamento.
- [ ] Atualizar service de pedido por forma de pagamento.
- [ ] Atualizar pedido manual.
- [ ] Atualizar resposta admin lista/detalhe.
- [ ] Atualizar ticket operacional no admin.
- [ ] Adicionar observacoes no ticket.
- [ ] Criar CTA contextual.
- [ ] Bloquear acoes finais no backend e frontend.
- [ ] Adicionar confirmacoes sensiveis.
- [ ] Cobrir com testes.

### P1

- [ ] Criar status operacional `PRONTO`.
- [ ] Calcular estado derivado "aguardando entregador".
- [ ] Atualizar metricas logisticas.
- [ ] Criar verificacao Pix manual.
- [ ] Criar impressao via `window.print` com CSS dedicado.
- [ ] Criar acoes rapidas de endereco/WhatsApp.
- [ ] Implementar retirada e consumo local sobre `tipoAtendimento`.
