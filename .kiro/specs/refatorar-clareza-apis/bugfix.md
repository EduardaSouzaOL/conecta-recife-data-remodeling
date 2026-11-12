# Bugfix Requirements Document

## Introduction

Pedido: "Procure refatorar o código para deixar mais claros cada API." O backend do Conecta Recife (`backend/`, Node 20+, sem dependências, dados fictícios) funciona e tem 49 testes passando. O problema é de clareza: os endpoints que o Kodiak chama estão misturados, com validação, erros e contratos tratados de formas diferentes. Isso dificulta manter o código e dar suporte ao Kodiak.

Esta spec trata o "defeito" como falta de clareza e **não muda o comportamento externo**. Rotas, métodos, status HTTP, códigos de erro, textos e formato das respostas continuam iguais. Os 49 testes atuais devem continuar passando sem alteração de asserções.

Problemas encontrados na leitura do código (`backend/src/api/`, `backend/src/dados/jornada.js`, `backend/src/dados/consentimento.js`, `backend/src/recomendacao/vitrine.js`):

1. **Um arquivo para cinco responsabilidades.** `rotas-dados.js` reúne cidadãos, serviços, consentimentos, jornadas e eventos. `rotas-recomendacao.js` importa `resolverCidadao` de `rotas-dados.js`, então um módulo de rotas depende de outro.
2. **Handlers fazem leitura de entrada.** Cada handler combina `corpo.x ?? consulta.x`, converte `campos` de texto para objeto, limita `limite` e valida `finalidade` por conta própria. A regra "onde cada parâmetro pode vir" não está escrita em um só lugar.
3. **Três formas de falhar.** Há `throw ErroHttp`; retorno `{ erro, status, mensagem, jornada? }` em `jornada.js` (convertido por `desembrulhar`); e retorno `{ erro, mensagem }` em `consentimento.js` sem status, que a rota converte com um ternário (`400` ou `409`).
4. **Índice da API escrito à mão.** `GET /` em `app.js` lista as rotas em texto fixo, separado do README. Pode ficar diferente das rotas realmente registradas.
5. **Dependência da ordem de registro.** `/dados/consentimentos/texto` precisa vir antes de `/dados/consentimentos/:id` e `/dados/cidadaos/demo` antes de `/dados/cidadaos/:id`. Só um comentário avisa isso.
6. **Código repetido entre `server.js` e `lambda.js`.** CORS (com métodos diferentes), limite de corpo, leitura de JSON e conversão de `ErroHttp` em resposta existem duas vezes.
7. **Contrato implícito.** Os formatos de resposta só existem dentro do código. Há aliases e campos antigos sem marcação (`POST` em `/recomendacao/:id`, `POST` em `PATCH /dados/jornadas/:id`, `usa_dados_de_saude`) e efeitos colaterais em `GET` (`entrou_como`, `vitrine_vista`) que não aparecem em lugar nenhum.
8. **Funções longas.** `montarVitrine` (cerca de 200 linhas, do cálculo à montagem da resposta) e `jornada.js` (390 linhas: telas, validação, visão e operações) misturam responsabilidades.
9. **Divergência a decidir, sem mudar agora.** A regra do projeto diz que erro de validação que o cidadão pode corrigir volta com `200` e `ok: false`. A API atual devolve `400`, `409` e `422` para vários desses casos (por exemplo `confirmacao_necessaria`, `campos_pendentes`, `decisao_invalida`), e os testes e o README dependem desses status. Só o `PATCH` de jornada segue o padrão (200 com `erros[]`). A refatoração não altera isso; ela registra a divergência e deixa a decisão em um único ponto.

Restrições: não alterar os CSVs em `BD/`, não mudar `tools/painel.html` além do necessário, não mudar as regras de consentimento de saúde e acessibilidade (resolvidas no servidor) e manter a regra "a tela não decide nada".

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN um desenvolvedor procura o código de um endpoint de `/dados` THEN the system o coloca em `rotas-dados.js`, junto com os de outras quatro áreas, e `rotas-recomendacao.js` importa `resolverCidadao` desse arquivo

1.2 WHEN um handler recebe parâmetros THEN the system lê e valida a entrada dentro do próprio handler (`corpo.x ?? consulta.x`, `JSON.parse` de `campos`, limite de `limite`, `finalidadeDe`), de forma repetida e sem um ponto único que diga de onde cada parâmetro pode vir

1.3 WHEN uma operação falha THEN the system usa três formas diferentes (`throw ErroHttp`, retorno `{ erro, status, mensagem }` em `jornada.js`, retorno `{ erro, mensagem }` sem status em `consentimento.js` com status decidido por ternário na rota)

1.4 WHEN alguém consulta o índice em `GET /` THEN the system devolve um texto escrito à mão em `app.js`, que não é gerado a partir das rotas registradas e pode ficar desatualizado

1.5 WHEN uma rota fixa (`/dados/cidadaos/demo`, `/dados/consentimentos/texto`) e uma rota com parâmetro (`:id`) compartilham o prefixo THEN the system depende da ordem de registro para escolher a certa, sem teste que proteja isso

1.6 WHEN o servidor local e o adaptador Lambda recebem uma requisição THEN the system repete em `server.js` e `lambda.js` o CORS (listas de métodos diferentes), o limite de corpo, a leitura de JSON e a conversão de `ErroHttp` em resposta

1.7 WHEN alguém precisa saber o que um endpoint devolve THEN the system não tem descrição do contrato fora do código, e aliases, campos antigos e efeitos colaterais de `GET` (`entrou_como`, `vitrine_vista`) não estão marcados

1.8 WHEN alguém lê `montarVitrine` ou `jornada.js` THEN the system mostra funções e arquivos longos que misturam cálculo, regras de consentimento, textos prontos e montagem da resposta

1.9 WHEN o `%` de um caminho tem codificação inválida (por exemplo `/dados/cidadaos/%E0%A4%A`) THEN the system deixa `decodeURIComponent` lançar `URIError`, que vira `500 erro_interno` em vez de um erro claro de requisição

### Expected Behavior (Correct)

2.1 WHEN um desenvolvedor procura o código de um endpoint THEN the system SHALL tê-lo em um módulo por área (cidadãos, serviços, consentimentos, jornadas, eventos, recomendação), com uma função de resolução do `cidadao_id` compartilhada em um módulo de apoio próprio, sem um módulo de rotas importar outro

2.2 WHEN um handler recebe parâmetros THEN the system SHALL ler e validar a entrada por funções de apoio nomeadas (por exemplo `identificarCidadao`, `lerFinalidade`, `lerLimite`, `lerCampos`) que definem em um só lugar de onde cada parâmetro vem e que mantêm os mesmos valores padrão, limites e códigos de erro

2.3 WHEN uma operação falha THEN the system SHALL usar um único caminho de erro (`ErroHttp`) para a camada de rotas, com o mapeamento de código de erro para status em uma tabela única e visível, e com os mesmos `status`, `erro`, `mensagem` e campos extras (`jornada`) de hoje

2.4 WHEN alguém consulta `GET /` THEN the system SHALL gerar o índice a partir das rotas registradas (método, caminho, descrição, exemplo de corpo), mantendo as chaves `motor_de_dados`, `motor_de_recomendacao` e `saude_da_api` e o texto de cada rota

2.5 WHEN uma rota fixa e uma rota com parâmetro compartilham o prefixo THEN the system SHALL resolver a rota fixa primeiro por regra do roteador (fixas antes de parametrizadas), e SHALL haver teste que falhe se essa regra for quebrada

2.6 WHEN o servidor local e o adaptador Lambda recebem uma requisição THEN the system SHALL compartilhar um módulo de HTTP comum com CORS, limite de corpo, leitura de JSON e conversão de erro em resposta, mantendo as mesmas respostas, cabeçalhos e status de hoje em cada ambiente

2.7 WHEN alguém precisa saber o que um endpoint devolve THEN the system SHALL ter, na pasta de specs, um documento de contrato por endpoint (método, caminho, entrada, saída, erros, efeitos colaterais, aliases e campos antigos marcados como legados), e o `backend/README.md` SHALL apontar para ele

2.8 WHEN alguém lê `montarVitrine` ou `jornada.js` THEN the system SHALL ter funções menores com nome claro (por exemplo: reunir candidatos, pontuar, diversificar, montar item, montar avisos e convites; e, em jornada, configuração de telas, validação, visão e operações em módulos separados), com as mesmas saídas de hoje

2.9 WHEN o caminho tem codificação `%` inválida THEN the system SHALL devolver `400` com `erro: "caminho_invalido"` e mensagem em texto simples, e SHALL NOT devolver `500`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN qualquer rota existente é chamada com o mesmo método, caminho, consulta e corpo de hoje THEN the system SHALL CONTINUE TO devolver o mesmo status e o mesmo JSON (mesmas chaves, tipos e textos)

3.2 WHEN o método não é permitido numa rota existente ou a rota não existe, ou o caminho é uma rota antiga sem prefixo (`/vitrine`, `/entrar`) THEN the system SHALL CONTINUE TO devolver `405 metodo_nao_permitido` ou `404 rota_nao_encontrada`

3.3 WHEN o `cidadao_id` é inválido ou inexistente THEN the system SHALL CONTINUE TO devolver `400 id_invalido` ou `404 cidadao_nao_encontrado`, com as mesmas mensagens

3.4 WHEN o cidadão não concedeu consentimento de saúde ou de acessibilidade THEN the system SHALL CONTINUE TO não ler nem expor `saude`, `acessibilidade` nem textos que citem a condição, e os dois consentimentos SHALL CONTINUE TO ser independentes

3.5 WHEN a jornada recebe valores inválidos no `PATCH` THEN the system SHALL CONTINUE TO devolver `200` com `erros[]` em texto simples, e `confirmar` sem `true` ou com campos pendentes SHALL CONTINUE TO devolver `400 confirmacao_necessaria` e `422 campos_pendentes` com `jornada` nos campos extras

3.6 WHEN uma jornada do mesmo serviço já está em andamento THEN the system SHALL CONTINUE TO retomá-la com `retomada: true`, e confirmar uma jornada já concluída SHALL CONTINUE TO devolver a visão da jornada concluída

3.7 WHEN `GET /dados/cidadaos/:id` e `/recomendacao/:id` são chamados THEN the system SHALL CONTINUE TO registrar os eventos `entrou_como` e `vitrine_vista`, e `POST /dados/eventos` SHALL CONTINUE TO aceitar só `tela_pulada`, `erro_entendimento`, `vitrine_vista` e `servico_aberto`

3.8 WHEN o adaptador Lambda trata um método diferente de `GET` THEN the system SHALL CONTINUE TO gravar o estado na hora (`salvarLogo`), e o servidor local SHALL CONTINUE TO gravar ao receber `SIGINT` e `SIGTERM` e servir `/painel`

3.9 WHEN a vitrine é montada THEN the system SHALL CONTINUE TO manter a ordem, a diversidade (no máximo 2 por órgão nos 5 primeiros), o motivo de cada item, a base da personalização e os convites de consentimento idênticos, para os mesmos dados de entrada

3.10 WHEN os testes de `backend/test/` são executados com `npm run teste` THEN the system SHALL CONTINUE TO passar todos os 49 testes existentes sem mudar suas asserções
