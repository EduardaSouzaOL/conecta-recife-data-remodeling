# Conecta Recife (equipe brotolab): guia da API no Lambda e do código-fonte

Protótipo do Desafio 1 do HACKA/TS 2026. Todos os dados são fictícios.

## 1. Onde está cada coisa

| Item | Onde |
|---|---|
| Telas no Kodiak | `kodiak://navigate?partnerName=equipe-brotolab&serviceName=hackathon-recnplay&entryPoint=conecta-login-teste` |
| API (AWS Lambda, HTTPS, região us-east-1) | https://fuachbxhktf63uqhhvy3xdrdo40pkqhd.lambda-url.us-east-1.on.aws |
| Código-fonte | `codigo-fonte.zip` (anexo deste e-mail) |
| Recomendações (opcional do desafio) | `recomendacoes.csv`, um arquivo por equipe, 89.046 cidadãos |

## 2. Como as peças se ligam

```
Cidadão (celular) -> Telas no Kodiak -> API no Lambda -> dados fictícios (BD/*.csv + estado)
```

- As telas do Kodiak não decidem nada. Toda regra (ordem dos itens, motivo, consentimento, etapas do pedido, textos) fica na API.
- A chamada à API é feita pela plataforma Kodiak, dentro do fluxo. A URL base fica numa variável por ambiente, sem valor fixo nas telas.
- A URL é pública, estável e HTTPS, como pede a "Liberação de backends" do Kodiak. Ela pertence ao alias `live` da função `conecta-api`. Publicar uma nova versão não muda a URL.

## 3. Como testar a API (sem login, CORS aberto)

Troque `$API` pela URL base acima.

```
curl $API/health
curl $API/dados/cidadaos/demo                    # 8 personas oficiais + DEMO001
curl $API/recomendacao/C007938/home              # Home em blocos da persona "Idosa"
curl $API/recomendacao/visitante/home            # Home simplificada, sem login
curl $API/dados/cidadaos/DEMO001/jornadas        # pedidos de exemplo
```

Qualquer `cidadao_id` de C000001 a C089046 funciona, inclusive quem não tem histórico. O código `visitante` representa quem não entrou na conta.

Fluxo de um pedido (agendamento nos serviços 942 e 352):
1. `POST /dados/jornadas` com `{"cidadao_id":"DEMO001","servico_id":942}` cria o pedido.
2. `PATCH /dados/jornadas/{id}` com `{"campos":{...}}` preenche. Repita até `pode_confirmar: true`.
3. `POST /dados/jornadas/{id}/confirmar` com `{"confirmar":true}` gera o protocolo fictício.
4. `POST /dados/jornadas/{id}/avaliar` com `{"nota":5}` ou `{"nao_consegui":true}`.

Para a demonstração:
- `J-DEMO0001` é um pedido em andamento. `POST /demo/jornadas/J-DEMO0001/avancar` muda de etapa ao vivo.
- `POST /demo/reiniciar` devolve a DEMO001 ao estado inicial.

Contrato completo de todas as rotas (entrada, saída e erros): `API.md`, dentro do zip.

## 4. O que tem no código-fonte

```
backend/
  src/dados/         motor de dados: CSV, perfil, consentimento, jornada, estado
  src/recomendacao/  motor de recomendação: regras, pontuação, diversidade, motivos
  src/api/           só HTTP: servidor local, adaptador do Lambda, rotas
  scripts/           derivar, gerar-recomendacoes, empacotar, publicar-lambda
  test/              testes automáticos
  tools/painel.html  painel de teste manual
API.md  README.md  docs/  .kiro/specs/   documentação, requisitos e design
```

Regra de dependência: `api` -> `recomendacao` -> `dados`. Node 20 ou mais novo, sem dependências externas.

Os dados do desafio (`BD/`) **não vão no zip**, porque não podem ser redistribuídos. Para rodar fora da AWS, é preciso colocar os 5 CSVs oficiais em `BD/`.

## 5. Como rodar localmente

```
cd backend
npm run derivar    # gera data/derivados.json (lê visitas_sem_login, ~157 MB)
npm start          # sobe em http://localhost:8080 (variável PORT)
npm run teste      # testes automáticos
```

Variáveis úteis: `PORT`, `BD_DIR`, `DATA_DIR`, `CORS_ORIGIN`, `EVENTOS_MAX`.

## 6. Como publicar no Lambda

Precisa de credenciais AWS e do AWS CLI.

```
cd backend
./scripts/empacotar.sh        # gera build/conecta-api.zip (código, CSVs e derivados)
./scripts/publicar-lambda.sh  # cria ou atualiza função, alias live e URL pública
```

- Runtime Node.js 22, região `us-east-1` (ou `AWS_REGION`).
- O estado (pedidos, consentimentos, preferências) fica num objeto privado no S3, indicado pela variável `ESTADO_S3`.
- Para voltar a uma versão anterior: `aws lambda update-alias --function-name conecta-api --name live --function-version <n>`.

## 7. Privacidade e limites

- Dados de saúde e de deficiência só são usados com consentimento, cada um com o seu, e podem ser revogados.
- A API não guarda CPF, nome real nem endereço, e não envia nada aos sistemas da Prefeitura.
- Os números de métricas e o estado dos pedidos são de protótipo.
- O estado é simples: dois toques no mesmo instante em instâncias diferentes podem perder um deles. Para a demonstração, isso é suficiente.
- O pacote publicado no Lambda contém os CSVs do desafio. Eles devem ser apagados ao fim do evento (excluir a função e o bucket `conecta-api-estado-<conta>`).
