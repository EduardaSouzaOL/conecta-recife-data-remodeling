# Requisitos: fechar as lacunas do backend (entrega de 1 hora)

Cobre só o que falta. O que já funciona (vitrine plana, consentimentos, jornadas, dispensar, personalização, eventos) não muda.
Regras da casa: a tela do Kodiak não decide nada; textos prontos vêm da API; saúde e acessibilidade só com consentimento; dados fictícios.

Prioridades: P1 a P6 seguem a ordem do pedido. Itens P6 ficam fora da entrega.

## R1 (P1): Home simplificada para visitante sem login

**História:** como pessoa sem login, quero uma Home curta, com os serviços mais usados e atalhos de 1 toque.

1. QUANDO o Kodiak pedir `GET /recomendacao/visitante/home`, ENTÃO o sistema DEVE devolver 200 com `perfil: "visitante"` e no máximo 2 blocos.
2. O sistema DEVE devolver o bloco "Mais usados" com até 6 serviços digitais (nível digital >= 3), do mais para o menos usado.
3. O sistema DEVE devolver o bloco "Atalhos de 1 toque" com os 3 primeiros serviços, cada um com `acao`.
4. O sistema NÃO DEVE ler perfil, histórico, saúde ou acessibilidade, nem tentar ligar o visitante a um cidadão.
5. QUANDO `q` vier na consulta, ENTÃO o sistema DEVE filtrar os serviços pelo nome (busca simples).
6. Cada item DEVE trazer `titulo`, `motivo` curto, `rotulo_leitor` e `acao`.
7. O sistema NÃO DEVE devolver bloco sem item.

## R2 (P2): Home em blocos para quem está logado

**História:** como cidadão logado, quero ver a Home em blocos com poucos itens e o motivo de cada um.

1. QUANDO o Kodiak pedir `GET /recomendacao/{id}/home`, ENTÃO o sistema DEVE devolver `blocos[]` agrupados em `grupo`: "atalhos", "recomendados" e "acompanhamento".
2. Os blocos DEVEM ser: "Seus atalhos", "Continue seu pedido", "Para sua família", "Seus direitos", "Quem é como você também usa", "Nesta época do ano", "Cuidar de você", "Você e seu pet" e "Próximo passo dentro do serviço".
3. O sistema DEVE montar os blocos a partir da lista da vitrine existente, sem recalcular a pontuação.
4. Um serviço DEVE aparecer em um só bloco.
5. O sistema NÃO DEVE devolver bloco vazio e DEVE limitar cada bloco a 3 itens.
6. "Cuidar de você" DEVE aparecer só com consentimento de saúde, e seu título NÃO DEVE citar a condição.
7. "Seus direitos" DEVE usar "pode ter direito a" e NÃO DEVE afirmar o direito como certo.
8. QUANDO a personalização estiver desligada, ENTÃO o sistema DEVE devolver a mesma estrutura da Home de visitante (R1), com `personalizacao_ativa: false`.
9. A resposta DEVE manter `base_da_personalizacao`, `explicacao_geral`, avisos e convites de consentimento da vitrine.
10. `GET /recomendacao/{id}` (lista plana) DEVE continuar igual.
11. "Para não esquecer" e "Salvos" ficam fora (R10).

## R3 (P3): Acompanhamento e conclusão do serviço

**História:** como cidadão, quero relatar problema, cancelar, alterar e avaliar o pedido.

1. QUANDO a Home for montada, ENTÃO o bloco "Serviços solicitados" (grupo "acompanhamento") DEVE listar as jornadas do cidadão com estado, protocolo e `acoes[]` permitidas.
2. QUANDO o cidadão pedir `POST /dados/jornadas/{id}/problema` com `{motivo}`, ENTÃO o sistema DEVE registrar o problema e devolver 200 com `ok: true` e os canais de atendimento da Carta de Serviços.
3. QUANDO o cidadão pedir `POST /dados/jornadas/{id}/cancelar`, ENTÃO o sistema DEVE mudar o estado para `cancelada`; em pedido já `concluida` ou `cancelada`, DEVE responder 409.
4. QUANDO o cidadão pedir `POST /dados/jornadas/{id}/alterar`, ENTÃO o sistema DEVE reabrir o pedido (`em_andamento`) e manter os campos; DEVE valer só para os serviços 352 e 942.
5. QUANDO o cidadão pedir `POST /dados/jornadas/{id}/avaliar` com `{nota}` (1 a 5) ou `{nao_consegui: true}`, ENTÃO o sistema DEVE guardar a avaliação de um pedido `concluida`, uma vez só.
6. O sistema NÃO DEVE oferecer chat e NÃO DEVE enviar nada a sistemas reais.
7. Cada ação DEVE registrar um evento (R5).

## R4 (P3): Acessibilidade e linguagem simples

1. Todo item tocável DEVE ter `rotulo_leitor` e `acao` prontos.
2. Os textos novos DEVEM ter frases curtas e sem sigla sem explicação.
3. A API NÃO DEVE mudar a interface por causa de `pessoa_com_deficiencia`.
4. Cor, contraste e área de toque são das telas do Kodiak; a API só entrega os textos. Isso vai para o roteiro (R7).

## R5 (P4): Medição mínima

1. O sistema DEVE registrar os eventos: `problema_relatado`, `jornada_cancelada`, `jornada_alterada`, `avaliacao_registrada`, `home_vista`, `home_visitante_vista`.
2. Os eventos de jornada DEVEM trazer `servico_id`; o de avaliação, a `nota`; nenhum DEVE ter texto livre.
3. QUANDO o Kodiak pedir `GET /dados/eventos/indicadores`, ENTÃO o sistema DEVE devolver: iniciadas, concluídas, abandonadas, taxa de conclusão, tempo médio até concluir, nota média, problemas, cancelamentos e telas puladas, por serviço.
4. "Abandonada" é a jornada `em_andamento` sem alteração há mais tempo que um limite fixo (ver design).

## R6 (P3): Preferências e privacidade

1. Cada item da Home DEVE trazer `motivo` e `por_que_vejo` (texto simples, sem citar saúde ou deficiência).
2. A Home DEVE trazer `controles`: ações para desligar a personalização e dispensar um item, apontando para as rotas existentes.
3. QUANDO o cidadão abrir "Por que vejo isso?", ENTÃO o Kodiak DEVE enviar o evento `por_que_aberto` (novo tipo permitido).

## R7 (P5): Roteiro de apresentação

1. O repositório DEVE ter `roteiro.md` com: dores, decisões, comparação de 2 cidadãos lado a lado, visitante x logado, jornada ponta a ponta e indicadores.

## R8 (P6, fora da entrega): `recomendacoes.csv`
## R9 (P6, fora da entrega): Contexto por RPA
## R10 (P6, fora da entrega): "Para não esquecer", "Salvos" e janelas de calendário além das duas atuais
