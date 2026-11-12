# GridDLS

**uiKit:** `dls`

## Quando usar

Tela com **grade de cards (2 ou 3 colunas) com imagens**, opcionalmente com uma barra de saldo no topo e/ou um carrossel de imagens. Pensado para telas de hub/atalhos visuais e catálogos simples.

Casos típicos:
- Hub de produtos/atalhos com ícones/ilustrações ("Meus cartões", "Investir", "Seguros"…).
- Tela principal com saldo no topo e quick actions em grid.
- Catálogo visual (substituto de `Catalog` / `CatalogPlus`).

Substituto DLS dos antigos `Grid`, `BalanceImageCarroussel`, `TabImageCarrossel`.

### Layout visual

De cima para baixo: **(1) balance** — caixa cinza com `Description / Label do link` em dois lados (`left` e `right`). **(2) carousel** — carrossel horizontal de cards grandes, cada um com imagem de fundo, badge "Label" amarelo no canto e `Lorem ipsum... / Lorem... adipiscing elit.` embaixo, com dots de paginação. **(3) grid** — grade 2×N de cards menores com a mesma estrutura (imagem + badge + título + descrição). Scroll vertical da grade principal.

Quando **não** usar:
- Lista vertical em linhas → `ListDLS`.
- Conteúdo mais rico com textos longos e widgets misturados → `CentralDLS`.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `balanceWidgetProps` | object | Barra de saldo no topo (opcional). |
| `carouselCardImagesWidgetProps` | object | Carrossel de cards com imagens (opcional). |
| `gridWidgetProps` | object | Grid principal da tela. |

### `balanceWidgetProps`

Tem `left` e `right`, cada um com `label`, `description`, `color` (enum: `""`, `blue`, `red` — padrão azul), `action` e `__transformations`. Use para exibir saldo/contexto com dois lados.

### `carouselCardImagesWidgetProps`

| Campo | Tipo | Descrição |
|---|---|---|
| `items` | array | Cards do carrossel (imagem, texto, ação). |
| `__iterables` | array | Popula `items` dinamicamente. |

### `gridWidgetProps`

| Campo | Tipo | Descrição |
|---|---|---|
| `gridType` | enum `cardImage / cardProduct` | Tipo do card (`cardImage` = card simples com imagem; `cardProduct` = card com produto/valor). |
| `numColumns` | string (`"2"` ou `"3"`) | Número de colunas (default: 2). |
| `items` | array | Itens do grid (imagem, textos, ação). |

## Dicas

- Se só precisa do grid, configure `gridWidgetProps` e ignore os outros dois campos.
- `numColumns: "3"` funciona melhor com imagens quadradas / ícones.
