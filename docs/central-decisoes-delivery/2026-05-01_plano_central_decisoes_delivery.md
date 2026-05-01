# Plano Prioritario — Central de Decisoes para Operacao de Delivery

**Data:** 2026-05-01  
**Contexto:** Rancho Comida Caseira — operacao com alta demanda de pedidos  
**Objetivo:** desenhar a central ideal para reduzir gargalos, pedidos esquecidos, falhas de atendimento, atraso operacional e perda de clientes.  
**Premissa:** este documento e planejamento. Nenhuma implementacao foi feita a partir dele.

---

## Visao de dono

Uma central perfeita para delivery nao deve ser apenas um dashboard bonito. Ela precisa funcionar como uma torre de controle operacional.

Em pico de demanda, o dono nao quer "ver dados". Ele quer responder rapidamente:

1. Qual pedido esta em risco agora?
2. Qual cliente esta esperando resposta?
3. Onde a operacao esta travando?
4. O que precisa ser decidido nos proximos 2 minutos?
5. Que acao evita prejuizo, atraso ou reclamacao?

A central ideal deve transformar volume em prioridade. Ela deve trocar listas passivas por uma fila viva de decisoes.

---

## Principio central

**A tela principal nao deve perguntar "o que voce quer ver?". Ela deve dizer "o que exige sua atencao agora".**

Toda informacao exibida deve ter uma dessas finalidades:

- Acelerar uma decisao.
- Evitar que um pedido seja esquecido.
- Evitar que um cliente fique sem resposta.
- Antecipar um atraso.
- Reduzir erro humano em etapa repetitiva.
- Dar ao dono visao clara da capacidade real da operacao.

---

## Prioridade 1 — Fila de Decisoes Operacionais

### Problema que resolve

Em alta demanda, pedidos normais e pedidos problematicos ficam misturados. O operador precisa procurar problemas manualmente. Isso causa esquecimento, atraso, retrabalho e cliente sem retorno.

### Solucao imaginada

Criar uma fila principal chamada **Fila de Decisoes**, ordenada por risco operacional, nao apenas por horario.

Ela deve destacar automaticamente:

- Pedido novo aguardando confirmacao.
- Pagamento pendente ha tempo demais.
- Pedido confirmado que ainda nao entrou em preparo.
- Pedido em preparo acima do SLA.
- Pedido pronto sem entregador.
- Pedido em rota atrasado.
- Cliente mandou mensagem e ninguem respondeu.
- Pedido cancelado que exige estorno.
- Pedido com endereco duvidoso.
- Pedido com item critico, exemplo: bebida, sobremesa, observacao especial.

### Comportamento esperado

Cada item da fila deve ter:

- Nivel de urgencia: normal, atencao, critico.
- Motivo claro: "cliente sem resposta ha 4 min", "preparo passou 8 min do SLA".
- Proxima acao recomendada: confirmar, responder, chamar entregador, pausar item, cancelar, estornar.
- Botao de acao direta.
- Responsavel atual: sistema, cozinha, atendimento, entrega, dono.

### Resultado esperado

O dono deixa de operar por lembranca e passa a operar por prioridade.

---

## Prioridade 2 — Pedido como Caso Operacional

### Problema que resolve

Hoje um pedido tende a ser tratado como uma linha em uma lista. Em operacao real, cada pedido e um caso com historico, risco, conversa, pagamento, cozinha e entrega.

### Solucao imaginada

Cada pedido deve ter uma ficha unica com tudo que importa:

- Status operacional.
- Status de pagamento.
- Tempo em cada etapa.
- Timeline completa.
- Conversa WhatsApp vinculada.
- Itens e observacoes.
- Endereco e bairro.
- Entregador.
- Alertas do sistema.
- Historico do cliente.
- Acoes feitas por operador ou sistema.

### Campos fundamentais

- `statusAtual`
- `statusPagamento`
- `tempoNoStatus`
- `statusMudouEm`
- `responsavelAtual`
- `proximaAcao`
- `riscoOperacional`
- `clienteSemRespostaDesde`
- `ultimaMensagemClienteEm`
- `ultimoContatoOperadorEm`
- `motivoBloqueio`

### Resultado esperado

Qualquer pessoa que abrir o pedido entende em menos de 10 segundos o que esta acontecendo e qual e a proxima decisao.

---

## Prioridade 3 — Central de Atendimento Integrada ao Pedido

### Problema que resolve

Cliente esquecido geralmente nao e falta de vontade. E falta de fila clara. WhatsApp separado do pedido cria perda de contexto.

### Solucao imaginada

Criar uma aba ou painel de atendimento dentro da central, sempre conectado ao pedido.

Ela deve mostrar:

- Clientes aguardando resposta.
- Tempo desde ultima mensagem do cliente.
- Pedidos associados a cada conversa.
- Mensagens automaticas enviadas.
- Sugestoes de resposta por contexto.
- Alerta quando cliente manda mensagem sobre pedido atrasado.

### Regras operacionais

- Mensagem de cliente deve gerar alerta se ficar sem resposta por mais de 2 minutos.
- Cliente com pedido critico deve subir na fila.
- Cliente recorrente ou de alto valor deve receber destaque discreto.
- Toda resposta manual deve ficar registrada na timeline do pedido.

### Resultado esperado

Nenhum cliente fica invisivel porque a equipe esta olhando so para pedidos ou so para WhatsApp.

---

## Prioridade 4 — Modo Pico de Demanda

### Problema que resolve

Alta demanda muda a regra do jogo. O sistema precisa reconhecer quando a operacao entrou em pico e ajudar o dono a reduzir dano antes de acumular atraso.

### Solucao imaginada

Criar um **Modo Pico**, ativado automaticamente ou manualmente, com controles rapidos:

- Aumentar tempo estimado de entrega.
- Pausar novos pedidos temporariamente.
- Pausar bairros distantes.
- Pausar produtos demorados.
- Destacar pedidos com maior risco.
- Reduzir notificacoes secundarias.
- Exibir somente excecoes e decisoes urgentes.

### Indicadores de entrada em pico

- Pedidos por minuto acima da media.
- Cozinha com fila acima do limite.
- Tempo medio de preparo subindo.
- Entregadores insuficientes.
- Muitos pedidos aguardando confirmacao.
- Muitos clientes mandando mensagem.

### Resultado esperado

O dono consegue controlar a demanda antes que a operacao quebre.

---

## Prioridade 5 — Controle de Cozinha e Gargalo de Preparo

### Problema que resolve

O atraso muitas vezes nasce na cozinha, mas aparece tarde para o atendimento. A central precisa enxergar capacidade real de preparo.

### Solucao imaginada

Criar uma visao operacional de cozinha:

- Fila de preparo por ordem ideal.
- Tempo estimado por pedido.
- Tempo total acumulado na cozinha.
- Produtos mais demorados em destaque.
- Pedidos com observacao especial.
- Aviso de bebida/sobremesa/acompanhamento.
- Marcacao "pronto para entrega".

### Inteligencia esperada

O sistema deve sugerir:

- "Pausar produto X por 30 min".
- "Aumentar prazo estimado para 60 min".
- "Priorizar pedido Y porque esta perto do SLA critico".
- "Separar bebida do pedido Z antes de sair".

### Resultado esperado

A cozinha deixa de ser caixa preta. O atendimento consegue prometer melhor e o dono consegue agir antes do atraso virar reclamacao.

---

## Prioridade 6 — Controle de Entrega e Despacho

### Problema que resolve

Pedido pronto parado e uma das perdas mais caras: comida esfria, cliente reclama e a operacao perde confianca.

### Solucao imaginada

Criar um painel de despacho:

- Pedidos prontos aguardando entregador.
- Entregadores disponiveis, em rota e atrasados.
- Agrupamento por bairro/regiao.
- Sugestao de rota combinada.
- Tempo maximo parado apos pronto.
- Alerta de pedido frio.

### Acoes diretas

- Atribuir entregador.
- Marcar saiu para entrega.
- Enviar mensagem automatica ao cliente.
- Acionar marketplace/terceiro quando area estiver fora de capacidade.

### Resultado esperado

O sistema reduz pedidos esquecidos entre cozinha e entrega, que e um gargalo classico de delivery cheio.

---

## Prioridade 7 — Financeiro Operacional em Tempo Real

### Problema que resolve

Pagamento pendente, PIX nao confirmado, cancelamento sem estorno e divergencia financeira viram problemas graves quando misturados ao fluxo comum.

### Solucao imaginada

Criar uma fila financeira operacional:

- Pagamentos pendentes.
- Pagamentos confirmados sem pedido confirmado.
- Pedidos cancelados com estorno necessario.
- Falha em webhook.
- Divergencia entre gateway e banco local.
- Pedidos expirados ou abandonados.

### Regras essenciais

- Pedido pago nunca pode ficar invisivel.
- Pedido cancelado e pago deve gerar tarefa de estorno.
- Falha de webhook deve gerar alerta tecnico-operacional.
- O operador precisa saber se pode preparar ou se deve aguardar pagamento.

### Resultado esperado

Menos prejuizo financeiro, menos conflito com cliente e menos decisao manual sem informacao.

---

## Prioridade 8 — Alertas Inteligentes, nao Barulho

### Problema que resolve

Sistema que alerta demais vira ruido. Sistema que alerta de menos deixa passar problema.

### Solucao imaginada

Criar alertas por gravidade e contexto:

- Critico: exige acao agora.
- Atencao: pode virar problema.
- Informativo: apenas registro.

### Exemplos de alertas criticos

- Pedido pago sem confirmacao.
- Cliente sem resposta acima do SLA.
- Pedido pronto sem entregador.
- Pedido em preparo muito acima do tempo.
- WhatsApp desconectado.
- Gateway de pagamento com falha.
- Loja aberta mas sistema de entrega indisponivel.

### Resultado esperado

O dono confia no alerta porque ele realmente significa prioridade.

---

## Prioridade 9 — Automacoes com Supervisao

### Problema que resolve

Muitas tarefas sao repetitivas, mas algumas decisoes ainda exigem criterio humano. A automacao deve tirar peso, nao esconder risco.

### Solucao imaginada

Automatizar com trilha de auditoria:

- Mensagens por mudanca de status.
- Aviso de atraso previsto.
- Lembrete de cliente sem resposta.
- Recalculo de SLA.
- Sugestao de pausa de produtos.
- Sugestao de aumento de prazo.
- Agrupamento de entregas por bairro.

### Regra de ouro

Automacao pode executar tarefas seguras. Decisoes com impacto em dinheiro, cancelamento, estorno ou reputacao devem pedir confirmacao ou registrar justificativa.

### Resultado esperado

A equipe ganha velocidade sem perder controle.

---

## Prioridade 10 — Visao do Dono

### Problema que resolve

O dono precisa sair do detalhe quando necessario e enxergar a saude da operacao inteira.

### Solucao imaginada

Criar uma tela executiva operacional com:

- Pedidos ativos.
- Pedidos criticos.
- Clientes aguardando resposta.
- Receita do dia.
- Ticket medio.
- Tempo medio de preparo.
- Tempo medio de entrega.
- Pedidos cancelados.
- Motivo de cancelamento.
- Capacidade atual da cozinha.
- Capacidade atual da entrega.
- Status WhatsApp, pagamento e backend.

### Leitura ideal

Em 30 segundos, o dono deve conseguir responder:

- Estamos atrasando?
- Onde esta o gargalo?
- Precisamos pausar algo?
- Tem cliente ficando sem resposta?
- Tem dinheiro em risco?

### Resultado esperado

A central vira instrumento de comando, nao apenas acompanhamento.

---

## Prioridade 11 — Historico do Cliente e Recuperacao

### Problema que resolve

Nem todo cliente tem o mesmo contexto. Cliente novo, recorrente, reclamante ou VIP precisam de tratamento diferente.

### Solucao imaginada

Adicionar inteligencia de cliente no pedido:

- Primeira compra.
- Cliente recorrente.
- Quantidade de pedidos.
- Ultimo problema registrado.
- Ultimo atraso.
- Valor total historico.
- Preferencias e observacoes.
- Risco de churn.

### Acoes sugeridas

- Enviar pedido de desculpa com cupom.
- Priorizar resposta para cliente recorrente com problema.
- Registrar motivo de reclamacao.
- Sugerir contato humano quando houver atraso critico.

### Resultado esperado

A central ajuda a proteger relacionamento, nao apenas entregar comida.

---

## Prioridade 12 — Governanca e Auditoria Operacional

### Problema que resolve

Em pico, varias pessoas mexem no sistema. Sem auditoria, fica impossivel entender quem fez o que e por que algo deu errado.

### Solucao imaginada

Toda acao importante deve registrar:

- Quem fez.
- Quando fez.
- Em qual pedido.
- Qual era o estado anterior.
- Qual foi o novo estado.
- Justificativa quando necessario.

### Eventos auditaveis

- Confirmacao de pedido.
- Mudanca de status.
- Cancelamento.
- Estorno marcado.
- Edicao de endereco.
- Atribuicao de entregador.
- Mensagem manual enviada.
- Pausa de loja, bairro ou produto.

### Resultado esperado

O dono consegue revisar falhas e treinar equipe com fatos, nao com achismo.

---

## Prioridade 13 — Experiencia de Uso para Operacao Real

### Problema que resolve

Interface bonita mas lenta ou dispersa piora a operacao. Em delivery cheio, o operador precisa de densidade, clareza e atalhos.

### Solucao imaginada

Principios de interface:

- Uma tela principal de comando.
- Lista de decisoes sempre visivel.
- Painel de detalhe sem navegar para fora.
- Acoes principais com um clique.
- Confirmacoes para acoes destrutivas.
- Feedback sonoro apenas para eventos criticos.
- Atalhos de teclado.
- Indicador claro de conexao em tempo real.
- Sem reload visual, sem piscar, sem perder selecao.

### Resultado esperado

O operador trabalha com menos atrito e menos chance de erro.

---

## Prioridade 14 — Fundacao Tecnica Necessaria

### Backend

- Maquina de estados formal para pedido.
- Timestamps por etapa.
- Timeline de eventos.
- SLA calculado por etapa.
- Fila de alertas persistente.
- WebSocket/SSE confiavel com reconexao.
- Idempotencia em webhooks.
- Status financeiro independente do status operacional.
- Auditoria de acoes admin.

### Frontend

- Componentes CRM consolidados.
- Estado em tempo real sem flicker.
- Design system admin isolado.
- Split-panel como padrao para cockpit.
- Modais consistentes.
- Atalhos e estados de loading claros.

### Dados

- Tabela/eventos de timeline.
- Tabela de alertas.
- Registro de SLA por etapa.
- Registro de operador/admin.
- Historico de cliente.
- Historico de mensagens.
- Historico de estornos.

### Resultado esperado

A central deixa de depender de improvisos de tela e passa a ter modelo operacional forte.

---

## Roadmap recomendado

### Fase 1 — Antiesquecimento

Objetivo: impedir pedido e cliente invisivel.

- Fila de decisoes.
- SLA por etapa.
- Alertas criticos.
- Cliente sem resposta.
- Pedido pago sem confirmacao.
- Pedido pronto sem entregador.

### Fase 2 — Atendimento integrado

Objetivo: unir pedido e conversa.

- Conversa WhatsApp por pedido.
- Fila de clientes aguardando.
- Timeline unificada.
- Mensagens automaticas auditadas.
- Sugestoes de resposta.

### Fase 3 — Modo pico

Objetivo: controlar demanda antes de quebrar.

- Detecção de pico.
- Pausar bairros/produtos.
- Ajustar tempo estimado.
- Tela focada em excecoes.
- Alertas por capacidade.

### Fase 4 — Cozinha e despacho

Objetivo: enxergar e reduzir gargalo fisico.

- Fila de preparo.
- Painel de pedidos prontos.
- Atribuicao de entregador.
- Agrupamento por bairro.
- Alerta de pedido parado.

### Fase 5 — Inteligencia operacional

Objetivo: transformar historico em decisao.

- Historico de cliente.
- Motivos de atraso/cancelamento.
- Sugestao de recuperacao.
- Relatorio de gargalos.
- Aprendizado por horario, produto e bairro.

---

## MVP ideal

Se fosse para entregar o menor produto excelente, eu priorizaria:

1. Fila de decisoes com risco operacional.
2. Pedido com timeline, SLA e proxima acao.
3. Alerta de cliente sem resposta.
4. Alerta de pedido pago sem confirmacao.
5. Alerta de pedido em preparo atrasado.
6. Alerta de pedido pronto sem entregador.
7. Modo pico manual: pausar loja, bairro e produto.
8. Registro de auditoria das acoes.

Esse MVP ja atacaria as dores mais perigosas: pedidos esquecidos, clientes sem resposta, atraso sem visibilidade e decisao tardia.

---

## Resultado final esperado

A Central de Decisoes perfeita deve operar como um segundo gerente atento.

Ela nao substitui o dono. Ela organiza o caos para que o dono decida melhor, mais rapido e com menos desgaste.

O ganho principal nao e apenas produtividade. E confianca operacional: saber que, mesmo em alta demanda, nenhum pedido importante, cliente esperando, pagamento travado ou gargalo critico ficara escondido no sistema.
