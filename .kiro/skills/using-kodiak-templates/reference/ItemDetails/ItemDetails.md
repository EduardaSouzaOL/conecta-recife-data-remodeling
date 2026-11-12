# ItemDetails

**uiKit:** `dls`

## Quando usar

Tela de **detalhamento rico de um item** (produto, pedido, oferta). Combina imagens, tags, título com favoritar, textos, seções de detalhes, linhas de conteúdo, termos, input de texto e até mini-form — tudo num layout único focado em 1 item.

Casos típicos:
- Detalhe de um produto/oferta antes de contratar.
- Detalhe de um pedido (substitui `OrderDetails` antigo).
- Detalhe de um item (produto) com foto, descrição e CTA.

Substituto DLS dos antigos `OrderDetails` e `ProductDetail`.

### Layout visual

De cima para baixo: **(1) carrossel de imagens** com dots de paginação. **(2) titleAndParagraphLikable** — `title` bold grande + ícone de coração (favoritar) à direita + parágrafo cinza. **(3) tags** — chips coloridos inline ("Label da tag"). **(4) contentLines** — linhas `Conteúdo / Título em destaque / Conteúdo` empilhadas, com variantes de thumbnail à esquerda e chevron à direita. **(5) formSection / textInput** — bloco "Título" com um `Select` ou campos de input embutidos. Footer opcional (ex.: "Contratar").

Quando **não** usar:
- Detalhe simples com card e linhas → `CardDetailDLS`.
- Só linhas de informação → `CardInfoResumedDLS`.
- Formulário completo (sem detalhe/imagem) → `FormDLS`.

## `templateParams`

Todos os widgets ficam dentro de **`templateParams.itemDetailsTemplate`**. São opcionais — use só o que precisar.

| Campo (em `itemDetailsTemplate`) | Tipo | Descrição |
|---|---|---|
| `images` | array | Imagens do item (`uri`, `base64`, `cache`, `accessibilityLabel`). |
| `tags` | array | Tags/badges (cada: `label`, `iconName`, `status`, `style`, `disableIcon`). |
| `titleAndParagraphLikable` | object | Título + parágrafo com botão de favoritar. |
| `captionItem` | object | Pequena legenda (`captionTop`, `title`, `captionBotton`). |
| `contentLines` | array | Linhas de conteúdo (formato do `ListDLS`). |
| `detailsSection` | object | Seção com tipos de detalhe (texto, lista, etc.). |
| `formSection` | object | Seção com mini-formulário embutido (`title`, `formItems`). |
| `termsSection` | array | Seções de termos (cada: `title`, `contentLines`). |
| `textInput` | object | Campo de texto in-line (`name`, `label`, `mask`, `hint`, `infoBox`, etc.). |
| `forceFixedHeight` | boolean | Força altura fixa na área do widget de imagem/cabeçalho. |
| `__iterables` | array | Popula seções dinamicamente. |

### `titleAndParagraphLikable`
`title`, `paragraph`, `enableFavoriteButton` (boolean), `favoriteButtonValue`, `favoriteAction`.

### `contentLines[i]`
Mesmo formato do `ListDLS`: `label`, `value`, `icon`, `avatar`, `image`, `status`, `auxiliarLines`, `rightFeatures`, `action`, `verticalSpacing`. Adicional: `mustSubmit` (marca se a linha deve ser enviada num submit).

### `textInput`
Campo in-line rico: `name`, `label`, `placeholder`, `hint`, `defaultValue`, `mask`, `infoBox`, `infoMessage`, `title`, `useRefresh`, `customFormatData`.

### `formSection`
Mini-form: `title` + `formItems[]` (mesmos tipos do `FormDLS.items`).

## Dicas

- Para detalhe de pedido (antigo `OrderDetails`), use `titleAndParagraphLikable` + `contentLines` + `termsSection`.
- Para detalhe de produto com imagem grande e contratação inline, combine `images` + `titleAndParagraphLikable` + `formSection` + CTA em `footerParams`.
