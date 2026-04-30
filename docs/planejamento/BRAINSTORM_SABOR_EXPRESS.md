# Sabor Express — Brainstorm de Ideias Futuras

> Este documento **não é planejamento técnico** — é um espaço livre para capturar ideias antes que sumam.
> Nenhum item aqui vira tarefa de dev sem passar por análise de complexidade vs resultado real.
> Quando uma ideia estiver madura, ela migra para o `PLANEJAMENTO_SABOR_EXPRESS.md` com especificação.

---

## Como usar este documento

- Teve uma ideia? Joga aqui sem filtro.
- Cada ideia tem um **status** para facilitar revisões futuras.
- Revisão recomendada: a cada fase concluída do planejamento.

**Status possíveis:**
- `💡 Ideia bruta` — ainda não analisada
- `✅ Aprovada` — faz sentido, aguardando timing certo
- `⏳ Timing errado` — boa ideia, mas não agora (motivo anotado)
- `❌ Descartada` — analisada e descartada (motivo anotado)

---

## Camada 1 — Experiência do Cliente no Site

| # | Ideia | Status | Timing / Observação |
|---|-------|--------|-------------------|
| 1.1 | Histórico de pedidos — cliente vê últimos pedidos e refaz com 1 toque | `💡 Ideia bruta` | Faz sentido quando houver clientes recorrentes |
| 1.2 | Acompanhamento de status do pedido (recebido → em preparo → saiu → entregue) | `💡 Ideia bruta` | Implementar quando volume gerar perguntas "cadê meu pedido?" no WhatsApp |
| 1.3 | Horário de funcionamento — site bloqueado fora do horário com mensagem elegante | `💡 Ideia bruta` | Considerar antes ou logo após o lançamento |
| 1.4 | Disponibilidade em tempo real — dono marca produto esgotado via celular em 2 toques | `💡 Ideia bruta` | Evolução do campo `disponivel` já existente no MVP |
| 1.5 | Link direto para produto — URL única por prato para usar no WhatsApp como marketing | `💡 Ideia bruta` | Implementar quando WhatsApp virar canal de marketing ativo |
| 1.6 | Feed de vídeo motion gerado por IA — foto do prato → Kling/Runway/Pika → vídeo 3–5s em loop | `✅ Aprovada` | Testar nos 2–3 pratos mais pedidos após lançamento. Campo `midia` já suporta vídeo |
| 1.7 | Up Sell no fechamento do carrinho — sugestão de 1 item complementar antes de finalizar | `✅ Aprovada` | Implementar após cardápio estável. Ex: "Adicionar refrigerante por R$ 5,00?" |

---

## Camada 2 — Operação da Cozinha

| # | Ideia | Status | Timing / Observação |
|---|-------|--------|-------------------|
| 2.1 | Painel de pedidos em tempo real — tela única com todos os pedidos ativos organizados por status | `💡 Ideia bruta` | Substitui a notificação por WhatsApp quando o volume crescer |
| 2.2 | Temporizador por pedido — cronômetro visível na tela da cozinha mostrando tempo desde o recebimento | `💡 Ideia bruta` | Ajuda a controlar SLA de entrega e identificar gargalos |
| 2.3 | Impressão automática de comanda — pedido confirmado dispara impressão na cozinha via impressora térmica | `💡 Ideia bruta` | Elimina dependência de tela. Implementar quando volume justificar o hardware |
| 2.4 | Controle de estoque básico — quantidade disponível por produto, alerta quando estiver baixo | `💡 Ideia bruta` | Integra com campo `disponivel` já existente. Evita vender o que não tem |
| 2.5 | Mapa de entregas — visualização das entregas do dia no mapa por status e motoboy | `💡 Ideia bruta` | Faz sentido quando tiver volume e mais de um motoboy simultâneo |
| 2.6 | App do motoboy — tela simples com endereço, rota e botão de confirmação de entrega | `💡 Ideia bruta` | Implementar quando tiver motoboy próprio fixo. Fecha o ciclo de status para o cliente |
| 2.7 | Integração iFood — receber pedidos do iFood direto no sistema, unificando com os pedidos do site | `💡 Ideia bruta` | Elimina a necessidade de ficar olhando dois lugares. Implementar quando o volume no iFood justificar |
| 2.8 | Integração 99Food — mesmo conceito da integração iFood, centralizando todos os canais em uma fila só | `💡 Ideia bruta` | Implementar em conjunto ou logo após a integração iFood |
| 2.9 | Rede de entregadores via grupo de WhatsApp — **ideia ouro** 🥇 | `💡 Ideia bruta` | Ver detalhamento abaixo |

---

### Detalhamento — 2.9 Rede de Entregadores via Grupo de WhatsApp

**O problema que resolve:**
Nos picos de venda, o motoboy próprio não dá conta e os apps de entrega (Uber Direct, Lalamove) cobram taxa sobre a taxa. Essa ideia cria uma rede própria de entregadores avulsos sem nenhum app, sem algoritmo e sem custo de plataforma.

**Como funciona:**
1. O dono cadastra entregadores parceiros (iFood, autônomos, qualquer um) e os adiciona a um grupo de WhatsApp
2. Quando chega um pedido avulso, o sistema gera automaticamente uma mensagem com: endereço de coleta, endereço de entrega, valor da corrida e um link de aceite
3. A mensagem é jogada no grupo
4. O primeiro entregador que clicar no link "aceitar" recebe as informações completas e a corrida é travada — os outros veem que já foi aceita
5. O restaurante paga 100% da taxa diretamente ao entregador no fechamento do expediente (sem intermediário)

**Por que é uma ideia ouro:**
- Zero taxa de plataforma — você paga só o entregador
- Zero app para o entregador instalar — WhatsApp ele já tem
- Cria um pool de entregadores fidelizados que preferem suas corridas às de app (recebem 100%)
- Escala naturalmente — quanto mais entregadores no grupo, mais rápido alguém aceita
- Nenhuma plataforma de delivery faz isso hoje para o pequeno restaurante

**O que precisa para funcionar:**
- Sistema gera a mensagem formatada automaticamente (integração com Evolution API já prevista em F03)
- Link de aceite único por corrida (evita dois entregadores aceitando a mesma)
- Tela simples de controle para o dono ver quem aceitou o quê
- Fechamento financeiro diário por entregador

**Quando implementar:**
Após ter operação rodando com volume real de pedidos e pelo menos 1 pico identificado que o motoboy próprio não conseguiu atender. Não antes — sem volume, o grupo fica vazio de oportunidade e os entregadores perdem interesse.

---

## Camada 3 — Aquisição de Clientes

| # | Ideia | Status | Timing / Observação |
|---|-------|--------|-------------------|
| 3.1 | Página de captura — landing page simples para campanhas pagas (Google/Meta) com CTA direto para o cardápio | `💡 Ideia bruta` | Implementar quando começar a investir em tráfego pago |
| 3.2 | QR Code de mesa/panfleto — QR impresso em embalagens e panfletos que abre o cardápio direto | `💡 Ideia bruta` | Custo zero de implementação, alto impacto em aquisição local |
| 3.3 | Campanha de bairro — disparo segmentado por bairro usando base minerada (F02) com oferta específica | `💡 Ideia bruta` | Integra mineração + WhatsApp + oferta personalizada por região |
| 3.4 | Programa "Primeira compra" — desconto ou frete grátis para número de WhatsApp nunca visto no sistema | `💡 Ideia bruta` | Reduz barreira de conversão de contatos minerados |
| 3.5 | Integração com Google Business — cardápio e link de pedido visíveis direto na busca do Google Maps | `💡 Ideia bruta` | Alto impacto orgânico para quem busca "delivery perto de mim" |
| 3.6 | Vitrine no Instagram — posts automáticos de produtos novos ou destaques do dia com link para o cardápio | `💡 Ideia bruta` | Integrar quando a operação estiver estável e houver tempo para conteúdo |

---

## Camada 4 — Retenção e Recorrência

| # | Ideia | Status | Timing / Observação |
|---|-------|--------|-------------------|
| 4.1 | Roleta de promoções pós-pedido — link enviado via WhatsApp após cada pedido confirmado (já é F05) | `✅ Aprovada` | Especificado no planejamento técnico como F05 |
| 4.2 | Programa de indicação com bonificação (já é F06) | `✅ Aprovada` | Especificado no planejamento técnico como F06 |
| 4.3 | Aniversário do cliente — mensagem automática no dia do aniversário com cupom de desconto | `💡 Ideia bruta` | Requer coleta de data de nascimento no cadastro. Alto impacto emocional, baixo custo |
| 4.4 | Reativação de clientes inativos — disparo automático para quem não pede há X dias | `💡 Ideia bruta` | Ex: "Sentimos sua falta! Que tal um frete grátis hoje?" Implementar com base ativa |
| 4.5 | Clube de assinatura — cliente paga mensalidade e ganha benefícios fixos (frete grátis, desconto, prioridade) | `💡 Ideia bruta` | Gera receita previsível. Implementar após validar recorrência orgânica primeiro |
| 4.6 | Cashback em crédito — percentual de cada pedido vira crédito para o próximo | `💡 Ideia bruta` | Alternativa à roleta. Mais previsível para o cliente, mais controlável para o negócio |
| 4.7 | Avaliação pós-entrega — mensagem automática 30min após entrega pedindo nota de 1 a 5 | `💡 Ideia bruta` | Gera prova social e alerta problemas de qualidade antes que virem reclamação pública |

---

## Camada 5 — Inteligência do Negócio

| # | Ideia | Status | Timing / Observação |
|---|-------|--------|-------------------|
| 5.1 | Dashboard de vendas — receita do dia, ticket médio, produtos mais pedidos, bairros que mais pedem | `💡 Ideia bruta` | Substitui o "olhar no WhatsApp e contar na cabeça". Implementar a partir de 50 pedidos/mês |
| 5.2 | Relatório de margem por produto — cruza ficha técnica (F04) com volume vendido e mostra lucro real por prato | `💡 Ideia bruta` | Depende de F04 implementado. Revela quais pratos são estrelas e quais são micos |
| 5.3 | Análise de conversão por canal — quantos contatos minerados viraram clientes, qual bairro converte mais | `💡 Ideia bruta` | Depende do campo `origem` sendo preenchido corretamente desde o dia 1 |
| 5.4 | Horário de pico — mapa de calor mostrando os dias e horários com mais pedidos | `💡 Ideia bruta` | Ajuda a dimensionar equipe e estoque por dia da semana |
| 5.5 | Alerta de queda de vendas — notificação automática se o volume cair X% em relação à semana anterior | `💡 Ideia bruta` | Sinaliza problema antes que vire crise. Implementar quando tiver histórico de pelo menos 60 dias |
| 5.6 | LTV por cliente — quanto cada cliente gerou desde a primeira compra, segmentado por origem | `💡 Ideia bruta` | Responde a pergunta mais importante do negócio: qual canal traz o cliente mais valioso? |

---

*Documento vivo — sem data de entrega, sem pressão. É o lugar onde as ideias descansam até a hora certa.*
