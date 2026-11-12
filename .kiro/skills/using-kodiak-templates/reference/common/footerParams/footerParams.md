# footerParams

**Rodapé fixo** da tela — botões principais (main/secondary/tertiary/password) e modificadores opcionais via `type` (checkbox de confirmação, feedback, sticky, multiline).

## Estrutura

| Campo | Tipo | Descrição |
|---|---|---|
| `mainButton` | object | Botão principal (amarelo por padrão). |
| `secondaryButton` | object | Botão secundário (texto). |
| `tertiaryButton` | object | Botão terciário (texto sutil). |
| `passwordButton` | object | Botão que abre o bottomsheet de senha antes de executar a ação. |
| `type` | object | Modificador do footer (checkbox / feedback / sticky / multiline). |

### `mainButton`

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Texto do botão. |
| `action` | action | Ação disparada. Ver `reference/common/action/action.md`. |
| `showInlined` | boolean | Se `true`, exibe lado a lado com o `secondaryButton`. Requer que não haja outros botões. |

### `secondaryButton` / `tertiaryButton`

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Texto do botão. |
| `action` | action | Ação disparada. |
| `skipValidation` | boolean | Se `true`, ignora validação dos campos (nada é enviado pra próxima tela). |

### `passwordButton`

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Texto do botão. |
| `action` | action | Ação executada **após** o usuário digitar a senha. |
| `passwordLength` | enum `3-digit / 4-digit / 6-digit / 8-digit / unlimited` | Tamanho da senha. Default: 6 (ou 8 em conta PJ). |
| `bottomsheetTitle` | string | Título do bottomsheet de senha. |

### `type`

| `type.type` | Uso |
|---|---|
| `checkbox` | Exibe checkbox de confirmação acima dos botões. Requer `paragraph`, `checkboxLabel` e opcionalmente `action` para link no parágrafo. Usuário só prossegue se marcar. |
| `feedback` | Recebe voto `like`/`dislike` do usuário. Pode enviar em background. |
| `sticky` | Rodapé grudado na parte inferior mesmo em scroll. |
| `multiline` | Layout para múltiplos botões em linhas diferentes. |

## ⚠️ REGRA — campo correto para o texto dos botões

> **SEMPRE use `title`, NUNCA `text`** em `mainButton`, `secondaryButton`, `tertiaryButton` e `passwordButton`.
>
> ```json
> "mainButton": { "title": "Confirmar", "action": { ... } }
> ```
>
> Usar `text` é silenciosamente ignorado — o botão aparece sem rótulo no app.

## Dicas

- Para tela de input longa, combine `mainButton` + `type: sticky` pra manter o CTA acessível durante o scroll.
- Para termos obrigatórios antes de avançar, use `type: checkbox` em vez de renderizar o checkbox no template.
- `passwordButton` já orquestra bottomsheet de senha + envio — não precisa manualmente.
