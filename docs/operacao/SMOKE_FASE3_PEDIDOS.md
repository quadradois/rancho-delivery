# Smoke Test — Fase 3 (Pedidos)

Script de validação rápida pós-deploy para os itens da Fase 3:
- Re-order (`POST /api/pedidos/reorder/:id`)
- Acompanhamento em tempo real SSE (`GET /api/pedidos/:id/eventos`)
- NPS (`POST /api/pedidos/:id/nps`)

## Pré-requisitos
- Backend disponível e apontando para banco válido.
- `pnpm`, `node` e `curl` instalados.
- Pelo menos 1 `produto` ativo e 1 `bairro` ativo no banco.

## Execução
Na raiz do repositório:

```bash
BASE_URL=http://127.0.0.1:3001 bash scripts/smoke-fase3.sh
```

## Variáveis opcionais
- `BASE_URL`: URL da API (default `http://127.0.0.1:3001`)
- `PRODUTO_ID`: força o produto do pedido de teste
- `BAIRRO_NOME`: força o bairro do pedido de teste
- `FORCE_ENTREGUE`: `true|false` (default `true`) para permitir validação positiva de NPS

## Critério de sucesso
O script finaliza com código `0` e imprime:
- `REORDER_CODE: 201`
- `SSE_SAMPLE` contendo `connected`
- `NPS_CODE: 200`
- `[OK] Smoke Fase 3 aprovado`

## Observações
- O script cria pedidos de smoke no banco.
- Se `FORCE_ENTREGUE=true`, o pedido de smoke é marcado como `ENTREGUE` para validar NPS.
- Se `tokenAcesso` não estiver disponível no pedido de teste, o script entra automaticamente em `admin_jwt_fallback` para concluir o smoke.
