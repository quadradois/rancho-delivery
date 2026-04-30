# Validacao de Entrega por CEP com Base ViaCEP

**Data de Criação:** 2026-04-30
**Prioridade:** P1
**Status:** Refinar
**Fase Relacionada:** F01

## Contexto

Durante o primeiro teste real de checkout, um pedido foi bloqueado porque o bairro vindo do CEP/cliente nao batia exatamente com os bairros cadastrados. A discussao descartou aliases automaticos amplos, pois bairros parecidos, como `Jd. Curitiba I` e `Jd. Curitiba II`, podem gerar confusao operacional, taxa errada ou atendimento indevido.

## Problema

O sistema hoje valida bairro por nome. Qualquer divergencia entre o nome cadastrado pelo proprietario e o nome retornado/preenchido via CEP pode causar `Bairro nao atendido`, mesmo quando a regiao e atendida. Ao mesmo tempo, normalizacoes agressivas ou aliases automaticos podem aceitar bairros incorretos.

## Escopo Futuro

1. No painel admin, permitir que o proprietario cadastre bairros por CEP, padronizando o nome de rua/bairro com a base ViaCEP.
2. No site de cardapio, exibir um modal inicial convidando o cliente a verificar se entregamos na regiao.
3. No modal, o cliente digita o CEP e o sistema consulta ViaCEP.
4. O sistema confronta o bairro/CEP com as regioes cadastradas:
   - se atende, libera a navegacao/compra com a regiao validada;
   - se nao atende, informa claramente que ainda nao entregamos naquela regiao.
5. No checkout, nao permitir digitacao manual de bairro e rua quando o CEP ja foi validado.
6. No checkout, solicitar apenas campos complementares necessarios para entrega:
   - numero;
   - quadra;
   - lote;
   - complemento;
   - ponto de referencia, se aplicavel.
7. Persistir no pedido o endereco padronizado pelo CEP e os complementos informados pelo cliente.

## Impactos

**Positivos:**
- Reduz pedidos bloqueados por variacao de nome de bairro.
- Evita aliases automaticos perigosos entre bairros parecidos.
- Padroniza a base operacional de entrega.
- Diminui atrito no checkout porque rua/bairro deixam de ser digitados manualmente.

**Negativos/Trade-offs:**
- Exige UX cuidadosa para clientes cujo CEP nao esteja na base ou retorne bairro inesperado.
- Pode exigir ajuste no modelo de dados para salvar CEP, rua, quadra e lote separadamente.
- Depende da disponibilidade da API ViaCEP ou de fallback em caso de falha.

**Dependencias:**
- Definir formato oficial de cadastro de regioes no admin.
- Definir se a validacao sera por CEP exato, faixa de CEP, bairro retornado pelo CEP, ou combinacao desses criterios.
- Revisar schema de pedido/endereco antes de alterar checkout.

## Critério de Pronto Futuro

- [ ] Admin permite cadastrar/editar regiao atendida a partir de CEP consultado no ViaCEP.
- [ ] Site exibe modal inicial de verificacao de entrega por CEP.
- [ ] CEP atendido libera cardapio/checkout com endereco base travado.
- [ ] CEP nao atendido exibe mensagem clara e nao permite concluir pedido.
- [ ] Checkout nao permite editar manualmente bairro e rua quando CEP esta validado.
- [ ] Checkout coleta numero, quadra, lote, complemento e ponto de referencia.
- [ ] Pedido salvo contem endereco padronizado e complementos.
- [ ] Bairros parecidos nao sao aceitos por alias automatico.
- [ ] Fluxo testado em mobile.

## Estimativa

**Complexidade:** Media
**Tempo Estimado:** 2-4 dias

## Notas Adicionais

Melhoria futura relacionada: transformar o formulario de cadastro/checkout em formato de wizard para reduzir a impressao de formulario grande e diminuir desanimo/abandono do cliente.

Essa melhoria deve ser tratada como item de UX posterior ou subitem deste fluxo, mantendo o primeiro passo focado em validacao segura de regiao por CEP.

## Histórico de Mudanças

| Data | Mudança | Autor |
|------|---------|-------|
| 2026-04-30 | Criação do item | Codex |
