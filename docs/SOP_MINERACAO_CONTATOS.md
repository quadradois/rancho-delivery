# SOP — Implementação de Mineração de Contatos (Prefeitura + Scraper + Assertiva)

## 1. Objetivo
Implementar pipeline técnico para chegar em contatos de clientes a partir de imóveis (empreendimentos/casas/IPTU).

## 2. Fontes externas
- Portal mapa: `https://portalmapa.goiania.go.gov.br/`
- Query imóveis: `https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_BaseTeste/FeatureServer/3/query`
- Scraper IPTU (POST): `https://www.goiania.go.gov.br/sistemas/sccer/asp/sccer00201w0.asp`
- Referer scraper: `https://www.goiania.go.gov.br/sistemas/sccer/asp/sccer00201f0.asp`
- Assertiva OAuth2: `https://api.assertivasolucoes.com.br/oauth2/v3/token`
- Assertiva CPF: `https://api.assertivasolucoes.com.br/localize/v3/cpf`
- Assertiva CNPJ: `https://api.assertivasolucoes.com.br/localize/v3/cnpj`

## 3. Fluxo macro
1. Buscar imóveis na prefeitura por termo/bairro/endereço/código.
2. Extrair inscrições IPTU (`nrinscr`).
3. Para cada IPTU, consultar scraper e obter proprietário + documento.
4. Deduplicar CPF/CNPJ.
5. Enriquecer documentos na Assertiva.
6. Consolidar contatos por imóvel/proprietário.
7. Persistir com rastreabilidade de origem.

## 4. Diagrama (sequência)
```text
[Input de busca]
      |
      v
[Prefeitura MAPA query] --> [Lista imóveis/unidades]
      |
      v
[Extrair IPTUs nrinscr]
      |
      v
[Scraper IPTU por inscrição] --> [Nome + CPF/CNPJ + dados imóvel]
      |
      v
[Deduplicar documentos]
      |
      v
[Assertiva CPF/CNPJ]
      |
      v
[Telefones + WhatsApp + Emails]
      |
      v
[Consolidar + score + auditoria]
      |
      v
[Dataset final para CRM/campanha]
```

## 5. Contratos mínimos
## 5.1 Input do pipeline
```json
{
  "modo": "bairro|empreendimento|endereco|iptu",
  "termo": "string",
  "filtros": {
    "bairro": "string",
    "logradouro": "string",
    "numero": "string"
  }
}
```

## 5.2 Registro intermediário (após scraper)
```json
{
  "nrinscr": "string",
  "nome": "string|null",
  "cpfCnpj": "string|null",
  "endereco": "string|null",
  "tipoImovel": "string|null",
  "origem": "SCRAPER_WEB"
}
```

## 5.3 Registro final (após Assertiva)
```json
{
  "nrinscr": "string",
  "nome": "string|null",
  "cpfCnpj": "string|null",
  "telefones": [{"numero":"string","tipo":"CELULAR|FIXO","whatsapp":true}],
  "emails": ["string"],
  "origens": ["prefeitura", "scraper", "assertiva"],
  "confianca": 0.0,
  "updatedAt": "ISO-8601"
}
```

## 6. Regras de negócio recomendadas
1. Não chamar Assertiva sem documento válido (11 ou 14 dígitos).
2. Deduplicar CPF/CNPJ antes de enriquecer.
3. Cache por documento (TTL sugerido: 180–365 dias).
4. Se scraper não trouxer CPF/CNPJ, salvar como “dados básicos” e seguir.
5. Só marcar “contato minerado” se houver telefone ou e-mail útil.
6. Sempre gravar origem por campo (auditoria).

## 7. Pseudocódigo
```ts
async function minerarContatos(input) {
  const imoveis = await buscarNaPrefeitura(input);
  const iptus = extrairIptus(imoveis);

  const proprietarios = [];
  for (const iptu of iptus) {
    const p = await consultarScraperIptu(iptu); // nome, cpf/cnpj, endereco
    proprietarios.push(p);
  }

  const docsUnicos = deduplicarDocumentos(proprietarios);

  const enriquecimentoPorDoc = new Map();
  for (const doc of docsUnicos) {
    const cached = await cache.get(doc);
    if (cached) {
      enriquecimentoPorDoc.set(doc, cached);
      continue;
    }

    const enriched = doc.length === 11
      ? await assertivaCpf(doc)
      : await assertivaCnpj(doc);

    enriquecimentoPorDoc.set(doc, enriched);
    await cache.set(doc, enriched, TTL_365_DIAS);
  }

  const consolidados = proprietarios.map((p) =>
    consolidar(p, enriquecimentoPorDoc.get(limparDoc(p.cpfCnpj)))
  );

  return persistirDataset(consolidados);
}
```

## 8. Erros e fallback
- Prefeitura fora: retry 3x com backoff (1s, 3s, 7s).
- Scraper timeout: reprocessar lote parcial, não travar pipeline inteiro.
- Assertiva indisponível: retornar dados básicos com flag `enriquecimento_pendente=true`.
- Documento inválido: descartar enriquecimento, manter rastreio.

## 9. Observabilidade mínima
- `run_id` por execução.
- Métricas: total imóveis, total IPTUs, docs válidos, hits de cache, sucesso Assertiva, contatos úteis.
- Logs com duração por etapa.

## 10. Critério de pronto
1. Pipeline executa ponta a ponta com recorte de teste.
2. Gera dataset com origem e timestamp.
3. Tem retry, dedupe e cache ativos.
4. Exporta JSON/CSV para consumo do time de produto/dev.
