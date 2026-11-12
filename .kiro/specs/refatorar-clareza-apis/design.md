# Refatorar a clareza das APIs Bugfix Design

## Overview

O backend do Conecta Recife funciona e tem 49 testes passando, mas é difícil de ler. As rotas de cinco áreas moram em `rotas-dados.js`; cada handler lê e valida a entrada do seu jeito; os erros nascem de três formas; o índice `GET /` é um texto escrito à mão; o roteador depende da ordem de registro; `server.js` e `lambda.js` repetem a mesma lógica HTTP; `montarVitrine` e `jornada.js` são longos e misturam responsabilidades; e não existe documento de contrato.

A estratégia é uma refatoração sem mudança de comportamento externo, em passos pequenos, cada um terminando com `npm run teste` verde:

1. Travar o comportamento atual com testes de caracterização, antes de mexer em qualquer arquivo.
2. Criar a base compartilhada da camada `api/` (tabela de erros, funções de entrada, HTTP comum, roteador).
3. Dividir as rotas por área e gerar o índice a partir delas.
4. Dividir `jornada.js` e `montarVitrine` em módulos e funções menores.
5. Escrever o documento de contrato e apontar o README para ele.

Decisões já tomadas pelo usuário:

- Os status `400`, `409` e `422` atuais continuam. A divergência com a regra "erro corrigível volta com 200 e `ok: false`" fica registrada em um único ponto (a tabela de erros) e no contrato. Não é corrigida agora.
- O requisito 2.9 continua: caminho com `%` inválido devolve `400 caminho_invalido`.

Fora do escopo: CSVs em `BD/`, regras de consentimento, `tools/painel.html` (só muda se algo quebrar), formatos de resposta.

## Glossary

- **Bug_Condition (C)**: o código obriga o leitor a juntar peças espalhadas para entender um endpoint (itens 1.1 a 1.9 do `bugfix.md`), ou deixa o caminho com `%` inválido virar `500`.
- **Property (P)**: o mesmo comportamento externo de hoje, com o código organizado por área, entrada lida por funções nomeadas, um caminho de erro, índice gerado, roteador independente da ordem, HTTP comum, funções menores, contrato escrito e `400 caminho_invalido`.
- **Preservation**: tudo que a API devolve hoje (status, JSON, cabeçalhos, eventos, regras de consentimento) continua igual.
- **Rota**: registro `{ metodos, padrao, fn, doc }` feito por `rota(...)`.
- **Rota fixa / parametrizada**: padrão sem `:param` / com `:param`.
- **Função de entrada**: função de `api/entrada.js` que lê e valida um parâmetro (`identificarCidadao`, `lerFinalidade`, `lerLimite`, `lerCampos`, `lerCampo`).
- **Tabela de erros**: mapa único `código de erro → status` em `api/erros.js`.
- **Resultado de domínio**: retorno `{ erro, mensagem, ... }` das funções de `dados/` (por exemplo `registrarDecisao`). Continua existindo porque os testes atuais conferem esse formato.
- **Teste de caracterização**: teste gerado a partir do código atual, antes da refatoração, que prova que a saída não mudou.

## Bug Details

### Bug Condition

A condição é de leitura e manutenção, com um caso de comportamento (1.9). O defeito aparece quando alguém precisa achar, entender ou alterar um endpoint, ou quando o caminho tem `%` inválido. O roteador chama `decodeURIComponent` sem proteção, e o `URIError` vira `500 erro_interno`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { tarefa: "achar_endpoint" | "alterar_entrada" | "alterar_erro" | "listar_rotas"
                                | "adicionar_rota" | "alterar_http" | "entender_contrato"
                                | "ler_vitrine" | "ler_jornada" | "requisicao",
                         caminho?: string }
  OUTPUT: boolean

  IF input.tarefa = "requisicao" THEN
    RETURN input.caminho contém sequência '%' que decodeURIComponent rejeita
           AND o caminho casa com algum padrão de rota
  END IF

  RETURN input.tarefa IN { achar_endpoint, alterar_entrada, alterar_erro, listar_rotas,
                           adicionar_rota, alterar_http, entender_contrato,
                           ler_vitrine, ler_jornada }
         AND a informação necessária está espalhada, repetida, implícita ou escrita à mão
END FUNCTION
```

### Examples

- Procurar o endpoint `POST /dados/jornadas/:id/confirmar`: hoje está em `rotas-dados.js` (104 linhas, cinco áreas). Esperado: `rotas/jornadas.js`.
- `rotas-recomendacao.js` importa `resolverCidadao` de `rotas-dados.js`. Esperado: os dois importam `apoio/cidadao.js`.
- Mudar o teto de `limite` da vitrine: hoje é uma conta dentro do handler (`Math.min(20, Math.max(1, Number(corpo.limite ?? consulta.limite ?? 8) || 8))`). Esperado: `lerLimite` em um lugar.
- `registrarDecisao` devolve `{ erro: 'nada_a_revogar' }` sem status e a rota decide `400` ou `409` com um ternário; `iniciarJornada` devolve `status: 422`. Esperado: o status sai da tabela de erros nos dois casos.
- Adicionar uma rota e esquecer o texto de `GET /`: hoje o índice fica desatualizado. Esperado: a rota só entra no índice se tiver `doc`, e o teste compara índice e rotas.
- Registrar `/dados/consentimentos/:id` antes de `/dados/consentimentos/texto`: hoje `texto` é lido como id e dá `400 id_invalido`. Esperado: `texto` ganha sempre.
- `GET /dados/cidadaos/%E0%A4%A`: hoje `500 erro_interno`. Esperado: `400 caminho_invalido` com mensagem simples.
- Caso de borda: `GET /dados/cidadaos/C000003` (válido): sem mudança.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mesmo método, caminho, consulta e corpo devolvem o mesmo status e o mesmo JSON (chaves, tipos e textos).
- `405 metodo_nao_permitido` e `404 rota_nao_encontrada`, incluindo rotas antigas sem prefixo (`/vitrine`, `/entrar`).
- `400 id_invalido` e `404 cidadao_nao_encontrado` com as mesmas mensagens.
- Consentimento de saúde e de acessibilidade independentes; sem consentimento, `saude`, `acessibilidade` e textos que citem a condição não aparecem.
- `PATCH` de jornada com valor inválido: `200` com `erros[]`. `confirmar` sem `true`: `400 confirmacao_necessaria`. Campos pendentes: `422 campos_pendentes`. Ambos com `jornada` nos campos extras.
- Retomada (`retomada: true`) e confirmação de jornada já concluída.
- Eventos `entrou_como` e `vitrine_vista` nos `GET`; `POST /dados/eventos` aceita só `tela_pulada`, `erro_entendimento`, `vitrine_vista` e `servico_aberto`.
- Lambda grava o estado na hora em métodos diferentes de `GET`; o servidor local grava em `SIGINT` e `SIGTERM` e serve `/painel`.
- Vitrine: ordem, diversidade (no máximo 2 por órgão nos 5 primeiros), motivo, base da personalização e convites idênticos.
- CORS: o servidor local anuncia `GET,POST,PUT,PATCH,OPTIONS` e o Lambda `GET,POST,PUT,PATCH,DELETE,OPTIONS`. Cada ambiente mantém a sua lista.

**Scope:**
Todas as requisições cujo caminho não tem `%` inválido ficam fora da condição de defeito de comportamento e devem produzir exatamente a mesma resposta. A única resposta que muda é a do caminho com `%` inválido (`500` vira `400`).

## Hypothesized Root Cause

1. **Crescimento sem fronteiras**: as rotas foram adicionadas ao arquivo que já existia (`rotas-dados.js`), e o helper `resolverCidadao` ficou lá. A segunda área passou a importar a primeira.
2. **Falta de camada de entrada**: não há lugar para dizer de onde cada parâmetro pode vir (`corpo`, `consulta`, ou os dois), então cada handler decide sozinho.
3. **Domínio e HTTP misturados no formato de erro**: `jornada.js` carrega `status` HTTP no resultado; `consentimento.js` não carrega; a rota tapa a diferença.
4. **Documentação separada do código**: o índice, o README e o comportamento real são três fontes escritas à mão.
5. **Roteador mínimo**: escolhe a primeira rota que casa, então a ordem de registro vira regra.
6. **Duas portas de entrada copiadas**: `lambda.js` nasceu copiando `server.js`, e as listas de métodos já divergiram.
7. **Funções que acumularam passos**: `montarVitrine` (cerca de 200 linhas) e `jornada.js` (390 linhas) receberam cada nova regra no mesmo lugar.
8. **Decodificação sem proteção**: `decodeURIComponent` está fora de qualquer `try`, e o erro cai no tratamento genérico de `500`.

## Correctness Properties

Property 1: Bug Condition - Código claro e caminho inválido tratado

_For any_ situação em que a condição de defeito vale (isBugCondition retorna true), o código refatorado SHALL: manter cada endpoint em um módulo da sua área, sem módulo de rotas importando outro (2.1); ler a entrada por funções de apoio nomeadas com os mesmos padrões, limites e códigos de erro (2.2); falhar por um único caminho (`ErroHttp`) com status vindo de uma tabela única (2.3); gerar o índice `GET /` a partir das rotas registradas (2.4); resolver rotas fixas antes das parametrizadas, com teste que falha se a regra quebrar (2.5); compartilhar o HTTP comum entre servidor e Lambda (2.6); ter contrato por endpoint (2.7); ter `montarVitrine` e `jornada.js` divididos em funções e módulos com saída igual (2.8); e devolver `400 caminho_invalido` em vez de `500` quando o `%` do caminho é inválido (2.9).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9**

Property 2: Preservation - Comportamento externo inalterado

_For any_ requisição em que a condição de defeito NÃO vale (isBugCondition retorna false), o código refatorado SHALL produzir o mesmo status e o mesmo corpo JSON do código original, e as mesmas decisões de consentimento, eventos, ordem da vitrine e gravação de estado, preservando os 49 testes existentes sem mudar asserções.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

#### 1. Estrutura de módulos

Regra de dependência existente continua: `api` → `recomendacao` → `dados`. Dentro de `api/`, módulos de rotas dependem só de `apoio/`, nunca uns dos outros.

```
src/api/
  app.js                 monta o roteador, registra as áreas, expõe GET / e GET /health
  roteador.js            casa caminho e método; fixas antes de parametrizadas; caminho_invalido
  erros.js               ErroHttp + TABELA_ERROS + falhar() + desembrulhar()
  entrada.js             funções de entrada (identificarCidadao, lerFinalidade, ...)
  indice.js              gerarIndice(rotas) para GET /
  http-comum.js          CORS, limite de corpo, JSON, erro -> resposta
  server.js              só Node http: painel, stream do corpo, SIGINT/SIGTERM
  lambda.js              só Lambda: cache de inicialização, evento -> requisição, salvarLogo
  rotas/
    cidadaos.js          /dados/cidadaos/demo, /:id, /:id/jornadas
    servicos.js          /dados/servicos/:id
    consentimentos.js    /dados/consentimentos/texto, /:id (GET e POST)
    jornadas.js          /dados/jornadas (POST), /:id (GET, PATCH, POST), /:id/confirmar
    eventos.js           /dados/eventos (POST), /dados/eventos/resumo
    recomendacao.js      /recomendacao/:id
```

`rotas-dados.js` e `rotas-recomendacao.js` são removidos. `resolverCidadao` sai de `rotas-dados.js` e vira `identificarCidadao` em `entrada.js`. Cada módulo de rotas exporta `registrarRotasX(rota, ...)`, igual ao padrão atual, e `app.js` chama os seis em sequência.

Ordem de registro (e, portanto, do índice) fica a mesma de hoje: cidadãos (demo, `:id`, `:id/jornadas`), serviços, consentimentos, jornadas, eventos, recomendação.

#### 2. Funções de entrada (`api/entrada.js`)

Cada função recebe `{ p, corpo, consulta }` ou os pedaços de que precisa e devolve o valor já validado, ou lança `ErroHttp`. A regra "de onde vem" fica escrita na própria função.

| Função | De onde lê | Regra atual preservada |
|---|---|---|
| `identificarCidadao(bruto)` | caminho (`p.id`) ou corpo/consulta (`cidadao_id`) | `buscarCidadao`; `400 id_invalido`, `404 cidadao_nao_encontrado` com as mesmas mensagens; devolve `{ id, reg }` |
| `lerCampo(corpo, consulta, nome)` | `corpo[nome] ?? consulta[nome]` | base das outras funções |
| `lerFinalidade(corpo, consulta)` | corpo, depois consulta | padrão `saude_personalizacao`; `400 finalidade_invalida` |
| `lerLimite(corpo, consulta)` | corpo, depois consulta | `Math.min(20, Math.max(1, Number(x ?? 8) \|\| 8))` |
| `lerCampos(corpo)` | só `corpo.campos` | texto vira objeto com `JSON.parse`; falha vira `400 campos_invalidos` |
| `lerTela(corpo, consulta)` | corpo, depois consulta | `tela` opcional; no `GET` só consulta, o que dá o mesmo resultado porque o corpo do `GET` é `{}` |
| `lerConfirmar(corpo, consulta)` | corpo, depois consulta | repassa o valor bruto; quem compara com `true` é o domínio |
| `lerTipoDeEvento(corpo)` | só corpo | `400 evento_invalido` se fora de `EVENTOS_PERMITIDOS` (a lista passa a morar em `rotas/eventos.js`) |

Nenhuma função muda um padrão, um limite ou um texto. Onde hoje só um dos dois lados é lido (por exemplo `campos` e `tipo`, só no corpo), a função também lê só esse lado.

#### 3. Tabela única de erros (`api/erros.js`)

Os três caminhos de falha viram um só na camada de rotas: `throw ErroHttp`.

```js
export const TABELA_ERROS = {
  // entrada
  id_invalido: 400, finalidade_invalida: 400, decisao_invalida: 400, campos_invalidos: 400,
  evento_invalido: 400, json_invalido: 400, caminho_invalido: 400,
  // regra de negócio. Divergência registrada: a regra do projeto pede 200 com ok:false
  // para erro corrigível pelo cidadão. Mantemos os status atuais por decisão do usuário.
  confirmacao_necessaria: 400,
  nada_a_revogar: 409, use_revogado: 409, jornada_encerrada: 409,
  campos_pendentes: 422, jornada_indisponivel: 422,
  // não encontrado e roteamento
  cidadao_nao_encontrado: 404, servico_nao_encontrado: 404, jornada_nao_encontrada: 404,
  rota_nao_encontrada: 404, metodo_nao_permitido: 405, corpo_grande: 413,
};

export function falhar(codigo, mensagem, extra = {}) { /* lança ErroHttp(TABELA_ERROS[codigo], ...) */ }
export function desembrulhar(resultado) { /* resultado de domínio -> valor ou falhar(...) */ }
```

- O domínio continua devolvendo `{ erro, mensagem, jornada? }`. Os testes de consentimento conferem esse formato, e o domínio não deve conhecer HTTP.
- `jornada.js` deixa de devolver `status`. O status passa a vir da tabela. Hoje os valores são `404`, `409`, `422` e `400`, todos presentes na tabela com o mesmo número.
- `desembrulhar` serve a consentimentos e jornadas. O ternário da rota de consentimento desaparece.
- Código ausente da tabela vira `500 erro_interno` no teste de consistência (veja Testing Strategy), nunca em produção silenciosa: `falhar` lança um `Error` claro se o código não existir.
- A divergência com a regra do `200 ok:false` fica em comentário na tabela e no contrato, com a lista dos códigos afetados.

#### 4. Índice gerado (`api/indice.js`)

Cada rota recebe um quarto argumento opcional `doc`:

```js
rota(['POST'], '/dados/jornadas', fn, {
  area: 'motor_de_dados',
  descricao: '{"cidadao_id":"C000003","servico_id":352}',
});
```

- `area` é `motor_de_dados` ou `motor_de_recomendacao`. Rotas sem `doc` (aliases legados, `/health`, `/`) não aparecem no índice.
- A chave do índice é `${metodoPrincipal} ${caminho com :id trocado por {id}}${sufixoDeConsulta}`. O `sufixoDeConsulta` vem de `doc.consulta` (por exemplo `?finalidade=` e `?limite=8`), para manter chaves como `GET /dados/consentimentos/texto?finalidade=`.
- `metodoPrincipal` é o primeiro método da lista. Isso mantém `PATCH /dados/jornadas/{id}` (o `POST` fica como alias legado) e `GET /recomendacao/{id}?limite=8`.
- `gerarIndice(rotas)` devolve `{ nome, motor_de_dados, motor_de_recomendacao, saude_da_api }` com as mesmas chaves e textos de hoje.
- `GET /` passa a ser registrado por `app.js` depois das áreas e chama `gerarIndice`. Para o índice enxergar todas as rotas, `rota` expõe a lista registrada (`rotas()`).

#### 5. Roteador (`api/roteador.js`)

Regra: **rotas fixas antes de parametrizadas**, em qualquer ordem de registro.

- Cada rota guarda seus segmentos. Ao registrar, a rota é inserida de forma estável em uma lista ordenada por especificidade: comparação segmento a segmento, onde literal vem antes de `:param`. Empate mantém a ordem de registro.
- Rotas de tamanhos diferentes não se sobrepõem, então a comparação só decide casos como `/dados/consentimentos/texto` contra `/dados/consentimentos/:id`.
- O registro lança erro se dois padrões forem equivalentes (mesmos segmentos, com parâmetros em qualquer nome) e compartilharem método. Isso evita conflito silencioso.
- O comportamento de `404` e `405` fica igual: o laço continua marcando `caminhoExiste` e só devolve `405` se nenhuma rota casada aceitar o método.
- `decodeURIComponent` passa para `decodificar(valor)`, que captura `URIError` e lança `falhar('caminho_invalido', 'O endereço tem um trecho inválido. Confira o caminho e tente de novo.')`. A decodificação só acontece depois de o método ser aceito, então `405` e `404` não mudam.

#### 6. HTTP comum (`api/http-comum.js`)

Conteúdo, com a diferença entre ambientes passada por parâmetro:

```js
export const MAX_CORPO = 100 * 1024;
export const criarCors = (metodos) => ({ /* Allow-Origin via CORS_ORIGIN, Allow-Methods = metodos, ... */ });
export const METODOS_COM_CORPO = ['POST', 'PUT', 'PATCH'];
export function interpretarJson(buffer) { /* {} se vazio; json_invalido se falhar */ }
export function verificarTamanho(bytes) { /* corpo_grande (413) se passar de MAX_CORPO */ }
export function respostaDeErro(e) { /* ErroHttp -> {status, corpo}; outro -> 500 erro_interno + console.error */ }
export const cabecalhosJson = (cors) => ({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors });
```

- `server.js` usa `criarCors('GET,POST,PUT,PATCH,OPTIONS')` e continua com o painel, o stream do corpo (que chama `verificarTamanho` a cada pedaço e depois `interpretarJson`) e o desligamento por sinal.
- `lambda.js` usa `criarCors('GET,POST,PUT,PATCH,DELETE,OPTIONS')`, decodifica base64, chama `verificarTamanho` e `interpretarJson`, e continua gravando com `salvarLogo()` fora de `GET`.
- `ErroHttp` continua exportado por `app.js` para não quebrar importações existentes.
- A resposta de `OPTIONS` (204 só com CORS) e os cabeçalhos de `Content-Type` e `Cache-Control` ficam byte a byte iguais.

#### 7. Divisão de `jornada.js`

`dados/jornada.js` vira a pasta `dados/jornada/`, sem mudar nada de lógica. Os nomes das funções públicas continuam os mesmos.

| Arquivo | Conteúdo |
|---|---|
| `opcoes.js` | `proximosDiasUteis`, `HORAS`, `ocupado`, `unidadesDaRpa`, `CANAIS`, `MOTIVOS` |
| `telas.js` | campos e telas-base, `OVERRIDES`, `DOCUMENTOS`, `telasDoServico` |
| `validacao.js` | `PADRAO_SENSIVEL`, `opcoesDoCampo`, `validar`, `todosValidos` |
| `visao.js` | `AVISO`, `contexto`, `descreverCampo`, `rotuloDoValor`, `resumoDe`, `visao` (dividida em `calcularTelas`, `calcularFaltando` e `montarVisao`) |
| `operacoes.js` | `limparInvalidos`, `prefill`, `iniciarJornada`, `obterJornada`, `listarJornadas`, `preencherJornada`, `confirmarJornada` |
| `index.js` | reexporta as operações e `proximosDiasUteis` |

- Dependências: `operacoes` → `visao` → `validacao` → `opcoes`; `visao` e `operacoes` também usam `telas`. Não há ciclo.
- As operações devolvem o mesmo formato, menos o campo `status` (veja item 3).
- `dados/` não importa de `api/`. As únicas importações externas continuam sendo `carga`, `store` e `servicos`.
- `rotas/jornadas.js` importa `../../dados/jornada/index.js`.

#### 8. Divisão de `montarVitrine`

`recomendacao/vitrine.js` continua exportando `montarVitrine(id, derivados, { limite })`. A função vira um orquestrador de poucas linhas que chama funções com nome claro. O código é movido sem reescrever a lógica, inclusive a linha que insere o serviço novo, que fica idêntica.

| Função | Arquivo | Responsabilidade |
|---|---|---|
| `lerContexto(id)` | `vitrine.js` | perfil, consentimentos, `saude` e `acessibilidade` só se concedidos, histórico |
| `reunirCandidatos(ctx, derivados)` | `candidatos.js` | etapas 1 a 4: regras, histórico, populares, demanda e base geral; devolve o mapa de candidatos |
| `pontuar(candidatos, ctx)` | `pontuacao.js` | pesos, filtros de público, Cadastro Único e Bolsa Família, categorias sensíveis; devolve a lista ordenada |
| `diversificar(pontuados, limite)` | `diversidade.js` | limite por órgão e de repetições |
| `garantirServicoNovo(escolhidos, pontuados, ctx, limite)` | `diversidade.js` | regra "pelo menos 1 serviço novo, Pessoas como você também usam" |
| `montarItem(p, posicao)` | `item.js` | tipo, tag, motivo principal e `outros_motivos` |
| `montarAvisosEConvites(ctx, base)` | `textos.js` | `explicacao_geral`, avisos, resumos e convites de consentimento |
| `TAGS`, `PUBLICOS_RESTRITOS`, `MOTIVO_HISTORICO_GENERICO` | `textos.js` / `pontuacao.js` | constantes hoje no topo do arquivo |

Os arquivos ficam em `recomendacao/vitrine/` e `vitrine.js` os importa. O texto de motivo genérico para saúde sem consentimento (LGPD, art. 11) continua no ponto onde é escolhido, dentro de `candidatos.js`, para que a regra de privacidade siga visível ao lado do código que a aplica.

#### 9. Documento de contrato

Novo arquivo `.kiro/specs/refatorar-clareza-apis/contrato-das-apis.md`, em português, com uma seção por endpoint na ordem do índice:

```
### POST /dados/consentimentos/{id}
- Área: motor de dados
- Entrada: caminho {id}; corpo/consulta: decisao, finalidade (padrão saude_personalizacao)
- Saída 200: campos de resposta (cidadao_id, finalidade, status, usa_dados, ..., historico, finalidades)
- Erros: 400 id_invalido, 404 cidadao_nao_encontrado, 400 finalidade_invalida, 400 decisao_invalida, 409 nada_a_revogar, 409 use_revogado
- Efeitos colaterais: grava consentimento e evento consentimento_<decisao>
- Legado: usa_dados_de_saude (prefira usa_dados)
```

Pontos obrigatórios do documento:

- Efeitos colaterais de `GET`: `GET /dados/cidadaos/{id}` registra `entrou_como`; `GET /recomendacao/{id}` registra `vitrine_vista`.
- Aliases e campos legados marcados como **Legado**: `POST /recomendacao/{id}`, `POST /dados/jornadas/{id}` (igual ao `PATCH`), `usa_dados_de_saude`.
- Seção "Erros e status" com a tabela de erros e a nota da divergência com o padrão `200 ok:false`.
- Seção "Formato de erro": `{ erro, mensagem, ...extra }`.
- `backend/README.md` troca a lista de arquivos de `api/` pela nova estrutura e ganha um link para o contrato. O contrato não duplica o que o código já diz sobre implementação; descreve só o que o Kodiak vê.

## Testing Strategy

### Validation Approach

Em duas fases: primeiro prender o comportamento atual e mostrar o defeito de comportamento (`500` no `%` inválido, ordem do roteador), depois refatorar e provar que nada mudou. Os 49 testes existentes não são editados; se algum falhar, o código é que está errado.

### Exploratory Bug Condition Checking

**Goal**: Mostrar, no código atual, o que de fato falha, e confirmar ou refutar as causas levantadas.

**Test Plan**: Escrever os testes novos antes da refatoração e rodá-los no código atual.

**Test Cases**:
1. **Caminho inválido**: `GET /dados/cidadaos/%E0%A4%A` deve dar `400 caminho_invalido` (falha hoje com `500 erro_interno`).
2. **Ordem do roteador**: roteador de teste com `/x/:id` registrado antes de `/x/texto`; `GET /x/texto` deve cair na rota fixa (falha hoje, cai em `:id`).
3. **Índice versus rotas**: toda rota com `doc` aparece no índice e todo item do índice corresponde a uma rota registrada (hoje não há como verificar; o teste nasce junto do índice gerado).
4. **Contrato versus rotas**: todo par método/caminho registrado tem uma seção no contrato (falha até o documento existir).
5. **Tabela de erros**: todo código de erro que o código pode produzir existe na tabela (falha até a tabela existir).

**Expected Counterexamples**:
- O caso 1 mostra `500` porque `decodeURIComponent` roda sem proteção.
- O caso 2 mostra que a escolha da rota depende só da ordem de registro.

### Fix Checking

**Goal**: Para toda entrada em que o defeito de comportamento vale, a versão refatorada devolve a resposta esperada.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := tratar_refatorado(input)
  ASSERT expectedBehavior(result)   // 400 caminho_invalido, sem 500; fixas antes das parametrizadas
END FOR
```

### Preservation Checking

**Goal**: Para toda entrada fora da condição de defeito, a resposta refatorada é igual à original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT tratar_original(input) = tratar_refatorado(input)
END FOR
```

**Testing Approach**: Como não existe dependência de teste de propriedades no projeto (Node 20, sem pacotes), as propriedades são verificadas com `node:test` e geração determinística de entradas (semente fixa). Para isso, **antes de qualquer mudança no código**, um script gera arquivos de referência (golden) a partir do código atual em `test/fixtures/`:

- `golden-vitrine.json`: hash SHA-256 do JSON de `montarVitrine` para as 8 personas oficiais e uma amostra fixa de 300 cidadãos (incluindo sem histórico), em quatro combinações de consentimento (nenhum, saúde, acessibilidade, ambos) e `limite` em 1, 8 e 20.
- `golden-http.json`: pares requisição → `{ status, corpo }` para uma lista fixa de chamadas (todos os endpoints, erros de cada código da tabela, `404`, `405`, rotas antigas, corpo JSON inválido). Campos aleatórios (`jornada_id`, `protocolo`) e datas dependentes de "hoje" (dias úteis, `criada_em`, `concluida_em`) são mascarados antes da comparação.

**Test Cases**:
1. **Vitrine idêntica**: o hash de cada combinação bate com o golden (cobre 3.4 e 3.9).
2. **Respostas HTTP idênticas**: toda chamada da lista bate com o golden (cobre 3.1, 3.2, 3.3, 3.5, 3.6).
3. **Eventos**: depois de `GET /dados/cidadaos/{id}` e `GET /recomendacao/{id}`, `GET /dados/eventos/resumo` mostra `entrou_como` e `vitrine_vista` (3.7).
4. **Adaptadores**: o teste do Lambda (já existente) continua verificando `salvarLogo` fora de `GET`, CORS e `OPTIONS` (3.8). Um teste novo compara os cabeçalhos de `criarCors` de cada ambiente com os valores de hoje.

### Unit Tests

- `entrada.js`: cada função de entrada, com os casos de hoje (`limite` vazio, `0`, `99`, `"abc"`; `campos` como texto válido, texto inválido e objeto; `finalidade` ausente e inválida).
- `erros.js`: `falhar` usa o status da tabela; código desconhecido lança erro claro; `desembrulhar` converte `{ erro, mensagem, jornada }` em `ErroHttp` com `extra.jornada`.
- `roteador.js`: `405` e `404` inalterados; `%` inválido em rota que aceita o método dá `400 caminho_invalido`; `%` inválido em método não permitido continua `405`; registro de padrões equivalentes com método em comum lança erro.
- `indice.js`: `gerarIndice` produz as mesmas chaves e textos do índice atual (comparado com um objeto de referência extraído do `app.js` antes da mudança).
- `http-comum.js`: `interpretarJson` (vazio, válido, inválido), `verificarTamanho` (limite exato e acima), `respostaDeErro` (`ErroHttp` e erro desconhecido).
- Jornada e vitrine: as funções menores novas têm um teste curto cada (`diversificar` respeita 2 por órgão nos 5 primeiros; `garantirServicoNovo` insere um serviço novo com motivo "Pessoas como você").

### Property-Based Tests

- Para 300 cidadãos fixos e as quatro combinações de consentimento, `montarVitrine` refatorado tem o mesmo hash do golden.
- Para cada `limite` gerado entre `-5` e `50` (incluindo texto e vazio), `lerLimite` devolve o mesmo valor que a expressão original, que fica copiada dentro do teste como oráculo.
- Para qualquer ordem de registro de um conjunto de rotas fixas e parametrizadas (todas as permutações de um conjunto pequeno), a rota escolhida para cada caminho é a mesma.
- Para qualquer sequência de `PATCH` com valores válidos e inválidos sobre o serviço 352, o formato de `erros[]`, `faltando` e `pode_confirmar` é o mesmo do golden.

### Integration Tests

- Passeio completo pelo serviço 352: `POST /dados/jornadas`, `PATCH`, `confirmar` sem `true` (`400`), com campos pendentes (`422`), com tudo certo (protocolo), e de novo (`ja_concluida`).
- Dois cidadãos lado a lado (mãe com criança pequena e senhor de 70 anos): vitrines diferentes, sem texto de saúde sem consentimento.
- Servidor local de verdade (porta efêmera): `GET /`, `GET /health`, `OPTIONS`, `GET /painel`, corpo acima de 100 KB (`413`), JSON inválido (`400 json_invalido`) e caminho com `%` inválido (`400 caminho_invalido`).
- Lambda: o mesmo caminho com `%` inválido pelo `handler`.
- Regra de dependência: um teste varre os `import` de `src/api/rotas/*.js` e falha se algum importar outro módulo de `rotas/`, e varre `src/dados` e `src/recomendacao` para garantir que nenhum importa de `src/api`.

### Ordem de execução e verificação

1. Gerar os golden com o código atual e commitar só depois de conferir que os 49 testes passam.
2. Escrever os testes novos de caminho inválido e de ordem do roteador e vê-los falhar.
3. Fazer cada passo da refatoração (itens 3, 2, 5, 6, 1 e 4, 7, 8 e 9, nesta ordem), rodando `npm run teste` ao fim de cada um.
4. Ao final: 49 testes originais sem edição de asserção, mais os novos, todos verdes.
