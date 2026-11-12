# Motor de Dados: Persistência e Saúde. Design do Bugfix

## Overview

Dois defeitos no backend do Conecta Recife (dados fictícios), confirmados na leitura do código e já corrigidos nele. Este design descreve a causa, a correção que está no código e o que falta apenas VERIFICAR por teste.

1. **Persistência.** Em `backend/src/dados/store.js`, a versão com defeito de `carregarEstado()` fazia `Object.assign(estado, { consentimentos: {...}, jornadas: {...}, eventos: [...] })`. Isso trocava as propriedades de `estado` por objetos novos, mas `consentimentos`, `jornadas` e `eventos` são exportados como constantes que apontam para os objetos ORIGINAIS. O resto do código (`consentimento.js`, `jornada.js`) lia e gravava nos objetos antigos, enquanto `salvarLogo()` serializava `estado`. O arquivo `data/estado.json` ficava sempre vazio. Defeitos menores no mesmo arquivo: `salvarLogo()` chamava `clearTimeout(timer)` sem zerar `timer`, então um `salvar()` posterior podia nunca agendar a gravação, e `MAX_EVENTOS = 5000` descartava eventos de medição em silêncio.
2. **Vazamento de dado sensível.** Em `backend/src/recomendacao/vitrine.js`, o motivo do tipo "histórico" era montado com o nome do serviço de ORIGEM, vindo do histórico do cidadão. O filtro de sensibilidade só valia para o serviço SUGERIDO. Sem o consentimento da categoria correspondente, um item não sensível podia exibir `Quem acessou "Atendimento online Atende Gestante" também costuma acessar este serviço.`, em `motivo` ou em `outros_motivos`.

Estratégia (já aplicada): correção mínima e localizada. No `store.js`, recarga EM PLACE, `timer = null` em `salvarLogo` e limite de eventos maior e configurável. No `vitrine.js`, texto genérico no motivo quando a origem pertence a uma categoria sensível cujo consentimento o cidadão não deu.

Nota de contexto: a estrutura de pastas do backend mudou depois da primeira versão desta spec. Os módulos agora ficam em `backend/src/dados/` (`carga.js`, `store.js`, `consentimento.js`, `jornada.js`, `perfil.js`, `servicos.js`, `csv.js`), `backend/src/recomendacao/` (`vitrine.js`, `regras.js`, `derivados.js`) e `backend/src/api/` (`app.js`, `server.js`, `roteador.js`, `rotas-dados.js`, `rotas-recomendacao.js`, `erros.js`). Os nomes antigos (`dados.js`, `ehServicoSensivel`, `REGEX_SENSIVEL`) não existem mais.

## Glossary

- **Bug_Condition (C)**: condição que dispara o defeito. Há três: `isBugCondition_Persistencia`, `isBugCondition_Eventos` e `isBugCondition_Saude`.
- **Property (P)**: comportamento desejado quando C vale.
- **Preservation**: comportamento existente que não pode mudar quando C não vale.
- **F / F'**: código antes da correção / depois da correção.
- **estado**: objeto interno de `store.js` com `consentimentos`, `jornadas` e `eventos`.
- **Referência exportada**: as constantes `consentimentos`, `jornadas` e `eventos` de `store.js`, importadas por outros módulos. A identidade desses objetos precisa ser estável.
- **Serviço de origem**: serviço do histórico do cidadão usado para gerar o motivo "Quem acessou X também costuma acessar este serviço".
- **Categoria sensível**: `saude` ou `acessibilidade`. `categoriasSensiveis(servico)` (em `regras.js`) devolve as categorias de um serviço, que pode ter zero, uma ou as duas (por exemplo, o serviço 271 está nas duas listas).
  - `saude`: ids de `REGRAS_SAUDE` (284, 283, 1197, 1193, 892, 295, 1362, 271) ou nome que casa com `REGEX_SAUDE`.
  - `acessibilidade`: ids de `REGRAS_ACESSIBILIDADE` (299, 357, 271, 1239, 1175, 317) ou nome que casa com `REGEX_ACESSIBILIDADE`.
- **Consentimento por categoria**: `temConsentimentoSaude(id)` (finalidade `saude_personalizacao`) e `temConsentimentoAcessibilidade(id)` (finalidade `acessibilidade_personalizacao`), em `consentimento.js`. São independentes: o último registro de cada finalidade decide, e conceder uma não concede a outra. Em `vitrine.js`, o objeto `consentimentoDe = { saude, acessibilidade }` reúne os dois.
- **Marcadores por categoria**: `CAMPOS_SAUDE` (`hipertensao`, `diabetes`, `saude_mental`, `gestante`) e `CAMPOS_ACESSIBILIDADE` (`pessoa_com_deficiencia`), em `carga.js`. O `docs/tutorial.md` lista como saúde apenas os quatro primeiros; PCD em categoria própria é decisão de implementação, registrada em `bugfix.md`.
- **DATA_DIR**: variável de ambiente lida em `carga.js` (`DIR_DATA`) que define a pasta de `estado.json`. Permite isolar os testes.

## Bug Details

### Bug Condition

**Defeito 1 (persistência).** Aparece em qualquer sessão de servidor em que o estado é gravado ou em que o arquivo já tem estado salvo. `carregarEstado` é chamado em `api/server.js` logo na inicialização, então a troca de objetos acontecia sempre, mesmo com arquivo vazio. O limite de 5000 eventos agravava a perda de medição.

**Defeito 2 (dado sensível).** Aparece quando o cidadão tem no histórico um serviço sensível, não deu o consentimento de pelo menos uma das categorias desse serviço, e esse serviço é origem de uma transição (`derivados.proximo[origem]`) para algum destino que entra na vitrine.

**Formal Specification:**
```
FUNCTION isBugCondition_Persistencia(X)
  INPUT: X de tipo SessaoDeServidor
         // X.arquivoTemEstadoSalvo: estado.json não vazio no início
         // X.gravouEstado: houve registrarDecisao, iniciarJornada, registrarEvento etc.
  OUTPUT: boolean
  RETURN carregarEstado FOI chamado
         AND (X.gravouEstado OR X.arquivoTemEstadoSalvo)
         AND objetoExportado(consentimentos | jornadas | eventos) != objetoSerializado(estado)
END FUNCTION

FUNCTION isBugCondition_Eventos(X)
  INPUT: X de tipo SessaoDeServidor
  OUTPUT: boolean
  RETURN X.eventosRegistrados > 5000
END FUNCTION

FUNCTION isBugCondition_Saude(X)
  INPUT: X de tipo (cidadao, vitrine)
  OUTPUT: boolean
  RETURN EXISTS origem IN X.cidadao.historico:
           EXISTS c IN categoriasSensiveis(origem):
             NOT temConsentimento(X.cidadao, c)
             AND textoDoItem(X.vitrine) CONTÉM origem.nome
             // textoDoItem = motivo OU algum texto de outros_motivos
END FUNCTION

FUNCTION isBugCondition(X)
  RETURN isBugCondition_Persistencia(X)
         OR isBugCondition_Eventos(X)
         OR isBugCondition_Saude(X)
END FUNCTION
```

### Examples

- **Persistência (restart).** O cidadão C000003 concede consentimento. `registrarDecisao` grava em `consentimentos` (objeto antigo). O timer dispara `salvarLogo`, que serializa `estado.consentimentos` (objeto novo, vazio). `estado.json` continua vazio. Após o restart, `statusConsentimento('C000003')` volta a `pendente`. Esperado: `concedido`.
- **Persistência (arquivo com dados).** `estado.json` tem `{"consentimentos":{"C000003":[{"status":"concedido",...}]},...}`. Após `carregarEstado`, `consentimentos['C000003']` (objeto exportado) é `undefined`. Esperado: o registro de `concedido`.
- **Timer.** `registrarEvento` agenda o timer. `salvarLogo()` roda direto e faz `clearTimeout`, mas `timer` segue truthy. O próximo `salvar()` sai em `if (timer) return` e nada é gravado. Esperado: a gravação é reagendada.
- **Eventos.** 5001 eventos registrados. O mais antigo some em silêncio. Esperado: todos preservados até o novo limite.
- **Saúde (persona oficial C036462, jovem estudante e gestante).** Sem consentimento de saúde, histórico com o serviço 892 "Atendimento online Atende Gestante" (categoria `saude`) e `proximo[892]` apontando para um destino não sensível. Motivo com defeito: `Quem acessou "Atendimento online Atende Gestante" também costuma acessar este serviço.` Esperado: `Pessoas com um perfil parecido com o seu também costumam acessar este serviço.`
- **Saúde (outros_motivos).** O texto vazado cai em `outros_motivos` de um item cujo motivo principal é de outro tipo. Esperado: o nome sensível não aparece em lugar nenhum.
- **Independência das categorias.** Cidadão com consentimento de saúde, mas sem o de acessibilidade, e origem 299 (categoria `acessibilidade`). Esperado: texto genérico. O inverso (só acessibilidade, origem 892) também fica genérico.
- **Serviço nas duas categorias (271).** A origem tem `saude` e `acessibilidade`. Esperado: o nome só aparece se o cidadão deu os DOIS consentimentos, porque `categoriasSensiveis(s).some((c) => !consentimentoDe[c])` basta uma categoria sem consentimento para gerar o texto genérico.
- **Caso de borda (consentiu).** Com o consentimento da categoria da origem, o motivo mantém o nome do serviço de origem.
- **Caso de borda (origem não sensível).** Origem "Agendar consultas", sem consentimento: o motivo mantém o nome.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Primeira execução, com `estado.json` ausente, vazio ou inválido: inicia com estado vazio (3.1).
- `salvar()` continua com atraso de 500 ms e `salvarLogo()` continua imediato e atômico (arquivo `.tmp` e `rename`). Nada de CPF, nome completo real ou endereço (3.2).
- Com o consentimento de todas as categorias da origem, o motivo "Quem acessou X..." mantém o nome (3.3).
- Origem não sensível mantém o nome, com ou sem consentimento (3.4).
- Serviço sugerido sensível sem o consentimento da categoria continua não sendo sugerido (3.5).
- Motivo "repetir" (`Você acessou este serviço em ...`) continua igual (3.6).
- Pontuação, ordem, diversidade por órgão e garantia de um serviço novo continuam iguais (3.7).
- CSVs de `BD/` continuam somente leitura (3.8).
- Sem consentimento, `saude` e `acessibilidade` não são lidos do perfil (3.9) e registros antigos sem `finalidade` contam como saúde (3.10).

**Scope:**
Fica fora do alcance: todas as rotas e regras que não leem ou gravam o estado persistido, a lógica de pontuação da vitrine e as regras de perfil, saúde e acessibilidade de `regras.js`. A única mudança observável em `vitrine.js` é o texto do motivo "histórico" quando a origem tem categoria sem consentimento.

## Hypothesized Root Cause

**Defeito 1 (confirmado pela leitura do código original):**

1. **Troca de identidade no carregamento.** `Object.assign(estado, {...novos})` substituía as propriedades de `estado`. As constantes exportadas foram capturadas na criação do módulo e nunca mais acompanhavam `estado`. Causa raiz principal.
2. **`salvarLogo` não zerava o timer.** `clearTimeout(timer)` sem `timer = null` bloqueava `salvar()` depois de uma gravação imediata. Causa secundária.
3. **Limite fixo e baixo de eventos.** `MAX_EVENTOS = 5000` constante, sem configuração e sem aviso.

**Defeito 2 (confirmado pela leitura do código original):**

1. **Filtro de sensibilidade só no destino.** O laço `distintos.forEach` usava o nome da origem sem checar a sensibilidade dela nem os consentimentos.
2. **Propagação por `outros_motivos`.** O texto guardado em `x.m.historico` também pode ser escolhido como "outro motivo" de um item cujo motivo principal é de outro tipo. Corrigir na origem do texto resolve os dois campos.
3. **Consentimento único.** Antes da separação por categoria, um único consentimento valia para tudo. Com saúde e acessibilidade independentes, a checagem precisa ser por categoria da origem.
4. **Hipótese descartada.** O motivo "repetir" não nomeia serviço e o item sensível é filtrado antes da escolha final. Não há vazamento por esse caminho.

## Correctness Properties

Property 1: Bug Condition - Persistência do estado

_For any_ sessão de servidor em que `carregarEstado` foi chamado e houve gravação ou arquivo com estado salvo (isBugCondition_Persistencia), o estado corrigido SHALL expor em `consentimentos`, `jornadas` e `eventos` exatamente o conteúdo de `estado.json`, SHALL gravar em `estado.json` exatamente o conteúdo dos objetos exportados (de forma atômica), e SHALL devolver o mesmo estado após um restart. As referências exportadas SHALL manter a mesma identidade antes e depois de `carregarEstado`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition - Limite de eventos

_For any_ sequência de N eventos registrados com N menor ou igual ao limite configurado (isBugCondition_Eventos), o estado corrigido SHALL preservar todos os N eventos na ordem de registro. O limite padrão SHALL ser maior que 5000 e configurável por variável de ambiente.

**Validates: Requirements 2.4**

Property 3: Bug Condition - Sem nome de serviço sensível sem o consentimento da categoria

_For any_ cidadão com serviço sensível no histórico e sem o consentimento de alguma das categorias desse serviço (isBugCondition_Saude), a vitrine corrigida SHALL NOT conter o nome nem o tema do serviço de origem em nenhum `motivo` nem em `outros_motivos`, e SHALL usar o texto genérico "Pessoas com um perfil parecido com o seu também costumam acessar este serviço." no lugar. O consentimento de uma categoria SHALL NOT liberar a origem da outra.

**Validates: Requirements 2.5, 2.6, 2.7**

Property 4: Preservation - Persistência e primeira execução

_For any_ inicialização em que `estado.json` não existe, está vazio ou está inválido, e _for any_ gravação que não envolva as correções (formato do arquivo, atraso de 500 ms, gravação imediata, ausência de dados pessoais reais), o código corrigido SHALL produzir o mesmo comportamento observável do código original, preservando o início com estado vazio e o formato `{consentimentos, jornadas, eventos}`.

**Validates: Requirements 3.1, 3.2, 3.8**

Property 5: Preservation - Vitrine e motivos

_For any_ cidadão e histórico fora de isBugCondition_Saude (com o consentimento de todas as categorias da origem, ou com origem não sensível), a vitrine corrigida SHALL produzir a mesma lista de itens, a mesma ordem, os mesmos `motivo` e `outros_motivos`, a mesma diversidade por órgão e o mesmo serviço novo garantido que a vitrine original, e SHALL continuar sem sugerir serviço sensível sem o consentimento da respectiva categoria.

**Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 3.10**

## Fix Implementation

Legenda: **[Implementado]** já está no código atual e só precisa de verificação por teste. **[Verificação]** é trabalho de teste ainda por fazer. Não há reimplementação a fazer.

### Changes Required

**File**: `backend/src/dados/store.js` **[Implementado]**

1. **Recarga em place** (`carregarEstado`). Lê o arquivo, valida o formato e copia para os objetos existentes:
   - `consentimentos` e `jornadas` (criados com `Object.create(null)`, para que ids como `constructor` não achem propriedade herdada): apaga as chaves atuais (`esvaziar`) e `Object.assign(alvo, lido)`.
   - `eventos`: `eventos.length = 0` e `push` por item em laço, para não estourar a pilha com listas grandes.
   - Valida: `consentimentos` e `jornadas` precisam ser objetos simples e `eventos` precisa ser array. Campo inválido vira vazio.
   - Arquivo ausente ou vazio inicia vazio sem aviso. JSON inválido ou formato inesperado inicia vazio com `console.warn` (3.1).
2. **Timer zerado** (`salvarLogo`). `clearTimeout(timer)` seguido de `timer = null`. Mantém gravação em `.tmp` seguida de `rename` (atômica).
3. **Limite de eventos configurável** (`limiteEventos()`). Lê `process.env.EVENTOS_MAX` a cada chamada. Valor válido: inteiro positivo. Padrão: 50000 (`EVENTOS_MAX_PADRAO`). Ao exceder, descarta os mais antigos e emite um aviso único (`console.warn`) por processo.
4. **API pública inalterada.** `carregarEstado`, `salvar`, `salvarLogo`, `registrarEvento`, `limiteEventos`, `consentimentos`, `jornadas` e `eventos` continuam exportados.

**File**: `backend/src/recomendacao/vitrine.js` **[Implementado]**

1. **Texto genérico por categoria** (`montarVitrine`). `MOTIVO_HISTORICO_GENERICO` é uma constante do módulo com o texto "Pessoas com um perfil parecido com o seu também costumam acessar este serviço.". No laço `distintos.forEach`:
   - `consentimentoDe = { saude: temConsentimentoSaude(id), acessibilidade: temConsentimentoAcessibilidade(id) }`.
   - Se `categoriasSensiveis(s).some((c) => !consentimentoDe[c])`, usa o texto genérico.
   - Caso contrário (origem não sensível, ou todas as categorias dela consentidas), mantém `Quem acessou "${curto(s.nome, 60)}" também costuma acessar este serviço.`
2. **Nada mais muda na pontuação.** `outros_motivos` sai de `x.m`, então herda a correção na origem do texto (2.6). A pontuação, o peso `parte` e a escolha do tipo do motivo não mudam (3.7). O serviço de origem continua alimentando `derivados.proximo` com o mesmo peso.
3. **Defesa em profundidade: descartada.** A checagem extra opcional, que varreria os textos antes de devolver os itens, foi descartada pelo usuário e NÃO deve ser implementada. A causa raiz é tratada na origem do texto.
4. **Já relacionado, fora do defeito.** Também no `montarVitrine`, `saude` e `acessibilidade` só são lidos de `reg` com o respectivo consentimento, e `candidatosPorRegra(perfil, saude, acessibilidade)` só avalia as regras da categoria quando recebe o objeto (3.9). O filtro `categorias.length && !categorias.some((c) => x.liberadas?.has(c))` impede sugerir serviço sensível sem a regra liberada por consentimento (3.5).

**File**: `backend/src/dados/consentimento.js` **[Sem mudança para este bugfix]**

- Importa `consentimentos` de `store.js` e usa `registrarEvento` e `salvar`. Com a identidade estável, passa a gravar no objeto que é serializado. Já suporta as duas finalidades (`FINALIDADE_SAUDE`, `FINALIDADE_ACESSIBILIDADE`), com registro por finalidade e data, e trata registros antigos sem `finalidade` como saúde (3.10). A decisão de persistir o histórico de consentimento (4.6) é cumprida pela correção do `store.js`.

**File**: `backend/src/recomendacao/regras.js` **[Sem mudança para este bugfix]**

- `categoriasSensiveis(servico)` classifica o serviço em `saude` e/ou `acessibilidade` usando `REGRAS_SAUDE`, `REGRAS_ACESSIBILIDADE`, `REGEX_SAUDE` e `REGEX_ACESSIBILIDADE`.
- **Risco residual (fora do escopo):** a classificação depende dessas duas listas de ids e dessas duas expressões regulares. Se um serviço revelar saúde ou deficiência sem casar com elas, o vazamento continua possível. Registrar como risco conhecido.

**Compatibilidade.** `api/server.js` continua chamando `carregarEstado()` na inicialização e `salvarLogo()` ao sair, sem alterações. `jornada.js` continua importando as mesmas referências.

**Observação fora do escopo.** O script `start` de `backend/package.json` aponta para `src/server.js`, mas o arquivo está em `src/api/server.js`. É um problema do projeto, não deste bugfix; fica registrado para quem for tratar a estrutura do backend.

## Testing Strategy

### Validation Approach

Duas fases. Como o código atual JÁ está corrigido e o git não tem commits (não há versão original para `git stash` ou `git show`), a fase exploratória não pode falhar contra `src/`. Ela é feita contra CÓPIAS TEMPORÁRIAS de `src/` com o defeito reintroduzido, criadas fora do repositório e apagadas ao final. Depois, os mesmos testes rodam contra `src/` atual (devem passar).

Os testes ficam em `backend/test/` e rodam com `node --test` em `backend/` (script `teste` de `package.json`). Sem dependência nova: o Node 20+ traz `node:test` e `node:assert`. Para propriedades, usar um gerador pseudoaleatório de semente fixa (reprodutível) e dezenas de iterações.

**Estado dos testes (verificado ao rodar `node --test` em `backend/`):** 41 testes passando em 4 arquivos.

| Arquivo | Cobre |
|---|---|
| `store.test.js` | identidade após recarga, `salvarLogo` atômico, ida e volta com semente fixa, restart real em dois processos (consentimento), `salvar()` após `salvarLogo`, arquivo ausente/vazio/inválido, campo com tipo errado, ids como `constructor`, limite de eventos e `EVENTOS_MAX`, formato do arquivo |
| `vitrine-saude.test.js` | sem consentimento (texto genérico), com consentimento, origem não sensível, consentimento revogado |
| `consentimento-acessibilidade.test.js` | independência saúde e acessibilidade, revogação, origem 299 só com o consentimento dela, registros antigos como saúde, finalidade inválida, convite igual para todos, rotas da API |
| `api.test.js` | rotas `/dados/...` e `/recomendacao/:id`, personas oficiais, jornada ponta a ponta, eventos |

**Isolamento.**
- `DATA_DIR` aponta para uma pasta temporária (`fs.mkdtemp`) definida ANTES do import dinâmico de `store.js`, porque `carga.js` lê a variável na carga do módulo. Os testes nunca tocam em `backend/data/estado.json` real.
- Para a vitrine, os testes não carregam os CSVs (o `visitas_sem_login.csv` tem cerca de 157 MB). Preenchem `dados.cidadaos`, `dados.historico` e `dados.servicos` com fixtures pequenas e passam um objeto `derivados` falso (`proximo`, `populares`, `demanda`, `semana_ref`).
- Para um restart real, um teste usa `child_process.spawnSync(process.execPath, [...])` com o mesmo `DATA_DIR`, em dois processos: o primeiro grava, o segundo lê.

### Exploratory Bug Condition Checking

**Goal**: Mostrar os contraexemplos no código COM o defeito e confirmar ou refutar a causa raiz.

**Test Plan**: Rodar os testes abaixo contra as cópias temporárias com defeito. Todos devem FALHAR lá e PASSAR em `src/` atual.

**Test Cases**:
1. **Identidade após recarga**: gravar um `estado.json` com um consentimento, chamar `carregarEstado()` e conferir `consentimentos[id]`. Na cópia com defeito fica `undefined` (existe no `store.test.js`).
2. **Gravação reflete a memória**: `registrarDecisao(id, 'concedido')`, depois `salvarLogo()`, e ler o arquivo. Na cópia com defeito o arquivo continua vazio (existe).
3. **Restart real em dois processos**: processo A concede e chama `salvarLogo()`; processo B chama `carregarEstado()` e consulta `statusConsentimento`. Na cópia com defeito: `pendente` (existe para consentimento; **verificação**: acrescentar jornada e evento).
4. **Timer após `salvarLogo`**: `registrarEvento`, `salvarLogo()`, novo `registrarEvento`, esperar mais de 500 ms e ler o arquivo. Na cópia com defeito o segundo evento não é gravado (existe).
5. **Limite de eventos**: registrar 5001 eventos e conferir que há 5001. Na cópia com defeito: 5000 (existe).
6. **Vazamento no motivo (saúde)**: cidadão sem consentimento, histórico com serviço sensível e `proximo` apontando para um destino não sensível. Nenhum `motivo` contém o nome (existe com o serviço 283; **verificação**: acrescentar a fixture da persona C036462 com o serviço 892).
7. **Vazamento em `outros_motivos`**: mesma fixture, com o destino também vindo de regra de perfil, para o texto de histórico cair em `outros_motivos` (**verificação**; depende da fixture).
8. **Independência das categorias**: consentimento de saúde sem o de acessibilidade com origem 299, e o inverso com origem 892, ficam genéricos (299 existe no `consentimento-acessibilidade.test.js`; **verificação**: confirmar os dois sentidos e o serviço 271, que está nas duas categorias).

**Expected Counterexamples**:
- `consentimentos[id]` indefinido após a recarga; `estado.json` com `{}` mesmo depois de gravações.
- Motivo contendo `Quem acessou "Atendimento online Atende Gestante"`.
- Possíveis causas se algum teste NÃO falhar na cópia com defeito: o teste não importa o mesmo módulo que o código usa, `DATA_DIR` foi definido tarde demais, ou a fixture não gera a transição esperada. Se a hipótese for refutada, reavaliar a causa raiz.

### Fix Checking

**Goal**: Para toda entrada com a condição de defeito, a função corrigida produz o comportamento esperado.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition_Persistencia(X) DO
  carregarEstado'(X)
  ASSERT consentimentos == X.arquivoEstado.consentimentos
         AND jornadas == X.arquivoEstado.jornadas
         AND eventos == X.arquivoEstado.eventos
  mutar(X); salvarLogo'()
  ASSERT lerArquivo() deepEquals {consentimentos, jornadas, eventos}
  ASSERT identidade(consentimentos) == identidadeAntesDeCarregar
END FOR

FOR ALL X WHERE isBugCondition_Eventos(X) AND X.eventosRegistrados <= limiteEventos() DO
  ASSERT eventos.length == X.eventosRegistrados
END FOR

FOR ALL X WHERE isBugCondition_Saude(X) DO
  result := montarVitrine'(X.cidadao, X.derivados)
  ASSERT NOT (origem.nome IN result.itens[*].motivo)
  ASSERT NOT (origem.nome IN result.itens[*].outros_motivos)
END FOR
```

### Preservation Checking

**Goal**: Para toda entrada sem a condição de defeito, o código corrigido produz o mesmo resultado do original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT originalFunction(X) = fixedFunction(X)
END FOR
```

**Testing Approach**: Property-based testing, porque gera muitos casos e acha bordas que testes manuais deixam passar.

**Test Plan**: Sem commit anterior, observar o comportamento no código atual para entradas fora do defeito e fixar o resultado. Para a vitrine, comparar também com a cópia com defeito: fora da bug condition, as duas versões devem dar o mesmo resultado.

**Test Cases**:
1. **Primeira execução**: arquivo ausente, vazio, com JSON inválido e com formato errado (por exemplo, `eventos` como objeto) inicia com estado vazio sem lançar erro (existe).
2. **Vitrine com consentimento**: o motivo mantém o nome da origem sensível e o restante da lista é idêntico (existe em parte).
3. **Origem não sensível**: com e sem consentimento, o texto "Quem acessou ..." mantém o nome (existe).
4. **Sensível não sugerido**: sem consentimento, nenhum item é sensível (**verificação**: asserção explícita sobre todos os itens, com 283 e 892).
5. **Motivo "repetir" e ordem**: `Você acessou este serviço em DD/MM/AAAA. Continue de onde parou.`, ordem, diversidade (no máximo 2 do mesmo órgão nos 5 primeiros) e serviço novo garantido iguais em cidadãos sem origem sensível (**verificação**).
6. **Formato do arquivo e privacidade**: o JSON gravado tem só as chaves `consentimentos`, `jornadas`, `eventos`, e os registros de consentimento não ganham campos novos (existe).

### Unit Tests

- `carregarEstado`: arquivo válido, ausente, vazio, JSON inválido, campos com tipo errado; identidade das referências mantida.
- `salvarLogo`: grava atomicamente (sem `.tmp` sobrando) e zera o timer; `salvar` reagenda depois.
- `registrarEvento`: respeita `EVENTOS_MAX`, valor inválido usa o padrão 50000, descarta os mais antigos acima do limite, aviso único.
- `registrarDecisao` seguido de recarga: `statusConsentimento` e `historicoConsentimento` (com data) voltam corretos (4.6).
- `montarVitrine`: texto genérico por categoria; nome mantido com consentimento da categoria ou origem não sensível.

### Property-Based Tests

- Gerar (semente fixa) estados aleatórios de consentimento, jornadas e eventos, gravar com `salvarLogo`, recarregar com `carregarEstado` e verificar igualdade profunda (ida e volta; existe).
- Gerar sequências de N eventos (N até o limite) e verificar que todos são preservados e em ordem.
- Gerar históricos aleatórios (com e sem serviços sensíveis das duas categorias) e consentimentos aleatórios; verificar que, sem o consentimento da categoria da origem, nenhum texto da vitrine contém o nome dela; com consentimento ou origem não sensível, a vitrine é idêntica à de referência (**verificação**).

### Integration Tests

Rotas reais (de `api/rotas-dados.js` e `api/rotas-recomendacao.js`), criadas por `criarApp` de `api/app.js`:

- `POST /dados/consentimentos/{id}` concede, `salvarLogo`, novo processo carrega, `GET /dados/consentimentos/{id}` e `GET /recomendacao/{id}` mostram o consentimento ativo.
- `POST /dados/jornadas`, `salvarLogo`, restart, `GET /dados/cidadaos/{id}/jornadas` lista a jornada em andamento e um novo `POST /dados/jornadas` retoma a mesma.
- `POST /dados/eventos` seguido de restart e `GET /dados/eventos/resumo` com os totais anteriores.
- Fluxo de saúde ponta a ponta: C036462, sem consentimento, com 892 no histórico, vê texto genérico; após conceder saúde, a mesma vitrine mostra o nome da origem.
