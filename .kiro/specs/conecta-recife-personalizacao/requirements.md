# Documento de Requisitos

## Introdução

Protótipo para o Desafio 1 do HACKA/TS 2026: inovar a jornada no aplicativo Conecta Recife com uma experiência mais personalizada, intuitiva e eficiente. A solução tem duas frentes, construídas nesta ordem:

- **A. Home personalizada** (funcionalidades 1 e 2), com motivo em cada item e controle do cidadão (funcionalidade 6).
- **C. Serviços solicitados** (funcionalidades 4 e 7), um card de acompanhamento por etapas em 2 serviços.

A jornada simplificada de um serviço (funcionalidade 3) e a acessibilidade (funcionalidade 5) são atendidas por toque: telas puladas quando o campo vem do perfil, linguagem simples e telas acessíveis.

As telas são montadas no Kodiak. O Kodiak chama nossa API, que lê os dados em `BD/` (cidadaos, historico, servicos, uso_semanal, visitas_sem_login). Todos os dados são fictícios.

Documentos de apoio: `perfis-de-usuario.md` (nesta pasta), `docs/escopo-agente-e-dados.md` e `docs/kodiak-referencia.md`.

## Glossário

- **Home**: tela inicial do aplicativo para o cidadão.
- **Bloco**: seção da Home com poucos itens (por exemplo, "Seus atalhos").
- **Motivo**: etiqueta curta que explica por que um item aparece.
- **Cidadão logado**: pessoa com `cidadao_id` identificado.
- **Pouco histórico**: cidadão logado com poucos ou nenhum registro em `historico`.
- **Visitante**: pessoa sem login, presente apenas em `visitas_sem_login`.
- **Marcador**: coluna de `cidadaos` que descreve o perfil (por exemplo, `tutor_animal`, `gestante`).
- **Consentimento de saúde**: autorização do cidadão para usar `hipertensao`, `diabetes`, `saude_mental` e `gestante` na personalização (LGPD, art. 11). Finalidade `saude_personalizacao`.
- **Consentimento de acessibilidade**: autorização separada para usar `pessoa_com_deficiencia` na personalização (LGPD, art. 11). Finalidade `acessibilidade_personalizacao`. Não libera nenhum dado de saúde, e o consentimento de saúde não libera este.
- **Serviço de jornada**: serviço com natureza Agendamento ou Peticionador, `passos` preenchidos e `nivel_digital_atual` >= 2.
- **Solicitação**: pedido simulado de um cidadão a um serviço de jornada, com etapas e status.
- **API**: serviço HTTPS público que o Kodiak chama para obter dados e executar ações.

## Requisitos

### Requisito 1: Perfis de usuário

**História de usuário:** Como pessoa que usa o Conecta Recife, quero uma experiência adequada ao meu nível de identificação, para que o app funcione bem mesmo sem login ou com pouco histórico.

#### Critérios de aceitação

1. QUANDO o cidadão estiver logado e tiver histórico, ENTÃO o sistema DEVE exibir a Home personalizada com todos os blocos aplicáveis.
2. QUANDO o cidadão estiver logado e tiver pouco histórico, ENTÃO o sistema DEVE exibir a mesma Home, com sugestões baseadas no perfil e em serviços populares de perfis parecidos.
3. QUANDO a base da sugestão for o perfil e não o histórico, ENTÃO o sistema DEVE informar isso ao cidadão.
4. QUANDO o usuário não estiver logado, ENTÃO o sistema DEVE exibir uma Home simplificada, com menos blocos e menos texto, os serviços mais usados primeiro, busca e atalhos de 1 toque.
5. O sistema NÃO DEVE tentar ligar um visitante a um cidadão; visitas sem login servem apenas para estatística agregada.

### Requisito 2: Home personalizada em blocos

**História de usuário:** Como cidadão logado, quero uma Home com poucos itens relevantes para mim, para chegar rápido ao que preciso.

#### Critérios de aceitação

1. A Home DEVE ter os grupos "Seus atalhos", "Recomendados" e "Acompanhamento".
2. O bloco "Seus atalhos" DEVE listar os serviços que o cidadão mais usa, em posição fixa.
3. O grupo "Recomendados" DEVE conter, quando aplicáveis, os blocos: "Continue seu pedido", "Para sua família", "Seus direitos", "Quem é como você também usa", "Nesta época do ano", "Para não esquecer", "Cuidar de você", "Você e seu pet", "Salvos" e "Próximo passo dentro do serviço".
4. O bloco "Continue seu pedido" DEVE mostrar o que o cidadão começou e não terminou.
5. O bloco "Para sua família" DEVE usar os marcadores do perfil (por exemplo, `criancas_na_familia`).
6. O bloco "Seus direitos" DEVE usar o texto "pode ter direito a" e NÃO DEVE afirmar o direito como certo.
7. O bloco "Quem é como você também usa" DEVE sugerir o próximo passo comportamental, calculado a partir de sequências de sessões.
8. O bloco "Nesta época do ano" DEVE usar a sazonalidade de `uso_semanal`.
9. O bloco "Para não esquecer" DEVE mostrar prazos simulados.
10. O bloco "Você e seu pet" DEVE aparecer para tutores de animal (`tutor_animal`) sem exigir consentimento.
11. O bloco "Salvos" DEVE listar os favoritos do cidadão.
12. QUANDO o cidadão concluir um serviço X, ENTÃO o sistema DEVE sugerir um serviço Y relacionado como "Próximo passo dentro do serviço".
13. A Home DEVE exibir poucos itens por bloco e NÃO DEVE exibir um bloco vazio.
14. A Home DEVE incluir pelo menos 1 serviço novo para o cidadão, com o motivo "Pessoas como você também usam".
15. SE o marcador `criancas_na_familia` estiver vazio, ENTÃO o sistema DEVE tratá-lo como desconhecido e NÃO DEVE assumir `nenhuma`.
16. O sistema NÃO DEVE sugerir "Inscrever-se no Cadastro Único" nem "Receber o Bolsa Família" a quem já possui `cadastro_unico` ou `bolsa_familia`; nesses casos, DEVE mostrar o Bolsa Família como status e sugerir atualizar cadastro ou agendar atendimento.
17. O sistema DEVE evitar repetição, com no máximo 2 itens do mesmo órgão entre os 5 primeiros.

### Requisito 3: Motivo e controle do cidadão

**História de usuário:** Como cidadão, quero entender por que vejo cada item e poder desligar a personalização, para ter controle sobre o que o app faz com meus dados.

#### Critérios de aceitação

1. Cada item recomendado DEVE exibir uma etiqueta de motivo (por exemplo, perfil, histórico, época do ano, "Pessoas como você também usam").
2. Cada item DEVE oferecer a opção "Por que vejo isso?", que explica a origem da sugestão em linguagem simples.
3. O cidadão DEVE poder desligar a personalização, por bloco ou por completo.
4. QUANDO a personalização estiver desligada, ENTÃO o sistema DEVE exibir a Home simplificada do Requisito 1.4.
5. O sistema DEVE respeitar a escolha do cidadão em acessos seguintes.

### Requisito 4: Consentimento e privacidade de saúde

**História de usuário:** Como cidadão, quero decidir se meus dados de saúde são usados, para proteger minha privacidade.

#### Critérios de aceitação

1. ENQUANTO não houver consentimento de saúde concedido, o sistema NÃO DEVE ler nem usar `hipertensao`, `diabetes`, `saude_mental` e `gestante` na personalização.
1a. ENQUANTO não houver consentimento de acessibilidade concedido, o sistema NÃO DEVE ler nem usar `pessoa_com_deficiencia` na personalização, nem sugerir serviços voltados a pessoas com deficiência.
1b. Os dois consentimentos DEVEM ser independentes: cada um tem texto, registro, recusa e revogação próprios, e conceder um NÃO DEVE conceder o outro.
1c. O sistema DEVE usar a informação de acessibilidade apenas para filtrar e ordenar sugestões, sem pedir laudo ou detalhes da condição e sem compartilhá-la com terceiros.
2. O bloco "Cuidar de você" DEVE aparecer somente com consentimento de saúde concedido. As sugestões de acessibilidade DEVEM aparecer somente com consentimento de acessibilidade concedido.
3. O título dos blocos e o motivo dos itens NÃO DEVEM citar a condição de saúde ou a deficiência do cidadão.
4. O sistema DEVE pedir cada consentimento sem pressionar o cidadão e DEVE manter a Home normal se ele recusar. O convite de acessibilidade DEVE ser o mesmo para todas as pessoas, para não revelar quem tem deficiência.
5. O cidadão DEVE poder revogar o consentimento a qualquer momento.
6. O sistema DEVE registrar cada mudança de consentimento (concedido, recusado, revogado) com data.
7. O sistema NÃO DEVE inferir saúde a partir do comportamento de uso.
8. O sistema NÃO DEVE guardar CPF, nome completo real ou endereço.

### Requisito 5: Serviços solicitados

**História de usuário:** Como cidadão, quero acompanhar meu pedido por etapas, para saber onde ele está e o que falta.

#### Critérios de aceitação

1. A Home DEVE exibir um card fixo "Serviços solicitados", com as etapas, a etapa atual e o que falta para avançar.
2. O card DEVE funcionar para exatamente 2 serviços de jornada: "Agendar consultas e procedimentos" (942) e "Agendar atendimento no Cadastro Único".
3. SE um serviço atender ao critério de serviço de jornada, ENTÃO o sistema DEVE permitir adicioná-lo ao card apenas por configuração, sem mudar a estrutura.
4. Em cada etapa, o cidadão DEVE poder relatar problema, cancelar ou alterar.
5. "Relatar problema" DEVE ser um formulário curto, acompanhado dos canais que a Carta de Serviços já informa. O sistema NÃO DEVE oferecer chat.
6. "Cancelar" e "Alterar" DEVEM ser ações simuladas que mudam o status da solicitação.
7. "Alterar" DEVE estar disponível apenas no serviço da jornada.
8. QUANDO a solicitação for concluída, ENTÃO o sistema DEVE exibir o comprovante com protocolo fictício.
9. APÓS o comprovante, o sistema DEVE pedir ao cidadão uma nota para o serviço ou a opção "Não consegui".
10. O sistema NÃO DEVE enviar solicitações reais a sistemas da Prefeitura.
11. O serviço "Agendar atendimento no Cadastro Único" corresponde ao `servico_id` 352. Os dois serviços atendem ao critério de serviço de jornada (natureza Agendamento, `passos` preenchidos, `nivel_digital_atual` 4).
12. O card DEVE separar as etapas feitas no app das etapas feitas fora dele. As etapas fora do app aparecem como "O que fazer depois", sem botão de avanço.
13. NO serviço 352, as etapas no app DEVEM ser: sobre o atendimento, documentos, local, dia e horário, avisos e revisar e confirmar. As etapas "Comparecer ao local com os documentos", "Fazer a entrevista" e "Esperar 48 horas para o NIS" DEVEM aparecer como "O que fazer depois".
14. NO serviço 942, a Carta traz apenas 2 passos de acesso (estar logado e ir em Saúde, Consultas). As etapas de pedido (local, dia e horário, confirmar) são definidas pela equipe, seguem o padrão do 352 e DEVEM ser apresentadas como simulação, sem afirmar que vêm da Carta.
15. O passo "Informar o CPF" do serviço 352 NÃO DEVE virar campo de tela. O CPF vem do perfil do cidadão, e o sistema não o guarda (Requisito 4.8).
16. Os passos "Entrar no aplicativo" e "Baixar o app" do serviço 352 NÃO DEVEM aparecer no card, pois o cidadão já está no app.
17. QUANDO todos os campos de uma tela do pedido puderem ser preenchidos a partir do perfil e forem válidos, ENTÃO o sistema DEVE pular essa tela.

### Requisito 6: API para o Kodiak

**História de usuário:** Como equipe, quero uma API pública e estável, para que o Kodiak consuma os dados nas telas.

#### Critérios de aceitação

1. A API DEVE ser acessível por HTTPS, com URL estável, para a liberação do backend pela equipe Kodiak.
2. A API DEVE expor a Home do cidadão com blocos, itens, motivos e a base da personalização ("histórico" ou "perfil").
3. A API DEVE expor a Home simplificada para visitantes e para quem desligou a personalização.
4. A API DEVE expor consentimento por finalidade (consultar, conceder, recusar, revogar) e a opção de personalização.
5. A API DEVE expor as solicitações do cidadão, com etapas, status e as ações de relatar problema, cancelar, alterar e avaliar.
6. QUANDO um campo de dado não puder ser lido, ENTÃO a API DEVE devolver erro claro, para o Kodiak tratar com tela de erro customizada.
7. A URL base da API DEVE ser configurável por ambiente, sem valor fixo nas telas.

### Requisito 7: Medição por eventos

**História de usuário:** Como equipe, quero medir o uso do protótipo, para demonstrar o resultado no pitch.

#### Critérios de aceitação

1. O sistema DEVE registrar um evento para cada ação relevante, sem texto livre ou dado sensível.
2. Os eventos de solicitação DEVEM incluir: etapa concluída, abandono, problema relatado e nota.
3. Os eventos do fluxo por toque DEVEM incluir `tela_pulada`, quando uma tela é pulada porque todos os campos vieram do perfil e são válidos.
4. Os eventos da Home DEVEM incluir: item exibido, item aberto, "Por que vejo isso?" aberto e personalização desligada.
5. A avaliação final do serviço DEVE ser usada como medição de satisfação.

### Requisito 8: Demonstração

**História de usuário:** Como equipe, quero demonstrar o antes e o depois, para mostrar o valor da solução.

#### Critérios de aceitação

1. A demo DEVE mostrar lado a lado a Home sem login e a Home com login.
2. A demo DEVE usar pelo menos duas personas com dados fictícios: uma mãe com criança pequena e um senhor de 70 anos.
3. A demo DEVE percorrer ponta a ponta o agendamento de um serviço de jornada, por toque.

### Requisito 9: Entrar como qualquer cidadão

**História de usuário:** Como jurado ou membro da equipe, quero entrar como qualquer cidadão pelo `cidadao_id`, para ver a solução funcionar com perfis diferentes.

#### Critérios de aceitação

1. O protótipo DEVE oferecer uma forma de "entrar como" um cidadão informando o `cidadao_id`.
2. O sistema DEVE funcionar para qualquer um dos 89.046 `cidadao_id` de `cidadaos.csv`, inclusive os 5.778 sem histórico.
3. O protótipo DEVE oferecer atalhos para as 8 personas oficiais do Guia dos dados (C007938, C068579, C059592, C036462, C039227, C076260, C006566, C062244).
4. SE o `cidadao_id` não existir, ENTÃO o sistema DEVE informar de forma clara e permitir tentar de novo.
5. O sistema DEVE permitir comparar dois cidadãos lado a lado na apresentação.

### Requisito 10: Acessibilidade e linguagem simples

**História de usuário:** Como cidadão com necessidades diferentes, quero telas claras no celular, para usar o app com autonomia.

#### Critérios de aceitação

1. Todas as telas DEVEM usar linguagem simples, com frases curtas e sem sigla sem explicação.
2. Os textos DEVEM ter contraste adequado e tamanho de leitura confortável.
3. Os itens tocáveis DEVEM ter área de toque suficiente e rótulo legível por leitor de tela.
4. Nenhuma informação DEVE depender só de cor.
5. QUANDO o cidadão tiver o marcador `pessoa_com_deficiencia`, ENTÃO o sistema NÃO DEVE mudar a interface sem que ele peça; as opções de acessibilidade ficam disponíveis a todos. O marcador só influencia as sugestões de serviço, e apenas com o consentimento de acessibilidade (Requisito 4.1a).
6. Os textos DEVEM ser curtos, e cada elemento sem texto visível (ícone, botão) DEVE ter rótulo para leitor de tela.
7. Os requisitos e passos dos serviços da jornada DEVEM ser reescritos em linguagem simples e pedir apenas o necessário.

### Requisito 11: Arquivo de recomendações (opcional)

**História de usuário:** Como equipe, quero gerar o `recomendacoes.csv`, para que os jurados meçam a qualidade das sugestões com dados.

#### Critérios de aceitação

1. O sistema DEVE gerar `recomendacoes.csv` em UTF-8, com cabeçalho e vírgula, com as colunas `cidadao_id`, `posicao`, `servico_id` e `motivo`.
2. O arquivo DEVE conter todos os 89.046 cidadãos, inclusive os sem histórico, e NÃO DEVE conter visitantes sem login.
3. O arquivo DEVE ter até 10 sugestões por cidadão, com `posicao` de 1 a 10 e `servico_id` existente em `servicos.csv`.
4. O sistema DEVE priorizar serviços que o cidadão ainda não usou, porque serviço já usado não conta como acerto.
5. O `motivo` DEVE ser o mesmo texto que o cidadão veria na Home e NÃO DEVE usar dado de saúde sem consentimento.
6. O sistema DEVE validar o arquivo antes da entrega (total de cidadãos, limite de 10, serviços válidos).
