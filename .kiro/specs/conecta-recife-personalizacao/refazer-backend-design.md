# Design: refazer o backend (Node + DynamoDB, reaproveitando o código)

Base: `refazer-backend-requisitos.md` (aprovado em 13/11/2026). Este design foi escrito depois de ler `home.js`, `store.js`, `consentimento.js`, `jornada/operacoes.js`, `jornada/telas.js`, `api/roteador.js`, `api/lambda.js` e `scripts/publicar-lambda.sh`. Não li `vitrine/*`, `derivados.js`, `regras.js` nem `carga.js` por inteiro; a migração desses módulos é por movimentação, e o plano (seção 12) prevê conferi-los antes.

## 1. O problema central: estado síncrono versus DynamoDB assíncrono

Hoje o domínio importa `store.js` e lê o estado direto, de forma síncrona:

- `home.js` e `vitrine.js` leem `preferencias[id]`.
- `consentimento.js` lê `consentimentos[id]`.
- `jornada/operacoes.js` varre `Object.values(jornadas)`.

DynamoDB é assíncrono e por chave. Trocar o `store.js` por chamadas `await` espalharia `async` por todo o domínio e quebraria o requisito 1.2 (domínio sem I/O).

**Solução: instantâneo por requisição (unit of work).**

1. A rota pede ao repositório o **instantâneo** do cidadão (`await repo.carregar(cidadao_id)`): consentimentos, preferência, favoritos e jornadas.
2. O domínio é uma função **síncrona e pura** que recebe `(instantaneo, catalogo, derivados, entrada)` e devolve `{ resultado, comandos[] }`.
3. A rota entrega os comandos ao repositório (`await repo.gravar(comandos)`) e passa o resultado à apresentação.

Os comandos são dados simples, por exemplo `{ tipo: 'consentimento.registrar', cidadao_id, finalidade, status, versao_texto }`. Isso mantém `temConsentimentoSaude(id)` virando `temConsentimentoSaude(instantaneo)`, uma troca mecânica que preserva as regras e os testes golden.

## 2. Estrutura de pastas

```
backend/
  src/
    dominio/                 # puro: sem node:http, node:fs, AWS
      perfil.js              # buscarCidadao, grupos livre/saúde/acessibilidade
      consentimento.js       # regras sobre a lista de registros (sem textos)
      servicos.js            # temJornada, nicho do serviço, helpers sem formatação
      jornada/
        config.js            # telas por serviço (hoje telas.js + opcoes.js)
        validacao.js
        maquina.js           # iniciar, preencher, confirmar, cancelar, alterar, avaliar -> comandos
        acompanhamento.js    # NOVO: status e previsão simulados de 942 e 352
      recomendacao/
        regras.js derivados.js
        vitrine/ (candidatos, pontuacao, diversidade, item)
        home.js              # só SELEÇÃO: quais serviços em quais blocos
        nichos.js            # NOVO: agrupa atalhos por tema
        home-visitante.js
    apresentacao/            # único lugar com texto, rótulo, acao e erros prontos
      home.js                # títulos, por_que_vejo, banner, logo, controles
      perfil.js              # saudacao, perfil_resumo
      consentimento.js       # TEXTO_*, MENSAGENS, convites
      jornada.js             # visao, acoes-visao, rótulos
      formatos.js            # dataBR, curto, "dd.MM.aaaa"
    dados/
      catalogo/ (csv.js, carga.js)       # leitura dos CSVs: somente leitura, em memória
      estado/
        repositorio.js       # contrato (JSDoc) e fábrica por REPOSITORIO
        local.js             # memória + arquivo opcional
        dynamo.js            # DynamoDB (documento)
        comandos.js          # tipos de comando e aplicação
    api/                     # roteador.js, app.js, rotas finas, lambda.js, server.js, http-comum.js, erros.js, entrada.js
    lote/                    # derivar.js, recomendacoes.js, validar-recomendacoes.js
  scripts/                   # empacotar.sh, publicar-lambda.sh, criar-tabelas.sh (novo)
  infra/estado.yaml          # NOVO: tabelas DynamoDB (CloudFormation)
```

### Mapa de migração (o que muda de lugar)

| Hoje | Vai para | Observação |
|---|---|---|
| `dados/csv.js`, `dados/carga.js` | `dados/catalogo/` | Só move. |
| `dados/servicos.js` | `dominio/servicos.js` + `apresentacao/formatos.js` | `dataBR` e `curto` saem para a apresentação. |
| `dados/perfil.js` | `dominio/perfil.js` (busca, grupos) + `apresentacao/perfil.js` (saudação, resumo) | `cenarios()` (demo) vai para `api/demo.js`. |
| `dados/consentimento.js` | `dominio/consentimento.js` (regras) + `apresentacao/consentimento.js` (textos) | Regras passam a receber a lista de registros. |
| `dados/jornada/operacoes.js`, `acoes.js` | `dominio/jornada/maquina.js` | Deixam de mutar o estado; devolvem comandos. |
| `dados/jornada/visao.js`, `acoes-visao.js` | `apresentacao/jornada.js` | |
| `dados/jornada/telas.js`, `opcoes.js`, `validacao.js` | `dominio/jornada/config.js`, `validacao.js` | |
| `recomendacao/home.js` | `dominio/recomendacao/home.js` (seleção) + `apresentacao/home.js` (títulos, textos, ações) | `porQueVejo`, `itemDaVitrine`, `controles` vão para a apresentação. |
| `dados/store.js` | `dados/estado/` | Substituído por repositório. |
| `scripts/derivar.js` | `lote/derivar.js` | |

## 3. Contrato do repositório

```js
/** @typedef {{ consentimentos: Registro[], preferencia: Preferencia, favoritos: number[], jornadas: Jornada[] }} Instantaneo */
carregar(cidadao_id)                  // -> Promise<Instantaneo>
carregarJornada(jornada_id)           // -> Promise<{ cidadao_id, instantaneo } | null>
gravar(comandos)                      // -> Promise<void>; aplica em ordem; lança ConflitoDeVersao
registrarEventos(eventos)             // -> Promise<void>; nunca derruba a requisição (erro vira log)
resumoDeEventos()                     // -> Promise<Resumo>
```

Comandos (puros, serializáveis):

| Comando | Efeito |
|---|---|
| `consentimento.registrar` | Anexa registro `{ finalidade, status, ts, versao_texto }`. |
| `preferencia.definir` | `personalizar` e/ou adiciona a `dispensados`. |
| `favorito.adicionar` / `favorito.remover` | Mantém "Salvos". |
| `jornada.criar` | Cria solicitação `em_andamento`. Falha se já existe uma ativa para o par cidadão e serviço. |
| `jornada.atualizar` | Grava `campos`, `auto`, `estado`, `protocolo`, `avaliacao`, `problema`. Exige `versao` esperada. |

`registrarEventos` fica separado de `gravar` de propósito: perder um evento não pode impedir uma conclusão de serviço.

## 4. Tabelas DynamoDB

Capacidade sob demanda (`PAY_PER_REQUEST`). Prefixo `conecta_` (variável `TABELA_PREFIXO`).

| Tabela | PK | SK | Atributos | Observações |
|---|---|---|---|---|
| `conecta_consentimentos` | `cidadao_id` | `finalidade#ts` | `status`, `versao_texto` | Status atual = último item da finalidade (`begins_with`, ordem inversa, limite 1). Só anexa, nunca altera. |
| `conecta_preferencias` | `cidadao_id` | `pref` | `personalizar`, `dispensados` (conjunto), `blocos_desligados` | Um item por cidadão. |
| `conecta_favoritos` | `cidadao_id` | `servico_id` | `salvo_em` | Um item por favorito. |
| `conecta_jornadas` | `cidadao_id` | `jornada#servico_id#ts` | `jornada_id`, `servico_id`, `estado`, `campos`, `auto`, `protocolo`, `versao`, `criada_em`, `atualizada_em`, `concluida_em`, `avaliacao`, `problemas[]`, `ttl` | GSI `por_id` (PK `jornada_id`). Item de trava `lock#servico_id` por pedido ativo (ver seção 5). |
| `conecta_eventos` | `cidadao_id` (ou `anon#AAAA-MM-DD` para visitante) | `ts#tipo#aleatorio` | campos do evento | `ttl` de 30 dias. Sem texto livre. |
| `conecta_metricas` | `dia#AAAA-MM-DD` | `tipo#servico_id#etapa` | `n` (contador) | Atualização atômica `ADD n`. Alimenta o resumo agregado sem varrer eventos. |

Dados de saúde e de acessibilidade **não** entram em nenhuma tabela. Só o consentimento é gravado (requisito 3.4).

Os dados estáticos continuam em memória, carregados do pacote: `cidadaos`, `historico`, `servicos`, `uso_semanal` e `derivados.json`. `visitas_sem_login` não vai no pacote.

### Leitura do instantâneo

Uma requisição de Home faz 4 consultas em paralelo (`Promise.all`): consentimentos, preferência, favoritos e jornadas do cidadão. Todas são por chave de partição, sem varredura.

## 5. Idempotência e concorrência

O Kodiak não envia cabeçalho personalizado (nota em `liberacao-backend-kodiak.md`), então a idempotência vem de chaves naturais, e não de um token enviado pela tela.

| Ação | Garantia |
|---|---|
| Iniciar jornada | `TransactWriteItems` com o item `jornada` e o item de trava `lock#servico_id`, com `attribute_not_exists`. Repetir devolve a jornada em andamento (`retomada: true`), comportamento atual. O lock é removido ao concluir ou cancelar. |
| Preencher campos | Atualização condicionada a `versao = :esperada`. Conflito devolve `409 conflito_de_versao`, e a tela refaz a leitura. |
| Confirmar | Condição `estado = em_andamento`. Se já está `concluida`, devolve `ja_concluida: true` com o mesmo protocolo (comportamento atual). O protocolo é gravado na mesma operação que muda o estado. |
| Cancelar e alterar | Condição `estado = em_andamento`. Repetir devolve o estado atual sem novo evento. |
| Avaliar | Condição `attribute_not_exists(avaliacao)`. Repetir devolve a nota já gravada. |
| Eventos de mudança de estado | Só são emitidos quando o comando teve efeito. Repetição não gera evento nem contador. |

## 6. Interface da Home (acréscimos ao contrato)

Resposta de `GET /recomendacao/{id}/home`. Os campos atuais ficam. Entram:

```jsonc
{
  "perfil": "logado",
  "cidadao_id": "C007938",
  "personalizacao_ativa": true,
  "base_da_personalizacao": "historico",
  "controles": [ /* igual hoje */ ],

  // NOVO: só existe se houver pedido em 942 ou 352 ainda aberto (omitido se vazio)
  "acompanhamento": [{
    "jornada_id": "J-AB12CD34EF",
    "servico_id": 942,
    "titulo": "Agendar consultas e procedimentos",
    "descricao": "Consulta solicitada. Aguarde a confirmação da sua unidade de saúde.",
    "status": "Consulta solicitada",
    "etapa": 2,
    "total_etapas": 3,
    "previsao_texto": "Previsão de confirmação: 12.10.2026 a 12.01.2027",
    "previsao_simulada": true,
    "aviso_simulacao": "Previsão simulada",
    "logo": { "tipo": "sigla", "valor": "SESAU" },
    "rotulo_ver_detalhes": "Ver detalhes",
    "rotulo_leitor": "Ver detalhes do pedido de consulta, status: consulta solicitada",
    "acao": { "tipo": "abrir_jornada", "jornada_id": "J-AB12CD34EF" }
  }],

  "blocos": [{
    "id": "atalhos",
    "grupo": "atalhos",
    "titulo": "Seus atalhos",
    "itens": [ /* até 3, igual hoje, compatível */ ],

    // NOVO: atalhos por nicho (tema do serviço), só nichos usados pela pessoa
    "nichos": [{
      "id": "saude",
      "titulo": "Saúde",
      "filtro": "Saúde",
      "aberto": true,
      "rotulo_leitor": "Grupo Saúde, 3 serviços",
      "itens": [{
        "posicao": 1,
        "servico_id": 953,
        "titulo": "Agendar consulta",
        "orgao": "SESAU",
        "motivo": "Você já usou este serviço.",
        "por_que_vejo": { "texto": "...", "dados_usados": [] },
        "logo": { "tipo": "sigla", "valor": "SESAU" },
        "rotulo_leitor": "Abrir Agendar consulta",
        "acao": { "tipo": "abrir_banner", "servico_id": 953 },
        "banner": {
          "titulo": "Agendar consulta",
          "texto": "Marque sua consulta pela internet, sem fila.",
          "rotulo_botao": "Agende aqui",
          "rotulo_leitor": "Agendar consulta, abrir a página do serviço",
          "acao": { "tipo": "abrir_servico", "servico_id": 953 }
        }
      }]
    }],
    "filtros": [{ "id": "todos", "rotulo": "Todos" }, { "id": "saude", "rotulo": "Saúde" }]
  }]
}
```

Regras que ficam na API:

- **Nicho**: primeiro valor de `temas` do serviço. Só serviços já usados. Ordem: mais usado primeiro. Máximo 4 nichos, 6 itens por nicho. O título nunca vem de marcador de saúde.
- **Filtro "Todos"**: lista plana equivalente a `itens`. A tela mostra o nicho pedido sem filtrar nada por conta própria.
- **Banner**: `rotulo_botao` é "Agende aqui" se `natureza` é Agendamento, senão "Abrir serviço". `acao` é `iniciar_jornada` para 942 e 352.
- **`acao.tipo` novo `abrir_banner` e `abrir_jornada`**: a tela faz um `switch` simples sobre o tipo, como já faz hoje com `abrir_servico`.
- **Logo**: `{ tipo: 'sigla', valor: orgao_sigla }`. Ícone do DLS só onde a sigla não existir.
- **Bloco "Serviço que você pode gostar"**: é o bloco `parecidos` já existente, agora filtrando serviços já presentes em `historico`. Muda o `titulo` de "Quem é como você também usa" para "Serviço que você pode gostar". É mudança de valor, não de estrutura. **Confirmar com você** (seção 13).

`GET /recomendacao/visitante/home` não muda.

### Novas rotas (acréscimos)

| Rota | Uso |
|---|---|
| `POST /dados/cidadaos/{id}/entrar` | Grava `entrou_como`. O `GET /dados/cidadaos/{id}` deixa de gravar evento. |
| `POST /dados/favoritos/{id}` | `{ servico_id, salvar: true\|false }` para "Salvos". |
| `POST /dados/eventos` | Aceita os tipos novos `banner_aberto` e `filtro_aplicado`. |

Cada rota nova ganha uma seção no `contrato-das-apis.md` (o teste de contrato exige).

## 7. Acompanhamento simulado (942 e 352)

Módulo `dominio/jornada/acompanhamento.js`. Entrada: jornada, data de referência. Saída: `{ status_id, etapa, total_etapas, previsao: { inicio, fim } | null }`.

| Serviço | Estado da jornada | Status (apresentação) | Previsão |
|---|---|---|---|
| 942 | `em_andamento` | "Aguardando solicitação" | nenhuma (mostra o que falta) |
| 942 | `concluida`, antes da janela | "Consulta solicitada" | confirmação: janela simulada |
| 942 | `concluida`, janela já iniciada | "Consulta confirmada" | nenhuma |
| 352 | `em_andamento` | "Pedido em andamento" | nenhuma |
| 352 | `concluida`, antes da janela | "Atendimento solicitado" | confirmação: janela simulada |
| 352 | `concluida`, janela já iniciada | "Atendimento confirmado" | nenhuma |
| qualquer | `cancelada` | não aparece | |

Regras da simulação:

- A janela é `[início + dias_min + desvio, início + dias_max + desvio]`. Os intervalos ficam em configuração, por serviço. O `desvio` é `hash(cidadao_id + servico_id) % 3` dias, para o mesmo cidadão ver sempre o mesmo prazo.
- `início` é `concluida_em`. A data de referência vem de `DATA_REFERENCIA` (padrão: hoje). Em demo, `?hoje=AAAA-MM-DD` na Home sobrescreve a data de referência apenas quando `MODO_DEMO=true`.
- O card "Consulta confirmada" depois da janela deixa de ser acompanhamento (some do bloco), porque o pedido está resolvido. O requisito 11.3.4 cita "Concluída" como quarto status; este design o usa só na tela de detalhe da jornada.
- Todo texto de previsão traz "Previsão simulada" (requisito 5.14). Nenhum texto cita saúde, exame, diagnóstico ou resultado.

## 8. Eventos e medição

- Os eventos de estado (`jornada_iniciada`, `etapa_concluida`, `tela_pulada`, `jornada_concluida`, `problema_relatado`, `nota`, `abandono`) saem do domínio como parte do resultado, só quando o comando teve efeito.
- **`item_exibido`** não vira um item por card. A Home grava **um** evento `home_vista` com `itens: [servico_id...]` e incrementa um contador por serviço e bloco em `conecta_metricas`. Isso limita a escrita a 1 evento por visita. A medição fica equivalente ao requisito 11.5.1. **Desvio consciente do texto do requisito; confirmar** (seção 13).
- **Abandono**: jornada `em_andamento` sem atualização há mais de N horas (configurável, padrão 24). É calculado no resumo, sem tarefa agendada.
- `GET /dados/eventos/resumo` lê `conecta_metricas` e devolve conclusão, abandono por etapa e nota média.
- Sem texto livre. `problemas[]` guarda só tipo e etapa, nunca o texto digitado.

## 9. Lambda, pacote e variáveis de ambiente

| Variável | Valor | Uso |
|---|---|---|
| `REPOSITORIO` | `dynamo` (produção) ou `local` | Escolhe a implementação. |
| `TABELA_PREFIXO` | `conecta_` | Nome das tabelas. |
| `BD_DIR`, `DATA_DIR` | como hoje | Catálogo e derivados. |
| `DATA_REFERENCIA` | opcional | Data da simulação. |
| `MODO_DEMO` | `true` na demo | Habilita `?hoje=`. |
| `EVENTOS_TTL_DIAS` | `30` | TTL de eventos. |

- **SDK**: o runtime `nodejs22.x` já traz o AWS SDK v3. `dados/estado/dynamo.js` importa `@aws-sdk/client-dynamodb` e `@aws-sdk/lib-dynamodb` só quando `REPOSITORIO=dynamo`. O pacote `.zip` continua sem dependências. Os pacotes entram como `devDependencies` apenas para testar localmente.
- **Pacote**: continua com `src/`, 4 CSVs em `bd/` e `derivados.json`; sem `visitas_sem_login`. O `empacotar.sh` ganha a conferência de que não há `estado.json`.
- **Inicialização**: o cache atual (`pronto`) continua. Cliente DynamoDB criado uma vez por instância. Medi o cold start de ~3,5 s no documento de liberação; esta refação não pretende piorar isso e não o melhora.
- **Permissões**: política em linha no papel `conecta-api-role`, só para as 6 tabelas e o índice `por_id`: `GetItem`, `Query`, `PutItem`, `UpdateItem`, `TransactWriteItems`, `BatchWriteItem`. Sem `Scan`, sem `*`.
- O handler deixa de chamar `salvarLogo()`. A gravação já acontece em cada requisição, antes da resposta.

## 10. Infraestrutura

- `infra/estado.yaml` (CloudFormation): as 6 tabelas, o GSI, TTL em `eventos` e `jornadas`, tag `projeto=hackats-conecta-recife`, sem retenção. Pilha `conecta-estado`.
- `scripts/criar-tabelas.sh`: cria ou atualiza a pilha e é idempotente.
- Apagar tudo ao fim do evento: `aws cloudformation delete-stack --stack-name conecta-estado`, mais a função e o papel (já documentado).

### Estratégia de publicação (protege o que o Kodiak já consome)

1. Criar a pilha de tabelas (não afeta a API atual).
2. Anexar a política DynamoDB ao papel (acréscimo, não remove nada).
3. Publicar a nova versão **sem mover o alias `live`**: criar o alias `canario` com Function URL própria e `REPOSITORIO=dynamo`.
4. Rodar os testes de fumaça na URL do canário (Home de 3 personas, jornada 942 de ponta a ponta, consentimento, resumo).
5. Só então mover `live` para a nova versão. **Reversão**: apontar `live` de volta para a versão anterior (`update-alias`), sem perder a URL.

Cada passo que cria ou altera recursos AWS exige a sua confirmação antes de eu executar.

## 11. Testes

- **Golden** (`golden-http`, `golden-adaptadores`, `golden-vitrine`) e `contrato.test.js`: continuam sendo a rede de segurança. As fixtures mudam apenas onde o design diz que muda (campos novos na Home, evento do `GET /dados/cidadaos/{id}`), com revisão do diff.
- **Contrato do repositório**: a mesma suíte roda contra `local` e `dynamo` (este com um cliente DynamoDB falso em memória, que implementa as operações usadas). Cobre idempotência, conflito de versão e trava de jornada ativa.
- **Camadas**: um teste varre os imports de `dominio/` e falha se houver `node:http`, `node:fs`, `@aws-sdk` ou importação de `api/` e `apresentacao/` (requisito 1.2).
- **Privacidade**: testes existentes de saúde e acessibilidade continuam; novos testes garantem que nenhum campo de saúde ou deficiência aparece em `nichos`, `acompanhamento`, nem em eventos.
- **Home nova**: nicho sem uso é omitido; nicho derivado só de uso; `acompanhamento` só para 942 e 352; previsão determinística (mesmo cidadão, mesma janela); serviço já usado fora do bloco "pode gostar".
- **Fumaça real** (manual, com sua confirmação): contra tabelas com prefixo `conecta_teste_`, depois removidas.

## 12. Ordem de execução (insumo para `tasks.md`)

1. Ler `vitrine/*`, `derivados.js`, `regras.js`, `carga.js` e confirmar que o mapa de migração está completo.
2. Criar o contrato do repositório, a implementação `local` e o padrão de instantâneo e comandos. Migrar `consentimento`, `preferencias` e `jornada` sem mudar comportamento. Golden verdes.
3. Separar as camadas (`dominio/` e `apresentacao/`), com o teste de imports.
4. Implementar `dynamo.js`, `infra/estado.yaml`, política IAM e a suíte de contrato do repositório.
5. Acrescentar nichos, banner, logo e `acompanhamento` na Home, com novas rotas e atualização do `contrato-das-apis.md`.
6. Eventos compactos e `conecta_metricas`; resumo agregado.
7. Lote `recomendacoes.csv` com validação.
8. Publicação por canário e troca do alias `live`.

## 13. Decisões para você confirmar

1. **Título do bloco `parecidos`**: trocar "Quem é como você também usa" por "Serviço que você pode gostar", como na pesquisa?
2. **`item_exibido` compacto** (um evento `home_vista` com a lista + contadores) em vez de um item por card, para não multiplicar escritas?
3. **Demo do acompanhamento**: aceitar `?hoje=AAAA-MM-DD` (só com `MODO_DEMO=true`) para mostrar a passagem de "Consulta solicitada" para "Consulta confirmada" sem esperar dias?
4. **SDK pelo runtime** da Lambda (zip sem dependências) em vez de empacotar o SDK?
5. **Publicação por canário** (alias `canario` com URL própria antes de mover `live`)? Isso cria uma segunda Function URL pública temporária.

## 14. O que este design não resolve

- Cold start de ~3,5 s por carregar 593 mil linhas de histórico: fica como está.
- Itens 8.7 do edital e "Liberação de backends": se o suporte do Kodiak recusar o domínio `lambda-url`, é preciso CloudFront na frente (pergunta já registrada em `liberacao-backend-kodiak.md`).
- Os intervalos de previsão (dias mínimo e máximo por serviço) são valores inventados para a demonstração.
