# Requisitos: refazer o backend (Node + DynamoDB, reaproveitando o código)

## Introdução

O backend atual funciona, mas tem três problemas: o estado vive em `estado.json` (não serve para Lambda com várias instâncias), a montagem de textos e ações está misturada com a camada de dados (`dados/jornada/`, `dados/perfil.js`), e a medição é rasa. Esta refação mantém Node 20 (ES modules, sem dependências de execução desnecessárias), adota DynamoDB para o estado e reaproveita o que já está validado: leitura de CSV, regras de recomendação, consentimento e testes golden.

Decisões já tomadas: **Node**, **DynamoDB**, **reaproveitar o código**. O contrato HTTP que o Kodiak já consome (`.kiro/specs/refatorar-clareza-apis/contrato-das-apis.md`) NÃO muda, salvo o que este documento disser.

## Glossário

- **Domínio**: regras puras (perfil, consentimento, recomendação, jornada), sem HTTP e sem I/O.
- **Repositório**: interface única de leitura e escrita do estado, com duas implementações (memória/arquivo e DynamoDB).
- **Apresentação**: camada que transforma o resultado do domínio em textos, rótulos, `acao` e erros prontos.
- **Estado próprio**: consentimentos, preferências, favoritos, solicitações, avaliações, problemas e eventos. Os CSVs nunca são alterados.

## Requisitos

### Requisito 1: Camadas separadas

**História de usuário:** Como equipe, quero camadas com responsabilidade única, para mudar uma regra sem mexer em HTTP, textos ou armazenamento.

#### Critérios de aceitação

1. O código DEVE ficar em `dominio/`, `dados/`, `apresentacao/`, `api/` e `lote/`.
2. O domínio NÃO DEVE importar `node:http`, `node:fs`, AWS SDK nem módulos da `api/` ou da `apresentacao/`.
3. A apresentação DEVE ser a única camada que monta título, subtítulo, etiqueta de motivo, "Por que vejo isso?", rótulo de botão, rótulo para leitor de tela, `acao` e `erros[]`.
4. As rotas DEVEM apenas validar a entrada, chamar o domínio e a apresentação, e devolver o resultado.
5. Cenários de demonstração (`cidadaos/demo`) DEVEM ficar fora do módulo de perfil do domínio.

### Requisito 2: Atributos lidos dos dados

**História de usuário:** Como equipe, quero que cada atributo seja lido uma vez e classificado por regra de privacidade, para que nenhum campo sensível vaze.

#### Critérios de aceitação

1. O perfil do cidadão DEVE separar três grupos: perfil livre, saúde (`hipertensao`, `diabetes`, `saude_mental`, `gestante`) e acessibilidade (`pessoa_com_deficiencia`).
2. O grupo saúde DEVE ser lido só com consentimento `saude_personalizacao` concedido. O grupo acessibilidade DEVE ser lido só com `acessibilidade_personalizacao` concedido. Um consentimento NÃO DEVE liberar o outro.
3. `criancas_na_familia` vazio DEVE ser tratado como desconhecido, nunca como `nenhuma`. `situacao_renda` vazio DEVE ser tratado como sem registro.
4. Os CSVs DEVEM ser lidos com vazios preservados como texto vazio, e listas separadas por `|`.
5. O histórico DEVE ser ordenado por `data` e `ordem_na_sessao`, nunca por `hora`.
6. `visitas_sem_login` DEVE ser usado apenas em agregados pré-calculados, nunca ligado a um `cidadao_id`.
7. A coluna `canal_app` de `servicos` NÃO DEVE ser usada.
8. O sistema NÃO DEVE guardar CPF, nome completo real nem endereço.

### Requisito 3: Estado em DynamoDB por meio de repositório

**História de usuário:** Como equipe, quero que o estado persista de forma segura em Lambda, para que a demo não perca dados nem duplique protocolos.

#### Critérios de aceitação

1. O estado DEVE ser acessado apenas pela interface de repositório.
2. DEVEM existir duas implementações: **local** (memória, com arquivo opcional) para testes e desenvolvimento, e **DynamoDB** para produção. A escolha DEVE vir de variável de ambiente.
3. As tabelas DEVEM seguir `docs/escopo-agente-e-dados.md`: `consentimentos` (PK `cidadao_id`, SK `finalidade#ts`), `jornadas` (PK `cidadao_id`, SK `jornada#ts`), `preferencias`, `favoritos` e `eventos` (PK `cidadao_id`, SK `ts#tipo`, com TTL).
4. Dados de saúde e de acessibilidade NÃO DEVEM ser gravados no estado. O estado guarda só o consentimento.
5. Ações que criam ou concluem uma solicitação (criar, confirmar, cancelar, alterar, avaliar) DEVEM ser idempotentes: repetir a mesma chamada NÃO DEVE gerar outro protocolo nem outro evento.
6. Escritas concorrentes na mesma solicitação DEVEM usar condição de escrita (versão ou estado esperado), para evitar sobrescrita.
7. Os dados estáticos (cidadãos, histórico, serviços e derivados) DEVEM ficar fora do DynamoDB de estado, em cache de memória carregado no início da função, conforme o escopo.

### Requisito 4: Recomendação reaproveitada e completa

**História de usuário:** Como cidadão, quero a Home certa para o meu perfil, para chegar rápido ao que preciso.

#### Critérios de aceitação

1. O motor atual (`candidatos`, `pontuacao`, `diversidade`, `textos`, `regras`, `derivados`) DEVE ser migrado para `dominio/`, preservando o comportamento. Os testes golden DEVEM continuar passando.
2. A Home DEVE seguir os Requisitos 1 a 3 do documento `requirements.md` desta pasta: blocos aplicáveis, sem bloco vazio, no máximo 2 itens do mesmo órgão entre os 5 primeiros e pelo menos 1 serviço novo com o motivo "Pessoas como você também usam".
3. A Home DEVE informar `base_da_personalizacao` ("histórico" ou "perfil").
4. A Home de visitante e a de quem desligou a personalização DEVEM ser a mesma versão simplificada.
5. Quem já tem `cadastro_unico` ou `bolsa_familia` NÃO DEVE receber sugestão de inscrição.
6. Serviço já usado NÃO DEVE ocupar posição entre as sugestões novas.
7. O bloco "Para não esquecer" DEVE usar prazos simulados gerados de forma determinística a partir de `cidadao_id`, `servico_id` e uma data de referência configurável, para que o mesmo cidadão veja o mesmo prazo.
8. O bloco "Continue seu pedido" DEVE ler as solicitações em andamento do repositório.

### Requisito 5: Jornada de solicitação

**História de usuário:** Como cidadão, quero acompanhar e concluir meu pedido por etapas, para saber onde ele está.

#### Critérios de aceitação

1. A jornada DEVE ser guiada por configuração (`jornada_config`) para os serviços 942 e 352. Adicionar um serviço que atenda ao critério DEVE exigir só configuração.
2. O domínio DEVE decidir a próxima tela, se pode confirmar, e se uma tela é pulada porque todos os campos vêm do perfil e são válidos.
3. Validação corrigível pelo cidadão DEVE voltar com status 200, `ok: false` e `erros[]` em texto simples. Erro técnico DEVE usar status HTTP de erro.
4. As etapas fora do app DEVEM vir separadas, como "O que fazer depois", sem ação de avanço.
5. Relatar problema, cancelar, alterar (só na jornada) e avaliar DEVEM estar disponíveis. NÃO DEVE haver chat.
6. O protocolo DEVE ser fictício e único por solicitação concluída.
7. Nenhuma solicitação real DEVE ser enviada.
8. A jornada NÃO DEVE guardar CPF. O CPF vem do perfil e não é persistido.

### Requisito 6: Consentimento e preferências

**História de usuário:** Como cidadão, quero conceder, recusar e revogar meus consentimentos e desligar a personalização, para ter controle.

#### Critérios de aceitação

1. Cada consentimento (saúde e acessibilidade) DEVE ter texto versionado, registro de mudança com data, recusa e revogação próprios.
2. O convite de acessibilidade DEVE ser o mesmo para todas as pessoas.
3. Recusar NÃO DEVE alterar a Home normal nem gravar dados de saúde.
4. A preferência de personalização (por bloco ou geral) DEVE persistir e ser respeitada em acessos seguintes.
5. Título de bloco e motivo NÃO DEVEM citar condição de saúde nem deficiência.

### Requisito 7: Medição por eventos

**História de usuário:** Como equipe, quero eventos completos e sem dado sensível, para medir conclusão, abandono e satisfação.

#### Critérios de aceitação

1. O servidor DEVE registrar sozinho: `item_exibido`, `etapa_concluida`, `abandono`, `problema_relatado`, `nota`, `tela_pulada`, `personalizacao_desligada`.
2. A tela DEVE enviar só o que o servidor não sabe: `item_aberto` e `por_que_aberto`.
3. Eventos NÃO DEVEM ter texto livre nem dado de saúde ou deficiência.
4. Eventos DEVEM ser gravados com TTL e DEVE existir um resumo agregado (conclusão, abandono por etapa, nota média).

### Requisito 8: Contrato HTTP estável

**História de usuário:** Como equipe, quero manter o que o Kodiak já consome, para não quebrar as telas.

#### Critérios de aceitação

1. Os caminhos, métodos, entradas e saídas do `contrato-das-apis.md` DEVEM permanecer, exceto aliases legados explicitamente removidos e os campos novos do Requisito 11 (somente acréscimos, nenhum campo existente muda de nome ou de tipo). O `contrato-das-apis.md` DEVE ser atualizado junto.
2. O teste de contrato (`contrato.test.js`) DEVE continuar garantindo que toda rota tem seção no documento e vice-versa.
3. Os testes golden de HTTP, adaptadores e vitrine DEVEM continuar passando sem mudança de fixture, salvo mudança aprovada.
4. `GET /dados/cidadaos/{id}` NÃO DEVE gravar evento. O evento `entrou_como` DEVE passar a ser gravado por uma chamada explícita.
5. Erros DEVEM seguir a tabela atual de `erros.js`, e rota não encontrada, método inválido e caminho inválido NUNCA DEVEM virar 500.

### Requisito 9: Execução e implantação

**História de usuário:** Como equipe, quero publicar uma URL HTTPS estável, para a liberação do backend pelo suporte Kodiak.

#### Critérios de aceitação

1. A API DEVE rodar como servidor local (`npm start`) e como Lambda, com o mesmo roteador.
2. O pacote da Lambda DEVE conter apenas o necessário (código, derivados e dados de catálogo), sem o CSV de `visitas_sem_login`.
3. A URL base e as credenciais DEVEM vir de variáveis de ambiente.
4. O `/health` DEVE informar quantidades carregadas e o tipo de repositório em uso.

### Requisito 10: Lote opcional

**História de usuário:** Como equipe, quero gerar o `recomendacoes.csv`, para a avaliação de antecipação.

#### Critérios de aceitação

1. O script em `lote/` DEVE gerar o arquivo com os 89.046 cidadãos, até 10 serviços por pessoa, usando o mesmo domínio da Home.
2. O motivo DEVE ser o texto que o cidadão veria e NÃO DEVE usar saúde nem deficiência sem consentimento (o lote não tem consentimento, então usa só perfil livre e histórico).
3. O script DEVE validar total de cidadãos, limite de 10, posições de 1 a 10 e `servico_id` existente.

### Requisito 11: Interface da Home (pesquisa HACKATS)

**História de usuário:** Como cidadão logado, quero ver meus atalhos por nicho, acompanhar meus pedidos e descobrir serviços novos, para resolver o que preciso sem procurar.

Origem: documento "Pesquisa HACKATS (1)". A tela só repete o que a API devolve (regra `front-sem-regra-de-negocio`). Os acréscimos abaixo valem para `GET /recomendacao/{id}/home` e não removem nenhum campo atual.

#### 11.1 Seus atalhos, por nicho

1. A Home DEVE devolver `nichos[]` dentro do grupo `atalhos`. Cada nicho tem `id`, `titulo`, `filtro` (rótulo pronto), `itens[]` e `rotulo_leitor`.
2. O nicho DEVE vir do primeiro valor de `temas` do serviço, apenas para serviços que o cidadão já usou, ordenados do mais usado ao menos usado. Os serviços mais usados dentro do nicho vêm primeiro.
3. A lista de filtros DEVE conter só os nichos que a pessoa usa, mais a opção "Todos". O filtro NÃO DEVE ser calculado na tela: cada nicho já traz seus itens.
4. O nicho NÃO DEVE ser derivado de `hipertensao`, `diabetes`, `saude_mental`, `gestante` nem de `pessoa_com_deficiencia`. O tema "Saúde" só aparece quando vem do uso de serviços, e o título do nicho NÃO DEVE citar condição de saúde.
5. O nicho "Saúde" por uso NÃO DEVE exigir consentimento, porque vem do catálogo e do histórico, não de marcador de saúde. A API NÃO DEVE usar esse nicho para inferir condição (Requisito 2.1 e 4.7 do `requirements.md`).
6. A tela DEVE apenas expandir e recolher cada nicho (dropdown com o título do nicho). A ordem e o estado inicial (aberto ou fechado) vêm da API.
7. Cada nicho DEVE ter no máximo 6 itens, e o total de nichos DEVE ser limitado a 4. Nicho sem item NÃO DEVE ser enviado.

#### 11.2 Item de serviço e banner

1. Cada item de serviço (atalho, recomendado ou acompanhamento) DEVE trazer `logo { tipo, valor }`. Como não há imagens nos dados, `tipo` é `sigla` com o valor de `orgao_sigla`, ou `icone` com um nome de ícone do DLS escolhido pela API.
2. Cada item de atalho DEVE trazer `banner { titulo, texto, rotulo_botao, rotulo_leitor, acao }`. O `texto` é curto, em linguagem simples, tirado da descrição do serviço. O `rotulo_botao` é "Agende aqui" quando a `natureza` for Agendamento, e "Abrir serviço" nas demais.
3. A `acao` do banner DEVE levar à página do serviço (`abrir_servico`) ou, nos serviços de jornada (942 e 352), a `iniciar_jornada`.

#### 11.3 Acompanhe seus serviços

1. A Home DEVE devolver `acompanhamento[]`, antes dos recomendados, com os pedidos iniciados e não concluídos do cidadão. O bloco NÃO DEVE ser enviado se estiver vazio.
2. O acompanhamento DEVE existir **apenas** para os serviços de jornada 942 e 352. Nenhum outro serviço gera acompanhamento.
3. Cada card DEVE trazer: `titulo`, `descricao` (ex.: "Consulta solicitada. Aguarde a confirmação da sua unidade de saúde"), `status` (texto pronto), `previsao_texto` (ex.: "Previsão de confirmação: 12.10.2026 a 12.01.2027"), `rotulo_ver_detalhes`, `rotulo_leitor` e `acao`.
4. Os `status` do serviço 942 DEVEM ser: "Aguardando solicitação", "Consulta solicitada", "Consulta confirmada" e "Concluída". Os do serviço 352 seguem as etapas do Requisito 5.13 do `requirements.md`.
5. A previsão de cada etapa DEVE ser **simulada** e determinística (Requisito 4.7): a janela é calculada a partir da data de criação da solicitação e de um intervalo fixo por etapa, em configuração. A API DEVE marcar a previsão como simulada (`simulado: true` e o texto "Previsão simulada").
6. As ações "Ver encaminhamentos" e "Ver resultados de exames" NÃO DEVEM existir nesta versão, porque não há serviço de jornada correspondente.
7. `acao` DEVE abrir o detalhe da solicitação, com relatar problema, cancelar e alterar (Requisito 5.4 do `requirements.md`).
8. O texto de acompanhamento NÃO DEVE citar condição de saúde, exame, diagnóstico nem resultado.

#### 11.4 Serviço que você pode gostar

1. O bloco DEVE listar serviços compatíveis com o perfil que o cidadão **nunca usou**, com o motivo "Pessoas como você também usam" ou o motivo de perfil correspondente.
2. Serviço já presente em `historico` NÃO DEVE entrar neste bloco.
3. Cada card DEVE trazer `logo`, `titulo` (nome do serviço), `motivo`, `por_que_vejo`, `rotulo_leitor` e `acao`, que leva direto à página do serviço.
4. O bloco DEVE respeitar consentimento e a escolha de desligar a personalização (Requisito 3 do `requirements.md`).

#### 11.5 Medição da interface

1. O servidor DEVE registrar `item_exibido` para cada card, `filtro_aplicado` (id do nicho, sem texto livre) e `banner_aberto`, quando a tela avisar.
2. A tela DEVE enviar só `item_aberto`, `banner_aberto`, `filtro_aplicado` e `por_que_aberto`.

## Fora do escopo

- Voz (Broto).
- Chat de suporte.
- Envio de solicitações reais.
- Mudar o contrato de resposta das rotas atuais além do Requisito 8.4 e dos acréscimos do Requisito 11.
- Acompanhamento de serviços além de 942 e 352, "Ver encaminhamentos" e "Ver resultados de exames".
- Imagens de logo. Usa-se sigla do órgão ou ícone do DLS.

## Pendências para o design

1. Estratégia de empacotamento da Lambda sem o CSV grande (`build/pkg` hoje tem 47 MB).
2. Se o AWS SDK v3 entra como dependência ou usa o runtime da Lambda (afeta o pacote).
3. `GET /dados/cidadaos/demo` e o painel de teste: onde ficam depois da separação.
4. Tratamento final de `situacao_renda` e `criancas_na_familia` vazios, confirmado com a organização.
5. Itens do edital (8.7) e detalhes de "Liberação de backends" ainda não recebidos.
