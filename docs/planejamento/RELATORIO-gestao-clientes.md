# Relatório de Análise — Gestão de Clientes (`/admin/clientes`)

**App:** Rancho Comida Caseira · `app.rancho.delivery`
**Página analisada:** Painel admin → Clientes
**Data:** 04/05/2026

---

## Resumo executivo

A página entrega o básico (listar, filtrar, cadastrar, acionar via WhatsApp), mas sofre de **baixa densidade informacional**, **hierarquia visual achatada** (tudo é laranja primário) e **ausência de sinal sobre o estado conversacional** de cada cliente — exatamente onde o produto agrega valor. Com 7 clientes a tela já obriga rolagem; em 70 fica inviável de operar. Os ganhos maiores virão de: (1) compactar a linha do cliente, (2) restaurar hierarquia de cor, (3) trazer o status da última interação WhatsApp para a linha, e (4) tornar ações destrutivas menos acidentais.

---

## Pontos fortes (manter)

- **Proposta clara no subtítulo** ("Recuperação inteligente, retenção e relacionamento") — boa ancoragem.
- **Faixa de KPIs no topo** — esqueleto correto, só precisa de conteúdo útil.
- **Segmentação por tabs** (Todos / Novos / Ativos / Em risco / Inativos / VIP) — modelo certo para um CRM de retenção.
- **Estratégia sugerida pré-escrita** por cliente — diferencial real do produto, mas hoje subutilizada visualmente.

---

## Issues identificados

### 1. Hierarquia visual e densidade — **P0**

| Problema | Impacto |
|---|---|
| Cada linha de cliente tem ~140px de altura. Só ~3 clientes cabem antes de rolar. | Operação inviável quando a base crescer. |
| "Adicionar cliente", "Atualizar", tab ativa, "Enviar WhatsApp" e logo usam o **mesmo laranja**. | Perde-se o conceito de ação primária. O olho não sabe onde olhar. |
| Cards de métrica enormes (5 colunas largas) para exibir um dígito. | Desperdício de viewport — o conteúdo principal (lista) começa muito abaixo. |
| Bloco "Cadastro manual de cliente" sempre expandido empurra a lista. | Em 95% das sessões, o admin quer ver a lista, não cadastrar. |

**Recomendação**
- Reduzir linha do cliente para ~64–80px (avatar/iniciais, nome, segmento como pill colorida, dias sem pedir, ações compactas — estratégia em hover/expandir).
- Cards de métrica em uma faixa horizontal compacta (1/3 da altura atual), com cor/ícone diferenciando cada um.
- Mover "Cadastro manual" para um **drawer lateral** ou **modal** acionado por botão "+ Novo cliente".
- Reservar laranja sólido **apenas para a ação primária do contexto**. Tabs ativas → underline ou fundo sutil. "Atualizar" → secundário (outline).

---

### 2. Ações destrutivas perigosas — **P0**

`Desativar` (cinza) · `Blacklist` (vermelho) · `Excluir` (vermelho) aparecem lado a lado, **sem confirmação visível** e com `Blacklist` e `Excluir` com **a mesma cor**. Risco de clique acidental que apaga histórico do cliente.

**Recomendação**
- Agrupar ações destrutivas atrás de um menu `⋯` (kebab).
- `Excluir` exige modal de confirmação digitando o nome do cliente.
- `Blacklist` em vermelho **outline** (não preenchido); `Excluir` em vermelho preenchido — diferenciação semântica.
- Manter apenas **"Enviar WhatsApp"** visível como ação primária na linha.

---

### 3. Estado conversacional invisível — **P0** (gap de produto)

O CRM promete "recuperação inteligente", mas na lista **não há nenhum sinal** de:
- Se a mensagem sugerida já foi enviada (e quando).
- Se o cliente respondeu.
- Status da conversa (aberta, aguardando, fechada, agendou pedido).
- Última interação com o agente.

Para um produto cuja tese é IA + WhatsApp, esse é o sinal mais valioso possível na lista — e está ausente.

**Recomendação**
- Adicionar coluna/badge **"Última conversa"**: `Enviado há 2h · sem resposta` / `Respondeu há 12min` / `Pediu agora` / `Nunca contactado`.
- Botão `Enviar WhatsApp` muda de label conforme estado: `Enviar` → `Reenviar` → `Ver conversa`.
- Indicador visual (bolinha colorida no avatar) para conversas em aberto que precisam de atenção.

---

### 4. KPIs zerados sem ação — **P1**

4 dos 5 cards mostram `0`. Pode ser:
- Base muito nova (provável, dado os 7 clientes "Teste InfinitePay")
- Critérios de classificação não calibrados
- Job de recálculo não rodando

Em ambos os casos, **um KPI zerado precisa explicar como sair de zero**.

**Recomendação**
- Card vazio mostra hint: `"Em risco: clientes sem pedir há 14+ dias. Critério ajustável em Configurações."`
- "Potencial recuperação R$ 0,00" precisa de tooltip explicando o cálculo (ex: `dias_sem_pedir × ticket_médio × probabilidade_retorno`).
- Considerar substituir 1–2 cards por KPIs operacionais mais úteis: **ticket médio**, **taxa de resposta WhatsApp**, **LTV médio**, **conversão recuperação**.

---

### 5. Conteúdo da estratégia sugerida — **P1**

Todas as mensagens começam com `"Oi {Nome}, seu favorito ({Produto}) está te esperando. Quer que eu separe um pedido para você?"`. Repetição cansa, e a mensagem inteira ocupa 3 linhas em cada cartão.

**Recomendação**
- Mostrar só **resumo da estratégia** na linha (ex: `Oferta produto favorito · Frango Caipira Assado`) — mensagem completa em hover/preview.
- Variar templates por segmento: `NOVO` recebe boas-vindas + cupom; `EM RISCO` recebe gatilho de saudade; `VIP` recebe oferta exclusiva. (Já é o tipo de coisa que o stack do Elyon faz bem — vale herdar a lógica de Skills/templates aqui.)
- Botão **"Editar estratégia"** inline antes de enviar — admin sempre pode querer customizar.

---

### 6. Filtros e busca insuficientes — **P1**

- Não há filtro por **bairro** (crítico para delivery — campanhas regionais).
- Não há filtro por **dias sem pedir** com slider/range.
- Não há **ordenação** explícita (por data, ticket, dias inativo).
- Sem **bulk actions** (selecionar múltiplos para enviar campanha em lote).

**Recomendação**
- Sidebar/topbar com filtros avançados colapsáveis: bairro, faixa de ticket, dias sem pedir, segmento múltiplo.
- Checkbox por linha + ações em lote: "Enviar campanha", "Marcar como VIP", "Exportar CSV".
- Header da lista clicável para ordenar.

---

### 7. Acessibilidade & padrões de formulário — **P2**

- Inputs do "Cadastro manual" usam **placeholder como label** — some quando o usuário começa a digitar, ruim para acessibilidade e revisão.
- Telefones em formato cru (`5562999000001`) — sem máscara `+55 (62) 99900-0001`.
- Contraste do texto secundário (telefone, bairro, datas) parece estar abaixo de WCAG AA.
- Sem foco de teclado visível nos elementos.

**Recomendação**
- Labels acima dos inputs (mantendo placeholder como dica).
- Máscara de telefone consistente em todo o app.
- Subir contraste do texto secundário para no mínimo `4.5:1`.
- Estilos de `:focus-visible` claros em todos os botões/inputs.

---

### 8. Sem feedback de carregamento / atualização — **P2**

- Botão "Atualizar" não indica **quando foi a última atualização**.
- Sem skeleton ou estado de loading visível.
- Sem toast de sucesso ao adicionar cliente / enviar WhatsApp.

**Recomendação**
- Texto sutil ao lado do botão: `Atualizado há 30s`.
- Skeleton rows enquanto carrega.
- Toasts compactos (`Mensagem enviada para Smoke Fase3 ✓`).

---

### 9. Identidade visual conflitante — **P2**

A logo `RANCHO COMIDA CASEIRA` em pixel art rústica colide com o resto do painel, que é minimalista corporativo. Pode ser proposital (branding do restaurante), mas no contexto de **painel administrativo profissional**, soa amador.

**Recomendação**
- Versão alternativa da logo para o admin (mesma marca, tipografia limpa).
- Se quiser manter o tom rústico do branding, levá-lo para os outros elementos (não só a logo isolada).

---

## Roadmap priorizado

### P0 — Fazer primeiro (alto impacto, esforço médio)
1. Compactar linha do cliente (~64–80px) e mover "Cadastro manual" para drawer.
2. Adicionar status conversacional (última mensagem / resposta) em cada linha.
3. Agrupar ações destrutivas em menu `⋯` com confirmação para `Excluir`.
4. Restaurar hierarquia de cor — laranja sólido só para ação primária do contexto.

### P1 — Ganho operacional (próximas 2–3 sprints)
5. Filtros avançados (bairro, ticket, dias sem pedir) + ordenação clicável.
6. Bulk actions (campanha em lote).
7. Tornar estratégia sugerida editável inline + variar templates por segmento.
8. KPIs com tooltips explicativos e estado vazio orientativo.

### P2 — Polimento
9. Acessibilidade (labels, contraste, foco visível, máscaras).
10. Microinterações (last-updated, skeletons, toasts).
11. Logo alternativa para o admin.

---

## Mockup conceitual da linha do cliente reformulada

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [SF]  Smoke Fase3                  ATIVO   1d sem pedir   ●  Resp. há 12min │
│       Residencial Eli Forte · 10 pedidos · R$ 36,90 ticket   [WhatsApp] [⋯] │
└─────────────────────────────────────────────────────────────────────────────┘
   ▲      ▲                            ▲          ▲             ▲       ▲    ▲
   |      |                            |          |             |       |    |
 avatar  nome+endereço             pill segmento  dias       status   primária  kebab
                                                          conversação
```

Resultado: **3× mais clientes visíveis por viewport** sem perder informação relevante; estado conversacional ganha destaque; ações destrutivas saem do caminho.

---

## Próximos passos sugeridos

- **Validar com 2–3 admins reais** quais campos da linha são consultados na operação diária (entrevista de 15min basta).
- **Instrumentar telemetria**: clique em "Enviar WhatsApp" gerou conversa? Quantas resultam em pedido? Sem isso, otimização vira chute.
- **Considerar reutilizar a infra de Skills do Elyon** para os templates de mensagem do CRM — mesma estrutura de `.md` por segmento, mesma lógica de injeção de contexto. Reduz código duplicado e mantém o tom de voz consistente entre o agente e a operação manual.

---

*Análise feita a partir de screenshot único; algumas suposições (ex: ausência de modal de confirmação) podem estar incorretas se o comportamento não for visível na captura. Confirme antes de priorizar.*
