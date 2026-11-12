# PerformAction

**uiKit:** Nenhum

## Quando usar

Template **sem renderização** que apenas dispara uma ação (navegar, copiar, compartilhar, abrir link, etc.) e é usado como nó intermediário em um fluxo.

Casos típicos:
- Disparar `share`, `openLink`, `openDialer`, `openCalendar`, `clipboard` e retornar ao fluxo.
- Executar `trackEvent` antes da próxima tela.
- Fazer uma navegação condicional encadeada.

**Importante:** a navegação para esta tela deve usar tipo de carregamento **`Carrega primeiro (exibe loading)`** — caso contrário, a ação pode não executar corretamente. O mesmo vale se você chegar nela via `Switch`.

Quando **não** usar:
- Decisões baseadas em condição → `Switch`.
- Ação executada a partir de um botão na própria tela do usuário → configure `action` direto no `footerParams.mainButton` / item clicável.

## `templateParams`

`PerformAction` não usa `templateParams`. A ação fica em `parameters.performAction.action`.

### `parameters.performAction.action`

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | enum (ver abaixo) | Tipo da ação. **Obrigatório.** |
| `analytics` | object | Config de tracking (opcional). |
| ... | — | Os demais campos dependem de `name` (ex.: `configName` para `navigation`, `text` para `clipboard`, `url` para `openLink`). |

### Valores aceitos em `action.name`

| Valor | Rótulo |
|---|---|
| `navigation` | Navegar |
| `startFlow` | Iniciar Fluxo |
| `alert` | Alertar |
| `shareV2` | Compartilhar |
| `reset` | Reiniciar |
| `clipboard` | Copiar |
| `openLink` | Abrir Link |
| `openDialer` | Abrir Discador |
| `openCalendar` | Abrir calendário DLS |
| `barcodeReader` | Ler código de barras |
| `barcodePDFReader` | Código de barras PDF |
| `openMapLink` | Abrir mapa |
| `reminder` | Adicionar evento na agenda |
| `backWithCallback` | Voltar |
| `openBottomSheet` | Abrir BottomSheet |
| `showToast` | Abrir Toast |
| `navigationBackground` | Ação após navegação em background |
| `conditionalNavigation` | Ação Condicional |
| `reactNavigation` | Navegação ReactNative |
| `centralizadorNavigation` | Navegação Centralizador |
| `qrCodeReader` | Leitor de QRCode |
| `getGeolocation` | Geolocalização |
| `trackEvent` | Rastrear Evento Customizado |
| `nativeNavigation` | Navegação Nativa |
| `openFileUpload` | Envio de arquivos |
| `share` | Compartilhar (**depreciado** — use `shareV2`) |
