# CardDetailDLS

**uiKit:** `dls`

## Quando usar

Tela de **detalhe com múltiplos widgets em um card**: imagem hero OU gráfico, títulos/descrições secundários, texto com links laterais, e uma ou mais seções de linhas de conteúdo. É o template "canivete suíço" para páginas de detalhe.

Casos típicos:
- Detalhe de produto/serviço com hero visual ou gráfico.
- Tela de fundo de investimento (gráfico + dados + CTAs).
- Detalhe de cartão com imagem + ações + linhas.

Substituto DLS dos antigos `CardDetail`, `ImageSectionList`, `ImageRadioGroup`, `ProductsSummary`.

### Layout visual

De cima para baixo: **(1) hero** — imagem grande (`cardImageWidgetProps`) ou gráfico (`chartWidgetProps`). **(2) textBox** — caixa cinza com `label` pequeno, `value/title` em destaque, e dois links laterais lado a lado (ícone + "Label do link"). **(3) secondaryText** — título bold + parágrafo cinza. **(4) sections** — seção com título "Seção" e linhas que podem ser **accordions colapsáveis** ("Title Accordion" com chevron down) ou linhas `label + description + chevron` tradicionais. Footer opcional com CTA.

Quando **não** usar:
- Apenas resumo de dados em linhas, sem hero/gráfico → `CardInfoResumedDLS`.
- Vários cards em grade → `GridDLS` ou `CentralDLS`.
- Lista vertical com seções → `ListDLS`.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `cardImageWidgetProps` | object | Imagem de destaque (hero). **Não use junto com `chartWidgetProps`.** |
| `chartWidgetProps` | object | Gráfico de destaque. **Não use junto com `cardImageWidgetProps`.** |
| `secondaryTextWidgetProps` | object | Bloco de título + descrição secundária. |
| `textBoxWidgetProps` | object | Caixa de texto com `label`, `title`, `leftLink`, `rightLink`. |
| `sectionItemsWidgetProps` | array | Seções de linhas de conteúdo (mesmo formato do `ListDLS.sections`). |
| `__iterables` | array | Popula seções dinamicamente. |

### `cardImageWidgetProps`

| Campo | Tipo | Descrição |
|---|---|---|
| `image` | object | `base64`/`uri`/`shouldTrustServers`/`cache`/`accessibilityLabel`. |
| `aspectRatio` | enum `portrait / square / rounded / wide` | Formato da imagem. |
| `accessibilityLabel` | string | Descrição para leitores de tela. |

### `chartWidgetProps`

`chartConfig` — configuração do gráfico (tipo, séries, eixos).

### `secondaryTextWidgetProps`

`title`, `description`.

### `textBoxWidgetProps`

`label`, `title`, `leftLink`, `rightLink` — caixa de texto com dois links laterais (ex.: "Saiba mais", "Ver detalhes").

### `sectionItemsWidgetProps[i]`

Cada item do array é uma seção com:

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `"mixed"` \| `"accordions"` | Tipo da seção. |
| `title` | string | Título da seção. |
| `contentLines` | array | Linhas de conteúdo (quando `type: "mixed"`). |
| `accordions` | array | Accordions colapsáveis (quando `type: "mixed"` ou `"accordions"`). |
| `radioButtons` | array | Grupos de radio buttons (quando `type: "mixed"`). |
| `button` | object | Link/botão no final da seção. |

#### `contentLines[i]` — estrutura de cada linha

| Campo | Tipo | Descrição |
|---|---|---|
| `label` | string | **Texto à esquerda** (título da linha). |
| `value` | string | **Texto à direita** (valor da linha). Use este campo para exibir dados como valores monetários, prazos, percentuais, etc. |
| `rightFeatures` | object | Recursos adicionais à direita (ícone, badge, status). **Não use `rightFeatures.description` para exibir valores simples — use `value` diretamente.** |
| `auxiliarLines` | array | Linhas auxiliares abaixo da linha principal (cada uma com `description` à esquerda e `value` à direita). |
| `action` | object | Ação ao clicar na linha. |
| `icon` | string | Ícone à esquerda da linha. |

> **Armadilha comum:** Para exibir um valor ao lado do label (ex.: "Prazo" → "24 meses"), use `value`, **não** `rightFeatures.description`. O campo `rightFeatures` serve para badges, ícones de status ou elementos visuais adicionais.

## Dicas

- Escolha UMA das opções "hero": imagem (`cardImageWidgetProps`) OU gráfico (`chartWidgetProps`). As duas juntas não são suportadas.
- Se só precisa de linhas (sem hero/chart/textBox), `CardInfoResumedDLS` é mais enxuto.
