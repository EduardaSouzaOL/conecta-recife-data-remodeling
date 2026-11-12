# Cart

**uiKit:** `dls`

## Quando usar

Tela de **carrinho / seleção de itens com quantidade e total**. Apresenta uma ou mais listagens de produtos, permite ajustar quantidade por item, e mostra uma barra de total (por padrão, no topo da área dos botões).

Casos típicos:
- Carrinho de produtos (recarga, compra, presentes).
- Seleção de quantidade de itens antes do checkout.

A lista resultante é persistida em uma variável global (por padrão `globalCart`) acessível nas telas seguintes via expressão — ideal para usar em conjunto com `Switch`/`Receipt` depois.

Quando **não** usar:
- Lista de itens sem quantidade / valor → `ListDLS`.
- Seleção única de item (picker) → `ItemPickerDLS`.

### Layout visual

Cada item do carrinho ocupa 2 linhas: na **linha superior** uma thumbnail quadrada à esquerda, `Label` bold + `Description` cinza no centro, e um ícone de ação à direita (favoritar/remover). Na **linha inferior** um `numberField` com controles `-` / `00` / `+` à esquerda e `R$ 0,00` à direita (valor calculado). Itens se empilham verticalmente. Footer amarelo com CTA ("AÇÃO PRIMÁRIA") — barra de total aparece acima dos botões quando `hideTotalBar` é false.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `products` | array | Uma ou mais listagens (ver abaixo). |
| `globalVariable` | string | Nome da variável global que armazena os itens selecionados (default: `globalCart`). Acessível via `${nome}` nas próximas telas. |
| `hideTotalBar` | boolean | Se `true`, oculta a barra de total acima dos botões. |
| `currencyType` | enum | Moeda exibida. Aceita códigos BR/US/EU/JP/CN (ex.: `brl`, `usd`, `eur`, `jpy`) em versão com símbolo ou `*-code`, e `percentage`. |
| `__iterables` | array | Popula `products` dinamicamente. |
| `__transformations` | array | Formatadores aplicados aos campos. |

### `products[i]`

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título da listagem. |
| `productList` | array | Itens da listagem (ver abaixo). |

### `products[i].productList[j]`

| Campo | Tipo | Descrição |
|---|---|---|
| `image` | object | Imagem do item (`base64`, `uri`, `cache`, etc.). |
| `mainLabel` | string | Texto principal. |
| `description` | string | Descrição secundária. |
| `numberFieldOptions` | object | Campo de valor/quantidade (mín/máx, passo, moeda, valor inicial). |
| `actionLineCustomization` | object | Customização visual da linha de ação. |
| `itemAction` | object | Ação disparada ao tocar no item. |

### Dica sobre `globalVariable`

Cada item do carrinho expõe `id`, `name`, `value`, `multiplyValueInternal` e `rightComponent` — acesse-os nas próximas telas com `${globalCart[0].value}` por exemplo.
