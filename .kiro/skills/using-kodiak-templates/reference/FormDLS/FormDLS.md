# FormDLS

**uiKit:** `dls`

## Quando usar

Tela de **formulário com múltiplos tipos de campo**. Inclui inputs textuais, monetários, numéricos, selects, checkboxes, rádios, switches, datas, listas e mais. Substitui tanto o `Form` quanto o `FormCarrossel` (FormDLS suporta steps nativamente).

Casos típicos:
- Cadastro / atualização de dados.
- Coleta de informações (nome, CPF, endereço).
- Formulário de transferência (valor, favorecido, data).
- Seleções múltiplas e escolhas combinadas.

Substituto DLS dos antigos `Form` e `FormCarrossel`.

### Layout visual

Pilha vertical de items, cada um na largura total da tela: `Label` bold + `Description` + chevron (linkNavigation), `Input label` + campo (texto, data `DD/MM/AAAA` com ícone de calendário, select "Selecione", numberField com `-` e `+` e valor central). Abaixo, mais linhas `Label / Description / chevron`. Footer amarelo com CTA ("AÇÃO PRIMÁRIA"). Separadores sutis entre campos.

Quando **não** usar:
- Só um campo de valor com lista de produtos → `Cart`.
- Só uma seleção de 1 item de uma lista → `ItemPickerDLS`.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `items` | array | Itens do formulário (campos, títulos, links). Renderizados em ordem. |
| `__iterables` | array | Popula `items` dinamicamente. |

### `items[i].type` — tipos de campo aceitos

| Valor | Uso |
|---|---|
| `textInput` | Campo de texto. |
| `textArea` | Área de texto (múltiplas linhas). |
| `password` | Campo de senha. |
| `moneyField` | Campo monetário (com moeda). |
| `numberField` | Campo numérico. |
| `dateField` | Campo de data. |
| `selectField` | Select (dropdown). **Atenção:** usa `optionsList` (não `options`) e `selectionLabel` (não `placeholder`). |
| `radioGroup` | Grupo de rádio (1 de N). |
| `selectButtons` | Botões de seleção (single/multi). |
| `checkbox` | Checkbox único. |
| `checkboxGroup` | Grupo de checkboxes (N de N). |
| `switch` | Toggle on/off. |
| `list` | Lista de itens exibida no form. |
| `cardList` | Lista de itens em cartão. |
| `linkNavigation` | Link/CTA dentro do formulário. |
| `title` | Título de seção (não é campo). |
| `text` | Parágrafo de texto (não é campo). |

Cada item tem campos específicos conforme o `type` (ex.: `name`, `label`, `placeholder`, `options`, `validations`).

### `textInput` — campo `format`

O `textInput` aceita o campo `format` para aplicar máscara e teclado correto automaticamente:

| Valor | Uso |
|---|---|
| `email` | E-mail (teclado com @) |
| `cpf` | CPF (máscara 000.000.000-00) |
| `cnpj` | CNPJ (máscara 00.000.000/0000-00) |
| `cep` | CEP (máscara 00000-000) |
| `phoneMobile` | Celular (máscara (00) 00000-0000) |
| `phoneLandline` | Fixo (máscara (00) 0000-0000) |
| `phoneInternational` | Telefone internacional |
| `numeric` | Apenas números |
| `creditCard` | Cartão de crédito |
| `account` | Número de conta |
| `agency` | Agência bancária |
| `barCode` | Código de barras |
| `monthYear` | Mês/Ano (MM/AAAA) |
| `monthYearShort` | Mês/Ano curto |
| `time` | Horário (HH:MM) |
| `custom` | Máscara personalizada (usar com `customFormatData`) |

> **Sempre use `format` em campos de e-mail, CPF, telefone, CEP e similares.** Isso garante a máscara visual e o teclado correto no dispositivo.

## Dicas

- O valor de cada campo é acessível nas próximas telas via `${<item.name>}`.
- **`selectField`:** as opções devem ser declaradas em `optionsList` (array de `{ id, label }`), **não** em `options`. O placeholder é `selectionLabel`, **não** `placeholder`. O valor selecionado é repassado como o `id` da opção escolhida.

  ```json
  {
    "type": "selectField",
    "name": "categoria",
    "label": "Categoria",
    "selectionLabel": "Selecione",
    "optionsList": [
      { "id": "tecnologia", "label": "Tecnologia" },
      { "id": "negocios", "label": "Negócios" }
    ]
  }
  ```
- Use `title` e `text` para estruturar o form em seções.
- Para steps, divida o form em várias configs (cada `FormDLS` é um passo) e navegue com o `mainButton`.
- Validações são declaradas dentro de cada item (campo `validations`), não no template.
