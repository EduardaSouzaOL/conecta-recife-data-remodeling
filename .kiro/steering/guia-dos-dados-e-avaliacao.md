---
inclusion: always
---
# Guia dos dados e avaliação (resumo do `docs/tutorial.pdf`)

Fonte: "Guia dos dados" do Hackathon Conecta Recife. O PDF não é legível pelo agente; este resumo o substitui.

## Entrega esperada
1. Protótipo funcional no celular: ao escolher um `cidadao_id`, mostra os serviços certos, diz por que cada um aparece e leva à conclusão de pelo menos um serviço.
2. Apresentação curta: dores escolhidas, decisões e como mediria o resultado.
3. Opcional: `recomendacoes.csv` (ver abaixo).

Regras do guia:
- Deve funcionar para **qualquer** `cidadao_id` (jurados podem pedir outros), inclusive quem tem pouco ou nenhum histórico (5.778 sem histórico).
- Precisa de uma forma de "entrar como" um cidadão pelo `cidadao_id`.
- Na apresentação, comparar pelo menos dois cidadãos lado a lado.
- Poucas funcionalidades bem resolvidas valem mais que todas pela metade.

## Critérios de avaliação (peso)
| Critério | Peso |
|---|---|
| Problema e priorização | 15 |
| Relevância (vitrine muda conforme perfil, histórico e momento de vida) | 20 |
| Antecipação (sugere próximo passo, inclusive serviço que o cidadão não conhecia) | 15 |
| Conclusão do serviço (confirmação, protocolo e acompanhamento claros) | 15 |
| Acessibilidade e linguagem simples (contraste, toque, leitor de tela, texto simples) | 10 |
| Transparência e controle (entende o motivo, ajusta ou desliga) | 10 |
| Medição (conclusão, abandono por etapa, satisfação) | 5 |
| Execução e viabilidade (ponta a ponta, pode evoluir no app) | 10 |

## As 7 funcionalidades do briefing
1 Vitrine personalizada · 2 Atalhos e sugestões · 3 Jornada simplificada de um serviço · 4 Confirmação, comprovante e acompanhamento · 5 Acessibilidade · 6 Preferências e privacidade · 7 Indicadores de experiência e conversão.
Prazos e datas-limite não existem na Carta: são simulados. Etapas, tempo e abandono não estão nos dados: são simulados e instrumentados.

## Personas oficiais (de `cidadaos.csv`)
| Perfil | ID | Resumo |
|---|---|---|
| Idosa | C007938 | mulher, 68, RPA 3, sem marcadores; 3 visitas; exames (519), encaminhamentos (1475), agendamentos de Saúde (953) |
| Microempreendedor | C068579 | mulher, 42, empreendedora e MEI; 5 visitas; 953, 942, 1475 |
| Pessoa com deficiência | C059592 | mulher, 63, tutora de animal, PCD, Cadastro Único, hipertensão; 11 visitas; IPTU (216), Centro da Pessoa Idosa (1428), 771, 481 |
| Jovem estudante | C036462 | mulher, 19, tutora de animal, estudante, gestante; 3 visitas; 519, Atende Gestante (892), curso (1349) |
| Família no Cadastro Único | C039227 | homem, 26, tutor de animal, Cadastro Único, Bolsa Família, pobreza; 3 visitas; 910, 1210, cartão SUS (1047) |
| Família com criança | C076260 | mulher, 25, Cadastro Único, Bolsa Família, criança de 7 a 11 anos; 17 visitas; 519, 942, 910, 1475 |
| Gestante | C006566 | mulher, 37, Cadastro Único, Bolsa Família, gestante, extrema pobreza, adolescente na família; 4 visitas; 519, 1475, 892 |
| Doença crônica | C062244 | homem, 70, tutor de animal, Cadastro Único, hipertensão e diabetes; 3 visitas; 953, 1475 |

## Dados: pontos que mudam a implementação
- Arquivos: `servicos` (843, real), `cidadaos` (89.046, simulado), `historico` (593.056, 03/06 a 27/09/2026), `visitas_sem_login` (3.563.242, jun/2025 a set/2026, ~157 MB), `uso_semanal` (11.587, real).
- Sessão: ordene cliques por `ordem_na_sessao` (a `hora` tem precisão de minuto e 91% das visitas têm a mesma hora). O mesmo serviço não aparece duas vezes seguidas numa visita. `sessao_id` não se repete entre `historico` e `visitas_sem_login`.
- `visitas_sem_login` não liga com `cidadaos` e não entra em `recomendacoes.csv`.
- `criancas_na_familia` só existe para quem está no Cadastro Único. Vazio = **sem informação**, não "sem criança". Valores: `primeira_infancia` (até 6), `crianca` (7 a 11), `adolescente` (12 a 17), `nenhuma`.
- `situacao_renda`: `extrema_pobreza`, `pobreza` ou vazio (sem registro).
- `gestante` é provável gestação indicada pela rede de saúde, não confirmação clínica.
- Marcadores de saúde (`hipertensao`, `diabetes`, `saude_mental`, `gestante`): só com consentimento (LGPD, art. 11). Mostrar como o app pede, explica e respeita.
- `nivel_digital_atual`: 0 Físico, 1 Parcialmente digital, 2 Digital primitivo, 3 Digital redirecionamento, 4 Digital nativo (vazio = a classificar).
- `uso_semanal`: `login = sim` conta pessoas, `nao` conta aparelhos. Semana sem linha = menos de 10 visitantes, não zero.
- Células vazias em `servicos` podem significar "abaixo do mínimo de 10". Ler com `keep_default_na=False` (pandas) para manter vazios como texto.
- CSV em UTF-8, vírgula, LF, listas separadas por `|`, booleanos `true/false`, datas `AAAA-MM-DD`.
- Os dados valem só para o desafio: não redistribuir e apagar ao fim do evento. Use apenas dados fictícios; nunca CPF, nome ou endereço reais.

## `recomendacoes.csv` (opcional, vale para Antecipação e Relevância)
- Colunas: `cidadao_id`, `posicao` (1 a 10), `servico_id` (existente em `servicos.csv`), `motivo` (opcional, texto que o cidadão veria).
- Deve conter **todos os 89.046 cidadãos** (inclusive sem histórico), até 10 linhas por cidadão. Arquivo parcial não entra.
- Visitantes sem login não entram.
- Avaliação: os jurados conferem, nas semanas de 28/09 a 25/10/2026 (guardadas pela organização), se o primeiro serviço **novo** usado pelo cidadão está entre as 10 sugestões. Sugerir serviço já usado ocupa posição e não conta como acerto.
- Um arquivo por equipe, UTF-8, com cabeçalho.
