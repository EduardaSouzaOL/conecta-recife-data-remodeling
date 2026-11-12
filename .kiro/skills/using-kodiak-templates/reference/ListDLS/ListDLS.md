# ListDLS

**uiKit:** `dls`

## Quando usar

Tela de **lista vertical de itens** agrupada em seções, com ou sem busca. É o template mais genérico para exibir listas no DLS — cada item é uma linha de conteúdo (label/value/ícone/ação).

Casos típicos:
- Listagem de contas, cartões, contatos, favorecidos, produtos.
- Lista com busca.
- Lista em múltiplas seções com títulos.
- "Card list" (listas agrupadas dentro de um card).

Substituto DLS dos antigos `List`, `SectionList`, `ListSearch`, `ImageSectionList`, e também de `SimpleListButton`.

### Layout visual

Lista simples ocupando toda a largura da tela. Cada linha: `Label` bold + `Description` cinza à esquerda e **chevron à direita**, separadas por uma linha fina. Sem imagem, sem header de seção na versão mais básica (mas `sectionTitle` pode adicionar). Clean e minimalista — foca na navegação.

Quando **não** usar:
- Card único com linhas de informação (sem ação por linha como foco) → `CardInfoResumedDLS`.
- Grade de cards com imagem → `GridDLS`.
- Selecionar 1 de N (picker com filtro) → `ItemPickerDLS`.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `sections` | array | Seções da lista (ver abaixo). |
| `cardLists` | array | Listas agrupadas em um card (ver abaixo). |
| `search` | object | Campo de busca (ver abaixo). |
| `__iterables` | array | Popula `sections`/`cardLists` dinamicamente. |

### `sections[i]`

| Campo | Tipo | Descrição |
|---|---|---|
| `sectionTitle` | string | Título da seção. |
| `sectionTitlePrefix` | string | Prefixo antes do título. |
| `sectionTitleSuffix` | string | Sufixo após o título. |
| `linkNavigation` | object | Link/CTA exibido no título da seção. |
| `sectionData` | array | Linhas da seção (`label`, `value`, `icon`, `avatar`, `image`, `status`, `auxiliarLines`, `rightFeatures`, `action`, `inverted`, `verticalSpacing`). |

> **`value` vs `rightFeatures.description`:** Use `value` para exibir texto curto à direita do label (valores, datas, quantidades). Use `rightFeatures.description` apenas para descrições/subtítulos auxiliares que aparecem abaixo do label. Use `rightFeatures.status`/`rightFeatures.badge` para indicadores visuais (chips de status, badges).

### `cardLists[i]`

Lista agrupada em um card. Cada item tem:
- `title`, `kind`, `iconName`
- `contentLines` (linhas internas)
- `linkNavigation`, `onPress`, `cardLayout`, `disabled`, `debounceTime`
- `sectionTitleSuffix`, `verticalPadding`

### `search`

| Campo | Tipo | Descrição |
|---|---|---|
| `enableSearch` | boolean | Ativa o campo de busca. |
| `placeholder` | string | Placeholder do input. |
| `hint` | string | Texto de apoio abaixo do campo. |
| `filterStatusBoxProps` | object | Box com status do filtro aplicado. |

## Populando dinamicamente com `__iterables`

O `ListDLS` suporta dois padrões de iterável — **não os confunda**:

### Padrão A — seções dinâmicas (`templateParams.__iterables`)

Quando **as próprias seções** vêm de uma API (ex.: uma categoria por item do array), declare `sections: []` e coloque `__iterables` no `templateParams`:

```json
"templateParams": {
  "sections": [],
  "__iterables": [
    {
      "target": "sections",
      "datasource": "mesas",
      "model": {
        "sectionTitle": "${__item.numero}",
        "sectionData": [
          {
            "label": "${__item.numero}",
            "value": "${__item.status}",
            "action": { "name": "navigation", "configName": "outra-tela", "contextParams": { "id": "${__item.id}" } }
          }
        ]
      }
    }
  ]
}
```

> O `model` aqui é uma **seção inteira** — não uma linha.

### Padrão B — seções fixas, linhas dinâmicas (seção `__iterables`)

Quando as seções são conhecidas e apenas as linhas vêm da API, declare as seções normalmente e coloque `__iterables` dentro de cada seção:

```json
"templateParams": {
  "sections": [
    {
      "sectionTitle": "Mesas Ocupadas",
      "sectionData": [],
      "__iterables": [
        {
          "target": "sectionData",
          "datasource": "mesas",
          "model": {
            "label": "${__item.numero}",
            "value": "${__item.status}"
          }
        }
      ]
    }
  ]
}
```

---

## Dicas

- Use `sections` para lista "plana" com títulos de seção; use `cardLists` quando quiser cada lista encapsulada num card visual.
- A busca filtra dentro das `sections` da própria tela — não faz request.
- Sempre declare `sections: []` (array vazio) quando usar `__iterables` no `templateParams` para popular seções.
