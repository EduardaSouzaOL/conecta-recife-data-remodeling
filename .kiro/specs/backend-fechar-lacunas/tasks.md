# Tarefas (60 minutos no total)

Testes em `backend/test` (`npm run teste`, Node test runner). Cada rota nova também ganha a seção em `contrato-das-apis.md`.

## Bloco 1: itens P1 a P3 (40 min)

- [x] 1. Home de visitante (R1, 8 min)
  - Criar `recomendacao/home-visitante.js` e a rota `GET /recomendacao/visitante/home` (com `q`) em `rotas/recomendacao.js`; registrar evento `home_visitante_vista`.
  - Seção no contrato.
  - Teste: 200, no máximo 2 blocos, nenhum bloco vazio, itens com `acao` e `rotulo_leitor`, `q` sem resultado não quebra, `/recomendacao/visitante` não vira `id_invalido`.

- [x] 2. Home em blocos (R2, R6, 12 min)
  - Criar `recomendacao/home.js` (classificação do design, seção 3) e a rota `GET /recomendacao/{id}/home`; incluir `controles` e `por_que_vejo`; evento `home_vista`.
  - Teste: persona C059592 e C036462 geram blocos diferentes; um serviço em um só bloco; máximo 3 itens por bloco; sem consentimento de saúde não há "Cuidar de você" nem termo de saúde no texto; personalização desligada devolve a estrutura de visitante; golden de `GET /recomendacao/{id}` segue passando.

- [ ] 3. Ações da jornada (R3, 12 min)
  - Criar `dados/jornada/acoes.js` (`problema`, `cancelar`, `alterar`, `avaliar`), as 4 rotas em `rotas/jornadas.js`, códigos novos em `erros.js`, `acoes[]` em `visao.js`.
  - Teste: cancelar muda o estado e repetir dá 409; alterar só em 352 e 942; avaliar só após concluir, uma vez, nota 1 a 5 ou `nao_consegui`; problema com motivo fora da lista dá 422.

- [ ] 4. Acompanhamento na Home (R3.1, 5 min)
  - Em `home.js`, adicionar o grupo "acompanhamento" com "Serviços solicitados" (usa `listarJornadas`) e "Continue seu pedido".
  - Teste: cidadão com jornada em andamento vê as `acoes[]` esperadas; sem jornada não há bloco.

- [ ] 5. Checkpoint (3 min)
  - Rodar `npm run teste`. Subir a API local e testar à mão a persona C007938 com e sem login.

## Bloco 2: medição e roteiro (20 min)

- [ ] 6. Eventos e indicadores (R5, 10 min)
  - Registrar os eventos novos nas ações da jornada; permitir `por_que_aberto` e `home_aberta` em `EVENTOS_PERMITIDOS`; criar `GET /dados/eventos/indicadores`.
  - Teste: depois de iniciar, concluir, avaliar e relatar problema, os números batem; jornada parada há mais de 30 min conta como abandonada (relógio injetável no teste).

- [ ] 7. Acessibilidade dos textos (R4, 3 min)
  - Conferir que todo item novo tem `rotulo_leitor` e que os textos novos têm frases curtas. Teste: percorrer a resposta das duas Homes e exigir `rotulo_leitor` não vazio em todo item com `acao`.

- [ ] 8. Roteiro de apresentação (R7, 7 min)
  - Criar `roteiro.md` nesta pasta: dores, decisões, 2 cidadãos lado a lado (C007938 e C076260), visitante x logado, jornada 352 até o protocolo, avaliação, indicadores e como medir conclusão, abandono, tempo e satisfação.

## Fora do escopo desta entrega

- `recomendacoes.csv` (R8)
- Contexto por RPA (R9)
- "Para não esquecer", "Salvos" e novas janelas de calendário (R10)
- Abandono por etapa
- Persistência fora de `estado.json`
- Telas no Kodiak (outra spec)
