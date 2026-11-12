# TrackingDLS

**uiKit:** `dls`

## Quando usar

Tela de **acompanhamento de progresso em etapas** (stepper/timeline vertical). Cada etapa tem título, textos auxiliares e link opcional. Combinado com seções de linhas abaixo do progresso.

Casos típicos:
- Status de contratação/pedido ("1. Enviado → 2. Em análise → 3. Aprovado").
- Acompanhamento de entrega / chamado / processo.
- Tracking de transferência internacional, financiamento.

Quando **não** usar:
- Detalhe de pedido sem timeline → `DeliveryDetails` ou `CardDetailDLS`.
- Lista de itens sem progresso → `ListDLS`.

### Layout visual

Duas áreas empilhadas. **Topo (`sections`):** lista em seção (ex.: "Seção") com linhas `Label` bold + `Description` cinza + chevron à direita — rows clicáveis com separador fino. **Base (`trackingProgress`):** `title` bold e, abaixo, uma **timeline vertical com bolinhas azuis ligadas por uma linha** ao longo do lado esquerdo; cada etapa mostra `title`, `auxiliaryText1/2`, um parágrafo descritivo e um link azul "Mais detalhes >".

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `trackingProgress` | object | Timeline com as etapas do processo. |
| `sections` | array | Seções de linhas exibidas abaixo do progresso. |
| `__iterables` | array | Popula `sections` dinamicamente. |

### `trackingProgress`

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título do bloco de progresso. |
| `progressItems` | array | Etapas (ver abaixo). |

### `trackingProgress.progressItems[i]`

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título da etapa. |
| `auxiliaryText1` | string | Texto auxiliar 1 (ex.: data). |
| `auxiliaryText2` | string | Texto auxiliar 2 (ex.: hora / status). |
| `link` | object | Link/CTA na etapa (ex.: "ver detalhes"). |

### `sections[i]`

`sectionTitle`, `sectionData` (linhas no formato do `ListDLS`: `label`, `value`, `icon`, `auxiliarLines`, `action`...).

## Dicas

- O estado visual de cada etapa (concluída, atual, futura) é inferido pela ordem e pelos textos — preencha `auxiliaryText1`/`auxiliaryText2` apenas para etapas já ocorridas para indicar progresso.
