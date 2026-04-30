# Validacao de Entrega por CEP com Base ViaCEP

**Data de Criação:** 2026-04-30
**Prioridade:** P1
**Status:** Implementado
**Fase Relacionada:** F01

## Contexto

Durante o primeiro teste real de checkout, um pedido foi bloqueado porque o bairro vindo do CEP/cliente nao batia exatamente com os bairros cadastrados. A discussao descartou aliases automaticos amplos, pois bairros parecidos, como `Jd. Curitiba I` e `Jd. Curitiba II`, podem gerar confusao operacional, taxa errada ou atendimento indevido.

## Problema

O sistema hoje valida bairro por nome. Qualquer divergencia entre o nome cadastrado pelo proprietario e o nome retornado/preenchido via CEP pode causar `Bairro nao atendido`, mesmo quando a regiao e atendida. Ao mesmo tempo, normalizacoes agressivas ou aliases automaticos podem aceitar bairros incorretos.

## Implementado

### Admin — Entregas (ex-Bairros)
- Cadastro de bairro por CEP: digita o CEP → ViaCEP preenche o nome automaticamente (travado)
- Campo tempo de entrega (minutos) por bairro
- Links de marketplace (iFood, 99Food, outro customizável) exibidos quando cliente fora da área
- Menu renomeado de "Bairros" para "Entregas"

### Site — Modal de verificação de CEP (não bloqueante)
- Aparece 800ms após carregar a página
- Cliente digita o CEP → sistema consulta ViaCEP → verifica cobertura
- CEP atendido: exibe bairro, tempo de entrega e taxa — libera navegação
- CEP não atendido: exibe links de marketplace configurados no admin
- CEP validado salvo em `sessionStorage` para pré-preencher o checkout
- Cliente pode fechar o modal e navegar mesmo sem validar

### Site — Card do produto
- Exibe tempo de preparo individual por produto (cadastrado no admin)
- Exibe tempo de entrega do bairro validado pelo CEP
- Exibe taxa de entrega
- Quando CEP não validado: exibe "Digite seu CEP para calcular o tempo de entrega"

### Site — Checkout
- CEP do modal pré-preenche automaticamente o formulário (não precisa digitar novamente)
- Rua e bairro travados (vindos do ViaCEP)
- Campos: CEP, Número, Quadra, Lote, Complemento, Ponto de referência

### Backend
- Novos endpoints: `GET /api/bairros/cep/:cep` e `GET /api/bairros/viacep/:cep`
- CRUD completo de bairros via API
- Migration: `tempo_entrega` em `bairros` e `tempo_preparo` em `produtos`
- Fallback: se ViaCEP indisponível, retorna erro claro sem travar o sistema

## Critério de Pronto

- [x] Admin permite cadastrar/editar regiao atendida a partir de CEP consultado no ViaCEP
- [x] Site exibe modal inicial de verificacao de entrega por CEP
- [x] CEP atendido exibe taxa e tempo de entrega — libera cardapio/checkout
- [x] CEP nao atendido exibe links de marketplace como alternativa
- [x] Checkout nao permite editar manualmente bairro e rua quando CEP esta validado
- [x] Checkout coleta numero, quadra, lote, complemento e ponto de referencia
- [x] CEP validado no modal e aproveitado no checkout (sessionStorage)
- [x] Card do produto exibe tempo de preparo e tempo/taxa de entrega
- [x] Bairros parecidos nao sao aceitos por alias automatico
- [ ] Fluxo testado em mobile

## Pendências

- Testar fluxo completo em mobile
- Configurar bairros reais com CEPs via painel admin em produção
- Rodar migration `db:migrate:deploy` no servidor de produção

## Histórico de Mudanças

| Data | Mudança | Autor |
|------|---------|-------|
| 2026-04-30 | Criação do item | Codex |
| 2026-04-30 | Implementação completa — CEP, modal, card, checkout, admin | Kiro |
