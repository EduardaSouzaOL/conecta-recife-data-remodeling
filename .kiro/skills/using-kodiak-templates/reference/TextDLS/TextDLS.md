# TextDLS

**uiKit:** `dls`

## Quando usar

Tela de **conteúdo textual** — páginas de termos, políticas, FAQ, explicações, "Saiba mais". Basicamente: uma lista de blocos **título + parágrafo** empilhados verticalmente. Sem CTAs complexos, sem listas com interação, sem formulário.

Substituto DLS do antigo `Text`.

### Layout visual

Header padrão no topo e, na área de conteúdo, uma pilha vertical de blocos `Título` (bold, grande) + parágrafo (regular, cinza). Sem ícones, sem botões no meio, sem chevrons. Tela costuma terminar em espaço em branco (ou CTA no `footerParams`).

Quando **não** usar:
- Se precisa de tela introdutória com ícone e 1-2 botões → `IntroDLS`.
- Se precisa de tutorial paginado com imagem → `Onboarding`.
- Se precisa de layout com cards/sessões clicáveis → `ListDLS` ou `CardDetailDLS`.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `subsections` | array | Lista de seções exibidas em ordem. |
| `__iterables` | array | Popula `subsections` dinamicamente a partir de um datasource. |

### `subsections[i]`

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título da seção (opcional). |
| `paragraph` | string | Corpo do texto (suporta quebra de linha). |
| `__transformations` | array | Formatadores/conversores aplicados aos campos. |

Se um item não tiver nem `title` nem `paragraph`, nada é renderizado. Itens `null` são ignorados.
