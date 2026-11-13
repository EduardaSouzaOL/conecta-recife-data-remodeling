# Contrato das APIs do Conecta Recife

Este documento descreve o que o Kodiak vê: método, caminho, entrada, saída, erros e efeitos colaterais de cada endpoint. Ele não descreve a implementação. Todos os dados são fictícios.

Fontes: rotas em `backend/src/api/rotas/`, `backend/src/api/app.js`, tabela de erros em `backend/src/api/erros.js` e respostas capturadas em `backend/test/fixtures/golden-http.json`.

Um teste (`backend/test/contrato.test.js`) garante que todo par método/caminho registrado tem uma seção `### MÉTODO /caminho` neste documento, e que toda seção tem rota. Ao criar uma rota, crie a seção aqui.

## Convenções

- Há duas áreas que o Kodiak chama: `/dados/*` (motor de dados) e `/recomendacao/*` (motor de recomendação). Fora delas ficam `GET /health` e `GET /`.
- `{id}` no caminho é um `cidadao_id` (por exemplo `C000003` ou só `3`), um `servico_id` ou um `jornada_id`, conforme a seção.
- Entrada: "corpo" é o JSON enviado em `POST`, `PUT` e `PATCH`. "consulta" é a query string. Quando a seção diz "corpo, depois consulta", vale o valor do corpo e, se ele faltar, o da consulta.
- Uma barra final é aceita (`/health/` responde igual a `/health`).
- Respostas de sucesso têm status `200`. Respostas de erro seguem a seção "Formato de erro".
- Resposta com `Content-Type: application/json; charset=utf-8` e `Cache-Control: no-store`. CORS aberto por padrão (variável `CORS_ORIGIN`).
- Corpo de requisição de até 100 KB.
- Consentimento de saúde e de acessibilidade são independentes. Sem consentimento, os dados e os textos da respectiva finalidade não aparecem em nenhuma resposta.

## Mapa das rotas

| Método | Caminho | Área |
|---|---|---|
| GET | `/` | Fora dos motores |
| GET | `/health` | Fora dos motores |
| GET | `/dados/cidadaos/demo` | Motor de dados |
| GET | `/dados/cidadaos/{id}` | Motor de dados |
| GET | `/dados/cidadaos/{id}/jornadas` | Motor de dados |
| GET | `/dados/servicos/{id}` | Motor de dados |
| GET | `/dados/consentimentos/texto` | Motor de dados |
| GET | `/dados/consentimentos/{id}` | Motor de dados |
| POST | `/dados/consentimentos/{id}` | Motor de dados |
| POST | `/dados/jornadas` | Motor de dados |
| GET | `/dados/jornadas/{id}` | Motor de dados |
| PATCH | `/dados/jornadas/{id}` | Motor de dados |
| POST | `/dados/jornadas/{id}` | Motor de dados (**Legado**) |
| POST | `/dados/jornadas/{id}/confirmar` | Motor de dados |
| GET | `/dados/jornadas/{id}/problema` | Motor de dados |
| POST | `/dados/jornadas/{id}/cancelar` | Motor de dados |
| POST | `/dados/jornadas/{id}/alterar` | Motor de dados |
| POST | `/dados/jornadas/{id}/avaliar` | Motor de dados |
| POST | `/dados/eventos` | Motor de dados |
| GET | `/dados/eventos/resumo` | Motor de dados |
| GET | `/dados/fixados/{id}` | Motor de dados |
| POST | `/dados/fixados/{id}` | Motor de dados |
| GET | `/recomendacao/visitante/home` | Motor de recomendação |
| GET | `/recomendacao/{id}/home` | Motor de recomendação |
| GET | `/recomendacao/{id}` | Motor de recomendação |
| POST | `/recomendacao/{id}` | Motor de recomendação (**Legado**) |

Também existem, fora do roteador e só no servidor local: `OPTIONS` em qualquer caminho (responde `204` só com os cabeçalhos de CORS) e `GET /painel` (painel de teste manual, não faz parte do Kodiak).

---

## Fora dos motores

### GET /

- Área: fora dos motores (índice)
- Entrada: nenhuma
- Saída 200: `{ nome, motor_de_dados, motor_de_recomendacao, saude_da_api }`. Cada motor é um objeto `"MÉTODO /caminho": "descrição ou exemplo de corpo"`. O índice é gerado das rotas registradas que têm descrição. Aliases legados, `/health` e `/` não entram. `saude_da_api` vale `"GET /health"`.
- Erros: nenhum específico
- Efeitos colaterais: nenhum

### GET /health

- Área: fora dos motores
- Entrada: nenhuma
- Saída 200: `{ ok: true, cidadaos, servicos, derivados_gerados_em }` (quantidades carregadas e data dos dados derivados)
- Erros: `405 metodo_nao_permitido` para qualquer método que não seja `GET`
- Efeitos colaterais: nenhum

---

## Motor de dados

### GET /dados/cidadaos/demo

- Área: motor de dados
- Entrada: nenhuma
- Saída 200: `{ cidadaos: [{ cidadao_id, cenario }] }`. As personas oficiais e cenários para "entrar como". `cenario` é um texto curto.
- Erros: nenhum específico
- Efeitos colaterais: nenhum

### GET /dados/cidadaos/{id}

- Área: motor de dados ("entrar como")
- Entrada: caminho `{id}` (`cidadao_id`)
- Saída 200:
  - `cidadao_id`, `saudacao`, `perfil_resumo`
  - `perfil`: marcadores do perfil sem saúde nem deficiência (`idade`, `faixa_etaria`, `sexo`, `rpa`, `situacao_renda`, `criancas_na_familia`, `empreendedor`, `mei`, `servidor_publico`, `proprietario_imovel`, `tutor_animal`, `estudante`, `cadastro_unico`, `bolsa_familia`, `usuario_compaz`, `microcredito`, `aceita_notificacao`). `situacao_renda` e `criancas_na_familia` vazios vêm como `null` e significam "sem informação".
  - `saude_liberada` e `saude`: `saude` é `null` sem consentimento de saúde
  - `acessibilidade_liberada` e `acessibilidade`: `acessibilidade` é `null` sem consentimento de acessibilidade
  - `tem_historico`, `total_acessos`, `historico_recente: [{ data, data_br, hora, servico_id, servico }]`
  - `consentimento` (saúde) e `consentimento_acessibilidade`: `{ finalidade, status, usa_dados, usa_dados_de_saude, mensagem, deve_pedir_agora, acoes_disponiveis, atualizado_em }`
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`
- Efeitos colaterais: **grava o evento `entrou_como`** (apesar de ser `GET`)
- Legado: `usa_dados_de_saude` dentro dos objetos de consentimento (prefira `usa_dados`)

### GET /dados/cidadaos/{id}/jornadas

- Área: motor de dados
- Entrada: caminho `{id}` (`cidadao_id`)
- Saída 200: `{ cidadao_id, jornadas: [{ jornada_id, servico_id, servico, estado, protocolo, criada_em }] }`. Mais recentes primeiro. `protocolo` é `null` até a conclusão. `estado` é `em_andamento` ou `concluida`. Lista vazia se não há pedidos.
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`
- Efeitos colaterais: nenhum

### GET /dados/servicos/{id}

- Área: motor de dados
- Entrada: caminho `{id}` (`servico_id`)
- Saída 200: `{ servico_id, nome, orgao, orgao_sigla, temas, tipo_servico, descricao, requisitos, passos, gratuito, nota_media, jornada_disponivel }`. `jornada_disponivel` diz se o serviço tem pedido pelo app no protótipo.
- Erros: `404 servico_nao_encontrado` (também para id que não é número)
- Efeitos colaterais: nenhum

### GET /dados/consentimentos/texto

- Área: motor de dados
- Entrada: consulta `finalidade` (`saude_personalizacao` ou `acessibilidade_personalizacao`; padrão `saude_personalizacao`)
- Saída 200: `{ finalidade, versao_texto, titulo, resumo, o_que_usamos, para_que_usamos, o_que_nao_fazemos, se_nao_aceitar, como_mudar_de_ideia, base_legal, opcoes }`
- Erros: `400 finalidade_invalida`
- Efeitos colaterais: nenhum
- Observação: `POST /dados/consentimentos/texto` não cai aqui. O `texto` é lido como `{id}` da rota `POST /dados/consentimentos/{id}` e responde `400 id_invalido`.

### GET /dados/consentimentos/{id}

- Área: motor de dados
- Entrada: caminho `{id}` (`cidadao_id`); consulta `finalidade` (padrão `saude_personalizacao`)
- Saída 200: `{ cidadao_id, finalidade, status, usa_dados, usa_dados_de_saude, mensagem, deve_pedir_agora, acoes_disponiveis, atualizado_em, historico: [{ finalidade, status, ts, versao_texto }], finalidades }`. `finalidades` traz o resumo das duas finalidades, indexado pelo nome. `status` é `pendente` (nunca respondeu), `concedido`, `recusado` ou `revogado`.
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`, `400 finalidade_invalida`
- Efeitos colaterais: nenhum
- Legado: `usa_dados_de_saude` (prefira `usa_dados`)

### POST /dados/consentimentos/{id}

- Área: motor de dados
- Entrada: caminho `{id}` (`cidadao_id`); corpo, depois consulta: `decisao` (`concedido`, `recusado` ou `revogado`) e `finalidade` (padrão `saude_personalizacao`)
- Saída 200: a mesma de `GET /dados/consentimentos/{id}`, já com a decisão aplicada
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`, `400 finalidade_invalida`, `400 decisao_invalida`, `409 nada_a_revogar` (revogar sem consentimento ativo), `409 use_revogado` (recusar um consentimento já concedido; use `revogado`)
- Efeitos colaterais: grava a decisão com data e o evento `consentimento_concedido`, `consentimento_recusado` ou `consentimento_revogado`
- Legado: `usa_dados_de_saude` (prefira `usa_dados`)

### POST /dados/jornadas

- Área: motor de dados (inicia um pedido)
- Entrada: corpo, depois consulta: `cidadao_id` e `servico_id`
- Saída 200: a visão da jornada (ver "Visão da jornada" abaixo). Se já existe pedido em andamento do mesmo serviço para o cidadão, devolve esse pedido com `retomada: true`.
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`, `404 servico_nao_encontrado`, `422 jornada_indisponivel` (serviço sem pedido pelo app)
- Efeitos colaterais: grava o evento `jornada_iniciada` e um `tela_pulada` por tela pulada (só quando cria o pedido, não na retomada)

### GET /dados/jornadas/{id}

- Área: motor de dados
- Entrada: caminho `{id}` (`jornada_id`); consulta `tela` (opcional, id da tela a mostrar)
- Saída 200: a visão da jornada
- Erros: `404 jornada_nao_encontrada`
- Efeitos colaterais: nenhum

### PATCH /dados/jornadas/{id}

- Área: motor de dados (preenche campos)
- Entrada: caminho `{id}` (`jornada_id`); corpo: `campos` (objeto, ou texto JSON de um objeto); corpo, depois consulta: `tela` (opcional)
- Saída 200: a visão da jornada. Valor inválido não é erro de HTTP: volta `200` com `erros: [{ campo, mensagem }]` em texto simples, e o valor inválido não é gravado. Campo que depende de outro pode ser limpo e aparece em `alterados_por_dependencia`.
- Erros: `404 jornada_nao_encontrada`, `409 jornada_encerrada` (pedido já concluído), `400 campos_invalidos` (`campos` em texto que não é JSON)
- Efeitos colaterais: grava o evento `erro_entendimento` por campo inválido

### POST /dados/jornadas/{id}

- **Legado**: alias do `PATCH /dados/jornadas/{id}`. Mesma entrada, saída, erros e efeitos. Use `PATCH`.

### POST /dados/jornadas/{id}/confirmar

- Área: motor de dados
- Entrada: caminho `{id}` (`jornada_id`); corpo, depois consulta: `confirmar` (só `true` ou `"true"` confirma)
- Saída 200: a visão da jornada concluída, com `resumo: [{ rotulo, valor }]`, `protocolo` (fictício, formato `DEMO-AAAA-XXXXXX`), `concluida_em` e `mensagem_final`. Confirmar um pedido já concluído devolve a mesma visão concluída, sem novo protocolo.
- Erros: `404 jornada_nao_encontrada`, `400 confirmacao_necessaria`, `422 campos_pendentes`. Os dois últimos trazem `jornada` (a visão atual) além de `erro` e `mensagem`.
- Efeitos colaterais: ao concluir, grava o evento `jornada_concluida`

### GET /dados/jornadas/{id}/problema

- Área: motor de dados ("Relatar problema": o app encaminha ao canal certo; não registra o problema)
- Entrada: caminho `{id}` (`jornada_id`)
- Saída 200: `{ jornada_id, servico, texto, canais[] }`. Cada canal: `id`, `rotulo`, `detalhe`, `acao` (`abrir_link`, `abrir_app`, `discar`, `abrir_email` ou `nenhuma`). Primeiro os canais do serviço (`canal_web`, `canal_app` do catálogo), depois a Ouvidoria Geral. Sem chat. Sem dado pessoal nos links.
- Erros: `404 jornada_nao_encontrada`
- Efeitos colaterais: grava o evento `canais_vistos`

### POST /dados/jornadas/{id}/cancelar

- Área: motor de dados (simulado)
- Entrada: caminho `{id}`
- Saída 200: `{ ok, jornada }` com `estado: "cancelada"`
- Erros: `404 jornada_nao_encontrada`, `409 jornada_encerrada` (já concluída ou cancelada)
- Efeitos colaterais: grava o evento `jornada_cancelada`

### POST /dados/jornadas/{id}/alterar

- Área: motor de dados (simulado; só serviços 352 e 942)
- Entrada: caminho `{id}`
- Saída 200: `{ ok, jornada }`. Reabre o pedido concluído (`estado: "em_andamento"`), mantém os campos e remove o protocolo e a avaliação.
- Erros: `404 jornada_nao_encontrada`, `422 alteracao_indisponivel`, `409 jornada_encerrada` (pedido não concluído)
- Efeitos colaterais: grava o evento `jornada_alterada`

### POST /dados/jornadas/{id}/avaliar

- Área: motor de dados (avaliação final)
- Entrada: caminho `{id}`; corpo, depois consulta: `nota` (1 a 5) ou `nao_consegui: true`
- Saída 200: `{ ok, avaliacao: { jornada_id, nota | nao_consegui, ts, mensagem } }`. Uma vez só, em pedido concluído.
- Erros: `404 jornada_nao_encontrada`, `409 jornada_nao_concluida`, `409 ja_avaliada`, `422 nota_invalida`
- Efeitos colaterais: grava o evento `avaliacao_registrada` (com `nota` ou `nao_consegui`)

### POST /dados/eventos

- Área: motor de dados
- Entrada: corpo: `cidadao_id`, `tipo` e `servico_id` (opcional). `tipo` aceita só `tela_pulada`, `erro_entendimento`, `vitrine_vista` e `servico_aberto`. Os outros eventos o servidor registra sozinho.
- Saída 200: `{ ok: true }`
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`, `400 evento_invalido`
- Efeitos colaterais: grava o evento. Sem texto livre nem dado sensível.

### GET /dados/eventos/resumo

- Área: motor de dados
- Entrada: nenhuma
- Saída 200: `{ total, por_tipo: { "<tipo>": quantidade } }`
- Erros: nenhum específico
- Efeitos colaterais: nenhum

### GET /dados/fixados/{id}

- Área: motor de dados
- Entrada: caminho `{id}` (`cidadao_id`)
- Saída 200: `{ cidadao_id, fixados: [servico_id], limite }`. `fixados` está na ordem de fixação; `limite` é 6.
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`
- Efeitos colaterais: nenhum

### POST /dados/fixados/{id}

- Área: motor de dados
- Entrada: caminho `{id}` (`cidadao_id`); corpo: `servico_id` e `fixar` (`true` ou `false`)
- Saída 200: a mesma de `GET /dados/fixados/{id}`. Idempotente: fixar quem já está fixado ou desafixar quem não está não muda nada.
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`, `404 servico_nao_encontrado`, `422 fixar_invalido` (corpo inválido), `422 limite_de_fixados` (já são 6)
- Efeitos colaterais: quando o estado muda, grava o evento `servico_fixado` ou `servico_desafixado`

---

## Motor de recomendação

### GET /recomendacao/{id}

- Área: motor de recomendação
- Entrada: caminho `{id}` (`cidadao_id`); consulta `limite` (padrão 8; valor fora de 1 a 20 é ajustado para esse intervalo; valor vazio ou que não é número volta para 8)
- Saída 200:
  - `cidadao_id`, `base_da_personalizacao` (`historico` ou `perfil`), `explicacao_geral`, `aviso_saude`, `aviso_acessibilidade`, `total_acessos_historico`, `semana_de_referencia_da_demanda`
  - `itens: [{ posicao, servico_id, titulo, nome, orgao, tema, tipo_servico, digital, jornada_disponivel, origem, tag, motivo, outros_motivos }]`. Cada item traz o motivo em texto simples. No máximo 2 itens do mesmo órgão entre os 5 primeiros, e pelo menos 1 serviço novo ("Pessoas como você também usam").
  - `consentimento` e `consentimento_acessibilidade` (mesmo formato do consentimento de `GET /dados/cidadaos/{id}`)
  - `convite_consentimento` e `convite_acessibilidade`: `{ finalidade, titulo, resumo, opcoes }`
  - Sem consentimento, os itens e os textos não citam a condição de saúde nem a deficiência.
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`
- Efeitos colaterais: **grava o evento `vitrine_vista`** (apesar de ser `GET`)
- Legado: `usa_dados_de_saude` dentro dos objetos de consentimento (prefira `usa_dados`)

### POST /recomendacao/{id}

- **Legado**: alias do `GET /recomendacao/{id}`. Mesma saída, erros e efeitos. A diferença é que `limite` também pode vir no corpo, e o corpo vale antes da consulta. Use `GET`.

---

## Visão da jornada

Campo `acoes[]` (relatar problema, cancelar, alterar, avaliar, conforme o estado), com `rotulo`, `rotulo_leitor` e `acao` prontos. O estado `cancelada` é novo.

Formato devolvido por `POST /dados/jornadas`, `GET`, `PATCH` e `POST .../confirmar`. A tela só mostra e envia; quem decide é a API.

- `jornada_id`, `cidadao_id`, `servico: { servico_id, nome, orgao }`, `estado` (`em_andamento` ou `concluida`), `aviso`
- `telas: [{ id, titulo }]`: todas as telas do pedido. `telas_puladas`: ids das telas puladas porque todos os campos vieram do perfil e são válidos.
- `progresso: { atual, total, percentual }`
- `tela_atual: { id, titulo, revisao, campos: [{ nome, rotulo, tipo, obrigatorio, opcoes, valor, preenchido_automaticamente }] }`. Na tela de revisão, `revisao` é `true`.
- `campos_preenchidos`, `campos_preenchidos_automaticamente`, `alterados_por_dependencia`
- `faltando`: o que falta para confirmar. `erros: [{ campo, mensagem }]`: só no `PATCH`.
- `pode_confirmar`: se já dá para confirmar
- Só na jornada concluída: `resumo`, `protocolo`, `concluida_em`, `mensagem_final`
- Só na retomada de `POST /dados/jornadas`: `retomada: true`

Serviços com pedido neste protótipo: 352 (Agendar atendimento no Cadastro Único) e 942 (Agendar consultas e procedimentos). O CPF nunca é campo de tela.

---

## Erros e status

Tabela única `TABELA_ERROS` em `backend/src/api/erros.js`. Todo código tem um status só.

| Status | Códigos |
|---|---|
| 400 | `id_invalido`, `finalidade_invalida`, `decisao_invalida`, `campos_invalidos`, `evento_invalido`, `json_invalido`, `caminho_invalido`, `confirmacao_necessaria` |
| 404 | `cidadao_nao_encontrado`, `servico_nao_encontrado`, `jornada_nao_encontrada`, `rota_nao_encontrada` |
| 405 | `metodo_nao_permitido` |
| 409 | `nada_a_revogar`, `use_revogado`, `jornada_encerrada` |
| 413 | `corpo_grande` (corpo acima de 100 KB) |
| 422 | `campos_pendentes`, `jornada_indisponivel` |
| 500 | `erro_interno` (falha técnica inesperada) |

Casos de roteamento:

- Caminho que não existe, incluindo as rotas antigas sem prefixo (`/vitrine`, `/entrar`): `404 rota_nao_encontrada`.
- Caminho que existe com método não aceito: `405 metodo_nao_permitido`.
- Caminho com `%` mal formado (por exemplo `/dados/cidadaos/%E0%A4%A`) em método aceito: `400 caminho_invalido`. Em método não aceito continua `405`.
- Corpo que não é JSON: `400 json_invalido`.

Divergência registrada: a regra do projeto diz que erro que o cidadão pode corrigir volta com `200` e `ok: false`. Hoje só o valor inválido no `PATCH` de jornada segue essa regra (`200` com `erros[]`). Estes códigos de regra de negócio ainda usam status de erro: `confirmacao_necessaria`, `campos_pendentes`, `decisao_invalida`, `finalidade_invalida`, `campos_invalidos`, `nada_a_revogar`, `use_revogado` e `jornada_encerrada`. Os status foram mantidos por decisão do usuário, porque testes e README dependem deles. A decisão futura fica em um só ponto: a tabela de erros.

## Formato de erro

```json
{ "erro": "codigo", "mensagem": "texto simples para o cidadão", "...extra": "campos opcionais" }
```

- `erro`: código da tabela acima.
- `mensagem`: frase curta em português simples.
- Extra: hoje só `jornada` (a visão atual do pedido) em `confirmacao_necessaria` e `campos_pendentes`.
- Erro técnico: `500` com `erro: "erro_interno"` e mensagem genérica. O Kodiak trata com a tela de erro customizada.

### GET /recomendacao/{id}/home

- Área: motor de recomendação (Home em blocos, logado)
- Entrada: caminho `{id}` (`cidadao_id`)
- Saída 200: `{ perfil: "logado", cidadao_id, personalizacao_ativa, base_da_personalizacao, explicacao_geral, aviso_saude, aviso_acessibilidade, convite_consentimento, convite_acessibilidade, controles[], blocos[] }`. Cada bloco: `id`, `grupo` (`atalhos` ou `recomendados`), `titulo`, `itens[]` (até 3). Cada item: `posicao`, `servico_id`, `titulo`, `motivo`, `por_que_vejo { texto, dados_usados[] }`, `rotulo_leitor`, `acao`; itens recomendados trazem também `tag` e `dispensar`. Com menos de 3 acessos no histórico, o primeiro bloco é "Mais procurados". Sem personalização, devolve a estrutura da Home do visitante com `personalizacao_ativa: false`. Bloco vazio não é enviado; um serviço aparece em um bloco só.
- No primeiro bloco com `grupo: "atalhos"`, quando o cidadão tem serviços usados ou fixados com tema válido, entram também `nichos[]` (até 4 nichos, ordenados primeiro por presença de serviço fixado e depois por soma de usos e nome; apenas o primeiro com `aberto: true`, nenhum nicho vazio) e `filtros[]` (`Todos` + um filtro por nicho). Cada nicho traz `id`, `titulo`, `filtro`, `rotulo_leitor`, `aberto` e `itens[]` (até 6 itens: fixados primeiro na ordem de fixação, depois mais usados). Cada item de nicho traz `servico_id`, `titulo`, `motivo` ("Fixado por você" ou "Você usa bastante"), `fixado`, `rotulo_fixar`, `acao_fixar { tipo: "fixar_servico", servico_id, fixar }`, `rotulo_leitor`, `logo { tipo: "sigla", valor }` e `banner { titulo, texto, rotulo_botao, rotulo_leitor, acao }` (sem dados de telefone, horário ou local da unidade).
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`
- Efeitos colaterais: grava o evento `home_vista`

### GET /recomendacao/visitante/home

- Área: motor de recomendação (Home simplificada, sem login)
- Entrada: consulta opcional `q` (filtra pelo nome do serviço)
- Saída 200: `{ perfil: "visitante", explicacao_geral, mensagem_busca, blocos[] }`. Blocos "Mais usados" (até 6) e "Atalhos de 1 toque" (3). Cada item: `posicao`, `servico_id`, `titulo`, `orgao`, `motivo`, `rotulo_leitor`, `acao` (`abrir_servico` ou `iniciar_jornada`). Bloco sem item não é enviado.
- Erros: nenhum de regra de negócio
- Efeitos colaterais: grava o evento `home_visitante_vista` (sem `cidadao_id`). Não lê perfil, histórico, saúde nem acessibilidade.

### POST /recomendacao/{id}/dispensar

- Área: motor de recomendação ("Não me interessa")
- Entrada: caminho `{id}` (`cidadao_id`); corpo, depois consulta: `servico_id`
- Saída 200: `{ ok, cidadao_id, dispensados }` (lista de serviços dispensados). O serviço deixa de aparecer na vitrine do cidadão.
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`, `404 servico_nao_encontrado`
- Efeitos colaterais: grava a preferência e o evento `servico_dispensado`

### POST /recomendacao/{id}/personalizacao

- Área: motor de recomendação ("Não usar meus dados para sugestões")
- Entrada: caminho `{id}` (`cidadao_id`); corpo, depois consulta: `ativa` (`true` ou `false`)
- Saída 200: `{ ok, cidadao_id, personalizacao_ativa }`. Com `false`, a vitrine ignora histórico, saúde e acessibilidade e usa só o perfil geral (`base_da_personalizacao: perfil`).
- Erros: `400 id_invalido`, `404 cidadao_nao_encontrado`, `400 valor_invalido`
- Efeitos colaterais: grava a preferência e o evento `personalizacao_ligada` ou `personalizacao_desligada`
