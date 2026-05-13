# Portal ICAD — Documentação de Endpoints

> **Site:** https://aparecidadegoiania-portal.geo360.com.br/icad/map/  
> **Município:** Aparecida de Goiânia – GO  
> **Plataforma:** Geo360 (vm2info)  
> **Data do levantamento:** 05/05/2026  

---

## Visão Geral

O Portal ICAD (Informações Cadastrais) é uma aplicação Angular que consome uma API REST hospedada na plataforma **Geo360**. A aplicação permite pesquisar imóveis, visualizar camadas georreferenciadas, emitir consultas prévias e relatórios cadastrais.

---

## Bases de URL

| Variável | URL Base |
|----------|----------|
| `apiUrl` | `https://plataforma.geo360.com.br/` |
| `apiDjangoUrl` | `https://plataforma.geo360.com.br/django/` |
| `reportV2Url` | `https://relatorios-v2.geo360.com.br/` |
| `apiUrlPostgrest` | PostgREST dinâmico (definido por projeto) |

---

## Endpoints por Categoria

### 1. Autenticação e Configuração

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/login` | Autenticação de usuário |
| `GET` | `/tenants/config` | Configurações do tenant/cliente |
| `GET` | `/empresas` | Listagem de empresas |
| `GET` | `/permissoes/{id}` | Permissões por usuário/perfil |
| `GET` | `/ouv/?q={query}` | Consulta OUV (Ouvidoria/autenticação externa) |

---

### 2. Projetos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/projetos/listar` | Lista todos os projetos |
| `GET` | `/projetos/listar?ativo=ATIVOS` | Lista projetos ativos |
| `GET` | `/projetos/listar?ativo=TODOS&tipoProjeto=ICADPADRAO&noForms=true&noLayers=true&noExtras=true` | Lista projetos ICAD sem extras |
| `GET` | `/projetos/{id}` | Detalhe de um projeto |
| `GET` | `/projetos/{id}/extent` | Extensão geográfica do projeto (bbox) |

---

### 3. Camadas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/camadas` | Lista todas as camadas |
| `GET` | `/camadas?showIcad=true&publicoIcad=true&noForms=true` | Camadas públicas do ICAD |
| `GET` | `/camadas?id_camadas={id}` | Camada por ID específico |
| `GET` | `/camadas?prop={prop}` | Camadas filtradas por propriedade |
| `GET` | `/camadas/{id}` | Detalhe de uma camada |
| `GET` | `/camadas/previa` | Camadas de consulta prévia |

---

### 4. Geometrias

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/geometrias/{id}` | Busca geometria por ID |
| `POST` | `/geometrias` | Cria nova geometria |
| `PUT` | `/geometrias/{id}` | Atualiza geometria existente |
| `GET` | `/geometrias/intersect-geom` | Geometrias com interseção |
| `GET` | `/ouv/camadas/{id}/geometrias` | Geometrias de uma camada OUV |

---

### 5. Valores / Atributos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/valores/camada/{id}` | Valores de atributos de uma camada |
| `GET` | `/valores/camada/{id}?bbox={bbox}` | Valores filtrados por bounding box |
| `GET` | `/valores/geometria/{id}` | Valores de uma geometria específica |
| `POST` | `/valores` | Cria/salva valores de atributos |
| `GET` | `/campos/resumo` | Resumo dos campos disponíveis |

---

### 6. Imóveis (via Django)

> Base: `https://plataforma.geo360.com.br/django/municipio/`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `municipio/lote/busca_imoveis/{setor}/?page={page}` | Busca imóveis por setor (paginado) |
| `GET` | `{base}imoveis/?inscricao_imobiliaria__istartswith={valor}` | Busca por inscrição imobiliária |
| `GET` | `{base}imoveis/?search={query}` | Busca geral de imóveis |
| `GET` | `{base}imoveis/{id}/caracteristicas/` | Características de um imóvel |
| `GET` | `{base}imoveis/itbi/{id}/` | Dados de ITBI de um imóvel |
| `GET` | `{base}imoveis/itbi/ids/?array={ids}` | ITBI de múltiplos imóveis |
| `GET` | `{base}imoveis/match_resumido?inscricao={inscricao}` | Resumo de match por inscrição |
| `GET` | `municipio/{id}/search/{a}/{b}/{c}/` | Busca municipal multiparam |

---

### 7. Logradouros (via Django)

> Base: `https://plataforma.geo360.com.br/django/municipio/`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `{base}logradouros/?{campo}={valor}` | Busca logradouros por campo/valor |

---

### 8. Arquivos / Upload

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/arquivos/{id}/files/upload?tipo=1` | Upload de arquivo vinculado |
| `DELETE` | `/arquivos/{id}` | Remove um arquivo |

---

### 9. Importações / Raster

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/importacoes-tiff?filtros=representacao,eq,BaseMapLocal` | Tiffs de mapa base local |

---

### 10. Análises e Consultas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/analises/intersect/zonas?idGeom={id}` | Interseção com zonas de uso do solo |
| `GET` | `/consulta/criciuma` | Consulta específica (Criciúma) |
| `GET` | `/cep` | Consulta de CEP |
| `GET` | `{base}perm/` | Permissões de zona |
| `GET` | `{base}zonasNovas/` | Novas zonas |
| `GET` | `/proxy?url={url_externa}` | Proxy para APIs externas (ex: IBGE SIDRA) |
| `GET` | `/proxy-v2/blumenau/auth` | Proxy autenticado (Blumenau) |

---

### 11. PostgREST

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `{postgrestUrl}/{tabela}?id=eq.{id}` | Consulta direta em tabela PostgREST |
| `POST` | `/django/postgrest/tipos/valores/geometrias/` | Tipos de valores de geometrias |
| `GET` | `/django/crud/{campo}/exportar/{id}` | Exportação CRUD por campo |

---

### 12. Relatórios (relatorios-v2.geo360.com.br)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/{projeto}/{tipo}.pdf` | Geração de relatório em PDF |
| `POST` | `/reports/consulta_previa/{id}?angulo={angulo}` | Consulta prévia (padrão) |
| `POST` | `/reports/consulta_previa_numcad/{id}?angulo={angulo}` | Consulta prévia com NUMCAD |
| `POST` | `/reports/intersect_numcad/{id}` | Relatório de interseção NUMCAD |
| `POST` | `/reports/rincao/avaliacao` | Avaliação imobiliária (Rincão) |

---

### 13. OUV / Legenda

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/ouv/legenda` | Legenda das camadas OUV |
| `GET` | `/ouv/?q={query}` | Consulta OUV pública |

---

## Serviços Externos Consumidos

| Serviço | URL | Finalidade |
|---------|-----|------------|
| Google Maps | `https://maps.googleapis.com/maps/api/js` | Renderização de mapa base |
| Google Tag Manager | `https://www.googletagmanager.com/gtm.js` | Analytics / tracking |
| Google Analytics | `https://www.google-analytics.com/` | Métricas de uso |
| Cloudflare Insights | `https://static.cloudflareinsights.com/` | Performance monitoring |
| IBGE SIDRA (via proxy) | `https://apisidra.ibge.gov.br/` | Dados socioeconômicos |

---

## Estrutura da Aplicação

```
aparecidadegoiania-portal.geo360.com.br
├── /icad/map/{lng},{lat},{zoom}/list     ← Página principal (mapa + lista)
├── runtime.js                            ← Bootstrap Angular
├── polyfills.js                          ← Polyfills
├── main.js                               ← Bundle principal (lógica de negócio)
├── scripts.js                            ← Bibliotecas terceiras
├── styles.css                            ← Estilos globais
├── /assets/icons/                        ← Ícones SVG (zoom, layers, ruler, etc.)
└── /assets/img/                          ← Imagens (satélite, modelo de impressão)
```

---

## Observações

- A aplicação é um **SPA Angular** com roteamento client-side.
- A autenticação é feita via **token JWT**, transmitido nos headers das requisições.
- Os endpoints Django seguem o padrão **REST DRF** (Django REST Framework).
- A plataforma suporta múltiplos municípios; o tenant ativo é determinado pelo subdomínio ou pela configuração do projeto.
- Endpoints marcados com `{base}` utilizam a URL base dinâmica do município logado.
- O sistema de relatórios (`reportV2Url`) é um serviço separado e independente.
