# RUNBOOK_E2E_INFINITEPAY

**Objetivo:** validar ponta a ponta o fluxo `pedido -> pagamento -> webhook -> WhatsApp`.

## Pre-requisitos

- Backend e frontend em execucao
- Banco com produtos e bairros ativos
- `INFINITEPAY_HANDLE` e `INFINITEPAY_WEBHOOK_SECRET` configurados
- Evolution API conectada e `WHATSAPP_DONO` configurado

## Execucao

1. Criar pedido via frontend (ou API)
2. Confirmar retorno com `id` do pedido e `linkPagamento`
3. Realizar pagamento no link
4. Confirmar recebimento do webhook em `/webhook/infinitepay`
5. Validar pedido `CONFIRMADO`
6. Validar envio de mensagem ao dono

## Validacao por API

```bash
# 1) criar pedido
curl -X POST http://localhost:3001/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "telefone": "5562999887766",
      "nome": "Teste E2E",
      "endereco": "Rua Teste, 100",
      "bairro": "Setor Bueno"
    },
    "itens": [{ "produtoId": "ID_PRODUTO", "quantidade": 1 }]
  }'

# 2) simular webhook de aprovacao
curl -X POST http://localhost:3001/webhook/infinitepay \
  -H "Content-Type: application/json" \
  -H "x-infinitepay-signature: SEU_WEBHOOK_SECRET" \
  -d '{
    "event": "payment.approved",
    "order_nsu": "ID_DO_PEDIDO",
    "status": "APPROVED"
  }'

# 3) consultar pedido
curl http://localhost:3001/api/pedidos/ID_DO_PEDIDO
```

## Evidencias obrigatorias

- ID do pedido
- URL de pagamento retornada
- Trecho de log do webhook recebido
- Trecho de log da mudanca para `CONFIRMADO`
- Trecho de log da notificacao WhatsApp

## Resultado

- `PASS`: fluxo completo validado
- `FAIL`: registrar etapa exata de falha e abrir incidente
