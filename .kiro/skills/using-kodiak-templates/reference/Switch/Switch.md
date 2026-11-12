# Switch

**uiKit:** nenhum.

## Quando usar

Use o `Switch` quando a próxima tela depende de **uma condição avaliada em tempo de execução** — dados de request, parâmetros de contexto, resposta de um endpoint, etc. Ele não renderiza UI: avalia `__cases` em ordem, executa o primeiro cujo `condition` for verdadeiro e navega para a próxima `configName`. Se nenhum caso casar, usa `__defaultCase`.

Casos típicos:

- Bifurcar o fluxo após um request (sucesso → tela A, erro de negócio → tela B).
- Chamar API's: é uma boa prática colocar as __requests no switch ao invés de deixar diretamente na tela

Use `__requests` no próprio Switch quando precisar disparar chamadas HTTP antes de avaliar as condições.

### Layout visual

**Não renderiza UI.** O usuário nunca vê a tela do Switch — ele é um nó de roteamento no diagrama do Kodiak. Enquanto avalia `__cases`/`__requests`, o usuário vê apenas a tela de loading padrão do fluxo anterior.

## Estrutura (wrapper padrão)

Como todo template, o Switch tem o wrapper raiz `configName / description / parameters`. O que é específico dele está em `parameters`:

| Campo | Obrigatório | Descrição |
|---|---|---|
| `__cases` | recomendado, mas pode ter somente o __defaultCase | Lista ordenada de casos. O primeiro `condition` verdadeiro vence. |
| `__defaultCase` | recomendado | Fallback quando nenhum `__cases[i].condition` casar. |
| `__requests` | opcional | Requests HTTP disparados antes da avaliação. |

### `__cases[i]`

| Campo | Tipo | Descrição |
|---|---|---|
| `alias` | string | Rótulo exibido no diagrama do Kodiak. |
| `condition` | string | Expressão Kodiak entre `${}`` avaliada como booleano. |
| `configName` | string | `configName` da próxima tela caso a condição case. |
| `configParams` | object | Parâmetros que sobrescrevem a config de destino. |
| `contextParams` | object | Parâmetros injetados no contexto global para próximas telas. |

### `__defaultCase`

Mesma estrutura dos cases, **sem** `condition`.

### `__requests[i]`

| Campo | Tipo | Descrição |
|---|---|---|
| `alias` | string | Nome usado para referenciar a resposta (`alias.response.*`). |
| `url` | string | Endpoint. |
| `method` | enum `POST / GET / PUT / DELETE` | Método HTTP. |
| `params` | object | Body/query. |
| `customHeaders` | object | Headers adicionais. |
| `isSensitive` | boolean | Marca dados sensíveis. |

## Dicas

- Mantenha a ordem dos `__cases` do mais específico para o mais genérico.
- Use `alias` descritivo — aparece no diagrama do Kodiak.
