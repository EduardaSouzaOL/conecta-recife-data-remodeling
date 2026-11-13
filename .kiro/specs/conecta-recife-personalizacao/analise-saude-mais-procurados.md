# Análise: a área de Saúde e os serviços mais procurados

Calculada diretamente sobre `BD/servicos.csv`, `BD/historico.csv` e `BD/visitas_sem_login.csv` em 13/11/2026. "Saúde" aqui significa serviços com o tema Saúde no catálogo. Não é dado de saúde do cidadão.

## 1. O peso da Saúde

| Base | Cliques | Em serviços de Saúde |
|---|---:|---:|
| `historico` (com login) | 593.056 | 422.642 (71,3%) |
| `visitas_sem_login` | 3.563.242 | 1.804.015 (50,6%) |
| `uso_semanal`, dados reais (login = sim) | 590.265 | 446.157 (75,6%) |
| `uso_semanal`, dados reais (login = não) | 3.519.299 | 1.850.972 (52,6%) |

- O catálogo tem 131 serviços de Saúde, entre os 843. Na primeira versão eu contei 121, porque 10 serviços têm o tema escrito com espaço ou variante ("Saúde "). Os números desta seção já estão corrigidos.
- 79,5% dos cidadãos com histórico abriram pelo menos 1 serviço de Saúde. Sem login, 58,5% dos visitantes abriram.
- Por visita: 69,2% das visitas com login e 49,6% das visitas sem login têm pelo menos 1 clique de Saúde. O primeiro clique da visita é de Saúde em 67,7% (com login) e 46,8% (sem login).
- Os 5 serviços-chave (953, 942, 1475, 519, 910) somam 61,9% dos cliques com login e 41,3% dos cliques sem login.
- Entre os 10 serviços mais usados com login, 7 são de Saúde. Entre os 20 mais usados, 10.
- Sem login, 5 dos 10 mais usados são de Saúde, e 10 dos 20.
- Por cliques, Saúde é de longe o maior tema do histórico. O segundo, Cidadania, tem cerca de 41 mil cliques (34.510 mais 6.737 de "Cidadania " com espaço no fim). Esse valor soma duas grafias e não foi recalculado por serviço.

## 2. Os mais procurados

### Com login (`historico`)

| Posição | Serviço | Cliques | Parcela | Pessoas |
|---:|---|---:|---:|---:|
| 1 | 953 Ver meus agendamentos de Saúde | 160.150 | 27,0% | 32.108 |
| 2 | 942 Agendar consultas e procedimentos na Minha Unidade de Saúde | 105.705 | 17,8% | 27.886 |
| 3 | 1475 Ver meus encaminhamentos | 61.334 | 10,3% | 23.109 |
| 4 | 519 Ver resultado de exames laboratoriais | 23.038 | 3,9% | 12.650 |
| 5 | 910 Atualizar cadastro para consultas e exames | 16.897 | 2,8% | 10.576 |
| 6 | 901 Acessar meus registros de saúde (Minha Saúde Conectada) | 10.330 | 1,7% | 6.323 |
| 7 | 458 Vagas de emprego (não é Saúde) | 9.656 | 1,6% | — |
| 8 | 1102 Ver meus medicamentos | 8.673 | 1,5% | 5.821 |
| 9 | 34 Realizar castração de cães e gatos (não é Saúde) | 8.511 | 1,4% | — |
| 10 | 858 Academia Recife (não é Saúde) | 7.997 | 1,3% | — |

O 352 (Agendar atendimento no Cadastro Único) aparece em 11º, com 7.358 cliques (1,2%).

### Sem login (`visitas_sem_login`)

| Posição | Serviço | Cliques | Parcela | Visitantes |
|---:|---|---:|---:|---:|
| 1 | 953 Ver meus agendamentos de Saúde | 640.829 | 18,0% | 92.351 |
| 2 | 942 Agendar consultas e procedimentos | 587.351 | 16,5% | 100.542 |
| 3 | 858 Realizar agendamento para a Academia Recife (não é Saúde) | 441.364 | 12,4% | — |
| 4 | 352 Agendar atendimento no Cadastro Único (não é Saúde) | 386.896 | 10,9% | — |
| 5 | 458 Vagas de emprego (não é Saúde) | 212.403 | 6,0% | — |
| 6 | 901 Acessar meus registros de saúde | 134.838 | 3,8% | 59.548 |
| 7 | 519 Ver resultado de exames laboratoriais | 124.944 | 3,5% | 44.221 |
| 8 | 910 Atualizar cadastro para consultas e exames | 118.918 | 3,3% | 58.587 |
| 9 | 1254 Acessar o Programa tô em casa (não é Saúde) | 90.451 | 2,5% | — |
| 10 | 494 Pagar IPTU de 2026 (não é Saúde) | 59.540 | 1,7% | — |

## 3. O que isso diz sobre o nosso escopo

1. **O 942 é a escolha certa para a jornada.** É o 2º serviço mais usado com login e também sem login. Esse é o melhor argumento para priorizá-lo.
2. **O 352 se sustenta.** É o 4º mais usado sem login (10,9%). É um serviço muito procurado por quem ainda não entrou no app, o que combina com a Home do visitante.
3. **O 953 é o maior, mas não entra como pedido.** Ele só consulta agendamentos que já existem. É o candidato natural a atalho fixo em "Seus atalhos", não a jornada por etapas.
4. **A Home pode ficar dominada por Saúde.** Se a pontuação seguir o uso, a maioria dos itens será de Saúde. A regra de no máximo 2 itens do mesmo órgão entre os 5 primeiros deve limitar isso. Essa regra não foi testada nesta análise.
5. **Tema Saúde não é dado de saúde do cidadão.** Mostrar o 942 ou o 953 pelo uso do próprio cidadão não precisa de consentimento. O consentimento vale para os marcadores `hipertensao`, `diabetes`, `saude_mental` e `gestante`. O sistema não pode deduzir doença a partir do comportamento de uso.

## 4. O que dizer no pitch

- "Sete em cada dez cliques de quem tem login estão em Saúde, e metade dos cliques sem login. Por isso a nossa jornada completa começa pelo agendamento de consultas."
- "Quem ainda não tem login procura muito o agendamento no Cadastro Único. Por isso ele é o nosso segundo serviço de jornada."
- Deixe claro que usar o serviço mais acessado é diferente de inferir a saúde da pessoa.

## 5. Ressalvas

- `historico` e `visitas_sem_login` são simulados a partir de padrões reais agregados. Apresente como "padrão dos dados do desafio", não como medição do app real.
- A contagem usa o tema "Saúde" do catálogo. A coluna `temas` tem valores sujos, como "Cidadania " com espaço no fim, então pode haver pequenas diferenças.
- O `uso_semanal.csv`, que traz dados reais, confirma a ordem de grandeza: 52,6% dos cliques sem login e 75,6% com login são de Saúde. Não o usei para os rankings por serviço.
- O número "42,5%" usado em uma versão do texto do pitch não foi reproduzido por nenhum recorte. O mais próximo é a soma dos 5 serviços-chave sem login (41,3%), que é outra medida.
- As colunas "Pessoas" e "Visitantes" só foram preenchidas para os serviços de Saúde, que foram os que contei por pessoa única.
