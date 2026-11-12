---
name: using-kodiak-requests
description: >
  Como configurar requisições HTTP no Kodiak usando `__requests`. Use quando o usuário
  precisar buscar dados de APIs externas ao carregar uma tela, configurar params,
  customHeaders, isSensitive, ou referenciar o resultado via alias em iteráveis ou campos.
---

# Skill: Using Kodiak Requests

Requisições permitem buscar dados de APIs externas quando a tela é carregada. O resultado fica disponível na tela pelo `alias` definido — que pode ser usado como `datasource` em iteráveis ou como variável em qualquer campo com `${}`.

---

## Onde fica

As requisições ficam no campo `__requests`, dentro de `parameters` (mesmo nível de `templateParams`, `headerParams`, etc.):

```json
{
  "parameters": {
    "__requests": [ ... ],
    "templateParams": { ... }
  }
}
```

---

## Estrutura de uma requisição

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `url` | string | sim | Endpoint completo ou relativo. Aceita bindings (`"${baseUrl}/produtos"`). |
| `method` | enum `GET / POST / PUT / DELETE` | — | Método HTTP (padrão: `GET`). |
| `alias` | string | sim | Nome usado para referenciar o resultado (ex.: `produtosReq`). |
| `params` | object | — | Body (POST/PUT/DELETE) ou query string (GET). |
| `customHeaders` | object | — | Headers adicionais. |
| `isSensitive` | boolean | — | Oculta dos logs o valor dos parâmetros e headers personalizados. |

```json
{
  "url": "#server{baseUrl}/recurso",
  "method": "GET",
  "alias": "nome_do_resultado"
}
```

---

## params

Usado para enviar dados junto à requisição. O comportamento varia conforme o método HTTP:

- **GET / DELETE** — os campos são serializados como query string na URL: `?campo=valor&outro=${variable}`
- **POST / PUT** — os campos são enviados no body da requisição como JSON

O valor de cada campo pode ser estático ou interpolado com variáveis:

```json
"params": {
  "campo_estatico": "valor",
  "campo_dinamico": "${variavel}",
  "campo_contexto": "${__context.variavel}"
}
```

Os campos aceitam qualquer tipo suportado pelo schema: string, número, booleano, objeto ou array.

### Exemplo GET — query string

```json
{
  "url": "#server{baseUrl}/filmes",
  "method": "GET",
  "alias": "filmes",
  "params": {
    "pagina": "1",
    "limite": "20",
    "genero": "${generoSelecionado}"
  }
}
```

A requisição acima resulta em: `GET #server{baseUrl}/filmes?pagina=1&limite=20&genero=<valor>`

### Exemplo POST — body

```json
{
  "url": "#server{baseUrl}/pedidos",
  "method": "POST",
  "alias": "novo_pedido",
  "params": {
    "clienteId": "${clienteId}",
    "itens": ["item1", "item2"],
    "endereco": {
      "rua": "${rua}",
      "cidade": "${cidade}"
    }
  }
}
```

---

## customHeaders

Usado para enviar headers HTTP personalizados, como tokens de autenticação, identificadores de cliente ou qualquer header exigido pela API.

A estrutura é um objeto simples de chave-valor, onde o valor pode ser estático ou interpolado:

```json
"customHeaders": {
  "Authorization": "Bearer ${__context.token}",
  "x-api-key": "chave-fixa",
  "x-cliente-id": "${__context.clienteId}"
}
```

> **Dica de segurança:** sempre que `customHeaders` ou `params` contiverem tokens ou dados sensíveis, use `"isSensitive": true` para que esses valores não apareçam nos logs da plataforma. Isso é **obrigatório** para CPF, senha, tokens ou qualquer dado privado.

### Exemplo completo com autenticação

```json
{
  "url": "#server{baseUrl}/conta/extrato",
  "method": "GET",
  "alias": "extrato",
  "params": {
    "mes": "${mes}",
    "ano": "${ano}"
  },
  "customHeaders": {
    "Authorization": "Bearer ${__context.accessToken}",
    "x-correlation-id": "${__context.correlationId}"
  },
  "isSensitive": true
}
```

---

## Exemplos

### GET simples

```json
"__requests": [
  {
    "url": "#server{baseUrl}/produtos",
    "method": "GET",
    "alias": "lista_produtos"
  }
]
```

### GET com query string

```json
"__requests": [
  {
    "url": "#server{baseUrl}/produtos",
    "method": "GET",
    "alias": "lista_produtos",
    "params": {
      "categoria": "eletronicos",
      "pagina": "1"
    }
  }
]
```

### POST com body e header de autenticação

```json
"__requests": [
  {
    "url": "#server{baseUrl}/pedidos",
    "method": "POST",
    "alias": "resultado_pedido",
    "params": {
      "clienteId": "${clienteId}",
      "valor": "${valor}"
    },
    "customHeaders": {
      "Authorization": "Bearer ${__context.token}"
    },
    "isSensitive": true
  }
]
```

### Múltiplas requisições na mesma tela

```json
"__requests": [
  {
    "url": "#server{baseUrl}/cartaz",
    "method": "GET",
    "alias": "filmes_cartaz"
  },
  {
    "url": "#server{baseUrl}/classicos",
    "method": "GET",
    "alias": "filmes_classicos"
  }
]
```

Todas as requisições são feitas ao carregar a tela. Cada uma tem seu próprio `alias` independente.

### Exemplo com dois tipos de request

```json
[
  {
    "url": "${baseUrl}/v1/produtos/catalogo",
    "method": "GET",
    "alias": "catalogoReq",
    "params": {
      "categoria": "${selectedCategoryKey}",
      "limit": "20"
    }
  },
  {
    "url": "${baseUrl}/v1/usuario/saldo",
    "method": "POST",
    "alias": "saldoReq",
    "isSensitive": true,
    "customHeaders": {
      "X-Agencia": "${user.agencia}",
      "X-Conta": "${user.conta}"
    },
    "params": {
      "cpf": "${user.cpf}"
    }
  }
]
```

---

## Acessando o resultado

Após o request, use expressões com o `alias` definido:

| Expressão | Significa |
|---|---|
| `${alias.response}` | Corpo completo da resposta JSON. |
| `${alias.response.campo}` | Campo específico da resposta. |
| `${alias.status}` | Status HTTP (200, 404, etc.). |
| `${alias.error}` | Erro da request (se houver). |

### Como datasource de um iterável

O `alias` da requisição é usado diretamente no `datasource` do iterável. Dentro do `model`, os campos do item são acessados via `${__item.campo}`:

```json
"__iterables": [
  {
    "target": "sectionData",
    "datasource": "filmes_cartaz",
    "model": {
      "label": "${__item.nome}",
      "value": "${__item.tipo} · ${__item.ano}"
    }
  }
]
```

### Como variável em campos de texto

Se a requisição retornar um objeto simples (não um array), os campos podem ser acessados diretamente via `${alias.campo}`:

```json
{
  "url": "#server{baseUrl}/usuario",
  "method": "GET",
  "alias": "usuario"
}
```

```json
"title": "${usuario.nome}"
```

---

## Usando variáveis globais e de parceiro na URL

Para evitar URLs hardcoded, use variáveis globais (`#server{key}`) ou de parceiro (`#partner{key}`) diretamente no campo `url`:

```json
{
  "url": "#server{grafeno}/recurso",
  "method": "GET",
  "alias": "resultado"
}
```

- `#server{key}` — variável global do app (configurada por ambiente: DES, HML, PRD)
- `#partner{key}` — variável do parceiro (configurada por ambiente para o parceiro ativo)

> **Importante:** não existe campo `baseUrl` nas requisições. A variável deve ser inserida diretamente no início do campo `url`, seguida do caminho do endpoint.

---

## Passando variáveis da tela anterior

Campos de `params`, `url` e `customHeaders` aceitam interpolação com variáveis recebidas via `requestParams` ou contexto:

```json
{
  "url": "#server{baseUrl}/pedidos/${pedidoId}",
  "method": "GET",
  "alias": "detalhes_pedido"
}
```

- `${variavel}` — recebida via `requestParams` da tela anterior
- `${__context.variavel}` — variável de contexto global

---

## Dicas

- `__requests` roda **antes** da renderização — se o request falhar, a tela cai no error handler (ou no `useCustomErrorHandler`).
- Use `Switch` + `__requests` no Switch quando precisar decidir para qual tela ir baseado no resultado.
- `isSensitive: true` é **obrigatório** para requests com CPF, senha, tokens ou dados privados.
- Para o caminho de sucesso, combine com `__iterables` no template para popular listas.

---

## Como explicar para o usuário

Ao conversar com o usuário sobre requisições, não mencione JSON, schemas, campos técnicos ou estrutura interna. Fale em termos do que ele precisa informar para a tela funcionar.

**O que perguntar ao usuário:**

- **Qual o endereço da API?** — a URL do serviço que a tela vai consultar. Se o projeto já tem variáveis configuradas (como uma URL base), sugira usá-las.
- **Qual o método?** — se a tela só vai buscar dados, é uma consulta (GET). Se vai enviar algo (como um formulário), é um envio (POST). Na dúvida, pergunte o que a tela precisa fazer.
- **Precisa enviar algum dado junto?** — por exemplo, um ID, um filtro, uma data. Esses dados podem vir de uma tela anterior ou do contexto do usuário.
- **Precisa de autenticação?** — se a API exige um token ou chave, pergunte se ele tem isso disponível e onde está (contexto, variável de parceiro, etc.).
- **Como o resultado vai ser usado?** — vai preencher uma lista? Mostrar um nome? Um saldo? Isso define como o resultado será referenciado na tela.

**Como nomear o resultado:**

O resultado da requisição precisa de um nome para ser usado na tela — é como você vai chamá-lo depois. Use algo descritivo e em minúsculas, como `produtos`, `extrato`, `dados_usuario`. Se o usuário não souber, sugira um nome com base no que a requisição retorna.

**Segurança:**

Se a requisição envia dados sensíveis — como tokens ou informações pessoais — marque como sensível para que esses valores não apareçam nos registros da plataforma. Faça isso automaticamente sempre que houver headers de autenticação ou dados privados nos parâmetros.

**Múltiplas requisições:**

Uma tela pode fazer mais de uma consulta ao carregar. Todas são feitas ao mesmo tempo, cada uma com seu próprio nome de resultado. Pergunte se o usuário precisa buscar dados de mais de um lugar.
