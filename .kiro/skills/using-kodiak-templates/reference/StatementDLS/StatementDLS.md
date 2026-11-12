# StatementDLS

**uiKit:** `dls`

## Quando usar

Tela de **extrato**: combinação de filtros (select, botões de seleção, abas), uma caixa de valor com totalizador, e uma lista de lançamentos buscável. Orientada a dados financeiros.

Casos típicos:
- Extrato de conta, cartão, investimentos.
- Movimentação com filtro por período / tipo / categoria.
- Histórico de transações com busca.

Substituto DLS do antigo `Statement`.

### Layout visual

De cima para baixo: **(1) selectField** — `Input label` + select "Selecione" com seta para baixo. **(2) selectButtons** — fileira horizontal de chips "Option" (o ativo amarelo, os demais com borda azul). **(3) tabs** — barra de abas "TAB LABEL" com a ativa sublinhada em azul. **(4) valueBox** — card cinza centralizado com `Descrição` pequena e `$ Valor` grande em azul. **(5) search** — barra de busca "Pesquisar" com lupa. **(6) lista** — `Seção` bold + linhas `Label / Description 1 / Value + Value / chevron`. Lista geralmente agrupada por data.

Quando **não** usar:
- Lista genérica sem filtros financeiros → `ListDLS`.
- Detalhe de 1 transação → `CardDetailDLS`.
- Comprovante de 1 transação → `ReceiptDLS`.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `selectFieldWidgetProps` | object | Campo de seleção (dropdown) — ex.: escolher período. |
| `selectButtonsWidgetProps` | object | Grupo de botões de seleção (single/multi). |
| `tabsWidgetProps` | object | Abas de navegação (`custom / day / month / year`). |
| `valueBoxWidgetProps` | object | Caixa com valor totalizador no topo. |
| `searchContentLinesWidgetProps` | object | Lista de lançamentos com busca. |

### `selectFieldWidgetProps`
`name`, `label`, `hint`, `selectionLabel`, `optionsList`, `optionsListTitle`, `isVisible`.

### `selectButtonsWidgetProps`
`name`, `label`, `options`, `multiple`, `isVisible`.

### `tabsWidgetProps`

`tabsWidgetProps` tem **apenas a propriedade `type`**, que é um **objeto** contendo o campo `type` (enum) mais os campos dependentes. Todos os campos de configuração ficam **dentro** desse objeto — nunca no nível raiz de `tabsWidgetProps`.

```json
"tabsWidgetProps": {
  "type": {
    "type": "month",
    "startTabValue": "2025-11",
    "endTabValue": "2026-05",
    "initialSelectedTabValue": "2026-05",
    "tabKey": "mesSelecionado"
  }
}
```

> ⚠️ **Armadilha:** Não coloque `startTabValue`, `tabKey` etc. direto em `tabsWidgetProps` — o schema rejeita.

Tipos disponíveis e seus campos exclusivos:

| Valor de `type` | Uso | Campos exclusivos |
|---|---|---|
| `custom` | Abas arbitrárias (definidas manualmente). | `tabArray` (array de `{key, name, tabAction}`), `action`, `initialSelectedTabValue`, `tabKey` |
| `day` | Abas por dia. | `startTabValue` (YYYY-MM-DD), `endTabValue` (YYYY-MM-DD), `initialSelectedTabValue` (YYYY-MM-DD), `tabKey`, `showCustomLastTab`, `calendarTitle` |
| `month` | Abas por mês. | `startTabValue` (YYYY-MM), `endTabValue` (YYYY-MM), `initialSelectedTabValue` (YYYY-MM), `tabKey`, `showCustomLastTab`, `calendarTitle` |
| `year` | Abas por ano. | `startTabValue` (YYYY), `endTabValue` (YYYY), `initialSelectedTabValue` (YYYY), `tabKey`, `showCustomLastTab`, `calendarTitle` |

> ⚠️ **Armadilha:** `tabArray` é exclusivo do tipo `custom`. Não inclua com `month`, `day` ou `year` — o schema rejeita.

### `valueBoxWidgetProps`

| Campo | Tipo | Descrição |
|---|---|---|
| `value` | string | Valor exibido (ex.: "R$ 1.234,56"). |
| `description` | string | Legenda abaixo/ao lado. |
| `valueColorKey` | enum `primary / critical` | Cor do valor (padrão `primary`; `critical` para débitos). |

### `searchContentLinesWidgetProps`

| Campo | Tipo | Descrição |
|---|---|---|
| `contentLinesProps` | array | Linhas de lançamento (mesmo formato do `sectionData` do ListDLS). |
| `searchFieldProps` | object | Configuração do campo de busca. |

#### Armadilhas dos itens de `contentLinesProps`

> ⚠️ **`showDivider` é boolean**, não string. Use `true`/`false`, nunca `"true"`/`"false"`.

> ⚠️ **`coloringAuxiliarLines` tem espaço no início do valor.** O enum correto é `" Em ambos os lados"` (com espaço). Valores válidos: `" Em ambos os lados"`, `"Apenas no texto à esquerda"`, `"Apenas no texto à direita"`.

## Dicas

- Os filtros (select/buttons/tabs) expõem a seleção como variável de contexto (`selectedTabKey`, o `name` do select, etc.) — use-a nos `__iterables` dos lançamentos para filtrar server-side.
- `valueColorKey: critical` para saldos negativos / débitos destacados.
