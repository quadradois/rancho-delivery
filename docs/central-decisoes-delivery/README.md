# Central de Decisoes Delivery

Esta pasta concentra todos os documentos da demanda **Central de Decisoes para Operacao de Delivery**.

O objetivo e manter a visao, especificacoes tecnicas, planos de execucao, auditorias e registros de decisao em um unico lugar, evitando dispersao entre `relatorios`, `planejamento` e outras areas de documentacao.

## Documentos

- [Plano Prioritario — Central de Decisoes para Operacao de Delivery](./2026-05-01_plano_central_decisoes_delivery.md)
- [MVP Tecnico — Central de Decisoes](./2026-05-01_mvp_tecnico_central_decisoes.md)
- [Modelo de Dados, Eventos e Alertas](./2026-05-01_modelo_dados_eventos_alertas.md)
- [Contratos de API — Central de Decisoes](./2026-05-01_contratos_api_central_decisoes.md)
- [Plano de Execucao — Fase 1 Antiesquecimento](./2026-05-01_plano_execucao_fase_1_antiesquecimento.md)

## Ordem recomendada de leitura

1. `2026-05-01_plano_central_decisoes_delivery.md`
2. `2026-05-01_mvp_tecnico_central_decisoes.md`
3. `2026-05-01_modelo_dados_eventos_alertas.md`
4. `2026-05-01_contratos_api_central_decisoes.md`
5. `2026-05-01_plano_execucao_fase_1_antiesquecimento.md`

## Decisao tecnica recomendada

Implementar a primeira versao como nova rota `/admin/decisoes`, mantendo `/admin/pedidos` funcionando em paralelo ate validarmos a Central em operacao real.
