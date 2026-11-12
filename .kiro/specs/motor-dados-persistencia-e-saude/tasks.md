# Implementation Plan

## Overview

Plano de tarefas do bugfix `motor-dados-persistencia-e-saude`: testes exploratórios, testes de preservação, verificação da correção e checkpoint.

## Estado real do código (verificado antes de escrever as tarefas)

- Estrutura atual do backend: `backend/src/dados/` (`carga.js`, `store.js`, `consentimento.js`, `jornada.js`, `perfil.js`, `servicos.js`), `backend/src/recomendacao/` (`vitrine.js`, `regras.js`, `derivados.js`) e `backend/src/api/` (`app.js`, `server.js`, `rotas-dados.js`, `rotas-recomendacao.js`). Os caminhos antigos (`src/store.js`, `src/vitrine.js`, `src/dados.js`) e `ehServicoSensivel` não existem mais.
- `backend/src/dados/store.js` JÁ contém a correção do Bug 1: recarga em place, `Object.create(null)`, `limiteEventos()` com padrão 50000 (`EVENTOS_MAX`), aviso único de limite e `salvarLogo` com `timer = null`.
- `backend/src/recomendacao/vitrine.js` JÁ contém a correção do Bug 2: constante `MOTIVO_HISTORICO_GENERICO` e troca do texto quando `categoriasSensiveis(s).some((c) => !consentimentoDe[c])`, com `consentimentoDe = { saude, acessibilidade }` (consentimentos independentes). `categoriasSensiveis` vem de `regras.js` (saúde: `REGRAS_SAUDE` e `REGEX_SAUDE`; acessibilidade: `REGRAS_ACESSIBILIDADE` e `REGEX_ACESSIBILIDADE`, que cobre `pessoa_com_deficiencia`). A checagem extra opcional (defesa em profundidade) foi descartada pelo usuário e NÃO deve ser implementada.
- `backend/test/` JÁ existe, com `store.test.js`, `vitrine-saude.test.js`, `consentimento-acessibilidade.test.js` e `api.test.js`. Rodando `node --test` em `backend/` hoje: 41 testes, todos passam.
- O repositório git não tem nenhum commit (`git log` falha), então NÃO existe versão original de `store.js` ou `vitrine.js` para `git stash` ou `git show`. Como o código já está corrigido, os testes exploratórios não podem falhar contra ele. A validação contra o defeito usa cópias temporárias com o defeito reintroduzido (veja as tarefas 1 e 2). Se isso não for viável, documentar a limitação.
- Fora do escopo desta spec: os achados do tutorial (regra de Cadastro Único morta, demanda de `uso_semanal`, peso das visitas sem login) ficam na spec `conecta-recife-personalizacao`.
- Consequência: a maior parte do trabalho é VERIFICAR por teste e fechar lacunas de cobertura. Não reimplementar o que já está corrigido.

## Regras de todos os testes

- Rodam com `node --test` em `backend/` (script `teste`). Sem dependência nova.
- `DATA_DIR` aponta para pasta temporária criada com `fs.mkdtemp`, definido ANTES do import dinâmico de `store.js`.
- Não carregar os CSVs grandes: usar fixtures pequenas em `dados.cidadaos`, `dados.historico`, `dados.servicos` e um objeto `derivados` falso (`proximo`, `populares`, `demanda`, `semana_ref`).
- Propriedades com gerador pseudoaleatório de semente fixa (reprodutível). Nunca tocar em `backend/data/estado.json` real.
- Executar as tarefas uma por vez.

## Tasks

- [ ] 1. Testes exploratórios da bug condition (Bug 1: persistência e eventos)
  - **Property 1: Bug Condition** - Persistência do estado e limite de eventos
  - **IMPORTANT**: escrever/conferir estes testes ANTES de qualquer mudança de código
  - **GOAL**: mostrar que cada teste detecta o defeito original
  - **Limitação registrada**: `dados/store.js` atual JÁ está corrigido, então estes testes vão PASSAR no código atual. Isso é esperado e NÃO prova o defeito. Não há commit para recuperar o original (`git log` vazio), logo `git stash` e `git show` não servem.
  - **Como validar contra o defeito**: criar, em pasta temporária fora do repositório, uma cópia de `src/` com `dados/store.js` reescrito como o original descrito no design (`Object.assign(estado, { consentimentos, jornadas, eventos })` em `carregarEstado`; `salvarLogo` sem `timer = null`; `MAX_EVENTOS = 5000`). Rodar os testes apontando para essa cópia (por exemplo, variável `SRC_DIR` lida no import dos testes, com padrão `../src`; hoje os testes importam `../src/dados/store.js` e `../src/dados/consentimento.js` direto, então a parametrização precisa ser acrescentada) e confirmar que FALHAM. Se a cópia não for viável, documentar no arquivo de teste que a falha original não foi reproduzida e por quê.
  - Cobrir em `backend/test/store.test.js` (a maioria já existe; só acrescentar o que faltar):
    - identidade após recarga: `carregarEstado()` preenche os mesmos objetos exportados e `consentimentos[id]` fica definido (existe)
    - gravação reflete a memória: `registrarDecisao` seguido de `salvarLogo()` grava o consentimento no arquivo, sem `.tmp` sobrando (existe)
    - restart real em dois processos com `spawnSync` e o mesmo `DATA_DIR`: `statusConsentimento` volta `concedido` (existe)
    - timer após `salvarLogo`: novo `registrarEvento` depois de `salvarLogo()` é gravado após mais de 500 ms (existe)
    - limite de eventos: 5001 eventos todos preservados em ordem (existe)
    - **lacuna**: restart real em dois processos para jornada e evento, além de consentimento
  - **EXPECTED OUTCOME**: contra a cópia com defeito, FALHAM (confirma o bug). Contra `src/` atual, PASSAM (registrar a limitação).
  - Documentar os contraexemplos obtidos (ex.: `consentimentos['C000003']` indefinido após recarga; arquivo com `{}`; 5000 eventos em vez de 5001).
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Testes exploratórios da bug condition (Bug 2: vazamento de saúde no motivo)
  - **Property 1: Bug Condition** - Nome de serviço sensível não aparece sem consentimento
  - **IMPORTANT**: escrever/conferir estes testes ANTES de qualquer mudança de código
  - **GOAL**: mostrar que o teste detecta o vazamento original
  - **Limitação registrada**: `recomendacao/vitrine.js` atual JÁ está corrigido, então os testes vão PASSAR no código atual. Sem commit anterior, validar contra uma cópia temporária de `src/` em que o laço `distintos.forEach` volta a usar sempre `Quem acessou "${curto(s.nome, 60)}" também costuma acessar este serviço.` (sem a checagem de sensibilidade). Nesse caso os testes devem FALHAR.
  - Cobrir em `backend/test/vitrine-saude.test.js` (a base já existe com C000001 e serviço 283; os testes de acessibilidade com origem 299 estão em `consentimento-acessibilidade.test.js`; acrescentar o que faltar):
    - **lacuna**: fixture com a persona oficial C036462 e o serviço 892 "Atendimento online Atende Gestante" (sensível, categoria saúde) no histórico, sem consentimento, com `derivados.proximo[892]` apontando para um destino não sensível. Nenhum `motivo` nem `outros_motivos` contém "Atende Gestante" nem "gestante"; o texto genérico aparece. Os dados são fictícios.
    - **lacuna**: caso de `outros_motivos`. Montar a fixture para que o destino não sensível tenha motivo principal de outro tipo (ex.: regra de perfil ou popular) e o texto de histórico caia em `outros_motivos`. Se `outros_motivos` carregar só 1 texto e a fixture não o exercitar, registrar a limitação no teste.
    - **lacuna**: independência nos dois sentidos. Origem de acessibilidade (299) com consentimento de saúde mas SEM o de acessibilidade continua genérica; origem de saúde (892) com só o de acessibilidade também. Origem nas duas categorias (271) só mostra o nome com os DOIS consentimentos. Conferir antes o que `consentimento-acessibilidade.test.js` já cobre.
    - os casos de sem consentimento, com consentimento, origem não sensível e consentimento revogado (existem)
  - **EXPECTED OUTCOME**: contra a cópia com defeito, FALHAM (confirma o bug). Contra `src/` atual, PASSAM (registrar a limitação).
  - Documentar os contraexemplos (ex.: motivo `Quem acessou "Atendimento online Atende Gestante" também costuma...`).
  - _Requirements: 1.5, 1.6, 1.7_

- [ ] 3. Escrever testes de preservação (observação primeiro)
  - **Property 2: Preservation** - Comportamento fora da bug condition
  - **IMPORTANT**: seguir a metodologia de observação primeiro. Como não há versão original no git, observar no código atual (que já tem as correções) as entradas FORA da bug condition e fixar o resultado. Para a vitrine, validar também contra a cópia com defeito (tarefa 2): fora da bug condition, as duas versões devem dar o mesmo resultado.
  - Cobrir (a maioria já existe; acrescentar o que faltar):
    - primeira execução: arquivo ausente, vazio, inválido ou com formato errado inicia vazio sem lançar erro (existe); aviso só quando o arquivo existe e está inválido ou com formato inesperado
    - formato do arquivo: só as chaves `consentimentos`, `jornadas`, `eventos`; registros de consentimento sem campos novos; sem CPF, nome completo real ou endereço (existe)
    - `salvar()` com atraso de ~500 ms e `salvarLogo()` imediato e atômico (existe)
    - com consentimento, o motivo mantém o nome da origem sensível (existe)
    - origem não sensível mantém o nome, com ou sem consentimento (existe)
    - sem consentimento, nenhum item sensível é sugerido (existe em parte; **lacuna**: asserção explícita sobre todos os itens, usando 283 e 892)
    - **lacuna**: motivo "repetir" (`Você acessou este serviço em DD/MM/AAAA. Continue de onde parou.`) inalterado
    - **lacuna**: propriedade com semente fixa e dezenas de iterações. Gerar históricos e consentimentos aleatórios SEM origem sensível sem consentimento e verificar que a vitrine é idêntica à da cópia de referência (mesmos itens, ordem, `motivo`, `outros_motivos`, máximo de 2 itens do mesmo órgão nos 5 primeiros, pelo menos 1 serviço novo "Pessoas como você também usam")
    - registros antigos de consentimento sem `finalidade` contam como saúde (existe em `consentimento-acessibilidade.test.js`) e, sem consentimento, `saude` e `acessibilidade` não são lidas (existe em `api.test.js` e `consentimento-acessibilidade.test.js`)
    - **lacuna**: os CSVs de `BD/` não são abertos para escrita (os testes não os carregam; conferir que nenhum código de teste ou de store escreve em `BD/`)
  - Rodar no código atual e na cópia com defeito.
  - **EXPECTED OUTCOME**: testes PASSAM nas duas (confirma o comportamento de base a preservar).
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [ ] 4. Correção do motor de dados (persistência e saúde)

  - [ ] 4.1 Verificar por teste a correção já presente em `dados/store.js` (não reimplementar)
    - Conferir no código e confirmar pelos testes das tarefas 1 e 3:
      - `carregarEstado` recarrega em place e valida o tipo de cada campo; arquivo ausente, vazio ou inválido inicia vazio, com aviso só quando o arquivo existe e está corrompido
      - `salvarLogo` faz `clearTimeout(timer)` e `timer = null`, e grava via `.tmp` + `rename`
      - `limiteEventos()` lê `EVENTOS_MAX` a cada chamada; inválido (`abc`, `0`, `-5`, `2.5`, vazio) usa 50000; aviso único ao exceder
      - API pública inalterada: `carregarEstado`, `salvar`, `salvarLogo`, `registrarEvento`, `consentimentos`, `jornadas`, `eventos`
    - **Lacuna a fechar só se a conferência achar falha**: `carregarEstado` carrega os eventos com laço de `push` por item, para não estourar a pilha com listas grandes. Teste com um arquivo de ~200 mil eventos (gerado em tempo de teste) para garantir que a recarga não estoura a pilha.
    - _Bug_Condition: isBugCondition_Persistencia(X) e isBugCondition_Eventos(X) do design_
    - _Expected_Behavior: Property 1 e Property 2 do design_
    - _Preservation: Property 4 do design_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2_

  - [ ] 4.2 Verificar por teste a correção já presente em `recomendacao/vitrine.js` (não reimplementar)
    - Conferir no código e confirmar pelos testes das tarefas 2 e 3:
      - `MOTIVO_HISTORICO_GENERICO` tem o texto exato "Pessoas com um perfil parecido com o seu também costumam acessar este serviço."
      - o texto genérico é usado quando `categoriasSensiveis(s).some((c) => !consentimentoDe[c])`, isto é, por categoria (saúde e acessibilidade independentes; uma origem nas duas categorias exige os dois consentimentos)
      - o texto original com o nome é mantido com consentimento ou origem não sensível
      - pontuação, peso `parte`, ordem, diversidade e serviço novo garantido não mudaram
    - NÃO implementar a checagem extra opcional (defesa em profundidade): decisão do usuário.
    - Registrar o risco residual: a classificação depende das listas de ids `REGRAS_SAUDE` e `REGRAS_ACESSIBILIDADE` e das expressões regulares `REGEX_SAUDE` e `REGEX_ACESSIBILIDADE` em `regras.js`; um serviço sensível que não case com elas ainda pode vazar. Fora do escopo.
    - Registrar a decisão de implementação: `pessoa_com_deficiencia` fica em categoria própria (`CAMPOS_ACESSIBILIDADE` em `carga.js`), embora o `docs/tutorial.md` liste só hipertensão, diabetes, saúde mental e gestante como marcadores de saúde.
    - `consentimento.js` e `regras.js` não mudam.
    - _Bug_Condition: isBugCondition_Saude(X) do design_
    - _Expected_Behavior: Property 3 do design_
    - _Preservation: Property 5 do design_
    - _Requirements: 2.5, 2.6, 2.7, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 3.10_

  - [ ] 4.3 Acrescentar os testes de integração previstos no design
    - Em `backend/test/integracao.test.js` (novo), com `criarApp` de `src/api/app.js`, `DATA_DIR` temporário e fixtures (sem CSVs). Rotas reais (verificadas em `api/rotas-dados.js` e `api/rotas-recomendacao.js`):
      - `POST /dados/consentimentos/{id}` concede, `salvarLogo`, segundo processo carrega, `GET /dados/consentimentos/{id}` e `GET /recomendacao/{id}` mostram o consentimento ativo
      - `POST /dados/jornadas`, `salvarLogo`, restart, `GET /dados/cidadaos/{id}/jornadas` lista a jornada e um novo `POST /dados/jornadas` retoma a mesma (`retomada: true`)
      - `POST /dados/eventos`, restart, `GET /dados/eventos/resumo` com os totais anteriores
      - saúde ponta a ponta com C036462 e serviço 892: sem consentimento vê o texto genérico; após conceder a finalidade `saude_personalizacao`, a mesma vitrine mostra o nome da origem; conceder só `acessibilidade_personalizacao` não mostra
    - Antes de escrever, reler `api/rotas-dados.js` para confirmar formatos de corpo e resposta; `api.test.js` já cobre parte das rotas, então não duplicar.
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 3.3_

  - [ ] 4.4 Verificar que o teste exploratório agora passa
    - **Property 1: Expected Behavior** - Persistência, limite de eventos e sem nome sensível sem o consentimento da categoria
    - **IMPORTANT**: rodar os MESMOS testes das tarefas 1 e 2, sem escrever novos
    - Rodar contra `src/` atual: **EXPECTED OUTCOME** PASSAM (confirma que o defeito está corrigido)
    - Rodar de novo contra as cópias com defeito: **EXPECTED OUTCOME** FALHAM (confirma que os testes detectam o bug)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 4.5 Verificar que os testes de preservação continuam passando
    - **Property 2: Preservation** - Persistência, primeira execução e vitrine
    - **IMPORTANT**: rodar os MESMOS testes da tarefa 3, sem escrever novos
    - **EXPECTED OUTCOME**: PASSAM (sem regressões)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [ ] 5. Checkpoint - Garantir que todos os testes passam
  - Rodar `node --test` em `backend/` e confirmar zero falhas (linha de base atual: 41 testes passando, antes das lacunas)
  - Confirmar que as cópias temporárias com defeito e os `DATA_DIR` temporários foram apagados e que `backend/data/estado.json` real e `BD/` não foram alterados
  - Confirmar que nenhuma dependência foi adicionada a `package.json`
  - Perguntar ao usuário se houver dúvidas

## Notes

- Escreva e rode os testes exploratórios antes de qualquer mudança de código, e rode-os contra o código SEM correção (as cópias temporárias com defeito) para entender o bug.
- Siga a observação primeiro nos testes de preservação.
- Não execute mais de uma tarefa por vez.
