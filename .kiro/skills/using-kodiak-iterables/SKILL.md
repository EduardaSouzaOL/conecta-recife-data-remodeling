---
name: using-kodiak-iterables
description: >
  Como usar iteráveis no Kodiak com `__iterables`. Use quando o usuário precisar popular
  listas, grades ou arrays dinamicamente a partir de dados de uma requisição, usando
  datasource, model, filtros ou iteráveis aninhados.
---

# Skill: Using Kodiak Iterables

Iteráveis permitem popular arrays dinamicamente a partir de um datasource de dados, sem precisar escrever cada item manualmente no JSON. É o mecanismo padrão para renderizar listas, grades e cards alimentados por dados de `__requests`.

---

## Como funciona

Um iterável é definido dentro de `__iterables` e possui três campos principais:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `target` | enum | sim | Qual campo do pai é populado (ex.: `items`, `sections`, `sectionData`, `steps`). Valores dependem do widget. |
| `datasource` | string | sim | Array fonte — alias de um request (`"filmes_cartaz"`) ou expressão completa (`"${catalogoReq.response.produtos}"`). |
| `model` | object | sim | Template de um único item; repetido para cada elemento do array. |

### Acesso aos campos do item

Dentro do `model`, os campos de cada elemento são acessados via `${__item.campo}`:

```json
"model": {
  "label": "${__item.nome}",
  "value": "${__item.tipo} · ${__item.ano}"
}
```

> **IMPORTANTE:** use sempre `${__item.campo}` dentro de um `model` de iterável. Nunca use `${campo}` direto nem `${item.campo}` — a forma canônica e garantida é `${__item.campo}`.

---

## Estrutura básica

```json
"__iterables": [
  {
    "target": "sectionData",
    "datasource": "nome_do_array",
    "model": {
      "label": "${__item.campo1}",
      "value": "${__item.campo2}",
      "action": {
        "name": "navigation",
        "params": {
          "configName": "outra-tela",
          "requestParams": {
            "param": "${__item.campo1}"
          }
        }
      }
    }
  }
]
```

### Exemplo com datasource como expressão completa

```json
{
  "items": [],
  "__iterables": [
    {
      "target": "items",
      "datasource": "${catalogoReq.response.produtos}",
      "model": {
        "title": "${__item.nome}",
        "description": "${__item.categoria}",
        "value": "${__item.preco}",
        "image": {
          "uri": "${__item.imagemUrl}",
          "cache": true
        },
        "action": {
          "name": "navigation",
          "configName": "card-detail-produto",
          "contextParams": {
            "produtoId": "${__item.id}"
          }
        }
      }
    }
  ]
}
```

---

## Iteráveis aninhados (seções + linhas)

No template `ListDLS`, é possível ter dois níveis de iteráveis:

1. **Nível externo** (`templateParams.__iterables`) — popula `sections` a partir de um array. O `model` aqui representa **uma seção inteira** (pode ter `sectionTitle`, `sectionData` etc).
2. **Nível interno** (dentro de cada seção, em `sections[i].__iterables`) — popula `sectionData` dentro de uma seção já definida.

> **Atenção:** o `__iterables` em `templateParams` (nível externo) **não aceita `model` com campos de linha diretamente** — o `model` deve representar um objeto de seção completo. Para popular apenas as linhas de seções fixas, use o `__iterables` dentro de cada seção (nível interno).

Quando as seções são **fixas** (definidas manualmente) e apenas as linhas são dinâmicas, coloque o `__iterables` diretamente dentro de cada objeto de seção:

```json
"templateParams": {
  "sections": [
    {
      "sectionTitle": "Em cartaz",
      "__iterables": [
        {
          "target": "sectionData",
          "datasource": "filmes_cartaz",
          "model": {
            "label": "${__item.nome}",
            "value": "${__item.tipo} · ${__item.ano}",
            "rightFeatures": {
              "description": "★ ${__item.imdb}"
            },
            "action": {
              "name": "navigation",
              "params": {
                "configName": "filmes-detalhes",
                "requestParams": {
                  "titulo": "${__item.nome}",
                  "genero": "${__item.tipo}",
                  "ano": "${__item.ano}",
                  "nota": "${__item.imdb}"
                }
              }
            }
          }
        }
      ]
    }
  ]
}
```

---

## Filtros

É possível filtrar os itens do array antes de renderizar, usando a propriedade `filters`:

```json
"__iterables": [
  {
    "target": "sectionData",
    "datasource": "filmes_cartaz",
    "filters": [
      {
        "filteredProperty": "tipo",
        "filteredValue": "Drama",
        "filterType": "match"
      }
    ],
    "model": { ... }
  }
]
```

| Campo | Descrição |
|---|---|
| `filteredProperty` | Nome do campo no objeto do array |
| `filteredValue` | Valor a comparar |
| `filterType` | `"match"` (igual) ou `"contains"` (contém) |

---

## Dicas

- `__iterables` **não** faz chamadas HTTP — ele só consome dados já coletados via `__requests`.
- Se o datasource retornar `null` ou array vazio, o campo é simplesmente não renderizado (sem erro).
- Combine com `__transformations` quando precisar converter tipo ou formato por elemento.
- `__iterables` aparece em qualquer array configurável: `items`, `contentLines`, `cards`, `sections`, `steps`, etc.

---

## Onde `__iterables` está disponível

Nem todo template e nem toda propriedade suporta iteráveis. Sempre verifique no schema:

```bash
# Verifica se __iterables existe em templateParams
jq '.properties.parameters.properties.templateParams.properties | keys' schema.json

# Verifica se __iterables existe dentro de um item de sections
jq '.properties.parameters.properties.templateParams.properties.sections.items.properties | keys' schema.json
```
