# Integracao Asaas - Rancho

## Status

- **Status atual:** legado (nao utilizado em runtime)
- **Motivo:** substituido por InfinitePay
- **Doc oficial ativo:** `docs/integracoes/INTEGRACAO_INFINITEPAY.md`

> Este arquivo foi mantido apenas para historico de decisao e referencia.

---

## 📋 Visão Geral

O Asaas é o gateway de pagamento utilizado para processar os pagamentos dos pedidos. A integração segue o fluxo:

```
Cliente faz pedido → Sistema cria cobrança no Asaas → Cliente paga → 
Asaas notifica via webhook → Sistema confirma pedido → Notifica dono
```

---

## 🔧 Configuração

### Variáveis de Ambiente

```env
# API Asaas
ASAAS_API_KEY=sua_api_key_aqui
ASAAS_API_URL=https://api.asaas.com/v3  # Produção
# ASAAS_API_URL=https://sandbox.asaas.com/api/v3  # Sandbox

# Webhook
ASAAS_WEBHOOK_TOKEN=seu_webhook_token_aqui
```

### Obter Credenciais

1. **API Key:**
   - Acesse: https://www.asaas.com/config/api
   - Copie sua API Key
   - Cole em `ASAAS_API_KEY`

2. **Webhook Token:**
   - Acesse: https://www.asaas.com/config/webhooks
   - Configure URL: `https://seudominio.com.br/webhook/asaas`
   - Copie o token gerado
   - Cole em `ASAAS_WEBHOOK_TOKEN`

---

## 🔄 Fluxo Completo

### 1. Cliente Cria Pedido

**Endpoint:** `POST /api/pedidos`

```json
{
  "cliente": {
    "telefone": "5562999887766",
    "nome": "João Silva",
    "endereco": "Rua das Flores, 123",
    "bairro": "Setor Bueno"
  },
  "itens": [
    {
      "produtoId": "cmojjn1cq0005hldnrsyvnhpd",
      "quantidade": 2
    }
  ]
}
```

**O que acontece:**
1. Sistema valida bairro e produtos
2. Calcula subtotal e total
3. Cria pedido no banco (status: PENDENTE)
4. Cria/busca cliente no Asaas
5. Cria cobrança no Asaas (PIX)
6. Retorna link de pagamento

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "cmojkvik50002ip5e1c3dackp",
    "total": "55.8",
    "status": "PENDENTE",
    "pagamentoId": "pay_abc123",
    "linkPagamento": "https://www.asaas.com/i/abc123",
    "pixQrCode": "00020126580014br.gov.bcb.pix..."
  }
}
```

### 2. Cliente Paga

- Cliente acessa `linkPagamento`
- Escolhe forma de pagamento (PIX, Cartão, Boleto)
- Realiza pagamento
- Asaas processa pagamento

### 3. Asaas Notifica Sistema

**Endpoint:** `POST /webhook/asaas`

**Payload do Asaas:**
```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_abc123",
    "status": "CONFIRMED",
    "value": 55.8,
    "netValue": 54.2,
    "paymentDate": "2026-04-29",
    "externalReference": "cmojkvik50002ip5e1c3dackp"
  }
}
```

**O que acontece:**
1. Sistema valida token do webhook
2. Busca detalhes do pagamento no Asaas
3. Atualiza status do pedido (PENDENTE → CONFIRMADO)
4. Envia notificação WhatsApp para o dono

---

## 🎯 Eventos do Webhook

| Evento | Descrição | Ação do Sistema |
|--------|-----------|-----------------|
| `PAYMENT_CONFIRMED` | Pagamento confirmado | Atualiza pedido para CONFIRMADO |
| `PAYMENT_RECEIVED` | Pagamento recebido | Atualiza pedido para CONFIRMADO |
| `PAYMENT_OVERDUE` | Pagamento vencido | Log de aviso |
| `PAYMENT_DELETED` | Pagamento cancelado | Atualiza pedido para CANCELADO |
| `PAYMENT_REFUNDED` | Pagamento estornado | Log de auditoria |

---

## 🔒 Segurança

### Validação do Webhook

O sistema valida o token enviado pelo Asaas no header:

```typescript
const token = req.headers['asaas-access-token'];
if (!asaasService.validarWebhook(token)) {
  return res.status(401).json({ error: 'Token inválido' });
}
```

### Boas Práticas

1. **Sempre validar token do webhook**
2. **Usar HTTPS em produção**
3. **Não expor API Key no código**
4. **Retornar HTTP 200 mesmo com erro** (evita reenvio)
5. **Logar todos os eventos para auditoria**

---

## 🧪 Testes

### Ambiente Sandbox

Para testar sem cobranças reais:

```env
ASAAS_API_URL=https://sandbox.asaas.com/api/v3
```

### Simular Webhook

```bash
curl -X POST http://localhost:3001/webhook/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: SEU_WEBHOOK_TOKEN" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test123",
      "status": "CONFIRMED",
      "value": 55.8,
      "externalReference": "ID_DO_PEDIDO"
    }
  }'
```

### Testar Criação de Pedido

```bash
curl -X POST http://localhost:3001/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "telefone": "5562999887766",
      "nome": "João Silva",
      "endereco": "Rua Teste, 123",
      "bairro": "Setor Bueno"
    },
    "itens": [
      {
        "produtoId": "cmojjn1cq0005hldnrsyvnhpd",
        "quantidade": 1
      }
    ]
  }'
```

---

## 📊 Monitoramento

### Logs Importantes

```typescript
// Cobrança criada
logger.info(`Cobrança Asaas criada: ${cobrancaId} - Valor: R$ ${valor}`);

// Webhook recebido
logger.info(`Webhook Asaas recebido: ${event} - Pagamento: ${paymentId}`);

// Pedido confirmado
logger.info(`Pedido ${pedidoId} confirmado via webhook Asaas`);
```

### Verificar Logs

```bash
# Ver logs em tempo real
tail -f apps/backend/logs/combined.log

# Filtrar webhooks
grep "Webhook Asaas" apps/backend/logs/combined.log
```

---

## 🐛 Troubleshooting

### Webhook não está sendo recebido

1. Verificar URL configurada no Asaas
2. Verificar se servidor está acessível publicamente
3. Verificar logs do Asaas (painel web)
4. Testar endpoint manualmente

### Cobrança não está sendo criada

1. Verificar API Key
2. Verificar se está usando URL correta (sandbox/produção)
3. Ver logs de erro: `apps/backend/logs/error.log`
4. Verificar saldo/limites da conta Asaas

### Pedido não atualiza após pagamento

1. Verificar se webhook está configurado
2. Verificar token do webhook
3. Verificar campo `externalReference` na cobrança
4. Ver logs do webhook

---

## 📚 Referências

- [Documentação Asaas](https://docs.asaas.com)
- [API Reference](https://docs.asaas.com/reference)
- [Webhooks](https://docs.asaas.com/docs/webhooks)
- [Sandbox](https://sandbox.asaas.com)

---

**Versão:** 0.4.0  
**Última atualização:** 29/04/2026
