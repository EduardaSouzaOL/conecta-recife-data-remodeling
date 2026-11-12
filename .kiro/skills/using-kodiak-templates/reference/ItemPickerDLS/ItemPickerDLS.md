# ItemPickerDLS

**uiKit:** `dls`

## Quando usar

Tela de **seleção entre múltiplos itens** (picker), com filtro/busca, cards selecionáveis e/ou linhas de conteúdo. O usuário escolhe um item e segue — a seleção é repassada para a próxima tela.

Casos típicos:
- Escolher um cartão (entre os que o usuário tem).
- Escolher um CEP de retirada.
- Escolher um plano / oferta / produto entre vários.
- Picker de conta de origem/destino.

Quando **não** usar:
- Apenas lista sem seleção (foco em navegação) → `ListDLS`.
- Item com quantidade e total → `Cart`.
- Detalhar 1 item (sem escolher) → `ItemDetails`.

### Layout visual

De cima para baixo: **(1) selectField + filterButton** — `Input label` + select "Selecione" lado a lado com um botão quadrado de filtros avançados (ícone de slider). **(2) selectableCards** — carrossel horizontal de cards selecionáveis com ícone de check/circle, `Label` bold, `Description` em 3 linhas e `Value` embaixo; o card **ativo destaca com borda e fundo azul claro**. **(3) contentLineSection** — abaixo, seção "Seção" com parágrafo e linhas de opção (radio buttons com `Label da opção / Texto de apoio`) e/ou linhas `Label / Value / chevron` para refinar a escolha.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `selectFieldWidgetProps` | object | Select (dropdown) para filtrar/ordenar os itens. |
| `filterButtonProps` | object | Botão de filtros extras (abre sheet com mais filtros). |
| `contentLineSection` | object | Seção de linhas de conteúdo para itens simples. |
| `selectableCards` | object | Cards selecionáveis (opção visual mais rica). |

### `selectFieldWidgetProps`
`name`, `label`, `selectionLabel`, `optionsList`, `optionsListTitle`, `isVisible`.

### `filterButtonProps`
`action`, `filters[]`, `isVisible`.

### `contentLineSection`
Mesma estrutura do `sectionData` do `ListDLS`: `label`, `value`, `icon`, `avatar`, `image`, `status`, `auxiliarLines`, `rightFeatures`, `action`, `verticalSpacing`.

### `selectableCards`

| Campo | Tipo | Descrição |
|---|---|---|
| `items` | array | Cards selecionáveis. |
| `items[i].id` | string | Identificador do item. |
| `items[i].title` | string | Título do card. |
| `items[i].description` | string | Descrição. |
| `items[i].value` | string | Valor principal (ex.: preço). |
| `items[i].status` | string | Status/visual. |
| `items[i].sectionItemsWidgetProps` | array | Linhas de conteúdo dentro do card. |

## Dicas

- Use `selectableCards` quando a escolha precisa comparar visualmente (planos, cartões).
- Use `contentLineSection` para listas "enxutas" com seleção em linha.
- A seleção é passada para a próxima tela via `contextParams` configurado na `action` do item clicado.
