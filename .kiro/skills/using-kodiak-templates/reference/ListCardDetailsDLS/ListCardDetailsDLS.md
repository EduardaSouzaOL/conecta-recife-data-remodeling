# ListCardDetailsDLS

**uiKit:** `dls`

## Quando usar

Tela com **um card de ícone + descrição + grupo de botões de seleção + lista de linhas de conteúdo**. Híbrido entre `CardDetailDLS` e `ListDLS` — pense em "detalhe com um filtro de seleção que muda a lista abaixo".

Casos típicos:
- Detalhes com ícone e um seletor de tipo/categoria + lista filtrada.
- Tela que consolida uma escolha (via `selectButtons`) com uma lista de resultados.
- Detalhamento de perfil/produto com abas simples (select buttons) e linhas.

Quando **não** usar:
- Sem seleção / filtro → `CardInfoResumedDLS` ou `ListDLS`.
- Formulário completo → `FormDLS`.
- Muitos widgets visuais (hero, gráfico) → `CardDetailDLS`.

### Layout visual

De cima para baixo: **(1) selectButtons** — fileira horizontal de chips "Opção" (ativo em amarelo, demais em borda azul). **(2) cardIcon** — card cinza com ícone azul no canto superior esquerdo, `Title` em azul, `Label` bold e `Description` cinza. **(3) contentLines** — seção "Seção" com parágrafo curto e linhas `Label` empilhadas, com separadores finos, sem valores à direita. Os chips filtram o que aparece na lista abaixo.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `cardIconWidgetProps` | object | Card de destaque com ícone, label e descrição. |
| `selectButtonsItemProps` | object | Grupo de botões de seleção (filtra a lista). |
| `contentLinesProps` | array | Linhas de conteúdo exibidas abaixo. |
| `__iterables` | array | Popula `contentLinesProps` dinamicamente. |

### `cardIconWidgetProps`

| Campo | Tipo | Descrição |
|---|---|---|
| `icon` | string | Nome do ícone DLS (usa o widget `selectDLSIcon`). |
| `label` | string | Rótulo do card. |
| `description` | string | Texto descritivo. |

### `selectButtonsItemProps`

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string | Nome da variável que recebe a seleção. |
| `label` | string | Rótulo do grupo. |
| `options` | array | Opções com `value` / `label`. |
| `multiple` | boolean | Permite múltipla seleção. |
| `alwaysSelected` | boolean | Exige ao menos 1 selecionada. |

### `contentLinesProps[i]`

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título da seção. |
| `description` | string | Descrição da seção. |
| `items` | array | Linhas (formato do `ListDLS`). |

## Dicas

- Use `__iterables` em `contentLinesProps` junto com o `name` do `selectButtonsItemProps` para re-popular a lista conforme a seleção.
