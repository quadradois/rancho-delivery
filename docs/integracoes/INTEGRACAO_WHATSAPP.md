# Integracao WhatsApp (Evolution API) - Sabor Express

Documentacao da integracao com Evolution API para notificacoes via WhatsApp.

## Visao Geral

A Evolution API e utilizada para enviar notificacoes automaticas quando um pedido e confirmado.

Fluxo:

Pedido confirmado (webhook InfinitePay) -> sistema busca pedido completo -> formata mensagem -> envia via Evolution API -> dono recebe no WhatsApp.

## Configuracao

### Variaveis de ambiente (backend)

```env
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=<sua_api_key>
EVOLUTION_INSTANCE_NAME=sabor-express
WHATSAPP_DONO=5562999999999
```

## Fluxo operacional

1. Cliente cria pedido (`POST /api/pedidos`)
2. Backend gera link de pagamento (InfinitePay)
3. Cliente paga no link
4. InfinitePay chama `POST /webhook/infinitepay`
5. Backend confirma pedido e envia mensagem ao dono

## Testes

### Verificar conexao da instancia

```bash
curl http://localhost:8080/instance/connectionState/sabor-express \
  -H "apikey: SUA_API_KEY"
```

### Testar envio simples

```bash
curl -X POST http://localhost:8080/message/sendText/sabor-express \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_API_KEY" \
  -d '{
    "number": "5562999999999",
    "text": "Teste de mensagem do Sabor Express"
  }'
```

### Simular webhook InfinitePay

```bash
curl -X POST http://localhost:3001/webhook/infinitepay \
  -H "Content-Type: application/json" \
  -H "x-infinitepay-signature: SEU_WEBHOOK_SECRET" \
  -d '{
    "event": "payment.approved",
    "order_nsu": "ID_DO_PEDIDO_CRIADO",
    "status": "APPROVED"
  }'
```

## Troubleshooting rapido

- WhatsApp desconectado: reconectar instancia e escanear QR.
- Mensagem nao enviada: validar `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME` e `WHATSAPP_DONO`.
- Pedido confirmado sem mensagem: revisar logs do webhook e do `evolution.service.ts`.
