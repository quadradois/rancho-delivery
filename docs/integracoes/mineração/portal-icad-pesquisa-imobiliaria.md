# Portal ICAD - Pesquisa de dados imobiliarios

Este documento descreve o fluxo real observado no portal de Aparecida de Goiania para pesquisa de imoveis. O HAR original nao capturou uma pesquisa digitada pelo usuario; por isso a leitura abaixo combina o codigo do front-end com testes controlados nas APIs publicas.

## 1. Token publico do tenant

Antes das consultas, o portal busca tokens publicos do tenant:

```http
GET https://plataforma.geo360.com.br/ouv/?q=leitor_aparecidadegoiania@vm2info.com
```

Retorno:

```json
{
  "authToken": "...",
  "tnToken": "..."
}
```

Esses valores sao usados como token tecnico/publico nas proximas chamadas. Nao e login de usuario, mas funciona como chave de acesso ao tenant.

## 2. Busca resumida de imoveis

A busca principal usa a API direta de cadastro:

```http
GET https://cadastro.geo360.com.br/search/aparecidadegoiania/imobiliario?numero_cadastro={CCI}
Authorization: Bearer {authToken}
```

Tambem pode buscar por:

```http
GET https://cadastro.geo360.com.br/search/aparecidadegoiania/imobiliario?inscricao_cartografica={inscricao}
Authorization: Bearer {authToken}
```

No front-end, para Aparecida:

- `numero_cadastro` aparece como `CCI`.
- `inscricao_cartografica` aparece como `Inscricao Imobiliaria`.

Retorno da busca resumida:

```json
[
  {
    "id_imobiliario": 0,
    "id_lote": 0,
    "geom": "POLYGON((...))",
    "inscricao_cartografica": "...",
    "numero_cadastro": 0
  }
]
```

Campos retornados:

- `id_imobiliario`: identificador do cadastro imobiliario.
- `id_lote`: identificador do lote relacionado.
- `geom`: geometria do lote/imovel em WKT, normalmente `POLYGON`, com coordenadas lon/lat.
- `inscricao_cartografica`: inscricao imobiliaria/cartografica.
- `numero_cadastro`: CCI/numero de cadastro.

Observacao: buscas muito amplas, como inscricao contendo apenas `1`, podem tentar retornar muitos registros. Para uso seguro, prefira valores mais especificos ou paginacao/contexto quando disponivel.

## 3. Detalhe simples por lote

Depois de encontrar um `id_lote`, o portal consegue consultar os imoveis/unidades daquele lote:

```http
GET https://plataforma.geo360.com.br/django/municipio/lote/busca_imoveis/{id_lote}/?page=1
X-AUTH-TOKEN: {authToken}
X-TN-TOKEN: {tnToken}
```

Retorno observado:

```json
[
  {
    "numero_cadastro___imobiliario": 0,
    "area_construida_privativa": "...",
    "endereco_completo": "...",
    "id_imobiliario": 0
  }
]
```

Campos retornados:

- `numero_cadastro___imobiliario`: CCI/numero do cadastro imobiliario.
- `area_construida_privativa`: area construida privativa.
- `endereco_completo`: endereco textual completo.
- `id_imobiliario`: identificador do cadastro imobiliario.

Essa rota e paginada por `page`. No exemplo testado, `page=2` retornou lista vazia.

## 4. Detalhe completo do cadastro

Para obter praticamente todos os dados imobiliarios, a rota que funcionou para Aparecida foi:

```http
GET https://cadastro.geo360.com.br/aparecidadegoiania/lote/busca_imoveis_all/{id}/
Authorization: Bearer {authToken}
```

A mesma estrutura tambem respondeu usando:

```http
GET https://cadastro.geo360.com.br/aparecidadegoiania/imobiliario/busca_imoveis_all/{id}/
Authorization: Bearer {authToken}
```

Retorno: objeto unico com muitos campos cadastrais, fiscais, geograficos e de infraestrutura.

Principais grupos de dados retornados:

- Identificadores: `id_imobiliario`, `id_lote`, `id_logradouro`, `id_bairro`, `id_setor`, `id_quadra`, `id_imobiliario_area`.
- Inscricoes e cadastro: `numero_cadastro___imobiliario`, `inscricao_cartografica___imobiliario`, `iptu_antigo`, `iptu_novo`, `validacao_cadastro`, `status`.
- Geometria: `geom`, em WKB hexadecimal.
- Endereco: `endereco_completo`, `nome___logradouro`, `codigo___logradouro`, `nome_bairro`, `cep`, `nr_porta`, `nr_lote`, `nr_unidade`, `quadra`, `complemento`, `complemento_lote`.
- Pessoa/proprietario: `codigo___pessoa`, `nome___pessoa`, `cpf_cnpj`, `tipo___pessoa`, `status_proprietario`.
- Areas: `area_terreno`, `area_privativa`, `area_privativa__lote`, `area_comum__lote`, `area_terreno_fracao`, `area_construida_privativa`, `area_construida_equivalente`, `area_construida_comum`, `area_total_construida__lote`, `area_total_construida_comum__lote`.
- Areas por tipo de construcao: `area_casa`, `area_apartamento`, `area_telheiro`, `area_galpao`, `area_industria`, `area_loja`, `area_pavilhao_comercial`, `area_barracao_madeira`, `area_sala_comercial`, `area_banca_quiosque`, `area_terraco_coberto`, `area_especial`, `area_posto_combustivel`, `area_reservatorio_armazenamento`, `area_piscina`.
- Caracteristicas da edificacao/lote: `tipo_edificacao`, `estrutura`, `cobertura`, `conservacao`, `revestimento_externo`, `revestimento_interno`, `forro`, `piso`, `instalacao_eletrica`, `instalacao_sanitaria`, `ocupacao`, `situacao_lote`, `topografia`, `limitacao`, `uso`, `utilizacao`, `patrimonio`, `condominio`.
- Infraestrutura urbana: `rede_agua`, `rede_esgoto`, `rede_eletrica`, `rede_telefonica`, `iluminacao_publica`, `galeria_pluvial`, `varricao`, `pavimentacao`, `meio_fio`.
- Foto/controle: `id_foto_fachada_prioridade`, `situacao_foto`, `dt_criacao`.

## 5. Rotas que aparecem no codigo, mas nao funcionaram para Aparecida nos testes

Estas rotas existem no front-end/documentacao, mas nao responderam corretamente para este tenant durante o teste:

- `GET https://cadastro.geo360.com.br/portal/aparecidadegoiania/imovel?...` retornou `Municipio nao encontrado`.
- `GET https://plataforma.geo360.com.br/django/municipio/imoveis/?search=...` tentou consultar `cadastro.imoveis` e retornou erro de tabela inexistente.
- `GET https://plataforma.geo360.com.br/django/municipio/imoveis/{id}/caracteristicas/` retornou 404 para o exemplo testado.
- `GET https://plataforma.geo360.com.br/django/municipio/imoveis/itbi/{id}/` retornou 404 para o exemplo testado.

## Fluxo resumido

1. Chamar `/ouv/?q=leitor_aparecidadegoiania@vm2info.com`.
2. Usar `authToken` como `Authorization: Bearer ...`.
3. Buscar o imovel em `/search/aparecidadegoiania/imobiliario?...`.
4. Pegar `id_lote` ou `id_imobiliario`.
5. Para resumo: chamar `/django/municipio/lote/busca_imoveis/{id_lote}/?page=1`.
6. Para detalhe completo: chamar `/aparecidadegoiania/lote/busca_imoveis_all/{id}/` ou `/aparecidadegoiania/imobiliario/busca_imoveis_all/{id}/`.
