# Requirements Document

## Introdução

Camada de OSINT (inteligência de fontes abertas) para o recomendador de serviços do Conecta Recife (Hacka Conecta Recife, Desafio 1: hiperpersonalização preditiva). Aqui OSINT significa **contexto público, agregado e anônimo** sobre território e calendário. A camada diz QUANDO e ONDE sugerir um serviço; os dados internos (cidadaos, servicos, historico, uso_semanal) dizem PARA QUEM. Os dados do hackathon são simulados.

Fora de escopo: qualquer coleta ou enriquecimento sobre pessoas individuais, redes sociais de cidadãos, ou dados pessoais de fontes externas.

## Requirements

### Requirement 1: Diagnóstico da implementação atual

**User Story:** Como desenvolvedora, quero que o estado atual do projeto seja documentado antes de qualquer mudança, para que a camada OSINT se encaixe no que já existe.

#### Acceptance Criteria
1. WHEN a spec for iniciada THEN o agente SHALL produzir um relatório com: stack, modelo de dados (tabelas, chaves, relações), representação de bairro/RPA, idade, `criancas_na_familia`, condições de saúde e "aceita avisos", lógica de recomendação atual, saída atual, forma de carga de dados, testes existentes e estado (funciona / incompleto / quebrado).
2. WHILE o relatório de diagnóstico não for aprovado THEN o agente SHALL NOT modificar nenhum arquivo do projeto.
3. IF o ambiente não permitir importar arquivos novos ou chamar APIs externas THEN o relatório SHALL registrar a limitação e o plano SHALL usar apenas arquivos estáticos.

### Requirement 2: Contexto territorial agregado

**User Story:** Como recomendador, quero um contexto por bairro/RPA, para sugerir serviços com base no território mesmo quando o cidadão tem pouco histórico.

#### Acceptance Criteria
1. THE sistema SHALL manter uma tabela `contexto_territorial` com: bairro_id, bairro_normalizado, rpa, qtd_escolas, qtd_unidades_saude, fonte, data_referencia.
2. WHEN `cidadaos.bairro` (ou `rpa`) for ligado ao contexto THEN o sistema SHALL normalizar o nome do bairro (maiúsculas, sem acentos, "de/da") nas duas tabelas antes do join.
3. IF um bairro do cidadão não encontrar correspondência THEN o sistema SHALL usar o contexto da RPA e registrar o caso, sem falhar.
4. THE tabela SHALL conter apenas dados agregados, sem nome, CPF, endereço ou foto.
5. THE sistema SHALL tratar as 8 Distritos Sanitários da saúde como distintos das 6 RPAs; a ligação da saúde SHALL ser por bairro.

### Requirement 3: Gatilhos de ciclo de vida e calendário

**User Story:** Como recomendador, quero gatilhos com janelas de calendário oficiais, para sugerir o serviço certo na hora certa.

#### Acceptance Criteria
1. THE sistema SHALL manter uma tabela `gatilho_ciclo_vida` com: gatilho_id, descricao, idade_min, idade_max, condicao, servico_id (FK servicos), janela_inicio, janela_fim, fonte_url.
2. WHEN um gatilho tiver janela THEN o sistema SHALL ativá-lo somente dentro de janela_inicio e janela_fim.
3. WHEN existir criança de 0 a 3 anos na família sem uso do serviço 839, durante 05/11/2026 a 10/12/2026 THEN o sistema SHALL ativar o gatilho de matrícula na creche.
4. WHEN existir criança de 9 a 14 anos na família THEN o sistema SHALL ativar o gatilho de vacinação HPV.
5. WHEN a família tiver aluno na rede e Bolsa Família, durante o bimestre vigente THEN o sistema SHALL ativar o gatilho de acompanhamento de frequência (serviço 1148).
6. WHEN a idade do cidadão for maior ou igual a 60 THEN o sistema SHALL ativar os gatilhos de vacina de influenza e Academia da Cidade (serviço 331).
7. WHEN houver a flag de hipertensão ou diabetes THEN o sistema SHALL ativar o gatilho do Conecta Medicamentos (serviço 1101).
8. WHEN o cidadão for tutor de animal e não tiver usado o serviço 34 THEN o sistema SHALL ativar o gatilho de castração.
9. THE sistema SHALL NOT sugerir matrícula 2027 a quem já estuda na rede municipal (renovação automática).

### Requirement 4: Enriquecimento do catálogo de serviços

**User Story:** Como recomendador, quero públicos, faixas etárias e janelas nos serviços, para casar gatilhos com ofertas reais.

#### Acceptance Criteria
1. THE sistema SHALL manter `servico_enriquecido` com: servico_id (FK), publico_alvo, faixa_etaria, janela_inicio, janela_fim, sazonalidade, fonte_url.
2. THE sistema SHALL registrar a fonte oficial (URL) de cada janela e faixa etária.
3. IF um dado não tiver fonte verificada THEN o registro SHALL ser marcado `nao_verificado` e SHALL NOT ser usado em gatilhos ativos.

### Requirement 5: Ordenação com elegibilidade universal

**User Story:** Como cidadão, quero ver todos os serviços a que tenho direito, para não ser limitado por renda ou bairro.

#### Acceptance Criteria
1. THE sistema SHALL calcular `score = 0,5 × co-ocorrência de jornadas + 0,3 × gatilho ativo + 0,2 × contexto do bairro` (pesos configuráveis).
2. THE contexto do território, a renda e a condição de benefício SHALL apenas ordenar os cards e SHALL NOT excluir serviço elegível.
3. WHEN o cidadão for elegível a um serviço por idade e condição THEN o serviço SHALL aparecer na lista, mesmo com score baixo.

### Requirement 6: Explicabilidade e controle do cidadão

**User Story:** Como cidadão, quero entender e controlar as sugestões que recebo.

#### Acceptance Criteria
1. WHEN um card for exibido THEN o sistema SHALL mostrar "Por que estou vendo isso?" com um motivo em linguagem simples (ex.: "Há N escolas municipais no seu bairro").
2. THE card SHALL oferecer "Não me interessa" e "Não usar meus dados para sugestões".
3. WHEN o cidadão escolher "Não usar meus dados" THEN o sistema SHALL parar de personalizar por histórico e SHALL manter apenas sugestões universais.

### Requirement 7: Privacidade e dados sensíveis

**User Story:** Como Prefeitura, quero que dados de saúde e de crianças sejam tratados com minimização.

#### Acceptance Criteria
1. THE sistema SHALL NOT exibir diagnóstico ou condição de saúde no texto de card ou notificação; SHALL usar apenas uma flag de elegibilidade.
2. THE sistema SHALL tratar "aceita avisos" como preferência de canal de notificação, e não como base legal do tratamento.
3. WHEN o gatilho envolver criança THEN o serviço sugerido SHALL ser em benefício direto da criança.
4. THE sistema SHALL NOT coletar dados de redes sociais ou de perfis individuais.
5. THE documentação SHALL registrar a base legal presumida (LGPD art. 11, II, "b" e art. 23) como hipótese a validar com o jurídico.

### Requirement 8: Cold start

**User Story:** Como cidadão novo, quero sugestões úteis desde o primeiro acesso.

#### Acceptance Criteria
1. WHEN o cidadão não tiver histórico THEN o sistema SHALL sugerir serviços por gatilhos de idade/calendário e por contexto do bairro.
2. THE sugestão por contexto SHALL ser explicada ao usuário (ex.: "Popular no seu bairro").

### Requirement 9: Casos de teste (personas)

**User Story:** Como desenvolvedora, quero personas reais como critérios de aceite.

#### Acceptance Criteria
1. WHEN o cidadão C076260 (mulher, 25 anos, RPA 5, Cadastro Único e Bolsa Família, criança de 7 a 11 anos, 17 visitas) for avaliado THEN o sistema SHALL sugerir acompanhamento de frequência (1148) e contexto de escolas da RPA 5, SHALL sugerir HPV somente se houver criança de 9 a 14 anos, e SHALL NOT sugerir creche nem matrícula 2027 se o aluno já estiver na rede.
2. WHEN o cidadão C062244 (homem, 70 anos, RPA 6, hipertensão e diabetes, tutor de animal, Cadastro Único, aceita avisos, 3 visitas) for avaliado THEN o sistema SHALL sugerir influenza, Academia da Cidade (331), Conecta Medicamentos (1101) e castração (34), sem exibir a condição de saúde.
3. WHEN um cidadão novo, sem histórico, de bairro com muitas crianças for avaliado THEN o sistema SHALL retornar sugestões por contexto e calendário.
