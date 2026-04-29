# Sabor Express

Sistema web completo para restaurante delivery-only com foco em conversão, retenção e operação eficiente.

## Visão Geral

**Sabor Express** é uma plataforma de delivery que integra site de pedidos, agente WhatsApp inteligente, mineração de contatos, sistema de retenção e programa de indicação. O projeto é construído em fases incrementais, priorizando validação comercial antes de complexidade técnica.

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     SABOR EXPRESS                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │   Backend    │  │   Database   │      │
│  │  (Mobile 1º) │  │   REST API   │  │  PostgreSQL  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              INTEGRAÇÕES EXTERNAS                     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  • Asaas (Gateway de Pagamento)                      │   │
│  │  • Evolution API (WhatsApp)                          │   │
│  │  • Assertiva (Mineração de Contatos)                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Funcionalidades por Fase

### Fase 1 — Base Operacional
- **F01: Site de Pedidos**
  - Cardápio em feed vertical (scroll snap)
  - Carrinho de compras
  - Checkout com validação de bairro e taxa
  - Integração com Asaas (pagamento)
  - Notificação via WhatsApp para o dono
  - Painel administrativo (produtos e bairros)

### Fase 2 — Canais de Aquisição
- **F02: Mineração de Contatos**
  - Pipeline de captação via Assertiva
  - Registro automático com origem rastreável
- **F03: Agente WhatsApp**
  - Inbound: atendimento automatizado
  - Outbound: abordagem de leads e campanhas

### Fase 3 — Gestão Financeira
- **F04: Ficha Técnica e Precificação**
  - Cálculo de custo por produto
  - Análise de margem de lucro
  - Sugestão de preços

### Fase 4 — Retenção e Crescimento
- **F05: Roleta de Promoções**
  - Gamificação pós-pedido
  - Disparos automáticos via WhatsApp
- **F06: Programa de Indicação**
  - Link único por cliente
  - Bonificação via roleta
  - Rastreamento de conversão

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React/Next.js (mobile-first) |
| Backend | Node.js + Express/Fastify |
| Banco de Dados | PostgreSQL |
| Pagamento | Asaas API |
| WhatsApp | Evolution API |
| Hospedagem | A definir |
| CI/CD | GitHub Actions |

## Estrutura do Projeto

```
sabosexprex/
├── docs/                           # Documentação do projeto
│   ├── PLANEJAMENTO_SABOR_EXPRESS.md
│   ├── GUARDIAO_SABOR_EXPRESS.md
│   ├── SOP_MINERACAO_CONTATOS.md
│   └── BRAINSTORM_SABOR_EXPRESS.md
├── backlog/                        # Gestão de tarefas
├── src/
│   ├── frontend/                   # Aplicação web
│   ├── backend/                    # API REST
│   └── shared/                     # Código compartilhado
├── tests/                          # Testes automatizados
├── .github/
│   └── workflows/
│       ├── ci-backend.yml
│       └── ci-frontend.yml
├── CHANGELOG.md                    # Histórico de versões
└── README.md                       # Este arquivo
```

## Workflow de Desenvolvimento

### Regras Inegociáveis

1. **100% em Português Brasileiro** — código, commits, documentação, comentários
2. **Validação antes de construção** — nenhuma funcionalidade sem critério de pronto
3. **Uma fase por vez** — não iniciar F2 antes de F1 validada em produção
4. **Mobile-first** — toda interface é pensada para celular primeiro

### Protocolo de Implementação

Toda nova implementação segue este fluxo obrigatório:

#### 1. Análise Pré-Implementação
Antes de escrever qualquer código:

```bash
# Verificar estado atual do projeto
git status
git log --oneline -10

# Analisar código existente relacionado
# Usar ferramentas de busca para entender contexto
```

**Checklist de Análise:**
- [ ] Li o código relacionado à funcionalidade
- [ ] Entendi as convenções do projeto (nomenclatura, estrutura, padrões)
- [ ] Identifiquei dependências e integrações necessárias
- [ ] Verifiquei se existe código reutilizável

#### 2. Planejamento
Criar checklist detalhado da implementação:

```markdown
## [NOME_DA_FUNCIONALIDADE]

### Objetivo
[Descrição clara do que será implementado]

### Critério de Pronto
- [ ] Requisito 1
- [ ] Requisito 2
- [ ] Testes passando
- [ ] Documentação atualizada

### Tarefas Técnicas
- [ ] Tarefa 1
- [ ] Tarefa 2
- [ ] Tarefa 3

### Validação
- [ ] Testado localmente
- [ ] Testado em ambiente de staging
- [ ] Aprovado pelo responsável
```

#### 3. Implementação
Durante o desenvolvimento:

- **Commits atômicos** — um commit por funcionalidade lógica
- **Mensagens descritivas** — formato: `tipo(escopo): descrição`
  - `feat(cardapio): adiciona scroll snap no feed de produtos`
  - `fix(checkout): corrige cálculo de taxa por bairro`
  - `refactor(api): reorganiza estrutura de controllers`
  - `docs(readme): atualiza instruções de instalação`
  - `test(pedidos): adiciona testes de integração`

- **Atualização contínua do checklist** — marcar tarefas conforme conclusão
- **Testes durante desenvolvimento** — não deixar para o final

#### 4. Validação Pré-Commit

Antes de cada commit:

```bash
# Executar linter
npm run lint

# Executar testes
npm run test

# Verificar build
npm run build
```

**Checklist Pré-Commit:**
- [ ] Código sem erros de lint
- [ ] Todos os testes passando
- [ ] Build executado com sucesso
- [ ] Sem console.log ou código de debug
- [ ] Comentários em português

#### 5. Commit e Push

```bash
# Adicionar arquivos específicos (evitar git add .)
git add src/caminho/arquivo.ts

# Commit com mensagem descritiva
git commit -m "feat(escopo): descrição clara da mudança"

# Push para branch de feature
git push origin feature/nome-da-funcionalidade
```

#### 6. Finalização da Demanda

Ao concluir a implementação completa:

**a) Verificação Final:**
- [ ] Todos os itens do checklist concluídos
- [ ] Testes de integração passando
- [ ] Documentação atualizada
- [ ] CHANGELOG.md atualizado

**b) Versionamento Semântico:**

Seguimos [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** (X.0.0) — mudanças incompatíveis na API
- **MINOR** (0.X.0) — novas funcionalidades compatíveis
- **PATCH** (0.0.X) — correções de bugs

```bash
# Atualizar versão no package.json
npm version patch  # ou minor, ou major

# Criar tag
git tag -a v1.2.3 -m "Versão 1.2.3 - Descrição"
git push origin v1.2.3
```

**c) Atualizar CHANGELOG.md:**

```markdown
## [1.2.3] - 2026-04-29

### Adicionado
- Feed vertical com scroll snap no cardápio
- Validação de bairro no checkout

### Modificado
- Melhorado cálculo de taxa de entrega

### Corrigido
- Bug no carrinho ao remover último item

### Removido
- Código legado de versão anterior
```

**d) Pull Request:**

```bash
# Criar PR via GitHub CLI
gh pr create --title "feat: implementa feed vertical no cardápio" \
             --body "Implementa F01 - Cardápio com scroll snap

## Mudanças
- Adiciona CSS scroll snap
- Implementa feed vertical
- Ajusta layout mobile

## Testes
- [x] Testado em Chrome mobile
- [x] Testado em Safari iOS
- [x] Testes automatizados passando

## Checklist
- [x] Código revisado
- [x] Documentação atualizada
- [x] CHANGELOG atualizado
- [x] Testes passando"
```

#### 7. Code Review

Antes de aprovar PR:
- [ ] Código segue padrões do projeto
- [ ] Testes cobrem casos principais
- [ ] Documentação está clara
- [ ] Sem código comentado ou debug
- [ ] Performance adequada

#### 8. Deploy

Após merge na branch principal:

```bash
# CI/CD executa automaticamente:
# 1. Testes
# 2. Build
# 3. Deploy para staging
# 4. Testes de fumaça
# 5. Deploy para produção (se aprovado)
```

## CI/CD Pipeline

### Backend Workflow (`.github/workflows/ci-backend.yml`)

```yaml
name: CI Backend

on:
  push:
    branches: [main, develop]
    paths:
      - 'src/backend/**'
      - 'tests/backend/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'src/backend/**'
      - 'tests/backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sabor_express_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Instalar dependências
        run: npm ci
      
      - name: Executar linter
        run: npm run lint:backend
      
      - name: Executar testes
        run: npm run test:backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sabor_express_test
      
      - name: Build
        run: npm run build:backend
      
      - name: Verificar cobertura de testes
        run: npm run test:coverage
        
  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy para Staging
        run: echo "Deploy para staging"
        
  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy para Produção
        run: echo "Deploy para produção"
```

### Frontend Workflow (`.github/workflows/ci-frontend.yml`)

Similar ao backend, adaptado para testes de frontend.

## Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- PostgreSQL 15+
- npm ou yarn

### Instalação

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/sabor-express.git
cd sabor-express

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Executar migrações
npm run migrate

# Iniciar em desenvolvimento
npm run dev
```

### Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sabor_express

# Asaas
ASAAS_API_KEY=seu_api_key
ASAAS_WEBHOOK_URL=https://seudominio.com.br/webhook/asaas

# Evolution API
EVOLUTION_API_URL=https://sua-instancia.evolution.api
EVOLUTION_API_KEY=seu_api_key

# WhatsApp
WHATSAPP_DONO=5562999999999

# App
NODE_ENV=development
PORT=3000
```

## Testes

```bash
# Executar todos os testes
npm run test

# Testes com cobertura
npm run test:coverage

# Testes em modo watch
npm run test:watch

# Testes de integração
npm run test:integration

# Testes E2E
npm run test:e2e
```

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento
npm run dev:frontend     # Apenas frontend
npm run dev:backend      # Apenas backend

# Build
npm run build            # Build completo
npm run build:frontend   # Build frontend
npm run build:backend    # Build backend

# Testes
npm run test             # Executa testes
npm run test:watch       # Testes em modo watch
npm run test:coverage    # Testes com cobertura

# Qualidade de código
npm run lint             # Executa linter
npm run lint:fix         # Corrige problemas automaticamente
npm run format           # Formata código com Prettier

# Database
npm run migrate          # Executa migrações
npm run migrate:rollback # Reverte última migração
npm run seed             # Popula banco com dados de teste
```

## Documentação Adicional

- [Planejamento Completo](./docs/PLANEJAMENTO_SABOR_EXPRESS.md) — especificação detalhada de todas as funcionalidades
- [Guardião do Projeto](./docs/GUARDIAO_SABOR_EXPRESS.md) — filtro de viabilidade comercial
- [SOP Mineração](./docs/SOP_MINERACAO_CONTATOS.md) — processo de captação de leads
- [Brainstorm](./docs/BRAINSTORM_SABOR_EXPRESS.md) — ideias em análise

## Modelo de Dados Principal

### Cliente (Entidade Central)

```typescript
interface Cliente {
  telefone: string;        // PK - identificador único
  nome: string;
  endereco: string;
  bairro: string;
  origem: 'SITE' | 'WHATSAPP' | 'MINERACAO' | 'INDICACAO' | 'CAMPANHA';
  criadoEm: Date;
}
```

### Produto

```typescript
interface Produto {
  id: string;
  nome: string;
  preco: number;
  midia: string;           // URL da foto/vídeo
  descricao: string;
  categoria: string;
  disponivel: boolean;
  ordem: number;           // Ordem no feed
}
```

### Pedido

```typescript
interface Pedido {
  id: string;
  clienteTelefone: string; // FK
  itens: ItemPedido[];
  subtotal: number;
  taxaEntrega: number;
  total: number;
  status: 'PENDENTE' | 'CONFIRMADO' | 'PREPARANDO' | 'ENTREGUE' | 'CANCELADO';
  pagamentoId: string;     // ID do Asaas
  observacao?: string;
  criadoEm: Date;
}
```

## Integrações

### Asaas (Pagamento)

Webhook configurado em: `POST /webhook/asaas`

Payload esperado:
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

### Evolution API (WhatsApp)

Endpoints utilizados:
- `POST /message/sendText` — envio de mensagens
- `POST /message/sendMedia` — envio de mídia
- `GET /instance/connectionState` — status da conexão

## Segurança

- Validação de entrada em todos os endpoints
- Sanitização de dados do usuário
- Rate limiting em APIs públicas
- Autenticação JWT para painel admin
- Webhooks validados por assinatura
- Variáveis sensíveis apenas em .env (nunca no código)
- HTTPS obrigatório em produção

## Performance

- Cache de cardápio (Redis)
- Otimização de imagens (WebP, lazy loading)
- CDN para assets estáticos
- Índices no banco de dados
- Paginação em listagens
- Compressão gzip/brotli

## Monitoramento

- Logs estruturados (Winston/Pino)
- Métricas de performance (Prometheus)
- Alertas de erro (Sentry)
- Uptime monitoring
- Analytics de conversão

## Contribuindo

1. Leia o [Guardião do Sabor Express](./docs/GUARDIAO_SABOR_EXPRESS.md)
2. Verifique se a funcionalidade passa no filtro de viabilidade
3. Crie uma branch: `git checkout -b feature/nome-da-funcionalidade`
4. Siga o protocolo de implementação descrito acima
5. Faça commit das mudanças: `git commit -m 'feat(escopo): descrição'`
6. Push para a branch: `git push origin feature/nome-da-funcionalidade`
7. Abra um Pull Request

## Licença

Proprietary — Todos os direitos reservados

## Contato

- Projeto: Sabor Express
- Documentação: `./docs/`
- Issues: GitHub Issues

---

**Versão atual:** 0.1.0 (Fase 1 em desenvolvimento)

**Última atualização:** 29/04/2026
