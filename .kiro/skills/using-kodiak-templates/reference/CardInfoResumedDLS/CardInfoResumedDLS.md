# CardInfoResumedDLS

**uiKit:** `dls`

## Quando usar

Tela com um **card único de informações resumidas em linhas de conteúdo** (`ContentLine` do DLS). Cada linha tem um label à esquerda e valor/ação à direita, com suporte a ícones, avatares, imagens, status e linhas auxiliares.

Casos típicos:
- Resumo de conta / perfil / produto.
- Ficha de dados de uma transação.
- Qualquer visão "chave → valor" em uma única tela.

Substituto DLS do antigo `CardInfoResumed`.

### Layout visual

Um card único ocupa quase toda a largura da tela e contém uma pilha vertical de **linhas de conteúdo**. Cada linha pode ter uma imagem grande (`contentImage`) no topo, abaixo `label` bold + `description` cinza com chevron à direita, e opcionalmente um **link azul** ("Link navigation") abaixo. Várias linhas desse tipo se empilham no mesmo card, separadas por divisores finos. Sem header rico, sem seções externas — tudo dentro de 1 card.

Quando **não** usar:
- Conteúdo com várias seções e widgets diversos (gráfico, texto, imagem) → `CardDetailDLS`.
- Lista de itens (e não linhas de um card) → `ListDLS`.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `sectionItemsWidgetProps` | array | Linhas de conteúdo exibidas no card (ver abaixo). |
| `__iterables` | array | Popula `sectionItemsWidgetProps` dinamicamente. |

### `sectionItemsWidgetProps[i]`

| Campo | Tipo | Descrição |
|---|---|---|
| `label` | string | Texto principal à esquerda. |
| `value` | string | Texto à direita do texto principal. |
| `status` | enum `default / positive / negative` | Cor do `value`: `positive` = azul, `negative` = vermelho. |
| `icon` | object | Ícone à esquerda. |
| `avatar` | object | Avatar no lugar do ícone. |
| `image` | object | Imagem pequena à esquerda. |
| `contentImage` | object | Imagem maior como conteúdo. |
| `auxiliarLines` | array | Linhas extras abaixo do label/value. |
| `rightFeatures` | object | Recursos adicionais à direita (ex.: chevron, chip, status). **Para exibir um valor simples à direita, use `value` em vez de `rightFeatures.description`.** |
| `verticalSpacing` | string | Espaçamento vertical (default: `small`). |
| `action` | object | Ação disparada ao tocar na linha. |
| `button` | object | Botão "Saber mais" exibido na linha. |
| `__transformations` | array | Formatadores aplicados. |
| `__iterables` | array | Popula sub-arrays dinamicamente. |

### Dica

Diferente do `ListDLS`, aqui o "container" é um único card — pense em "uma ficha" em vez de "uma lista".
