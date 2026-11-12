# Wrapper padrão

Toda config Kodiak (DLS ou lógica) tem a mesma raiz. O que **muda** entre templates é apenas `parameters.templateParams`. Todo o resto (`headerParams`, `footerParams`, `screenHeader`, etc.) é compartilhado.

## Estrutura

| Campo | Tipo | Descrição |
|---|---|---|
| `configName` | string | ID único da config. Usado em `action.navigation.configName` pra navegar até essa tela. |
| `description` | string | Texto livre descritivo (não é exibido ao usuário). |
| `parameters` | object | Objeto com tudo que a tela precisa — detalhado abaixo. |

### `parameters.*`

| Campo | Comum a todos? | Descrição | Ver |
|---|---|---|---|
| `name` | Sim | Nome do template usado. | `listTemplates` mcp tool |
| `templateParams` | Não — específico | Conteúdo principal do template. | `reference/<Template>/<Template>.md` |
| `headerParams` | Sim | Header nativo (topo): título da tela, voltar, botões direito, toolbar de busca. | `reference/common/headerParams/headerParams.md` |
| `screenHeader` | Sim | Cabeçalho de conteúdo DLS: progress bar, tabs, título de conteúdo, mensagem inline. | `reference/common/screenHeader/screenHeader.md` |
| `footerParams` | Sim | Rodapé fixo com botões (main, secondary, tertiary, password) e tipo (checkbox/feedback/sticky/multiline). | `reference/common/footerParams/footerParams.md` |
| `internalFooterDLS` | Sim | Rodapé inline opcional com widget de rating. | `reference/common/internalFooterDLS/internalFooterDLS.md` |
| `screenParams` | Sim | Definições visuais da tela (atualmente só `style`). **Sempre inclua com `{ "style": "dlsdefault" }` — obrigatório em tela visual (DLS). Não inclua em templates lógicos como Switch e PerformAction.** | `reference/common/screenParams/screenParams.md` |
| `overlayParams` | Sim | Overlays globais (ex.: bottomsheet informativo que abre junto com a tela). | `reference/common/overlayParams/overlayParams.md` |
| `__requests` | Sim | Array de requisições HTTP disparadas antes da renderização. | `reference/common/requests/requests.md` |
| `isErrorScreen` | Sim | `boolean`. Marca a tela como de erro (muda loading / handler). |  |
| `useCustomErrorHandler` | Sim | `boolean`. Delega tratamento de erro para a própria config em vez do padrão. |  |
