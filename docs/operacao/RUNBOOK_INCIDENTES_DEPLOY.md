# RUNBOOK_INCIDENTES_DEPLOY

## Incidente 1 - Pagamento aprovado sem pedido confirmado

### Sintoma
- Gateway indica pagamento aprovado
- Pedido permanece `PENDENTE`

### Diagnostico
1. Validar se webhook chegou em `/webhook/infinitepay`
2. Validar assinatura (`INFINITEPAY_WEBHOOK_SECRET`)
3. Validar `order_nsu` recebido
4. Verificar log de excecao no `webhook.controller`

### Acao imediata
1. Reprocessar webhook manualmente com payload valido
2. Se necessario, atualizar status do pedido manualmente
3. Registrar causa raiz

## Incidente 2 - Pedido confirmado sem WhatsApp ao dono

### Sintoma
- Pedido `CONFIRMADO`
- Sem notificacao no numero do dono

### Diagnostico
1. Validar `WHATSAPP_DONO`
2. Validar `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE_NAME`
3. Confirmar conexao da instancia (`connectionState = open`)
4. Revisar logs do `evolution.service`

### Acao imediata
1. Reenviar notificacao manualmente
2. Restabelecer conexao da instancia
3. Monitorar proximos pedidos por 30 minutos

## Incidente 3 - Rollback de release

### Condicao de rollback
- Erro critico no checkout, pagamento ou webhook
- Taxa de erro acima do aceitavel

### Passos
1. Reverter versao no processo PM2 para build anterior estavel
2. Reiniciar servicos
3. Validar `/health`, criacao de pedido e webhook
4. Comunicar status ao time

## Checklist de encerramento de incidente

- Causa raiz identificada
- Correcao aplicada
- Evidencias coletadas
- Acao preventiva adicionada ao playbook
