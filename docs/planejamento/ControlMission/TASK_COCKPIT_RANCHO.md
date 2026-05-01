# TASK — Cockpit de Gestão · Rancho Comida Caseira

> Especificação gerada por sessão socrática. Cada decisão tem origem e motivo documentados.
> Leia do início ao fim antes de abrir o editor.

---

## Contexto

O painel admin atual tem a estrutura base (lista de pedidos, filtros por status, tabela).
Esta task transforma essa base num cockpit operacional completo onde o operador
gerencia pedidos, entregas e conversa com clientes sem sair da tela.

---

## Layout Geral

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR — métricas em tempo real + botão Abrir/Fechar loja │
├──────────────────┬──────────────────────────────────────────┤
│                  │                                          │
│  LISTA DE        │  DETALHE DO PEDIDO SELECIONADO           │
│  PEDIDOS         │  ┌─ header: nome, telefone, ações ──┐   │
│                  │  ├─ abas:                            │   │
│  card compacto   │  │  Pedido | Entrega | Cliente       │   │
│  com botão de    │  │  WhatsApp | Timeline | IA         │   │
│  aceite visível  │  └───────────────────────────────────┘   │
│                  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

---

## 1. Top Bar

### Métricas em tempo real

| Métrica | Cor | Comportamento |
|---|---|---|
| Aguardando Aprovação | Laranja | Pisca quando > 0 |
| Em Preparo | Azul | Estático |
| Aguardando Entregador | Amarelo | Estático |
| Em Rota | Verde | Estático |
| Entregues hoje | Cinza | Acumulativo do dia |
| Receita hoje | Verde | Soma de pedidos confirmados do dia |

### Botão Abrir / Fechar Loja
Três estados:

```
ABERTO       → site aceita pedidos normalmente
FECHADO      → site exibe tela "fora do horário"
PAUSADO      → suspende novos pedidos temporariamente
               exibe mensagem configurável para o cliente
               sem fechar a loja completamente
```

### Indicador WhatsApp
- Canto superior: ponto verde "WhatsApp conectado" / vermelho "Desconectado"

---

## 2. Lista de Pedidos (painel esquerdo)

### Card de pedido — campos visíveis sem abrir

```
#BJH10              [🔒 Pago]     [⏱ 22min]
Eliézer Passos · Setor Bueno
Jantinha Frango + Jantinha Carne
R$ 38,69            [● 1 msg]    [CONFIRMAR →]
```

### Regras críticas

**Botão CONFIRMAR:**
- Visível diretamente no card — sem precisar abrir o pedido
- Bloqueado com tooltip "Aguardando pagamento" se status do pagamento for PENDENTE
- Só ativo quando pagamento = CONFIRMADO

**Ícone de pagamento:**
- 🔒 verde = Pago (CONFIRMADO)
- ⏳ cinza = Pendente
- ❌ vermelho = Expirado / Abandonado

**Badge de mensagem não lida:**
- Aparece no card quando há mensagem do cliente sem resposta
- Contador de mensagens não lidas
- Some quando operador abre a aba WhatsApp

**Timer:**
- Conta tempo desde criação do pedido no estágio atual
- Muda de cor conforme SLA (ver seção 6)

### Status e cores

| Status | Cor | Significado operacional |
|---|---|---|
| Aguardando Aprovação | Laranja | Pedido novo, pagamento confirmado, aguarda operador |
| Em Preparo | Azul | Enviado para cozinha |
| Aguardando Entregador | Amarelo | Prato pronto, aguarda motoboy |
| Em Rota | Verde | Saiu para entrega |
| Entregue | Cinza | Finalizado |
| Cancelado | Vermelho | Cancelado com motivo registrado |

### Ordenação padrão
1. Aguardando Aprovação (mais urgente primeiro)
2. SLA em alerta vermelho
3. SLA em alerta amarelo
4. Restantes por ordem de chegada

---

## 3. Aba Pedido

### Campos
- Tipo: `Entrega` / `Retirada na Loja`
- Flow visual de status — linha do tempo clicável para avançar estágio
- Lista de itens: quantidade · nome · valor unitário
- Subtotal · Taxa de entrega · **Total**
- Forma de pagamento + status do pagamento
- Observações do cliente

### Alerta de bebidas
```
Se o pedido contiver item da categoria BEBIDA:
→ Exibir banner amarelo:
  "⚠️ Não esqueça as bebidas"
```

### Toggle impressão de comanda
- Visível mas **desativado** no MVP
- Label: "Imprimir comanda (em breve)"
- Pronto para ativar quando chegar a impressora térmica

---

## 4. Aba Entrega *(segunda aba — mais acessada que Clientes)*

- Tipo: Delivery / Retirada
- Endereço completo com **botão de edição rápida** inline
- Alerta se endereço diferente do histórico do cliente:
  `"⚠️ Endereço diferente do cadastro"`
- Bairro + taxa aplicada
- **Motoboy:** campo de busca/seleção com nome e telefone
- Status do motoboy: Disponível / Em rota / Indisponível
- Observação de entrega: portão, complemento, ponto de referência

---

## 5. Aba Cliente

- Nome, telefone, endereço principal, origem do cadastro
- Total de pedidos + valor total gasto
- Primeiro pedido · Último pedido
- Dia da semana que mais pede
- Produtos mais pedidos (top 3)

### Gatilho de follow-up
```
Se cliente sem pedir há ≥ X dias (configurável, padrão 15):
→ Badge no card da lista: "Sem pedir há 15 dias"
→ Na aba Cliente: botão "Chamar no WhatsApp"
→ Abre aba WhatsApp com mensagem pré-pronta para copiar
→ Envio é SEMPRE manual — operador decide se envia
```

### Lista negra
- Botão "Adicionar à lista negra" com motivo obrigatório
- Se cliente estiver na lista negra:
  → Banner vermelho no topo do pedido ao abrir
  → Alerta antes de confirmar: "⚠️ Cliente na lista negra: [motivo]"
  → Operador pode confirmar mesmo assim (decisão humana)

---

## 6. Aba WhatsApp

- Histórico completo de mensagens do cliente
- Mensagens automáticas do sistema com tag `[AUTO]` em cinza
- Campo de digitação + botão enviar
- Operador responde sem sair do cockpit

### Preparado para IA (não implementar agora)
```
Campo em cada mensagem no banco:
origem: HUMANO | SISTEMA | IA

A aba "IA" deve aparecer no cockpit como desativada:
label "Agente IA — em breve"
```

---

## 7. Aba Timeline

Log cronológico imutável de tudo que aconteceu no pedido.

Formato de cada entrada:
```
[timestamp] · [ator] · [ação]

Exemplos:
15:07 · Sistema    · Pedido criado
15:09 · Sistema    · Pagamento confirmado via InfinitePay
15:10 · Operador   · Status alterado para Em Preparo
15:10 · Sistema    · Mensagem automática enviada ao cliente
15:28 · Operador   · Motoboy atribuído: João Silva
15:45 · Sistema    · Mensagem automática "Em Rota" enviada
```

---

## 8. Mensagens Automáticas por Status

| Gatilho | Envia? | Mensagem |
|---|---|---|
| Pedido confirmado | ✅ Automático | "Olá [nome]! Seu pedido foi confirmado e já está sendo preparado. 🤠" |
| Em Preparo | ❌ Não notifica | — |
| Aguardando Entregador | ❌ Não notifica | — |
| Em Rota | ✅ Automático | "Seu pedido saiu para entrega. Em breve chegará aí! 🛵" |
| Entregue | ✅ Automático | "Pedido entregue! Bom apetite! Qualquer dúvida estamos aqui. 🤠" |
| Cancelado | ✅ Automático | "Infelizmente precisamos cancelar seu pedido: [motivo]. Se o pagamento já foi feito, nossa equipe vai tratar o estorno com você." |

**Todas as mensagens automáticas ficam registradas na Timeline com timestamp.**

---

## 9. SLA por Estágio

| Estágio | Alvo | Alerta amarelo | Alerta vermelho |
|---|---|---|---|
| Aguardando Aprovação | 2 min | 3 min | 5 min |
| Em Preparo | 20 min | 25 min | 35 min |
| Aguardando Entregador | 5 min | 8 min | 12 min |
| Em Rota | 40 min | 50 min | 60 min |

- **Alerta amarelo:** timer muda de cor no card
- **Alerta vermelho:** som de alerta + card pisca na lista até operador agir

---

## 10. Alertas Sonoros

| Evento | Som | Comportamento |
|---|---|---|
| Pedido novo | Sino (3x) | Toca uma vez ao chegar |
| Mensagem WhatsApp recebida | Notificação curta | Toca a cada mensagem nova |
| SLA alerta amarelo | Bip suave | Toca uma vez |
| SLA alerta vermelho | Bip repetido | Toca até operador agir |

**Importante:** sons devem funcionar com a aba em background.
Implementar com Web Audio API + Service Worker.

---

## 11. Criação de Pedido Manual

O operador escolhe o fluxo no início:

### Fluxo A — Pix (cliente vai pagar)
1. Operador preenche: nome, telefone, bairro, endereço, itens, observação
2. Sistema calcula taxa pelo bairro automaticamente
3. Sistema gera link de pagamento InfinitePay
4. Operador copia o link e envia para o cliente pelo WhatsApp
5. Pedido entra com status `AGUARDANDO_PAGAMENTO`
6. Webhook confirma → muda para `AGUARDANDO_APROVAÇÃO` normalmente

### Fluxo B — Dinheiro na entrega
1. Operador preenche os mesmos campos
2. Campo adicional: "Valor em dinheiro" (para o motoboy saber o troco)
3. Sistema cria pedido já com status `CONFIRMADO`
4. Pagamento registrado como: `Dinheiro · A receber na entrega`

---

## 12. Cancelamento — Fluxo Completo

### Quem pode cancelar
- **Operador:** pedidos normais — motivo obrigatório
- **Administrador:** qualquer pedido + casos de estorno

### Motivos (dropdown obrigatório)
- Produto acabou
- Cliente desistiu
- Fora da área de entrega
- Pagamento não confirmado
- Pedido duplicado
- Problema operacional

### Lógica de pagamento

```
Se pagamento PENDENTE ou EXPIRADO:
  → Cancela normalmente
  → Notifica cliente com motivo

Se pagamento CONFIRMADO:
  → Cancela
  → Seta flag: estorno_necessario = true
  → Exibe banner vermelho no pedido:
    "⚠️ Este pedido já foi pago.
     Resolva o estorno manualmente pela InfinitePay."
  → Botão visível para admin: [Marcar estorno realizado]
  → Notifica cliente com mensagem incluindo aviso de estorno
```

### Regra absoluta
**Cancelamento nunca apaga o pedido.**
Fica no histórico com: motivo · operador responsável · timestamp · status do pagamento.

---

## 13. Critério de Pronto

- [ ] Pedido novo aparece na lista em tempo real sem recarregar a página
- [ ] Botão CONFIRMAR bloqueado para pedidos com pagamento pendente
- [ ] Mudar para Em Rota dispara mensagem automática no WhatsApp
- [ ] Mudar para Confirmado dispara mensagem automática no WhatsApp
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

*Documento de task — não misturar com o planejamento geral.*
*Quando esta task estiver concluída, todos os critérios acima devem estar marcados.*
