# Contratos de API — Central de Decisoes

**Data:** 2026-05-01  
**Demanda:** Central de Decisoes para Operacao de Delivery  
**Fase:** Planejamento pre-implementacao  

---

## 1. Objetivo

Definir os contratos de API necessarios para o MVP da Central de Decisoes, mantendo compatibilidade com os endpoints admin existentes.

Todas as rotas devem ficar sob `/api/admin` e usar o middleware de autenticacao admin ja existente.

---

## 2. Padrao de resposta

Manter o padrao atual:

```json
{
  "success": true,
  "data": {}
}
```

Erro:

```json
{
  "success": false,
  "error": {
    "message": "Mensagem amigavel",
    "code": "CODIGO_ESTAVEL"
  }
}
```

---

## 3. GET /api/admin/decisoes

Lista a fila priorizada de decisoes operacionais.

### Query params

| Param | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `status` | string | nao | `ABERTO`, `EM_TRATAMENTO`, `RESOLVIDO`, `IGNORADO` |
| `severidade` | string | nao | `CRITICO`, `ATENCAO`, `INFO` |
| `tipo` | string | nao | Tipo do alerta |
| `busca` | string | nao | Pedido, telefone, cliente ou texto |
| `page` | number | nao | Pagina |
| `limit` | number | nao | Limite por pagina |

### Resposta

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "clx_alerta",
        "tipo": "PEDIDO_PAGO_SEM_CONFIRMACAO",
        "severidade": "CRITICO",
        "status": "ABERTO",
        "titulo": "Pedido pago aguardando confirmacao",
        "descricao": "Cliente pagou e o pedido ainda nao foi confirmado.",
        "motivo": "Pagamento confirmado ha 2 min e pedido segue em AGUARDANDO_PAGAMENTO.",
        "proximaAcao": "CONFIRMAR_PEDIDO",
        "tempoPendenteSegundos": 126,
        "detectadoEm": "2026-05-01T15:20:00.000Z",
        "pedido": {
          "id": "clx_pedido",
          "numero": "A1B2C3",
          "status": "AGUARDANDO_PAGAMENTO",
          "statusPagamento": "CONFIRMADO",
          "clienteNome": "Maria",
          "clienteTelefone": "5562999999999",
          "bairro": "Centro",
          "total": 74.9,
          "tempoNoEstagio": 126
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 30,
      "total": 1
    }
  }
}
```

### Ordenacao

1. `CRITICO`
2. `ATENCAO`
3. `INFO`
4. Maior `tempoPendenteSegundos`
5. Mais antigo em `detectadoEm`

---

## 4. GET /api/admin/decisoes/metricas

Retorna contadores da Central.

### Resposta

```json
{
  "success": true,
  "data": {
    "abertos": 8,
    "criticos": 3,
    "atencao": 5,
    "clientesSemResposta": 2,
    "pagosSemConfirmacao": 1,
    "preparoAtrasado": 2,
    "estornosPendentes": 1,
    "whatsappDisponivel": true
  }
}
```

---

## 5. GET /api/admin/decisoes/:id

Retorna detalhe de uma decisao operacional.

### Resposta

```json
{
  "success": true,
  "data": {
    "id": "clx_alerta",
    "tipo": "CLIENTE_SEM_RESPOSTA",
    "severidade": "ATENCAO",
    "status": "ABERTO",
    "titulo": "Cliente aguardando resposta",
    "descricao": "Mensagem humana nao lida ha mais de 2 minutos.",
    "motivo": "Ultima mensagem recebida ha 4 min.",
    "proximaAcao": "RESPONDER_CLIENTE",
    "acaoPayload": {
      "telefone": "5562999999999",
      "pedidoId": "clx_pedido"
    },
    "pedido": {},
    "timeline": []
  }
}
```

---

## 6. PATCH /api/admin/decisoes/:id/status

Atualiza o status do alerta.

### Body

```json
{
  "status": "EM_TRATAMENTO"
}
```

### Regras

- `ABERTO -> EM_TRATAMENTO` permitido.
- `ABERTO -> RESOLVIDO` permitido com ou sem motivo, dependendo do tipo.
- `ABERTO -> IGNORADO` exige `motivo`.
- `CRITICO -> IGNORADO` sempre exige `motivo`.
- Alertas resolvidos nao devem voltar para aberto manualmente.

### Resposta

```json
{
  "success": true,
  "data": {
    "id": "clx_alerta",
    "status": "EM_TRATAMENTO"
  }
}
```

---

## 7. PATCH /api/admin/decisoes/:id/resolver

Resolve ou ignora uma decisao.

### Body

```json
{
  "status": "RESOLVIDO",
  "motivo": "Pedido confirmado pelo operador"
}
```

### Resposta

```json
{
  "success": true,
  "data": {
    "id": "clx_alerta",
    "status": "RESOLVIDO",
    "resolvidoEm": "2026-05-01T15:25:00.000Z",
    "resolvidoPor": "adminrancho"
  }
}
```

---

## 8. POST /api/admin/decisoes/:id/executar

Executa a proxima acao recomendada quando ela for segura e conhecida.

### Body

```json
{
  "acao": "CONFIRMAR_PEDIDO",
  "payload": {
    "pedidoId": "clx_pedido"
  }
}
```

### Acoes MVP

| Acao | Comportamento |
|---|---|
| `CONFIRMAR_PEDIDO` | chama transicao para `CONFIRMADO` se pagamento estiver confirmado |
| `RESPONDER_CLIENTE` | retorna contexto para abrir aba WhatsApp, nao envia sozinho |
| `ATRIBUIR_ENTREGADOR` | retorna contexto para painel de entrega, nao escolhe motoboy sozinho |
| `MARCAR_ESTORNO` | chama endpoint de estorno existente com confirmacao previa no frontend |
| `RECONECTAR_WHATSAPP` | chama fluxo existente de setup/status quando aplicavel |

### Observacao

O MVP pode adiar esse endpoint e executar acoes diretamente pelo frontend usando APIs existentes. A vantagem do endpoint central e registrar auditoria uniforme.

---

## 9. POST /api/admin/decisoes/recalcular

Forca recalculo de alertas.

Uso:

- Botao admin de manutencao.
- Testes operacionais.
- Reprocessamento apos deploy.

### Body

```json
{
  "escopo": "ABERTOS"
}
```

Valores:

- `ABERTOS`
- `TODOS_ATIVOS`
- `PEDIDO`

Quando `escopo = PEDIDO`:

```json
{
  "escopo": "PEDIDO",
  "pedidoId": "clx_pedido"
}
```

### Resposta

```json
{
  "success": true,
  "data": {
    "avaliados": 42,
    "criados": 3,
    "atualizados": 2,
    "resolvidos": 5
  }
}
```

---

## 10. GET /api/admin/pedidos/:id/operacao

Retorna o pedido como caso operacional, agregando dados ja existentes e alertas abertos.

### Resposta

```json
{
  "success": true,
  "data": {
    "pedido": {
      "id": "clx_pedido",
      "numero": "A1B2C3",
      "status": "PREPARANDO",
      "statusPagamento": "CONFIRMADO",
      "tempoNoEstagio": 1800,
      "cliente": {},
      "itens": [],
      "motoboy": null
    },
    "risco": {
      "severidadeMaxima": "ATENCAO",
      "alertasAbertos": 1,
      "proximaAcao": "VERIFICAR_COZINHA"
    },
    "alertas": [],
    "timeline": []
  }
}
```

---

## 11. Eventos SSE

Estender o contrato atual de tempo real.

### decisao:nova

```json
{
  "type": "decisao:nova",
  "data": {
    "id": "clx_alerta",
    "tipo": "PEDIDO_PAGO_SEM_CONFIRMACAO",
    "severidade": "CRITICO",
    "pedidoId": "clx_pedido"
  }
}
```

### decisao:atualizada

```json
{
  "type": "decisao:atualizada",
  "data": {
    "id": "clx_alerta",
    "severidade": "CRITICO",
    "status": "ABERTO"
  }
}
```

### decisao:resolvida

```json
{
  "type": "decisao:resolvida",
  "data": {
    "id": "clx_alerta",
    "status": "RESOLVIDO",
    "pedidoId": "clx_pedido"
  }
}
```

---

## 12. Codigos de erro

| Codigo | HTTP | Quando |
|---|---:|---|
| `DECISAO_NAO_ENCONTRADA` | 404 | Alerta inexistente |
| `STATUS_DECISAO_INVALIDO` | 400 | Status fora do enum |
| `TRANSICAO_DECISAO_INVALIDA` | 400 | Tentativa de reabrir/resolver incorretamente |
| `MOTIVO_OBRIGATORIO` | 400 | Ignorar/resolver exige motivo |
| `ACAO_DECISAO_INVALIDA` | 400 | Acao nao compatível com alerta |
| `PEDIDO_NAO_ENCONTRADO` | 404 | Pedido vinculado nao existe |
| `DECISAO_JA_RESOLVIDA` | 409 | Acao em alerta resolvido |

---

## 13. Compatibilidade com APIs existentes

APIs atuais que devem ser reaproveitadas:

- `GET /api/admin/pedidos`
- `GET /api/admin/pedidos/:id`
- `PATCH /api/admin/pedidos/:id/status`
- `PATCH /api/admin/pedidos/:id/motoboy`
- `POST /api/admin/pedidos/:id/cancelar`
- `PATCH /api/admin/pedidos/:id/estorno`
- `GET /api/admin/metricas`
- `POST /api/admin/clientes/:telefone/mensagens`
- `GET /api/admin/whatsapp/status`

A Central deve orquestrar e priorizar. Ela nao precisa substituir todas as rotas existentes no MVP.
