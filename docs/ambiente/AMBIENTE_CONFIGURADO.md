# Ambiente de Desenvolvimento Configurado

**Data:** 29/04/2026  
**Status:** ✅ Operacional

---

## Serviços Rodando

### Backend API
- **URL:** http://localhost:3001
- **Status:** ✅ Online
- **Health Check:** http://localhost:3001/health
- **Logs:** Terminal 1

### Frontend Web
- **URL:** http://localhost:3000
- **Status:** ✅ Online
- **Logs:** Terminal 2

### Banco de Dados
- **Tipo:** PostgreSQL 15 (Docker)
- **Container:** rancho-delivery-db
- **Host:** localhost:5432
- **Database:** rancho_delivery
- **Status:** ✅ Online

---

## Dados Iniciais (Seed)

### Bairros Cadastrados (5)
- Setor Bueno (R$ 6,00)
- Setor Oeste (R$ 5,00)
- Setor Marista (R$ 7,00)
- Jardim Goiás (R$ 8,00)
- Setor Central (R$ 5,00)

### Produtos Cadastrados (5)
- Marmita Executiva - Frango Grelhado (R$ 24,90)
- Marmita Executiva - Carne Bovina (R$ 27,90)
- Marmita Fit - Salmão (R$ 32,90)
- Marmita Vegetariana (R$ 22,90)
- Refrigerante Lata 350ml (R$ 5,00)

---

## Comandos Úteis

### Iniciar Ambiente
```bash
# Iniciar PostgreSQL (se parado)
docker start rancho-delivery-db

# Iniciar backend e frontend juntos
pnpm dev

# Ou separadamente
pnpm dev:backend   # Terminal 1
pnpm dev:frontend  # Terminal 2
```

### Banco de Dados
```bash
# Visualizar dados no Prisma Studio
pnpm db:studio

# Executar nova migração
pnpm db:migrate

# Resetar banco e executar seed novamente
pnpm --filter @rancho-delivery/backend prisma migrate reset
```

### Qualidade de Código
```bash
# Verificar tipos TypeScript
pnpm typecheck

# Executar linter
pnpm lint

# Formatar código
pnpm format

# Executar testes
pnpm test
```

### Docker
```bash
# Ver logs do PostgreSQL
docker logs rancho-delivery-db

# Parar PostgreSQL
docker stop rancho-delivery-db

# Remover container (dados serão perdidos)
docker rm rancho-delivery-db
```

---

## Próximos Passos

Ambiente configurado com sucesso! Agora você pode:

1. **Acessar o frontend:** http://localhost:3000
2. **Testar a API:** http://localhost:3001/health
3. **Visualizar dados:** `pnpm db:studio`
4. **Começar a desenvolver:** Implementar API de Produtos (F01)

---

## Troubleshooting

### Backend não inicia
- Verificar se PostgreSQL está rodando: `docker ps`
- Verificar variáveis de ambiente: `apps/backend/.env`
- Ver logs de erro no terminal

### Frontend não inicia
- Verificar se porta 3000 está livre
- Limpar cache: `rm -rf apps/frontend/.next`
- Reinstalar dependências: `pnpm install`

### Erro de conexão com banco
- Verificar se container está rodando: `docker ps`
- Testar conexão: `docker exec -it rancho-delivery-db psql -U postgres -d rancho_delivery`
- Verificar DATABASE_URL no .env

---

**Ambiente validado e pronto para desenvolvimento!** 🚀
