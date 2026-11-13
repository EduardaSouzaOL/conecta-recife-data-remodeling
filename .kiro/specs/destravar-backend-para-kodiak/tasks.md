# Implementation Plan: Seus atalhos por nicho

## Overview

Recorte: `nichos[]` com prioridade para os serviços fixados (pins) do cidadão; sem fixados, os mais usados. Só `nichos[]` no grupo `atalhos` da Home (2.11 parte de nichos, 2.13 normalização de temas). Testes em `backend/test` com `node:test`, rodando com `npm run teste`.

## Tasks

- [x] 1. Escrever o teste de exploração da condição do bug
  - Criar `backend/test/nichos.test.js` com a Home de C059592 e C007938 esperando `nichos` no bloco do grupo `atalhos`.
  - Rodar no código atual e confirmar que falha (nichos ausente).
  - _Requirements: 1.11_

- [x] 2. Escrever os testes de preservação (antes da correção)
  - Cidadão sem histórico: Home sem `nichos`.
  - Campos existentes da Home com os mesmos nomes e tipos.
  - Rodar no código atual e confirmar que passam.
  - _Requirements: 3.1, 3.5_

- [ ] 3. Implementar `recomendacao/nichos.js`
  - [x] 3.1 Normalização de temas
    - `normalizarTema(temas)`: primeiro valor com trim, não vazio e diferente de "Conecta Labs".
    - Testes: espaços sobrando, "Conecta Labs" ignorado, sem tema válido fica fora.
    - _Requirements: 2.13_
  - [x] 3.2 Agrupamento, ordenação e limites
    - `montarNichos(id, historico, podeMostrar)`: só serviços usados, nichos por usos (máx. 4), itens mais usados primeiro (máx. 6), nicho vazio ausente, `null` sem nichos, só o primeiro `aberto: true`.
    - Testes: ordenação, limites 4/6, desempates, nicho vazio ausente.
    - _Requirements: 2.11_
  - [x] 3.3 Fixados: store, rotas e eventos
    - Estado `fixados` por cidadão em `backend/src/dados/store.js` (arquivo atual, sem DynamoDB): lista ordenada de `servico_id`, em ordem de fixação, limite de 6. Entra na carga, na recarga e no salvamento como os outros objetos do estado. Sem dado sensível.
    - Rotas só GET e POST: `GET /dados/fixados/{id}` e `POST /dados/fixados/{id}` com `{ servico_id, fixar: true|false }`. Novo arquivo `api/rotas/fixados.js`, registrado no roteador.
    - Validar `servico_id` existente (erro padrão de `erros.js`: 404 se o serviço ou cidadão não existe, 422 se o corpo for inválido). Idempotente: fixar quem já está fixado ou desafixar quem não está devolve 200 sem mudar nada. Com 6 fixados, fixar outro devolve 422 com mensagem simples. Fixar serviço de saúde não exige consentimento (escolha explícita do cidadão).
    - Eventos de servidor `servico_fixado` e `servico_desafixado` (sem texto livre), registrados só quando o estado muda, e incluídos nos eventos que o servidor registra sozinho.
    - Testes: idempotência, limite 6, serviço inexistente, cidadão inexistente, corpo inválido, só GET e POST (PATCH e DELETE não existem), ordem de fixação, evento registrado.
    - _Requirements: 2.11_
  - [x] 3.4 Nichos com fixados
    - `montarNichos(id, historico, podeMostrar, fixados)`: (1) fixado entra no seu nicho mesmo sem uso; (2) no nicho, fixados primeiro (ordem de fixação), depois os mais usados; (3) nichos com algum fixado vêm antes dos demais, desempate por usos e nome; (4) sem fixados, comportamento atual; (5) sem histórico e com fixados, nichos só dos fixados; sem histórico e sem fixados, `null`; (6) limites de 4 nichos e 6 itens continuam, com fixados com prioridade no corte; (7) o primeiro nicho continua o único `aberto: true`.
    - Serviço fixado sem tema válido ou inexistente fica fora. Fixado pelo próprio cidadão aparece mesmo se `podeMostrar` o bloquearia como sugestão.
    - Testes: fixado sem uso entra, fixado primeiro, nicho com fixado antes, sem fixados igual ao atual, sem histórico com fixados, sem histórico sem fixados, corte com 6 itens e 4 nichos priorizando fixados.
    - _Requirements: 2.11_
  - [ ] 3.5 Item, banner e filtros
    - `logo { tipo: 'sigla', valor }`, `banner { titulo, texto, rotulo_botao, rotulo_leitor, acao }`, `rotulo_leitor` em todo item, `filtros[]` com "Todos".
    - "Agende aqui" para Agendamento, senão "Abrir serviço". `iniciar_jornada` só para 942 e 352. Sem telefone, horário nem local.
    - Testes: `rotulo_botao`, `acao` para 942 e 352, ausência de campo de unidade, `rotulo_leitor` em todo item, `filtros`.
    - _Requirements: 2.11_
  - [ ] 3.6 Campos de fixado no item
    - Cada item ganha `fixado: boolean`, `rotulo_fixar` ("Fixar nos atalhos" ou "Remover dos atalhos"), `acao_fixar { tipo: "fixar_servico", servico_id, fixar }` (aponta para `POST /dados/fixados/{id}`; `fixar` é o valor que o toque vai enviar) e `rotulo_leitor` coerente com o estado (por exemplo, "IPTU, fixado nos atalhos. Toque para remover.").
    - Etiqueta de motivo pronta da API: "Fixado por você" se fixado, senão "Você usa bastante". Sem citar condição de saúde.
    - Testes: os quatro campos em todo item, fixado e não fixado, `acao_fixar.fixar` oposto ao estado atual, etiqueta de motivo, `rotulo_leitor`.
    - _Requirements: 2.11, 3.3_
  - [ ] 3.7 Privacidade
    - Usar só catálogo e histórico, excluir das sugestões serviços bloqueados por `podeMostrar` (o fixado pelo próprio cidadão continua aparecendo), título do nicho sem condição de saúde.
    - Testes: nenhum termo de saúde nos títulos (C059592, C007938); sem consentimento nada muda.
    - _Requirements: 3.3_

- [ ] 4. Ligar em `recomendacao/home.js`
  - Em `montarHome`, ler os fixados do cidadão no store, passá-los a `montarNichos` e acrescentar `nichos` e `filtros` ao primeiro bloco com `grupo === 'atalhos'`. Nada mais muda.
  - Testes: persona C059592 e C007938 (com histórico) com nichos; cidadão com fixados vê fixados primeiro; cidadão sem histórico e com fixados tem nichos só dos fixados; cidadão sem histórico e sem fixados sem nichos; personalização desligada sem nichos.
  - _Requirements: 2.11, 3.1_

- [ ] 5. Verificar a correção e a preservação
  - [ ] 5.1 O teste de exploração da tarefa 1 passa
    - _Requirements: 2.11_
  - [ ] 5.2 Os testes de preservação da tarefa 2 seguem passando
    - Golden tests sem mudança de fixture. Se o golden da Home incluir o campo novo, regenerar a fixture e registrar isso aqui.
    - _Requirements: 3.1, 3.5_

- [ ] 6. Atualizar `.kiro/specs/refatorar-clareza-apis/contrato-das-apis.md`
  - Na seção `GET /recomendacao/{id}/home`, documentar `nichos[]`, `filtros[]`, os campos de nicho e de item, as regras (4 nichos, 6 itens, ordem, ausência) e que não há dados da unidade.
  - Acrescentar as rotas `GET /dados/fixados/{id}` e `POST /dados/fixados/{id}` (corpo, respostas, limite 6, erros 404/422, idempotência), os campos novos do item (`fixado`, `rotulo_fixar`, `acao_fixar`, etiqueta de motivo) e os eventos `servico_fixado` e `servico_desafixado`. Só acréscimos.
  - Acrescentar as duas rotas à lista de `liberacao-backend-kodiak.md`; se não houver lista, registrar só no contrato.
  - Confirmar que o teste de contrato continua passando.
  - _Requirements: 3.1_

- [ ] 7. Checkpoint: rodar `npm run teste`
  - Se faltar `backend/data/derivados.json`, rodar `npm run derivar` antes, ambos em `backend/`.
  - Todos os testes devem passar. Em caso de dúvida, perguntar ao usuário.

## Notes

- Eventos novos só `servico_fixado` e `servico_desafixado` (`item_exibido` por card fica para outra entrega), sem DynamoDB, sem voz.
- Fora do recorte: `categorias[]`, busca, interesses, acompanhamento e banner de progresso.
