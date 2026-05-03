# Analise de Decisao Tecnica/Produto — P0 `/admin/pedidos`

**Data:** 2026-05-02  
**Modulo:** `/admin/pedidos`  
**Tipo:** Decisoes tecnicas e funcionais pre-implementacao  
**Arquivos base:**

- `docs/raio-x/Raio X Operacional/raio-x-funcional-produto-admin-pedidos.md`
- `docs/raio-x/Raio X Operacional/2026-05-02_especificacao_p0_p1_admin_pedidos.md`

---

## 1. Criar `StatusPagamento.A_RECEBER`?

### Contexto

Hoje `statusPagamento` cobre apenas:

- `PENDENTE`
- `CONFIRMADO`
- `EXPIRADO`

Esse modelo nao representa corretamente pagamentos na entrega, como dinheiro e cartao. Usar `PENDENTE` faria o pedido parecer travado aguardando gateway. Usar `CONFIRMADO` marcaria como recebido algo que ainda sera cobrado na entrega.

### Opcoes

1. Nao criar e usar `PENDENTE`.
2. Nao criar e usar `CONFIRMADO`.
3. Criar `A_RECEBER`.

### Pros e contras

| Opcao | Pros | Contras |
|---|---|---|
| Usar `PENDENTE` | Menor mudanca tecnica | Confunde Pix pendente com pagamento na entrega; pode bloquear preparo indevidamente |
| Usar `CONFIRMADO` | Evita bloqueio operacional | E financeiramente falso; distorce metricas e estorno |
| Criar `A_RECEBER` | Representa corretamente dinheiro/cartao na entrega | Exige migration, ajustes de UI, metricas e regras |

### Recomendacao

Criar `StatusPagamento.A_RECEBER`.

### Impacto tecnico

- Migration no enum `StatusPagamento`.
- Atualizacao de validacoes de pedido.
- Ajuste de badges, filtros, metricas e regras de preparo.
- Revisao dos pontos que assumem apenas `PENDENTE`, `CONFIRMADO` e `EXPIRADO`.

### Impacto operacional

- Operador sabe que deve cobrar na entrega.
- Reduz risco de preparar pedido achando que ja foi pago.
- Deixa claro quando precisa levar maquininha ou troco.

### Risco

Medio. O enum e usado em varios pontos do backend e frontend.

Mitigacao:

- Mapear todos os usos de `statusPagamento` antes de implementar.
- Criar testes para Pix, dinheiro, cartao credito e cartao debito.

### Decisao final sugerida

**Criar `StatusPagamento.A_RECEBER` no P0.**

---

## 2. Label funcional final de `CONFIRMADO` no admin

### Contexto

`CONFIRMADO` e ambiguo no fluxo atual. Ele pode representar pagamento confirmado, pedido aceito ou pedido aguardando preparo. A UI tambem usa o termo "Aprovacao", enquanto a mensagem ao cliente sugere que o pedido ja esta em preparo.

### Opcoes

1. "Confirmado"
2. "Pago / aguardando preparo"
3. "Aceito / aguardando preparo"
4. "Aguardando preparo"

### Pros e contras

| Opcao | Pros | Contras |
|---|---|---|
| Confirmado | Curto e conhecido | Continua ambiguo |
| Pago / aguardando preparo | Bom para Pix | Errado para dinheiro/cartao `A_RECEBER` |
| Aceito / aguardando preparo | Bom se houver aceite humano | Pode ser falso se status veio de webhook automaticamente |
| Aguardando preparo | Descreve etapa operacional | Exige exibir pagamento separado para dar contexto completo |

### Recomendacao

Usar **"Aguardando preparo"** como label operacional de `CONFIRMADO` no admin.

O status financeiro deve aparecer separado:

- Pix confirmado: pagamento `CONFIRMADO`.
- Dinheiro/cartao: pagamento `A_RECEBER`.
- Pix pendente: pagamento `PENDENTE`.

### Impacto tecnico

- Ajustar funcao de label no frontend.
- Ajustar filtros, badges e CTAs.
- Revisar mensagens automaticas ao cliente para nao prometer preparo antes da hora.

### Impacto operacional

- O operador entende que o pedido ainda precisa ir para preparo.
- Reduz a mistura entre pagamento e producao.

### Risco

Baixo. Mudanca majoritariamente de linguagem/UX.

### Decisao final sugerida

**`CONFIRMADO` deve aparecer no admin como "Aguardando preparo".**

---

## 3. P1 deve usar `PRONTO`, `AGUARDANDO_ENTREGADOR` ou ambos?

### Contexto

Hoje o pedido sai de `PREPARANDO` direto para `SAIU_ENTREGA`. Isso mistura duas etapas diferentes:

- Cozinha terminou.
- Pedido foi despachado com entregador.

### Opcoes

1. Apenas `PRONTO`.
2. Apenas `AGUARDANDO_ENTREGADOR`.
3. Ambos como status.
4. `PRONTO` como status e `AGUARDANDO_ENTREGADOR` como estado derivado.

### Pros e contras

| Opcao | Pros | Contras |
|---|---|---|
| Apenas `PRONTO` | Simples; serve para entrega e retirada | Nao explicita sozinho que falta entregador |
| Apenas `AGUARDANDO_ENTREGADOR` | Claro para delivery | Ruim para retirada e consumo local |
| Ambos como status | Maxima precisao | Aumenta complexidade da maquina de estados |
| `PRONTO` + estado derivado | Bom equilibrio | Exige regra derivada na UI/metrica |

### Recomendacao

Criar `PRONTO` como status operacional no P1.

Usar "Aguardando entregador" como estado derivado quando:

- `status = PRONTO`
- `tipoAtendimento = ENTREGA`
- nao ha `motoboyId`

### Impacto tecnico

- Novo status operacional no P1.
- Ajuste na maquina de estados.
- Atualizacao de metricas.
- Atualizacao da fila urgente/painel de motoboys.

### Impacto operacional

- Cozinha pode marcar pedido como pronto sem afirmar que saiu para entrega.
- Expeditor enxerga gargalo de entregador.
- Prepara fluxo futuro de retirada.

### Risco

Medio. Mexe na maquina de estados e nas metricas.

### Decisao final sugerida

**Usar `PRONTO` como status no P1 e `AGUARDANDO_ENTREGADOR` como estado operacional derivado.**

---

## 4. Pagamento por cartao na entrega sera informativo ou tera conciliacao futura?

### Contexto

Cartao na entrega exige que o operador/motoboy leve maquininha e cobre no ato. O sistema ainda nao possui conciliacao financeira completa.

### Opcoes

1. Apenas informativo no P0.
2. Conciliacao manual no P0.
3. Informativo no P0, preparado para conciliacao futura.

### Pros e contras

| Opcao | Pros | Contras |
|---|---|---|
| Apenas informativo | Simples e rapido | Nao fecha financeiro |
| Conciliacao manual agora | Mais controle financeiro | Aumenta muito o escopo P0 |
| Informativo com preparo futuro | Equilibra simplicidade e extensibilidade | Exige cuidado para nao chamar de pago |

### Recomendacao

No P0, cartao na entrega deve ser informativo operacional:

- `formaPagamento = CARTAO_CREDITO` ou `CARTAO_DEBITO`
- `statusPagamento = A_RECEBER`
- UI deve mostrar "Cobrar na entrega" e "Levar maquininha"

Preparar para conciliacao futura, sem implementar ledger financeiro agora.

### Impacto tecnico

- Persistir forma de pagamento.
- Ajustar labels e contratos admin.
- Garantir que receita/metricas nao tratem `A_RECEBER` como pagamento confirmado sem criterio definido.

### Impacto operacional

- Operador sabe que precisa cobrar na entrega.
- Motoboy/expedicao sabe que precisa levar maquininha.

### Risco

Medio. Relatorios podem confundir pedido recebido com pagamento recebido.

Mitigacao:

- Separar "receita operacional do pedido" de "pagamento recebido" em nomenclatura futura.

### Decisao final sugerida

**Cartao na entrega sera informativo no P0, preparado para conciliacao futura.**

---

## 5. Impressao de pedido via `window.print` ou tela/endpoint separado?

### Contexto

Impressao e uma melhoria P1 para cozinha/expedicao. O objetivo inicial e gerar ticket operacional simples, nao PDF fiscal ou documento financeiro.

### Opcoes

1. `window.print` com CSS dedicado.
2. Tela/rota separada de impressao.
3. Endpoint/PDF separado.

### Pros e contras

| Opcao | Pros | Contras |
|---|---|---|
| `window.print` + CSS | Rapido, barato, sem backend | Pode exigir ajuste para impressora termica |
| Tela/rota separada | Layout mais isolado | Mais implementacao e manutencao |
| Endpoint/PDF | Mais robusto | Exagerado para P1; aumenta escopo |

### Recomendacao

Usar `window.print` com CSS dedicado no P1.

### Impacto tecnico

- Criar layout imprimivel no frontend.
- CSS `@media print` para ocultar navegacao, botoes e elementos do admin.
- Possivel ajuste posterior para impressoras termicas.

### Impacto operacional

- Cozinha ganha ticket rapido.
- Operador nao depende de PDF ou backend.

### Risco

Baixo.

### Decisao final sugerida

**P1 deve usar `window.print` com CSS dedicado. Tela/endpoint/PDF ficam para fase futura.**

---

## 6. `tipoAtendimento` entra no P0 ou fica para P1?

### Contexto

O sistema trata todo pedido como entrega. Retirada e consumo local sao gaps, mas ativar fluxos completos agora aumentaria bastante o escopo.

### Opcoes

1. Ficar totalmente para P1.
2. Entrar completo no P0.
3. Entrar no P0 apenas como fundacao tecnica.

### Pros e contras

| Opcao | Pros | Contras |
|---|---|---|
| Todo em P1 | Menor escopo P0 | Adia base importante |
| Completo no P0 | Resolve mais casos | Aumenta risco e escopo |
| Fundacao tecnica no P0 | Prepara modelo com baixo risco | Ainda nao entrega retirada/consumo local completo |

### Recomendacao

Incluir `tipoAtendimento` no P0 como fundacao tecnica:

- Campo com default `ENTREGA`.
- Admin pode exibir "Entrega".
- Fluxos reais de retirada e consumo local ficam para P1.

### Impacto tecnico

- Migration aditiva simples.
- Atualizacao de DTOs e contratos admin.
- Backward compatibility clara para pedidos existentes.

### Impacto operacional

- Nenhuma ruptura imediata.
- Operador passa a ver explicitamente que o pedido e de entrega.

### Risco

Baixo, desde que retirada/consumo local nao sejam ativados no checkout no P0.

### Decisao final sugerida

**`tipoAtendimento` entra no P0 como campo tecnico com default `ENTREGA`; retirada e consumo local ficam para P1.**

---

## Decisoes finais recomendadas

1. Criar `StatusPagamento.A_RECEBER` no P0.
2. Exibir `CONFIRMADO` como **"Aguardando preparo"** no admin.
3. No P1, criar `PRONTO` como status; "Aguardando entregador" sera estado derivado.
4. Cartao na entrega sera informativo no P0, preparado para conciliacao futura.
5. Impressao no P1 deve usar `window.print` com CSS dedicado.
6. `tipoAtendimento` entra no P0 como campo default `ENTREGA`; retirada e consumo local ficam para P1.

---

## Ajustes necessarios na especificacao P0/P1

- Trocar "avaliar `A_RECEBER`" por "criar `StatusPagamento.A_RECEBER` no P0".
- Definir label final de `CONFIRMADO` como "Aguardando preparo".
- Ajustar matriz de status para incluir pagamento separado: `CONFIRMADO`, `A_RECEBER`, `PENDENTE` e `EXPIRADO`.
- Atualizar P1 para usar `PRONTO` como status e `AGUARDANDO_ENTREGADOR` como label/alerta derivado.
- Clarificar que cartao na entrega nao tera conciliacao no P0.
- Mover `tipoAtendimento` para P0 tecnico, com default `ENTREGA`.
- Manter retirada e consumo local como P1 funcional.
- Definir impressao P1 como `window.print` + CSS dedicado.
- Atualizar criterios de aceite P0 para validar `A_RECEBER`, cartao informativo e `tipoAtendimento = ENTREGA`.
- Atualizar plano de testes com cenarios Pix, dinheiro, cartao credito, cartao debito e pedido legado.

