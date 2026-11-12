# O que cada seção e botão faz (para o backend)

Formato: **PEGA** = o que chega e de onde vem o dado | **FAZ** = a regra | **MOSTRA** = o que volta para a tela | **ESTADO** = o que o backend já faz hoje.

Legenda do estado: **Feito**, **Parcial**, **Falta**.

Conferido em: `BD/servicos.csv`, `BD/cidadaos.csv`, `BD/uso_semanal.csv` e no código de `backend/src` (`api/`, `dados/`, `recomendacao/vitrine.js`, `recomendacao/regras.js`, `dados/jornada.js`). Não li `recomendacao/derivados.js` por inteiro, `dados/store.js` nem `dados/consentimento.js`.

---

## Regras gerais da API

- Todo dado é fictício. Nunca guardar CPF, nome completo real ou endereço.
- Erro de dado ou de ID vem como erro claro (código e mensagem curta), para o Kodiak abrir a tela de erro. **Feito** (`ErroHttp`).
- A URL base é variável por ambiente, sem valor fixo nas telas.
- Data de referência do protótipo: configurável (padrão 28/09/2026). **Falta**: hoje o protocolo e as datas usam o relógio do sistema.
- Toda resposta de sugestão traz `base_da_personalizacao`, com **três** valores:
  - `historico`: 3 acessos ou mais;
  - `historico_curto`: 1 ou 2 acessos (a tela explica que o perfil pesa mais);
  - `perfil`: nenhum acesso (a tela avisa que a sugestão vem do perfil).
- Nenhum bloco vazio é devolvido. No máximo 2 itens do mesmo órgão entre os 5 primeiros. **Feito** na lista (2 nos 5 primeiros, 3 nos demais).
- **Leitura de `servicos.csv`:**
  - Ler com `keep_default_na=False` (vazio = texto vazio).
  - Listas (`temas`, `publicos_alvo`, `palavras_chave`) se separam por " | ".
  - Título do card = `nome_resumido`.
  - Campo vazio = sem informação. Nunca mostrar "0" nem "nota 0".
  - `cliques_historico` vazio (320 serviços) conta como 0 só para ordenar.
  - `nota_media` vazia (756 serviços): não mostrar nota e não penalizar.
  - `passos` vazio: 112 serviços. `canal_web` vazio: 239. `prioridade_atendimento` vazio: 697.

---

## Caminhos reais da API

Os caminhos do Kodiak seguem os que já existem no backend. Os itens marcados **Falta** ainda precisam de rota.

| Função | Caminho | Estado |
|---|---|---|
| Personas e "entrar como" | `GET /dados/cidadaos/demo`, `GET /dados/cidadaos/{id}` | Feito |
| Home personalizada (lista) | `GET /recomendacao/{id}?limite=` | Parcial |
| Detalhe do serviço | `GET /dados/servicos/{id}` | Parcial |
| Consentimento | `GET/POST /dados/consentimentos/{id}?finalidade=` e `GET /dados/consentimentos/texto` | Feito |
| Iniciar jornada | `POST /dados/jornadas` | Feito |
| Ver e preencher jornada | `GET /dados/jornadas/{id}`, `PATCH /dados/jornadas/{id}` | Feito |
| Confirmar pedido | `POST /dados/jornadas/{id}/confirmar` | Parcial |
| Pedidos do cidadão | `GET /dados/cidadaos/{id}/jornadas` | Parcial |
| Eventos | `POST /dados/eventos`, `GET /dados/eventos/resumo` | Parcial |
| Home sem login | – | Falta |
| Busca | – | Falta |
| Preferências e personalização | – | Falta |
| Cancelar, alterar, relatar problema, avaliar | – | Falta |
| Canais do órgão | – | Falta |

---

## ENTRADA

### 1) ENTRAR COMO
- **PEGA:** `cidadao_id` digitado (aceita "C000001" ou só o número) ou escolhido entre as 8 personas oficiais (C007938, C068579, C059592, C036462, C039227, C076260, C006566, C062244).
- **FAZ:** lê o perfil em `cidadaos`, os consentimentos (saúde e acessibilidade) e as preferências salvas. Funciona para qualquer um dos 89.046 IDs, inclusive os 5.778 sem histórico. Se o ID não existir, devolve erro claro e permite tentar de novo. Não devolve campo de saúde nem de deficiência sem o consentimento correspondente. Grava `entrou_como`.
- **MOSTRA:** faixa etária, RPA e marcadores não sensíveis, e abre a Home. "Continuar sem entrar" abre a Home sem login. Na apresentação, permite abrir dois cidadãos lado a lado.
- **Endpoint:** `GET /dados/cidadaos/{id}` e `GET /dados/cidadaos/demo`
- **ESTADO:** **Feito.** A lista de preferências salvas ainda não existe (item 20). A tela lado a lado é do Kodiak.

---

## HOME (logado)

A API devolve **uma lista única** de itens, ordenada por pontuação. Cada item traz `origem`, `tag` e `motivo`. **A tela do Kodiak monta os blocos a partir de `origem`.** Ordem dos grupos: Seus atalhos, Recomendados, Acompanhamento.

Origens que a lista já devolve: `perfil`, `momento`, `historico`, `repetir`, `popular`, `demanda`, `saude`, `acessibilidade`, `geral`.

### 2) SEUS ATALHOS
- **PEGA:** `historico` do cidadão.
- **FAZ:** conta quantas vezes abriu cada `servico_id` e pega os 2 mais frequentes (empate: o mais recente). Posição fixa. Sem histórico, o bloco não aparece.
- **MOSTRA:** 2 cards com `nome_resumido` e a etiqueta "Você usa com frequência". Tocar abre o serviço.
- **ESTADO:** **Falta.** Hoje não há contagem de acessos por serviço. O mais próximo é `repetir`, que usa os 5 últimos serviços distintos e aceita no máximo 1 na lista.

### 3) CONTINUE SEU PEDIDO e SALVOS
- **PEGA:** jornadas em andamento do cidadão e favoritos.
- **FAZ:** "Continue seu pedido" lista as jornadas com estado `em_andamento`. "Salvos" lista os favoritos.
- **MOSTRA:** cards com o ponto onde parou ("Falta escolher o dia e horário"). Bloco vazio não aparece.
- **ESTADO:** **Parcial.** `GET /dados/cidadaos/{id}/jornadas` lista as jornadas com estado. Não há "ponto onde parou" na lista nem Salvos.

### 3a) USOU RECENTEMENTE (opcional)
- **PEGA:** `historico` do cidadão.
- **FAZ:** ordena por data, hora e `ordem_na_sessao` (mais novo primeiro), tira repetidos e pega os 3 últimos serviços diferentes.
- **MOSTRA:** 3 cards com "Você usou em DD/MM". Se a tela tiver só uma seção de atalhos, juntar as duas.
- **ESTADO:** **Parcial.** `repetir` já tem o texto "Você acessou este serviço em DD/MM". Falta o bloco de 3.

### 4) ACOMPANHAMENTO: SERVIÇOS SOLICITADOS
- **PEGA:** jornadas do `cidadao_id` que ainda não foram encerradas (cancelado ou avaliado).
- **FAZ:** vale só para 942 (Agendar consultas e procedimentos) e 352 (Agendar atendimento no Cadastro Único). Para cada pedido, descobre a etapa atual no app e o que falta para avançar. Novos serviços entram por configuração, se atenderem ao critério (natureza Agendamento ou Peticionador, `passos` preenchidos, `nivel_digital_atual` ≥ 2; vazio = a classificar, não entra).
- **MOSTRA:** card fixo com nome, "Etapa X de N" (N vem da configuração do serviço), uma frase de "o que falta" e, separado, "O que fazer depois" (sem botão de avanço). O botão "Ver etapas" abre o detalhe (item 12).
- **ESTADO:** **Parcial.** A jornada já devolve telas, telas puladas e etapa. Pontos a corrigir:
  - `temJornada` libera qualquer serviço de natureza Agendamento, Peticionador, Inscrição ou Emissão de documentos, sem checar `passos` nem `nivel_digital_atual`. Isso dá centenas de serviços. Os requisitos pedem exatamente 2 (942 e 352).
  - Existem telas configuradas extras para 923 e 633.
  - Estados hoje: só `em_andamento` e `concluida`.
  - Não há "O que fazer depois".

### 5) PARA VOCÊ: família, direitos, pet, saúde e acessibilidade
- **PEGA:** marcadores de `cidadaos`, os dois consentimentos e as preferências.
- **FAZ:** cada marcador verdadeiro aciona uma **lista curada de `servico_id`** (em `regras.js`), na ordem de prioridade. O público do catálogo (`publicos_alvo`) só serve de filtro de compatibilidade. Depois:
  - sem consentimento de saúde, não lê nem usa `hipertensao`, `diabetes`, `saude_mental` e `gestante`;
  - sem consentimento de acessibilidade, não lê nem usa `pessoa_com_deficiencia` (um consentimento não libera o outro);
  - serviços sensíveis só entram por regra, com o consentimento da própria categoria (a classificação usa a lista de IDs e uma regex no nome);
  - `criancas_na_familia` vazio é desconhecido, nunca "nenhuma";
  - quem já tem `cadastro_unico` ou `bolsa_familia` não recebe 1032 (Inscrever-se no Cadastro Único) nem 995 (Receber o Bolsa Família);
  - **tira o que ele já usou**; tira os tipos que a pessoa desligou;
  - ordena por pontuação e aplica a diversidade de órgão.
- **Tabela de regras (valores reais de `regras.js`):**

| Marcador | Serviços sugeridos (em ordem) | Consentimento |
|---|---|---|
| sem `cadastro_unico` e renda baixa | 1032, 352 | não |
| `cadastro_unico` | 1034, 1033, 352 | não |
| `bolsa_familia` | 997 (Auxílio Gás) | não |
| `criancas_na_familia` = `primeira_infancia` | 1240, 839 | não |
| `criancas_na_familia` = `crianca` | 839, 1240, 1148, 633 | não |
| `criancas_na_familia` = `adolescente` | 1148, 954, 1292, 62 | não |
| `mei` | 1065, 798, 565, 988 | não |
| `empreendedor` | 565, 222, 1077, 564 | não |
| `microcredito` | 222 | não |
| `servidor_publico` | 568, 569, 450, 785, 1096 | não |
| `proprietario_imovel` | 494, 763, 493, 558, 559 | não |
| `tutor_animal` | 34, 37, 926, 956, 1152 | não |
| `estudante` | 1148, 819, 954, 1094, 627 | não |
| `usuario_compaz` | 633, 435 | não |
| idade ≥ 60 | 908, 435, 1359, 1427 | não |
| idade de 16 a 29 | 1292, 62, 954, 1359, 1427 | não |
| mulher de 40 a 69 | 1309 | não |
| mulher | 1257, 192 | não |
| `hipertensao` | 284 | saúde |
| `diabetes` | 283 | saúde |
| `saude_mental` | 1197, 1193 | saúde |
| `gestante` | 892, 295, 1362, 271 | saúde |
| `pessoa_com_deficiencia` | 299, 357, 271, 1239, 1175, 317 | acessibilidade |

- **MOSTRA:** itens com etiqueta de motivo, agrupados pela tela por `origem`:
  - "Para sua família" (momento de vida);
  - "Seus direitos", sempre com "pode ter direito a";
  - "Você e seu pet" (sem consentimento);
  - "Cuidar de você" (só com consentimento de saúde);
  - acessibilidade (só com consentimento de acessibilidade).
  Nenhum título ou motivo cita a condição de saúde ou a deficiência. O texto de saúde é fixo ("Indicado para o seu cuidado com a saúde. Aparece porque você autorizou…").
- **ESTADO:** **Parcial.** As regras, os filtros de consentimento e os filtros de Cadastro Único e Bolsa Família estão feitos. Faltam:
  - tirar o que o cidadão já usou (hoje só o item de repetição é limitado);
  - desligar tipos (item 18);
  - o texto "pode ter direito a" em todos os motivos de direitos (hoje só o `cadunico_entrar` usa);
  - o Bolsa Família como **status**, e não só como sugestão (requisito 2.16);
  - a etiqueta de bloco (hoje a tela agrupa por `origem`, sem campo `bloco`).

### 6) QUEM É COMO VOCÊ TAMBÉM USA (serviço novo)
- **PEGA:** serviços já usados e o segmento do cidadão (`segmentosDe`: faixa etária + marcadores permitidos).
- **FAZ:** `derivados.proximo` dá os próximos serviços dos 3 últimos usados (peso decrescente). `derivados.populares[segmento]` dá os mais acessados do segmento (funciona sem histórico). A lista garante **pelo menos 1 serviço novo**, com o motivo "Pessoas como você também usam" (requisito 2.14).
- **MOSTRA:** 1 card com o motivo "Pessoas como você também usam".
- **ESTADO:** **Feito.** Reservar: a garantia troca um item da lista por um popular novo, e esse trecho do código merece teste.

### 6a) NESTA ÉPOCA DO ANO e PARA NÃO ESQUECER
- **PEGA:** `uso_semanal` e prazos simulados.
- **FAZ:** "Nesta época do ano" usa a razão entre as semanas recentes e as do ano anterior (`derivados.demanda`). Semana sem linha em `uso_semanal` significa menos de 10 visitantes, não zero. "Para não esquecer" mostra prazos simulados e deixa claro que são simulados.
- **MOSTRA:** até 2 cards por bloco, cada um com motivo.
- **ESTADO:** **Parcial.** A demanda existe como origem `demanda` ("Muita gente está procurando este serviço nas últimas semanas"), sem bloco próprio e sem limite de 2. "Para não esquecer": **Falta**.

### 6b) PRÓXIMO PASSO DENTRO DO SERVIÇO
- **PEGA:** o serviço X que acabou de ser concluído.
- **FAZ:** sugere um serviço Y relacionado (tabela de regras ou `proximo_servico`). Exemplo: concluir o 942 sugere o 953 (Ver meus agendamentos de Saúde).
- **MOSTRA:** card "Próximo passo" após o comprovante e na Home.
- **ESTADO:** **Falta.**

**Endpoint (itens 2 a 6b saem juntos):** `GET /recomendacao/{id}?limite=8`

**Campos da resposta hoje:** `cidadao_id`, `base_da_personalizacao`, `explicacao_geral`, `aviso_saude`, `aviso_acessibilidade`, `total_acessos_historico`, `semana_de_referencia_da_demanda`, `itens[]` (`posicao`, `servico_id`, `titulo`, `nome`, `orgao`, `tema`, `tipo_servico`, `digital`, `jornada_disponivel`, `origem`, `tag`, `motivo`, `outros_motivos`), `consentimento`, `convite_consentimento`, `consentimento_acessibilidade` e `convite_acessibilidade`.

**A acrescentar:** `bloco` por item, `blocos[]`, `acompanhamento[]`, `salvos[]`.

---

## HOME (sem login e personalização desligada)

### 7) MAIS PROCURADOS AGORA + CHIPS DE PERFIL
- **PEGA:** segmento escolhido no chip (idoso, família, empreendedor, pessoa com deficiência, saúde) ou nenhum, e a data de referência.
- **FAZ:** soma os cliques de `uso_semanal` com `login = nao` nas últimas 4 semanas e na mesma semana do ano anterior (`nao` conta aparelhos; semana sem linha é "menos de 10"). Se tem chip, filtra por `publicos_alvo` (valor exato) e `temas`. Pega os 6 maiores. Nunca liga o visitante a um cidadão. O chip é escolha do usuário, não inferência, e não pede cadastro.
- **MOSTRA:** Home simplificada, com menos blocos e menos texto, serviços mais usados primeiro, busca e atalhos de 1 toque. A mesma tela vale para quem desligou a personalização.
- **Endpoint:** `GET /home/anonimo?segmento=`
- **ESTADO:** **Falta.** `derivados.demanda` já usa `uso_semanal` com 4 semanas e a mesma época do ano anterior, mas para toda a base. O chip por `publicos_alvo` não existe.

---

## BUSCA E SERVIÇO

### 8) CAIXA DE BUSCA
- **PEGA:** texto digitado.
- **FAZ:** tira acento e maiúscula e procura em `item_nome`, `nome_resumido`, `palavras_chave`, `temas` e `publicos_alvo`. Tolera erro de digitação e usa sinônimos (bolsa, vacina, creche, MEI, cadúnico). Ordena por relevância e depois por `cliques_historico`.
- **MOSTRA:** até 5 resultados com `nome_resumido`, órgão, natureza e "Gratuito" (`gratuito = true`) ou "Tem custo" (`false`).
- **Endpoint:** `GET /busca?q=`
- **ESTADO:** **Falta.**

### 9) TELA DO SERVIÇO
- **PEGA:** `servico_id`.
- **FAZ:** lê em `servicos`: descrição, públicos, requisitos, passos, canais, gratuito e prioridade de atendimento.
  - `requisitos` e `passos` se separam nas linhas com "- ". As linhas de cabeçalho ("Requisitos:", "Documentos:") viram subtítulo.
  - `passos` vazio: mostra "Passo a passo não informado" e leva à descrição e aos canais.
  - `prioridade_atendimento` vazio: não mostra o campo.
  - Nos 2 serviços da jornada, usa o texto simples reescrito à mão.
  - No 352, não mostra "Entrar no aplicativo", "Baixar o app" nem "Clicar no ícone"; "Informar o CPF" não vira campo (o CPF vem do perfil e não é guardado).
  - No 942, a Carta traz só 2 passos de acesso; as etapas de pedido são da equipe e aparecem como simulação.
- **MOSTRA:** o que é, quem pode, o que levar, passo a passo e canais (item 13). O botão "Começar" só aparece nos 2 serviços da jornada.
- **Endpoint:** `GET /dados/servicos/{id}`
- **ESTADO:** **Parcial.** Devolve nome, órgão, temas, tipo, descrição, requisitos, passos, `gratuito`, `nota_media` e `jornada_disponivel`. Faltam públicos, canais, prioridade, o texto simples dos 2 serviços e a regra de passos do 352. `jornada_disponivel` tem a falha do item 4.

---

## JORNADA

### 10) BOTÃO "COMEÇAR" E TELAS DO FORMULÁRIO
- **PEGA:** `cidadao_id`, `servico_id` e os campos já preenchidos.
- **FAZ:** lê a configuração da jornada (telas e campos de cada tela) e preenche com o que já está no perfil. Devolve a próxima tela com campo faltando; telas completas e válidas são puladas e geram `tela_pulada`. O Continuar valida e salva o rascunho. O Voltar devolve a tela anterior com os valores. O campo livre rejeita CPF, e-mail, telefone e endereço.
  - **352 (6 etapas no app, conferido no código):**

| Etapa | Origem na Carta |
|---|---|
| Sobre o atendimento (tipo e nº de pessoas) | descrição e requisito de renda |
| Documentos | lista de `requisitos` |
| Local | passo "Escolher o local de atendimento" |
| Dia e horário | passo "Selecione a data e hora" |
| Avisos (preenchido por `aceita_notificacao`) | levar documentos e canal de aviso |
| Revisar e confirmar | resumo |

  - **942 (4 telas hoje, simulação):** local, dia e horário, avisos, revisar e confirmar. O requisito 5.14 prevê 3 etapas (local, dia e horário, confirmar). **Decisão pendente:** manter "avisos" também no 942 ou tirar a tela. Os requisitos (residente, cartão SUS, comprovante de residência) aparecem como "o que levar", sem campo de CPF.
- **MOSTRA:** só o que falta, com "Etapa X de N". No fim, a confirmação com o resumo.
- **Endpoint:** `POST /dados/jornadas` (inicia ou retoma), `GET /dados/jornadas/{id}?tela=`, `PATCH /dados/jornadas/{id}`
- **ESTADO:** **Feito**, com a ressalva do item 4 e da tela de avisos do 942. Horários indisponíveis (~20%) aparecem de forma estável.

### 11) BOTÃO "CONFIRMAR PEDIDO"
- **PEGA:** os campos finais e `confirmar: true`.
- **FAZ:** sem `confirmar`, devolve `confirmacao_necessaria`. Com campos pendentes, devolve `campos_pendentes`. Caso contrário cria o pedido simulado, sem enviar nada à Prefeitura, com protocolo fictício e data de referência. As etapas vêm da configuração do serviço.
  - Etapas no app: feitas ou em andamento.
  - "O que fazer depois" no 352: comparecer ao local com os documentos, fazer a entrevista e esperar 48 horas para o NIS.
  - No 942, a Carta não traz passos depois do agendamento, então não há "O que fazer depois".
  - Grava `jornada_concluida`.
- **MOSTRA:** comprovante com protocolo, data, resumo e próximos passos, depois o pedido da avaliação (item 16). Botão "Acompanhar".
- **Endpoint:** `POST /dados/jornadas/{id}/confirmar`
- **ESTADO:** **Parcial.** A confirmação obrigatória e o evento estão feitos. O protocolo hoje é `DEMO-AAAA-XXXXXX` com o ano do relógio. Decisão: adotar `CNX-2026-NNNNNN` (sequencial) com a data de referência. "O que fazer depois" **Falta**.

---

## ACOMPANHAMENTO

### 12) DETALHE DO PEDIDO
- **PEGA:** `jornada_id` ou protocolo.
- **FAZ:** devolve as etapas no app com status (feita, andamento, a_fazer), tempo estimado simulado, "o que falta" e o canal. Devolve à parte "O que fazer depois", sem botão de avanço.
- **MOSTRA:** linha do tempo com a etapa atual em destaque. Em cada etapa: Falar com o órgão, Algo errado?, Cancelar e, só no serviço da jornada, Alterar.
- **Endpoint:** `GET /dados/jornadas/{id}`
- **ESTADO:** **Parcial.** Devolve a etapa atual e as telas, sem tempo estimado, sem "O que fazer depois" e sem busca por protocolo.

### 13) BOTÃO "FALAR COM O ÓRGÃO"
- **PEGA:** `servico_id`.
- **FAZ:** devolve, nesta ordem, só o que não estiver vazio:
  - `canal_web`;
  - `canal_chat` (existe em apenas 9 serviços);
  - Ouvidoria (`manifestacao`: link, 0800, e-mail).

  **Não usa `canal_app`**: a coluna está suja (traz "CCON", nomes de serviço e códigos). Se tudo estiver vazio, devolve "Sem canal informado". Grava `canal_aberto`.
  - 352: `cadunico.recife.pe.gov.br` e Ouvidoria.
  - 942: `conecta-saude.recife.pe.gov.br` e Ouvidoria.
- **MOSTRA:** link ou atalho. Não existe chat próprio.
- **ESTADO:** **Falta.**

### 14) BOTÃO "ALGO ERRADO?"
- **PEGA:** protocolo, etapa, categoria (demora, documento, informação errada, outro) e texto curto.
- **FAZ:** grava a ocorrência (o texto fica só nela, com a mesma verificação de dado sensível do campo livre) e gera um número fictício. Grava `problema_relatado` com protocolo, etapa e categoria, sem o texto.
- **MOSTRA:** "Recebemos. Ocorrência nº ...", um aviso na etapa e os canais do item 13.
- **Endpoint:** `POST /pedido/{protocolo}/problema`
- **ESTADO:** **Falta.**

### 15) BOTÃO "CANCELAR PEDIDO"
- **PEGA:** protocolo.
- **FAZ:** simulado. Muda o status para `cancelado` e grava o evento.
- **MOSTRA:** pedido cancelado, com a opção "Fazer de novo".
- **Endpoint:** `POST /pedido/{protocolo}/cancelar`
- **ESTADO:** **Falta.**

### 15a) BOTÃO "ALTERAR PEDIDO" (só nos serviços da jornada)
- **PEGA:** protocolo e os campos novos (por exemplo, dia e horário).
- **FAZ:** simulado. Atualiza os campos com a mesma validação do item 10, mantém o protocolo, muda o status para `alterado` e grava o evento.
- **MOSTRA:** comprovante atualizado.
- **Endpoint:** `POST /pedido/{protocolo}/alterar`
- **ESTADO:** **Falta.**

### 16) AVALIAÇÃO FINAL
- **PEGA:** nota de 1 a 5 ou a opção "Não consegui", resolvido (sim, em parte, não) e comentário opcional.
- **FAZ:** grava `avaliacao_enviada` (nota e resolvido, sem o comentário) e encerra o card de acompanhamento. Se for "não" ou "Não consegui", devolve também os canais do item 13.
- **MOSTRA:** agradecimento; se foi "não", o caminho para tentar de novo.
- **Endpoint:** `POST /pedido/{protocolo}/avaliacao`
- **ESTADO:** **Falta.**

---

## TRANSPARÊNCIA E CONTROLE

### 17) "POR QUE VEJO ISSO?"
- **PEGA:** `servico_id` e o tipo da sugestão (`origem`).
- **FAZ:** devolve o `motivo_detalhe` em linguagem simples (ex.: "Você abriu este serviço 5 vezes"). Quando a base for o perfil, diz isso. Nunca cita condição de saúde nem deficiência. Se o serviço de origem de uma sugestão por histórico for sensível e sem consentimento, usa o texto genérico ("Pessoas com um perfil parecido com o seu também costumam acessar este serviço."). Grava `por_que_vejo_aberto`.
- **MOSTRA:** o texto e o botão "Não quero ver este tipo".
- **ESTADO:** **Parcial.** Cada item já traz `motivo` e `outros_motivos`, e o texto genérico para saúde sem consentimento já existe. Falta a rota própria, o evento e o texto "base: perfil".

### 18) "NÃO QUERO VER ESTE TIPO"
- **PEGA:** `cidadao_id` e a `origem`.
- **FAZ:** grava a preferência (cidadão, tipo, ativo = false). A Home ignora esse tipo nos acessos seguintes. Grava `sugestao_dispensada`.
- **MOSTRA:** "Pronto. Você muda isso em Meu Conecta."
- **Endpoint:** `PUT /preferencias/{id}`
- **ESTADO:** **Falta.**

### 19) CONSENTIMENTOS (saúde e acessibilidade, independentes)
- **PEGA:** `cidadao_id`, a finalidade (`saude_personalizacao` ou `acessibilidade_personalizacao`) e a decisão (`concedido`, `recusado`, `revogado`).
- **FAZ:** cada finalidade tem texto, registro e revogação próprios. Grava cada mudança com data. Conceder um não concede o outro. Com concedido, libera as regras da finalidade no item 5. Com recusado ou revogado, remove as regras e a Home segue normal. O convite de acessibilidade é igual para todas as pessoas. Não pressiona. Não infere saúde pelo comportamento.
- **MOSTRA:** a Home já recalculada (a tela chama de novo `GET /recomendacao/{id}`).
- **Endpoint:** `GET/POST /dados/consentimentos/{id}?finalidade=` e `GET /dados/consentimentos/texto?finalidade=`
- **ESTADO:** **Feito.** A resposta traz situação, histórico e as duas finalidades. Há testes em `consentimento-acessibilidade.test.js` e `vitrine-saude.test.js`.

### 20) MEU CONECTA > SUGESTÕES E PRIVACIDADE
- **PEGA:** as preferências e os consentimentos do cidadão.
- **FAZ:** lê e grava um interruptor por tipo de sugestão, o interruptor geral "Personalização" e os dois consentimentos. Com a personalização desligada, a API devolve a Home simplificada (item 7) e grava `personalizacao_desligada`.
- **MOSTRA:** lista de interruptores. Mudou, a Home recalcula.
- **Endpoint:** `GET/PUT /preferencias/{id}`
- **ESTADO:** **Parcial.** Os consentimentos existem. Preferências e personalização geral: **Falta**.

### 21) MEU CONECTA > JEITO DE USAR (modo simples) [P1]
- **PEGA:** `preferencias.aparencia` (padrão ou simples).
- **FAZ:** grava a escolha. No modo simples, a API devolve textos curtos e 2 itens por seção em vez de 3. As opções de acessibilidade ficam disponíveis a todos; o marcador de deficiência nunca muda a interface sozinho.
- **MOSTRA:** a mesma Home, mais simples.
- **ESTADO:** **Falta.**

---

## INVISÍVEL

### 22) EVENTOS
Cada botão grava 1 linha: timestamp, `cidadao_id` (ou "anonimo"), evento, `servico_id`, etapa. Nunca texto livre nem dado sensível.

- **Home:** `bloco_exibido`, `item_exibido`, `item_aberto`, `por_que_vejo_aberto`, `sugestao_dispensada`, `personalizacao_desligada`.
- **Jornada:** `jornada_iniciada`, `tela_pulada`, `etapa_concluida`, `jornada_concluida`, `jornada_abandonada` (com a etapa).
- **Acompanhamento:** `canal_aberto`, `problema_relatado` (com a categoria), `avaliacao_enviada` (com a nota).
- **Endpoint:** `POST /dados/eventos` e `GET /dados/eventos/resumo`
- **ESTADO:** **Parcial.**
  - O servidor já grava sozinho: `entrou_como`, `vitrine_vista`, `jornada_iniciada`, `tela_pulada` e `jornada_concluida`.
  - O cliente só pode enviar `tela_pulada`, `erro_entendimento`, `vitrine_vista` e `servico_aberto`.
  - **Risco:** `tela_pulada` é gravado pelo servidor ao iniciar a jornada e também é aceito do cliente, o que pode contar em dobro. Retirar da lista do cliente.
  - `erro_entendimento` é um nome herdado da voz. Hoje registra erro de validação de campo; renomear para `erro_campo`.
  - Faltam os eventos de Home por bloco e item, de acompanhamento e `etapa_concluida` / `jornada_abandonada`.

### 23) RECOMENDACOES.CSV [opcional]
- **PEGA:** todos os 89.046 cidadãos.
- **FAZ:** gera até 10 sugestões por cidadão (`posicao` 1 a 10), priorizando serviços que ele ainda não usou. O `motivo` é o mesmo texto da Home e não usa saúde nem deficiência sem consentimento (gerar sem consentimento, ou seja, só regras sem saúde). Valida antes da entrega: total de cidadãos, limite de 10, `servico_id` existente em `servicos.csv`. Visitantes sem login não entram.
- **MOSTRA:** arquivo UTF-8, com cabeçalho e vírgula.
- **ESTADO:** **Falta**, e depende de tirar os serviços já usados da lista (item 5). Hoje a lista admite repetição e serviços de histórico já usados.

---

## O que falta no backend (em ordem sugerida)

1. Limitar `temJornada` aos 2 serviços (942 e 352), por configuração. Decidir a tela de avisos do 942.
2. Tirar da lista os serviços já usados; manter só 1 repetição, como "Continue de onde parou".
3. Acrescentar `bloco` por item e o Bolsa Família como status; "pode ter direito a" nos motivos de direitos.
4. Home sem login (`GET /home/anonimo?segmento=`) e preferências com personalização desligada.
5. Pedido: protocolo `CNX-2026-NNNNNN`, data de referência, estados (`cancelado`, `alterado`, `avaliado`), "O que fazer depois", cancelar, alterar, relatar problema, avaliar.
6. Canais do órgão e busca.
7. Eventos faltantes; corrigir `tela_pulada` duplicado e renomear `erro_entendimento`.
8. Seus atalhos (contagem por serviço) e Salvos.
9. "Por que vejo isso?" com rota e evento.
10. Opcional: modo simples e `recomendacoes.csv`.

## Prioridade

Itens 1 a 20 e 22 são obrigatórios. Itens 21 e 23 só se sobrar tempo. Voz (Broto) está fora do escopo desde 12/11/2026.

## Pendências de decisão

- Tela de avisos no 942: manter (4 telas) ou tirar (3 etapas, como no requisito 5.14)?
- Formato do protocolo e data de referência fixa (28/09/2026) ou relógio do sistema?
- Itens 8 (busca) e 7 (chips): o Kodiak monta a tela, mas a API precisa dos filtros no servidor?
- Backend ainda não está acessível por HTTPS público (necessário para a liberação do Kodiak); não verifiquei a publicação.
