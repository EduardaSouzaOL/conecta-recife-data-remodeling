# CentralDLS

**uiKit:** `dls`

## Quando usar

Tela **hub rico**, com múltiplos widgets empilhados: saldo + cards de ícones, carrossel de imagens, cards de produtos, linhas de conteúdo. Pensado para uma tela "central" que apresenta várias opções/produtos de uma área.

Casos típicos:
- Home/hub de uma área do app (ex.: "Investimentos", "Cartões", "Seguros").
- Tela de relacionamento com comunicação + produtos + quick actions.
- Tela pós-login com saldo + quick actions + oportunidades.

Substituto DLS dos antigos `BalanceImageCarroussel`, `TabImageCarrossel`, `Catalog`, `CatalogPlus`.

### Layout visual

De cima para baixo: **(1) banner/balance** — caixa cinza com `Description / Label do link` nos dois lados. **(2) cardIcons** — row de **cards menores** com ícone + `Label` bold + `Description`, com "Saber mais >" abaixo. **(3) imageCarousel** — carrossel de banners com imagens grandes e dots de paginação. **(4) contentLines/bottomCards** — `Título do widget` bold + parágrafo cinza + carrossel horizontal de cards com imagem e badge amarelo "Label". Rolagem vertical longa misturando widgets.

Quando **não** usar:
- Só uma grade de cards com imagem → `GridDLS` (mais enxuto).
- Detalhe de um único produto → `CardDetailDLS`.
- Lista vertical → `ListDLS`.

## `templateParams`

Todos os widgets são opcionais — use só o que precisar. A ordem dos campos aqui reflete a ordem aproximada em que são renderizados na tela.

| Campo | Tipo | Descrição |
|---|---|---|
| `balanceCardIconsWidgetProps` | object | Saldo + ícones de atalho no topo. |
| `cardIconsWidgetProps` | object | Cards com ícones (sem saldo). |
| `imageCarouselWidgetProps` | object | Carrossel de imagens/banners. |
| `cardImagesWidgetsProps` | object | Cards com imagens (superior). |
| `cardProductImagesWidgetsProps` | object | Cards de produtos com imagens (superior). |
| `contentLinesWidgetProps` | object | Seção de linhas de conteúdo. |
| `bottomCardImagesWidgetsProps` | object | Cards com imagens (inferior). |
| `bottomCardProductImagesWidgetsProps` | object | Cards de produtos com imagens (inferior). |

### `balanceCardIconsWidgetProps`
`title`, `description`, `balance` (objeto com `left`/`right`, cada um com `label`, `description`, `color` enum `""/blue/red`, `action`), `cards` (objeto com `mode` = `carousel`/`grid`, `numColumns`, `items[]` — cada item tem `label`, `description`, `icon` string, `action`).

### `cardIconsWidgetProps`
`title`, `description`, `cards` (mesmo formato do `balanceCardIconsWidgetProps.cards` — com `mode`, `items[]`).

### `imageCarouselWidgetProps`
`items[]`, `forceFixedHeight` (boolean), `__iterables`.

### `cardImagesWidgetsProps` / `bottomCardImagesWidgetsProps`
`items[]`, `__iterables`.

### `cardProductImagesWidgetsProps` / `bottomCardProductImagesWidgetsProps`
`items[]`, `__iterables` — cards de produto com imagem + preço + ação.

### `contentLinesWidgetProps`
`title`, `description`, `items[]` (linhas no formato do `ListDLS`), `button`.

## Dicas

- Use `bottom*` para posicionar cards no fim da tela (depois das linhas de conteúdo).
- Combine `balanceCardIconsWidgetProps` no topo com `contentLinesWidgetProps` embaixo para um "hub" completo.
- Para telas com **só** uma grade, `GridDLS` é mais simples.
