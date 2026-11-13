# Seus atalhos por nicho Bugfix Design

## Overview

Recorte desta entrega: só a área "Seus atalhos por nicho" (cláusulas 1.11/2.11, parte de nichos, e 1.13/2.13, normalização de temas). Hoje `GET /recomendacao/{id}/home` não devolve `nichos[]` dentro do grupo `atalhos`. A correção é um módulo novo, `recomendacao/nichos.js`, chamado por `montarHome` em `recomendacao/home.js`. A mudança só acrescenta campos. Regra adicional: em "Seus atalhos", priorizar os serviços fixados (pins) do cidadão; se não houver fixados, mostrar os que ele mais usa. Isso exige um estado de fixados e duas rotas novas. Ficam de fora: `categorias[]`, busca, interesses, acompanhamento, banner de progresso, "Serviços que você pode gostar" e eventos novos.

## Glossary

- **Bug_Condition (C)**: cidadão logado, com personalização ligada e com histórico, cuja Home não traz `nichos[]`.
- **Property (P)**: a Home traz `nichos[]` pronto (títulos, filtros, itens, banners, ações e rótulos de leitor).
- **Preservation**: todo o resto da Home e das demais rotas, sem mudança de nome ou tipo.
- **Nicho**: primeiro valor de `temas` do serviço, normalizado (trim; "Conecta Labs" ignorado).
- **montarHome** (`recomendacao/home.js`): monta os blocos da Home do cidadão logado.
- **Fixado (pin)**: serviço que o cidadão escolheu manter nos atalhos. Máximo de 6, em ordem de fixação.
- **montarNichos(id, historico, podeMostrar, fixados)** (`recomendacao/nichos.js`): função nova que devolve `{ nichos, filtros }` ou `null`.

## Bug Details

### Bug Condition

O bloco do grupo `atalhos` só tem `itens[]`. Falta agrupar por tema o que a pessoa já usou, com título, filtro, banner, `aberto` e `rotulo_leitor`. Os temas do catálogo também trazem espaços sobrando e o valor "Conecta Labs".

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { cidadao_id, personalizacao_ativa, historico }
  OUTPUT: boolean

  RETURN input.personalizacao_ativa = true
         AND existeServicoUsado(input.historico) COM tema normalizado valido
         AND NOT home.grupo('atalhos').nichos EXISTE
END FUNCTION
```

### Examples

- C059592 (11 visitas) usou IPTU (216), 1428, 771 e 481. Esperado: nichos por tema, do mais usado ao menos usado, o primeiro com `aberto: true`. Atual: nenhum.
- C007938 usou 519, 1475 e 953. Esperado: nichos de saúde, com o primeiro aberto. Atual: nenhum.
- Serviço com `temas = [" Conecta Labs ", "Saúde"]`: o primeiro valor é ignorado e vale "Saúde". Se só houver "Conecta Labs", o serviço não entra em nicho.
- Cidadão sem histórico: `nichos` ausente e a Home igual à atual (comportamento correto, deve ser preservado).
- Serviço 942 (Agendamento): `rotulo_botao` "Agende aqui" e `acao.tipo` = `iniciar_jornada`. Um serviço qualquer que não seja Agendamento: "Abrir serviço" e `abrir_servico`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Todos os campos existentes da Home (`blocos`, `controles`, `base_da_personalizacao` etc.) mantêm nome e tipo.
- Home do visitante, Home com personalização desligada, vitrine, jornadas, consentimentos e eventos seguem iguais.
- Os golden tests passam sem mudar fixture (os golden só guardam descrições das rotas, não o corpo da Home).
- Saúde e acessibilidade só com consentimento: serviços sensíveis continuam passando por `podeMostrar`.
- Nenhum campo de unidade (os únicos eventos novos são `servico_fixado` e `servico_desafixado`) (telefone, horário, local).

**Scope:** tudo que não seja o acréscimo de `nichos`/`filtros` no bloco de grupo `atalhos`.

## Hypothesized Root Cause

1. **Funcionalidade ausente**: `montarHome` só monta `itens[]` simples para atalhos.
2. **Temas sem normalização**: `dados.servicos[*].temas` vem do CSV com espaços e "Conecta Labs".
3. **`acaoDoServico` não serve aqui**: ela usa `temJornada` (várias naturezas). O requisito pede `iniciar_jornada` só para 942 e 352. O módulo novo terá uma constante `SERVICOS_DE_JORNADA = [942, 352]`.
4. **Bloco de atalhos nem sempre existe**: com menos de 3 usos o bloco do grupo `atalhos` é "Mais procurados". Os nichos entram no primeiro bloco do grupo `atalhos`, seja qual for o id. Se não houver bloco desse grupo, `nichos` não é enviado.

## Correctness Properties

Property 1: Bug Condition - Nichos nos atalhos

_For any_ cidadão logado com personalização ligada e pelo menos um serviço usado com tema válido, a Home corrigida SHALL trazer no grupo `atalhos` o campo `nichos[]` com: no máximo 4 nichos, ordenados por usos (desempate pelo nome do tema), no máximo 6 itens por nicho (mais usados primeiro, desempate por `servico_id`), nenhum nicho vazio, o primeiro com `aberto: true` e os demais `false`, `filtros[]` com um filtro por nicho mais "Todos", e em cada item `servico_id`, `titulo`, `logo { tipo: "sigla", valor }`, `banner { titulo, texto, rotulo_botao, rotulo_leitor, acao }` e `rotulo_leitor`.

**Validates: Requirements 2.11**

Property 2: Bug Condition - Temas normalizados

_For any_ lista de `temas`, o nicho SHALL ser o primeiro valor após trim que não esteja vazio nem seja "Conecta Labs" (sem diferenciar maiúsculas); sem valor válido, o serviço SHALL ficar fora dos nichos.

**Validates: Requirements 2.13**

Property 3: Preservation - Home existente e privacidade

_For any_ entrada em que `nichos` não se aplica (sem histórico, personalização desligada, visitante) ou para qualquer campo já existente, a Home corrigida SHALL ser igual à original, exceto pelo acréscimo de `nichos` e `filtros`. Os nichos SHALL usar só catálogo e histórico (nunca os marcadores de saúde ou de deficiência), SHALL excluir serviços que `podeMostrar` bloqueia e SHALL não citar condição de saúde no título.

**Validates: Requirements 3.1, 3.3, 3.5, 3.8, 3.9**

## Fix Implementation

### Changes Required

**File**: `backend/src/dados/store.js` e `backend/src/api/rotas/fixados.js` (novo)

- Hoje não existe pin no backend. O estado ganha `fixados[cidadao_id]` = lista ordenada de `servico_id` (ordem de fixação), limite 6, no arquivo atual (sem DynamoDB). Sem dado sensível.
- `GET /dados/fixados/{id}` devolve a lista. `POST /dados/fixados/{id}` com `{ servico_id, fixar: true|false }` fixa ou desafixa. O Kodiak não usa PATCH nem DELETE, então só GET e POST.
- Valida `servico_id` existente (404 ou 422 pelo padrão de `erros.js`), é idempotente, e devolve 422 com mensagem simples ao passar de 6.
- Fixar serviço de saúde não exige consentimento: é escolha explícita do cidadão e o título do nicho continua sem citar condição. Já a sugestão bloqueada por `podeMostrar` (consentimento de saúde ou acessibilidade) não aparece; o fixado pelo próprio cidadão aparece.
- O servidor registra os eventos `servico_fixado` e `servico_desafixado` (sem texto livre) quando o estado muda.

**File**: `backend/src/recomendacao/nichos.js` (novo)

- `normalizarTema(temas)`: primeiro valor com trim, não vazio e diferente de "Conecta Labs".
- `montarNichos(id, historico, podeMostrar)`:
  1. Conta usos por `servico_id` no histórico (índice 2 de cada linha). Soma os `fixados`, mesmo sem uso.
  2. Descarta serviço inexistente ou sem tema válido. Descarta o bloqueado por `podeMostrar`, exceto se for fixado pelo cidadão.
  3. Agrupa por tema. Nichos com algum fixado vêm primeiro; depois, por soma de usos (desc) e nome. Corta em 4, com fixados com prioridade no corte. Dentro do nicho: fixados primeiro (ordem de fixação), depois os mais usados (desc, depois `servico_id`). Corta em 6, fixados com prioridade. Sem fixados, vale a ordem por usos de antes. Sem histórico e com fixados, só nichos dos fixados.
  4. Monta cada nicho: `id` (slug do tema), `titulo` (o tema), `filtro` (o tema), `rotulo_leitor` (por exemplo "Serviços de Saúde que você usa"), `aberto` (true só no primeiro), `itens[]`.
  5. Monta o item: `fixado`, `rotulo_fixar` ("Fixar nos atalhos" ou "Remover dos atalhos"), `acao_fixar { tipo: 'fixar_servico', servico_id, fixar }` (aponta para o POST de fixados), `rotulo_leitor` coerente com o estado e etiqueta de motivo pronta ("Fixado por você" ou "Você usa bastante"), além de `logo { tipo: 'sigla', valor: orgao_sigla }` e `banner`.
     - `texto`: primeira frase da descrição, em linguagem simples, até 120 caracteres (usa o `curto` de `dados/servicos.js`).
     - `rotulo_botao`: "Agende aqui" se `natureza` = "Agendamento", senão "Abrir serviço".
     - `acao`: `iniciar_jornada` para 942 e 352, senão `abrir_servico`.
     - Sem telefone, horário ou local.
  6. `filtros[]`: `{ id, rotulo, rotulo_leitor }` por nicho mais `{ id: 'todos', rotulo: 'Todos' }`.
  7. Sem nenhum nicho, devolve `null`.

**File**: `backend/src/recomendacao/home.js`

- Em `montarHome`, depois de montar `blocos`, lê os fixados do store e chama `montarNichos(id, hist, podeMostrar, fixados)`. Se o resultado não for `null`, acrescenta `nichos` e `filtros` ao primeiro bloco com `grupo === 'atalhos'`. Nada mais muda.

**File**: `.kiro/specs/refatorar-clareza-apis/contrato-das-apis.md`

- Documenta as rotas `GET` e `POST /dados/fixados/{id}`, os campos novos do item e os eventos novos (só acréscimos), e acrescenta as rotas à lista de `liberacao-backend-kodiak.md` se ela existir. Na seção `GET /recomendacao/{id}/home`, documenta `nichos[]`, `filtros[]`, os campos de nicho e de item, as regras (4/6, ordem, ausência) e que não há campo de unidade.

## Testing Strategy

### Validation Approach

Primeiro, testes que falham no código atual (sem `nichos`). Depois, verificação da correção e da preservação. Todos usam `node:test` em `backend/test`, rodando com `npm run teste`.

### Exploratory Bug Condition Checking

**Test Plan**: chamar a Home de C059592 e C007938 e verificar `nichos` no bloco de atalhos. No código atual, falha.

**Test Cases**:
0. **Fixados**: fixar um serviço sem uso e ver nos nichos (falha por não existir)
1. **C059592 com nichos**: Home sem `nichos` (falha no código atual).
2. **C007938 com nichos**: idem.
3. **Normalização**: `normalizarTema` com " Conecta Labs " e " Saúde " (falha por não existir).

**Expected Counterexamples**: `nichos` ausente. Causa provável: funcionalidade não implementada.

### Fix Checking

```
FOR ALL input WHERE isBugCondition(input) DO
  home := montarHome_corrigido(input)
  ASSERT nichosValidos(home.atalhos.nichos)   // limites, ordem, aberto, filtros, itens
END FOR
```

### Preservation Checking

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT removerNichos(montarHome_corrigido(input)) = montarHome_original(input)
END FOR
```

**Test Cases**:
1. Cidadão sem histórico: sem `nichos` e Home igual.
2. Campos existentes da Home com mesmo nome e tipo.
3. Golden tests e teste de contrato sem mudança de fixture.

### Unit Tests

- `normalizarTema`, ordenação, limites 4/6, nicho vazio ausente.
- `rotulo_botao`, `acao`, `logo`, `rotulo_leitor` em todo item.
- Fixados: store (idempotência, limite 6, serviço inexistente, só GET e POST), ordem de `montarNichos` com fixados e campos `fixado`, `rotulo_fixar`, `acao_fixar` e etiqueta de motivo.

### Property-Based Tests

- Com históricos e fixados sintéticos aleatórios: fixados (até 6) sempre antes dos não fixados no nicho, sem fixados a ordem é a por usos; sempre ≤ 4 nichos, ≤ 6 itens, nenhum vazio, só um `aberto`, `filtros.length = nichos.length + 1`.

### Integration Tests

- `POST /dados/fixados/{id}` seguido de `GET /recomendacao/{id}/home`: o fixado aparece primeiro com "Fixado por você".
- `GET /recomendacao/C059592/home` e `/C007938/home` pelo roteador (mesmo helper de `home-blocos.test.js`).
- Sem campo de unidade e sem termo de saúde nos títulos, com e sem consentimento.
