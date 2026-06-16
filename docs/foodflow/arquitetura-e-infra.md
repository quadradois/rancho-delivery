# FoodFlow — Arquitetura & Infraestrutura (plataforma multi-restaurante)

**Data:** 2026-06-16 · **Status:** rascunho para revisão · **Método:** Arquitetura de Intenção (decidido socraticamente com o dono)

> Fonte da verdade do desenho. Depois de aprovado, vira plano de execução em fases. Nada implementado ainda.

---

## 1. Intenção (o que o FoodFlow é)

FoodFlow é uma **plataforma SaaS white-label de delivery** (marketing + gestão). A unidade é o **restaurante = uma loja completa e autônoma**. A plataforma não vende comida — ela organiza os restaurantes que vendem.

**Dois andares:**
- **Andar de baixo — App do restaurante (JÁ EXISTE):** cardápio, pedidos, entregas, WhatsApp, campanhas. Usado pelo dono e equipe de cada restaurante.
- **Andar de cima — Plataforma FoodFlow (É O QUE FALTA):** organiza os restaurantes como clientes — cadastro, planos, cobrança, ativar/suspender, módulos, marketplace.

Analogia: **FoodFlow = shopping; cada restaurante = uma loja**. Você administra o shopping; cada lojista administra a loja dele. **Rancho = só mais uma loja.**

---

## 2. Decisões travadas (fundação)

| # | Tema | Decisão |
|---|---|---|
| 1 | Como o FoodFlow cobra | **Mensalidade** por plano (restaurante → FoodFlow) |
| 2 | O que é "módulo" | **Interruptor** (função que já existe, liga/desliga por restaurante) |
| 3 | Isolamento de dados | **Banco único + trava no banco (RLS)**; saída: mover cliente gigante p/ banco próprio depois |
| 4 | Conta | **1 restaurante = 1 conta** (dono com 3 lojas = 3 contas/3 chaves) |
| 5 | Carro-chefe | **AURA** — assistente (copiloto) externo, em Python (evoluído do `genesis`), integrado por **API** |
| 6 | Provedor da assinatura | **Mercado Pago** |
| 7 | Gateway de pagamento de pedidos | **Plugável** (MP hoje; Asaas legado; futuro: restaurante escolhe) |
| 8 | Onboarding | **Híbrido**: FoodFlow cria/acompanha (super-admin) **e** restaurante pode se virar |
| 9 | Canais do AURA | Os três; **começa pela interface desktop própria** (Windows), depois painel e WhatsApp |
| 10 | Planos & preços | **Dinâmicos** — construtor no painel (módulos = catálogo; plano = cesta de módulos + preço). **Nada hardcoded** |
| 11 | Distribuição do AURA | App **desktop** baixado pelo painel + **pareamento** (login/QR) → roda na máquina do dono (não hospedamos por cliente) |
| 12 | Modelo de negócio | **Freemium** — Básico grátis (cardápio/produtos/pagamento/entregas); Premium pago (AURA + domínio próprio). Não pagar = rebaixa pro grátis (loja nunca sai do ar) |
| 13 | Marketplace | **Planos (combos de módulos) + módulos avulsos**; Premium é um combo. Acesso = módulos do plano ∪ avulsos |

---

## 3. Onde estamos (AS-IS) → para onde vamos (TO-BE)

**AS-IS (verificado no código):**
- Multi-tenant ~70% pronto: `tenant_id` em 26 tabelas + guard (`$extends`) + uniques por tenant + auth multi-tenant (JWT com tenantId).
- **Rancho é o tenant privilegiado:** `TENANT_PADRAO = 'rancho'` é o fallback de tudo (host desconhecido, webhooks, jobs, login via .env). O tenant `rancho` nem tem domínio cadastrado — só funciona por cair no fallback.
- **Marca hardcoded:** ~264 ocorrências de "Rancho" no código; nome/logo/cores fixos (não vêm do cadastro).
- **Tenants são cascas vazias** (sem cardápio/config) — criados via SQL, sem onboarding.
- **Não existe:** painel do FoodFlow (control plane), API por loja, renderização white-label, cobrança de assinatura.

**TO-BE:**
- Tenant resolvido sempre explícito (sem privilégio); Rancho = uma linha igual às outras.
- Marca vem do cadastro de cada restaurante (white-label de verdade).
- Painel do FoodFlow (control plane) com gestão de contas, planos, cobrança, módulos, marketplace.
- API por loja (a porta do AURA e de integrações futuras).
- Isolamento reforçado no banco (RLS).

---

## 4. Modelo de domínio (a espinha)

**Conta (restaurante) → Assinatura (Plano + extras) → Entitlements (módulos liberados + limites) → Estado da conta**

- **Conta** = um restaurante (marca, domínio, dados, equipe).
- **Plano** = pacote de módulos + limites + preço mensal.
- **Módulo** = um interruptor de funcionalidade.
- **Entitlements** = o conjunto de módulos/limites que a conta tem ativos AGORA (do plano + extras do marketplace). É o que o sistema consulta pra liberar/bloquear.
- **Estado da conta** = a chave geral (ver §8).

A regra de ouro: **toda funcionalidade pergunta "essa conta tem direito?"** (entitlement) antes de rodar — no backend (bloqueia) e no frontend (esconde).

---

## 5. Catálogo de módulos

| Grupo | Módulos | Padrão |
|---|---|---|
| **Base** (todo plano) | Cardápio · Pedidos · Pagamentos | sempre ligado |
| **Operação** | Entregas & Motoboys | base ou extra |
| **Gestão** | Relatórios/Dashboard · Clientes/CRM | base |
| **Carro-chefe** | **AURA** (Atendente IA · Prospecção/Mineração · Campanhas — cada um ligável dentro do módulo) | extra (marketplace) |

**Marketplace** = ligar módulos extras além do plano (uns inclusos, outros pagos).

---

## 6. AURA — o assistente (carro-chefe)

**O que é:** copiloto de IA do dono + atendente do cliente + motor de marketing. "Só o assistente" — quem guarda dados e executa é o FoodFlow; o AURA **pede e comanda** pela API.

**Exemplos (copiloto do dono):**
- "Pedido #212545 pronto — chamo o motoboy?"
- "Pedido #2356488 (Eliézer Barbosa) atrasado — aviso o cliente?"
- "Me dá o relatório de hoje da Loja 2."

**Origem:** evoluído do repo `genesis` (assistente agêntico em Python — planejador/executor, memória, cliente LLM, CRM/leads, web UI FastAPI + desktop pywebview).
- ✅ **Aproveita:** cérebro (planejador/executor/memória/LLM), CRM/leads, servidor web, shell desktop.
- 🔄 **Adapta:** persona Nox (assistente de PC) → **AURA** (assistente de restaurante); repontar do imobiliário pro delivery.
- 🗑️ **Descarta:** controle de PC, jogos, voos, visão de tela.

**Integração:** roda à parte (serviço Python) e fala com o FoodFlow **só pela API** (§7). O dono pluga **uma chave por loja** no AURA.

**Canais:** (1) **interface desktop própria** (Windows, já existe no genesis) → primeiro; (2) chat dentro do painel FoodFlow; (3) WhatsApp do dono.

---

## 7. API da plataforma (a porta) — *proposta*

A funcionalidade nova que destrava o AURA e qualquer integração futura.

- **Autenticação:** **chave de API por conta/loja** (1 loja = 1 chave). Revogável, com escopo/permissões.
- **3 capacidades:**
  1. **Ler** — pedidos, status, relatórios, clientes.
  2. **Agir** — aceitar pedido, mandar pra cozinha, chamar motoboy, avisar cliente (ações com permissão).
  3. **Eventos** — "pedido novo", "pedido atrasado" → empurrados pro AURA (webhook ou websocket), pra ele ser proativo.
- **Primeiro cliente da API:** o AURA. Mas a API é um ativo da plataforma (não é "a API do AURA").
- **Recomendação:** REST + chave de API + webhooks de eventos (simples, padrão, fácil de consumir).

---

## 8. Modelo de negócio, cobrança e estados (FECHADO — freemium)

**Modelo: FREEMIUM.** Básico grátis pra sempre; cobra-se só o Premium.
- **Básico (grátis):** Cardápio, Cadastro de Produtos, Gateway de Pagamento, Entregas.
- **Premium (pago, mensal):** Módulo **AURA** (IA: atendente + prospecção + campanhas) + **Domínio próprio**.
- São os 2 primeiros planos criados no **construtor de planos** (não hardcoded — dá pra criar outros depois).

**Dois fluxos de dinheiro (NÃO confundir):**
1. **Restaurante → FoodFlow (assinatura Premium):** mensalidade via **Mercado Pago** (recorrente).
2. **Cliente → Restaurante (pedido):** pagamento da comida — camada **plugável de gateway** (MP hoje, Asaas legado, futuro: restaurante escolhe).

**Estados da conta (adaptado ao freemium):**
- **Ativa** — no grátis OU no Premium pago. *(a loja sempre funciona)*
- **Inadimplente** — Premium falhou; período de graça (ainda com Premium + aviso).
- **Rebaixada → grátis** — não regularizou: perde AURA + domínio próprio, **mas a loja básica continua no ar**. ⚠️ **Não existe "loja offline por falta de pagamento".**
- **Cancelada** — encerrou; dados retidos por um tempo e depois apagados.
- Suspensão TOTAL só para abuso/violação de termos (fora de escopo agora).
- **Controle no nível de MÓDULO** (entitlements), não da conta inteira: webhook do Mercado Pago liga/desliga o **Premium**, não a loja. Casa com "módulo = interruptor".

**Trial:** em análise — no freemium o básico grátis já é o "teste infinito"; um trial do Premium (ex.: 14 dias) fica como tática opcional de marketing.

**Marketplace (FECHADO — planos + módulos avulsos):**
- **Módulo** = unidade com **preço próprio** (vendável avulso).
- **Plano** = **combo de módulos** com preço de pacote (Premium = AURA + domínio próprio + …), normalmente mais barato que somar os avulsos.
- **Entitlements (o que a loja tem)** = módulos do plano **∪** módulos avulsos adicionados.
- **Marketplace** = vitrine onde a loja liga **planos (combos)** e **módulos avulsos**.
- **Cobrança** = soma (plano + avulsos), recorrente via Mercado Pago.

---

## 9. Isolamento & segurança — *proposta*

- **Banco único + RLS:** cada linha tem o dono (tenant_id) e o **Postgres** barra ver linha de outro (não depende só do código). É o "encanador" do isolamento, sem gambiarra.
- **Hoje:** existe a etiqueta (tenant_id) + guard no código; **falta a trava no banco (RLS)** — é o item de segurança nº 1.
- **Saída de escala:** cliente gigante/contratual → movido pra banco próprio sem reescrever o resto.

---

## 10. White-label, domínios & painéis (FECHADO)

**Mapa de domínios/painéis:**

| Endereço | Quem usa | O quê | Marca |
|---|---|---|---|
| `foodflow.ia.br` | visitante/prospect | site institucional da plataforma | FoodFlow |
| `admin.foodflow.ia.br` | **dono do FoodFlow** | control plane: contas, planos, cobrança, negócio | FoodFlow |
| `app.foodflow.ia.br` | dono de restaurante | painel da loja (módulos) | genérica |
| `app.{domínio}` (ex.: `app.rancho.delivery`) | dono de restaurante | **mesmo painel, branded** (white-label) | do restaurante |
| `{domínio}` / `{slug}.foodflow.ia.br` (ex.: `rancho.delivery`) | cliente final | pedir comida | do restaurante |

**Regras que caem do mapa:**
- `admin.` = control plane (sempre marca **FoodFlow**).
- `app.` = painel do restaurante (**white-label** — marca da loja).
- raiz do domínio = site de pedir comida (white-label).
- **Resolução de tenant:** olha o host, **remove o `app.`**, acha o restaurante pelo resto (`app.rancho.delivery` → rancho) e aplica a marca.

**White-label (a marca vem do cadastro):**
- Nome, logo e cor principal vêm dos campos `nome`/`logoUrl`/`tema` (já existem no banco, hoje vazios/ignorados). O frontend busca a marca da loja por host (endpoint público) e aplica.
- Mínimo: nome + logo + cor principal (depois: banner, fonte).

**Domínios & certificado:**
- Temporário `slug.foodflow.ia.br` ✅ já resolve.
- Domínio próprio: resolve ✅ (falta tela pra cadastrar). **Certificado automático via Let's Encrypt** (grátis), cobrindo **`rancho.delivery` E `app.rancho.delivery`**. (Cloudflare for SaaS = opção paga futura.)

---

## 11. Control Plane — o painel do FoodFlow — *proposta*

O "andar de cima". Funções: criar restaurante, criar o login do dono, definir plano, ativar/suspender, ver cobrança, configurar marketplace, visão de todos os restaurantes.
- **Papel novo:** super-admin (dono do FoodFlow), acima dos admins de restaurante.
- **Onde mora (FECHADO):** `admin.foodflow.ia.br` — porta própria, marca **FoodFlow**, **separada do painel do restaurante** (`app.*`). Mesmo sistema/infra, mas áreas e permissões bem separadas por papel (super-admin × dono de restaurante). Ver §10.
- **Onboarding híbrido:** super-admin cria + futuro auto-cadastro.

---

## 12. De-privilegiar o Rancho — *proposta*

1. Cadastrar `dominio = 'rancho.delivery'` no tenant rancho (passa a resolver como qualquer um).
2. Tornar a resolução **estrita**: host desconhecido = erro claro, não "vira rancho".
3. **Webhooks e jobs** passam o tenant explícito (hoje caem no rancho).
4. Trocar todas as ~264 marcas hardcoded por dado do cadastro (white-label, §10).
5. Login admin sempre com tenant no token (remover o atalho do `.env` que gera token sem tenant).

---

## 13. Roteiro em fases (sem gambiarra, cada fase entregável)

1. **Isolamento de verdade (RLS)** — base de segurança antes de abrir pra mais gente.
2. **White-label** — marca por restaurante (endpoint de branding + frontend + de-hardcode do "Rancho").
3. **De-privilegiar o Rancho** — domínio próprio + resolução estrita + tenant em webhooks/jobs.
4. **Control Plane (MVP)** — criar/ativar/suspender restaurante + criar login do dono (acaba com o SQL na mão).
5. **Planos, módulos & estados** — entitlements + bloqueio por módulo/estado.
6. **Cobrança (Mercado Pago)** — assinatura recorrente + estados via webhook.
7. **API da plataforma** — chave por loja + ler/agir/eventos.
8. **AURA** — adaptar o genesis, conectar na API, canal desktop primeiro.
9. **Marketplace + domínio próprio (cert automático) + gateway plugável** — refinamentos.

---

## 14. Decisões — fechadas (revisão 2026-06-16)

- [x] **Planos:** dinâmicos (construtor no painel; módulos como catálogo).
- [x] **Painéis:** `admin.foodflow.ia.br` = control plane (você, marca FoodFlow); `app.foodflow.ia.br` + `app.{domínio}` = painel do restaurante (white-label); raiz do domínio = site de pedido. Ver §10.
- [x] **Certificado de domínio próprio:** Let's Encrypt automático (grátis); Cloudflare for SaaS = opção paga futura.
- [x] **AURA:** desktop do dono; baixado pelo painel + pareamento (login/QR); não hospedamos por cliente.
- [x] **Modelo de negócio:** freemium — Básico grátis · Premium pago (AURA + domínio próprio). Não pagar = rebaixa pro grátis (loja nunca cai). Ver §8.
- [~] **Trial do Premium:** em análise (no freemium o básico grátis já é o "teste infinito"; trial vira tática de marketing opcional).

> Pendências de **negócio** (não travam a arquitetura): preço e composição de cada plano — você monta no construtor de planos quando quiser.
