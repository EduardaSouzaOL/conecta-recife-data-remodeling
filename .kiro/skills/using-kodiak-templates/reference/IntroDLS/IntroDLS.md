# IntroDLS

**uiKit:** `dls`

## Quando usar

Tela de **mensagem única e focal**: um ícone, um título, um texto curto e normalmente 1–2 botões no rodapé. Use em:

- Abertura de fluxos ("Vamos começar"), onboarding curto de uma etapa.
- **Telas de resultado** (sucesso, erro, aviso, crítico) — substitui o antigo `Result`.
- Confirmações antes de ações importantes.

Substituto DLS dos antigos `Intro` e `Result`.

### Layout visual

Conteúdo **ancorado no rodapé** da tela — metade superior fica vazia. Na parte inferior, na ordem: um ícone pequeno dentro de uma caixinha arredondada (cor depende do `type`), `hint/OVERLINE` em caixa alta colorida, `title` bold grande, `description` em cinza. Abaixo, o botão primário (`footerParams.mainButton`) na largura total. Alinhamento à esquerda (não centralizado).

Quando **não** usar:
- Tutorial com múltiplas páginas paginadas → `Onboarding`.
- Precisa de várias seções de texto → `TextDLS`.
- Precisa de lista de itens ou cards → `ListDLS` / `CardDetailDLS`.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | enum `Default / Success / Warning / Critical` | Define o estilo visual e ícone padrão. |
| `icon` | string | Nome do ícone DLS (personalizável só em `Default` e `Critical`). |
| `hint` | string | Texto de alerta exibido acima do título. |
| `title` | string | Título principal / texto em destaque. |
| `description` | string | Texto descritivo abaixo do título. |
| `__transformations` | array | Formatadores aplicados aos campos. |

### Dica de `type`

| Valor | Uso |
|---|---|
| `Default` | Introdução neutra / boas-vindas. |
| `Success` | Confirmação de sucesso (pagamento aprovado, envio concluído). |
| `Warning` | Aviso não bloqueante. |
| `Critical` | Erro, falha, ação destrutiva. |

Os CTAs ficam em `parameters.footerParams.mainButton` / `secondaryButton` — não em `templateParams`.
