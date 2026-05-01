# Modelo de Dados, Eventos e Alertas — Central de Decisoes

**Data:** 2026-05-01  
**Demanda:** Central de Decisoes para Operacao de Delivery  
**Fase:** Planejamento pre-implementacao  

---

## 1. Objetivo

Definir a fundacao de dados necessaria para transformar pedidos, mensagens, pagamentos e falhas operacionais em uma fila priorizada de decisoes.

O objetivo nao e criar um modelo complexo demais. O objetivo e criar o minimo de estrutura persistente para que o sistema consiga:

- Detectar risco.
- Evitar duplicidade de alerta.
- Exibir a proxima acao.
- Registrar resolucao.
- Auditar o que aconteceu.

---

## 2. Estado atual aproveitavel

O schema atual ja possui:

- `Pedido.status`
- `Pedido.statusPagamento`
- `Pedido.statusMudouEm`
- `Pedido.estornoNecessario`
- `Pedido.estornoRealizadoEm`
- `PedidoTimeline`
- `MensagemCliente`
- `Motoboy`

Essas entidades devem ser reaproveitadas. A Central de Decisoes deve adicionar camada operacional, nao duplicar pedido ou mensagem.

---

## 3. Nova entidade principal: AlertaOperacional

Nome recomendado no Prisma:

```prisma
model AlertaOperacional {
  id              String            @id @default(cuid())
  tipo            TipoAlertaOperacional
  severidade      SeveridadeAlerta
  status          StatusAlerta      @default(ABERTO)
  pedidoId        String?           @map("pedido_id")
  clienteTelefone String?           @map("cliente_telefone") @db.VarChar(20)
  titulo          String            @db.VarChar(120)
  descricao       String            @db.Text
  motivo          String            @db.Text
  proximaAcao     AcaoRecomendada   @map("proxima_acao")
  acaoPayload     Json?             @map("acao_payload")
  dedupeKey       String            @unique @map("dedupe_key") @db.VarChar(180)
  detectadoEm     DateTime          @default(now()) @map("detectado_em")
  resolvidoEm     DateTime?         @map("resolvido_em")
  resolvidoPor    String?           @map("resolvido_por") @db.VarChar(80)
  resolucaoMotivo String?           @map("resolucao_motivo") @db.Text
  criadoEm        DateTime          @default(now()) @map("criado_em")
  atualizadoEm    DateTime          @updatedAt @map("atualizado_em")

  pedido          Pedido?           @relation(fields: [pedidoId], references: [id], onDelete: Cascade)
  cliente         Cliente?          @relation(fields: [clienteTelefone], references: [telefone], onDelete: SetNull)

  @@map("alertas_operacionais")
  @@index([status, severidade, detectadoEm])
  @@index([pedidoId])
  @@index([clienteTelefone])
  @@index([tipo])
}
```

---

## 4. Enums recomendados

```prisma
enum TipoAlertaOperacional {
  PEDIDO_PAGO_SEM_CONFIRMACAO
  CLIENTE_SEM_RESPOSTA
  PREPARO_ATRASADO
  PEDIDO_SEM_ENTREGADOR
  ESTORNO_NECESSARIO
  WHATSAPP_INDISPONIVEL
  FALHA_ENVIO_WHATSAPP
  ENDERECO_DUVIDOSO
}

enum SeveridadeAlerta {
  INFO
  ATENCAO
  CRITICO
}

enum StatusAlerta {
  ABERTO
  EM_TRATAMENTO
  RESOLVIDO
  IGNORADO
}

enum AcaoRecomendada {
  CONFIRMAR_PEDIDO
  RESPONDER_CLIENTE
  VERIFICAR_COZINHA
  ATRIBUIR_ENTREGADOR
  MARCAR_ESTORNO
  RECONECTAR_WHATSAPP
  REVISAR_ENDERECO
  ACOMPANHAR
}
```

---

## 5. Deduplicacao

Cada alerta precisa de uma chave de deduplicacao para evitar criar o mesmo problema repetidas vezes.

Formato recomendado:

| Tipo | `dedupeKey` |
|---|---|
| Pedido pago sem confirmacao | `PEDIDO_PAGO_SEM_CONFIRMACAO:{pedidoId}` |
| Cliente sem resposta | `CLIENTE_SEM_RESPOSTA:{clienteTelefone}:{pedidoId || GLOBAL}` |
| Preparo atrasado | `PREPARO_ATRASADO:{pedidoId}:{statusMudouEm}` |
| Pedido sem entregador | `PEDIDO_SEM_ENTREGADOR:{pedidoId}` |
| Estorno necessario | `ESTORNO_NECESSARIO:{pedidoId}` |
| WhatsApp indisponivel | `WHATSAPP_INDISPONIVEL:GLOBAL` |

Quando a causa deixa de existir, o alerta deve ser resolvido automaticamente ou marcado como resolvido pelo sistema, dependendo do tipo.

---

## 6. Regras de ciclo de vida

### Criacao

Um alerta deve ser criado quando uma regra operacional detectar risco e nao houver alerta aberto com a mesma `dedupeKey`.

### Atualizacao

Se o alerta ja existir aberto, o service pode atualizar:

- `severidade`
- `descricao`
- `motivo`
- `acaoPayload`
- `atualizadoEm`

### Resolucao automatica

Pode ser resolvido automaticamente quando:

- Pedido pago sem confirmacao foi confirmado.
- Cliente sem resposta teve mensagem do operador enviada ou mensagens foram marcadas como lidas.
- Estorno foi marcado como realizado.
- WhatsApp reconectou.
- Pedido saiu do status que causava atraso.

### Resolucao manual

Deve pedir motivo quando:

- Operador ignora alerta critico.
- Operador marca problema como resolvido sem executar acao principal.
- Alerta envolve dinheiro, cancelamento ou estorno.

---

## 7. Eventos operacionais

O sistema atual tem `PedidoTimeline`, mas ela e textual. Para o MVP, e aceitavel manter timeline textual e criar alertas estruturados. Em uma fase futura, recomenda-se uma tabela de eventos estruturados.

### Eventos do MVP

| Evento | Origem | Efeito |
|---|---|---|
| `PEDIDO_CRIADO` | checkout/admin manual | timeline, possivel decisao futura |
| `PAGAMENTO_CONFIRMADO` | webhook/gateway | resolve pendencia financeira, pode criar alerta de confirmacao |
| `STATUS_ALTERADO` | operador/sistema | atualiza `statusMudouEm`, timeline, resolve alertas relacionados |
| `MENSAGEM_CLIENTE_RECEBIDA` | webhook WhatsApp | cria/atualiza alerta cliente sem resposta |
| `MENSAGEM_OPERADOR_ENVIADA` | admin | resolve alerta cliente sem resposta |
| `SLA_ATINGIDO` | job/motor de alertas | cria alerta de atraso |
| `MOTOBOY_ATRIBUIDO` | admin | resolve alerta sem entregador |
| `ESTORNO_MARCADO` | admin | resolve alerta de estorno |
| `WHATSAPP_FALHOU` | service WhatsApp | cria alerta global |

---

## 8. Motor de alertas

Service recomendado:

```ts
decisaoService.avaliarPedido(pedidoId)
decisaoService.avaliarMensagensCliente(clienteTelefone, pedidoId?)
decisaoService.avaliarWhatsApp()
decisaoService.recalcularAbertos()
decisaoService.resolverAlerta(id, input)
```

### Gatilhos recomendados

- Apos `pedidoService.confirmarPagamento`.
- Apos `pedidoService.atualizarStatusAdmin`.
- Apos `clienteService.registrarMensagemRecebida`.
- Apos `clienteService.enviarMensagemHumana`.
- Job periodico a cada 60 segundos para SLA.
- Ao consultar status do WhatsApp.

---

## 9. SLA inicial do MVP

Valores iniciais configuraveis em codigo ou tabela simples:

| Condicao | Atencao | Critico |
|---|---:|---:|
| Pago sem confirmacao | 60s | 120s |
| Cliente sem resposta | 120s | 300s |
| Preparo | 25min | 35min |
| Sem entregador/despacho | 5min | 8min |
| Em rota | 50min | 60min |

Em uma fase posterior, esses SLAs devem ser configuraveis por dia/horario/produto/bairro.

---

## 10. Relacao com timeline

Todo alerta critico deve gerar um registro de timeline quando houver `pedidoId`.

Formato textual inicial:

- `Alerta criado: pedido pago sem confirmacao`
- `Alerta resolvido: pedido confirmado`
- `Alerta criado: cliente sem resposta ha 4 min`
- `Alerta resolvido: operador respondeu cliente`

Ator recomendado:

- `SISTEMA` para criacao automatica.
- `OPERADOR` para resolucao manual.

---

## 11. Eventos tempo real

Eventos SSE recomendados:

```ts
type DecisaoRealtimeEvent =
  | 'decisao:nova'
  | 'decisao:atualizada'
  | 'decisao:resolvida'
  | 'decisao:metricas';
```

Payload minimo:

```ts
{
  id: string;
  tipo: string;
  severidade: 'INFO' | 'ATENCAO' | 'CRITICO';
  status: 'ABERTO' | 'EM_TRATAMENTO' | 'RESOLVIDO' | 'IGNORADO';
  pedidoId?: string;
  clienteTelefone?: string;
}
```

---

## 12. Estrategia de migracao

1. Criar tabela `alertas_operacionais`.
2. Criar enums.
3. Criar service sem alterar comportamento atual do cockpit.
4. Adicionar geracao de alertas em pontos seguros do backend.
5. Expor APIs admin.
6. Criar tela nova consumindo a fila.
7. So depois decidir se a nova central substitui a tela atual de pedidos.

Essa abordagem reduz risco porque a Central nasce como camada adicional, sem quebrar o fluxo atual.
