# Documento de Design

Protótipo do Desafio 1 (Conecta Recife): Home personalizada (A) e Serviços solicitados (C), construídos nesta ordem. O Kodiak monta as telas e chama a nossa API. A API lê os dados de `BD/`.

Convenção deste documento: **Existe** = já está em `backend/src`. **A construir** = ainda não existe. **Medido** = número que conferi rodando o código em 12/11/2026.

Requisitos: `requirements.md`. Perfis: `perfis-de-usuario.md`.

## 1. Arquitetura

```
Cidadão ── app Conecta Recife (SDK Kodiak)
              │  pede a próxima tela
              ▼
           Engine Kodiak ── lê a configuração da tela ── chama a nossa API (HTTPS, URL pública)
                                                            │
                                         ┌──────────────────┴───────────────────┐
                                         ▼                                      ▼
                              Módulos da API (Node)                   Estado do protótipo
                              vitrine, regras, consentimento,         data/estado.json
                              jornada, solicitações*                (consentimentos, jornadas, eventos, ...)
                                         ▲
                                         │ memória, carregada na partida
                              Camada de dados (seção 3)
                                         ▲
                       BD/*.csv (somente leitura) + data/derivados.json (calculado offline)
```

`*` = a construir.

Decisões:

- **Servidor Node com dados em memória; estado no DynamoDB e dados no S3.** O servidor continua Node e continua lendo os dados em memória, porque 89.046 cidadãos e 593.056 acessos cabem (Medido: carga de `cidadaos`, `historico`, `servicos` e `uso_semanal` em 1,1 s, 389 MB de memória). O que muda é onde as coisas ficam na AWS (seção 13): o estado do protótipo vai para o DynamoDB e os CSVs e a configuração vão para o S3. Em desenvolvimento local nada muda: arquivos em `BD/` e `data/`. O `docs/escopo-agente-e-dados.md` previa Lambda; Lambda foi descartada (seção 13.1). A dependência do AWS SDK (versão fixada) é aceita só para DynamoDB e S3. O modelo de tabelas do documento antigo continua útil como referência de entidades.
- **A chamada é feita pelo Kodiak, não pelo app.** Por isso a API precisa de URL pública, estável e HTTPS, e de liberação do backend pela equipe Kodiak (Requisito 6.1).
- **Dados 100% fictícios.** Nenhuma ação envia nada à Prefeitura (Requisito 5.10).

## 2. Rastreabilidade

| Requisito | Seção |
|---|---|
| 1, 2, 3 (perfis, Home, motivo e controle) | 5 |
| 4 (consentimento) | 3.9, 5.6 |
| 5 (serviços solicitados) | 6 |
| 6 (API) | 4, 13 |
| 7 (medição) | 7 |
| 8, 9 (demo, entrar como) | 10 |
| 10 (acessibilidade e linguagem simples) | 8 |
| 11 (`recomendacoes.csv`) | 9 |
| Dados de `BD/` | 3, 13 |
| Hospedagem, estado e segurança na AWS | 13 |

## 3. Camada de dados (`BD/`)

### 3.1 Princípios

- `BD/` é **somente leitura**. Nenhum código escreve nele nem altera os CSVs.
- Tudo o que o protótipo cria vai para `data/`: estado dos cidadãos, valores derivados e arquivos de entrega. `data/` e `BD/` estão no `.gitignore`.
- Os dados valem só para o desafio: não redistribuir e apagar ao fim do evento (Guia dos dados). Isso vale também para o servidor público (seção 3.8).
- Saúde fica separada do perfil desde a leitura (seção 3.9).
- Visitantes sem login nunca são ligados a um `cidadao_id` (Requisito 1.5).

### 3.2 Arquivos e uso

| Arquivo | Linhas | Quando é lido | Uso |
|---|---|---|---|
| `cidadaos.csv` | 89.046 | Partida da API | Perfil e saúde por `cidadao_id` |
| `historico.csv` | 593.056 | Partida da API | Últimos serviços, "Seus atalhos", continuar |
| `servicos.csv` | 843 | Partida da API | Catálogo, busca, jornada, `passos` e `requisitos` |
| `uso_semanal.csv` | 11.587 (68 semanas, de 09/06/2025 a 21/09/2026) | Partida da API | Demanda e sazonalidade |
| `visitas_sem_login.csv` | 3.563.242 (157 MB) | **Só offline**, em `npm run derivar` | Próximo serviço e mais usados sem login |

A API em produção não precisa de `visitas_sem_login.csv`. Ela só precisa do que o `derivar` gera a partir dele.

### 3.3 Regras de leitura (`csv.js`, `dados.js`) — Existe

- Leitura em streaming. Suporta campos com aspas, vírgula e quebra de linha dentro das aspas (`servicos.csv` tem texto multilinha), BOM no cabeçalho e linhas vazias.
- Vazio vira `null` em `situacao_renda`, `criancas_na_familia`, `nivel_digital_atual` e `nota_media`. Vazio **não** significa "nenhum": `criancas_na_familia` vazio é desconhecido e nunca é tratado como `nenhuma` (Requisito 2.15).
- Booleanos `true/false` viram booleanos. Listas separadas por `|` viram arrays (`temas`, `publicos_alvo`, `palavras_chave`). `requisitos` e `passos` viram uma lista de itens, um por linha.
- Strings repetidas (`faixa_etaria`, `sexo`, datas) são internadas para economizar memória.
- `canal_app` é ignorado, porque o campo mistura nome de serviço, URL e sigla.
- `normalizarId` aceita `C000001`, `c1` ou `1`.

### 3.4 Modelo em memória — Existe

| Estrutura | Chave | Valor |
|---|---|---|
| `dados.cidadaos` | `cidadao_id` | `{ perfil, saude }`. `saude` guarda `hipertensao`, `diabetes`, `saude_mental`, `gestante` e `pessoa_com_deficiencia` |
| `dados.historico` | `cidadao_id` | Lista `[data, hora, servico_id, sessao_id]` em ordem cronológica |
| `dados.servicos` | `servico_id` | Serviço normalizado (nome, órgão, temas, natureza, requisitos, passos, `nivel_digital`, cliques, nota) |
| `dados.usoSemanal` | lista | `{ semana, servico_id, cliques }` |

Colunas que o carregador hoje **descarta**: `ordem_na_sessao`, `login`, `visitas`, `visitantes`, `aparelhos_sem_login_historico`, `canal_*`. Nenhuma é necessária para o que existe. Duas viram necessárias neste design: `ordem_na_sessao` (3.5) e `aparelhos_sem_login_historico` (3.6, mais usados sem login).

### 3.5 Ordem dos cliques — Existe, mas implícita

O Guia manda ordenar por `ordem_na_sessao`, porque 91% das visitas têm a mesma `hora` (precisão de minuto). O carregador ordena só por `data + hora` e depende de o `sort` ser estável e de o arquivo já vir em ordem.

Medido: nas 420.969 sessões, a sequência de serviços do carregador é igual à sequência por `ordem_na_sessao` (0 divergências). Funciona hoje, mas fica frágil se o arquivo mudar.

**A construir:** guardar `ordem_na_sessao` e ordenar por `(data, hora, sessao_id, ordem_na_sessao)`. O mesmo vale para a leitura de `visitas_sem_login` no `derivar`, que hoje assume o arquivo ordenado por visitante e sessão.

### 3.6 Valores derivados (`derivar`) — Existe em parte

`npm run derivar` lê tudo, inclusive as visitas sem login em streaming, e grava `data/derivados.json` (versão 2). A API carrega esse arquivo na partida. Se ele não existir ou a versão for outra, a API o regera sozinha, o que leva mais tempo por causa do arquivo de visitas.

| Derivado | Estado | Como é calculado |
|---|---|---|
| `proximo` | Existe | Pares de serviços consecutivos em sessões com login e sem login. Mesma sessão pesa 1, sessões diferentes pesam 0,5. Top 12 por serviço |
| `populares` | Existe | Por segmento não sensível (faixa de idade, sexo, RPA, marcadores, renda, crianças): pessoas únicas por serviço e `lift` ≥ 1,4, mínimo de 15 pessoas. Saúde **nunca** entra nos segmentos |
| `demanda` | Existe | Cliques das últimas 4 semanas contra a média das 8 anteriores. Entra quem tem razão ≥ 1,25 e mínimo de 40 cliques |
| `sazonal` | A construir | Cliques na janela de ±2 semanas em torno da mesma semana do ano anterior, contra a média das semanas do serviço. Entra quem tem razão ≥ 1,3 e volume mínimo. Serve a "Nesta época do ano" |
| `mais_usados_sem_login` | A construir | Visitantes distintos por serviço em `visitas_sem_login.csv`, com desempate por cliques. Serve à Home do visitante |

Cuidados:

- `uso_semanal`: semana sem linha significa menos de 10 visitantes, **não zero**. A razão só vale com volume mínimo, e serviços com poucas semanas presentes ficam fora.
- `login = sim` conta pessoas e `nao` conta aparelhos. Somamos só `cliques`, e nunca misturamos `visitantes` das duas linhas.
- A série cobre 68 semanas seguidas, então existe a mesma época do ano anterior. Os dados terminam em 21/09/2026. Para "hoje" (12/11/2026), a semana equivalente é a de 10/11/2025. Para "demanda", a semana de referência continua sendo a última da série (`semana_ref`).
- Adicionar `sazonal` e `mais_usados_sem_login` exige subir `VERSAO` para 3. Assim todo ambiente regera o arquivo.
- `proximo` usa visitas sem login só como estatística agregada.

### 3.7 Estado do protótipo (`store.js`) — Existe em parte

`data/estado.json` guarda o que a pessoa faz no protótipo, separado de `BD/`.

| Coleção | Estado | Conteúdo |
|---|---|---|
| `consentimentos` | Existe | `[{ finalidade, status, ts, versao_texto }]` por cidadão |
| `jornadas` | Existe | Pedidos: campos, `auto`, `estado`, `protocolo` |
| `eventos` | Existe | `{ cidadao_id, tipo, ts, ... }` |
| `preferencias` | A construir | `{ personalizacao: "ligada" \| "desligada", blocos_desligados: [] }` |
| `salvos` | A construir | Lista de `servico_id` por cidadão |
| `problemas`, `avaliacoes` | A construir | Seção 6 |

Como funciona hoje: gravação com atraso de 500 ms, atômica (arquivo temporário e `rename`), e gravação final ao encerrar (`SIGINT`, `SIGTERM`).

Limites aceitos para o protótipo: uma única instância, perda de até 500 ms de escrita se o processo cair, e `eventos` limitado a 5.000 (os mais antigos saem). O limite de eventos prejudica a medição no pitch. **A construir (só desenvolvimento local):** gravar eventos em `data/eventos.jsonl` (uma linha por evento, só acrescenta) e manter em memória apenas os contadores. No ambiente AWS, estado e eventos vão para o DynamoDB, com TTL de 30 dias nos eventos (seção 13.4).

### 3.8 Implantação dos dados

- O servidor público precisa de `cidadaos.csv`, `historico.csv`, `servicos.csv`, `uso_semanal.csv` (cerca de 40 MB) e `data/derivados.json`. Não precisa de `visitas_sem_login.csv`.
- O `derivar` roda na máquina da equipe. O `derivados.json` sobe junto. Assim o servidor nunca lê as visitas sem login.
- Os caminhos vêm das variáveis `BD_DIR` e `DATA_DIR`. **Existe.**
- Ao fim do evento: apagar `BD/`, `data/` e as cópias no servidor.

### 3.9 Privacidade na camada de dados

- `saude` é um atributo separado em `dados.cidadaos`. `entrarComo` e `montarVitrine` só o leem quando `temConsentimentoSaude(id)` é verdadeiro. **Existe.**
- Segmentos e `populares` nunca usam saúde. **Existe.**
- Serviços voltados a uma condição de saúde (`ehServicoSensivel`) só aparecem por regra de saúde com consentimento. **Existe.**
- **A construir:** `GET /entrar/:id` deixa de devolver o bloco `saude`. A tela de entrada não precisa dele. A saúde só é lida dentro do servidor, e só com consentimento.
- **A construir:** na Home, itens de saúde têm `titulo` discreto ("Cuidado com a sua saúde"). O nome real do serviço só aparece no detalhe, depois do toque (Requisito 4.3). Ver 4.5.
- `eventos` guardam tipo, data e `servico_id`. Não guardam texto livre, CPF, nome ou endereço.
- **Divergência a decidir:** `CAMPOS_SAUDE` e `REGRAS_SAUDE` tratam `pessoa_com_deficiencia` como saúde sob consentimento. O Requisito 4.1 lista só `hipertensao`, `diabetes`, `saude_mental` e `gestante`, e o Requisito 10.5 diz que o marcador PCD não muda a interface sozinho. Opções: manter PCD sob consentimento (mais seguro, e ajustar o Requisito 4.1) ou tirar PCD do consentimento e só usá-lo em sugestões de direitos. Recomendo manter sob consentimento e atualizar o requisito.

### 3.10 Validação dos dados — A construir

`npm run validar-dados`, também executada na partida (só registra aviso, não impede a API de subir). Confere:

- 89.046 cidadãos, 593.056 acessos, 843 serviços, 5.778 cidadãos sem histórico, 11.587 linhas de uso semanal.
- Todo `cidadao_id` do histórico existe em `cidadaos`. Todo `servico_id` do histórico, do uso e das visitas existe em `servicos`.
- Valores válidos: `situacao_renda` em {`extrema_pobreza`, `pobreza`, vazio}. `criancas_na_familia` em {`primeira_infancia`, `crianca`, `adolescente`, `nenhuma`, vazio}.
- `GET /health` já devolve contagens e a data dos derivados. Passa a incluir o resultado da validação.

## 4. API para o Kodiak

### 4.1 O que o Kodiak impõe

Fonte: `docs/kodiak-referencia.md`.

- A chamada parte da plataforma. A API precisa de URL pública, estável e HTTPS, e do backend liberado pela equipe Kodiak.
- Tipos de chamada aceitos: GET, POST, PUT e DELETE. **Não há PATCH.** As rotas de escrita da API já aceitam POST e PUT além de PATCH.
- Headers não são configuráveis na tela. Não dá para depender de um token nosso em header. A API é aberta e só serve dados fictícios.
- A URL base vem de variável por ambiente (`#server{}` ou `#partner{}`), nunca fixa na tela (Requisito 6.7).
- Várias requisições na mesma tela rodam **em paralelo**, sem ordem. Para chamadas dependentes, usa-se Switch. Exemplo: criar o pedido e só depois abrir a tela do pedido com o `jornada_id`.
- Erro: sem tratamento customizado o Kodiak mostra uma tela genérica. Para controlar a falha, marcar "tratamento de erro customizado" e ler `${alias.response.error}` e `${alias.response.info}`.
- O servidor fala HTTP puro na porta 8080 (`PORT`). O HTTPS termina no ALB (seção 13).

### 4.2 Formato de erro

Todo erro da API tem o mesmo formato, com status HTTP correto: `{ "erro": "codigo_curto", "mensagem": "Texto em linguagem simples" }`, e às vezes dados extras. **Existe.** Falta confirmar com o suporte Kodiak se `response.error` e `response.info` correspondem a `erro` e `mensagem` ou a outros campos (pendência).

### 4.3 Rotas

| Rota | Estado | Uso |
|---|---|---|
| `GET /health` | Existe | Contagens e versão dos derivados |
| `GET /demo/cidadaos` | Existe | Amostras por cenário. **A construir:** incluir as 8 personas oficiais |
| `GET\|POST /entrar/:id` | Existe | "Entrar como": perfil, resumo, histórico recente, consentimento |
| `GET\|POST /vitrine/:id` | Existe | Lista plana de itens com motivo (base da Home) |
| `GET /home/:id` | A construir | Home em blocos (seção 5) |
| `GET /home` | A construir | Home simplificada do visitante |
| `GET /servicos/busca?q=` | A construir | Busca |
| `GET /servicos/:id` | Existe | Detalhe |
| `GET /consentimento/texto` e `GET /consentimento/:id` | Existe | Texto e situação |
| `POST\|PUT /consentimento/:id` | Existe | `concedido`, `recusado`, `revogado` |
| `GET\|POST /preferencias/:id` | A construir | Ligar e desligar personalização |
| `GET\|POST\|DELETE /salvos/:id` | A construir | Favoritos |
| `POST /jornadas`, `GET /jornadas/:id`, `PUT\|POST /jornadas/:id`, `POST /jornadas/:id/confirmar` | Existe (PATCH também funciona, mas o Kodiak não o usa) | Pedido por telas |
| `GET /cidadaos/:id/jornadas` | Existe | Lista de pedidos |
| `GET /cidadaos/:id/solicitacoes` | A construir | Card "Serviços solicitados" |
| `POST /solicitacoes/:id/{problema,cancelar,alterar,avaliacao}` | A construir | Ações do card |
| `POST /eventos`, `GET /eventos/resumo` | Existe | Medição (seção 7) |

### 4.4 Padrão de contrato por tela do Kodiak

Objetivo: a tela do Kodiak só mostra dados. Ela não decide nada por expressão.

Regras:

1. **Uma requisição principal por tela.** A Home usa só `GET /home/{id}`, que já traz acompanhamento, convite de consentimento e preferências. Requisições independentes na mesma tela rodam em paralelo. As dependentes usam Switch. Exemplo: criar o pedido e depois abrir a tela com o `jornada_id`.
2. **Chaves sempre presentes.** O que não existe vira `null`, `""` ou `[]`. Nunca se omite a chave (`resumo`, `protocolo`, `descricao`, `convite_consentimento` e outras). **A construir:** hoje `jornada.js` omite chaves em alguns casos.
3. **Cada item navegável traz `acao`** (4.5), para a tela não decidir o destino por expressão.
4. **Erro HTTP significa "levar à tela de erro customizada".** Vale para: id inválido ou inexistente, serviço ou pedido inexistente, pedido já encerrado e erro interno. Formato: `{ "erro": "codigo", "mensagem": "texto simples" }`.
5. **Validação recuperável não é erro HTTP.** Campo inválido, confirmação pendente e campos faltando voltam com 200, `ok: false` e `erros[]`, para a tela continuar visível. **A construir:** hoje `confirmacao_necessaria` e `campos_pendentes` voltam com 400 e 422.
6. **Só GET, POST, PUT e DELETE.** O Kodiak não tem PATCH. **A construir:** corrigir o índice da API (`GET /`), que ainda anuncia PATCH.
7. **Identidade.** O `cidadao_id` vem da tela "Entrar como" e é passado como parâmetro de navegação para as demais telas.
8. **Pendência:** confirmar com o suporte Kodiak se `response.error` e `response.info` leem `erro` e `mensagem`.

Códigos de erro HTTP:

| Código | Status | Quando |
|---|---|---|
| `id_invalido` | 400 | `cidadao_id` ou outro id fora do formato |
| `json_invalido` | 400 | Corpo que não é JSON |
| `cidadao_nao_encontrado` | 404 | Id válido, mas fora de `cidadaos.csv` |
| `servico_nao_encontrado` | 404 | `servico_id` fora do catálogo |
| `jornada_nao_encontrada` | 404 | Pedido inexistente |
| `solicitacao_nao_encontrada` | 404 | Solicitação inexistente |
| `rota_nao_encontrada` | 404 | Rota que não existe |
| `metodo_nao_permitido` | 405 | Método fora da rota |
| `jornada_encerrada` | 409 | Pedido já concluído ou cancelado |
| `corpo_grande` | 413 | Corpo acima do limite |
| `erro_interno` | 500 | Falha inesperada |

Telas (templates a validar com a skill de templates). Os aliases são sugestões:

| Tela | Template provável | Requisição (alias, método, rota) | O que a tela lê | Ação |
|---|---|---|---|---|
| Entrar como | Formulário e Lista | `entrada`, GET `/v1/demo/cidadaos` e POST `/v1/entrar/{id}` | `personas[]`, `cidadao_id`, `resumo` | Abrir a Home com o `cidadao_id` |
| Home (personalizada e simplificada) | Central 2 | `home`, GET `/v1/home/{id}` (visitante: GET `/v1/home`) | `modo`, `grupos[].blocos[].itens[]`, `convite_consentimento`, `preferencias` | `item.acao` |
| Detalhe do serviço | Item Details | `servico`, GET `/v1/servicos/{id}` | `nome`, `descricao`, `requisitos[]`, `passos[]`, `jornada_disponivel` | Iniciar pedido ou abrir canal |
| Busca | Lista | `busca`, GET `/v1/servicos/busca?q=` | `resultados[]` (itens) | `item.acao` |
| Consentimento (convite e Privacidade) | Texto ou Intro | `consent`, GET `/v1/consentimento/{id}` e POST `/v1/consentimento/{id}` | `texto`, `status`, `deve_pedir_agora` | Conceder, recusar ou revogar |
| Preferências | Formulário | `prefs`, GET e POST `/v1/preferencias/{id}` | `personalizacao`, `blocos_desligados[]` | Ligar ou desligar |
| Pedido (sobre, documentos, local, dia e horário, avisos) | Formulário | `pedido`, POST `/v1/jornadas`, GET e PUT `/v1/jornadas/{id}` | `tela_atual`, `campos[]`, `ok`, `erros[]` | Avançar |
| Revisar e confirmar | Formulário com rodapé | `pedido`, POST `/v1/jornadas/{id}/confirmar` | `resumo`, `ok`, `erros[]` | Confirmar |
| Comprovante e avaliação | Comprovante | `solic`, GET `/v1/cidadaos/{id}/solicitacoes` e POST `/v1/solicitacoes/{id}/avaliacao` | `protocolo`, `proximo_passo`, `acoes[]` | Dar nota ou "Não consegui" |
| Card Serviços solicitados e etapas | Tracking | `solic`, GET `/v1/cidadaos/{id}/solicitacoes` | `etapas[]`, `o_que_falta`, `acoes[]`, `canais[]` | Problema, cancelar, alterar |
| Relatar problema | Formulário | `solic`, POST `/v1/solicitacoes/{id}/problema` | `ok`, `erros[]`, `canais[]` | Voltar ao card |
| Erro customizado | Intro | Usa `${alias.response.error}` e `${alias.response.info}` da tela de origem | `erro`, `mensagem` | Tentar de novo ou voltar |

A tela de revisão mostra o resumo devolvido pela API (`resumo`) e só envia com o botão de confirmar. Home personalizada e Home simplificada são a mesma tela: só muda o `modo` e o conteúdo.

### 4.5 Contratos JSON

Todas as chaves aparecem sempre. Todas as rotas ganham o prefixo `/v1`. **A construir:** o prefixo e a regra de versionamento. Regra: dentro da `/v1` só se acrescentam campos, nunca se removem nem se renomeiam. Mudança incompatível vira `/v2`. As rotas sem prefixo ficam como apelido durante o desenvolvimento.

#### Item

```json
{
  "servico_id": 1240,
  "titulo": "Caderneta da criança",
  "subtitulo": "Prefeitura do Recife",
  "tag": "Para o seu perfil",
  "motivo": "Há uma criança pequena na sua família.",
  "porque": { "texto": "Mostramos isto pelo seu perfil.", "base": "perfil" },
  "acao": { "tipo": "abrir_servico", "servico_id": 1240, "jornada_id": null },
  "jornada_disponivel": false,
  "rotulo_acessivel": "Caderneta da criança. Aparece porque há uma criança pequena na sua família."
}
```

- `acao.tipo` ∈ `abrir_servico`, `iniciar_pedido`, `retomar_pedido`, `ver_solicitacao`.
- `jornada_id` só vem preenchido em `retomar_pedido` e `ver_solicitacao`. Nos outros tipos é `null`.
- **Itens de saúde** (bloco "Cuidar de você"): `titulo` é discreto, por exemplo "Cuidado com a sua saúde". O nome real só aparece no detalhe, depois do toque (Requisito 4.3). O `motivo` é "Aparece porque você autorizou".

#### Bloco e Home

`GET /v1/home/{id}` devolve o mesmo formato nos dois modos. Só muda o conteúdo.

```json
{
  "cidadao_id": "C000003",
  "modo": "personalizada",
  "base_da_personalizacao": "historico",
  "explicacao_geral": "Montamos esta lista com o seu perfil e com os serviços que você já usou.",
  "aviso_saude": "Não usamos nenhuma informação de saúde nesta lista.",
  "busca_habilitada": true,
  "grupos": [
    { "id": "atalhos", "titulo": "Seus atalhos", "blocos": [
      { "id": "atalhos", "titulo": "Seus atalhos", "itens": [] } ] }
  ],
  "preferencias": { "personalizacao": "ligada", "blocos_desligados": [] },
  "convite_consentimento": null
}
```

Na `simplificada`: `base_da_personalizacao` é `"nenhuma"`, `explicacao_geral` e `aviso_saude` são `""`, `convite_consentimento` é `null`, e os grupos são `atalhos` e `mais_usados` (mais, para quem está logado, `acompanhamento`).

`GET /v1/home` (visitante, sem id):

```json
{
  "cidadao_id": null,
  "modo": "simplificada",
  "base_da_personalizacao": "nenhuma",
  "explicacao_geral": "",
  "aviso_saude": "",
  "busca_habilitada": true,
  "grupos": [
    { "id": "atalhos", "titulo": "Atalhos", "blocos": [
      { "id": "atalhos", "titulo": "Atalhos", "itens": [] } ] },
    { "id": "mais_usados", "titulo": "Mais usados", "blocos": [
      { "id": "mais_usados", "titulo": "Mais usados", "itens": [] } ] }
  ],
  "preferencias": { "personalizacao": "desligada", "blocos_desligados": [] },
  "convite_consentimento": null
}
```

Itens do visitante: no máximo 4 atalhos e 6 "Mais usados". `tag` e `porque.texto` vêm vazios, e `motivo` tem uma linha só quando houver.

`convite_consentimento`, quando existe: `{ "titulo": "...", "texto": "...", "versao_texto": "..." }`. Sem convite, `null`.

#### Preferências

`GET /v1/preferencias/{id}` e `POST /v1/preferencias/{id}`:

```json
// POST (corpo)
{ "personalizacao": "desligada", "blocos_desligados": ["pet"] }
// resposta (as duas rotas)
{ "ok": true, "erros": [], "cidadao_id": "C000003",
  "personalizacao": "desligada", "blocos_desligados": ["pet"], "atualizado_em": "2026-11-12T10:00:00Z" }
```

Valor fora da lista: 200 com `ok: false` e `erros: [{ "campo": "personalizacao", "mensagem": "Escolha ligada ou desligada." }]`. Cidadão inexistente: 404 `cidadao_nao_encontrado`.

#### Salvos

`GET /v1/salvos/{id}` lista. `POST /v1/salvos/{id}` com `{ "servico_id": 1240 }` salva. `DELETE /v1/salvos/{id}?servico_id=1240` remove (DELETE sem corpo, para o Kodiak).

```json
{ "ok": true, "erros": [], "cidadao_id": "C000003", "itens": [] }
```

`servico_id` fora do catálogo: 404 `servico_nao_encontrado`. Salvar o que já está salvo ou remover o que não está salvo é `ok: true`, sem erro.

#### Busca

`GET /v1/servicos/busca?q=cadastro`:

```json
{ "q": "cadastro", "total": 3, "resultados": [] }
```

`resultados` usa o formato de Item (`tag` e `porque.texto` vazios). `q` vazio devolve `ok`, `total: 0` e `resultados: []`, sem erro. No máximo 8 resultados.

#### Entrar como

`POST /v1/entrar/{id}`: **A construir**, sem o bloco `saude`.

```json
{
  "ok": true,
  "cidadao_id": "C007938",
  "perfil": { "faixa_etaria": "60+", "sexo": "F", "rpa": 3 },
  "resumo": "Mulher, 68 anos, RPA 3.",
  "tem_historico": true,
  "historico_recente": [],
  "consentimento": { "status": "pendente", "deve_pedir_agora": true }
}
```

Erros: 400 `id_invalido`, 404 `cidadao_nao_encontrado` (a mensagem informa a faixa válida).

#### Pedido (jornada)

Visão do pedido, devolvida por `POST /v1/jornadas`, `GET /v1/jornadas/{id}` e `PUT /v1/jornadas/{id}`:

```json
{
  "ok": true,
  "erros": [],
  "jornada_id": "J-XXXXXXXXXX",
  "servico_id": 352,
  "estado": "em_andamento",
  "tela_atual": "local",
  "telas": [ { "id": "local", "titulo": "Local", "situacao": "atual" } ],
  "campos": [ { "id": "unidade", "rotulo": "Unidade", "tipo": "escolha", "opcoes": [], "valor": null, "obrigatorio": true } ],
  "puladas": [],
  "alterados_por_dependencia": [],
  "resumo": null,
  "protocolo": null,
  "descricao": "Escolha onde quer ser atendido."
}
```

Validação recuperável: 200 com `ok: false`.

```json
{ "ok": false,
  "erros": [ { "campo": "hora", "mensagem": "Esse horário não está mais livre." } ],
  "jornada_id": "J-XXXXXXXXXX", "tela_atual": "data_hora" }
```

`POST /v1/jornadas/{id}/confirmar` sem `confirmar: true`: 200 com `ok: false` e `erros: [{ "campo": "confirmar", "mensagem": "Toque em confirmar para enviar." }]`. Com campos faltando: `ok: false` e um erro por campo. Quando conclui: `ok: true`, `estado: "concluida"`, `protocolo` e `resumo` preenchidos.

Erros HTTP: 404 `jornada_nao_encontrada`, 409 `jornada_encerrada`, 404 `servico_nao_encontrado` (em `POST /v1/jornadas`).

#### Solicitação e ações

`GET /v1/cidadaos/{id}/solicitacoes` segue o formato de 6.4, com `solicitacoes: []` quando não há nenhuma. Ações:

| Rota | Corpo | Resposta (`ok: true`) | Erros possíveis |
|---|---|---|---|
| `POST /v1/solicitacoes/{id}/problema` | `{ "categoria": "nao_consegui_agendar", "descricao": "..." }` | `{ "ok": true, "erros": [], "problema_id": "P-...", "canais": [] }` | 200 `ok: false` (categoria fora da lista, descrição acima de 200 caracteres ou com dado sensível). 404 `solicitacao_nao_encontrada` |
| `POST /v1/solicitacoes/{id}/cancelar` | `{}` | `{ "ok": true, "erros": [], "status": "cancelada" }` | 404 `solicitacao_nao_encontrada`, 409 `jornada_encerrada` (já cancelada) |
| `POST /v1/solicitacoes/{id}/alterar` | `{}` | `{ "ok": true, "erros": [], "status": "em_andamento", "jornada_id": "J-...", "tela_atual": "data_hora" }` | 404 `solicitacao_nao_encontrada`, 409 `jornada_encerrada` (cancelada) |
| `POST /v1/solicitacoes/{id}/avaliacao` | `{ "nota": 4 }` ou `{ "nao_consegui": true }` | `{ "ok": true, "erros": [], "nota": 4, "nao_consegui": false }` | 200 `ok: false` (nota fora de 1 a 5, ou antes do comprovante). 404 `solicitacao_nao_encontrada` |
| `POST /v1/solicitacoes/{id}/avancar` (simulado, só demo) | `{}` | `{ "ok": true, "erros": [], "etapa_atual": "entrevista", "o_que_falta": "..." }` | 404 `solicitacao_nao_encontrada`, 409 `jornada_encerrada` |

Todas as respostas trazem `ok` e `erros`. Rotas de escrita aceitam POST (e PUT onde já existe). Não há PATCH.

## 5. Frente A: Home personalizada

### 5.1 O que já existe

`montarVitrine` devolve uma **lista plana** de até 8 itens, cada um com `origem`, `tag`, `motivo` e `outros_motivos`, mais `base_da_personalizacao` (`historico`, `historico_curto` ou `perfil`), `explicacao_geral`, `aviso_saude` e o convite de consentimento. Ele já cumpre:

- candidatos por perfil e momento de vida (`REGRAS`), saúde só com consentimento (`REGRAS_SAUDE`);
- próximo serviço por histórico e "continue de onde parou";
- populares por perfil parecido, que funcionam sem histórico;
- demanda em alta e base geral, para nunca ficar sem candidatos;
- no máximo 2 serviços do mesmo órgão entre os 5 primeiros (Requisito 2.17) e no máximo 1 repetição do histórico;
- pelo menos 1 serviço novo com o motivo "Pessoas como você também usam" (Requisito 2.14);
- retirada de "Inscrever-se no Cadastro Único" (1032) e "Receber o Bolsa Família" (995, 1032) de quem já tem os dois (Requisito 2.16, parte);
- `criancas_na_familia` vazio tratado como desconhecido.

### 5.2 O que falta

| Requisito | Falta |
|---|---|
| 2.1, 2.3 blocos | Agrupar itens em blocos e grupos |
| 2.2 atalhos | Mais usados pelo cidadão, em posição fixa |
| 2.4 continue | Pedidos em andamento |
| 2.6 direitos | Bloco com "pode ter direito a" |
| 2.8 época do ano | Derivado `sazonal` |
| 2.9 não esquecer | Prazos simulados |
| 2.11 salvos | Favoritos |
| 2.12 próximo passo | Sugestão após concluir um serviço |
| 2.16 Bolsa Família como status | Hoje só se retira a inscrição. Falta mostrar o status e sugerir atualizar cadastro ou agendar atendimento |
| 3 motivo e controle | "Por que vejo isso?" e desligar |
| 1.4 visitante | Home simplificada |

### 5.3 Contrato de `GET /home/:id` (A construir)

O contrato final, com `acao`, `subtitulo` e chaves sempre presentes, está na seção 4.5. O exemplo abaixo mostra a estrutura. Nos itens de saúde, o `titulo` é discreto.

```json
{
  "cidadao_id": "C000003",
  "modo": "personalizada",
  "base_da_personalizacao": "historico",
  "explicacao_geral": "Montamos esta lista com o seu perfil e com os serviços que você já usou.",
  "aviso_saude": "Não usamos nenhuma informação de saúde nesta lista.",
  "grupos": [
    { "id": "atalhos", "titulo": "Seus atalhos", "blocos": [
      { "id": "atalhos", "titulo": "Seus atalhos", "itens": [ { "...": "Item" } ] } ] },
    { "id": "recomendados", "titulo": "Recomendados", "blocos": [
      { "id": "familia", "titulo": "Para sua família", "itens": [] } ] },
    { "id": "acompanhamento", "titulo": "Acompanhamento", "blocos": [
      { "id": "solicitados", "titulo": "Serviços solicitados", "itens": [] } ] }
  ],
  "preferencias": { "personalizacao": "ligada", "blocos_desligados": [] },
  "convite_consentimento": null
}
```

Item:

```json
{
  "servico_id": 1240,
  "titulo": "Nome curto do serviço (discreto nos itens de saúde, ver 4.5)",
  "orgao": "SIGLA",
  "tag": "Para o seu perfil",
  "motivo": "Há uma criança pequena na sua família. Este serviço ajuda no acompanhamento.",
  "porque": { "texto": "Mostramos isto pelo seu perfil.", "base": "perfil" },
  "jornada_disponivel": false,
  "rotulo_acessivel": "Nome do serviço. Aparece porque há uma criança pequena na sua família."
}
```

`porque.base` ∈ `perfil`, `historico`, `populares`, `epoca`, `saude_autorizada`.

### 5.4 Montagem dos blocos

Cada regra de `REGRAS` ganha o campo `bloco`. O item passa a carregar `regra`, além de `origem`.

| Bloco | Origem dos itens |
|---|---|
| Seus atalhos | Serviços distintos mais acessados no `historico` do cidadão, no máximo 4, ordenados por frequência e depois recência. A ordem só muda quando a frequência muda |
| Continue seu pedido | Jornadas `em_andamento` do cidadão |
| Para sua família | Regras `primeira_infancia`, `crianca`, `adolescente` |
| Seus direitos | Regras de Cadastro Único e Bolsa Família. Texto sempre "pode ter direito a". Para quem já tem, vira status mais "atualizar cadastro" e "agendar atendimento" (352) |
| Quem é como você também usa | `proximo[último serviço]` e `populares` de serviços **novos** para o cidadão |
| Nesta época do ano | `sazonal` |
| Para não esquecer | Prazos simulados (5.5) |
| Cuidar de você | Regras de saúde. **Só com consentimento** |
| Você e seu pet | Regra `tutor`. Sem consentimento |
| Salvos | `salvos` |
| Próximo passo dentro do serviço | `proximo[X]` quando o cidadão concluiu o serviço X |
| Serviços solicitados | Seção 6 |

Regras de montagem:

1. No máximo 3 itens por bloco. Bloco vazio não é devolvido (Requisito 2.13).
2. Um serviço aparece uma vez só, no bloco de maior prioridade.
3. Entre os 5 primeiros itens da Home, no máximo 2 do mesmo órgão (Requisito 2.17).
4. A Home tem pelo menos 1 serviço novo com o motivo "Pessoas como você também usam" (Requisito 2.14).
5. O título de nenhum bloco cita condição de saúde (Requisito 4.3). "Cuidar de você" é o título genérico.
6. Blocos em `blocos_desligados` não são devolvidos.

**Lacuna nos requisitos:** o Requisito 2.3 não tem bloco para perfis de trabalho e imóvel (MEI, empreendedor, servidor, proprietário). A persona 2 (microempreendedor) ficaria sem bloco próprio, e as regras `mei`, `empreendedor`, `servidor` e `proprietario` não teriam onde aparecer. Proposta: acrescentar o bloco "Para o seu dia a dia" ao Requisito 2.3. Aguardando aprovação.

### 5.5 Prazos simulados ("Para não esquecer")

Não existem prazos nos dados (Guia dos dados). Uma tabela de configuração da equipe liga um `servico_id` a um prazo relativo à data de hoje (por exemplo, IPTU para quem tem imóvel). O item mostra "Prazo de exemplo", para ninguém tomar a data como oficial.

### 5.6 Consentimento — Existe

- Estados: `pendente`, `concedido`, `recusado`, `revogado`. Cada mudança é registrada com data e versão do texto.
- Só quem nunca respondeu recebe o convite (`deve_pedir_agora`). Quem recusou ou revogou não é pressionado e vê apenas o acesso em "Privacidade".
- Texto, finalidade e base legal (LGPD, art. 11, I) ficam no backend.
- Com consentimento, itens de saúde ganham `+0,3` na pontuação, aparecem entre os primeiros e usam o motivo genérico "Aparece porque você autorizou".
- **A construir:** na Home, o bloco "Cuidar de você" e o convite saem de `GET /home/:id`, sem chamada extra.

### 5.7 Controle do cidadão (Requisito 3) — A construir

- `GET /preferencias/:id` e `POST /preferencias/:id` com `{ personalizacao, blocos_desligados }`.
- "Por que vejo isso?" abre `porque.texto` e, quando houver, `outros_motivos`. Registra o evento `por_que_aberto`.
- Desligada a personalização, `GET /home/:id` devolve `modo: "simplificada"` (5.8). A escolha é gravada e vale nos acessos seguintes (Requisito 3.5).
- Proposta: na Home simplificada de quem está logado, o card "Serviços solicitados" continua, pois é o estado do pedido da própria pessoa e não é personalização.

### 5.8 Home simplificada (visitante e personalização desligada)

`GET /home` e, para quem está logado com personalização desligada, `GET /home/:id` devolvem:

- até 4 atalhos de 1 toque e até 6 serviços "Mais usados" (`mais_usados_sem_login`, filtrando `nivel_digital` ≥ 3 para que o serviço realmente funcione no app);
- busca (`GET /servicos/busca?q=`): normaliza sem acento e minúsculas, procura em `nome`, `nome_resumido` e `palavras_chave`, até 8 resultados;
- menos texto: sem tags, sem "Por que vejo isso?", motivo de uma linha só quando houver.

O visitante nunca é ligado a um cidadão (Requisito 1.5).

### 5.9 Pouco histórico

A mesma Home. A lógica já ajusta pesos: com pouco histórico, `populares` ganha peso. `base_da_personalizacao` vira `historico_curto` ou `perfil`, e a explicação diz isso (Requisito 1.3). Funciona para os 5.778 cidadãos sem histórico, e os arquivos de `BD/` têm 83.268 com histórico.

## 6. Frente C: Serviços solicitados

### 6.1 Serviços de jornada: de onde vêm os passos

Fonte: coluna `passos` de `BD/servicos.csv`, conferida em 12/11/2026.

| Serviço | `servico_id` | Natureza | Nível digital | Passos na Carta |
|---|---|---|---|---|
| Agendar atendimento no Cadastro Único | 352 | Agendamento | 4 | 9 |
| Agendar consultas e procedimentos na Minha Unidade de Saúde | 942 | Agendamento | 4 | 2 |

Critério de entrada (Requisito 5.3): natureza Agendamento ou Peticionador, `passos` preenchidos e `nivel_digital_atual` ≥ 2. Quem decide as telas é a configuração (6.3), não a leitura automática dos `passos`.

### 6.2 Mapa dos passos da Carta para o card

**Serviço 352**

| # | Passo na Carta | Onde acontece | No card |
|---|---|---|---|
| 1 | Entrar no app Conecta Recife | Antes do pedido | Não aparece (Req. 5.16) |
| 2 | Baixar o app | Antes do pedido | Não aparece (Req. 5.16) |
| 3 | Tocar no ícone "Atualiza CadÚnico Recife – Agende Aqui!" | App | Entrada do serviço |
| 4 | Informar o CPF | App | Não vira campo. O CPF vem do perfil (Req. 5.15) |
| 5 | Escolher o local (lista ou mapa) | App | Etapa "Local" |
| 6 | Escolher data e hora | App | Etapa "Dia e horário" |
| 7 | Comparecer com os documentos de quem mora na casa | Fora do app | "O que fazer depois" |
| 8 | Entrevista com agente social | Fora do app | "O que fazer depois" |
| 9 | Esperar 48 horas para o NIS ser gerado | Fora do app | "O que fazer depois" |

**Serviço 942**

| # | Passo na Carta | No card |
|---|---|---|
| 1 | Estar logado com CPF e senha | Não aparece. O cidadão "entrou como" pelo `cidadao_id` |
| 2 | Saúde, Consultas, Agendar consultas e procedimentos | Entrada do serviço |

A Carta não descreve as etapas do pedido do 942. Local, Dia e horário e Revisar são definidos pela equipe, no padrão do 352, e aparecem como simulação (Req. 5.14). Depois de confirmar, o 942 termina em "Agendado", sem "O que fazer depois", porque a Carta não traz esses passos.

### 6.3 Configuração de telas — Existe (`jornada.js`)

| Tela | Campos | 352 | 942 |
|---|---|---|---|
| `sobre` | `tipo_atendimento` (inscrição, atualização, comprovante), `pessoas_na_familia` (1 a 20) | Sim | Não |
| `documentos` | `ciente_documentos` (obrigatório verdadeiro). A lista vem de `requisitos` | Sim | Não |
| `local` | `unidade`: duas unidades fictícias da RPA do cidadão e atendimento online | Sim | Sim |
| `data_hora` | `data` (próximos 10 dias úteis), `hora` (some o que estiver ocupado) | Sim | Sim |
| `contato` | `canal_aviso`, preenchido a partir de `aceita_notificacao` | Sim | Sim |
| `revisar` | Sem campos. Mostra o resumo e exige confirmar | Sim | Sim |

Regras já implementadas:

- Tela é pulada quando todos os campos foram preenchidos pelo sistema e estão válidos (Requisito 5.17). Gera o evento `tela_pulada`.
- Se mudar `unidade` ou `data` e a `hora` deixar de valer, a hora é limpa e a API avisa em `alterados_por_dependencia`.
- O pedido só conclui com `confirmar = true`. O protocolo é fictício: `DEMO-AAAA-XXXXXX` (Requisito 5.8).
- Texto livre rejeita CPF, telefone, e-mail e endereço (Req. 4.8).
- Iniciar de novo o mesmo serviço retoma o pedido em andamento.

### 6.4 Do pedido ao card — A construir

Uma **solicitação** é uma jornada vista com etapas. Não cria outra tabela: usa `jornadas`.

Estados: `em_andamento` → `concluida` (pedido feito, com protocolo) ou `cancelada`.

Etapas do card = etapas no app (telas da seção 6.3) + etapas "O que fazer depois" (só 352). Etapa atual:

- em andamento: a tela em que o cidadão parou;
- concluída: a primeira etapa "depois" ainda não feita;
- cancelada: nenhuma, com status "Cancelado".

As etapas "depois" são simuladas. O avanço usa `POST /solicitacoes/:id/avancar` (apenas demo, marcado como simulação), porque não existe dado de duração real. O card mostra "o que falta" como o texto da próxima etapa.

`GET /cidadaos/:id/solicitacoes` devolve, só para 352 e 942:

```json
{
  "solicitacoes": [{
    "solicitacao_id": "J-XXXXXXXXXX",
    "servico_id": 352,
    "servico": "Agendar atendimento no Cadastro Único",
    "status": "concluida",
    "protocolo": "DEMO-2026-AB12CD",
    "etapas": [
      { "id": "local", "titulo": "Local", "situacao": "feita", "fora_do_app": false },
      { "id": "comparecer", "titulo": "Comparecer com os documentos", "situacao": "atual", "fora_do_app": true }
    ],
    "o_que_falta": "Ir ao local no dia e horário marcados, com os documentos.",
    "acoes": ["problema", "cancelar", "alterar"],
    "canais": [{ "tipo": "web", "rotulo": "Site do serviço", "url": "https://cadunico.recife.pe.gov.br/" }]
  }]
}
```

### 6.5 Ações em cada etapa

| Ação | Rota | Regra |
|---|---|---|
| Relatar problema | `POST /solicitacoes/:id/problema` | Categoria de uma lista fixa mais descrição curta (até 200 caracteres), com o mesmo filtro de dado sensível das telas. Resposta traz `canais`. **Sem chat** |
| Cancelar | `POST /solicitacoes/:id/cancelar` | Simulada. Muda para `cancelada`. Vale em andamento e concluída |
| Alterar | `POST /solicitacoes/:id/alterar` | Simulada. Reabre a jornada na tela `data_hora`, mantém os demais campos e, ao confirmar de novo, mantém o protocolo e registra a alteração. Só nos serviços de jornada |
| Avaliar | `POST /solicitacoes/:id/avaliacao` | `{ nota: 1..5 }` ou `{ nao_consegui: true }`. Só depois do comprovante. Uma por solicitação |

Os canais vêm do `servicos.csv`: só `canal_web`, que é confiável. `canal_app` está sujo e `canal_chat` está fora do escopo.

Interpretação a confirmar: o Requisito 5.7 ("Alterar só no serviço da jornada") foi lido como "só nos 2 serviços do card". Se a intenção for outra, ajustar.

### 6.6 Comprovante e próximo passo

Ao concluir, a resposta já traz `protocolo`, `concluida_em` e `resumo` (**Existe**). **A construir:** acrescentar `proximo_passo` (primeiro item de `proximo[servico]` que o cidadão ainda não usou) e o convite de avaliação. O mesmo `proximo_passo` alimenta o bloco "Próximo passo dentro do serviço".

### 6.7 Pontos em aberto da frente C

- `jornada.js` também configura 923 e 633 e aceita Peticionador, Inscrição e Emissão de documentos. O Requisito 5.2 limita o card a 352 e 942. A API não bloqueia os outros. A limitação é aplicada no card (`GET /cidadaos/:id/solicitacoes`). Decidir se removemos a configuração dos demais.
- As etapas por tempo (48 horas, NIS) são simuladas.

## 7. Medição (Requisito 7)

### 7.1 Eventos

Existem hoje (gravados pelo servidor): `entrou_como`, `vitrine_vista`, `jornada_iniciada`, `tela_pulada`, `jornada_concluida`, `consentimento_concedido`, `consentimento_recusado`, `consentimento_revogado`.

Aceitos hoje em `POST /eventos`: `tela_pulada`, `vitrine_vista`, `servico_aberto`.

A construir (acrescentar a `EVENTOS_PERMITIDOS` ou gravar no servidor):

| Grupo | Eventos |
|---|---|
| Home | `item_exibido`, `item_aberto`, `por_que_aberto`, `personalizacao_desligada`, `personalizacao_ligada` |
| Solicitação | `etapa_concluida`, `abandono`, `problema_relatado`, `nota_dada` |

Todo evento tem `cidadao_id`, `tipo`, `ts` e no máximo `servico_id`, `tela` ou `bloco`. Sem texto livre e sem dado sensível.

### 7.2 Abandono

Não existe no dado, então é instrumentado. Uma jornada `em_andamento` sem alteração por mais de 30 minutos conta como abandono na etapa em que parou. O cálculo é feito ao ler `GET /eventos/resumo`, sem temporizador.

### 7.3 Indicadores

`GET /eventos/resumo` hoje devolve contagem por tipo. Passa a devolver também:

- conclusão por serviço (concluídas ÷ iniciadas);
- abandono por etapa;
- telas puladas (`tela_pulada`);
- nota média e quantidade de "Não consegui" (satisfação, Requisito 7.5);
- itens abertos ÷ itens exibidos na Home.

## 8. Acessibilidade e linguagem simples (Requisito 10)

- A API devolve textos curtos, com frases diretas e sem sigla sem explicação. Todo item tem `rotulo_acessivel` pronto para leitor de tela.
- Nenhuma informação depende só de cor: o motivo é texto, a situação da etapa é texto ("feita", "atual", "falta").
- A jornada simplificada e a acessibilidade são atendidas por toque: telas puladas quando o dado vem do perfil, contraste, área de toque, rótulo para leitor de tela e texto curto. Elementos sem texto visível (ícone, botão) ganham rótulo próprio.
- Contraste, tamanho de texto e área de toque dependem do sistema de design do Kodiak. A equipe confere na tela, em celular. Validação completa exige teste manual com leitor de tela e revisão de especialista.
- Marcador `pessoa_com_deficiencia` não altera a interface. As opções de acessibilidade ficam disponíveis a todos (Requisito 10.5).
- `requisitos` e `passos` dos serviços de jornada aparecem reescritos em linguagem simples, só com o necessário (Requisito 10.7). **A construir:** texto curado para 352 e 942 na configuração de telas.

## 9. `recomendacoes.csv` (Requisito 11) — A construir

`scripts/gerar-recomendacoes.js`:

1. Para cada um dos 89.046 cidadãos, chama `montarVitrine` com `limite: 10`.
2. **Sem consentimento de saúde para todos**, independentemente do estado gravado. Assim nenhum motivo usa saúde (Requisito 11.5).
3. Exclui serviços que o cidadão já usou (no `historico`) e o motivo "Continue de onde parou". Serviço já usado ocupa posição e não conta como acerto.
4. Completa até 10 com os serviços mais populares ainda não usados, sem repetir serviço para o mesmo cidadão.
5. Grava `data/recomendacoes.csv` em UTF-8, vírgula, LF, cabeçalho `cidadao_id,posicao,servico_id,motivo`, com aspas nos motivos que tiverem vírgula.

Mudanças em `montarVitrine`: opções `excluirUsados` e `ignorarConsentimento`, e o ranking dos populares calculado uma vez (hoje ele ordena os 843 serviços a cada chamada). O tempo para gerar 89.046 cidadãos não foi medido.

`scripts/validar-recomendacoes.js` confere: 89.046 cidadãos presentes (inclusive os 5.778 sem histórico), nenhum visitante, no máximo 10 linhas por cidadão, `posicao` de 1 a 10 sem repetição, `servico_id` existente em `servicos.csv`, e nenhum serviço já usado.

## 10. Demonstração e "entrar como" (Requisitos 8 e 9)

- **Entrar como:** `GET /entrar/:id` já aceita qualquer um dos 89.046 `cidadao_id`. ID inexistente devolve `cidadao_nao_encontrado` com a faixa válida, e a tela deixa tentar de novo (Requisito 9.4). **A construir:** `GET /demo/cidadaos` com as 8 personas oficiais (C007938, C068579, C059592, C036462, C039227, C076260, C006566, C062244).
- **Lado a lado:** duas requisições de Home na mesma tela, em paralelo (o Kodiak permite). Não precisa de rota nova. Pares sugeridos: visitante × logado (Requisito 8.1), e mãe com criança pequena × senhor de 70 anos (Requisito 8.2).
- **Ponta a ponta:** agendamento do 352 por toque (Requisito 8.3).
- `backend/src/painel.html` (servido em `/painel`) é um painel de teste no navegador. Serve para a equipe conferir a API, não faz parte do app.

## 11. Verificação

`package.json` tem `npm run teste` (`node --test test/`), mas a pasta `backend/test` ainda não existe. Proponho cobrir, quando as tarefas chegarem:

- carga de `BD/`: contagens da seção 3.10 e ordem dos cliques;
- sem consentimento, nenhum campo de saúde sai de `entrarComo` nem de `montarVitrine`, e `recomendacoes` nunca tem item de saúde;
- Home: sem bloco vazio, no máximo 2 itens do mesmo órgão entre os 5 primeiros, pelo menos 1 serviço novo, `criancas_na_familia` vazio nunca vira `nenhuma`, nenhum "Inscrever-se no Cadastro Único" para quem já tem;
- jornada: pedido só conclui com confirmação, tela pulada quando tudo está válido, texto livre recusa CPF;
- `recomendacoes.csv`: validador da seção 9.

## 12. Decisões e pendências

| # | Item | Situação |
|---|---|---|
| 1 | Item 8.7 do edital (plataforma) | Não recebido. Pode trazer restrições da plataforma |
| 2 | Liberação de backends, variáveis por ambiente e erro customizado do Kodiak | Texto recebido incompleto. Confirmar se `response.error` e `response.info` leem `erro` e `mensagem` |
| 3 | Hospedagem com HTTPS e URL estável | Fase 1 (12/11/2026): AWS Lambda com Function URL (seção 13.0). ECS Express Mode fica para a Fase 2. Falta confirmar com o Kodiak que o domínio `lambda-url` é aceito na liberação do backend (plano B: CloudFront) |
| 4 | `pessoa_com_deficiencia` como dado de saúde | Decidir (3.9). Recomendo manter sob consentimento e ajustar o Requisito 4.1 |
| 5 | Bloco "Para o seu dia a dia" | Aprovar a inclusão no Requisito 2.3 (5.4) |
| 6 | Alterar "só no serviço da jornada" | Confirmar a interpretação (6.5) |
| 7 | Configuração de 923 e 633 no `jornada.js` | Manter ou remover (6.7) |
O QUE CADA SEÇÃO E BOTÃO FAZ (para o backend)

Formato: PEGA = o que chega e de onde vem o dado | FAZ = a regra | MOSTRA = o que volta para a tela.

--- ENTRADA ---

1) ENTRAR COMO (escolher cidadão)
PEGA: cidadao_id digitado ou escolhido na lista das 2 personas.
FAZ: lê o perfil em cidadaos, mais o consentimento e as preferências salvas.
MOSTRA: faixa etária, RPA e marcadores resumidos, e abre a home. Botão "Continuar sem entrar" abre a home sem login.
Endpoint: GET /cidadao/{id}

--- HOME (logado) ---

2) SEÇÃO "SEUS ATALHOS" (mais usados)
PEGA: historico do cidadão.
FAZ: conta quantas vezes abriu cada servico_id e pega os 2 mais frequentes (empate: o mais recente).
MOSTRA: 2 cards com o nome do serviço e a etiqueta "Você usa com frequência". Tocar abre o serviço.

3) SEÇÃO "USOU RECENTEMENTE" (últimos usos)
PEGA: historico do cidadão.
FAZ: ordena por data, hora e ordem_na_sessao (mais novo primeiro), tira repetidos e pega os 3 últimos serviços diferentes.
MOSTRA: 3 cards com "Você usou em DD/MM". (Se a tela tiver só uma seção de atalhos, juntar as duas.)

4) SEÇÃO "ACOMPANHE SEUS PEDIDOS"
PEGA: pedidos do cidadao_id que não estão concluídos nem cancelados.
FAZ: para cada pedido, descobre a etapa atual e o que falta para a próxima.
MOSTRA: card com nome do serviço, "Etapa 2 de 4" e uma frase de "o que falta". O botão "Ver etapas" abre o detalhe do pedido (item 12).
Endpoint: GET /pedidos/{cidadao_id}

5) SEÇÃO "PARA VOCÊ" (família, benefícios, pet, direitos)
PEGA: marcadores do cidadaos (ex.: criancas_na_familia, tutor_animal, cadastro_unico), consentimento e preferências.
FAZ: para cada marcador true, procura em servicos os que batem em publicos_alvo e temas (tabela de regras). Depois: tira o que ele já usou, tira os tipos que a pessoa desligou, e SEM consentimento tira as regras de saúde. Ordena por cliques_historico e nota_media e pega 3.
MOSTRA: cards com etiqueta do motivo ("Para sua família", "Para você e seu pet", "Você pode ter direito"). Nada de condição de saúde no título.

6) SEÇÃO "QUEM É COMO VOCÊ TAMBÉM USA" (o serviço novo)
PEGA: serviços que ele já usou e o segmento dele (faixa etária + marcadores).
FAZ: na tabela transicoes do segmento, pega o serviço com maior lift a partir dos que ele usou, e que ele nunca abriu.
MOSTRA: 1 card com "Pessoas como você também abriram".
Endpoint (as seções 2 a 6 saem juntas): GET /home/{id}

--- HOME (sem login) ---

7) "MAIS PROCURADOS AGORA" + CHIPS DE PERFIL
PEGA: segmento escolhido no chip (idoso, família, empreendedor, PcD, saúde) ou nenhum, e a data de hoje.
FAZ: soma os cliques de uso_semanal com login=nao nas últimas 4 semanas e na mesma semana do ano anterior. Se tem chip, filtra por publicos_alvo e temas do segmento. Pega os 6 maiores.
MOSTRA: cards dos serviços mais procurados. O chip só filtra, não pede cadastro.
Endpoint: GET /home/anonimo?segmento=

--- BUSCA E SERVIÇO ---

8) CAIXA DE BUSCA
PEGA: texto digitado.
FAZ: tira acento e maiúscula, procura em item_nome, nome_resumido, palavras_chave, temas e publicos_alvo, tolera erro de digitação e usa sinônimos (bolsa, vacina, creche, MEI). Ordena por relevância e depois por cliques_historico.
MOSTRA: até 5 resultados com nome, órgão, natureza e se é gratuito.
Endpoint: GET /busca?q=

9) TELA DO SERVIÇO (ao tocar em qualquer card)
PEGA: servico_id.
FAZ: lê em servicos: descricao, publicos_alvo, requisitos, passos (separar nas linhas com "- "), canais, gratuito e prioridade_atendimento. Nos 2 serviços da jornada, usa o texto simples reescrito à mão.
MOSTRA: o que é, quem pode, o que levar, passo a passo e canais. O botão "Começar" só aparece nos 2 serviços da jornada.
Endpoint: GET /servico/{id}

--- JORNADA ---

10) BOTÃO "COMEÇAR" E TELAS DO FORMULÁRIO
PEGA: cidadao_id, servico_id e os campos já preenchidos.
FAZ: lê a config da jornada (lista de telas e dos campos de cada tela), preenche com o que já está no perfil e devolve a próxima tela que ainda tem campo faltando. Telas completas são puladas. O botão Continuar valida e salva o rascunho; o Voltar devolve a tela anterior com os valores.
MOSTRA: só o que falta, com "Etapa 2 de 4". No fim, a tela de confirmação com o resumo.
Endpoint: GET /servico/{id}/jornada e POST /jornada/rascunho

11) BOTÃO "CONFIRMAR PEDIDO"
PEGA: os campos finais.
FAZ: cria o pedido com protocolo no formato CNX-2026-000123, data de hoje (28/09/2026) e etapas tiradas de passos (1ª feita, 2ª em andamento, o resto a fazer). Grava o evento jornada_concluida.
MOSTRA: comprovante com protocolo, data, resumo e próximos passos. Botão "Acompanhar".
Endpoint: POST /pedido

--- ACOMPANHAMENTO ---

12) DETALHE DO PEDIDO (linha do tempo)
PEGA: protocolo.
FAZ: devolve as etapas com status (feita, andamento, a_fazer), tempo estimado, "o que falta" e o canal de cada etapa.
MOSTRA: linha do tempo estilo iFood, com a etapa atual em destaque.
Endpoint: GET /pedido/{protocolo}

13) BOTÃO "FALAR COM O ÓRGÃO" (em cada etapa)
PEGA: servico_id.
FAZ: devolve canal_web, canal_app ou canal_chat do serviço, o que não estiver vazio. Grava o evento canal_aberto.
MOSTRA: link ou atalho. Não é chat nosso.

14) BOTÃO "ALGO ERRADO?"
PEGA: protocolo, etapa, categoria (demora, documento, informação errada, outro) e texto curto.
FAZ: grava a ocorrência e gera um número fictício. Grava o evento problema_relatado.
MOSTRA: "Recebemos. Ocorrência nº ..." e um aviso na etapa.
Endpoint: POST /pedido/{protocolo}/problema

15) BOTÃO "CANCELAR PEDIDO"
PEGA: protocolo.
FAZ: muda o status para cancelado e grava o evento.
MOSTRA: pedido cancelado, com a opção "Fazer de novo".
Endpoint: POST /pedido/{protocolo}/cancelar

16) AVALIAÇÃO FINAL
PEGA: resolvido (sim, em parte, não), nota de 1 a 5 e comentário opcional.
FAZ: grava o evento avaliacao_enviada e marca o pedido como concluído. Se a resposta for "não", devolve também o canal do serviço.
MOSTRA: agradecimento; se foi "não", o caminho para tentar de novo.
Endpoint: POST /pedido/{protocolo}/avaliacao

--- TRANSPARÊNCIA E CONTROLE ---

17) TOQUE NO CARD: "POR QUE VEJO ISSO?"
PEGA: servico_id e o tipo da sugestão (atalho, familia, pet, direitos, novo...).
FAZ: devolve o motivo_detalhe em linguagem simples (ex.: "Você abriu este serviço 5 vezes" ou "Sua família tem criança de 7 a 11 anos"). Motivos de saúde só se houver consentimento.
MOSTRA: o texto e o botão "Não quero ver este tipo".

18) BOTÃO "NÃO QUERO VER ESTE TIPO"
PEGA: cidadao_id e o tipo.
FAZ: grava preferencia (cidadao, tipo, ativo = false). A home passa a ignorar esse tipo.
MOSTRA: "Pronto. Você muda isso em Meu Conecta."
Endpoint: PUT /preferencias/{id}

19) CONSENTIMENTO DE SAÚDE ("Aceitar" e "Agora não")
PEGA: cidadao_id e a resposta.
FAZ: salva consentimento sim ou não, com a data. Com "sim", libera as regras de saúde na seção "Para você". Com "não", remove.
MOSTRA: a home já recalculada.

20) MEU CONECTA > SUGESTÕES E PRIVACIDADE
PEGA: as preferencias do cidadão.
FAZ: lê e grava um interruptor por tipo de sugestão, mais o consentimento de saúde.
MOSTRA: lista de interruptores. Mudou, a home recalcula.
Endpoint: GET/PUT /preferencias/{id}

21) MEU CONECTA > JEITO DE USAR (modo simples) [P1]
PEGA: preferencias.aparencia (padrão ou simples).
FAZ: grava a escolha. No modo simples a API devolve textos curtos, ícone no lugar de texto e 2 itens por seção em vez de 3.
MOSTRA: a mesma home, mais simples.

--- VOZ [P1, só se o KODIAK permitir] ---

22) BOTÃO FIXO DO BROTO
PEGA: o texto do que a pessoa falou, a tela atual e os campos já preenchidos.
FAZ: descobre a intenção (abrir serviço, preencher campo, voltar, confirmar) e extrai os campos (data, hora, unidade, especialidade). Se a pessoa falou tudo, devolve todos os campos e a jornada pula as telas completas. Nunca confirma sozinho.
MOSTRA: a fala do Broto (texto para ler em voz alta), o que ele entendeu e a tela certa.
Endpoint: POST /voz

--- INVISÍVEL ---

23) EVENTOS
Cada botão acima grava 1 linha: timestamp, cidadao_id (ou "anonimo"), evento, servico_id, etapa. Eventos: bloco_exibido, sugestao_clicada, sugestao_dispensada, jornada_iniciada, etapa_concluida, jornada_abandonada (com a etapa), canal_aberto, problema_relatado, avaliacao_enviada.
Endpoint: POST /evento

PRIORIDADE: itens 1 a 20 e 23 são obrigatórios. Itens 21 e 22 só se sobrar tempo.| 8 | Eventos fora do limite de 5.000 | Decidido: DynamoDB com TTL de 30 dias na AWS (13.4). Arquivo `eventos.jsonl` só no desenvolvimento local (3.7) |
| 9 | Prazos simulados de "Para não esquecer" | Equipe define a tabela (5.5) |
| 10 | Descartar `BD/` e `data/` ao fim do evento | Lembrete operacional (3.8). Na AWS, ver 13.10 |
| 11 | Domínio AWS aceito pelo Kodiak na "Liberação de backends" | Confirmar com o suporte Kodiak. Se não for, plano B com domínio próprio (13.1) |
| 12 | Região e conta da AWS | A equipe define |
| 13 | `response.error` e `response.info` leem `erro` e `mensagem` | Confirmar com o suporte Kodiak (4.4) |

## 13. Implantação na AWS

Meta: protótipo funcional em 24 horas, com dados fictícios. Escolhemos a opção de menor esforço que ainda cumpre quatro pontos: URL pública HTTPS estável para o Kodiak, estado que não se perde em deploy, dados fora da imagem e regras que mudam sem novo deploy.

Região e conta da AWS: a equipe define (seção 12, item 12).

### 13.0 Fase 1 publicada (12/11/2026): AWS Lambda com Function URL

Desvio deliberado das seções 13.1 a 13.5, por prazo de 1 hora e por falta de Docker no ambiente de desenvolvimento (o Express Mode exigiria CodeBuild, ECR e dois papéis IAM antes da primeira resposta).

- Função `conecta-api` (Node 22, 2048 MB, 30 s), alias `live`, Function URL pública sem autenticação, na conta `215266645826`, região `us-east-1`. Concorrência provisionada 1 no alias.
- Adaptador: `backend/src/api/lambda.js`, que reaproveita o mesmo roteador do servidor HTTP. Nenhuma rota nem contrato mudou.
- Pacote zip (8,4 MB) com `src/`, 4 CSVs em `bd/` e `derivados.json` em `data-seed/`. `visitas_sem_login.csv`, `estado.json` e o painel ficam de fora. Os derivados nunca são regerados no Lambda.
- Estado em `/tmp/data`, por instância. Some quando a instância é trocada e pode divergir se houver duas instâncias. Aceito na Fase 1.
- Medido: primeira chamada 3,5 s (carga dos dados); chamadas seguintes 30 a 70 ms.
- Publicar de novo sem mudar a URL: `backend/scripts/publicar-lambda.sh`.
- Plano B se o Kodiak não aceitar o domínio `lambda-url`: CloudFront na frente da Function URL.
- Fase 2: DynamoDB (estado), S3 (dados e configuração) e, se for necessário, ECS Express Mode (seções 13.1 a 13.6).

### 13.1 Computação: Amazon ECS Express Mode (Fase 2)

O Express Mode cria, a partir de uma imagem de contêiner e de dois papéis IAM, um serviço no Fargate com Application Load Balancer, HTTPS em domínio fornecido pela AWS, auto scaling e monitoramento. Não há custo adicional pelo modo.

Descartados:

| Opção | Motivo |
|---|---|
| AWS App Runner | Fechado a novos clientes desde 30/04/2026. A AWS recomenda o ECS Express Mode |
| Lambda | Cada partida carregaria cerca de 600 mil linhas. A API é um servidor com dados em memória |
| Fargate "manual" com ALB, ACM e Route 53 | Mais passos para o mesmo resultado. Fica como **plano B** se o Kodiak exigir domínio próprio |

### 13.2 Tamanho e escala

- 1 tarefa fixa (mínimo = máximo = 1), 1 vCPU e 2 GB. Medido: a carga usa 389 MB.
- Motivo: dados em memória e cache de consentimento dentro do processo.
- Só escalar para mais de 1 tarefa se o consentimento passar a ser lido do DynamoDB com leitura consistente.

### 13.3 URL

- Usar o endereço HTTPS que o Express Mode entrega.
- Não recriar o serviço, porque recriar muda a URL. Para atualizar, publicar uma nova imagem.
- **Pendência:** confirmar com o suporte Kodiak que um domínio AWS é aceito na "Liberação de backends". Se não for, plano B com domínio próprio (Route 53 e ACM).
- HTTPS termina no ALB. O Node continua em HTTP na porta 8080 dentro da tarefa.

### 13.4 Estado: DynamoDB

- Tabela única `conecta-estado`, sob demanda. PK `cidadao_id`, SK `tipo#ts`.
- Tipos: `consentimento`, `jornada`, `preferencia`, `salvo`, `problema`, `avaliacao`, `evento`.
- Eventos com TTL de 30 dias.
- `GET /eventos/resumo` calcula por varredura paginada, com cache de 30 s. O volume do hackathon permite isso.
- **A construir:** `store.js` passa a ter dois drivers, arquivo local e DynamoDB, escolhidos pela variável `STORE=file|dynamodb`. Os dois mantêm cache em memória e gravam na hora (write-through).
- Isto substitui a decisão de `eventos.jsonl` da seção 3.7 no ambiente AWS. O arquivo fica só no desenvolvimento local.

### 13.5 Dados: S3 privado

- Bucket com bloqueio de acesso público, criptografia e expiração por ciclo de vida.
- Conteúdo: `cidadaos.csv`, `historico.csv`, `servicos.csv`, `uso_semanal.csv`, `derivados.json` e `config/` (regras, pesos, textos de motivo, prazos simulados e configuração das jornadas).
- A tarefa baixa os arquivos na partida (cerca de 40 MB), com o papel da tarefa. **A imagem não contém dados.**
- `visitas_sem_login.csv` nunca sobe. `npm run derivar` roda na máquina da equipe e envia só o `derivados.json` (seção 3.8).
- **A construir:** carregador S3 na partida, escolhido por variável de ambiente (S3 na AWS, `BD_DIR` local em desenvolvimento).

### 13.6 Configuração que muda sem novo deploy

- Regras (`REGRAS`, `REGRAS_SAUDE`), pesos da pontuação, textos de motivo, prazos simulados (5.5) e configuração das jornadas (6.3) ficam em JSON versionado em `config/` no S3.
- Para aplicar uma mudança: reiniciar a tarefa (nova implantação com a mesma imagem). Não precisa de build.
- **A construir:** mover essas constantes do código para o JSON, com o valor atual como padrão.

### 13.7 Ambientes

- Homologação e produção usam a mesma imagem e recursos separados: serviço, tabela e bucket, com sufixo (`-hml`, `-prd`).
- Cada URL vira uma variável de ambiente do Kodiak (`#server{...}`), conforme o Requisito 6.7.

### 13.8 Segurança

A API é aberta, porque o Kodiak não envia header customizado, e serve só dados fictícios. Proteções:

- WAF com limite de requisições no ALB.
- `CORS_ORIGIN` restrito. O Kodiak chama de servidor, então o CORS serve só ao painel.
- `/painel` desligado em produção.
- Papel da tarefa com o mínimo: leitura do prefixo do bucket e acesso à tabela.
- Nenhum CPF, nome ou endereço real em lugar algum (Requisito 4.8).

### 13.9 Observabilidade

- Logs em JSON no CloudWatch Logs.
- Alarme de 5xx e alarme de tarefa fora do ar.
- `GET /health` como verificação de saúde. Inclui o resultado da validação de dados (3.10).

### 13.10 Entrega e encerramento

- Entrega: build da imagem, push para o ECR, nova versão do serviço.
- Infra de apoio (tabela, bucket, papéis) por CDK ou CloudFormation. Verificar na hora o suporte de IaC ao Express Mode. Se faltar, criar o serviço por CLI.
- **Ao fim do evento:** apagar serviço, tabela, bucket, repositório de imagens e logs (reforça a seção 3.8).
- Custo: baixo. O ALB é o maior item. Não há valores estimados aqui.

### 13.11 A construir nesta seção

- Driver DynamoDB no `store.js`.
- Carregador S3 na partida.
- Configuração externa (13.6).
- Dockerfile.
- Alarmes.
- Script de publicação.
