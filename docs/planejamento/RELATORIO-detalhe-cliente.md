# Relatório de Análise — Detalhe do Cliente (`/admin/clientes/:id`)

**App:** Rancho Comida Caseira · `app.rancho.delivery`
**Página analisada:** Painel admin → Clientes → Detalhe (Gestão do Lead)
**Data:** 04/05/2026

---

## Resumo executivo

A página tem **a estrutura de um stub administrativo** (mostrar campos, expor ações), não de um **centro de comando de relacionamento** — que é o que o produto promete. Aproximadamente **60% da viewport está em branco**, dados ricos do cliente são exibidos como texto plano corrido, o histórico de pedidos não aparece, e a caixa de mensagem WhatsApp **não pré-preenche a estratégia sugerida** que existia na lista (inconsistência grave). Os ganhos maiores virão de: (1) preencher o espaço vazio com timeline visual e contexto comportamental, (2) puxar a estratégia sugerida, (3) trazer histórico de pedidos, e (4) colocar o histórico de mensagens de fato no centro da página, não como caixa secundária vazia.

---

## Pontos fortes (manter)

- **Métricas-chave no topo** (Pedidos / Total gasto / Dias sem pedir) — boas escolhas, ancoram o contexto.
- **Separação entre "ação de relacionamento" e "histórico de mensagens"** — modelo conceitual correto.
- **Status da loja, WhatsApp conectado, entregadores no rodapé da sidebar** — informação operacional útil sempre visível.
- **URL semântica** (`/admin/clientes/:phone`) — identificador estável.

---

## Issues identificados

### 1. Inconsistência semântica grave: "Lead" vs "Cliente" — **P0**

O título é **"Gestão do Lead"**, mas este registro **já é cliente** (1 pedido, R$ 36,89 gastos). A página vinda da listagem `/admin/clientes` muda o nome para "Lead" sem critério.

No vocabulário CRM:
- **Lead** = potencial cliente que ainda não comprou
- **Cliente** = quem já comprou

Misturar os dois confunde o admin e enfraquece a precisão do produto — especialmente num CRM cuja **principal feature é segmentação inteligente**.

**Recomendação**
- Título dinâmico: `Gestão do Cliente` quando `pedidos > 0`, `Gestão do Lead` quando `pedidos == 0`.
- Ou unificar em `Detalhes do contato` / `Ficha do cliente` — neutro e sempre correto.
- Auditar o resto do produto pelo mesmo problema (Elyon usa "lead" para owners não-clientes — coerente lá; aqui, no CRM de delivery, o termo é diferente).

---

### 2. Espaço vazio massivo no card principal — **P0**

O card de cabeçalho tem 4 colunas (Cliente / Pedidos / Total gasto / Dias sem pedir), mas as três últimas usam apenas a primeira linha. Dos ~280px de altura do card, **~200px à direita estão em branco**.

**Recomendação — preencher com sinais de alto valor:**

| Posição | Conteúdo proposto |
|---|---|
| Coluna "Pedidos" | Sparkline de pedidos por mês + valor abaixo |
| Coluna "Total gasto" | Sparkline de ticket por pedido + valor médio abaixo |
| Coluna "Dias sem pedir" | **Timeline visual horizontal**: Primeiro pedido ─── Último pedido ─── Hoje ─── Próximo previsto (baseado em `dia favorito`) |
| Faixa adicional | **Status conversacional** — última mensagem enviada pelo agente, status (respondida/aguardando), próxima ação programada |

A timeline isoladamente já é a maior melhoria possível dessa página: dá ritmo, mostra padrão, e antecipa quando agir.

---

### 3. Estratégia sugerida não é puxada — **P0** (inconsistência com a lista)

Na listagem, cada cliente tem uma **"Estratégia sugerida"** pré-escrita (`Oi Teste InfinitePay Link OK, seu favorito (Frango Caipira Assado) está te esperando...`). Na tela de detalhe, a caixa **"Ação de relacionamento"** vem **vazia** com placeholder genérico `"Digite a mensagem para enviar no WhatsApp"`.

Resultado: o admin tem que voltar pra lista, copiar a mensagem, voltar e colar. Ou redigitar do zero.

**Recomendação**
- Pré-preencher o textarea com a estratégia sugerida ao carregar a página.
- Botões acima do textarea: `[Estratégia sugerida]` `[Boas-vindas]` `[Reativação]` `[Customizada]` — admin escolhe template, edita se quiser.
- Indicador discreto: `Última edição da estratégia: há 2 dias` para reforçar que aquilo é dinâmico.

---

### 4. Histórico de pedidos completamente ausente — **P0**

A página é "Visão completa do cliente" mas **não mostra os pedidos**. Sabemos que existem (`Pedidos: 1`), sabemos data e produto top, mas não:
- Itens completos de cada pedido
- Forma de pagamento usada
- Status (entregue, cancelado, contestado)
- Avaliação do cliente
- Tempo de entrega

Sem isso o admin **não consegue fundamentar decisão de relacionamento**. Por que oferecer "Frango Caipira" de novo se ele cancelou da última vez? Por que mandar mensagem se ainda não chegou a entrega anterior?

**Recomendação**
- Seção `Pedidos` abaixo do card de identificação, com mini-cards por pedido: data · itens · valor · status · forma pgto · avaliação.
- Linkar cada pedido para a página de detalhe correspondente (`/admin/pedidos/:id`).
- Caso `pedidos == 0`, empty state dedicado: `"Esse contato ainda não pediu. Use a aba Ação de relacionamento para iniciar uma conversa."`

---

### 5. Ações destrutivas na primeira fileira, mesma cor — **P0**

Repete o mesmo problema da listagem: `Desativar` (cinza), `Adicionar blacklist` (vermelho), `Excluir cliente` (vermelho) lado a lado, **sem confirmação visível**, com `blacklist` e `excluir` indistinguíveis.

Aqui é **pior que na lista** porque o admin abre essa página justamente quando quer agir sobre um cliente — e os botões mais perigosos do produto inteiro são os mais visíveis.

**Recomendação**
- Mover as três ações para um menu `⋯` no canto superior direito do card, próximo de `Voltar para clientes`.
- `Excluir` exige modal de confirmação digitando o telefone do cliente.
- Diferenciar visualmente: `Blacklist` = vermelho outline; `Excluir` = vermelho preenchido.
- Considerar `Desativar` como toggle simples (sem botão dedicado — vira switch no campo `Status cadastro`).

---

### 6. Histórico de mensagens vazio sem orientação — **P1**

Painel direito mostra apenas `"Nenhuma mensagem registrada."`. Empty state não acionável.

**Recomendação**
- Empty state com seta visual apontando para a caixa de mensagem ao lado: `"Envie a primeira mensagem usando a Ação de relacionamento →"`
- Quando houver mensagens, mostrar como **timeline de chat real** (avatar, hora, status de leitura, resposta) — não só lista de strings.
- Indicar status do envio: `Enviado · Entregue · Lido · Respondido`.

---

### 7. Botão "Atualizar histórico" não deveria existir — **P1**

A presença do botão "Atualizar histórico" indica que o histórico **não atualiza sozinho**. UX ruim — o admin não devia ter que se lembrar de clicar.

**Recomendação**
- Polling ou WebSocket para atualizar em tempo real.
- Se inviável agora, ao menos auto-refresh a cada 30s e marcar `Atualizado há 12s` discretamente — sem botão.
- Se manter o botão, virar ícone de refresh discreto (`↻`), não botão de texto.

---

### 8. Status como texto plano em vez de badges — **P1**

`Status cadastro: Ativo` e `Blacklist: Não` são exibidos como **texto corrido**. Não dá pra escanear rapidamente.

**Recomendação**
- Converter em **pills** coloridas no topo do card, perto do nome:
  - `● Ativo` (verde)
  - `Não está em blacklist` (não exibir quando false; só mostrar pill `⛔ Blacklist` se true)
  - `NOVO` / `ATIVO` / `EM RISCO` / `INATIVO` / `VIP` (segmento — falta na página!)
- A pill de **segmento** é o que está mais ausente: a lista mostra, o detalhe não.

---

### 9. Falta integração com o agente / Elyon — **P1**

O CRM se vende como "recuperação inteligente". A página de detalhe é onde isso deveria ficar **óbvio**, mas não há nenhum elemento sobre o agente:

- Score de qualificação do cliente?
- Agente já tentou contato? Quando?
- Skills ativas para esse perfil?
- Próxima ação automática programada?
- O cliente está em alguma campanha?

**Recomendação**
- Card `Agente IA` com:
  - Última tentativa de contato (data + resultado)
  - Score de propensão a recompra (0–100)
  - Próxima ação programada (`Reabordagem em 4 dias`)
  - Botão `[Pausar agente para esse contato]` / `[Retomar]`
- Reaproveitar a infra do Elyon — a tela é o "espelho" do que o agente faz por trás.

---

### 10. Top produtos como texto em vez de visual — **P1**

`Top produtos: Frango Caipira Assado (1)` é uma das informações mais úteis da página, mas está perdida numa lista de strings.

**Recomendação**
- Converter em mini-cards horizontais: foto do produto · nome · qtd pedida · preço médio.
- Ao lado, sugestão de upsell baseado em outros clientes que pediram o mesmo: `"Quem pede Frango Caipira costuma pedir Arroz Carreteiro também"`.

---

### 11. Endereço incompleto — **P1**

Aparece apenas `Centro` (bairro). Para um app de delivery, o endereço completo (rua, número, complemento, ponto de referência) é **essencial** — tanto para validar atendimento quanto para o admin entender contexto.

**Recomendação**
- Mostrar endereço completo com mini-mapa estático ao lado.
- Se o cliente tem múltiplos endereços (casa/trabalho), listar todos com tag.
- Distância da loja + tempo médio de entrega histórico para esse endereço.

---

### 12. Falta campo de notas / observações internas — **P1**

CRMs sérios têm campo de notas. `"Cliente prefere ser chamado de João"`, `"Não toca campainha — entregar pelo fundo"`, `"Reclamou da entrega passada — atenção"`. Sem isso, o conhecimento sobre o cliente vive na cabeça do admin.

**Recomendação**
- Card `Notas internas` com textarea, autosave, timestamp da última edição e quem editou (quando o sistema tiver multi-usuário).
- Notas aparecem também em hover na linha da listagem.

---

### 13. Falta navegação entre clientes — **P2**

Para revisar 20 clientes em sequência, admin tem que voltar, clicar, voltar, clicar. Sem `← Anterior | Próximo →`.

**Recomendação**
- Setas de navegação ao lado do `Voltar para clientes`, mantendo o filtro/ordem da lista.
- Atalho de teclado `J/K` ou `← →`.

---

### 14. "Voltar para clientes" como botão grande — **P2**

Botão de navegação ocupa espaço prime no canto superior direito.

**Recomendação**
- Substituir por breadcrumb: `Clientes / Teste InfinitePay Link OK`.
- Liberar o canto superior direito para o menu de ações `⋯`.

---

### 15. Acessibilidade & padrões — **P2**

Mesmos problemas da listagem:
- Telefone sem máscara (`5562999000001`)
- Contraste do texto secundário aparentemente baixo
- Labels pequenos e cinza-claro
- Logo pixel-art destoa do resto

(Detalhamento já feito no relatório da listagem.)

---

## Roadmap priorizado

### P0 — Fazer primeiro (alto impacto, esforço médio)
1. Renomear "Gestão do Lead" → título dinâmico/neutro.
2. Preencher espaço vazio do card top com **timeline + sparklines + status conversacional**.
3. Pré-preencher textarea da `Ação de relacionamento` com a estratégia sugerida (consistência com a lista).
4. Adicionar **seção de histórico de pedidos** (mini-cards linkáveis).
5. Mover ações destrutivas para menu `⋯` com confirmação para `Excluir`.

### P1 — Ganho operacional
6. Histórico de mensagens como timeline de chat real, com auto-refresh.
7. Pills de status (segmento, ativo, blacklist) no topo.
8. Card de Agente IA (score, última ação, próxima programada, pausar/retomar).
9. Top produtos como mini-cards visuais + sugestão de upsell.
10. Endereço completo + mini-mapa.
11. Campo de notas internas.

### P2 — Polimento
12. Navegação entre clientes (← →) e atalhos de teclado.
13. Substituir "Voltar para clientes" por breadcrumb.
14. Acessibilidade (máscara de telefone, contraste, labels).
15. Microinterações (toasts, skeletons, last-updated automático).

---

## Mockup conceitual da página reformulada

```
Clientes / Teste InfinitePay Link OK                          [Voltar] [⋯]
─────────────────────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────────────────────┐
│  [TI]  Teste InfinitePay Link OK         ● Ativo  NOVO                │
│        +55 62 99900-0001 · Centro, R. das Flores 123                  │
│                                                                       │
│  ┌─────────────┬─────────────┬──────────────┬────────────────────────┐│
│  │ Pedidos     │ Total gasto │ Dias s/ped.  │ Próx. previsto         ││
│  │   1         │ R$ 36,89    │   3          │ Quinta-feira (em 2d)   ││
│  │  ▁▁▁▁▁▁▁▂   │ R$ 36,89 ⌀  │ ──●─────     │ ████████░░  80% prob.  ││
│  └─────────────┴─────────────┴──────────────┴────────────────────────┘│
│                                                                       │
│  Agente IA: aguardando primeiro contato · Próxima ação: hoje 18h     │
└───────────────────────────────────────────────────────────────────────┘

┌─────── Pedidos (1) ─────────────┐  ┌─── Histórico de mensagens ─────┐
│  📅 30/04/2026 15:07            │  │   (vazio)                       │
│  Frango Caipira Assado · R$36,89│  │   Envie a primeira mensagem →   │
│  ✓ Entregue · ⭐⭐⭐⭐⭐ 5,0       │  │                                 │
└─────────────────────────────────┘  └─────────────────────────────────┘

┌──────── Ação de relacionamento ─────────────────────────────────────┐
│  Templates: [Estratégia sugerida ✓] [Boas-vindas] [Reativação] [✎] │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Oi Teste InfinitePay Link OK, seu favorito (Frango Caipira  │ │
│  │ Assado) está te esperando. Quer que eu separe um pedido?    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  [Enviar WhatsApp]                                                 │
└────────────────────────────────────────────────────────────────────┘

┌──────── Notas internas ───────────────────┐  ┌── Top produtos ────┐
│  [textarea com autosave]                  │  │ 🍗 Frango Caipira  │
│                                           │  │ 1× · R$ 36,89      │
└───────────────────────────────────────────┘  └────────────────────┘
```

Resultado: a página vira **centro de operação do relacionamento daquele cliente**, não um stub de campos.

---

## Próximos passos sugeridos

- **Definir vocabulário fixo** (Lead vs Cliente vs Contato) e auditar todas as telas/endpoints/agente para uniformidade. Vale escrever um `GLOSSARIO.md` no repo.
- **Padronizar o card de identificação** — mesmo componente reutilizável aqui, na lista (modo compacto) e no Dashboard. Reduz código e garante consistência.
- **Reusar a infra de Skills do Elyon** para os templates de mensagem (já sugerido no relatório anterior — o argumento é ainda mais forte aqui, onde o admin escolhe template).
- **Instrumentar:** quantos admins editam a estratégia sugerida antes de enviar? Se >50%, os templates não estão bons. Se <10%, o textarea editável é desperdício.
- **Considerar a nomenclatura de URL:** `/admin/clientes/:phone` mistura entidade lógica (cliente) com identificador (telefone). Em algum momento vão querer ter o mesmo telefone com múltiplos relacionamentos (B2B?) — vale reservar `/admin/clientes/:id` com UUID interno.

---

*Análise feita a partir de screenshot único; algumas suposições (ex: ausência de modal de confirmação, comportamento do botão "Atualizar histórico") podem estar incorretas se o comportamento real diferir da captura. Confirme antes de priorizar.*
