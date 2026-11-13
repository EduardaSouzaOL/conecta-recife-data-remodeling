# Mapa do motor de predição

O motor é híbrido: regras de perfil, histórico de quem tem login, popularidade por perfil e demanda semanal. Código em `backend/src/recomendacao/` e `backend/scripts/`.

## Visão geral

```
BD/*.csv ──> derivar.js ──> data/derivados.json ──┐
                                                  ├─> vitrine.js ──> home.js ──> API
cidadaos + historico + consentimentos ────────────┘
                                                  └─> ranking-arquivo.js ──> recomendacoes.csv
```

## 1. Pré-cálculo offline

Arquivos: `recomendacao/derivados.js` e `scripts/derivar.js`. Gera `data/derivados.json` (versão 2).

| Parte | Como é calculada |
|---|---|
| `proximo` | Matriz "serviço A leva a B". Usa pares consecutivos de `historico` e de `visitas_sem_login`. Peso 1 na mesma sessão e 0,5 entre sessões. Guarda os 12 melhores destinos por serviço. |
| `populares` | Por segmento não sensível (faixa, sexo, RPA, flags de perfil, renda, crianças). Conta pessoas únicas, calcula o lift (uso no segmento ÷ uso global) e exige pelo menos 15 pessoas e lift de 1,4 ou mais. Score = proporção × (lift − 1). Ficam 30 serviços por segmento. |
| `demanda` | Últimas 4 semanas de `uso_semanal` contra as 8 anteriores (normalizadas para 4). Exige 40 cliques ou mais e razão de 1,25 ou mais, com teto de 3. |

Regras de dados:
- Cada visitante é reordenado por data, hora, sessão e `ordem_na_sessao`.
- Visitantes entram só como estatística agregada e nunca se ligam a um cidadão.
- Saúde nunca entra nos segmentos.

## 2. Vitrine por cidadão

Arquivos: `recomendacao/vitrine.js` e `recomendacao/vitrine/*`. Roda a cada pedido.

### 2.1 Contexto
- Lê perfil e preferências.
- `saude` e `acessibilidade` só são lidas com consentimento próprio concedido.
- Com a personalização desligada, o histórico vem vazio.

### 2.2 Candidatos (`candidatos.js`)

Cada serviço recebe seis componentes parciais.

| Componente | Origem |
|---|---|
| `regra` | `regras.js`: perfil e momento de vida, com score decrescente pela posição. Tem janelas de calendário (creche de 05/11 a 10/12/2026, frequência escolar de 01/10 a 30/11). Regras de saúde e acessibilidade só rodam com consentimento. |
| `rep` | Repetição dos últimos 5 serviços distintos do histórico. |
| `hist` | Próximo serviço provável via `proximo`. Os 3 últimos serviços pesam 1, 0,6 e 0,35. |
| `pop` | Populares dos segmentos do cidadão. Funciona sem histórico. |
| `dem` | Serviços em alta, normalizados de 0 a 1. |
| `glob` | Os 25 serviços digitais mais usados (rede de segurança). |

### 2.3 Pontuação (`pontuacao.js`)

Soma ponderada. `wh = min(1, tamanho do histórico / 6)`.

| Componente | Peso |
|---|---|
| regra | 1,0 |
| hist | 0,9 × wh |
| pop | 0,55 × (1 − 0,4·wh) |
| dem | 0,25 |
| rep | 0,45 (só com histórico) |
| glob | 0,18 |

Com pouco histórico, o peso migra de `hist` para `pop`.

Filtros:
- Item sensível sem consentimento sai.
- Público restrito que não combina com o perfil sai.
- Não sugere inscrição no Cadastro Único (1032) nem Bolsa Família (995, 1032) a quem já tem.
- Serviço informativo só entra se vier de regra, histórico ou repetição.

Ajustes:
- Item autorizado pelo cidadão: +0,3.
- Nível digital 1 ou menor: ×0,8.
- Natureza "A classificar": ×0,85.

O componente com maior contribuição define a origem do motivo exibido.

### 2.4 Diversidade (`diversidade.js`)
- No máximo 2 do mesmo órgão nos 5 primeiros e 3 nos demais.
- No máximo 1 repetição de serviço já usado.
- `garantirServicoNovo` insere ao menos 1 serviço novo, com o motivo "Pessoas como você também usam".
- Itens marcados "Não me interessa" são removidos.

### 2.5 Saída
Itens com motivo, `base_da_personalizacao` ("histórico" ou "perfil") e convites de consentimento.

## 3. Home em blocos (`home.js`)

Só reagrupa a lista da vitrine (limite 20). Não recalcula pontuação.

- **Atalhos:** com 3 ou mais acessos, "Seus atalhos" (os 3 mais usados). Abaixo disso, "Mais procurados".
- **Blocos:** Cuidar de você, Você e seu pet, Para sua família, Você pode ter direito a, Nesta época do ano, Quem é como você também usa. Máximo de 3 itens por bloco, e cada serviço em um só bloco.
- **Próximo passo:** usa `proximo` a partir da última jornada concluída.
- **"Por que vejo isto?":** montado pela origem do item, sem citar dado pessoal.
- **Personalização desligada:** devolve a Home de visitante.
- **Personas fixas:** `home-fixa.js` define os blocos de C076260 e C062244.

## 4. Ranqueador do `recomendacoes.csv`

Arquivos: `recomendacao/ranking-arquivo.js` e `scripts/gerar-recomendacoes.js`. É um motor separado, otimizado para acertar o primeiro serviço **novo**.

- Chave do segmento: faixa, sexo, Cadastro Único e pet. Chave larga: só a faixa.
- Probabilidade suavizada em três camadas: global, faixa (k=50) e segmento (k=20).
- Serviços já usados são excluídos.
- Bônus de transição dos 3 últimos serviços: `beta × 0,1 × [1; 0,6; 0,35] × (w/max)`.
- Gera 10 sugestões para todos os cidadãos, com motivo neutro único (sem saúde).
- Valida total de cidadãos, posição de 1 a 10, ausência de repetição e existência do serviço.

## 5. Calibração

`scripts/backtest.js` treina até 31/08/2026 e testa em setembro.
- Métrica: acerto@10 do primeiro serviço novo, igual ao critério dos jurados.
- Aceita variantes de pesos (`ajusteDePesos`) e do ranqueador do arquivo (`{"arquivo":true,...}`).

## 6. Garantias de privacidade

- Saúde e deficiência só são lidas com consentimento próprio, e os dois consentimentos são independentes.
- O motivo nunca cita a condição nem o serviço de origem sensível. Usa texto genérico.
- Saúde não entra em segmento e não é inferida do comportamento.
- Visitantes sem login nunca se ligam a cidadãos.

## 7. Pontos de atenção

- O ranqueador do CSV e a vitrine são dois motores com lógicas diferentes. Melhorar um não melhora o outro.
- Pesos e janelas de calendário estão fixos no código.
- Este mapa vem da leitura do código. O backtest não foi executado, então não há acerto@10 registrado aqui.
