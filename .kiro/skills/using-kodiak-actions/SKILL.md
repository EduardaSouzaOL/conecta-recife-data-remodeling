---
name: using-kodiak-actions
description: >
  Como usar actions no Kodiak. Use sempre que precisar definir o que acontece ao clicar
  em um botão, item de lista, card ou qualquer elemento interativo — navegação, alertas,
  compartilhamento, cópia, links, calendário, upload, analytics, etc.
---

# Skill: Using Kodiak Actions

> **Aviso:** Este arquivo é um guia de referência — não é a fonte da verdade. As actions e seus parâmetros podem ter mudado. Antes de usar qualquer action, confirme que ela existe e que os parâmetros ainda são os mesmos consultando o schema:
> ```bash
> # Listar actions disponíveis no template atual
> jq '[.definitions.actionSchema.dependencies.name.oneOf[].properties.name.enum[0]]' schema.json
>
> # Ver params de uma action específica
> jq '.definitions.actionSchema.dependencies.name.oneOf[] | select(.properties.name.enum[0] == "<actionName>") | .properties.params.properties | keys' schema.json
> ```

---

## Índice

**Actions de navegação**
- [`navigation`](#navigation) — navega para outra tela do mesmo fluxo
- [`conditionalNavigation`](#conditionalnavigation) — navegação condicional baseada em expressões
- [`startFlow`](#startflow) — inicia outro serviço Kodiak
- [`reactNavigation`](#reactnavigation) — navega para bundle React Native externo
- [`nativeNavigation`](#nativenavigation) — navega para rota nativa do app
- [`centralizadorNavigation`](#centralizadornavigation) — navegação via centralizador
- [`navigationBackground`](#navigationbackground) — executa navegação em background
- [`qrCodeReader`](#qrcodereader) — abre câmera para leitura de QR Code e navega com resultado
- [`reset`](#reset) — reinicia o fluxo voltando à primeira tela

**Actions de UI**
- [`alert`](#alert) — exibe modal de alerta
- [`showToast`](#showtoast) — exibe mensagem toast
- [`openBottomSheet`](#openbottomsheet) — abre bottom sheet configurado na tela
- [`openCalendar`](#opencalendar) — abre seletor de data
- [`openFileUpload`](#openfileupload) — abre interface de upload de arquivos

**Actions utilitárias**
- [`clipboard`](#clipboard) — copia texto para área de transferência
- [`openLink`](#openlink) — abre URL no browser externo
- [`openDialer`](#opendialer) — abre discador com número pré-preenchido
- [`openMapLink`](#openmaplink) — abre mapa externo (Google Maps / Apple Maps)
- [`shareV2`](#sharev2) — compartilha arquivo ou URL
- [`barcodeReader`](#barcodereader) — leitor de código de barras
- [`barcodePDFReader`](#barcodepdf-reader) — leitor de código de barras em PDF
- [`getGeolocation`](#getgeolocation) — captura geolocalização do dispositivo
- [`reminder`](#reminder) — adiciona evento ao calendário do dispositivo
- [`backWithCallback`](#backwithcallback) — volta executando um callback
- [`trackEvent`](#trackevent) — registra evento de analytics sem navegar

**Conceitos transversais**
- [Estrutura básica](#estrutura-básica)
- [Passagem de variáveis](#passagem-de-variáveis)
- [Analytics](#analytics)

---

Actions definem o que acontece quando o usuário interage com um elemento (botão, item de lista, card, etc.). Todo elemento que suporta `action` aceita a estrutura abaixo.

## Estrutura básica

```json
{
  "name": "navigation",
  "params": { ... },
  "analytics": { "enabled": "false" }
}
```

- `name` — identificador da action (obrigatório)
- `params` — parâmetros específicos de cada action
- `analytics` — configuração de rastreamento (opcional, padrão `false`)

---

## Passagem de variáveis

Em qualquer campo string de `params`, você pode usar expressões `${}`:

- `${minhaVariavel}` — variável recebida via `requestParams` da tela anterior
- `${__context.variavel}` — variável de contexto global

---

## Actions de navegação

### `navigation`

Navega para outra tela dentro do mesmo fluxo Kodiak.

```json
{
  "name": "navigation",
  "params": {
    "configName": "nome-da-tela-destino",
    "navigationType": "default",
    "loadingType": "after-load",
    "loadingStyle": null,
    "requestParams": { "chave": "${valor}" },
    "spreadParams": [],
    "contextParams": { "chave": "valor" },
    "actionValidation": [],
    "checkAuthorization": false
  }
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `configName` | string | **Obrigatório.** `configName` exato da tela de destino |
| `navigationType` | `default` \| `replace` \| `replacePrevious` | `default`: botão de voltar funciona normalmente. `replace`: substitui a tela atual (sem voltar para ela). `replacePrevious`: substitui a tela anterior. Use `replace` em templates `PerformAction`. |
| `loadingType` | `after-load` \| `pre-load` | `after-load`: navega primeiro (padrão). `pre-load`: carrega os dados antes de navegar (exibe loading). |
| `loadingStyle` | `null` \| `bb-animation` \| `overlay` \| `feedback` | Estilo do loading. Só faz efeito com `loadingType: "pre-load"`. |
| `requestParams` | object | Parâmetros enviados para a tela destino (acessíveis via `${chave}`). |
| `spreadParams` | array | Espalha objetos existentes como parâmetros. |
| `contextParams` | object | Atualiza variáveis de contexto global (acessíveis via `${__context.chave}`). |
| `actionValidation` | array | Validações a executar antes de navegar. Se falhar, exibe alerta de erro. |
| `checkAuthorization` | boolean | Valida se o dispositivo está liberado para transações financeiras. |

**Validação de tela (`actionValidation`):**

```json
"actionValidation": [
  {
    "validation": "campoTexto.length >= 5",
    "titleErro": "Campo inválido",
    "textErro": "O campo deve ter pelo menos 5 caracteres.",
    "internalActionValidation": {
      "label": "OK",
      "action": { ... }
    }
  }
]
```

---

### `conditionalNavigation`

Navegação condicional — decide o destino em runtime com base em expressões booleanas. O primeiro `condition` que casar vence; se nenhum casar, usa `defaultConfigName`.

```json
{
  "name": "conditionalNavigation",
  "conditions": [
    {
      "condition": "${saldo.valor < 0}",
      "configName": "intro-saldo-negativo"
    },
    {
      "condition": "${saldo.valor == 0}",
      "configName": "intro-saldo-zerado"
    }
  ],
  "defaultConfigName": "central-home"
}
```

> **`conditionalNavigation` vs `Switch`:** use `conditionalNavigation` quando a decisão é simples e local a um botão/linha. Use o template `Switch` quando a decisão exige request ou é o "nó central" do fluxo.

---

### `startFlow`

Inicia outro serviço Kodiak (parceiro/serviço diferente).

```json
{
  "name": "startFlow",
  "params": {
    "partnerName": "pagamentos",
    "serviceName": "boleto",
    "entryPoint": "boleto-entrypoint",
    "shouldStartNew": false,
    "closesKodiak": false,
    "requestParams": {}
  }
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `partnerName` | string | ID do parceiro destino |
| `serviceName` | string | ID do serviço destino |
| `entryPoint` | string | Nome do entrypoint no serviço destino |
| `shouldStartNew` | boolean | Inicia em nova pilha de navegação |
| `closesKodiak` | boolean | Fecha o Kodiak após navegar (só se `shouldStartNew: true`) |

---

### `reactNavigation`

Navega para uma tela React Native fora do Kodiak (outro bundle).

```json
{
  "name": "reactNavigation",
  "params": {
    "targetBundle": "mov-react-native-login",
    "initialRoute": "MinhaRota",
    "initialParams": {},
    "spreadParams": []
  }
}
```

Callbacks recebem argumentos via `${result}` (array) ou `${result[0]}`, `${result[1]}`, etc.

---

### `nativeNavigation`

Navega para uma rota registrada no app nativo.

```json
{
  "name": "nativeNavigation",
  "params": {
    "routeName": "MinhaRotaNativa",
    "routeParams": {}
  }
}
```

---

### `centralizadorNavigation`

Navegação via centralizador.

```json
{
  "name": "centralizadorNavigation",
  "params": { ... }
}
```

---

### `navigationBackground`

Executa navegação em background sem trocar a tela atual.

```json
{
  "name": "navigationBackground",
  "params": { ... }
}
```

---

### `qrCodeReader`

Abre câmera para leitura de QR Code e executa uma ação com o resultado.

```json
{
  "name": "qrCodeReader",
  "params": {
    "paramName": "qrcode",
    "onDataReadAction": {
      "name": "navigation",
      "params": {
        "configName": "resultado-qr",
        "requestParams": { "codigo": "${qrcode}" }
      }
    },
    "customText": "Aponte a câmera para o QR Code"
  }
}
```

O valor lido fica disponível via `${qrcode}` (ou o nome definido em `paramName`).

---

### `reset`

Reinicia o fluxo atual, voltando à primeira tela.

```json
{
  "name": "reset",
  "params": { "goToFirstScreen": true }
}
```

---

## Actions de UI

### `alert`

Exibe um alerta modal com título, texto e botão.

```json
{
  "name": "alert",
  "params": {
    "title": "Atenção",
    "text": "Você tem certeza que deseja continuar?",
    "buttonLabel": "OK"
  }
}
```

---

### `showToast`

Exibe uma mensagem toast (configurada no próprio elemento do template, sem params extras).

```json
{ "name": "showToast" }
```

---

### `openBottomSheet`

Abre um bottom sheet configurado na tela.

```json
{
  "name": "openBottomSheet",
  "params": {
    "overlayType": "custom-informative"
  }
}
```

| `overlayType` | Descrição |
|---|---|
| `custom-informative` | Bottom sheet informativo personalizado |
| `selectionSheet` | Bottom sheet de seleção |

---

### `openCalendar`

Abre um seletor de data (bottom sheet com calendário). O valor selecionado fica disponível na variável definida em `name` (padrão: `selectedDate`).

```json
{
  "name": "openCalendar",
  "params": {
    "title": "Selecione uma data",
    "name": "dataSelecionada",
    "options": {
      "kind": "calendar",
      "periodSelection": false,
      "minDate": "2024-01-01",
      "maxDate": "2024-12-31",
      "disableWeekend": false
    }
  }
}
```

| `kind` | Resultado em `name` |
|---|---|
| `calendar` | String `YYYY-MM-DD` (ou objeto `{ firstSelectedDate, lastSelectedDate }` se `periodSelection: true`) |
| `month` | String `YYYY-MM-DD` |
| `year` | String `YYYY` ou `YYYY-MM-DD` |

---

### `openFileUpload`

Abre interface de upload de arquivos.

```json
{
  "name": "openFileUpload",
  "params": {
    "title": "Envie seus documentos",
    "subtitle": "Selecione os arquivos necessários",
    "onSubmitAction": {
      "name": "navigation",
      "params": { "configName": "confirmacao" }
    },
    "files": [
      {
        "name": "RG ou CNH",
        "id": "documento-id",
        "source": { "camera": true, "gallery": true, "files": false },
        "pickerConfigs": {
          "typesAvailable": { "pdf": true, "doc": false, "docx": false }
        },
        "shouldCloseModule": false
      }
    ]
  }
}
```

---

## Actions utilitárias

### `clipboard`

Copia texto para a área de transferência e exibe feedback ao usuário.

```json
{
  "name": "clipboard",
  "params": {
    "data": "${codigoCopiavel}",
    "message": "Código copiado!",
    "description": "O código foi copiado para a área de transferência.",
    "status": "success",
    "delay": 0,
    "position": "top",
    "inline": false,
    "closeButton": true,
    "iconName": "copy",
    "internalAction": null
  }
}
```

---

### `openLink`

Abre uma URL no browser externo. Pode abrir deeplinks de apps externos também.

```json
{
  "name": "openLink",
  "params": {
    "url": "https://example.com",
    "extendDebounceTime": false
  }
}
```

---

### `openDialer`

Abre o discador nativo com um número pré-preenchido.

```json
{
  "name": "openDialer",
  "params": { "url": "tel:08009290001" }
}
```

---

### `openMapLink`

Abre mapa externo (Google Maps / Apple Maps).

```json
{
  "name": "openMapLink",
  "params": { ... }
}
```

---

### `shareV2`

Compartilha um arquivo ou URL via mecanismo nativo de compartilhamento.

```json
{
  "name": "shareV2",
  "params": {
    "config": {
      "mimetype": "application/pdf",
      "fileName": "comprovante.pdf",
      "base64Content": "${pdfBase64}",
      "title": "Compartilhar comprovante",
      "message": "Segue o comprovante da operação",
      "url": ""
    }
  }
}
```

Use `base64Content` para arquivos ou `url` para links (não use os dois juntos).

> O antigo `share` está **depreciado** — sempre use `shareV2`.

---

### `barcodeReader`

Leitor de código de barras.

```json
{
  "name": "barcodeReader",
  "params": { ... }
}
```

---

### `barcodePDFReader`

Leitor de código de barras em PDF.

```json
{
  "name": "barcodePDFReader",
  "params": { ... }
}
```

---

### `getGeolocation`

Captura a geolocalização do dispositivo.

```json
{
  "name": "getGeolocation",
  "params": { ... }
}
```

---

### `reminder`

Adiciona um evento ao calendário do dispositivo.

```json
{
  "name": "reminder",
  "params": { ... }
}
```

---

### `backWithCallback`

Volta para a tela anterior executando um callback.

```json
{
  "name": "backWithCallback",
  "params": { ... }
}
```

---

### `trackEvent`

Registra um evento de analytics sem executar outra ação. Configurado via `analytics`.

```json
{
  "name": "trackEvent",
  "analytics": {
    "enabled": "true_newFormatV2",
    "eventIdentifier": "clique_botao_confirmar",
    "actionType": "CLICK"
  }
}
```

---

## Analytics

Todo action aceita um campo `analytics` opcional para rastreamento de eventos.

```json
"analytics": {
  "enabled": "false"
}
```

| `enabled` | Descrição |
|---|---|
| `false` | Sem rastreamento (padrão) |
| `true_taggingV2` | Rastreamento ativo — requer `category`, `action`, `eventName` |

**Exemplo tagueamento V2:**

```json
"analytics": {
  "enabled": "true_taggingV2",
  "category": "INTERACAO_CLIENTE",
  "action": "Clicar",
  "eventName": "Confirmar pagamento de boleto",
  "params": {}
}
```

Valores recomendados para `category`: `INTERACAO_CLIENTE`, `ERRO_CLIENTE`, `INTERACAO_SISTEMA`, `ERRO_SISTEMA`, `DECISÃO_NEGOCIAL`.
Valores recomendados para `action`: `Navegar`, `Clicar`, `Autenticar`.
