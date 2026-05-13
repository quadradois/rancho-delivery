# Sprint 2 — Crescimento: IA de Conversação + Motor Contínuo
**Objetivo:** Fazer o sistema trabalhar sozinho e converter leads automaticamente.
**Pré-requisito:** Sprint 1 concluído.
**Estimativa total:** ~3-4 dias de dev

> **Por que este sprint é o mais importante?**
> Dois dos maiores gargalos hoje são manuais:
> (1) alguém precisa lembrar de rodar a mineração toda semana
> (2) quando um lead responde no WhatsApp, ninguém responde por horas
>
> Este sprint resolve os dois. Com IA respondendo 24/7 e mineração rodando sozinha,
> o sistema começa a gerar valor sem intervenção humana.

---

## Tarefas

---

### S2-T1 — IA de Conversação WhatsApp (Claude API)

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 6h
**Prioridade:** 🔴 Alta — maior ROI do projeto inteiro
**Depende de:** Sprint 1 concluído

#### Contexto e por que isso funciona AGORA

A infraestrutura já está 95% pronta. Hoje acontece o seguinte:

1. Sistema dispara campanha WhatsApp para lead minerado ✅
2. Lead responde "Quanto custa?" no WhatsApp ✅
3. Mensagem chega no webhook `/webhook/whatsapp` ✅
4. Sistema salva na tabela `mensagens_cliente` ✅
5. **Sistema não responde nada** ← o problema

Tudo que precisamos é conectar o passo 5 a um LLM.

#### Variável de ambiente a adicionar
```
ANTHROPIC_API_KEY=sk-ant-...
```
Obter em: https://console.anthropic.com/

#### Instalação
```bash
cd apps/backend
npm install @anthropic-ai/sdk
```

#### Arquivo novo a criar
`apps/backend/src/services/conversacao.service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import prisma from '../config/database';
import evolutionService from './evolution.service';
import { logger } from '../config/logger';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Prompt base do agente — editar conforme identidade da marca
const SYSTEM_PROMPT = `Você é Maria, atendente virtual do Rancho Delivery.
Somos um delivery de marmitas caseiras em Goiânia. Entregamos em até 40 minutos.

Cardápio principal:
- Marmita individual: R$ 18
- Marmita dupla: R$ 32
- Almoço executivo: R$ 22
- Lanche especial: R$ 15
Frete: R$ 5 (grátis no primeiro pedido)

Seu objetivo: apresentar o Rancho de forma amigável, responder dúvidas e
direcionar o cliente para fazer o primeiro pedido via link.

Regras:
- Seja curta e objetiva (máx. 3 linhas por mensagem)
- Nunca invente preços ou horários que não estão aqui
- Se o cliente quiser pedir: informe o link do cardápio
- Se reclamar ou ficar irritado: encerre com "Vou chamar um atendente humano para te ajudar"
  e NÃO continue respondendo (retorne a flag humanRequired: true)
- Nunca diga que é uma IA

Horário de funcionamento: Segunda a Sábado, 10h às 22h. Domingo, 11h às 21h.`;

export interface RespostaIA {
  mensagem: string;
  humanRequired: boolean; // true = transferir para humano
}

export async function responderLead(
  telefone: string,
  mensagemRecebida: string
): Promise<RespostaIA | null> {
  try {
    // Verificar se já é cliente ativo (não precisa de prospecção)
    const cliente = await prisma.cliente.findUnique({
      where: { telefone },
      select: { nome: true, telefone: true },
    });

    // Buscar contexto do lead
    const lead = await prisma.leadMarketing.findFirst({
      where: { telefone },
      select: { nome: true, bairro: true, origemMineracao: true, status: true },
    });

    // Se não é lead nem cliente, ignorar (mensagem não relacionada à campanha)
    if (!lead && !cliente) return null;

    // Se lead já foi convertido, não precisa de IA de prospecção
    if (lead?.status === 'CONVERTIDO') return null;

    // Buscar histórico da conversa (últimas 10 mensagens)
    const historico = await prisma.mensagemCliente.findMany({
      where: { clienteTelefone: telefone },
      orderBy: { criadoEm: 'asc' },
      take: 10,
      select: { origem: true, texto: true, criadoEm: true },
    });

    // Montar mensagens para Claude
    const messages: Anthropic.MessageParam[] = historico.map((m) => ({
      role: m.origem === 'SISTEMA' ? 'assistant' : 'user',
      content: m.texto,
    }));

    // Garantir que a mensagem atual está incluída
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      messages.push({ role: 'user', content: mensagemRecebida });
    }

    const contextualSystem = `${SYSTEM_PROMPT}
${lead ? `\nContexto: você está falando com ${lead.nome || 'um proprietário'} do bairro ${lead.bairro || 'Goiânia'}.` : ''}
${cliente ? `\nContexto: este cliente já comprou conosco antes.` : ''}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', // Haiku = rápido e barato para conversas
      max_tokens: 256,
      system: contextualSystem,
      messages,
    });

    const texto = response.content[0].type === 'text' ? response.content[0].text : '';
    const humanRequired = texto.includes('atendente humano') || texto.includes('humanRequired: true');

    return { mensagem: texto.replace('humanRequired: true', '').trim(), humanRequired };
  } catch (error) {
    logger.error('Erro na IA de conversação:', error);
    return null;
  }
}
```

#### Arquivo a modificar
`apps/backend/src/controllers/webhook.controller.ts`

No método `whatsapp()`, após `clienteService.registrarMensagemRecebida()`:

```typescript
// ADICIONAR após registrar mensagem:
import { responderLead } from '../services/conversacao.service';

// Só responde se for mensagem de texto (não status, não media)
if (telefoneNormalizado && texto && texto.length > 0) {
  // Resposta em background para não atrasar o webhook
  setImmediate(async () => {
    try {
      const resposta = await responderLead(telefoneNormalizado, texto);
      if (resposta && !resposta.humanRequired) {
        await evolutionService.enviarMensagem({
          numero: telefoneNormalizado,
          mensagem: resposta.mensagem,
        });
        // Salvar resposta da IA no histórico
        await clienteService.registrarMensagemRecebida(
          telefoneNormalizado,
          resposta.mensagem,
          'SISTEMA' // origem = SISTEMA indica resposta da IA
        );
      }
      // Se humanRequired: true, a mensagem fica na fila de mensagens não lidas
      // para o operador ver no cockpit
    } catch (err) {
      logger.error('Erro ao responder lead via IA:', err);
    }
  });
}
```

#### Limites de segurança a implementar

Para evitar loops (IA respondendo para si mesma) e gastos excessivos:

1. **Throttle por telefone:** máximo de 1 resposta da IA por número a cada 30s
2. **Máximo de 20 mensagens por conversa:** após isso, sempre transfere para humano
3. **Horário de funcionamento:** fora do horário, IA responde com mensagem de "voltamos às X"
4. **Ignorar grupos WhatsApp:** verificar se `@g.us` no JID e ignorar

#### Critério de aceite
- [ ] Lead responde a campanha → IA responde em < 5s
- [ ] Histórico da conversa é considerado (IA não repete informações)
- [ ] "Quero pedir" → IA envia link do cardápio
- [ ] Resposta agressiva → IA encerra e lead aparece na fila de humano
- [ ] Sem loops (IA respondendo para IA)
- [ ] Custo estimado: < R$ 0,05 por conversa completa (Haiku é ~$0.0008/1K tokens)

---

### S2-T2 — Detecção automática de novos imóveis (motor contínuo)

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 4h
**Prioridade:** 🔴 Alta
**Depende de:** S1-T4 (job assíncrono)

#### Contexto

O banco já tem 704.499 imóveis. A API GIS da Prefeitura atualiza periodicamente com novos
lançamentos, novas matrículas e mudanças de proprietário. Novos moradores têm o MAIOR
intent de contratar um delivery — acabaram de chegar ao bairro.

Hoje ninguém detecta isso. Este job roda toda semana, compara o que veio do GIS com o
que temos no banco, e coloca os novos imóveis na fila de mineração automaticamente.

O `OBJECTID` da Prefeitura é incremental — o maior `OBJECTID` no banco indica até onde
já sincronizamos. Novos registros têm `OBJECTID` maior que o máximo salvo.

#### Arquivo novo a criar
`apps/backend/src/jobs/deteccaoNovosImoveis.job.ts`

```typescript
import cron from 'node-cron';
import prisma from '../config/database';
import mineracaoService from '../services/mineracao.service';
import { logger } from '../config/logger';

export function iniciarDeteccaoNovosImoveis() {
  // Roda toda segunda-feira às 03:00
  cron.schedule('0 3 * * 1', async () => {
    logger.info('[Job] Iniciando detecção de novos imóveis...');

    try {
      // Encontrar maior OBJECTID no banco
      const resultado = await prisma.imovelPrefeitura.aggregate({
        _max: { objectId: true },
      });
      const ultimoObjectId = resultado._max.objectId ?? 0;

      // Buscar imóveis com OBJECTID maior que o último registrado
      const novos = await mineracaoService.sincronizarImoveisPrefeitura({
        limite: 500,
        lote: 100,
        // Internamente o service deve passar: where = `OBJECTID > ${ultimoObjectId}`
        // Ver S2-T2-A para adaptar o service
      });

      if (novos.salvos > 0) {
        logger.info(`[Job] ${novos.salvos} novos imóveis detectados — enfileirando mineração`);

        // Para cada novo imóvel: criar uma execução de mineração automática
        // Agrupa por bairro para eficiência
        const novosImoveis = await prisma.imovelPrefeitura.findMany({
          where: { objectId: { gt: ultimoObjectId } },
          select: { nmbairro: true, nmedificio: true },
          distinct: ['nmedificio'],
          take: 50, // máximo de 50 novos condomínios por semana
        });

        for (const imovel of novosImoveis) {
          if (imovel.nmedificio) {
            // Enfileirar mineração automática do condomínio novo
            await mineracaoService.executarMineracao({
              modo: 'condominio',
              termo: imovel.nmedificio,
              criadoPor: 'JOB_AUTOMATICO',
            });
          }
        }
      } else {
        logger.info('[Job] Nenhum imóvel novo detectado esta semana.');
      }
    } catch (error) {
      logger.error('[Job] Erro na detecção de novos imóveis:', error);
    }
  });

  logger.info('[Job] Detecção de novos imóveis agendada — toda segunda 03:00');
}
```

#### Arquivo a modificar
`apps/backend/src/index.ts` (ou arquivo de inicialização do servidor)

Adicionar no startup:
```typescript
import { iniciarDeteccaoNovosImoveis } from './jobs/deteccaoNovosImoveis.job';

// No final do app.listen():
iniciarDeteccaoNovosImoveis();
```

#### Adaptação necessária no service (S2-T2-A)
Em `mineracao.service.ts`, o método `sincronizarImoveisPrefeitura` precisa aceitar um
parâmetro `objectIdMinimo` para filtrar: `where = \`OBJECTID > ${objectIdMinimo}\``.

#### Critério de aceite
- [ ] Job aparece nos logs toda segunda às 03:00
- [ ] Se não há imóveis novos: log "Nenhum imóvel novo" e encerra
- [ ] Se há novos: mineração é disparada automaticamente
- [ ] Job não trava o servidor (operação assíncrona com timeout de 30min)
- [ ] Erro no job não derruba o servidor (try/catch no nível mais alto)

---

### S2-T3 — Funil de ROI na interface de campanhas

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 4h
**Prioridade:** 🟡 Média
**Depende de:** Nada (dados já existem no banco)

#### Contexto

Os dados de conversão já existem no banco mas ninguém os vê:
- `campanhas_destinatarios.statusEnvio` → ENVIADO / FALHA / IGNORADO_CONVERTIDO
- `leads_marketing.convertidoEm` → quando virou cliente
- `execucoes_mineracao.contatosGerados` vs `contatosUteis`

Este endpoint + UI transforma dados invisíveis em métricas visíveis.

#### Endpoint a criar (backend)
`GET /admin/mineracao/campanhas/:id/metricas`

Resposta esperada:
```json
{
  "campanhaId": "...",
  "nome": "Residencial Ventana - 2026-05-01",
  "totalDestinatarios": 150,
  "enviados": 142,
  "falhas": 8,
  "ignoradosJaClientes": 3,
  "conversoes": 5,
  "taxaConversao": "3.5%",
  "custoEstimadoPorMensagem": 0.05,
  "custoTotal": 7.10,
  "receitaGerada": 450.00,
  "roiMultiplo": "63.4x"
}
```

**Nota:** `receitaGerada` = soma de pedidos dos clientes que vieram desta campanha.
Para calcular: `leads_marketing.clienteTelefone` → `pedidos` WHERE `clienteTelefone`.

#### Arquivo a modificar (frontend)
`apps/frontend/src/app/admin/mineracao/page.tsx`

Na etapa 3 (Resultado), após exibir os leads:
```
┌─────────────────────────────────┐
│  Funil da Campanha               │
│                                 │
│  150 enviados                   │
│   ↓  94.7% entregues            │
│  142 entregues                  │
│   ↓  3.5% converteram           │
│    5 viraram clientes 🎉        │
│                                 │
│  ROI estimado: 63.4x            │
└─────────────────────────────────┘
```

#### Critério de aceite
- [ ] Endpoint retorna dados corretos para campanhas existentes
- [ ] Taxa de conversão = (leads convertidos / enviados) × 100
- [ ] UI exibe funil de forma visual e clara
- [ ] Se não há conversões ainda: exibe "0 conversões até agora — atualiza automaticamente"

---

### S2-T4 — Histórico de execuções no wizard

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 3h
**Prioridade:** 🟢 Baixa
**Depende de:** Nada

#### Contexto

A tabela `execucoes_mineracao` já existe e registra cada mineração, mas não há
nenhuma forma de ver esse histórico na interface. O operador não sabe o que foi
minerado na semana passada.

O endpoint `GET /admin/mineracao/execucoes` já existe no backend — só falta a UI.

#### Arquivo a modificar
`apps/frontend/src/app/admin/mineracao/page.tsx`

Adicionar uma seção "Histórico" abaixo do wizard com:

| Data | Modo | Termo | Total IPTUs | Leads gerados | Status |
|------|------|-------|-------------|---------------|--------|
| 04/05 | Condomínio | Res. Ventana | 259 | 187 | ✅ |
| 03/05 | Bairro | Jardim Goiás | 1.842 | 412 | ✅ |

Campos disponíveis em `ExecucaoMineracao`:
`modo`, `termo`, `status`, `totalImoveis`, `totalIptus`, `contatosGerados`,
`contatosUteis`, `criadoEm`, `campanha` (relação com campanha)

#### Critério de aceite
- [ ] Histórico aparece ao abrir a página (não só após mineração)
- [ ] Ordenado por data decrescente
- [ ] Clique numa execução: abre detalhes e leads daquela mineração
- [ ] Paginação ou "carregar mais" (máx. 20 por página)

---

## Checklist final do Sprint 2

- [ ] S2-T1: IA responde leads no WhatsApp em < 5s
- [ ] S2-T1: Nenhum loop de resposta IA→IA detectado em 72h de operação
- [ ] S2-T2: Job roda toda segunda — confirmado nos logs
- [ ] S2-T3: Funil de ROI visível na UI de campanhas
- [ ] S2-T4: Histórico de execuções visível na página
- [ ] Variável `ANTHROPIC_API_KEY` documentada no `.env.example`
- [ ] Custo da API Claude monitorado (log do total de tokens por dia)

## Notas do dev (preencher ao trabalhar)

```
Data:
Dev:
Observações:


```
