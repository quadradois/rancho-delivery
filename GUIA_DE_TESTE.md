# 🧪 GUIA DE TESTE - SaborExpress

## 🎯 Fluxo Completo de Compra

### **Passo 1: Iniciar o Sistema**

**Terminal 1 - Backend:**
```bash
cd apps/backend
npm run dev
```
✅ Aguarde: `🚀 Servidor rodando na porta 3001`

**Terminal 2 - Frontend:**
```bash
cd apps/frontend
npm run dev
```
✅ Aguarde: `✓ Ready in 2.5s`

---

## 📱 TESTANDO O FLUXO DE COMPRA

### **1. Página Home (Cardápio)**
🌐 Acesse: **http://localhost:3000**

**O que testar:**
- ✅ Banner promocional aparece
- ✅ Filtros de categoria funcionam
- ✅ Produtos carregam da API
- ✅ Botão "Adicionar ao Carrinho" funciona
- ✅ Contador no ícone do carrinho atualiza
- ✅ Toast de confirmação aparece

**Ações:**
1. Clique em diferentes categorias
2. Adicione 2-3 produtos ao carrinho
3. Observe o contador aumentar

---

### **2. Página do Carrinho**
🌐 Acesse: **http://localhost:3000/cart**

**O que testar:**
- ✅ Lista de itens aparece
- ✅ Botões +/- alteram quantidade
- ✅ Total é calculado corretamente
- ✅ Taxa de entrega é exibida
- ✅ Botão "Finalizar Pedido" está ativo

**Ações:**
1. Aumente/diminua quantidade dos itens
2. Verifique se o total atualiza
3. Clique em "Finalizar Pedido"

---

### **3. Checkout - Etapa 1: Endereço**
🌐 Acesse: **http://localhost:3000/checkout**

**O que testar:**
- ✅ Formulário de endereço aparece
- ✅ Validação de campos obrigatórios
- ✅ Busca de CEP funciona (ViaCEP)
- ✅ Campos são preenchidos automaticamente
- ✅ Máscara de telefone funciona
- ✅ Botão "Continuar" avança para próxima etapa

**Dados de Teste:**
```
Nome: João Silva
Telefone: (11) 99999-9999
Email: joao@email.com
CEP: 01310-100 (Av. Paulista, São Paulo)
Número: 1000
Complemento: Apto 45
Bairro: Bela Vista (preenchido automaticamente)
Ponto de Referência: Próximo ao MASP
```

**Ações:**
1. Preencha todos os campos
2. Digite o CEP e aguarde buscar endereço
3. Clique em "Continuar"

---

### **4. Checkout - Etapa 2: Pagamento**

**O que testar:**
- ✅ Opções de pagamento aparecem
- ✅ Seleção de forma de pagamento funciona
- ✅ Campo de troco aparece para "Dinheiro"
- ✅ Botão "Continuar" avança para revisão

**Ações:**
1. Selecione "PIX" ou "Dinheiro"
2. Se escolher "Dinheiro", informe valor para troco
3. Clique em "Continuar"

---

### **5. Checkout - Etapa 3: Revisão**

**O que testar:**
- ✅ Dados de entrega estão corretos
- ✅ Forma de pagamento está correta
- ✅ Lista de itens está completa
- ✅ Total está correto
- ✅ Botão "Confirmar Pedido" funciona

**Ações:**
1. Revise todos os dados
2. Clique em "Confirmar Pedido"
3. Aguarde processamento

---

### **6. Página de Confirmação/Rastreamento**
🌐 Acesso automático após confirmar pedido

**O que testar:**
- ✅ Mensagem de sucesso aparece
- ✅ Número do pedido é exibido
- ✅ Status tracker mostra progresso
- ✅ Endereço de entrega está correto
- ✅ Itens do pedido estão listados
- ✅ Resumo de pagamento está correto
- ✅ Tempo estimado é exibido

**Ações:**
1. Anote o número do pedido
2. Observe o status tracker
3. Verifique todos os detalhes

---

## 🔄 TESTANDO ATUALIZAÇÃO DE STATUS

### **Simular Mudança de Status (via Backend)**

```bash
# No terminal do backend, use o Prisma Studio
cd apps/backend
npx prisma studio
```

1. Abra a tabela `Pedido`
2. Encontre seu pedido pelo número
3. Altere o campo `status` para:
   - `confirmado` → Pedido confirmado
   - `preparando` → Em preparo
   - `saiu_entrega` → A caminho
   - `entregue` → Entregue

4. Volte para a página do pedido e veja o status atualizar (atualiza a cada 30 segundos)

---

## 🧪 CASOS DE TESTE

### **Teste 1: Carrinho Vazio**
1. Acesse `/cart` sem adicionar produtos
2. ✅ Deve mostrar mensagem "Carrinho Vazio"
3. ✅ Botão "Ver Cardápio" deve funcionar

### **Teste 2: CEP Inválido**
1. No checkout, digite CEP: `00000-000`
2. ✅ Deve mostrar erro "CEP não encontrado"

### **Teste 3: Campos Obrigatórios**
1. No checkout, deixe campos vazios
2. Clique em "Continuar"
3. ✅ Deve mostrar erros de validação

### **Teste 4: Múltiplos Produtos**
1. Adicione 5+ produtos diferentes
2. Vá para o carrinho
3. ✅ Todos devem aparecer corretamente
4. ✅ Total deve estar correto

### **Teste 5: Filtros de Categoria**
1. Na home, clique em cada categoria
2. ✅ Produtos devem filtrar corretamente
3. ✅ "Todos" deve mostrar todos os produtos

---

## 📊 CHECKLIST COMPLETO

### **Funcionalidades Implementadas:**
- ✅ Listagem de produtos com filtros
- ✅ Adicionar produtos ao carrinho
- ✅ Gerenciar quantidade no carrinho
- ✅ Remover itens do carrinho
- ✅ Cálculo automático de totais
- ✅ Checkout em 3 etapas
- ✅ Validação de formulários
- ✅ Busca de CEP automática
- ✅ Cálculo de taxa de entrega
- ✅ Múltiplas formas de pagamento
- ✅ Criação de pedido na API
- ✅ Página de confirmação
- ✅ Rastreamento de pedido
- ✅ Status tracker visual
- ✅ Atualização automática de status
- ✅ Sistema de notificações (Toast)
- ✅ Loading states
- ✅ Error handling
- ✅ Design responsivo

### **Páginas Criadas:**
- ✅ `/` - Home (Cardápio)
- ✅ `/cart` - Carrinho
- ✅ `/checkout` - Checkout (3 etapas)
- ✅ `/pedido/[id]` - Rastreamento

---

## 🐛 TROUBLESHOOTING

### **Produtos não carregam**
```bash
# Verifique se o backend está rodando
curl http://localhost:3001/api/produtos

# Se retornar erro, verifique o banco de dados
cd apps/backend
npx prisma studio
```

### **Erro ao criar pedido**
1. Verifique se o backend está rodando
2. Verifique se há produtos no banco
3. Veja o console do navegador (F12)
4. Veja os logs do backend no terminal

### **CEP não encontra endereço**
- Use CEPs válidos de São Paulo
- Exemplos: `01310-100`, `04543-907`, `05508-000`

### **Taxa de entrega não calcula**
- Certifique-se de que há bairros cadastrados no banco
- Verifique a tabela `Bairro` no Prisma Studio

---

## 📸 SCREENSHOTS ESPERADOS

### **Home:**
- Banner promocional vermelho
- Chips de categoria
- Grid de produtos com cards
- Navegação inferior com ícones

### **Carrinho:**
- Lista de itens com stepper
- Resumo com subtotal e taxa
- Botão "Finalizar Pedido" em destaque

### **Checkout:**
- Progress bar com 3 etapas
- Formulário limpo e organizado
- Botões de navegação

### **Rastreamento:**
- Card verde de sucesso
- Status tracker com ícones
- Detalhes completos do pedido

---

## ✅ RESULTADO ESPERADO

Ao final do teste, você deve conseguir:

1. ✅ Navegar pelo cardápio
2. ✅ Adicionar produtos ao carrinho
3. ✅ Preencher dados de entrega
4. ✅ Escolher forma de pagamento
5. ✅ Revisar o pedido
6. ✅ Confirmar e criar o pedido
7. ✅ Ver a página de confirmação
8. ✅ Acompanhar o status do pedido

---

## 🎉 PRÓXIMOS PASSOS

Após testar tudo, você pode:

1. **Adicionar mais produtos** no banco de dados
2. **Criar o CRM/Admin** para gerenciar pedidos
3. **Adicionar autenticação** de usuários
4. **Implementar notificações** em tempo real
5. **Deploy em produção**

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs do backend
2. Abra o console do navegador (F12)
3. Verifique se todas as variáveis de ambiente estão configuradas
4. Certifique-se de que o PostgreSQL está rodando
