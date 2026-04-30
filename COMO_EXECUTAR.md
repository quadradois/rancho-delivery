# 🚀 Como Executar o SaborExpress

## 📋 Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL instalado e rodando
- pnpm instalado (`npm install -g pnpm`)

## 🗄️ 1. Configurar o Banco de Dados

```bash
# Criar o banco de dados
createdb sabor_express

# Ou via psql
psql -U postgres
CREATE DATABASE sabor_express;
\q
```

## ⚙️ 2. Configurar Variáveis de Ambiente

### Backend (`apps/backend/.env`)
```env
DATABASE_URL="postgresql://postgres:senha@localhost:5432/sabor_express"
PORT=3001
NODE_ENV=development
```

### Frontend (`apps/frontend/.env`)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## 📦 3. Instalar Dependências

```bash
# No diretório raiz do projeto
pnpm install
```

## 🚀 4. Executar o Projeto

### Opção 1: Executar Backend e Frontend Separadamente

**Terminal 1 - Backend:**
```bash
cd apps/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/frontend
npm run dev
```

### Opção 2: Executar Tudo de Uma Vez (Recomendado)

```bash
# No diretório raiz
pnpm run dev
```

## 🌐 Acessar a Aplicação

- **Frontend (Cliente)**: http://localhost:3000
- **Backend (API)**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs (se disponível)

## 🧪 Testar a API

```bash
# Listar produtos
curl http://localhost:3001/api/produtos

# Buscar produto por ID
curl http://localhost:3001/api/produtos/{id}

# Criar pedido
curl -X POST http://localhost:3001/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "clienteNome": "João Silva",
    "clienteTelefone": "11999999999",
    "endereco": {
      "rua": "Rua Exemplo",
      "numero": "123",
      "bairro": "Centro",
      "cep": "01234-567"
    },
    "itens": [
      {
        "produtoId": "uuid-do-produto",
        "quantidade": 2
      }
    ],
    "formaPagamento": "dinheiro"
  }'
```

## 🗃️ Popular o Banco com Dados de Teste

```bash
cd apps/backend
npm run seed
```

## 🧹 Limpar e Reconstruir

```bash
# Limpar node_modules e reinstalar
pnpm clean
pnpm install

# Rebuild do projeto
pnpm run build
```

## 📱 Testar no Mobile

1. Certifique-se de que seu computador e celular estão na mesma rede Wi-Fi
2. Inicie o frontend: `npm run dev`
3. Veja o endereço de rede no terminal (ex: `http://192.168.1.100:3000`)
4. Acesse esse endereço no navegador do celular

## 🐛 Troubleshooting

### Erro de conexão com o banco de dados
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no arquivo `.env`
- Teste a conexão: `psql -U postgres -d sabor_express`

### Erro "Cannot find module"
```bash
pnpm install
```

### Porta já em uso
```bash
# Matar processo na porta 3000
npx kill-port 3000

# Matar processo na porta 3001
npx kill-port 3001
```

### Frontend não conecta com Backend
- Verifique se o backend está rodando em `http://localhost:3001`
- Confirme a variável `NEXT_PUBLIC_API_URL` no `.env` do frontend
- Verifique o console do navegador para erros de CORS

## 📚 Estrutura do Projeto

```
sabor-express/
├── apps/
│   ├── backend/          # API REST (Node.js + Express)
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── routes/
│   │   │   └── models/
│   │   └── package.json
│   │
│   └── frontend/         # Interface do Cliente (Next.js + React)
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── contexts/
│       │   ├── lib/
│       │   └── styles/
│       └── package.json
│
└── packages/
    └── shared/           # Código compartilhado
```

## 🎯 Próximos Passos

1. ✅ Backend funcionando
2. ✅ Frontend integrado com API
3. ⏳ Criar página de checkout
4. ⏳ Implementar rastreamento de pedido
5. ⏳ Criar painel administrativo (CRM)

## 📞 Suporte

Se encontrar problemas, verifique:
1. Logs do backend no terminal
2. Console do navegador (F12)
3. Arquivo `.env` configurado corretamente
4. PostgreSQL rodando
