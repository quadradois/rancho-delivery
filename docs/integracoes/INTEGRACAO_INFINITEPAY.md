# Integracao InfinitePay - Sabor Express

## Status

- **Status atual:** ativo em runtime
- **Gateway oficial:** InfinitePay
- **Webhook oficial:** `POST /webhook/infinitepay`

## Variaveis de ambiente

```env
INFINITEPAY_HANDLE=orancho-comida
INFINITEPAY_WEBHOOK_SECRET=<secret_forte>
FRONTEND_URL=https://rancho.delivery
```

## Fluxo oficial

1. Frontend cria pedido em `POST /api/pedidos`
2. Backend cria pedido `PENDENTE` e gera `linkPagamento`
3. Cliente paga no link da InfinitePay
4. InfinitePay chama `POST /webhook/infinitepay`
5. Backend valida assinatura, confirma pedido e notifica WhatsApp

## Payload esperado do webhook

```json
{
  "event": "payment.approved",
  "order_nsu": "ID_DO_PEDIDO",
  "status": "APPROVED"
}
```

## Headers aceitos para assinatura

- `x-infinitepay-signature`
- `authorization`
- `x-webhook-secret`

## Regras de processamento

- Processar apenas eventos aprovados
- Idempotencia: se pedido ja estiver `CONFIRMADO`, ignorar reprocesamento
- Sempre responder `200` em erros internos para evitar loop de reenvio

## Teste rapido local

```bash
curl -X POST http://localhost:3001/webhook/infinitepay \
  -H "Content-Type: application/json" \
  -H "x-infinitepay-signature: SEU_SECRET" \
  -d '{
    "event": "payment.approved",
    "order_nsu": "ID_DO_PEDIDO",
    "status": "APPROVED"
  }'
```

## Evidencia minima para homologacao

- ID do pedido criado
- URL de pagamento gerada
- Log de webhook recebido
- Log de status alterado para `CONFIRMADO`
- Log de notificacao WhatsApp
