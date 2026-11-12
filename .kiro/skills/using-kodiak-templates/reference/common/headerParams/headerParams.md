# headerParams

**Header nativo da tela** — a barra azul no topo (title + voltar + botões direito + toolbar opcional). É o que define o que aparece **acima** do conteúdo do template. Para título de conteúdo interno (abaixo do header), use `screenHeader`.

## Estrutura

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título exibido no header. |
| `canGoBack` | string (`"true"` / `"false"`) | Mostra/oculta o botão de voltar. Default `"true"`. |
| `androidPreventGoBack` | string (`"true"` / `"false"`) | Impede o botão físico Android de voltar quando `canGoBack` for `"false"`. Default `"false"`. |
| `closeAction` | action | Sobrescreve a ação do botão Fechar (normalmente para fechar o fluxo inteiro). Ver `reference/common/action/action.md`. |
| `rightButtons` | array | Até N ícones à direita (ver abaixo). |
| `toolbar` | object | Toolbar adicional com campo de busca ou botões (ver abaixo). |

### `rightButtons[i]`

| Campo | Tipo | Descrição |
|---|---|---|
| `icon` | string | Nome do ícone DLS. |
| `accessibilityLabel` | string | Descrição para leitores de tela. |
| `badgeProps` | object | Badge no ícone (`label`, `showAllNumberDigits`). |
| `action` | action | Ação disparada ao tocar. |

### `toolbar`

| Campo | Tipo | Descrição |
|---|---|---|
| `shouldShowSearchField` | boolean | Ativa a toolbar com campo de pesquisa. |
| `searchField.placeholder` | string | Placeholder do input. |
| `searchField.type` | enum `action / search` | `action` dispara um `action`; `search` salva o texto digitado numa variável. |
| `searchField.action` | action | (Quando `type: action`) ação disparada. |
| `searchField.variableName` | string | (Quando `type: search`) nome da variável onde o termo é salvo (default `searchResult`). |
| `rightButtons` | array | Até 2 ícones adicionais dentro da toolbar. |

## Dicas

- `canGoBack` e `androidPreventGoBack` são **string** (`"true"`/`"false"`), não boolean — isso permite bindings dinâmicos como `"${config.allowBack}"`.
- Se precisa apenas de "tela sem header" (fullscreen), omita `headerParams` ou envie apenas `canGoBack: "false"`.
- Para o título do **conteúdo** (abaixo da barra nativa), use `screenHeader.title`, não `headerParams.title`.
