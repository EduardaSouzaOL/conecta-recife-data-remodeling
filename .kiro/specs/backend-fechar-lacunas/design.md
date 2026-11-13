# Design: fechar as lacunas do backend

Estado confirmado no código: `GET /recomendacao/{id}` devolve `itens[]` planos (`montarVitrine`); jornadas só têm iniciar, ler, preencher e confirmar; estados `em_andamento` e `concluida`; eventos em memória com `resumo` por tipo; sem endpoint de visitante.

## 1. Decisão central: rota nova, lista plana intacta

Os testes de preservação (golden) travam o formato de `GET /recomendacao/{id}`. Por isso a Home em blocos é uma rota nova que **reaproveita** `montarVitrine` e só reagrupa. Nada em `vitrine/*` muda.

| Rota | Método | Quem decide |
|---|---|---|
| `/recomendacao/visitante/home` | GET | API (sem cidadão) |
| `/recomendacao/{id}/home` | GET | API |
| `/dados/jornadas/{id}/problema` | GET (canais; ver seção 8.1) | API |
| `/dados/jornadas/{id}/cancelar` | POST | API |
| `/dados/jornadas/{id}/alterar` | POST | API |
| `/dados/jornadas/{id}/avaliar` | POST | API |
| `/dados/eventos/indicadores` | GET | API |

Toda rota nova ganha seção em `contrato-das-apis.md` (o teste `contrato.test.js` confere).

## 2. Formato comum da Home (logada e visitante)

```json
{
  "perfil": "logado | visitante",
  "cidadao_id": "C007938",
  "personalizacao_ativa": true,
  "base_da_personalizacao": "historico | historico_curto | perfil",
  "explicacao_geral": "texto",
  "aviso_saude": "texto", "aviso_acessibilidade": "texto",
  "convite_consentimento": null, "convite_acessibilidade": null,
  "controles": [
    {"id": "desligar_personalizacao", "rotulo": "Não usar meus dados para sugestões", "acao": {"tipo": "api", "metodo": "POST", "caminho": "/recomendacao/C007938/personalizacao", "corpo": {"ativa": false}}}
  ],
  "blocos": [
    {"id": "familia", "grupo": "recomendados", "titulo": "Para sua família",
     "itens": [{"servico_id": 839, "titulo": "…", "tag": "Seu momento de vida", "motivo": "…", "por_que_vejo": "…",
                "rotulo_leitor": "Abrir …", "acao": {"tipo": "abrir_servico", "servico_id": 839}}]}
  ]
}
```

Visitante: sem `cidadao_id`, sem avisos de consentimento, sem `controles`; `personalizacao_ativa` omitido. `acao.tipo` ∈ `abrir_servico | iniciar_jornada | api`. Erros: formato existente (`id_invalido`, `cidadao_nao_encontrado`).

## 3. Como a lista plana vira blocos (`recomendacao/home.js`, novo)

1. Chamar `montarVitrine(id, derivados, {limite: 20})`.
2. Classificar cada item na **primeira** regra que casar, nesta ordem:

| Bloco | Critério (usa só o que já existe) |
|---|---|
| Cuidar de você | `origem === 'saude'` (só aparece com consentimento, a vitrine já garante) |
| Você e seu pet | `servico_id` em `REGRAS` `tutor` |
| Para sua família | `servico_id` em `primeira_infancia`, `crianca`, `adolescente` |
| Seus direitos | `servico_id` em `cadunico_entrar`, `cadunico_tem`, `bolsa_familia` |
| Nesta época do ano | `origem === 'demanda'` ou regra com `janela` (`matricula_creche`, `frequencia_escolar`) |
| Quem é como você também usa | `origem` em `popular`, `historico` |
| Continue seu pedido | jornadas `em_andamento` do cidadão (não vem da vitrine) |
| Seus atalhos | 3 serviços mais frequentes em `dados.historico` (posição fixa) |
| Próximo passo dentro do serviço | `derivados.proximo[último serviço concluído]`, 1 item |

3. Cortar em 3 itens por bloco, descartar bloco vazio, ordem fixa de blocos.
4. `por_que_vejo` = `explicacao_geral` da base + o `motivo` do item.
5. Personalização desligada: devolver a Home do visitante com `cidadao_id` e `personalizacao_ativa: false`.

Simplificação: a classificação por listas de ids reaproveita as regras atuais; trocar por um campo `bloco` nas regras fica para depois.

## 4. Home de visitante (`recomendacao/home-visitante.js`, novo)

- "Mais usados": `dados.servicos` com `nivel_digital >= 3`, ordenados por `pessoas_unicas` (mesmo critério do `glob` em `candidatos.js`), 6 itens, motivo fixo "É um dos serviços mais usados no Conecta Recife."
- "Atalhos de 1 toque": os 3 primeiros do bloco acima, rótulo curto.
- `q` filtra por nome (minúsculas, sem acento). Sem resultado, bloco "Resultado da busca" com `itens: []` não é enviado; a resposta traz `mensagem_busca`.
- Ordem calculada uma vez ao carregar o módulo (cache em memória).

## 5. Ações de jornada (`dados/jornada/acoes.js`, novo)

Estados novos: `cancelada`. Campos novos em `jornadas[id]`: `avaliacao` (`{nota|nao_consegui, ts}`), `alterada_em`, `cancelada_em`, `atualizada_em`.

| Rota | Entrada | Sucesso | Erros |
|---|---|---|---|
| `GET …/problema` | – | `{canais:[{rotulo, detalhe, acao}]}` (seção 8.1) | 404 `jornada_nao_encontrada` |
| `POST …/cancelar` | – | `{ok:true, jornada}` com `estado:"cancelada"` | 409 `jornada_encerrada` |
| `POST …/alterar` | – | `{ok:true, jornada}` com `estado:"em_andamento"` | 422 `alteracao_indisponivel` (serviço fora de 352/942), 409 se cancelada |
| `POST …/avaliar` | `{nota:1..5}` ou `{nao_consegui:true}` | `{ok:true, avaliacao}` | 409 `jornada_nao_concluida`, 409 `ja_avaliada`, 422 `nota_invalida` |

- `visao()` ganha `acoes[]` (`problema`, `cancelar`, `alterar`, `avaliar`) conforme o estado, com `rotulo`, `rotulo_leitor` e `acao`. Campo novo, os atuais não mudam.
- Os códigos de erro novos entram em `TABELA_ERROS` (`erros.js`).
- Canais de atendimento: ver pergunta em aberto 1.

## 6. Medição

- `EVENTOS_PERMITIDOS` ganha `por_que_aberto` e `home_aberta` (o resto o servidor registra).
- Eventos novos pelo servidor: `home_vista`, `home_visitante_vista`, `problema_relatado`, `jornada_cancelada`, `jornada_alterada`, `avaliacao_registrada`.
- `GET /dados/eventos/indicadores?servico_id=` agrega a partir de `jornadas` (estado, `criada_em`, `concluida_em`, `avaliacao`) e de `eventos` (`tela_pulada`, `problema_relatado`). Resposta:

```json
{"por_servico": [{"servico_id": 352, "iniciadas": 4, "concluidas": 2, "abandonadas": 1, "canceladas": 0,
  "taxa_conclusao": 0.5, "tempo_medio_segundos": 95, "nota_media": 4.5, "nao_consegui": 0,
  "problemas": 1, "telas_puladas": 3}], "total": {…}}
```

- Abandono por etapa: **não medido** (a jornada não guarda a etapa em que parou). Medimos só abandono total. Ver pergunta 2.
- Simplificação: tudo em memória e em `estado.json`, como hoje. Sem painel.

## 7. Riscos e simplificações

| Item | Decisão |
|---|---|
| Golden de `/recomendacao/{id}` | Não mexer; rota nova |
| Lambda perde `/tmp/data` | Já registrado no README; para a demo, rodar local ou aceitar |
| `Seus atalhos` com histórico curto | Se houver menos de 1 serviço, o bloco não aparece |
| "Abandonada" | `em_andamento` sem atualização há mais de 30 minutos (constante, simulada) |
| Contexto por RPA (R9) | Depende de dados que não temos; fora |
| Cache da ordem de visitante | Calculado na carga; sem recálculo por semana |

## 8. Decisões sobre as perguntas em aberto (resolvidas em 12/11/2026)

1. **Canais de "Relatar problema" (352 e 942): resolvida.** Nesta versão o app só encaminha ao canal certo; registrar o problema dentro do app é um próximo passo. `POST …/problema` vira `GET /dados/jornadas/{id}/problema` e devolve `canais[]`, cada um uma linha com `acao` pronta.
   - Ordem: canais do próprio serviço (de `servicos.csv`), depois a Ouvidoria Geral.
   - 352: `canal_web` https://cadunico.recife.pe.gov.br/. 942: `canal_web` https://conecta-saude.recife.pe.gov.br/agendamentos/novo-atendimento e `canal_app` (código CCON). Nenhum tem `canal_chat`.
   - Ouvidoria: link https://ouvidoria.recife.pe.gov.br/registre-sua-manifestacao ("Abrir link"); 0800 281 0040, segunda a sexta, 07h às 17h ("Abrir discador"; usar 07h, não o 08h do CSV); ouvidoria@recife.pe.gov.br; presencial na sede da Prefeitura, Av. Cais do Apolo, 925, segunda a sexta, 08h às 17h.
   - Sem dado pessoal nos links; só o nome do serviço, se o canal aceitar.
   - Efeito na tarefa 3: sem `problemas[]` gravados e sem erro `motivo_invalido`; evento `problema_relatado` passa a ser `canais_vistos` (a definir na tarefa 6).
2. **Abandono por etapa: resolvida.** Gravar só a entrada em cada etapa (evento `etapa_entrada` com `servico_id`, `etapa` 1 a 4, horário e identificador de cidadão pseudonimizado) e `jornada_concluida` ao chegar ao comprovante. Nunca CPF nem conteúdo de campo. O abandono é a diferença entre entradas consecutivas. Eventos extras: `avaliacao_registrada` (polegar) e `por_que_aberto`. Números da demo podem ser simulados, com os eventos instrumentados. Entra na tarefa 6.
3. **Textos de "Por que vejo isto?": resolvida.** Uma linha, "você", sem dado pessoal. Substituem os motivos específicos na Home em blocos (a lista plana segue igual):
   - histórico/repetir: "Você já usou este serviço."
   - perfil, momento de vida e acessibilidade: "Isso combina com as informações do seu cadastro."
   - jornada parecida: "Quem usou [serviço] também costuma usar este."
   - popular: "Muita gente no Recife procura este serviço."
   - época: "Este serviço é muito procurado nesta época do ano."
   - saúde (só com consentimento): "Com base no seu uso do app."
   - A folha mostra os tipos de dado usados (`dados_usados`: cadastro, histórico, época), sem valores. Desligar por tipo fica para depois; hoje só existe desligar tudo.
4. **Busca do visitante: resolvida.** Nome (`nome` e nome resumido), depois palavras-chave, depois temas, nessa ordem de peso. Ignora maiúscula e acento, tolera erro de digitação leve. Sem sinônimos (353/995 e "Bolsa Família" já estão nas palavras-chave). Desempate por popularidade. Entra como ajuste da tarefa 1 (depois da tarefa 2).
5. **"Para não esquecer": resolvida, fora desta entrega (R10).** Datas fictícias com etiqueta "Exemplo", referência 28/09/2026 (ou hoje + N dias). Ana: 352 até 13/10 e 839 até 30/10. José: 942 em 20/10 e 37 em 10/10 (saúde só com consentimento). Visitante: só "Vacinação nos bairros", 03/10/2026. Os serviços acompanhados continuam 942 e 352.

## 9. Regra nova: pouco ou nenhum histórico

Na Home em blocos, se o cidadão tem menos de 3 acessos no histórico, "Seus atalhos" é trocado por "Mais procurados" (mesma lista do visitante, sem serviço sensível sem consentimento). Nunca fica bloco vazio no topo.

## 10. Perguntas em aberto

Nenhuma no momento.
