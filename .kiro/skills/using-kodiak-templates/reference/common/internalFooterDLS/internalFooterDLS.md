# internalFooterDLS

**Rodapé inline** que aparece abaixo do conteúdo principal (não é o footer fixo com botões — esse é o `footerParams`). Usado principalmente para widget de **avaliação (rating)** — estrelas/coração/face/número.

## ⚠️ Posição no JSON — CRÍTICO

`internalFooterDLS` é um campo de **`parameters`**, irmão de `templateParams`, `headerParams`, `footerParams`, etc. **Nunca coloque dentro de `templateParams`** — se colocado lá, o componente não será renderizado sem nenhum erro visível.

```jsonc
{
  "parameters": {
    "templateParams": { /* conteúdo da tela */ },
    "internalFooterDLS": {         // ← CORRETO: irmão de templateParams
      "rating": {
        "type": "number",
        "title": "Como você avalia?",
        "description": "Selecione uma nota de 1 a 5"
      }
    }
  }
}
```

```jsonc
// ❌ ERRADO — NÃO faça isso:
{
  "parameters": {
    "templateParams": {
      "internalFooterDLS": { ... }  // nunca aqui
    }
  }
}
```

## Estrutura

| Campo | Tipo | Descrição |
|---|---|---|
| `rating` | object | Widget de avaliação (ver abaixo). |

### `rating`

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | enum `star / heart / face / number` | Tipo visual da avaliação. |
| `title` | string | Título do widget. |
| `description` | string | Descrição abaixo do título. |
| `caption` | object | Legenda opcional exibida junto à avaliação (ver abaixo). |

### `rating.caption`

| Campo | Tipo | Descrição |
|---|---|---|
| `showCaption` | boolean (ou expressão) | Ativa a legenda. |
| `type` | enum `simple / compact / extended` | Formato da legenda. Default `simple`. `extended` exibe total. |
| `total` | string | Total de avaliações (só renderiza em `extended`). |

## Dicas

- Use para pesquisar satisfação do usuário ao final de um fluxo sem sair da tela.
- Para coletar feedback tipo like/dislike com persistência, prefira `footerParams.type.type = feedback`.
- Só **um** widget de `internalFooterDLS` por tela.
