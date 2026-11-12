# ReceiptDLS

**uiKit:** `dls`

## Quando usar

Tela de **comprovante de transação** (recibo). Estrutura dedicada com cabeçalho (ícone + valor + data), seções de linhas (de → para, dados da operação), autenticação, QR code e rodapé padronizado BB.

Casos típicos:
- Comprovante de transferência, pagamento, Pix, depósito.
- Recibos de operações concluídas com sucesso.
- Contains watermark / autenticação / QR de validação.

Substituto DLS do antigo `Receipt`.

### Layout visual

**Sem header azul padrão** — no lugar, o logo do BB fica no topo à esquerda. Abaixo, `Título do comprovante` bold e `Parágrafo auxiliar`, seguido por `Valor` em **azul grande e em destaque** e `Data e hora` em cinza. Em seguida, blocos repetíveis de `Título de seção` (cinza, pequeno) + `Título de destaque` (bold) + múltiplas linhas `Label ......... Value` alinhadas nas bordas. Footer amarelo com CTA ("AÇÃO PRIMÁRIA").

Quando **não** usar:
- Ainda não foi concluído / precisa de confirmação do usuário → `IntroDLS` (sucesso) + `ReceiptDLS` depois.
- Visão de pedido em andamento (delivery/tracking) → `DeliveryDetails` / `TrackingDLS`.

## `templateParams`

| Campo | Tipo | Descrição |
|---|---|---|
| `receiptHeader` | object | Cabeçalho do comprovante. |
| `receiptContentLineSections` | array | Seções de linhas (de → para, valor, datas, etc.). |
| `receiptMessageBox` | object | Caixa de mensagem destacada. |
| `additionalSection` | object | Seção adicional customizável. |
| `receiptAdditionalParagraphs` | array | Parágrafos de observações/informações adicionais. |
| `receiptFooter` | object | Rodapé do comprovante (dois parágrafos). |
| `infoCard` | object | Cartão de informações destacado. |
| `qrCodeCard` | object | Cartão de QR code (autenticação, documento, notificação). |
| `waterMark` | object | Marca d'água (tamanho controlável). |
| `__iterables` | array | Popula seções dinamicamente. |

### `receiptHeader`
`title`, `description`, `descriptionIcon`, `icon`, `imageBBFull`, `value`, `dateTime`.

### `receiptContentLineSections[i]`
`title`, `sectionTitle`, `items` (linhas no formato do `ListDLS`).

### `receiptMessageBox`
`message`.

### `additionalSection`
`title`, `captions` (array).

### `receiptFooter`
`paragraphOne`, `paragraphTwo`.

### `infoCard`
`title`, `description`, `iconName`, `buttonGroup`, `onPressCard`, `onClose`.

### `qrCodeCard`
`title`, `image`, `authenticationTitle` / `authenticationDescription`, `documentTitle` / `documentDescription`, `notificationTitle` / `notificationDescription`.

### `waterMark`
`waterMarkWidth`, `waterMarkHeight`.

## Dicas

- Use `receiptHeader.imageBBFull` para o logo padrão no topo em comprovantes oficiais.
- O `qrCodeCard` costuma conter o código de autenticação — use `image` para o QR e os 3 pares `*Title/*Description` para as três áreas textuais.
