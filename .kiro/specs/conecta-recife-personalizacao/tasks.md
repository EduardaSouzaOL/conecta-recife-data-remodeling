# Implementation Plan: Conecta Recife Personalização

## Overview

Ordem de construção: dados, base da API, frente A (Home), frente C (Serviços solicitados), medição, telas no Kodiak, demo e AWS. A voz (Broto) saiu do escopo e não tem tarefas aqui.

## Tasks

- [ ] 1. Camada de dados de `BD/`
  - [x] 1.1 Guardar `ordem_na_sessao` e ordenar o histórico por `(data, hora, sessao_id, ordem_na_sessao)`
    - Ajustar `dados.js` para guardar a coluna e `derivar` para não depender do arquivo ordenado
    - Manter o resultado atual: nas 420.969 sessões a sequência de serviços não pode mudar
    - _Requisitos: 2.7; Design 3.4, 3.5_
  - [ ] 1.2 Criar a validação de dados (`npm run validar-dados`) e ligá-la à partida e ao `GET /health`
    - Conferir contagens (89.046 cidadãos, 593.056 acessos, 843 serviços, 5.778 sem histórico, 11.587 linhas de uso) e integridade de `cidadao_id` e `servico_id`
    - Conferir valores válidos de `situacao_renda` e `criancas_na_familia`
    - Na partida só registrar aviso, sem impedir a API de subir
    - _Requisitos: 9.2, 2.15; Design 3.10_
  - [ ] 1.3 Acrescentar `sazonal` e `mais_usados_sem_login` aos derivados e subir `VERSAO` para 3
    - `sazonal`: janela de ±2 semanas da mesma época do ano anterior contra a média do serviço, razão ≥ 1,3 e volume mínimo
    - `mais_usados_sem_login`: visitantes distintos por serviço em `visitas_sem_login.csv`, desempate por cliques; uso apenas agregado
    - Tratar semana sem linha como "menos de 10 visitantes", não zero; somar só `cliques`, sem misturar `visitantes` de `login = sim` e `nao`
    - Rodar `npm run derivar` e conferir o `derivados.json` gerado
    - _Requisitos: 2.8, 1.4, 1.5; Design 3.6_
  - [ ]* 1.4 Escrever testes da camada de dados
    - Contagens e integridade da tarefa 1.2
    - Ordem dos cliques da tarefa 1.1
    - `criancas_na_familia` vazio nunca vira `nenhuma`
    - _Requisitos: 2.15, 9.2; Design 11_

- [ ] 2. Base da API para o Kodiak
  - [ ] 2.1 Aplicar o prefixo `/v1` a todas as rotas e manter as rotas sem prefixo como apelido
    - Corrigir o índice (`GET /`), que ainda anuncia PATCH; o Kodiak só usa GET, POST, PUT e DELETE
    - Adicionar `DELETE` ao CORS e ao roteador
    - _Requisitos: 6.1, 6.7; Design 4.1, 4.4, 4.5_
  - [ ] 2.2 Padronizar respostas e erros
    - Toda resposta de sucesso traz `ok` e `erros`
    - Erros HTTP no formato `{ erro, mensagem }`, com os códigos e status da tabela do design (inclui `solicitacao_nao_encontrada`)
    - Validação recuperável volta com 200 e `ok: false` (hoje `confirmacao_necessaria` e `campos_pendentes` voltam com 400 e 422)
    - _Requisitos: 6.6; Design 4.2, 4.4_
  - [ ] 2.3 Fazer a visão do pedido (`jornada.js`) devolver sempre todas as chaves
    - `resumo`, `protocolo`, `descricao` e demais campos ausentes viram `null`, `""` ou `[]`
    - Alinhar os nomes ao contrato da seção 4.5 (`tela_atual` com id, `campos`, `puladas`)
    - _Requisitos: 6.6, 5.17; Design 4.4, 4.5_
  - [ ] 2.4 Ajustar "Entrar como"
    - `POST /v1/entrar/{id}` deixa de devolver o bloco `saude`; a saúde só é lida dentro do servidor, com consentimento
    - `GET /v1/demo/cidadaos` inclui as 8 personas oficiais (C007938, C068579, C059592, C036462, C039227, C076260, C006566, C062244)
    - ID inexistente devolve `cidadao_nao_encontrado` com a faixa válida
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 4.1; Design 3.9, 4.5, 10_
  - [ ] 2.5 Ampliar `EVENTOS_PERMITIDOS` com os eventos da Home e da solicitação
    - `item_exibido`, `item_aberto`, `por_que_aberto`, `personalizacao_desligada`, `personalizacao_ligada`, `etapa_concluida`, `abandono`, `problema_relatado`, `nota_dada`
    - Evento só com `cidadao_id`, `tipo`, `ts` e no máximo `servico_id`, `tela` ou `bloco`; nunca texto livre
    - _Requisitos: 7.1, 7.2, 7.4; Design 7.1_
  - [ ]* 2.6 Escrever testes da base da API
    - Erro 404 para id inexistente e 400 para id inválido
    - `ok: false` com 200 em validação recuperável
    - `entrar` nunca devolve `saude`
    - _Requisitos: 6.6, 9.4, 4.1; Design 11_

- [ ] 3. Checkpoint: dados e base da API
  - Rodar `npm run derivar`, subir a API e conferir `GET /v1/health` e `GET /v1/demo/cidadaos`. Perguntar ao usuário se há dúvidas antes de continuar.

- [ ] 4. Frente A: motor da Home
  - [ ] 4.1 Preparar `regras.js` e `vitrine.js` para blocos
    - Cada regra de `REGRAS` ganha o campo `bloco`; o item passa a carregar `regra` além de `origem`
    - Acrescentar a regra do bloco "Para o seu dia a dia" (MEI, empreendedor, servidor, proprietário) como configuração
    - Item com `titulo`, `subtitulo`, `tag`, `motivo`, `porque { texto, base }`, `acao`, `jornada_disponivel` e `rotulo_acessivel`
    - Itens de saúde com `titulo` discreto ("Cuidado com a sua saúde") e motivo "Aparece porque você autorizou"; o nome real só no detalhe
    - _Requisitos: 3.1, 3.2, 4.3, 10.3; Design 4.5, 5.3, 5.4_
  - [ ] 4.2 Preparar `montarVitrine` para reuso
    - Opções `excluirUsados` e `ignorarConsentimento`
    - Calcular o ranking de populares uma vez, não a cada chamada
    - _Requisitos: 11.4, 11.5; Design 9_
  - [ ] 4.3 Criar o montador de blocos (`home.js`)
    - Seus atalhos: até 4 serviços mais usados do `historico`, por frequência e depois recência, em posição fixa
    - Continue seu pedido: jornadas `em_andamento`
    - Para sua família: marcadores `criancas_na_familia`; vazio é desconhecido
    - Seus direitos: texto "pode ter direito a"; quem já tem Cadastro Único ou Bolsa Família vê o Bolsa Família como status e as sugestões de atualizar cadastro e agendar atendimento (352), sem 1032 e 995
    - Quem é como você também usa: `proximo[último serviço]` e populares de serviços novos
    - Nesta época do ano: `sazonal`
    - Para não esquecer: tabela de prazos simulados, rotulada "Prazo de exemplo"
    - Cuidar de você: só com consentimento concedido, título genérico
    - Você e seu pet: `tutor_animal`, sem consentimento
    - Salvos e Próximo passo dentro do serviço
    - _Requisitos: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.15, 2.16, 4.2; Design 5.4, 5.5_
  - [ ] 4.4 Aplicar as regras de montagem da Home
    - Até 3 itens por bloco; bloco vazio não é devolvido
    - Serviço aparece uma só vez, no bloco de maior prioridade
    - No máximo 2 itens do mesmo órgão entre os 5 primeiros
    - Pelo menos 1 serviço novo com o motivo "Pessoas como você também usam"
    - Título de bloco nunca cita condição de saúde
    - Blocos em `blocos_desligados` não são devolvidos
    - _Requisitos: 2.13, 2.14, 2.17, 4.3, 3.3; Design 5.4_
  - [ ]* 4.5 Escrever testes do motor da Home
    - Sem consentimento, nenhum campo ou item de saúde sai de `entrarComo` nem da Home
    - Sem bloco vazio, máximo de 2 por órgão nos 5 primeiros, pelo menos 1 serviço novo
    - Nenhum "Inscrever-se no Cadastro Único" para quem já tem
    - Persona C007938 (idosa, sem marcadores) e C076260 (família com criança) geram Homes diferentes
    - _Requisitos: 2.13, 2.14, 2.16, 2.17, 4.1; Design 11_

- [ ] 5. Frente A: rotas, controle do cidadão e Home simplificada
  - [ ] 5.1 Criar `preferencias` e `salvos` no `store.js`, com as rotas
    - `GET` e `POST /v1/preferencias/{id}` (`personalizacao` ligada ou desligada e `blocos_desligados`); valor inválido volta `ok: false`
    - `GET`, `POST` e `DELETE /v1/salvos/{id}` (DELETE com `servico_id` na query); salvar duas vezes é `ok: true`
    - A escolha vale nos acessos seguintes
    - _Requisitos: 3.3, 3.5, 2.11, 6.4; Design 5.7, 4.5_
  - [ ] 5.2 Criar `GET /v1/home/{id}`
    - Home em grupos (Seus atalhos, Recomendados, Acompanhamento), com `modo`, `base_da_personalizacao`, `explicacao_geral`, `aviso_saude`, `preferencias` e `convite_consentimento`
    - `base_da_personalizacao` diz "histórico" ou "perfil" e a explicação avisa quando a base é o perfil
    - Uma única chamada traz tudo que a tela precisa
    - _Requisitos: 1.1, 1.2, 1.3, 2.1, 6.2, 4.4; Design 4.4, 4.5, 5.3, 5.9_
  - [ ] 5.3 Criar a Home simplificada
    - `GET /v1/home` (visitante) e `GET /v1/home/{id}` com personalização desligada devolvem `modo: "simplificada"`
    - Até 4 atalhos e 6 "Mais usados" (`mais_usados_sem_login`, nível digital ≥ 3), sem tag nem "Por que vejo isso?"
    - O visitante nunca é ligado a um cidadão; para quem está logado, o card de Acompanhamento continua
    - _Requisitos: 1.4, 1.5, 3.4, 6.3; Design 5.7, 5.8_
  - [ ] 5.4 Criar `GET /v1/servicos/busca?q=`
    - Normalizar sem acento e em minúsculas; procurar em `nome`, `nome_resumido` e `palavras_chave`; até 8 resultados
    - `q` vazio devolve `total: 0` sem erro
    - _Requisitos: 1.4; Design 5.8, 4.5_
  - [ ] 5.5 Registrar os eventos da Home
    - `item_exibido` e `item_aberto` por bloco, `por_que_aberto`, `personalizacao_desligada` e `personalizacao_ligada`
    - _Requisitos: 7.4, 3.2; Design 7.1_
  - [ ]* 5.6 Escrever testes das rotas da Home
    - Home de quem tem 0 acessos funciona e informa que a base é o perfil
    - Desligar a personalização muda o `modo` e persiste entre acessos
    - Visitante recebe a Home sem `cidadao_id`
    - _Requisitos: 1.2, 1.3, 3.4, 3.5; Design 11_

- [ ] 6. Frente C: Serviços solicitados
  - [ ] 6.1 Ajustar a configuração das jornadas (`jornada.js`)
    - Limitar o card a 352 e 942 por configuração; um serviço que atenda ao critério entra só acrescentando configuração
    - Acrescentar ao 352 as etapas "O que fazer depois": comparecer com os documentos, entrevista e esperar 48 horas para o NIS; o 942 termina em "Agendado"
    - Reescrever requisitos e passos do 352 e do 942 em linguagem simples; passos "Entrar no aplicativo", "Baixar o app" e "Informar o CPF" não viram etapa nem campo
    - Marcar o 942 como simulação nas etapas de pedido
    - _Requisitos: 5.2, 5.3, 5.11, 5.12, 5.13, 5.14, 5.15, 5.16, 10.7; Design 6.1, 6.2, 6.3, 6.7_
  - [ ] 6.2 Criar o modelo de solicitação e `GET /v1/cidadaos/{id}/solicitacoes`
    - A solicitação é uma jornada vista com etapas; estados `em_andamento`, `concluida` e `cancelada`
    - Etapas no app mais etapas "O que fazer depois"; etapa atual, `o_que_falta`, `acoes` e `canais` (só `canal_web` do catálogo)
    - Sem solicitações devolve `solicitacoes: []`
    - _Requisitos: 5.1, 5.4, 5.12, 6.5; Design 6.4_
  - [ ] 6.3 Criar as ações da solicitação
    - `problema`: categoria de lista fixa e descrição até 200 caracteres, com o filtro de CPF, telefone, e-mail e endereço; devolve os canais; sem chat
    - `cancelar` e `alterar`: simuladas; `alterar` reabre na tela `data_hora`, mantém o protocolo e vale só para os serviços de jornada
    - `avaliacao`: nota de 1 a 5 ou `nao_consegui`, só depois do comprovante, uma por solicitação
    - `avancar`: simulado, só para a demo
    - _Requisitos: 5.4, 5.5, 5.6, 5.7, 5.9, 4.8, 6.5; Design 6.5, 4.5_
  - [ ] 6.4 Completar o comprovante e o próximo passo
    - A conclusão traz `protocolo` fictício (`DEMO-AAAA-XXXXXX`), `concluida_em`, `resumo` e `proximo_passo`
    - `proximo_passo` é o primeiro item de `proximo[servico]` que o cidadão ainda não usou, e alimenta o bloco "Próximo passo dentro do serviço"
    - Pedir a nota ou "Não consegui" depois do comprovante
    - _Requisitos: 5.8, 5.9, 2.12; Design 6.6_
  - [ ] 6.5 Ligar a solicitação à Home
    - O card "Serviços solicitados" entra no grupo Acompanhamento da Home, com os mesmos itens de `acao` (`ver_solicitacao`, `retomar_pedido`)
    - "Continue seu pedido" usa as jornadas em andamento
    - _Requisitos: 5.1, 2.4, 2.1; Design 4.5, 6.4_
  - [ ] 6.6 Registrar os eventos e o abandono
    - `etapa_concluida`, `problema_relatado`, `nota_dada` e `tela_pulada`
    - Abandono: jornada `em_andamento` parada há mais de 30 minutos conta na etapa em que parou, calculado na leitura do resumo
    - _Requisitos: 7.2, 7.3; Design 7.1, 7.2_
  - [ ]* 6.7 Escrever testes da frente C
    - O pedido só conclui com `confirmar = true`
    - Tela é pulada quando todos os campos vêm do perfil e são válidos
    - Texto livre recusa CPF
    - Cancelar, alterar e avaliar mudam o estado como esperado; avaliar antes do comprovante dá `ok: false`
    - Serviço fora de 352 e 942 não aparece no card
    - _Requisitos: 5.6, 5.9, 5.17, 4.8; Design 11_

- [ ] 7. Checkpoint: frentes A e C
  - Percorrer pela API as personas C007938, C076260 e uma sem histórico: Home, agendamento do 352 do começo ao comprovante, avaliação. Garantir que tudo passa e perguntar ao usuário se há dúvidas.

- [ ] 8. Medição e acessibilidade
  - [ ] 8.1 Expandir `GET /v1/eventos/resumo`
    - Conclusão por serviço, abandono por etapa, telas puladas, nota média e quantidade de "Não consegui", itens abertos ÷ itens exibidos
    - _Requisitos: 7.2, 7.3, 7.4, 7.5; Design 7.3_
  - [ ] 8.2 Conferir linguagem simples e rótulos nas respostas
    - Textos curtos, sem sigla sem explicação, `rotulo_acessivel` em todo item, situação das etapas em texto ("feita", "atual", "falta")
    - Marcador `pessoa_com_deficiencia` não muda nada na resposta
    - _Requisitos: 10.1, 10.3, 10.4, 10.5, 10.6; Design 8_

- [ ] 9. `recomendacoes.csv` (opcional)
  - [ ] 9.1 Criar `scripts/gerar-recomendacoes.js`
    - Para os 89.046 cidadãos, usar `montarVitrine` com `limite: 10`, sem consentimento de saúde para todos e sem serviços já usados
    - Completar até 10 com os mais populares ainda não usados, sem repetir serviço
    - Gravar `data/recomendacoes.csv` (UTF-8, vírgula, LF, `cidadao_id,posicao,servico_id,motivo`, aspas onde houver vírgula)
    - Medir o tempo de geração
    - _Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5; Design 9_
  - [ ] 9.2 Criar `scripts/validar-recomendacoes.js`
    - 89.046 cidadãos presentes (inclusive 5.778 sem histórico), nenhum visitante, no máximo 10 linhas por cidadão, `posicao` de 1 a 10 sem repetição, `servico_id` existente, nenhum serviço já usado
    - _Requisitos: 11.2, 11.3, 11.6; Design 9_

- [ ] 10. Telas no Kodiak
  - [ ] 10.1 Confirmar com o suporte Kodiak os pontos em aberto
    - Se `response.error` e `response.info` leem `erro` e `mensagem`; se um domínio AWS é aceito na liberação do backend; o item 8.7 do edital
    - Pedir a liberação do backend com a URL pública, depois da implantação em homologação (tarefa 12.7)
    - _Requisitos: 6.1, 6.6, 6.7; Design 4.4, 12, 13.3_
  - [ ] 10.2 Criar a configuração de ambiente no Kodiak
    - URL da API em variável (`#server{...}`), nunca fixa nas telas, para homologação e produção
    - _Requisitos: 6.7; Design 13.7_
  - [ ] 10.3 Montar as telas de entrada e Home
    - Usar as skills de templates, requisições, iteráveis, expressões e actions; validar cada tela antes de criar
    - Entrar como (campo do `cidadao_id` e atalhos das 8 personas)
    - Home (personalizada e simplificada na mesma tela), Busca e Detalhe do serviço
    - Consentimento, Privacidade e Preferências
    - Tela de erro customizada, com `${alias.response.error}` e `${alias.response.info}`
    - _Requisitos: 1.1, 1.4, 3.2, 3.3, 4.4, 4.5, 9.1, 9.3, 6.6; Design 4.4_
  - [ ] 10.4 Montar as telas do pedido e do card
    - Telas do pedido (sobre, documentos, local, dia e horário, avisos), Revisar e confirmar, Comprovante e avaliação
    - Card Serviços solicitados com etapas, "O que fazer depois", relatar problema, cancelar e alterar
    - Chamadas dependentes (criar o pedido e abrir a tela) com Switch
    - _Requisitos: 5.1, 5.4, 5.8, 5.9, 5.12; Design 4.4, 6.4_

- [ ] 11. Demonstração
  - [ ] 11.1 Montar a demo lado a lado
    - Home sem login × com login; mãe com criança pequena × senhor de 70 anos, em duas requisições paralelas
    - _Requisitos: 8.1, 8.2, 9.5; Design 10_
  - [ ] 11.2 Ensaiar o agendamento do 352 do começo ao fim por toque, com a persona escolhida
    - Home, pedido, comprovante, avaliação e o card atualizado
    - _Requisitos: 8.3; Design 10_

- [ ] 12. Implantação na AWS
  - [ ] 12.1 Criar o driver DynamoDB no `store.js`
    - Escolher por `STORE=file|dynamodb`; tabela `conecta-estado` (PK `cidadao_id`, SK `tipo#ts`); eventos com TTL de 30 dias; cache em memória com gravação imediata
    - `GET /eventos/resumo` por varredura paginada, com cache de 30 s
    - Dependência do AWS SDK com versão fixada
    - _Requisitos: 4.6, 7.1; Design 13.4, 3.7_
  - [ ] 12.2 Criar o carregador S3 na partida
    - Baixar `cidadaos.csv`, `historico.csv`, `servicos.csv`, `uso_semanal.csv`, `derivados.json` e `config/`; local continua por `BD_DIR` e `DATA_DIR`
    - A imagem não contém dados; `visitas_sem_login.csv` nunca sobe
    - _Requisitos: 6.1; Design 13.5, 3.8_
  - [ ] 12.3 Mover regras, pesos, textos de motivo, prazos simulados e telas das jornadas para JSON em `config/`
    - O valor atual do código vira o padrão; mudar exige só reiniciar a tarefa
    - _Requisitos: 3.1, 5.3; Design 13.6_
  - [ ] 12.4 Endurecer o servidor para produção
    - `/painel` desligado em produção, `CORS_ORIGIN` restrito, logs em JSON
    - _Requisitos: 4.8; Design 13.8, 13.9_
  - [ ] 12.5 Criar o `Dockerfile` e o script de publicação
    - Build da imagem, push para o ECR, nova versão do serviço (ECS Express Mode); porta 8080 e `GET /health` como verificação de saúde
    - _Requisitos: 6.1; Design 13.1, 13.3, 13.10_
  - [ ] 12.6 Descrever a infra de apoio em CDK ou CloudFormation
    - Tabela, bucket privado com criptografia e expiração, papéis com o mínimo de permissão, WAF com limite de requisições, alarmes de 5xx e de tarefa fora do ar
    - Verificar na hora o suporte de IaC ao Express Mode; se faltar, criar o serviço por CLI
    - _Requisitos: 6.1; Design 13.7, 13.8, 13.9, 13.10_
  - [ ] 12.7 Implantar em homologação e depois em produção
    - Ação de alto impacto: pedir confirmação à equipe antes de criar recursos na AWS (região e conta ainda por definir)
    - Conferir `GET /health`, a URL HTTPS estável e as chamadas do Kodiak; não recriar o serviço, para a URL não mudar
    - _Requisitos: 6.1, 6.7; Design 13.3, 13.7_
  - [ ] 12.8 Preparar o encerramento
    - Roteiro para apagar serviço, tabela, bucket, repositório de imagens e logs ao fim do evento
    - _Requisitos: 4.8; Design 3.8, 13.10_

- [ ] 13. Checkpoint final
  - Garantir que o fluxo da demo funciona pela URL pública e pelo Kodiak. Perguntar ao usuário se há dúvidas.

## Notes

- O código está em `backend/src` (Node 20, sem dependências, ESM). `BD/` é somente leitura.
- Tarefas marcadas com `*` são opcionais (testes). O `package.json` já tem `npm run teste` (`node --test test/`), mas a pasta `backend/test` ainda não existe.
- Cada tarefa cita o requisito (`requirements.md`) e a seção do `design.md`.
- Premissas assumidas até haver decisão (design, seção 12): `pessoa_com_deficiencia` continua sob consentimento; o bloco "Para o seu dia a dia" entra como configuração, fácil de desligar; 923 e 633 não aparecem no card.
- Subir qualquer coisa para a AWS exige confirmação da equipe antes (tarefa 12.7).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1"] },
    { "id": 1, "tasks": ["1.3", "2.2", "2.4", "2.5", "1.4"] },
    { "id": 2, "tasks": ["2.3", "4.1", "4.2", "5.1", "2.6"] },
    { "id": 3, "tasks": ["4.3", "6.1"] },
    { "id": 4, "tasks": ["4.4", "5.4", "6.2", "4.5"] },
    { "id": 5, "tasks": ["5.2", "6.3", "6.4", "5.5"] },
    { "id": 6, "tasks": ["5.3", "6.5", "6.6", "5.6", "6.7"] },
    { "id": 7, "tasks": ["8.1", "8.2", "9.1", "12.1", "12.2"] },
    { "id": 8, "tasks": ["9.2", "12.3", "12.4"] },
    { "id": 9, "tasks": ["12.5", "12.6"] },
    { "id": 10, "tasks": ["12.7", "10.1", "10.2"] },
    { "id": 11, "tasks": ["10.3", "10.4", "12.8"] },
    { "id": 12, "tasks": ["11.1", "11.2"] }
  ]
}
```
