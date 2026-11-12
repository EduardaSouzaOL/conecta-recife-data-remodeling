# Design Document

## Overview

A camada OSINT adiciona três tabelas de referência (contexto territorial, gatilhos, serviços enriquecidos) e um passo de avaliação de gatilhos antes da ordenação do recomendador existente. A integração exata depende do diagnóstico (Requirement 1); onde houver `<<PREENCHER>>`, o agente deve usar o que encontrar no projeto.

## Architecture

```
cidadaos / historico / uso_semanal  ──►  perfil do cidadão (idade, bairro, flags)
                                              │
contexto_territorial (agregado)  ─────────────┤
gatilho_ciclo_vida (calendário) ──────────────┤──►  avaliador de gatilhos ──► score ──► cards + "Por que?"
servico_enriquecido ──────────────────────────┘
```

Stack: `<<PREENCHER a partir do diagnóstico>>`. Preferir arquivos estáticos (CSV/JSON/SQL seed) se o ambiente não permitir chamadas externas.

## Components

- **Carregador de fontes abertas:** gera `contexto_territorial` a partir de CSVs já baixados. Sem chamadas em tempo de execução.
- **Normalizador de bairro:** função única (maiúsculas, sem acento, remove "de/da/do") usada em todos os joins.
- **Avaliador de gatilhos:** recebe o perfil e a data atual, retorna gatilhos ativos com motivo.
- **Pontuador:** combina co-ocorrência, gatilho e contexto com pesos configuráveis.
- **Gerador de explicação:** transforma o motivo em texto simples, sem expor dados sensíveis.
- **Preferências do cidadão:** "não me interessa" e "não usar meus dados".

## Data Models

```
contexto_territorial(bairro_id PK, bairro_nome, bairro_normalizado, rpa,
  qtd_escolas, qtd_unidades_saude, pop_0_4 NULL, pop_5_9 NULL,
  fonte, data_referencia)

gatilho_ciclo_vida(gatilho_id PK, descricao, idade_min, idade_max, condicao,
  servico_id FK servicos, janela_inicio NULL, janela_fim NULL,
  sensivel BOOL, fonte_url, verificado BOOL)

servico_enriquecido(servico_id PK/FK servicos, publico_alvo, faixa_etaria,
  janela_inicio NULL, janela_fim NULL, sazonalidade, fonte_url, verificado BOOL)
```

Ligação: `cidadaos.bairro` (ou `rpa`) → `contexto_territorial.bairro_normalizado`.

## Fontes abertas (agregadas)

- Bairros e RPAs: dados.recife.pe.gov.br, dataset "Área urbana" (coluna `rpa`).
- Escolas por RPA: dataset "Matrículas na rede municipal" (colunas RPA e BAIRRO ESCOLA confirmadas). Contar escolas distintas por RPA via UNIDADE_DE_ENSINO ou INEP.
- Unidades de saúde: dataset "Rede de atenção à saúde do Recife" (campos não confirmados); se não houver RPA, join por bairro com "Área urbana".
- Censo 2022 IBGE por bairro (opcional): ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/
- RPA 5 (16 bairros): Afogados, Areias, Barro, Bongi, Caçote, Coqueiral, Curado, Estância, Jardim São Paulo, Jiquiá, Mangueira, Mustardinha, San Martin, Sancho, Tejipió, Totó.
- RPA 6 (8 bairros): Boa Viagem, Brasília Teimosa, Imbiribeira, Ipsep, Pina, Ibura, Jordão, Cohab.

## Fatos verificados para os seeds (usar `verificado = true`)

- Matrícula 2027: inscrição 05/11–10/12/2026; distribuição 11/12–28/12/2026; confirmação 05/01–15/01/2027; cobre Educação Infantil, Fundamental e EJA só para novatos; quem já está na rede tem renovação automática (matriculaonline.recife.pe.gov.br; serviço 839).
- Jornada do Estudante (1148): exige estudante matriculado na rede e login no Conecta.
- Bolsa Família: frequência mínima de 60% (4–5 anos) e 75% (6 a 18 anos incompletos); acompanhamento em bimestres, o atual é out–nov (MDS; Lei 14.601/2023, art. 10).
- HPV: dose única de 9 a 14 anos, 11 meses e 29 dias. Influenza de rotina para 60+ o ano todo; não é de rotina para 7–11 anos (Calendário Nacional 2026).
- Academia da Cidade (Saúde, serviço 331) é distinta da Academia Recife (Esportes, serviço 858, atestado para quem tem 60+).
- Conecta Medicamentos (1101); Farmácias da Família. Castração gratuita (serviço 34). Antirrábica 2026: Dia D em 07/11/2026 (já passou); dose vale 12 meses.

**Não verificado (`verificado = false`, não usar em gatilho ativo):** meningocócica ACWY, febre amarela e covid para 7–11 anos; "Hiperdia"; entrega domiciliar de medicamentos; campos exatos dos datasets de escola e saúde.

## Score

`score = 0,5 × cooc + 0,3 × gatilho + 0,2 × contexto`. Contexto e benefício só ordenam. Serviços elegíveis por idade/condição nunca são removidos.

## Error Handling

- Bairro sem correspondência: fallback para a RPA; registrar em log; nunca quebrar a recomendação.
- Janela de calendário ausente: gatilho depende só de idade/condição.
- Fonte `nao_verificado`: ignorar no gatilho ativo.
- Campo `criancas_na_familia` vazio: significa "sem informação", não "sem criança"; não disparar gatilho de criança.

## Privacy by design

- Só agregados no contexto territorial.
- Flag de elegibilidade em vez de diagnóstico; texto de card e de notificação sem condição de saúde.
- Base legal presumida: LGPD art. 11, II, "b" e art. 23 (hipótese a validar com o jurídico). "Aceita avisos" é só canal de notificação.

## Testing Strategy

- Testes unitários: normalizador de bairro, avaliador de gatilhos (com datas fixas), pontuador.
- Testes de aceite com as personas C076260, C062244 e um cidadão novo (Requirement 9).
- Teste de privacidade: nenhuma string de condição de saúde na saída dos cards.
