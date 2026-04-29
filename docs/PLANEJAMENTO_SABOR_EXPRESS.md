# Sabor Express — Planejamento do Sistema Web (MVP)

> Documento gerado por sessão de planejamento socrático.
> Objetivo: orientar o dev sem ambiguidade sobre o que construir, em que ordem, e por quê.
> As funcionalidades estão numeradas pela ordem de construção, não pela ordem em que foram idealizadas.

---

## 1. Visão Geral

**Sabor Express** é um sistema web para restaurante delivery-only com 6 funcionalidades. Este documento define a sequência de construção, as especificações do MVP e o que fica para fases posteriores.

---

## 2. Sequência de Construção (com Rationale)

| Fase | # | Funcionalidade | Motivo |
|------|---|---------------|--------|
| **1** | F01 | Site de pedidos | Base da operação. Sem ele, nenhum outro canal converte. |
| **2** | F02 | Mineração de contatos | Canal de aquisição. Só faz sentido com destino pronto. |
| **2** | F03 | Agente WhatsApp (Inbound + Outbound) | Canal de aquisição e atendimento. Depende do site no ar. |
| **3** | F04 | Ficha técnica e precificação | Organização de margem. Operação roda sem, mas cresce com. |
| **4** | F05 | Retenção (roleta de promoções) | Requer base de clientes ativa. |
| **4** | F06 | Indicação com bonificação | Requer clientes comprando regularmente. |

> **Regra de ouro:** base antes de tráfego, produto antes de canal, retenção só depois de ter o que reter.

---

## 3. F01 — Site de Pedidos (Especificação MVP)

### 3.1 O que o dev precisa construir do zero
- Cardápio com exibição de produtos
- Carrinho de compras
- Checkout com coleta de dados e cálculo de taxa
- Painel mínimo de cadastro (produtos, bairros)

### 3.2 O que o dev integra (não constrói)

**Gateway de pagamento:** Asaas (já contratado)

**Notificação de pedido via Webhook do Asaas:**

Quando o cliente finaliza o pedido no site, ele é redirecionado para o Asaas para pagar. Nesse momento o sistema perde visibilidade do que acontece — o pagamento foi aprovado? Recusado? O cliente desistiu? O webhook é o mecanismo pelo qual o Asaas avisa o sistema de volta quando algo acontece.

**Fluxo:**
```
Cliente paga no Asaas
        |
        v
Asaas confirma o pagamento internamente
        |
        v
Asaas faz POST para: saborexpress.com.br/webhook/asaas
        |
        v
Sistema recebe o aviso e lê o status
        |
        v
Status = CONFIRMED → monta mensagem e envia ao dono via WhatsApp
Status = FAILED/PENDING → não notifica (ou avisa o cliente)
```

**O que o dev precisa implementar:**

1. Criar o endpoint `POST /webhook/asaas` no backend — é a "caixinha de entrada" que o Asaas chama quando o status do pagamento muda
2. Validar que o status recebido é `CONFIRMED` antes de qualquer ação (status `PENDING` significa que o Pix/boleto foi gerado mas o dinheiro ainda não entrou)
3. Recuperar os dados do pedido no banco usando o ID que o Asaas envia
4. Montar a mensagem de notificação e disparar via Evolution API para o WhatsApp do dono

**Atenção crítica:** os dados do pedido (nome, endereço, itens) **não vêm no payload do Asaas** — o Asaas só envia o ID do pagamento e o status. Por isso o pedido deve ser salvo no banco **antes** de redirecionar o cliente para o Asaas. O webhook usa esse ID para recuperar o pedido e montar a notificação.

**Resumo do que o Asaas envia no webhook:**
```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_abc123",
    "status": "CONFIRMED",
    "value": 32.90
  }
}
```

---

### 3.3 Produto (Cardápio)

#### Modelo de navegação: feed vertical com snap

O cardápio **não usa grade de cards** — usa feed vertical estilo TikTok/Instagram Reels. Um produto por vez, ocupando a tela inteira. O cliente arrasta para cima para ver o próximo. Ao parar de arrastar, o item trava centralizado na tela (scroll snap).

**Motivação:** navegação por grade em mobile é confusa — o cliente abre um item, não gosta, volta, perde o contexto, começa de novo. O feed vertical elimina esse problema: o cliente consome o cardápio em sequência, sem se perder, e a foto grande cria apetite.

**Implementação técnica:** CSS scroll snap. Sem biblioteca externa, sem algoritmo.

---

**Visão do cliente por item:**
```
┌─────────────────────────────┐
│                             │
│   [foto grande do prato]    │  ← ocupa ~60% da tela
│                             │
├─────────────────────────────┤
│  Nome do prato              │  ← bold, destaque
│  Descrição completa         │  ← texto corrido, sem limite
│                             │
│  R$ 24,90          [+ Add]  │  ← preço + botão na mesma linha
└─────────────────────────────┘
         ↑ arrasta para cima
```

---

**Cadastro administrativo (campos obrigatórios):**
```
nome         string
preco        decimal
midia        url        ← foto no MVP, vídeo motion na evolução
descricao    string     ← texto corrido, sem limite de caracteres
categoria    string
disponivel   boolean
ordem        integer    ← define a sequência no feed
```

> O campo `ordem` é importante: o dono controla qual prato aparece primeiro no feed — normalmente os mais vendidos ou os de maior margem.

**Decisão de UX — toque no produto:**
Os produtos são fechados, sem variações ou complementos. Um toque em `+ Adicionar` vai direto para o carrinho — sem modal, sem tela extra, sem fricção. Cada proteína diferente é cadastrada como produto separado.

---

#### Backlog — evolução do cardápio (pós-MVP)

**Vídeo motion gerado por IA:**
- Fluxo: foto do prato → ferramenta de IA (Kling, Runway, Pika) → vídeo de 3–5s em loop
- Custo de produção: praticamente zero, sem refilmagem quando o cardápio mudar
- O campo `midia` já suporta URL de vídeo — o dev só precisa detectar o tipo e usar `<video autoplay loop muted>` em vez de `<img>`
- Implementar após o lançamento, testando primeiro nos 2–3 pratos mais pedidos

**Up Sell no fechamento do carrinho:**
- No momento em que o cliente abre o carrinho para revisar o pedido, exibir 1 sugestão de item complementar (ex: "Adicionar um refrigerante por R$ 5,00?")
- Uma linha no checkout — não é um sistema novo, é um campo a mais na tela do carrinho
- Implementar após o lançamento, quando o cardápio já estiver estável

---

### 3.4 Checkout (Fluxo)

```
[Cliente monta carrinho]
        |
        v
[Clica em Finalizar Pedido]
        |
        v
[Informa dados de entrega]
  - Nome
  - Telefone/WhatsApp
  - Endereço
  - Bairro (seleção por lista)
  - Observação (opcional)
        |
        v
[Sistema verifica bairro na tabela]
  - Bairro atendido → aplica taxa, mostra total
  - Bairro não atendido → bloqueia e informa
        |
        v
[Cliente confirma total e vai para pagamento]
        |
        v
[Asaas processa pagamento]
        |
        v
[Webhook Asaas → notificação para o dono via WhatsApp]
  - Nome, telefone, endereço, bairro
  - Itens, quantidades, observações
  - Status do pagamento
```

---

### 3.5 Tabela de Bairros e Taxas (cadastro admin)

```
bairro       string   (ex: "Setor Bueno")
taxa         decimal  (ex: 6.00)
ativo        boolean
```

**Regra:** se o bairro não estiver na tabela com `ativo = true`, o checkout bloqueia antes do pagamento.

---

### 3.6 Notificação para o Dono (mínimo viável)

Mensagem enviada via WhatsApp após confirmação do pagamento:

```
🟢 NOVO PEDIDO — Sabor Express

Cliente: [nome]
WhatsApp: [telefone]
Endereço: [endereço], [bairro]
Taxa: R$ X,XX
Total: R$ XX,XX
Pagamento: CONFIRMADO

Itens:
- [qtd]x [produto] — [obs]

Observação geral: [texto]
```

---

## 4. Entidade Central: Cliente

**Identificador único:** número de telefone/WhatsApp

**Campos:**
```
telefone     string (PK)
nome         string
endereco     string
bairro       string
origem       enum: SITE | WHATSAPP | MINERACAO | INDICACAO | CAMPANHA
criado_em    timestamp
```

**Lógica de reconhecimento:**
- Checkout informa número → sistema busca na base
- Número existe → pedido entra no histórico do cliente existente
- Número novo → sistema cria novo cliente automaticamente

**Relações:**
- 1 cliente → N pedidos
- 1 cliente → 1 origem (primeira vez)
- 1 cliente → pode ser indicador em F06

> O campo `origem` é estratégico: permite saber no futuro qual canal traz clientes que realmente compram e voltam.

---

## 5. F02 — Mineração de Contatos (Fase 2)

> Ver documento separado: `SOP_MINERACAO_CONTATOS.md`

**Premissa:** só iniciar após F01 estar no ar e validado. Cada abordagem deve incluir link direto para o cardápio.

**Adaptações necessárias para o contexto de restaurante:**
- O alvo não é proprietário de imóvel — é morador da região para virar cliente
- O campo `origem` no cadastro de cliente deve registrar `MINERACAO` para rastreio de conversão
- A Assertiva traz telefone; o agente WhatsApp (F03) faz a abordagem

---

## 6. F03 — Agente WhatsApp (Fase 2)

### Inbound (cliente fala primeiro)
- Responde dúvidas sobre cardápio, horário, taxa de entrega
- Direciona para o site de pedidos
- Registra ou atualiza cadastro do cliente

### Outbound (sistema fala primeiro)
- Abordagem de contatos minerados (F02)
- Disparo de campanhas de retenção (F05, fase 4)
- Envio de link da roleta após pedido confirmado

> **Ferramentas candidatas:** Evolution API + agente de IA por cima (a definir na fase 2).

---

## 7. F04 — Ficha Técnica e Precificação (Fase 3)

**Objetivo:** calcular custo real de cada produto e proteger margem de lucro.

**Campos mínimos por produto:**
```
ingrediente        string
quantidade_usada   decimal
unidade            string
custo_unitario     decimal
```

**Outputs esperados:**
- Custo de produção por produto
- Margem de lucro atual vs. preço praticado
- Sugestão de preço para margem-alvo

> Módulo interno. Não precisa integrar com F01 no MVP desta fase.

---

## 8. F05 — Retenção com Roleta de Promoções (Fase 4)

- Disparada automaticamente após cada pedido confirmado
- Cliente recebe link via WhatsApp
- Roleta sorteável com prêmios a definir (desconto, brinde, frete grátis)
- Resultado vinculado ao cadastro do cliente

---

## 9. F06 — Indicação com Bonificação (Fase 4)

- Cliente recebe link/código único de indicação
- Quando indicado faz primeiro pedido, indicador ganha bonificação
- Bonificação = giro da roleta (integração com F05)
- Rastreio via campo `origem = INDICACAO` + ID do indicador

> **Pré-requisito real de F05 e F06:** base de pelo menos 50–100 clientes ativos. Construir antes disso é desperdício de dev.

---

## 10. Stack Sugerida (a validar com dev)

| Camada | Decisão |
|--------|---------|
| Frontend | Web app responsivo (mobile-first, foco em celular) |
| Backend | A definir com dev |
| Banco | Relacional (PostgreSQL recomendado) |
| Pagamento | Asaas (já contratado) |
| WhatsApp | Evolution API |
| Mineração | Pipeline já documentado no SOP |
| Hospedagem | A definir |

---

## 11. Critério de Pronto — Fase 1 (F01)

- [ ] Cliente consegue ver cardápio completo no celular
- [ ] Cliente consegue montar carrinho e finalizar pedido
- [ ] Sistema valida bairro e calcula taxa antes do pagamento
- [ ] Pagamento processado pelo Asaas
- [ ] Dono recebe notificação no WhatsApp com todos os dados do pedido
- [ ] Cadastro de cliente criado ou atualizado automaticamente
- [ ] Admin consegue cadastrar/editar produtos e bairros
- [ ] Testado com pedido real ponta a ponta

---

*Documento vivo — atualizar a cada fase concluída.*
