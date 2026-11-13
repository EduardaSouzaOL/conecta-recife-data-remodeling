# API do Novo Conecta Recife (protótipo, dados fictícios)

URL base: `https://fuachbxhktf63uqhhvy3xdrdo40pkqhd.lambda-url.us-east-1.on.aws`

- HTTPS, sem login, CORS aberto (`Access-Control-Allow-Origin: *`).
- Corpo e resposta em JSON (`Content-Type: application/json`).
- **Todos os campos ficam na raiz da resposta.** Não existe envelope `{"dados":...}`.
- Erro sempre no formato `{"erro":"codigo","mensagem":"texto simples em português"}`, com o status HTTP real (400, 403, 404, 405, 409, 422). Exceção: no preenchimento (`PATCH`), campo inválido volta com 200 e a lista `erros[]`.

## Para a demonstração

| O quê | Valor |
|---|---|
| Cidadã fictícia | `DEMO001` ("Ana", aparece na lista de personas do login) |
| Pedido em andamento | `J-DEMO0001`: agendamento de consulta (serviço 942), protocolo `CNX-2026-000123`, etapa 2 de 4 "Aguardando confirmação da unidade", previsão "até 2 dias úteis" |
| Pedido concluído | `J-DEMO0002`: agendamento no Cadastro Único (serviço 352), protocolo `CNX-2026-000087`, etapa 4 de 4, ainda sem avaliação |
| Sem login | código `visitante` |
| Avançar ao vivo | `POST /demo/jornadas/J-DEMO0001/avancar` (etapa 2 → 3 "Consulta confirmada") |
| Recomeçar a demo | `POST /demo/reiniciar` (volta a DEMO001 aos 2 pedidos de exemplo, no estado inicial) |

**Atenção:** no pedido confirmado, `estado` vale `"concluida"`, porque esse é o formato antigo e não foi mudado. Para mostrar na tela, use `situacao`:

| `situacao` | Significado |
|---|---|
| `preenchendo` | Pessoa ainda preenchendo |
| `em_andamento` | Confirmado e em acompanhamento |
| `concluido` | Chegou à última etapa |
| `cancelado` | Cancelado |

## Visitante (`visitante`)

- **Rotas de consulta (GET):** respondem 200, sem dados pessoais. As listas vêm vazias e as sugestões são as mais procuradas.
- **Rotas que gravam:** criar pedido, consentimento, fixar, personalização, interesses e "não me interessa" respondem `403 {"erro":"login_necessario","mensagem":"Entre na sua conta para fazer isso."}`. Nunca devolvem 500.

## Tabela de rotas

| Método | Rota | Corpo (nomes exatos) | Devolve (na raiz) |
|---|---|---|---|
| GET | `/dados/cidadaos/demo` | — | `cidadaos[]` (`cidadao_id`, `cenario`) |
| GET | `/dados/cidadaos/{id}` | — | `cidadao_id`, `nome_exibicao`, `saudacao`, `perfil`, `tem_historico`, `total_acessos`, `historico_recente[]`, `consentimento`, `consentimento_acessibilidade` (visitante: `visitante: true`, `perfil: null`) |
| GET | `/dados/cidadaos/{id}/jornadas` | — | `cidadao_id`, `jornadas[]` (`jornada_id`, `servico_id`, `servico`, `estado`, `situacao`, `etapa_atual`, `previsao`, `protocolo`, `criada_em`) |
| GET | `/dados/servicos/{id}` | — | `servico_id`, `nome`, `orgao`, `orgao_sigla`, `temas[]`, `tipo_servico`, `descricao`, `requisitos[]`, `passos[]`, `gratuito`, `nota_media`, `jornada_disponivel` |
| GET | `/recomendacao/{id}?limite=8` | — | `cidadao_id`, `base_da_personalizacao`, `explicacao_geral`, `aviso_saude`, `itens[]` (`posicao`, `servico_id`, `titulo`, `tag`, `motivo`, `tipo_servico`, `jornada_disponivel`…), convites de consentimento |
| GET | `/recomendacao/{id}/home` | — | Home em blocos: `blocos[]`, `controles[]`, `personalizacao_ativa`… |
| POST | `/dados/jornadas` | `cidadao_id`, `servico_id`; opcionais: `valor_campo` (texto ou objeto), `campo` (qual campo recebe o texto), `campos` (objeto), `idempotency_key` | pedido completo (ver "Pedido"); `retomada: true` quando devolveu um pedido que já existia |
| GET | `/dados/jornadas/{id}` | — | pedido completo (ver "Pedido") |
| PATCH | `/dados/jornadas/{id}` (ou POST, mesmo efeito) | `campos` (objeto `{"nome_do_campo":"valor"}`); opcional `tela` | pedido completo, com `erros[]` se algum valor não serviu |
| POST | `/dados/jornadas/{id}/confirmar` | `confirmar: true` | pedido completo com `protocolo`, `concluida_em`, `mensagem_final` |
| POST | `/dados/jornadas/{id}/alterar` | — | `ok`, `jornada` (pedido reaberto) |
| POST | `/dados/jornadas/{id}/cancelar` | — | `ok`, `jornada` |
| POST | `/dados/jornadas/{id}/avaliar` | `nota` (1 a 5) ou `nao_consegui: true`; opcionais `resolvido` (`sim`, `em_parte`, `nao`) e `comentario` (até 200 letras) | `ok`, `avaliacao` |
| GET | `/dados/jornadas/{id}/problema` | — | `jornada_id`, `servico`, `texto`, `canais[]` |
| POST | `/demo/jornadas/{id}/avancar` | — | `ok`, `etapa_atual`, `jornada` |
| POST | `/demo/reiniciar` | — | `ok`, `cidadao_id`, `pedidos[]` |
| GET | `/dados/busca?q=termo&limite=20` | — | `q`, `total`, `mensagem`, `itens[]` (`id`, `titulo`, `descricao`, `tipo`, `orgao`) |
| GET | `/dados/categorias` | — | `total`, `categorias[]` (`categoria_id`, `rotulo`, `total_servicos`) |
| GET | `/dados/categorias/{categoria_id}/servicos?limite=50` | — | `categoria_id`, `rotulo`, `total`, `itens[]` (`id`, `titulo`, `descricao`, `tipo`, `orgao`) |
| GET | `/recomendacao/{id}/personalizacao` | — | `cidadao_id`, `personalizacao_ativa`, `autorizou_dados_de_saude`, `rotulo`, `consentimento_saude`, `controle` |
| POST | `/recomendacao/{id}/personalizacao` | só o campo escolhido: `ativa` (`true` ou `false`) e/ou `consentimento_saude` (`concedido`, `recusado`, `revogado`) | `ok` mais os mesmos campos do GET |
| GET | `/dados/cidadaos/{id}/interesses` | — | `cidadao_id`, `interesses[]` |
| PUT | `/dados/cidadaos/{id}/interesses` | `interesses` (lista de `categoria_id`, por exemplo `["saude","animais"]`) | `ok`, `cidadao_id`, `interesses[]` |
| GET | `/dados/metricas` | — | `pedidos_criados`, `pedidos_confirmados`, `pedidos_cancelados`, `pedidos_alterados`, `avaliacoes`, `taxa_de_conclusao`, `nota_media`, `nao_consegui`, `resolvido{}`, `por_dia[]`, `desde`, `ate`, `aviso`… |
| GET | `/dados/consentimentos/{id}?finalidade=` | — | situação do consentimento (rota antiga, sem mudança) |
| POST | `/dados/consentimentos/{id}` | `decisao`, `finalidade` | (rota antiga, sem mudança) |

## Como criar um pedido (ordem certa)

1. **Criar:** a pessoa toca em "Pedir". A tela chama `POST /dados/jornadas` com `{"cidadao_id":"DEMO001","servico_id":942,"idempotency_key":"<uma chave por toque>"}`. A resposta traz `tela_atual.campos[]` com o que perguntar.
2. **Preencher:** a pessoa toca em "Continuar". A tela chama `PATCH /dados/jornadas/{id}` com `{"campos":{"unidade":"U3A"}}`. Repita até `pode_confirmar: true`.
3. **Confirmar:** a pessoa toca em "Confirmar". A tela chama `POST /dados/jornadas/{id}/confirmar` com `{"confirmar":true}`.

**Sobre o valor digitado.** O nome principal da API é `campos`, no passo 2. A criação também aceita `valor_campo`:
- **Se for texto:** o valor vai para o campo indicado em `campo`. Sem `campo`, vai para "observação" quando o serviço tem esse campo; se não tem, vai para o primeiro campo da tela atual.
- **Se for objeto:** funciona igual a `campos`.

**Toque duplo não duplica:**
- **Mesma pessoa, mesmo serviço:** se já existe um pedido aberto e não confirmado, a API devolve esse pedido com `retomada: true`.
- **Mesma `idempotency_key`:** a API sempre devolve o mesmo pedido.

Confirmar duas vezes devolve o mesmo protocolo.

Cancelar, alterar, avaliar e confirmar **não** rodam por GET: respondem `405 metodo_nao_permitido`.

## Exemplos reais (listas cortadas em 2 itens, textos longos cortados com "...")

### Pedido: `GET /dados/jornadas/J-DEMO0001`
```json
{"jornada_id":"J-DEMO0001","cidadao_id":"DEMO001","servico":{"servico_id":942,"nome":"Agendar consultas e procedimentos na Minha Unidade de Saúde","orgao":"SESAU"},
 "estado":"concluida","situacao":"em_andamento",
 "etapa_atual":{"numero":2,"total":4,"titulo":"Aguardando confirmação da unidade"},
 "etapas":[{"id":"etapa_1","titulo":"Pedido enviado","estado":"feita"},{"id":"etapa_2","titulo":"Aguardando confirmação da unidade","estado":"andamento"}],
 "previsao":"até 2 dias úteis","protocolo":"CNX-2026-000123","concluida_em":"2026-11-13T02:10:32.970Z",
 "mensagem_final":"Pedido registrado (demonstração). Seu protocolo fictício é CNX-2026-000123.",
 "unidade":{"nome":"Unidade Demo Casa Amarela (RPA 3)","endereco":"Rua da Demonstração, 100, Casa Amarela, Recife (endereço fictício)."},
 "resumo":[{"rotulo":"Onde você quer ser atendido","valor":"Unidade Demo Casa Amarela (RPA 3)"},{"rotulo":"Dia","valor":"qua, 18/11"}],
 "acoes":[{"id":"problema","rotulo":"Relatar problema","acao":{"tipo":"api","metodo":"GET","caminho":"/dados/jornadas/J-DEMO0001/problema"}},{"id":"cancelar","rotulo":"Cancelar pedido","acao":{"tipo":"api","metodo":"POST","caminho":"/dados/jornadas/J-DEMO0001/cancelar"}}],
 "pode_confirmar":false,"faltando":[],"erros":[],"tela_atual":{"id":"revisar","titulo":"Revise e confirme","revisao":true,"campos":[]}}
```
- **Campos que sempre vêm:** `resumo`, `etapas`, `etapa_atual`, `situacao`, `protocolo`, `concluida_em`, `mensagem_final`, `unidade` e `previsao`.
- **`null` enquanto não se aplica:** `protocolo`, `concluida_em` e `mensagem_final` antes de confirmar; `unidade` antes de escolher o local; `previsao` fora das etapas 2 e 3.
- **Etapas antes de confirmar:** as etapas são as telas do pedido. Depois de confirmar, são as 4 etapas do acompanhamento.
- **Estado de cada etapa:** `feita`, `andamento` ou `a_fazer`.

Erro, 404: `{"erro":"jornada_nao_encontrada","mensagem":"Não encontramos esse pedido."}`

### Criar: `POST /dados/jornadas` com `{"cidadao_id":"DEMO001","servico_id":942,"valor_campo":"U3A","idempotency_key":"doc-1"}`
```json
{"jornada_id":"J-739861D2A4","cidadao_id":"DEMO001","servico":{"servico_id":942,"nome":"Agendar consultas e procedimentos na Minha Unidade de Saúde","orgao":"SESAU"},
 "estado":"em_andamento","situacao":"preenchendo","etapa_atual":{"numero":2,"total":3,"titulo":"Escolha dia e horário"},
 "etapas":[{"id":"local","titulo":"Escolha o local","estado":"feita"},{"id":"data_hora","titulo":"Escolha dia e horário","estado":"andamento"}],
 "tela_atual":{"id":"data_hora","titulo":"Escolha dia e horário","revisao":false,"campos":[{"nome":"data","rotulo":"Dia","tipo":"select","obrigatorio":true,"opcoes":[{"valor":"2026-11-16","rotulo":"seg, 16/11"},{"valor":"2026-11-17","rotulo":"ter, 17/11"}],"valor":null,"preenchido_automaticamente":false}]},
 "campos_preenchidos":{"canal_aviso":"app","unidade":"U3A"},"faltando":["data","hora"],"erros":[],"pode_confirmar":false,
 "resumo":[{"rotulo":"Onde você quer ser atendido","valor":"Unidade Demo Casa Amarela (RPA 3)"},{"rotulo":"Como quer receber avisos","valor":"Avisar pelo app"}],
 "protocolo":null,"concluida_em":null,"mensagem_final":null,
 "unidade":{"nome":"Unidade Demo Casa Amarela (RPA 3)","endereco":"Rua da Demonstração, 100, Casa Amarela, Recife (endereço fictício)."},"previsao":null}
```
Repetido (mesma chave ou pedido aberto): `{"jornada_id":"J-739861D2A4","retomada":true, ...demais campos iguais}`

Erros:
- **Visitante, 403:** `{"erro":"login_necessario","mensagem":"Entre na sua conta para fazer isso."}`
- **Serviço que não existe, 404:** `{"erro":"servico_nao_encontrado","mensagem":"Não encontramos esse serviço."}`

### Preencher: `PATCH /dados/jornadas/{id}` com `{"campos":{"hora":"08:00"}}`
```json
{"jornada_id":"J-739861D2A4","estado":"em_andamento","faltando":[],"erros":[],"pode_confirmar":true,"etapa_atual":{"numero":3,"total":3,"titulo":"Revise e confirme"}}
```
(acima, só uma parte; vem o pedido completo). Valor inválido, 200: `"erros":[{"campo":"hora","mensagem":"Esse horário não está disponível. Escolha outro."}]`

### Confirmar: `POST /dados/jornadas/{id}/confirmar` com `{"confirmar":true}`
```json
{"jornada_id":"J-739861D2A4","estado":"concluida","situacao":"em_andamento",
 "etapa_atual":{"numero":2,"total":4,"titulo":"Aguardando confirmação da unidade"},
 "etapas":[{"id":"etapa_1","titulo":"Pedido enviado","estado":"feita"},{"id":"etapa_2","titulo":"Aguardando confirmação da unidade","estado":"andamento"}],
 "previsao":"até 2 dias úteis","protocolo":"DEMO-2026-4F97AA","concluida_em":"2026-11-13T06:10:34.694Z",
 "mensagem_final":"Pedido registrado (demonstração). Seu protocolo fictício é DEMO-2026-4F97AA.",
 "unidade":{"nome":"Unidade Demo Casa Amarela (RPA 3)","endereco":"Rua da Demonstração, 100, Casa Amarela, Recife (endereço fictício)."},
 "resumo":[{"rotulo":"Onde você quer ser atendido","valor":"Unidade Demo Casa Amarela (RPA 3)"},{"rotulo":"Dia","valor":"seg, 16/11"}]}
```
Erros:
- **Faltam dados, 422:** `{"erro":"campos_pendentes","mensagem":"Ainda faltam informações para concluir.","jornada":{...pedido completo...}}`
- **Sem `confirmar:true`, 400:** `{"erro":"confirmacao_necessaria",...}`

### Alterar: `POST /dados/jornadas/{id}/alterar`
```json
{"ok":true,"jornada":{"jornada_id":"J-739861D2A4","estado":"em_andamento","situacao":"preenchendo","protocolo":null,"...":"demais campos do pedido"}}
```
Erros:
- **Pedido ainda não confirmado, 409:** `{"erro":"jornada_encerrada","mensagem":"Só dá para alterar um pedido já concluído."}`
- **Serviço sem alteração (só 352 e 942 permitem), 422:** `{"erro":"alteracao_indisponivel",...}`

### Cancelar: `POST /dados/jornadas/{id}/cancelar`
```json
{"ok":true,"jornada":{"jornada_id":"J-739861D2A4","estado":"cancelada","situacao":"cancelado","...":"demais campos do pedido"}}
```
Erros:
- **Já encerrado, 409:** `{"erro":"jornada_encerrada","mensagem":"Este pedido já foi encerrado e não pode ser cancelado."}`
- **Por GET, 405:** `{"erro":"metodo_nao_permitido","mensagem":"Método não permitido nesta rota."}`

Quando dá para cancelar:
- **Pedido em preenchimento:** sempre.
- **Pedido em acompanhamento pela demo:** a `J-DEMO0001`, ou qualquer pedido depois de `/demo/.../avancar`, até a etapa 4.
- **Pedido recém-confirmado pelo app:** mantém as ações de antes (relatar problema, alterar, avaliar), para não mudar o comportamento atual.

O botão certo vem sempre em `acoes[]`.

### Avaliar: `POST /dados/jornadas/J-DEMO0002/avaliar` com `{"nota":5,"resolvido":"sim","comentario":"Foi rápido"}`
```json
{"ok":true,"avaliacao":{"jornada_id":"J-DEMO0002","nota":5,"resolvido":"sim","comentario":"Foi rápido","ts":"2026-11-13T06:10:34.968Z","mensagem":"Obrigado por avaliar."}}
```
Erros:
- **Nota fora de 1 a 5, 422:** `{"erro":"nota_invalida","mensagem":"Escolha uma nota de 1 a 5 ou toque em \"Não consegui\"."}`
- **`resolvido` inválido, 422:** `{"erro":"avaliacao_invalida","mensagem":"Diga se resolveu: \"sim\", \"em_parte\" ou \"nao\"."}`
- **Comentário com CPF, telefone, e-mail ou endereço, 422:** `avaliacao_invalida`.
- **Segunda vez, 409:** `{"erro":"ja_avaliada","mensagem":"Você já avaliou este pedido. Obrigado."}`
- **Antes de concluir, 409:** `jornada_nao_concluida`.

Nos pedidos acompanhados pela demo, o botão "Avaliar" só aparece em `acoes[]` na etapa 4.

### Avançar (demo): `POST /demo/jornadas/J-DEMO0001/avancar`
```json
{"ok":true,"etapa_atual":{"numero":3,"total":4,"titulo":"Consulta confirmada"},"jornada":{"...":"pedido completo"}}
```
- **Previsão na etapa 3:** a `previsao` passa a ser o dia e a hora marcados (por exemplo "qua, 18/11 às 09:00").
- **Erro na última etapa, 409:** `{"erro":"etapa_final","mensagem":"Este pedido já está na última etapa."}`
- **Erro em pedido não confirmado, 409:** `jornada_nao_concluida`.

### Reiniciar (demo): `POST /demo/reiniciar`
```json
{"ok":true,"cidadao_id":"DEMO001","pedidos":["J-DEMO0001","J-DEMO0002"]}
```

### Lista de pedidos: `GET /dados/cidadaos/DEMO001/jornadas`
```json
{"cidadao_id":"DEMO001","jornadas":[
 {"jornada_id":"J-DEMO0001","servico_id":942,"servico":"Agendar consultas e procedimentos na Minha Unidade de Saúde","estado":"concluida","protocolo":"CNX-2026-000123","criada_em":"2026-11-13T01:10:32.970Z","situacao":"em_andamento","etapa_atual":{"numero":2,"total":4,"titulo":"Aguardando confirmação da unidade"},"previsao":"até 2 dias úteis"},
 {"jornada_id":"J-DEMO0002","servico_id":352,"servico":"Realizar agendamento para atendimento do Cadastro Único (CADÚNICO)","estado":"concluida","protocolo":"CNX-2026-000087","criada_em":"2026-11-09T06:10:32.970Z","situacao":"concluido","etapa_atual":{"numero":4,"total":4,"titulo":"Atendimento realizado"},"previsao":null}]}
```
Visitante: `{"cidadao_id":"visitante","jornadas":[]}`

### Cidadão: `GET /dados/cidadaos/DEMO001`
```json
{"cidadao_id":"DEMO001","nome_exibicao":"Ana","saudacao":"Você entrou como DEMO001 (dados fictícios).","perfil":"[oculto]","tem_historico":true,"total_acessos":9,
 "historico_recente":[{"data":"2026-09-26","data_br":"26/09/2026","hora":"10:15","servico_id":953,"servico":"Ver meus agendamentos de Saúde"},{"data":"2026-09-23","data_br":"23/09/2026","hora":"07:52","servico_id":1475,"servico":"Ver meus encaminhamentos"}],
 "consentimento":{"finalidade":"saude_personalizacao","status":"pendente","usa_dados":false,"deve_pedir_agora":true,"acoes_disponiveis":["concedido"]}}
```
- **`nome_exibicao`:** é `null` nos cidadãos da base, que não têm nome.
- **Visitante:** `{"cidadao_id":"visitante","visitante":true,"nome_exibicao":"Visitante","saudacao":"Você está como visitante. Entre na sua conta para ver sugestões feitas para você.","perfil":null,"tem_historico":false,"historico_recente":[]}`
- **Erro, 404:** `{"erro":"cidadao_nao_encontrado","mensagem":"Não encontramos o cidadão C999999. Os códigos vão de C000001 a C089046."}`

### Personas: `GET /dados/cidadaos/demo`
```json
{"cidadaos":[{"cidadao_id":"C007938","cenario":"Persona oficial: Idosa"},{"cidadao_id":"C068579","cenario":"Persona oficial: Microempreendedora"}]}
```
A DEMO001 vem logo depois das 8 personas oficiais, com o cenário "Demonstração: Ana, cidadã fictícia com pedidos de exemplo".

### Serviço: `GET /dados/servicos/942`
```json
{"servico_id":942,"nome":"Agendar consultas e procedimentos na Minha Unidade de Saúde","orgao":"Secretaria de Saúde","orgao_sigla":"SESAU","temas":["Saúde"],"tipo_servico":"Agendamento",
 "descricao":"Sistema que permite realizar agendamento de atendimentos ofertados na sua unidade básic...","requisitos":["Requisitos/Documentos:","Ser residente do Recife."],
 "passos":["Para acessar esse serviço, você precisará estar logado...","No App conecta Recife, clique em Saúde..."],"gratuito":true,"nota_media":null,"jornada_disponivel":true}
```
Erro, 404: `{"erro":"servico_nao_encontrado","mensagem":"Não encontramos esse serviço."}`

### Sugestões: `GET /recomendacao/DEMO001?limite=8`
```json
{"cidadao_id":"DEMO001","base_da_personalizacao":"historico","explicacao_geral":"Montamos esta lista com o seu perfil e com os serviços que você já usou.",
 "itens":[{"posicao":1,"servico_id":953,"titulo":"Ver meus agendamentos de Saúde","orgao":"SESAU","tema":"Saúde","tipo_servico":"Agendamento","jornada_disponivel":true,"origem":"historico","tag":"Pelo seu histórico","motivo":"Quem acessou \"Ver meus encaminhamentos\" também costuma acessar este serviço."},
          {"posicao":2,"servico_id":942,"titulo":"Agendar consultas e procedimentos na Minha Unidade de Saúde","orgao":"SESAU","tema":"Saúde","tipo_servico":"Agendamento","jornada_disponivel":true,"origem":"historico","tag":"Pelo seu histórico","motivo":"Quem acessou \"Ver meus agendamentos de Saúde\" também costuma acessar este serviço."}]}
```
Visitante: mesmo formato, com `"base_da_personalizacao":"geral"` e itens "Mais usados" (`"motivo":"É um dos serviços mais usados no Conecta Recife."`).

### Busca: `GET /dados/busca?q=castracao&limite=2`
```json
{"q":"castracao","total":2,"mensagem":null,"itens":[
 {"id":34,"titulo":"Realizar castração de cães e gatos","descricao":"A castração de cães e gatos é um procedimento cirúrgico feito por médicos veterinários ...","tipo":"Agendamento","orgao":"SEDA"},
 {"id":1241,"titulo":"Agendar castração de animais adotados pelo Adota Pet","descricao":"Realização de castração de animais das espécies canina e felina, em idade entre 6 e 12 ...","tipo":"Agendamento","orgao":"UFRPE"}]}
```
- **Sem resultado (200):** `{"q":"xyzxyz","total":0,"mensagem":"Não encontramos serviços com essas palavras. Tente outra palavra.","itens":[]}`
- **Como busca:** acentos e maiúsculas não importam. Todas as palavras precisam aparecer no título ou na descrição.
- **Valores de `tipo`:** `Agendamento`, `Solicitacao` (pedido, inscrição, emissão de documento, alteração de cadastro, reserva) ou `Informacao` (o resto).

### Categorias: `GET /dados/categorias`
```json
{"total":17,"categorias":[{"categoria_id":"saude","rotulo":"Saúde","total_servicos":131},{"categoria_id":"cidadania","rotulo":"Cidadania","total_servicos":115}]}
```
As 17 que existem de verdade no catálogo (`categoria_id`: serviços):

| `categoria_id` | Serviços |
|---|---|
| `saude` | 131 |
| `cidadania` | 115 |
| `licencas-alvaras-e-permissoes` | 107 |
| `administracao-publica` | 95 |
| `pj-e-autonomo` | 81 |
| `servicos-urbanos` | 64 |
| `imoveis` | 62 |
| `mobilidade` | 47 |
| `trabalho-qualificacao` | 38 |
| `cultura-e-lazer` | 34 |
| `educacao` | 33 |
| `animais` | 30 |
| `meio-ambiente` | 30 |
| `esportes-e-bem-estar` | 18 |
| `desenv-economico` | 17 |
| `ouvidoria-e-denuncias` | 16 |
| `transparencia` | 4 |

Um serviço pode estar em mais de uma categoria.

### Serviços da categoria: `GET /dados/categorias/animais/servicos?limite=2`
```json
{"categoria_id":"animais","rotulo":"Animais","total":30,"itens":[
 {"id":34,"titulo":"Realizar castração de cães e gatos","descricao":"A castração de cães e gatos é um procedimento cirúrgico feito por médicos veterinários ...","tipo":"Agendamento","orgao":"SEDA"},
 {"id":1152,"titulo":"Conecta Patinhas","descricao":"Conecta Patinhas é um serviço que oferece teleatendimento médico-veterinário para cães ...","tipo":"Informacao","orgao":"SECTI"}]}
```
Erro, 404: `{"erro":"categoria_nao_encontrada","mensagem":"Não encontramos essa categoria. Veja a lista em /dados/categorias."}`

### Personalização: `GET /recomendacao/DEMO001/personalizacao`
```json
{"cidadao_id":"DEMO001","personalizacao_ativa":true,"autorizou_dados_de_saude":false,"rotulo":"Sugestões feitas com os seus dados: ligadas",
 "consentimento_saude":{"finalidade":"saude_personalizacao","status":"pendente","usa_dados":false,"mensagem":"Ainda não perguntamos. Enquanto isso, não usamos nenhuma informação de saúde.","deve_pedir_agora":true,"acoes_disponiveis":["concedido"]},
 "controle":{"id":"desligar_personalizacao","rotulo":"Não usar meus dados para sugestões","acao":{"tipo":"api","metodo":"POST","caminho":"/recomendacao/DEMO001/personalizacao","corpo":{"ativa":false}}}}
```
`POST` com `{"ativa":false}` → `{"ok":true,"cidadao_id":"DEMO001","personalizacao_ativa":false,"autorizou_dados_de_saude":false,"rotulo":"Sugestões feitas com os seus dados: desligadas", ...}`.

Para a autorização de saúde, envie `{"consentimento_saude":"concedido"}`, `"recusado"` ou `"revogado"`. A API muda só o campo enviado.

Erros:
- **Corpo vazio, 400:** `{"erro":"valor_invalido","mensagem":"Informe \"ativa\": true ou false."}`
- **Visitante, 403:** `login_necessario`.

### Interesses: `PUT /dados/cidadaos/DEMO001/interesses` com `{"interesses":["saude","animais"]}`
```json
{"ok":true,"cidadao_id":"DEMO001","interesses":["saude","animais"]}
```
- **Consultar:** `GET /dados/cidadaos/DEMO001/interesses` → `{"cidadao_id":"DEMO001","interesses":["saude","animais"]}`
- **Ids aceitos:** os `categoria_id` da lista de categorias.
- **Erro de tema, 400:** `{"erro":"tema_invalido","mensagem":"Tema desconhecido: foo. Veja a lista em /dados/categorias."}`
- **Visitante, 403:** `login_necessario`.

### Métricas: `GET /dados/metricas`
```json
{"desde":"2026-11-13T06:08:35.803Z","ate":"2026-11-13T06:10:33.459Z","pedidos_criados":2,"pedidos_confirmados":1,"pedidos_cancelados":2,"avaliacoes":1,
 "taxa_de_conclusao":0.5,"nota_media":5,"resolvido":{"sim":1,"em_parte":0,"nao":0},
 "por_dia":[{"dia":"2026-11-13","pedidos_criados":2,"pedidos_confirmados":1,"pedidos_cancelados":2,"pedidos_alterados":1,"avaliacoes":1}],
 "aviso":"Contagens do protótipo, com dados fictícios. Os números zeram quando o servidor reinicia."}
```
A resposta real também traz `pedidos_alterados`, `telas_puladas`, `erros_de_preenchimento`, `homes_vistas`, `homes_visitante`, `personalizacao_desligada`, `buscas`, `nao_consegui` e `rotulos{}`.

## Publicação

| Versão | Horário (UTC) | Horário (Recife) | O que entrou |
|---|---|---|---|
| 3 | 13/11/2026 05:53 | 02:53 | Prioridade 1: visitante, DEMO001, pedido sem duplicar, `valor_campo`, detalhe do pedido com etapas, ações por POST, avançar demo, GET da personalização |
| 4 | 13/11/2026 06:04 | 03:04 | Prioridade 2: busca, categorias, personalização com consentimento, interesses, métricas; estado compartilhado entre as instâncias (S3 privado) |
| 5 | 13/11/2026 06:12 | 03:12 | `/demo/reiniciar` deixa a DEMO001 só com os 2 pedidos de exemplo |

Antes de cada publicação, as 17 rotas antigas foram comparadas com as respostas salvas antes da mudança. Elas continuam iguais; só há campos novos. As únicas diferenças são:
- os textos de descrição no índice (`GET /`);
- a DEMO001 a mais na lista de personas.

**Para voltar atrás:**
- **API:** `aws lambda update-alias --function-name conecta-api --name live --function-version 2` volta para a versão de antes de hoje.
- **Código:** a branch `backup/antes-demo-api` guarda o estado anterior. As mudanças estão na branch `feature/demo-api`.

## NÃO FEITO e limites conhecidos

- **Interesses ainda não mudam as sugestões.** A rota só guarda a lista. Usar os interesses na pontuação mexeria nas sugestões de todas as personas às vésperas da demo.
- **O "pedido em andamento" tem `estado: "concluida"`.** Mudar o significado de `estado` quebraria o formato atual. Use `situacao` na tela.
- **Visitante não grava nada.** Criar pedido, consentir, fixar, personalizar e salvar interesses respondem `403 login_necessario` em vez de criar dados sem dono.
- **Relatar problema continua só com os canais** (`GET .../problema`), sem formulário. Isso não estava na lista.
- **Detalhe do serviço** (`GET /dados/servicos/{id}`) não traz as etapas do pedido. Elas vêm ao criar o pedido.
- **Estado compartilhado é simples.** Pedidos, consentimentos e preferências ficam num arquivo privado no S3, lido e gravado a cada requisição. Dois toques que gravam no mesmo milissegundo, em instâncias diferentes, podem perder um deles. Para a demo, isso é suficiente.
- **Métricas acumulam.** Elas contam também os testes desta preparação e não zeram com `/demo/reiniciar`. São guardados os últimos 5.000 eventos.
- **Bloqueio de acesso público do bucket.** Não tive permissão para reforçá-lo, mas o bucket já nasceu com os 4 bloqueios do S3 ativos (conferido).
- **Dois testes automáticos de "nichos nos atalhos"** (C007938 e C059592) já falhavam antes destas mudanças e não foram mexidos. Os outros 334 passam.
