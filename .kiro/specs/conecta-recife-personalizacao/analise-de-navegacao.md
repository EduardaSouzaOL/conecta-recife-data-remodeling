# Análise de navegação e personas

Desafio 1: Conecta Recife. Base: `BD/` (cidadaos, historico, servicos, uso_semanal, visitas_sem_login). Todos os dados são fictícios ou agregados. Código reproduzível em `notebooks/analise_navegacao_personas.ipynb`.

## 1. Método

1. Li `docs/tutorial.md` para ver o que é entregue e avaliado (relevância, antecipação, conclusão, acessibilidade, medição).
2. Carreguei os 5 CSVs com pandas, mantendo células vazias como texto.
3. Defini "nicho" como o tema do serviço. Serviço com vários temas conta em cada um.
4. Nichos: cliques por tema em `historico` (logado) e `visitas_sem_login` (anônimo).
5. Perfil: para cada marcador, faixa etária e `criancas_na_familia`, comparei o % do grupo que usa o tema com o % geral (lift). Só grupos com pelo menos 200 pessoas e temas usados por pelo menos 3% do grupo.
6. Antecipação: treino até 31/08/2026, teste em setembro. Para quem usou um serviço novo, medi se ele estava entre as 10 sugestões (acerto@10), como os jurados fazem.
7. Personas: perfil, histórico por sessão, pares parecidos, próximo passo e Home sugerida com motivo.

## 2. Nichos mais e menos usados

- Saúde: 68% dos cliques de quem está logado e 50% dos anônimos.
- Cinco serviços de saúde concentram o uso: 953, 942, 1475, 519 e 910.
- Anônimos pesam mais em Esportes e Bem-Estar (13% contra 2,2%, por causa da Academia Recife, 858) e em Cidadania (16% contra 7,5%, por causa do Cadastro Único, 352).
- Concentração: os 10 primeiros serviços somam 70% dos cliques logados, os 50 primeiros 88% e os 100 primeiros 94%.
- Cauda sem uso: 285 dos 843 serviços nunca foram clicados por quem está logado e 346 nunca por anônimo. Os 285 são sobretudo de Saúde (65), Licenças e Alvarás (58) e Cidadania (45). Entre eles, 63 são Agendamento e 51 Peticionador.
- Temas pouco usados: Licenças e Alvarás, Meio Ambiente, Administração Pública, Desenvolvimento Econômico, PJ e Autônomo, Serviços Urbanos.

## 3. Nichos a oferecer por perfil

| Perfil | Tema que sobe | Grupo usa | Geral usa | Lift |
|---|---|---:|---:|---:|
| Servidor público | Administração Pública | 19% | 2% | 9,0x |
| Microcrédito | Desenvolvimento Econômico | 6% | 0,8% | 8x |
| Proprietário de imóvel | Imóveis | 32% | 5% | 6,4x |
| Empreendedor ou MEI | PJ e Autônomo | 17% | 3% | 6x |
| Pessoa com deficiência | Mobilidade | 28% | 4% | 6x |
| Gestante | Conecta Labs | 37% | 3% | 11x |
| Tutor de animal | Animais | 35% | 12% | 3x |
| 60 anos ou mais | Mobilidade, Cultura e Lazer, Imóveis | 13%, 6%, 11% | 4%, 2%, 5% | 2 a 3x |
| Família com criança até 6 anos | Educação, Conecta Labs | 29%, 16% | 10%, 3% | 3x, 5x |
| Bolsa Família | Educação | 21% | 10% | 2x |
| Jovem de 18 a 34 anos | Trabalho/Qualificação | 23% a 26% | 18% | 1,3x a 1,4x |

Lacunas: só 35% dos tutores de animal usam Animais e só 17% dos empreendedores usam PJ e Autônomo.

Hipertensão, diabetes e saúde mental quase não mudam o que a pessoa usa (lift de 1,0 a 1,1). A Home funciona sem esses dados, o que apoia pedir consentimento sem pressão.

## 4. Antecipação: qual método sugere melhor um serviço novo

Teste com 32.681 cidadãos que usaram um serviço novo em setembro/2026. Serviço já usado não conta como acerto.

| Método | Acerto entre as 10 sugestões |
|---|---:|
| Popular do segmento (idade, sexo, Cadastro Único e pet) | 53,6% |
| Popularidade geral | 47,7% |
| Próximo serviço pela sequência | 31,7% |

77% das sessões têm um clique só (média de 1,4 cliques por sessão), por isso a sequência pesa menos. Os pares de transição mais fortes são quase todos dentro da saúde (942 e 953 em vai e vem).

## 5. Pouco histórico, jornada, qualidade e saúde

- Sem histórico: 5.778 cidadãos (6,5%). A mediana é de 2 sessões por pessoa e 31,5% têm só uma.
- Jornada: 325 serviços atendem ao critério (Agendamento ou Peticionador, `passos` preenchidos, nível digital 2 ou mais). O 942 e o 352 estão entre os mais usados. Outras opções: 120 (CEREST, nota 4,68) e 908 (credencial de estacionamento para idosos, nota 4,83). O 953 é o mais clicado, mas é consulta.
- Dor de qualidade: Vagas de emprego (458) tem 9,6 mil cliques logados e nota 3,67. Também baixas: remoção de entulhos (245, 3,58), CNH Recife (1337, 3,72) e iluminação pública (199, 3,77). A nota média ponderada do catálogo é 4,25.
- Saúde: 43,8% dos cidadãos têm pelo menos um marcador de saúde. Deficiência é 1,8% e gestante 1,4%. Esses dados só personalizam com consentimento (LGPD, art. 11). "Aceita avisos" é permissão de notificação, não consentimento de saúde.

## 6. Personas

### C062244: homem, 70 anos, RPA 6

Perfil: tutor de animal, Cadastro Único (sem Bolsa Família), hipertensão, diabetes, aceita avisos, `criancas_na_familia` = nenhuma.

- Histórico: 12 cliques em 3 sessões, de 12/06 a 16/08. Só Saúde, com dois serviços (1475 e 953).
- Possível atrito: na sessão de 16/08 alterna 953 e 1475 nove vezes seguidas.
- Pares parecidos: 34 (mesma faixa etária, sexo, Cadastro Único e pet). Novos mais usados por eles: 942 (38%), 519 (21%), 910, 352 e 1057 (12% cada), 34, 956 e 908 (9%).
- Próximo passo depois do 953: 942 (93.741 transições), 519 e 901.

Home sugerida (sem consentimento de saúde):

| Bloco | Serviço | Motivo |
|---|---|---|
| Próximo passo | 942 Agendar consultas | Quem usou "Ver meus agendamentos de Saúde" também usa |
| Quem é como você também usa | 519, 910 | 21% e 12% das pessoas parecidas usam |
| Você e seu pet | 34, 956 | Você é tutor de animal |
| Seus direitos | 995 Bolsa Família | Você pode ter direito a este benefício |
| Seus direitos | 908 Credencial de estacionamento | Pessoas com 60 anos ou mais podem ter direito |

### C076260: mulher, 25 anos, RPA 5

Perfil: Cadastro Único, Bolsa Família, criança de 7 a 11 anos. O arquivo também marca `saude_mental`, dado sensível que o guia não cita.

- Histórico: 24 cliques em 17 sessões, de 08/06 a 01/09.
- Possível atrito: abriu o 910 em 9 dias diferentes, o 519 em 5.
- Mudança de foco: até julho eram cadastro, contracheque e dívidas. Em agosto passou ao fluxo de saúde (519, 1475, 942).
- Pares parecidos: 1.869. Novos mais usados por eles: 953 (31%), 839 (14%), 352 (13%), 458 (12%), 1148 (11%), 62 (9%).
- Próximo passo depois do 519: 953 (25.569 transições), 901 e 352.

Home sugerida (sem consentimento de saúde):

| Bloco | Serviço | Motivo |
|---|---|---|
| Próximo passo | 953 Ver meus agendamentos | Quem usou "Ver resultado de exames" também usa |
| Quem é como você também usa | 839, 352 | 14% e 13% das pessoas parecidas usam |
| Para sua família | 1148 Jornada do Estudante | Há criança ou adolescente na sua família |

Não recebe "Receber o Bolsa Família" (995), porque já tem. O bloco de trabalho (458 e 62) ficou de fora pelo limite de 2 itens por bloco.

### Lado a lado

| | C062244 | C076260 |
|---|---|---|
| Uso | 12 cliques, 3 sessões | 24 cliques, 17 sessões |
| Foco | Só Saúde | Saúde mais cadastro |
| Sinal de atrito | Alterna 953 e 1475 | Abre o 910 em 9 dias |
| Principal serviço novo | 942 | 953 |
| Eixo da Home | Idade e pet | Família e criança |
| Bolsa Família | Pode ter direito | Já tem, mostrar status |
| Saúde | Consentimento antes de usar | Consentimento antes de usar |

## 7. Limites

- Sazonalidade inconclusiva: a série sem login muda de mix ao longo do tempo (mistura tendência e estação) e a série com login cobre só 4 meses e é quase plana. Não usar sozinha no bloco "Nesta época do ano".
- O teste de antecipação usa só setembro. Serve para comparar métodos, não para prever a nota dos jurados.
- Não conferi no catálogo o conteúdo de alguns serviços citados (1057, 995, 908) nem o que está no tema Conecta Labs. A relação com o Atende Gestante (892) é suposição.
- As Homes das personas vêm de regras escritas no notebook, não da API do backend.
- Os sinais de atrito são hipóteses a investigar, não prova de dificuldade.
