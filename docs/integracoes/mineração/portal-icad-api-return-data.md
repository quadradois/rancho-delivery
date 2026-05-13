# Portal ICAD - Dados retornados pelas APIs

Este documento consolida as chamadas de dados encontradas em `portal-icad.har` e os retornos recuperados novamente da API. O HAR original nao contem os corpos JSON, apenas URL/status/tipo; por isso os arquivos em `api-responses` guardam as respostas atuais, com tokens redigidos.

## Resumo das chamadas JSON

| # | Endpoint | Status | Retorno | Arquivo normalizado |
|---|---|---:|---|---|
| 1 | `/ouv/?q=leitor_aparecidadegoiania@vm2info.com` | 200 | objeto (2 chaves) | `docs/api-responses/json/01-ouv-q-leitor-aparecidadegoiania-vm2info-com.normalized.json` |
| 2 | `/tenants/config` | 200 | objeto (2 chaves) | `docs/api-responses/json/02-tenants-config.normalized.json` |
| 3 | `/projetos/listar?ativo=TODOS&tipoProjeto=ICADPADRAO&noForms=true&noLayers=true&noExtras=true` | 200 | array (1 itens) | `docs/api-responses/json/03-projetos-listar-ativo-todos-tipoprojeto-icadpadrao-noforms-true-nolayers-true-noextras-true.normalized.json` |
| 4 | `/projetos/3373/extent` | 200 | str | `docs/api-responses/json/04-projetos-3373-extent.normalized.json` |
| 5 | `/camadas?showIcad=true&publicoIcad=true&noForms=true` | 200 | array (4 itens) | `docs/api-responses/json/05-camadas-showicad-true-publicoicad-true-noforms-true.normalized.json` |
| 6 | `/camadas?id_camadas=23059` | 200 | array (1 itens) | `docs/api-responses/json/06-camadas-id-camadas-23059.normalized.json` |
| 7 | `/camadas?id_camadas=23076` | 200 | array (1 itens) | `docs/api-responses/json/07-camadas-id-camadas-23076.normalized.json` |
| 8 | `/camadas?id_camadas=23080` | 200 | array (1 itens) | `docs/api-responses/json/08-camadas-id-camadas-23080.normalized.json` |
| 9 | `/camadas?id_camadas=23082` | 200 | array (1 itens) | `docs/api-responses/json/09-camadas-id-camadas-23082.normalized.json` |
| 10 | `/camadas/23076` | 200 | objeto (31 chaves) | `docs/api-responses/json/10-camadas-23076.normalized.json` |
| 11 | `/valores/geometria/13` | 200 | array (0 itens) | `docs/api-responses/json/11-valores-geometria-13.normalized.json` |
| 12 | `/importacoes-tiff?filtros=representacao,eq,BaseMapLocal` | 200 | array (3 itens) | `docs/api-responses/json/12-importacoes-tiff-filtros-representacao-eq-basemaplocal.normalized.json` |

## O que cada consulta retorna

### 01. `/ouv/`
- Retorna um objeto com chaves: `authToken, tnToken`.
- Resposta completa: `docs/api-responses/json/01-ouv-q-leitor-aparecidadegoiania-vm2info-com.raw.json`
- Resposta normalizada: `docs/api-responses/json/01-ouv-q-leitor-aparecidadegoiania-vm2info-com.normalized.json`
- Campos normalizados principais: `authToken, tnToken`.

### 02. `/tenants/config`
- Retorna um objeto com chaves: `config, id_tenants`.
- Resposta completa: `docs/api-responses/json/02-tenants-config.raw.json`
- Resposta normalizada: `docs/api-responses/json/02-tenants-config.normalized.json`
- Campos normalizados principais: `config, config.abaLegado, config.autoatendimento, config.cidade, config.consultaPreviaPortal, config.consultaPreviaPortal.campoArea, config.consultaPreviaPortal.textoArea, config.dbNome, config.desabilitaDetalhesImovel, config.novoResumo, config.relatorios, config.relatorios[], config.relatorios[].api, config.relatorios[].geral, config.relatorios[].nome, config.relatorios[].representacao, config.relatorios[].tipo, config.tenantExtent, config.tenantExtent[], id_tenants`.

### 03. `/projetos/listar`
- Retorna uma lista com `1` item(ns).
- Resposta completa: `docs/api-responses/json/03-projetos-listar-ativo-todos-tipoprojeto-icadpadrao-noforms-true-nolayers-true-noextras-true.raw.json`
- Resposta normalizada: `docs/api-responses/json/03-projetos-listar-ativo-todos-tipoprojeto-icadpadrao-noforms-true-nolayers-true-noextras-true.normalized.json`
- Campos normalizados principais: `[], [].@id, [].ativo, [].cidade, [].hierarquias, [].hierarquias[], [].hierarquias[].children, [].hierarquias[].children[], [].hierarquias[].collapsedIcon, [].hierarquias[].data, [].hierarquias[].data.geomType, [].hierarquias[].data.isEditing, [].hierarquias[].data.layerId, [].hierarquias[].data.layerType, [].hierarquias[].droppable, [].hierarquias[].expanded, [].hierarquias[].expandedIcon, [].hierarquias[].key, [].hierarquias[].label, [].hierarquias[].leaf, [].hierarquias[].partialSelected, [].hierarquias[].styleClass, [].hierarquias[].type, [].id, [].nome, [].projetosCamadas, [].projetosCamadas[], [].qtdCamadas, [].qtdGeometrias, [].tipoProjeto, [].usuario, [].usuario.@id, [].usuario.adm, [].usuario.ativo, [].usuario.colaborativo, [].usuario.email, [].usuario.id, [].usuario.nome, [].usuario.statusImport, [].usuario.tipo`.

### 04. `/projetos/3373/extent`
- Retorna `str` com valor ``.
- Resposta completa: `docs/api-responses/json/04-projetos-3373-extent.raw.json`
- Resposta normalizada: `docs/api-responses/json/04-projetos-3373-extent.normalized.json`

### 05. `/camadas`
- Retorna uma lista com `4` item(ns).
- Resposta completa: `docs/api-responses/json/05-camadas-showicad-true-publicoicad-true-noforms-true.raw.json`
- Resposta normalizada: `docs/api-responses/json/05-camadas-showicad-true-publicoicad-true-noforms-true.normalized.json`
- Campos normalizados principais: `[], [].@id, [].adicional, [].ativo, [].audCriadoData, [].audModificadoData, [].audUsuarioCriou, [].audUsuarioCriou.@id, [].audUsuarioCriou.adm, [].audUsuarioCriou.ativo, [].audUsuarioCriou.colaborativo, [].audUsuarioCriou.email, [].audUsuarioCriou.id, [].audUsuarioCriou.nome, [].audUsuarioCriou.statusImport, [].audUsuarioCriou.tipo, [].audUsuarioModificou, [].audUsuarioModificou.@id, [].audUsuarioModificou.adm, [].audUsuarioModificou.ativo, [].audUsuarioModificou.colaborativo, [].audUsuarioModificou.email, [].audUsuarioModificou.id, [].audUsuarioModificou.nome, [].audUsuarioModificou.statusImport, [].audUsuarioModificou.tipo, [].criaFormularioAutomatico, [].escalaMax, [].escalaMin, [].estiloAppCadastro, [].estiloAppCadastro.cor, [].estiloAppCadastro.espessura, [].estiloAppCadastro.preenchimento, [].estiloAppCadastro.tipoLinha, [].estiloIcad, [].estiloIcad.cor, [].estiloIcad.escalaMax, [].estiloIcad.escalaMin, [].estiloIcad.espessura, [].estiloIcad.legenda, [].estiloIcad.legenda[], [].estiloIcad.mapaTematico, [].estiloIcad.mapaTematico[], [].estiloIcad.preenchimento, [].estiloIcad.rotuloAnguloId, [].estiloIcad.rotuloAnguloNome, [].estiloIcad.rotuloAtivo, [].estiloIcad.rotuloEscalaMax, [].estiloIcad.rotuloId, [].estiloIcad.rotuloNome, [].estiloWebgeo, [].estiloWebgeo.campoMapaTematico, [].estiloWebgeo.cor, [].estiloWebgeo.escalaMax, [].estiloWebgeo.espessura, [].estiloWebgeo.idCampoMapaTematico, [].estiloWebgeo.legenda, [].estiloWebgeo.legenda[], [].estiloWebgeo.mapaTematico, [].estiloWebgeo.mapaTematico[]` e mais `66`.

### 06. `/camadas`
- Retorna uma lista com `1` item(ns).
- Resposta completa: `docs/api-responses/json/06-camadas-id-camadas-23059.raw.json`
- Resposta normalizada: `docs/api-responses/json/06-camadas-id-camadas-23059.normalized.json`
- Campos normalizados principais: `[], [].@id, [].adicional, [].ativo, [].audCriadoData, [].audModificadoData, [].audUsuarioCriou, [].audUsuarioCriou.@id, [].audUsuarioCriou.adm, [].audUsuarioCriou.ativo, [].audUsuarioCriou.colaborativo, [].audUsuarioCriou.email, [].audUsuarioCriou.id, [].audUsuarioCriou.nome, [].audUsuarioCriou.statusImport, [].audUsuarioCriou.tipo, [].audUsuarioModificou, [].audUsuarioModificou.@id, [].audUsuarioModificou.adm, [].audUsuarioModificou.ativo, [].audUsuarioModificou.colaborativo, [].audUsuarioModificou.email, [].audUsuarioModificou.id, [].audUsuarioModificou.nome, [].audUsuarioModificou.statusImport, [].audUsuarioModificou.tipo, [].criaFormularioAutomatico, [].escalaMax, [].escalaMin, [].estiloAppCadastro, [].estiloAppCadastro.cor, [].estiloAppCadastro.espessura, [].estiloAppCadastro.preenchimento, [].estiloAppCadastro.tipoLinha, [].estiloIcad, [].estiloIcad.escalaMax, [].estiloIcad.escalaMin, [].estiloIcad.espessura, [].estiloIcad.legenda, [].estiloIcad.legenda[], [].estiloIcad.mapaTematico, [].estiloIcad.mapaTematico[], [].estiloIcad.preenchimento, [].estiloIcad.rotuloAnguloId, [].estiloIcad.rotuloAnguloNome, [].estiloIcad.rotuloAtivo, [].estiloIcad.rotuloEscalaMax, [].estiloIcad.rotuloId, [].estiloIcad.rotuloNome, [].estiloWebgeo, [].estiloWebgeo.cor, [].estiloWebgeo.escalaMax, [].estiloWebgeo.espessura, [].estiloWebgeo.legenda, [].estiloWebgeo.legenda[], [].estiloWebgeo.mapaTematico, [].estiloWebgeo.mapaTematico[], [].estiloWebgeo.preenchimento, [].estiloWebgeo.rotuloAnguloId, [].estiloWebgeo.rotuloAnguloNome` e mais `81`.

### 07. `/camadas`
- Retorna uma lista com `1` item(ns).
- Resposta completa: `docs/api-responses/json/07-camadas-id-camadas-23076.raw.json`
- Resposta normalizada: `docs/api-responses/json/07-camadas-id-camadas-23076.normalized.json`
- Campos normalizados principais: `[], [].@id, [].adicional, [].ativo, [].audModificadoData, [].audUsuarioModificou, [].audUsuarioModificou.@id, [].audUsuarioModificou.adm, [].audUsuarioModificou.ativo, [].audUsuarioModificou.colaborativo, [].audUsuarioModificou.email, [].audUsuarioModificou.id, [].audUsuarioModificou.nome, [].audUsuarioModificou.statusImport, [].audUsuarioModificou.tipo, [].criaFormularioAutomatico, [].escalaMax, [].escalaMin, [].estiloWebgeo, [].estiloWebgeo.cor, [].estiloWebgeo.espessura, [].estiloWebgeo.preenchimento, [].estiloWebgeo.rotuloAnguloId, [].estiloWebgeo.rotuloAnguloNome, [].estiloWebgeo.rotuloAtivo, [].estiloWebgeo.rotuloId, [].estiloWebgeo.rotuloNome, [].id, [].legenda, [].legenda[], [].mapaTematico, [].mapaTematico[], [].nome, [].podeExcluir, [].privada, [].projeto, [].projeto.@id, [].projeto.ativo, [].projeto.audCriadoData, [].projeto.audModificadoData, [].projeto.audUsuarioModificou, [].projeto.audUsuarioModificou.@id, [].projeto.audUsuarioModificou.adm, [].projeto.audUsuarioModificou.ativo, [].projeto.audUsuarioModificou.colaborativo, [].projeto.audUsuarioModificou.email, [].projeto.audUsuarioModificou.id, [].projeto.audUsuarioModificou.nome, [].projeto.audUsuarioModificou.statusImport, [].projeto.audUsuarioModificou.tipo, [].projeto.cidade, [].projeto.hierarquias, [].projeto.hierarquias[], [].projeto.hierarquias[].children, [].projeto.hierarquias[].collapsedIcon, [].projeto.hierarquias[].data, [].projeto.hierarquias[].droppable, [].projeto.hierarquias[].expanded, [].projeto.hierarquias[].expandedIcon, [].projeto.hierarquias[].key` e mais `51`.

### 08. `/camadas`
- Retorna uma lista com `1` item(ns).
- Resposta completa: `docs/api-responses/json/08-camadas-id-camadas-23080.raw.json`
- Resposta normalizada: `docs/api-responses/json/08-camadas-id-camadas-23080.normalized.json`
- Campos normalizados principais: `[], [].@id, [].adicional, [].ativo, [].audCriadoData, [].audModificadoData, [].audUsuarioModificou, [].audUsuarioModificou.@id, [].audUsuarioModificou.adm, [].audUsuarioModificou.ativo, [].audUsuarioModificou.colaborativo, [].audUsuarioModificou.email, [].audUsuarioModificou.id, [].audUsuarioModificou.nome, [].audUsuarioModificou.statusImport, [].audUsuarioModificou.tipo, [].criaFormularioAutomatico, [].escalaMax, [].escalaMin, [].estiloAppCadastro, [].estiloAppCadastro.cor, [].estiloAppCadastro.espessura, [].estiloAppCadastro.preenchimento, [].estiloAppCadastro.tipoLinha, [].estiloIcad, [].estiloIcad.cor, [].estiloIcad.escalaMax, [].estiloIcad.espessura, [].estiloIcad.legenda, [].estiloIcad.legenda[], [].estiloIcad.mapaTematico, [].estiloIcad.mapaTematico[], [].estiloIcad.preenchimento, [].estiloIcad.rotuloAnguloId, [].estiloIcad.rotuloAnguloNome, [].estiloIcad.rotuloAtivo, [].estiloIcad.rotuloEscalaMax, [].estiloIcad.rotuloId, [].estiloIcad.rotuloNome, [].estiloWebgeo, [].estiloWebgeo.campoMapaTematico, [].estiloWebgeo.cor, [].estiloWebgeo.escalaMax, [].estiloWebgeo.espessura, [].estiloWebgeo.idCampoMapaTematico, [].estiloWebgeo.legenda, [].estiloWebgeo.legenda[], [].estiloWebgeo.mapaTematico, [].estiloWebgeo.mapaTematico[], [].estiloWebgeo.preenchimento, [].estiloWebgeo.rotuloAnguloId, [].estiloWebgeo.rotuloAnguloNome, [].estiloWebgeo.rotuloAtivo, [].estiloWebgeo.rotuloId, [].estiloWebgeo.rotuloNome, [].estiloWebgeo.tipoLinha, [].id, [].legenda, [].legenda[], [].mapaTematico` e mais `82`.

### 09. `/camadas`
- Retorna uma lista com `1` item(ns).
- Resposta completa: `docs/api-responses/json/09-camadas-id-camadas-23082.raw.json`
- Resposta normalizada: `docs/api-responses/json/09-camadas-id-camadas-23082.normalized.json`
- Campos normalizados principais: `[], [].@id, [].adicional, [].ativo, [].audCriadoData, [].audModificadoData, [].audUsuarioModificou, [].audUsuarioModificou.@id, [].audUsuarioModificou.adm, [].audUsuarioModificou.ativo, [].audUsuarioModificou.colaborativo, [].audUsuarioModificou.email, [].audUsuarioModificou.id, [].audUsuarioModificou.nome, [].audUsuarioModificou.statusImport, [].audUsuarioModificou.tipo, [].criaFormularioAutomatico, [].escalaMax, [].escalaMin, [].estiloAppCadastro, [].estiloAppCadastro.cor, [].estiloAppCadastro.espessura, [].estiloAppCadastro.preenchimento, [].estiloAppCadastro.tipoLinha, [].estiloIcad, [].estiloIcad.escalaMax, [].estiloIcad.legenda, [].estiloIcad.legenda[], [].estiloIcad.mapaTematico, [].estiloIcad.mapaTematico[], [].estiloIcad.rotuloAnguloId, [].estiloIcad.rotuloAnguloNome, [].estiloIcad.rotuloAtivo, [].estiloIcad.rotuloEscalaMax, [].estiloIcad.rotuloId, [].estiloIcad.rotuloNome, [].estiloWebgeo, [].estiloWebgeo.cor, [].estiloWebgeo.escalaMax, [].estiloWebgeo.espessura, [].estiloWebgeo.legenda, [].estiloWebgeo.legenda[], [].estiloWebgeo.mapaTematico, [].estiloWebgeo.mapaTematico[], [].estiloWebgeo.preenchimento, [].estiloWebgeo.rotuloAnguloId, [].estiloWebgeo.rotuloAnguloNome, [].estiloWebgeo.rotuloAtivo, [].estiloWebgeo.rotuloId, [].estiloWebgeo.rotuloNome, [].estiloWebgeo.tipoLinha, [].id, [].legenda, [].legenda[], [].mapaTematico, [].mapaTematico[], [].nome, [].ordemVisualizacao, [].podeExcluir, [].privada` e mais `76`.

### 10. `/camadas/23076`
- Retorna um objeto com chaves: `@id, adicional, ativo, audModificadoData, audUsuarioModificou, criaFormularioAutomatico, escalaMax, escalaMin, estiloWebgeo, id, legenda, mapaTematico, nome, podeExcluir, privada, projeto, projetosCamadasFormularios, projetosCamadasRelatorios, publicoGenerico, publicoIcad, publicoOuv, representacao, rotuloAtivo, showAvaliacao, showGenerico, showIcad, showOuv, tblNomeDb, tipoGeometria, travar, visibilidade`.
- Resposta completa: `docs/api-responses/json/10-camadas-23076.raw.json`
- Resposta normalizada: `docs/api-responses/json/10-camadas-23076.normalized.json`
- Campos normalizados principais: `@id, adicional, ativo, audModificadoData, audUsuarioModificou, audUsuarioModificou.@id, audUsuarioModificou.adm, audUsuarioModificou.ativo, audUsuarioModificou.colaborativo, audUsuarioModificou.email, audUsuarioModificou.id, audUsuarioModificou.nome, audUsuarioModificou.statusImport, audUsuarioModificou.tipo, criaFormularioAutomatico, escalaMax, escalaMin, estiloWebgeo, estiloWebgeo.cor, estiloWebgeo.espessura, estiloWebgeo.preenchimento, estiloWebgeo.rotuloAnguloId, estiloWebgeo.rotuloAnguloNome, estiloWebgeo.rotuloAtivo, estiloWebgeo.rotuloId, estiloWebgeo.rotuloNome, id, legenda, legenda[], mapaTematico, mapaTematico[], nome, podeExcluir, privada, projeto, projeto.@id, projeto.ativo, projeto.audCriadoData, projeto.audModificadoData, projeto.audUsuarioModificou, projeto.audUsuarioModificou.@id, projeto.audUsuarioModificou.adm, projeto.audUsuarioModificou.ativo, projeto.audUsuarioModificou.colaborativo, projeto.audUsuarioModificou.email, projeto.audUsuarioModificou.id, projeto.audUsuarioModificou.nome, projeto.audUsuarioModificou.statusImport, projeto.audUsuarioModificou.tipo, projeto.cidade, projeto.hierarquias, projeto.hierarquias[], projeto.hierarquias[].children, projeto.hierarquias[].children[], projeto.hierarquias[].collapsedIcon, projeto.hierarquias[].data, projeto.hierarquias[].data.geomType, projeto.hierarquias[].data.isEditing, projeto.hierarquias[].data.layerId, projeto.hierarquias[].data.layerType` e mais `73`.

### 11. `/valores/geometria/13`
- Retorna uma lista com `0` item(ns).
- Resposta completa: `docs/api-responses/json/11-valores-geometria-13.raw.json`
- Resposta normalizada: `docs/api-responses/json/11-valores-geometria-13.normalized.json`
- Campos normalizados principais: `[]`.

### 12. `/importacoes-tiff`
- Retorna uma lista com `3` item(ns).
- Resposta completa: `docs/api-responses/json/12-importacoes-tiff-filtros-representacao-eq-basemaplocal.raw.json`
- Resposta normalizada: `docs/api-responses/json/12-importacoes-tiff-filtros-representacao-eq-basemaplocal.normalized.json`
- Campos normalizados principais: `[], [].extensao, [].extent, [].extent[], [].fileSize, [].id, [].mapaDefault, [].maxZoom, [].minZoom, [].nome, [].nomeArquivo, [].preview, [].projetoId, [].public, [].representacao, [].sinal, [].tipoImagem, [].url, [].zOrder`.

## Tiles vetoriais PBF

Alem dos JSONs, o portal carregou tiles vetoriais de `openrest.geo360.com.br`. Eles retornam binario `.pbf`, entao foram decodificados para JSON com propriedades e geometrias em lon/lat.

| # | Tile | Status | Feicoes | Propriedades | Arquivo decodificado |
|---|---|---:|---:|---|---|
| 1 | `cadastro.pref_macrozonas/z11/x743/y1121` | 200 | 10 | `entity, featid1, id, refname` | `docs/api-responses/vector-tiles/01-cadastro-pref_macrozonas-z11-x743-y1121.decoded.json` |
| 2 | `cadastro.pref_macrozonas/z11/x743/y1120` | 200 | 8 | `entity, featid1, id, refname` | `docs/api-responses/vector-tiles/02-cadastro-pref_macrozonas-z11-x743-y1120.decoded.json` |
| 3 | `cadastro.pref_macrozonas/z11/x744/y1121` | 200 | 5 | `entity, featid1, id, refname` | `docs/api-responses/vector-tiles/03-cadastro-pref_macrozonas-z11-x744-y1121.decoded.json` |
| 4 | `cadastro.pref_macrozonas/z11/x744/y1120` | 200 | 4 | `entity, featid1, id, refname` | `docs/api-responses/vector-tiles/04-cadastro-pref_macrozonas-z11-x744-y1120.decoded.json` |
| 5 | `cadastro.pref_macrozonas/z11/x742/y1121` | 200 | 1 | `entity, featid1, id, refname` | `docs/api-responses/vector-tiles/05-cadastro-pref_macrozonas-z11-x742-y1121.decoded.json` |
| 6 | `cadastro.pref_macrozonas/z11/x742/y1120` | 204 | 0 | `` | `docs/api-responses/vector-tiles/06-cadastro-pref_macrozonas-z11-x742-y1120.decoded.json` |
| 7 | `cadastro.pref_macrozonas/z11/x745/y1121` | 204 | 0 | `` | `docs/api-responses/vector-tiles/07-cadastro-pref_macrozonas-z11-x745-y1121.decoded.json` |
| 8 | `cadastro.pref_macrozonas/z11/x745/y1120` | 204 | 0 | `` | `docs/api-responses/vector-tiles/08-cadastro-pref_macrozonas-z11-x745-y1120.decoded.json` |

## Observacoes

- Chamadas de assets, scripts, imagens, Google Analytics, Google Maps, OpenStreetMap e Cloudflare foram ignoradas porque nao sao consultas de dados cadastrais do ICAD.
- A chamada `/projetos/3373/extent` respondeu string vazia (`""`) na nova consulta, mesmo estando documentada como extensao geografica do projeto.
- A chamada `/valores/geometria/13` respondeu lista vazia (`[]`) na nova consulta.
- Campos como `config`, `hierarquias`, `legenda` e alguns `estilo*` chegam como texto contendo JSON; por isso os arquivos `.normalized.json` sao os melhores para inspecao humana.
- Tokens temporarios aparecem no fluxo original, mas foram redigidos nos arquivos gerados.

