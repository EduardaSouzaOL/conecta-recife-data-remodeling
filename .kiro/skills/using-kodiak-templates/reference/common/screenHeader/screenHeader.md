# screenHeader

**Cabeçalho de conteúdo DLS** — fica **dentro** da área do template, logo abaixo da barra azul nativa (`headerParams`). Comporta elementos de conteúdo que acompanham a tela: título de conteúdo, subtítulo, barra de passos (progress), barra de tempo, abas e mensagem inline.

> ⚠️ Apesar do nome, **não é o header nativo da tela** — esse é o `headerParams`. `screenHeader` é o cabeçalho de conteúdo DLS.

## Estrutura

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título de conteúdo (bold, grande, abaixo do header nativo). |
| `description` | string | Subtítulo / descrição curta abaixo do `title`. |
| `progressBar` | object | Barra de passos visual (stepper horizontal). |
| `timingProgressBar` | object | Barra de progresso temporal (dispara ação após N segundos). |
| `tabSchema` | object | Abas horizontais de navegação dentro da tela. |
| `inlineMessage` | object | Mensagem destacada (info/success/warning/critical) inline. |

### `progressBar`

| Campo | Tipo | Descrição |
|---|---|---|
| `compact` | boolean | Modo compacto (barra fina). |
| `compactShowDefaultTitle` | boolean | Mostra "Etapa do processo" no modo compacto. |
| `steps` | array | Passos — cada um com `title` e `error` (boolean). |
| `currentStep` | string | Índice do passo atual (string, permite binding). |
| `__iterables` | array | Popula `steps` a partir de um datasource. |

### `timingProgressBar`

| Campo | Tipo | Descrição |
|---|---|---|
| `time` | string | Duração em segundos (inteiro, máx. 60). |
| `description` | string | Texto exibido à esquerda da barra. |
| `size` | enum `small / regular` | Tamanho da barra. |

### `tabSchema`

Abas horizontais navegáveis. Detalhe segue o uso do seu `tabs` no template (consulte o schema específico se precisar de campos exóticos).

### `inlineMessage`

Mensagem contextual — geralmente usada para info leve ou aviso.

## Dicas

- Use `progressBar` quando o fluxo tem etapas (FormDLS multi-step, checkout).
- Use `timingProgressBar` em telas auto-navegáveis (countdown que expira / redireciona).
- Para erros/avisos estáticos bloqueantes, `IntroDLS` é melhor que `inlineMessage` dentro de `screenHeader`.
