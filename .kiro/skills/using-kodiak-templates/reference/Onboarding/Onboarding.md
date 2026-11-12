# Onboarding

**uiKit:** `dls`

## Quando usar

Tela de **tutorial paginado com imagem grande**. Cada tela representa uma "página" do onboarding e tem título, descrição, imagem e indicador de paginação. O fluxo entre páginas é orquestrado navegando entre diferentes configs do mesmo template.

Use quando:
- Apresentação de funcionalidade nova com múltiplos passos ilustrados.
- Boas-vindas com 2–5 telas sequenciais.

Quando **não** usar:
- Apenas uma tela de resultado/introdução → `IntroDLS`.
- Texto longo sem imagens ilustrativas → `TextDLS`.

### Layout visual

Header padrão. Na área central: uma grande **imagem ilustrativa** (geralmente 4:3 ou quadrada), abaixo `title` bold grande e centralizado e `description` em cinza, também centralizado. O indicador de paginação (`pagination`) aparece normalmente abaixo da imagem ou acima do título. Rodapé com botão de "Continuar" / "Próximo".

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `title` | string | Título da página. |
| `description` | string | Texto descritivo da página. |
| `image` | object | Imagem exibida na página (ver abaixo). |
| `pagination` | object | Controla o indicador de páginas (ver abaixo). |

### `image`

| Campo | Tipo | Descrição |
|---|---|---|
| `base64` | string | Conteúdo Base 64 da imagem. |
| `uri` | string | URL da imagem (precisa ser válida para o aplicativo). |
| `shouldTrustServers` | boolean | Confiar no servidor que hospeda a imagem (sem verificação SSL). |
| `aspectRatio` | enum `portrait / square / rounded / wide` | Formato da imagem. |
| `cache` | boolean | Se a imagem deve ser cacheada no dispositivo (aplicável com `uri`). |
| `accessibilityLabel` | string | Descrição para leitores de tela. |

### `pagination`

| Campo | Tipo | Descrição |
|---|---|---|
| `active` | boolean | Se o indicador de paginação é exibido. |
| `maxPages` | number | Número total de páginas do onboarding. |
| `actualPage` | number | Página atual (1-based). |

## Dicas

- A navegação entre páginas é feita pelos botões do `footerParams`, normalmente navegando para o próximo `configName` do onboarding.
- Mantenha `maxPages` idêntico em todas as páginas; atualize só `actualPage`.
