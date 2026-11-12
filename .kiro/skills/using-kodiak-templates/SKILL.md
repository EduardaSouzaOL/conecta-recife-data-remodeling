---
name: using-kodiak-templates
description: >
  Como criar, editar ou configurar telas/templates no Kodiak ou também tirar dúvidas sobre telas/templates. Use sempre que o usuário quiser criar uma nova tela, editar uma tela existente, adicionar ou remover componentes (header, footer, barra de progresso, rating, botões, seções, campos), configurar templateParams, headerParams, footerParams, screenHeader, internalFooterDLS ou qualquer parte de um template Kodiak. Use também para escolher o melhor template para um caso de uso, tirar dúvidas sobre templates, entender diretrizes de UX ou corrigir problemas de configuração em telas existentes.
---

# Skill: Escolhendo o melhor template

> **Referência detalhada por template:** `reference/<Template>/<Template>.md`, `reference/<Template>/<Template>.json` e `reference/<Template>/ux-guidelines.md`. O `.md` descreve apenas `templateParams` (a parte específica) e inclui uma seção **"Layout visual"** que descreve a tela real; o `.json` é um exemplo sintético validado no schema.

---

> **JAMAIS crie ou atualize uma tela sem antes validar com ajv.** Essa regra não tem exceção.
>
> ```bash
> npx -y ajv-cli validate --strict=false \
>   -s ~/.plk-astro/schemas/<versionFlow>/<Template>.json \
>   -d ~/.plk-astro/temp/config-name.json
> ```
>
> - Se a validação falhar: corrija os erros e valide novamente até passar.
> - Só chame `createConfig` ou `updateConfig` após ver `valid` no output.
> - O schema fica em `~/.plk-astro/schemas/<versionFlow>/` após chamar `getTemplateSchema`.

---

## Fluxo sugerido

1. Esclareça eventuais dúvidas perguntando ao usuário;
2. Busque os templates disponíveis usando a tool `listTemplates` do MCP `kodiak-mcp`;
3. Consulte a tabela abaixo para mais informações do template escolhido.
4. Abra `reference/<Template>/<Template>.md` para conferir `templateParams`.
5. Abra `reference/<Template>/ux-guidelines.md` (se existir) e aplique as recomendações de UX: layout, tom de escrita e boas práticas visuais.
6. Use `reference/<Template>/<Template>.json` como ponto de partida
7. Para buscar mais detalhes da estrutura (schema) do template, use `jq` com leitura progressiva para focar só na parte específica do template.
8. Salve a config em `/tmp/<config>.json` e **valide com ajv** (ver regra acima). Corrija e repita até passar.
9. Só então chame `createConfig` ou `updateConfig`.


---

## Índice — quando usar cada template

### Templates lógicos (sem uiKit)

| Template | Use quando… |
|---|---|
| [`Switch`](reference/Switch/Switch.md) | Precisa **bifurcar o fluxo** com base em condições (dados de contexto, resposta de request). Não renderiza UI. |
| [`PerformAction`](reference/PerformAction/PerformAction.md) | Precisa **executar uma ação** (navigation, shareV2, clipboard, tel, etc.) sem mostrar tela. |

### Telas de conteúdo/informação

| Template | Use quando… |
|---|---|
| [`TextDLS`](reference/TextDLS/TextDLS.md) | Tela só de **texto corrido** (termos, política, conteúdo longo). |
| [`IntroDLS`](reference/IntroDLS/IntroDLS.md) | **Mensagem única** de sucesso/erro/aviso/intro com ícone/imagem, título, descrição e CTA. Substitui `Result` e `Intro` antigos. |
| [`Onboarding`](reference/Onboarding/Onboarding.md) | **Tutorial paginado** (swipe entre telas) antes de entrar num fluxo. |
| [`TrackingDLS`](reference/TrackingDLS/TrackingDLS.md) | **Stepper** mostrando progresso de um processo (ex.: entrega). |

### Detalhe de 1 item

| Template | Use quando… |
|---|---|
| [`CardInfoResumedDLS`](reference/CardInfoResumedDLS/CardInfoResumedDLS.md) | Lista de imagens com **algumas linhas de conteúdo**. |
| [`CardDetailDLS`](reference/CardDetailDLS/CardDetailDLS.md) | Detalhe rico com **card topo + seções/linhas abaixo**. Substitui `CardDetail`, `ProductsSummary`, `ImageRadioGroup`. |
| [`ItemDetails`](reference/ItemDetails/ItemDetails.md) | Detalhe **muito rico** de 1 item: imagens, tags, favoritar, form embutido, termos. Substitui `OrderDetails` e `ProductDetail` depreciados. |
| [`ReceiptDLS`](reference/ReceiptDLS/ReceiptDLS.md) | **Comprovante** de transação (pagamento, transferência, Pix). |

### Listas / grades

| Template | Use quando… |
|---|---|
| [`ListDLS`](reference/ListDLS/ListDLS.md) | **Lista vertical** com seções, busca, avatares, status. Substitui `List`, `SectionList`, `ListSearch`, `ImageSectionList`, `SimpleListButton`. |
| [`GridDLS`](reference/GridDLS/GridDLS.md) | **Grade de cards** com imagem (2–3 colunas). Substitui `Grid`. |
| [`StatementDLS`](reference/StatementDLS/StatementDLS.md) | **Extrato** (lista agrupada por data com saldo/filtro). Substitui `Statement`. |

### Seleção / picker

| Template | Use quando… |
|---|---|
| [`ItemPickerDLS`](reference/ItemPickerDLS/ItemPickerDLS.md) | **Escolher 1 entre N** itens (cartão, conta, oferta) com filtros/cards selecionáveis. |

### Hub / home de área

| Template | Use quando… |
|---|---|
| [`CentralDLS`](reference/CentralDLS/CentralDLS.md) | **Hub rico** com múltiplos widgets (saldo + atalhos + carrossel + listas). Substitui `Catalog`, `CatalogPlus`, `BalanceImageCarroussel`, `TabImageCarrossel`. |
| [`Central2`](reference/Central2/Central2.md) | **Hub versátil** com seções empilhadas de tipos variados: quick actions, cards selecionáveis, gráfico, carrosséis e listas. Indicado para centrais de fluxo com conteúdo misto e dinâmico. |
| [`ListCardDetailsDLS`](reference/ListCardDetailsDLS/ListCardDetailsDLS.md) | **Detalhe + filtro + lista** combinados (ex.: cartão + extrato do cartão). |

### Formulário / checkout

| Template | Use quando… |
|---|---|
| [`FormDLS`](reference/FormDLS/FormDLS.md) | **Formulário** multi-campo com validação e (opcional) steps. Substitui `Form` e `FormCarrossel`. |
| [`Cart`](reference/Cart/Cart.md) | **Carrinho** com quantidade por item e total. |
---

## Wrapper comum a todos os templates

Todo arquivo de config tem a mesma raiz:

```jsonc
{
  "configName": "string",        // id único da config
  "description": "string",       // texto livre descritivo
  "parameters": {
    "name": "string",           // nome do template da tela. Ex.: CardDetailDLS. Obrigatório.
    "templateParams": { ... },   // <— ESPECÍFICO do template (ver reference/<Template>/)
    "__requests": [ ... ],       // requests HTTP disparados antes da renderização
    "headerParams": { ... },     // header NATIVO azul (title, canGoBack, rightButtons, toolbar)
    "screenHeader": { ... },     // header de CONTEÚDO DLS (title/description, progressBar, tabs, inlineMessage)
    "footerParams": { ... },     // footer fixo (mainButton, secondaryButton, checkbox, feedback, ...)
    "screenParams": { ... },     // comportamento/estilo da tela (style: "dlsdefault")
    "overlayParams": { ... },    // overlays/bottomsheets da tela
    "internalFooterDLS": { ... },// footer inline com rating (abaixo do conteúdo, sem fixar)
    "isErrorScreen": false,      // marca como tela de erro (loading/handler diferente)
    "useCustomErrorHandler": false
  }
}
```

Todos os campos de `parameters` (exceto `templateParams`, que varia por template) seguem o **mesmo schema em todos os templates**. Por isso cada `reference/<Template>/<Template>.md` foca apenas em `templateParams`.

### Referência das partes comuns

| Parte | Ver |
|---|---|
| Wrapper raiz (`configName`, `description`, `parameters`) | [`reference/common/wrapper/wrapper.md`](reference/common/wrapper/wrapper.md) |
| `headerParams` (header nativo azul) | [`reference/common/headerParams/headerParams.md`](reference/common/headerParams/headerParams.md) |
| `screenHeader` (header de conteúdo DLS) | [`reference/common/screenHeader/screenHeader.md`](reference/common/screenHeader/screenHeader.md) |
| `footerParams` (footer fixo) | [`reference/common/footerParams/footerParams.md`](reference/common/footerParams/footerParams.md) |
| `internalFooterDLS` (footer inline com rating) | [`reference/common/internalFooterDLS/internalFooterDLS.md`](reference/common/internalFooterDLS/internalFooterDLS.md) |
| `screenParams` (estilo da tela) | [`reference/common/screenParams/screenParams.md`](reference/common/screenParams/screenParams.md) |
| `overlayParams` (bottomsheets/overlays) | [`reference/common/overlayParams/overlayParams.md`](reference/common/overlayParams/overlayParams.md) |
| UX Guidelines (por template) | `reference/<Template>/ux-guidelines.md` |

> **`headerParams` vs `screenHeader`:** `headerParams` é a **barra nativa azul** no topo (título, voltar, botões de ação). `screenHeader` é um **cabeçalho de conteúdo DLS** dentro do corpo da tela (título/descrição grandes, barra de progresso, abas, mensagem inline). São complementares — uma tela pode ter os dois.

---

## Dicas gerais

- Use sempre `jq` para leitura progressiva — **nunca use `cat` ou `jq '.'` num schema inteiro.**
- **Validação:** rode `ajv --strict=false` ou `npx ajv-cli --strict=false` sempre. O schema usa keywords custom (`UIwidget`, `UIcollapse`, `theme`) que quebram strict.
- **Não escolha na dúvida o template mais rico.** Se a tela cabe em `CardInfoResumedDLS`, não use `CardDetailDLS`; se `ListDLS` resolve, não use `CentralDLS`.
- **Status/badge:** o enum varia por widget. `positive/negative/default` em alguns, `success/warning/critical` em outros. Sempre confira o schema.
- **Icons DLS:** Use a tool `getDlsIcons` do MCP `kodiak-mcp` passando uma query para buscar ícones válidos. A maioria dos ícones é uma **string** (nome DLS), não objeto. Não confunda com `Image` que é objeto (`uri`/`base64`).
