# Checklist — Cockpit de Gestão · Rancho Comida Caseira

> Acompanhamento de implementação por seção. Marque cada item conforme concluído.
> Referência completa: [TASK_COCKPIT_RANCHO.md](./TASK_COCKPIT_RANCHO.md)

---

## Status Geral

| Seção | Progresso |
|---|---|
| 1. Top Bar | 0 / 5 |
| 2. Lista de Pedidos | 0 / 7 |
| 3. Aba Pedido | 0 / 4 |
| 4. Aba Entrega | 0 / 5 |
| 5. Aba Cliente | 0 / 6 |
| 6. Aba WhatsApp | 0 / 4 |
| 7. Aba Timeline | 0 / 2 |
| 8. Mensagens Automáticas | 0 / 4 |
| 9. SLA | 0 / 3 |
| 10. Alertas Sonoros | 0 / 3 |
| 11. Pedido Manual | 0 / 5 |
| 12. Cancelamento | 0 / 6 |
| 13. Critério de Pronto | 0 / 16 |

---

## 1. Top Bar

- [ ] Métricas em tempo real: **Aguardando Aprovação** (laranja, pisca quando > 0)
- [ ] Métricas em tempo real: **Em Preparo** (azul), **Aguardando Entregador** (amarelo), **Em Rota** (verde)
- [ ] Métricas em tempo real: **Entregues hoje** (cinza, acumulativo) e **Receita hoje** (verde)
- [ ] Botão com 3 estados: **Aberto / Fechado / Pausado** (pausado exibe mensagem configurável)
- [ ] Indicador WhatsApp: ponto verde "conectado" / vermelho "desconectado" no canto superior

---

## 2. Lista de Pedidos (painel esquerdo)

- [ ] Card compacto exibe: `#ID`, ícone de pagamento, timer, nome do cliente, bairro, itens, total, badge de mensagem
- [ ] **Botão CONFIRMAR** visível diretamente no card sem precisar abrir o pedido
- [ ] Botão CONFIRMAR bloqueado com tooltip quando pagamento = PENDENTE
- [ ] Ícone de pagamento: 🔒 verde (pago) · ⏳ cinza (pendente) · ❌ vermelho (expirado)
- [ ] Badge de mensagem não lida com contador; some ao abrir aba WhatsApp
- [ ] Timer contando desde criação no estágio atual, com mudança de cor por SLA
- [ ] Ordenação padrão: Aguardando Aprovação → SLA vermelho → SLA amarelo → ordem de chegada

---

## 3. Aba Pedido

- [ ] Tipo do pedido: Entrega / Retirada na Loja
- [ ] Flow visual de status (linha do tempo clicável para avançar estágio)
- [ ] Lista de itens com quantidade, nome, valor unitário, subtotal, taxa e total
- [ ] Forma de pagamento + status do pagamento + observações do cliente
- [ ] Banner amarelo "⚠️ Não esqueça as bebidas" quando pedido contém item da categoria BEBIDA
- [ ] Toggle "Imprimir comanda" visível e desativado com label "em breve"

---

## 4. Aba Entrega

- [ ] Tipo: Delivery / Retirada
- [ ] Endereço completo com botão de edição rápida inline
- [ ] Alerta "⚠️ Endereço diferente do cadastro" quando endereço difere do histórico
- [ ] Campo de seleção de motoboy com nome, telefone e status (Disponível / Em rota / Indisponível)
- [ ] Observação de entrega: portão, complemento, ponto de referência

---

## 5. Aba Cliente

- [ ] Dados do cliente: nome, telefone, endereço principal, origem do cadastro
- [ ] Estatísticas: total de pedidos, valor total gasto, primeiro e último pedido
- [ ] Dia da semana que mais pede + top 3 produtos mais pedidos
- [ ] Badge "Sem pedir há X dias" quando cliente inativo (padrão: 15 dias)
- [ ] Botão "Chamar no WhatsApp" com mensagem pré-pronta para copiar (envio manual)
- [ ] Botão "Adicionar à lista negra" com motivo obrigatório; alerta vermelho no pedido se cliente na lista

---

## 6. Aba WhatsApp

- [ ] Histórico completo de mensagens do cliente
- [ ] Mensagens automáticas com tag `[AUTO]` em cinza
- [ ] Campo de digitação + botão enviar (operador responde sem sair do cockpit)
- [ ] Aba **IA** visível e desativada com label "Agente IA — em breve"

---

## 7. Aba Timeline

- [ ] Log cronológico imutável com formato `[timestamp] · [ator] · [ação]`
- [ ] Todas as ações (criação, pagamento, mudanças de status, mensagens, motoboy) registradas com timestamp e ator

---

## 8. Mensagens Automáticas por Status

- [ ] **Pedido confirmado** → mensagem automática enviada ao cliente via WhatsApp
- [ ] **Em Rota** → mensagem automática enviada ao cliente
- [ ] **Entregue** → mensagem automática enviada ao cliente
- [ ] **Cancelado** → mensagem automática com motivo (inclui aviso de estorno se pagamento confirmado)
- [ ] Todas as mensagens registradas na Timeline com timestamp

---

## 9. SLA por Estágio

- [ ] Tabela de SLA configurada: Aprovação (2/3/5 min), Preparo (20/25/35 min), Aguard. Entregador (5/8/12 min), Em Rota (40/50/60 min)
- [ ] Alerta amarelo: timer muda de cor no card
- [ ] Alerta vermelho: som de alerta + card pisca na lista até operador agir

---

## 10. Alertas Sonoros

- [ ] Sino (3x) ao chegar pedido novo — funciona com aba em background (Web Audio API + Service Worker)
- [ ] Notificação curta a cada mensagem WhatsApp recebida
- [ ] Bip suave no SLA amarelo; bip repetido no SLA vermelho até operador agir

---

## 11. Criação de Pedido Manual

- [ ] Formulário: nome, telefone, bairro, endereço, itens, observação
- [ ] Cálculo automático da taxa pelo bairro
- [ ] **Fluxo A (Pix):** gera link InfinitePay → pedido entra como `AGUARDANDO_PAGAMENTO` → webhook confirma
- [ ] **Fluxo B (Dinheiro):** campo "Valor em dinheiro" → pedido criado já como `CONFIRMADO`
- [ ] Pagamento do Fluxo B registrado como "Dinheiro · A receber na entrega"

---

## 12. Cancelamento

- [ ] Operador cancela pedidos normais com motivo obrigatório (dropdown com 6 opções)
- [ ] Administrador pode cancelar qualquer pedido + tratar estornos
- [ ] Pagamento PENDENTE/EXPIRADO: cancela normalmente e notifica cliente
- [ ] Pagamento CONFIRMADO: seta `estorno_necessario = true` + banner vermelho + botão "Marcar estorno realizado" (admin)
- [ ] Mensagem automática ao cliente inclui aviso de estorno quando aplicável
- [ ] Cancelamento nunca apaga o pedido (histórico com motivo, operador, timestamp, status pagamento)

---

## 13. Critério de Pronto ✅

- [ ] Pedido novo aparece na lista em tempo real sem recarregar a página
- [ ] Botão CONFIRMAR bloqueado para pedidos com pagamento pendente
- [ ] Mudar para **Confirmado** dispara mensagem automática no WhatsApp
- [ ] Mudar para **Em Rota** dispara mensagem automática no WhatsApp
- [ ] Mudar para **Entregue** dispara mensagem automática no WhatsApp
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

*Última atualização: 2026-05-01*
*Este checklist é gerado a partir de [TASK_COCKPIT_RANCHO.md](./TASK_COCKPIT_RANCHO.md) — qualquer mudança na spec deve refletir aqui.*
