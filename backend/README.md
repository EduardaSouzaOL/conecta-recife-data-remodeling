# Backend Conecta Recife

API única, em Node 20+, sem dependências. O Kodiak chama **só dois motores**.

```
src/
  dados/          MOTOR DE DADOS (fonte da verdade)
    csv.js          leitor de CSV
    carga.js        carrega BD/*.csv na memória (cidadãos, histórico, serviços)
    servicos.js     detalhe do serviço, temJornada, formatadores
    perfil.js       "entrar como", personas e cenários de demonstração
    consentimento.js  saúde e acessibilidade, separados
    jornada/        pedido por etapas até o protocolo fictício (opcoes, telas, validacao, visao, operacoes)
    store.js        estado (consentimentos, jornadas, eventos) em data/estado.json
  recomendacao/   MOTOR DE RECOMENDAÇÃO (usa o motor de dados, nunca o contrário)
    derivados.js    pré-cálculo: próximo serviço, populares por perfil, demanda
    regras.js       regras de perfil, saúde e acessibilidade
    vitrine.js      pontua, diversifica e explica cada item
  api/            só HTTP (sem regra de negócio)
    server.js, lambda.js, app.js, roteador.js, erros.js, entrada.js, http-comum.js, indice.js
    rotas/          um módulo por área: cidadaos, servicos, consentimentos, jornadas, eventos, recomendacao
tools/painel.html painel de teste manual (GET /painel), não faz parte do Kodiak
scripts/derivar.js  regera data/derivados.json
test/             npm run teste
```

Regra de dependência: `api` → `recomendacao` → `dados`. `dados` não importa de mais ninguém.

## Rotas

Contrato completo (entrada, saída, erros, efeitos colaterais e itens legados de cada endpoint): [`.kiro/specs/refatorar-clareza-apis/contrato-das-apis.md`](../.kiro/specs/refatorar-clareza-apis/contrato-das-apis.md). Ao criar uma rota, crie a seção no contrato; um teste confere.

Resumo do motor de dados (`/dados`):
- `GET /dados/cidadaos/demo` personas oficiais e cenários
- `GET /dados/cidadaos/{id}` entrar como
- `GET /dados/cidadaos/{id}/jornadas` pedidos do cidadão
- `GET /dados/servicos/{id}` detalhe do serviço
- `GET /dados/consentimentos/texto?finalidade=` texto do consentimento
- `GET /dados/consentimentos/{id}?finalidade=` situação
- `POST /dados/consentimentos/{id}` `{decisao, finalidade}` (concedido, recusado, revogado)
- `POST /dados/jornadas` `{cidadao_id, servico_id}`; `GET` e `PATCH /dados/jornadas/{id}`; `POST /dados/jornadas/{id}/confirmar` `{confirmar:true}`
- `POST /dados/eventos`; `GET /dados/eventos/resumo`

Motor de recomendação:
- `GET` ou `POST /recomendacao/{id}?limite=8`

Fora dos motores: `GET /health`, `GET /` (índice).

Erros: `{ "erro": "codigo", "mensagem": "texto simples" }` com status 400, 404, 405, 409 ou 422. O Kodiak trata com tela de erro customizada.

## Rodar

```
npm start            # PORT (padrão 8080), BD_DIR, DATA_DIR, CORS_ORIGIN, EVENTOS_MAX
npm run derivar      # regera data/derivados.json (lê visitas_sem_login, ~157 MB)
npm run teste
```

## O que foi removido na refatoração
Rotas sem prefixo (`/vitrine`, `/entrar`, `/consentimento`, `/jornadas`, `/servicos`, `/eventos`), métodos duplicados (PUT, `POST /entrar`), eventos de voz e funções sem uso.

## Publicar na AWS (Lambda com Function URL)

```
./scripts/empacotar.sh         # gera build/conecta-api.zip (src, 4 CSVs, derivados.json)
./scripts/publicar-lambda.sh   # cria ou atualiza a função, o alias live e a URL pública
```

- O adaptador é `src/api/lambda.js` (mesmo roteador do servidor). Região: `AWS_REGION` (padrão `us-east-1`).
- Rode `npm run derivar` antes se `data/derivados.json` não existir. O Lambda nunca regera os derivados.
- A URL não muda nas publicações seguintes (a função é atualizada, não recriada).
- Estado em `/tmp/data`: some quando a instância é trocada (Fase 1).
- Detalhes e decisão: `.kiro/specs/conecta-recife-personalizacao/design.md`, seção 13.0.
