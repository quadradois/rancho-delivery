# Integração WhatsApp (Evolution API) - Sabor Express

Documentação completa da integração com Evolution API para notificações via WhatsApp.

---

## 📋 Visão Geral

A Evolution API é utilizada para enviar notificações automáticas via WhatsApp quando um pedido é confirmado. O dono do restaurante recebe todos os detalhes do pedido instantaneamente.

```
Pedido confirmado (webhook Asaas) → Sistema busca pedido completo → 
Formata mensagem → Envia via Evolution API → Dono recebe no WhatsApp
```

---

## 🔧 Configuração

### 1. Subir Evolution API com Docker

Você já tem o `docker-compose.yml` configurado. Para iniciar:

```bash
# Criar arquivo .env na pasta da Evolution API
cd evolution-api
cp .env.example .env

# Editar .env com suas configurações
nano .env

# Subir containers
docker-compose up -d

# Verificar se está rodando
docker-compose ps
```

### 2. Configurar Instância WhatsApp

Acesse: `http://localhost:8080/manager` (se frontend estiver habilitado)

Ou use a API diretamente:

```bash
# Criar instância
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_API_KEY" \
  -d '{
    "instanceName": "sabor-express",
    "qrcode": true
  }'

# Conectar WhatsApp (vai retornar QR Code)
curl http://localhost:8080/instance/connect/sabor-express \
  -H "apikey: SUA_API_KEY"

# Escanear QR Code com WhatsApp do celular
# WhatsApp > Aparelhos conectados > Conectar aparelho
```

### 3. Configurar Variáveis no Backend

```env
# apps/backend/.env
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="sua_api_key_da_evolution"
EVOLUTION_INSTANCE_NAME="sabor-express"
WHATSAPP_DONO="5562999999999"
```

---

## 📱 Formato da Mensagem

Quando um pedido é confirmado, o dono recebe:

```
🟢 NOVO PEDIDO - Sabor Express

📋 Pedido: #vik50002

👤 Cliente: João Silva
📱 WhatsApp: +55 (62) 99988-7766
📍 Endereço: Rua das Flores, 123
🏘️ Bairro: Setor Bueno
💰 Taxa de Entrega: R$ 6.00

🍽️ Itens do Pedido:

• 2x Marmita Executiva - Frango Grelhado
  Obs: Sem cebola
  R$ 24.90 cada = R$ 49.80

💵 Subtotal: R$ 49.80
🚚 Taxa: R$ 6.00
✅ TOTAL: R$ 55.80

📝 Observação:
Entregar no portão principal

💳 Pagamento: CONFIRMADO
⏰ Horário: 29/04/2026 01:51:46
```

---

## 🔄 Fluxo Completo

### 1. Cliente Cria Pedido
```bash
POST /api/pedidos
```

### 2. Sistema Cria Cobrança Asaas
- Cliente recebe link de pagamento

### 3. Cliente Paga
- Asaas processa pagamento

### 4. Asaas Notifica Sistema
```bash
POST /webhook/asaas
```

### 5. Sistema Atualiza Pedido
- Status: PENDENTE → CONFIRMADO

### 6. Sistema Envia WhatsApp
- Busca pedido completo
- Formata mensagem
- Envia para WHATSAPP_DONO
- Dono recebe notificação instantânea

---

## 🧪 Testes

### Verificar Conexão WhatsApp

```bash
curl http://localhost:8080/instance/connectionState/sabor-express \
  -H "apikey: SUA_API_KEY"
```

**Resposta esperada:**
```json
{
  "state": "open"
}
```

### Testar Envio de Mensagem

```bash
curl -X POST http://localhost:8080/message/sendText/sabor-express \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_API_KEY" \
  -d '{
    "number": "5562999999999",
    "text": "Teste de mensagem do Sabor Express"
  }'
```

### Simular Pedido Completo

1. Criar pedido:
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
        "quantidade": 2
      }
    ]
  }'
```

2. Simular webhook Asaas:
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
      "externalReference": "ID_DO_PEDIDO_CRIADO"
    }
  }'
```

3. Verificar se mensagem foi enviada no WhatsApp do dono

---

## 📊 Monitoramento

### Logs Importantes

```typescript
// WhatsApp conectado
logger.info('WhatsApp conectado');

// Mensagem enviada
logger.info(`Mensagem WhatsApp enviada para ${numero}`);

// Notificação de pedido enviada
logger.info(`Notificação de pedido ${pedidoId} enviada para o dono`);

// Erro ao enviar
logger.error('Erro ao enviar mensagem WhatsApp:', error);
```

### Verificar Logs

```bash
# Ver logs em tempo real
tail -f apps/backend/logs/combined.log

# Filtrar notificações WhatsApp
grep "WhatsApp" apps/backend/logs/combined.log
```

---

## 🐛 Troubleshooting

### WhatsApp desconectado

**Problema:** Mensagens não estão sendo enviadas

**Solução:**
1. Verificar conexão:
```bash
curl http://localhost:8080/instance/connectionState/sabor-express \
  -H "apikey: SUA_API_KEY"
```

2. Se desconectado, reconectar:
```bash
curl http://localhost:8080/instance/connect/sabor-express \
  -H "apikey: SUA_API_KEY"
```

3. Escanear novo QR Code

### Evolution API não responde

**Problema:** Erro ao conectar com Evolution API

**Solução:**
1. Verificar se containers estão rodando:
```bash
docker-compose ps
```

2. Ver logs da Evolution API:
```bash
docker-compose logs -f api
```

3. Reiniciar containers:
```bash
docker-compose restart
```

### Mensagem não chega

**Problema:** Sistema envia mas dono não recebe

**Solução:**
1. Verificar número do dono em `.env`
2. Formato correto: `5562999999999` (sem espaços ou caracteres especiais)
3. Testar envio manual via curl
4. Verificar se WhatsApp do dono está ativo

### API Key inválida

**Problema:** Erro 401 Unauthorized

**Solução:**
1. Verificar `EVOLUTION_API_KEY` no `.env`
2. Gerar nova API key na Evolution API
3. Atualizar `.env` e reiniciar backend

---

## 🔒 Segurança

### Boas Práticas

1. **Não expor API Key** - Manter em `.env`
2. **Usar HTTPS em produção**
3. **Limitar acesso à Evolution API** - Firewall/VPN
4. **Monitorar logs** - Detectar uso indevido
5. **Backup da instância** - Não perder conexão WhatsApp

### Proteção da Instância

```yaml
# docker-compose.yml
ports:
  - "127.0.0.1:8080:8080"  # Apenas localhost
```

---

## 📚 Referências

- [Evolution API Docs](https://doc.evolution-api.com)
- [GitHub Evolution API](https://github.com/EvolutionAPI/evolution-api)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

---

## 🎯 Próximos Passos

Com WhatsApp integrado, o backend da Fase 1 está **100% completo**!

Próximas implementações:
1. **Frontend** - Cardápio com feed vertical
2. **Carrinho** - Sistema de compras
3. **Checkout** - Integração com backend

---

**Versão:** 0.5.0  
**Última atualização:** 29/04/2026
