# Liberação do backend no Kodiak

Texto para enviar ao suporte Kodiak (equipe do HACKA/TS 2026, Desafio 1: Conecta Recife).

## Pedido

Pedimos a liberação do backend abaixo para ser chamado pelas telas do Kodiak (ambiente DEGUSTACAO).

- **URL base (HTTPS, estável):** `https://fuachbxhktf63uqhhvy3xdrdo40pkqhd.lambda-url.us-east-1.on.aws`
- **Variável sugerida:** `#server{conecta_api}` com o valor acima, sem barra no final.
- **Autenticação:** nenhuma. A API é aberta porque o Kodiak não envia cabeçalho próprio. Ela só serve dados fictícios.
- **Métodos usados:** GET e POST (sem PATCH e sem cabeçalho customizado).
- **Formato:** JSON em UTF-8. CORS liberado.

## Rotas atuais

| Rota | Uso |
|---|---|
| `GET /health` | Verificação de saúde |
| `GET /dados/cidadaos/demo` | Personas oficiais e cenários para "entrar como" |
| `GET /dados/cidadaos/{id}` | Entrar como um cidadão |
| `GET /dados/cidadaos/{id}/jornadas` | Pedidos do cidadão |
| `GET /dados/servicos/{id}` | Detalhe do serviço |
| `GET /dados/consentimentos/texto?finalidade=` | Texto do consentimento |
| `GET /dados/consentimentos/{id}?finalidade=` | Situação do consentimento |
| `POST /dados/consentimentos/{id}` | `{decisao, finalidade}` |
| `POST /dados/jornadas` | `{cidadao_id, servico_id}` |
| `GET /dados/jornadas/{id}` | Etapa atual do pedido |
| `POST /dados/jornadas/{id}/confirmar` | `{confirmar: true}` |
| `GET /dados/fixados/{id}` | Serviços fixados nos atalhos do cidadão |
| `POST /dados/fixados/{id}` | `{servico_id, fixar: true\|false}` |
| `POST /dados/eventos` | Evento de uso |
| `GET /recomendacao/visitante/home` | Home simplificada para visitante sem login |
| `GET /recomendacao/{id}/home` | Home em blocos personalizada do cidadão logado |
| `GET /recomendacao/{id}?limite=8` | Serviços sugeridos com motivo |

## Erros

Todo erro vem com status HTTP correto e o corpo `{ "erro": "codigo_curto", "mensagem": "Texto simples" }`.
Exemplo: `404 {"erro":"cidadao_nao_encontrado","mensagem":"Não encontramos o cidadão C999999. ..."}`.

## Perguntas em aberto para o suporte

1. O domínio `*.lambda-url.us-east-1.on.aws` é aceito na "Liberação de backends"? Se não for, trocamos para um domínio da AWS com CloudFront na frente.
2. `${alias.response.error}` e `${alias.response.info}` leem os campos `erro` e `mensagem` do nosso corpo de erro?
3. Pode nos enviar o item 8.7 do edital (plataforma de desenvolvimento)?
4. A liberação vale para o ambiente DEGUSTACAO ou precisamos pedir por ambiente?

## Situação desta Fase 1 (para a equipe)

- Hospedagem: AWS Lambda (função `conecta-api`, alias `live`) com Function URL. Conta `215266645826`, região `us-east-1`.
- Estado (consentimentos, pedidos, eventos) fica em `/tmp` da instância e some quando ela é trocada. O DynamoDB entra na Fase 2.
- A primeira chamada depois de ociosidade pode levar cerca de 3,5 s (carga dos dados); as seguintes respondem em 30 a 70 ms.
- Para atualizar sem mudar a URL: `backend/scripts/publicar-lambda.sh`.
- Ao fim do evento, apagar a função, o papel `conecta-api-role` e os dados do pacote.
