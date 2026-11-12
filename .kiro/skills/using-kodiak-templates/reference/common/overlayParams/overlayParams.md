# overlayParams

Parâmetros de **alertas fixados na parte inferior** da tela. Hoje o único tipo é um **bottomsheet informativo automático** (`bottomsheet-informative`) que abre junto com a tela (uma vez, ou condicionalmente via expressão).

## Estrutura

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | enum `bottomsheet-informative` | Tipo de overlay (único valor hoje). |
| `infoAuto` | object | Configuração do bottomsheet informativo (ver abaixo). |

### `infoAuto`

| Campo | Tipo | Descrição |
|---|---|---|
| `showOnInit` | string | Ativa o alerta. Aceita `"true"`/`"false"` ou expressão (ex.: `"${user.firstAccess}"`). Default `"true"`. |
| `iconDLS` | string | Ícone DLS exibido no topo. |
| `iconDLSAccessibilityLabel` | string | Descrição do ícone para leitores de tela. |
| `lead` | string | Lead (texto em caixa alta colorida) acima do título. |
| `title` | string | Título do alerta. |
| `description` | string | Descrição do alerta. |
| `primaryButtonTitle` | string | Texto do botão principal. |
| `okAction` | action | Ação do botão principal. |
| `skipValidationPrimaryButton` | boolean | Ignora validação dos campos ao tocar o primário. |
| `secondaryButtonTitle` | string | Texto do botão secundário (deixa vazio se quiser só um botão). |
| `secondaryAction` | action | Ação do botão secundário. |
| `skipValidationSecondaryButton` | boolean | Ignora validação ao tocar o secundário. |
| `inline` | boolean | Se `true`, botões lado a lado; se `false`, empilhados. |

## Dicas

- Ideal pra **tour/coach marks contextuais** (primeira vez que o usuário chega numa tela).
- Use `showOnInit` com expressão para só abrir quando fizer sentido (primeira visita, saldo baixo, promoção disponível, etc.).
- O bottomsheet não é persistente — fecha quando o usuário interage ou navega.
