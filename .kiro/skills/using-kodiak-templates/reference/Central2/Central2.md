# Central2

**uiKit:** `dls`

## Quando usar

Tela **hub versátil**, com múltiplas seções empilhadas de tipos variados: acesso rápido com ícones, cards selecionáveis (filtros), gráficos, carrosséis de imagens/cards e listas de conteúdo. Pensado para uma "central" de fluxo que organiza e integra diferentes áreas do serviço.

Casos típicos:
- Hub principal de um domínio do app (ex.: pagamentos, investimentos, cartões).
- Tela de entrada com quick actions + filtros + conteúdo dinâmico.
- Central de serviços com gráfico de desempenho + lista de operações.

### Layout visual

De cima para baixo: seções empilhadas verticalmente, cada uma com tipo de conteúdo independente. Cada seção pode ter título com prefixo de ícone e sufixo de link/botão. As seções suportam: **(1) Acesso rápido** — grid ou carrossel de Icon Actions + campo de texto com botão e botões de preenchimento rápido. **(2) Cards selecionáveis** — Selectable Cards do tipo Compact ou Imagem Only Horizontal, funcionando como filtro. **(3) Gráfico** — Line Chart encapsulado em Card Content. **(4) Carrosséis** — carrossel de imagens, cards de imagem, cards de produto, info cards ou cards de ícones. **(5) Listas** — Card Lists com Content-Lines, tabs e rodapé de lista. **(6) Listas com Checkbox** — mesmo formato das Listas, com suporte a checkbox.

Quando **não** usar:
- Apenas uma grade de cards de ícones → `CentralDLS` (mais direto).
- Tela transacional (formulário, confirmação) → `ListDLS` ou template transacional.
- Tela de detalhe de um único produto → `CardDetailDLS`.

## `headerParams` — props exclusivas do Central2

Além dos campos comuns de header (`title`, `canGoBack`, `rightButtons`, etc. — ver `reference/common/headerParams/headerParams.md`), o Central2 adiciona **dois blocos próprios que só existem neste template**: `contentBar` e `concierge`. Ambos ficam dentro de `headerParams` e são renderizados na área expandida do header (logo abaixo do título da barra nativa), funcionando como um "resumo/destaque" da central antes do conteúdo das seções.

### `headerParams.contentBar`

**Para que serve:** é uma barra de destaque no topo da tela usada para resumir a informação principal da central — por exemplo o saldo/valor de um domínio (cartão, conta, investimento) e/ou linhas de indicadores. É um **array**; cada item é um bloco independente cujo formato é definido por `itemType`.

| Campo | Tipo | Descrição |
|---|---|---|
| `itemType` | string | Tipo do bloco: `"bigNumber"` (valor em destaque) ou `"tabularLine"` (linha rótulo + valor). Define quais campos são lidos. |
| `labelTitle` | object | Rótulo do bloco. `mode` (`"vertical"`/`"horizontal"`), `prefixIcon.name` (ícone DLS), `title`, `description`. |
| `buttonList` | array | Botões de ação associados ao bloco. Cada item: `title`, `iconProps.name` (opcional), `chevron` (bool), `action`. |

#### `itemType: "bigNumber"` — valor em destaque

Mostra um número grande formatado (ex.: saldo). Os campos ficam no objeto `bigNumber`:

| Campo | Tipo | Descrição |
|---|---|---|
| `value` | string | Valor numérico (string, permite binding dinâmico). |
| `formatType` | string | Formatação aplicada ao valor, ex.: `"BRL"`. |
| `precision` | number | Casas decimais. |
| `operator` | boolean | Exibe sinal de operador (+/−) conforme o valor. |
| `size` | string | Token de tamanho da tipografia, ex.: `"xHugeBd"`. |
| `color` | string | Token de cor, ex.: `"onHighlightDefault"`. |

#### `itemType: "tabularLine"` — linha rótulo + valor

Linha de indicador (rótulo à esquerda, valor à direita), com avatar e barra de progresso opcionais. Os campos ficam no objeto `tabularLine`:

| Campo | Tipo | Descrição |
|---|---|---|
| `label` | string | Rótulo da linha. |
| `value` | object | Valor exibido: `data` (texto) e `status` (`"default"`, `"positive"`, `"negative"`). |
| `inverted` | boolean | Inverte a disposição rótulo/valor. |
| `prefixAvatarProps` | object | Avatar à esquerda (`name` com as iniciais). |
| `progressBarOnHighlight` | object | Barra de progresso: `value`, `type` (ex.: `"highlight-primary"`), `mode`, `label` (bool), `state`. |
| `action` | action | Ação ao tocar na linha. |
| `accessibilityContext` | string | Contexto para leitores de tela. |

### `headerParams.concierge`

**Para que serve:** é um item de atalho/assistência ("concierge") fixado no header, abaixo da `contentBar`. Funciona como uma linha de navegação destacada — tipicamente para levar o usuário a um assistente, ajuda ou ação principal do domínio.

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | string | Tipo do concierge. Ex.: `"navigation"` (linha de navegação). |
| `navigationProps` | object | Configuração da linha de navegação (quando `type: "navigation"`). |
| `navigationProps.label` | string | Texto principal. |
| `navigationProps.description` | string | Texto descritivo/secundário. |
| `navigationProps.value` | string | Valor exibido à direita. |
| `navigationProps.prefixIconProps` | object | Ícone à esquerda (`name`). |
| `navigationProps.chevron` | boolean | Exibe o chevron de navegação à direita. |
| `navigationProps.action` | action | Ação disparada ao tocar. |

## `templateParams`

A estrutura central é o campo `sessoes`, um array onde cada item define uma seção da tela com um `groupType` específico.

| Campo | Tipo | Descrição |
|---|---|---|
| `sessoes` | array | Lista de seções da tela. Cada item define um bloco de conteúdo independente. |
| `sessionTitleSpacing` | string | Espaçamento das margens dos títulos: `"central"` (40px, padrão) ou `"transactional"` (32px). |
| `__iterables` | array | Iteráveis para popular sessões dinamicamente. |

### Estrutura de cada sessão (`sessoes[].sessionItemConfig`)

Cada sessão possui um `groupType` que define o tipo e os campos disponíveis:

| `groupType` | Tipo de conteúdo |
|---|---|
| `"quickAccess"` | Acesso rápido |
| `"selectableCards"` | Cards selecionáveis |
| `"chart"` | Gráfico |
| `"caroussel"` | Carrosséis |
| `"lists"` | Listas |
| `"checkboxLists"` | Listas com Checkbox |

---

### `groupType: "quickAccess"` — Acesso rápido

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título da seção. |
| `description` | string | Descrição interna da seção. |
| `titlePrefix` | object | Prefixo do título com `iconProps.name` (ícone DLS). |
| `titleSuffix` | object | Sufixo do título com link/botão (`name`, `config.action`). |
| `actionItemsPresentationType` | string | Forma de exibição dos Icon Actions: `"grid"` ou `"scroll"` (carrossel). |
| `quickAccessIcons` | array | Lista de Icon Actions. Cada item aceita: `label`, `iconProps.name`, `action`, `badgeProps`, `disabled`, `neutral`, `accessibilityLabel`. |
| `quickAccessFormField` | object | Campo de texto com botão e preenchimento rápido. Ver detalhes abaixo. |
| `__iterables` | array | Iteráveis para popular `quickAccessIcons` dinamicamente. |

#### `quickAccessFormField`

| Campo | Tipo | Descrição |
|---|---|---|
| `enableTextField` | string | `"true"` para habilitar o campo de texto. |
| `textFieldConfig` | object | Configuração do campo: `hint` (placeholder), `varName` (variável de saída). |
| `buttonConfig` | object | Botão ao lado do campo: `labelEmpty` (rótulo vazio), `labelFilled` (rótulo preenchido), `action`. |
| `autoFillButtons` | array | Botões de preenchimento rápido. Cada item: `label`, `internalValue`. |

---

### `groupType: "selectableCards"` — Cards selecionáveis

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título da seção. |
| `description` | string | Descrição da seção. |
| `titlePrefix` | object | Prefixo do título com `iconProps.name`. |
| `titleSuffix` | object | Sufixo do título com link/botão. |
| `varName` | string | Nome da variável que armazena o ID do card selecionado. |
| `selectedCardId` | string | ID do card selecionado (use expressão: `"${varName}"`). |
| `action` | object | Ação disparada ao selecionar um card. |
| `cards` | array | Lista de cards. Cada item: `id`, `title`, `description`, `value`, `status` (`default`, `positive`, `negative`). |
| `__iterables` | array | Iteráveis para popular `cards` dinamicamente. |

> Apenas as variações **Compact** e **Imagem Only Horizontal** são aceitas. A propriedade de erro não deve ser usada.

---

### `groupType: "chart"` — Gráfico

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título da seção. |
| `description` | string | Descrição da seção. |
| `titlePrefix` | object | Prefixo do título com `iconProps.name`. |
| `titleSuffix` | object | Sufixo do título com link/botão. |
| `chartConfig` | object | Configuração do gráfico. Ver detalhes abaixo. |

#### `chartConfig`

| Campo | Tipo | Descrição |
|---|---|---|
| `chartType` | string | Tipo de gráfico (ex.: `"line"`). |
| `chartProps` | object | Propriedades do gráfico: `title`, `description`, `DATASETS[]`, `showTotalValue`, `showTrend`. |

---

### `groupType: "caroussel"` — Carrosséis

Cada item do array `carouselItems` define uma sub-seção com seu próprio carrossel.

| Campo | Tipo | Descrição |
|---|---|---|
| `carouselItems` | array | Lista de sub-seções com carrossel. |
| `__iterables` | array | Iteráveis para popular `carouselItems` dinamicamente. |

#### Cada `carouselItems[]`

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título da sub-seção. |
| `description` | string | Descrição da sub-seção. |
| `titlePrefix` | object | Prefixo do título com `iconProps.name`. |
| `titleSuffix` | object | Sufixo do título com link/botão. |
| `carouselConfig.carouselType` | string | Tipo de carrossel (ver tabela abaixo). |

#### Tipos de carrossel (`carouselType`)

| Valor | Descrição |
|---|---|
| `"imageCarousel"` | Carrossel de imagens |
| `"cardImages"` | Cards de imagens |
| `"cardProductImages"` | Cards de produto |
| `"infoCardCarousel"` | Carrossel de Info Cards |
| `"carouselCardIcons"` | Carrossel de ícones |

---

### `groupType: "lists"` — Listas

Cada item do array `listItems` define uma sub-seção com uma lista de Content-Lines.

| Campo | Tipo | Descrição |
|---|---|---|
| `listItems` | array | Lista de sub-seções de lista. |
| `__iterables` | array | Iteráveis para popular `listItems` dinamicamente. |

#### Cada `listItems[]`

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título da sub-seção. |
| `description` | string | Descrição da sub-seção. |
| `titlePrefix` | object | Prefixo do título com `iconProps.name`. |
| `titleSuffix` | object | Sufixo do título com link/botão. |
| `tabsConfig` | object | Configuração de abas (Tabs) da sub-seção. |
| `items` | array | Content-Lines da lista. |
| `bottomConfig` | object | Rodapé da lista (link de navegação ou botões). |
| `__iterables` | array | Iteráveis para popular os itens da lista. |

---

### `groupType: "checkboxLists"` — Listas com Checkbox

Mesma estrutura de `lists`, com suporte a checkboxes nos itens.


## Dicas

- Use `titlePrefix` com ícone e `titleSuffix` com link para enriquecer os cabeçalhos de cada seção.
- No `quickAccess`, prefira `"scroll"` quando houver mais de 6 ícones; use `"grid"` para até 8 ícones dispostos em até 2 fileiras de 4.
- Para filtrar conteúdo de listas ou carrosséis, combine `selectableCards` + `__iterables` nas seções dependentes com expressão no datasource.
- Não use múltiplos tipos de Content-Lines na mesma sub-seção de lista — mantenha consistência de tipo e prefixo.
- Não combine botão primário no `infoCard` do rodapé interno com botão primário no `footerParams` — use apenas um botão primário na tela.
- Use a URL: https://www.bb.com.br/docs/pub/IDC/AppPJ/ebook_ligapj_kodiak-mulheres_de_sucesso.png para preencher imagens no template.
- Este template não possui a propriedade `screenHeader`.
