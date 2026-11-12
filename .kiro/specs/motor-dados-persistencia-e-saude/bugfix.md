# Bugfix Requirements Document

## Introdução

Dois defeitos no backend do Conecta Recife (dados fictícios) afetam requisitos da spec `conecta-recife-personalizacao`. Ambos já têm a correção aplicada no código; esta spec formaliza a condição do defeito e define como verificá-la por teste.

1. **Persistência do estado quebrada.** Consentimentos, jornadas e eventos não sobreviviam a um restart. O arquivo `data/estado.json` ficava sempre vazio, porque o carregamento trocava os objetos internos do estado por novos, enquanto o restante do código continuava apontando para os objetos antigos. Isso viola os requisitos 3.5 (respeitar a escolha do cidadão em acessos seguintes), 4.6 (registrar mudanças de consentimento com data) e 7 (medição por eventos). Além disso, a lista de eventos era cortada em 5000 itens, o que ameaça a medição.
2. **Vazamento de dado sensível no motivo.** O motivo "Quem acessou X também costuma acessar este serviço" usava o nome do serviço de origem, vindo do histórico. O filtro de serviço sensível só valia para o serviço sugerido, não para a origem. Sem o consentimento da categoria correspondente, o texto podia revelar uma condição de saúde ou uma deficiência. Isso viola os requisitos 4.1, 4.1a, 4.3 e 4.7 (LGPD, art. 11).

### Consentimentos independentes por categoria

O código separa os serviços sensíveis em duas categorias, cada uma com consentimento próprio (requisito 4.1b da spec principal). Conceder uma categoria não libera a outra.

| Categoria | Finalidade do consentimento | Marcadores (colunas de `cidadaos.csv`) |
|---|---|---|
| `saude` | `saude_personalizacao` | `hipertensao`, `diabetes`, `saude_mental`, `gestante` |
| `acessibilidade` | `acessibilidade_personalizacao` | `pessoa_com_deficiencia` |

Registro de decisão de implementação: o "Guia dos dados" (`docs/tutorial.md`, seção 2 e dicionário de colunas) lista apenas hipertensão, diabetes, saúde mental e gestante como marcadores de saúde. `pessoa_com_deficiencia` é tratada em categoria própria, com consentimento separado, por decisão de implementação da equipe (requisitos 4.1a e 4.1b da spec principal), por ser também dado sensível (LGPD, art. 11). No código, as listas são `CAMPOS_SAUDE` e `CAMPOS_ACESSIBILIDADE` em `backend/src/dados/carga.js`, e a classificação de um serviço está em `categoriasSensiveis` (`backend/src/recomendacao/regras.js`).

Restrições: manter o comportamento do restante do sistema e não alterar os CSVs em `BD/`.

## Bug Analysis

### Current Behavior (Defect)

Descreve o comportamento do código ANTES da correção.

1.1 WHEN o servidor inicia e `data/estado.json` contém consentimentos, jornadas ou eventos salvos THEN the system não os expõe em memória, porque os objetos usados pelo restante do código não são os que foram carregados do arquivo

1.2 WHEN um consentimento, uma jornada ou um evento é gravado em memória THEN the system grava no arquivo um estado diferente do que foi alterado, e `data/estado.json` permanece vazio

1.3 WHEN o servidor reinicia THEN the system perde os consentimentos, as jornadas e os eventos, e o cidadão volta a ser tratado como se nunca tivesse decidido sobre a personalização ou sobre o uso de dados sensíveis

1.4 WHEN o número de eventos registrados passa de 5000 THEN the system descarta os eventos mais antigos, e as métricas de conclusão, abandono e satisfação ficam incompletas

1.5 WHEN o cidadão não deu o consentimento da categoria de um serviço sensível do seu histórico (saúde ou acessibilidade) THEN the system gera o motivo `Quem acessou "<nome do serviço de origem>" também costuma acessar este serviço.` com o nome desse serviço, revelando a condição

1.6 WHEN o motivo do tipo "histórico" de um item com origem sensível aparece em `outros_motivos` de um item não sensível, sem o consentimento da categoria da origem THEN the system exibe o nome do serviço sensível de origem nesse texto

1.7 WHEN o cidadão deu o consentimento de uma categoria e o serviço de origem do histórico pertence à outra categoria THEN the system trata a origem como liberada e exibe o nome dela, porque não distingue as categorias (por exemplo, consentimento de saúde não libera a origem de acessibilidade, e o contrário também vale)

Exemplo concreto (persona oficial C036462, jovem estudante, gestante, dados fictícios): sem consentimento de saúde, ela tem no histórico o serviço 892 "Atendimento online Atende Gestante", da categoria `saude`. No código com defeito, um item sugerido a partir dele diz `Quem acessou "Atendimento online Atende Gestante" também costuma acessar este serviço.`, o que revela a gestação.

### Expected Behavior (Correct)

2.1 WHEN o servidor inicia e `data/estado.json` contém estado salvo THEN the system SHALL carregar consentimentos, jornadas e eventos nos mesmos objetos que o restante do código usa para ler e gravar

2.2 WHEN um consentimento, uma jornada ou um evento é gravado THEN the system SHALL gravar em `data/estado.json` exatamente o estado alterado em memória, de forma atômica

2.3 WHEN o servidor reinicia THEN the system SHALL manter os consentimentos, as jornadas e os eventos anteriores e respeitar a escolha do cidadão nos acessos seguintes

2.4 WHEN o número de eventos registrados passa do limite THEN the system SHALL preservar eventos suficientes para a medição, com um limite maior e configurável, e SHALL NOT descartar silenciosamente os eventos de medição dentro desse limite

2.5 WHEN o cidadão não deu o consentimento de alguma das categorias do serviço de origem do histórico THEN the system SHALL usar um texto genérico no motivo, sem citar o nome nem o tema do serviço de origem (por exemplo, "Pessoas com um perfil parecido com o seu também costumam acessar este serviço.")

2.6 WHEN o cidadão não deu o consentimento da categoria do serviço de origem THEN the system SHALL NOT exibir o nome desse serviço em nenhum texto do item, incluindo `motivo` e `outros_motivos`

2.7 WHEN o consentimento de uma categoria é concedido ou revogado THEN the system SHALL tratar a outra categoria de forma independente, sem liberá-la nem bloqueá-la

Exemplo concreto (C036462 e serviço 892): sem consentimento de saúde, o motivo é o texto genérico e nem `motivo` nem `outros_motivos` contêm "Atende Gestante" ou "gestante". Com o consentimento de saúde, o motivo volta a trazer o nome do serviço de origem. Com apenas o consentimento de acessibilidade, o 892 continua genérico.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `data/estado.json` não existe, está vazio, está inválido ou tem formato inesperado na primeira execução THEN the system SHALL CONTINUE TO iniciar normalmente com consentimentos, jornadas e eventos vazios

3.2 WHEN o estado é gravado THEN the system SHALL CONTINUE TO usar gravação com atraso (`salvar`) e gravação imediata (`salvarLogo`), sem armazenar CPF, nome completo real ou endereço

3.3 WHEN o cidadão deu o consentimento de todas as categorias do serviço de origem THEN the system SHALL CONTINUE TO exibir o motivo "Quem acessou X também costuma acessar este serviço" com o nome do serviço de origem

3.4 WHEN o serviço de origem do histórico não é sensível THEN the system SHALL CONTINUE TO exibir o motivo com o nome do serviço de origem, independentemente dos consentimentos

3.5 WHEN o serviço sugerido é sensível e não há consentimento da respectiva categoria THEN the system SHALL CONTINUE TO não sugerir esse serviço

3.6 WHEN o motivo é do tipo "repetir" ("Você acessou este serviço em ...") THEN the system SHALL CONTINUE TO exibir o motivo com a data e sem o nome do serviço

3.7 WHEN a vitrine é montada THEN the system SHALL CONTINUE TO aplicar a mesma pontuação, a mesma ordem, a diversidade por órgão e a garantia de pelo menos um serviço novo

3.8 WHEN os CSVs em `BD/` são lidos THEN the system SHALL CONTINUE TO tratá-los como somente leitura

3.9 WHEN o cidadão não deu nenhum consentimento THEN the system SHALL CONTINUE TO não ler `saude` nem `acessibilidade` do perfil na montagem da vitrine e a não expor esses campos em "entrar como"

3.10 WHEN registros de consentimento antigos não têm o campo `finalidade` THEN the system SHALL CONTINUE TO tratá-los como `saude_personalizacao`

## Condições do defeito

```pascal
// Bug 1: persistência
FUNCTION isBugCondition_Persistencia(X)
  INPUT: X de tipo SessaoDeServidor
  OUTPUT: boolean
  RETURN X.gravouEstado OR X.arquivoTemEstadoSalvo
         // os objetos exportados diferem dos objetos carregados
END FUNCTION

// Property: Fix Checking - Persistência
FOR ALL X WHERE isBugCondition_Persistencia(X) DO
  ASSERT carregarEstado'(X).consentimentos = X.arquivoEstado.consentimentos
         AND objetoExportado = objetoSerializado
END FOR

// Bug 1b: limite de eventos
FUNCTION isBugCondition_Eventos(X)
  INPUT: X de tipo SessaoDeServidor
  OUTPUT: boolean
  RETURN X.eventosRegistrados > 5000
END FUNCTION

// Bug 2: vazamento de dado sensível, por categoria
FUNCTION isBugCondition_Saude(X)
  INPUT: X de tipo (cidadao, vitrine)
  OUTPUT: boolean
  RETURN EXISTS origem IN X.cidadao.historico:
               EXISTS c IN categoriasSensiveis(origem):
                 NOT temConsentimento(X.cidadao, c)
                 AND textoDoItem(X.vitrine) CONTÉM origem.nome
         // c ∈ {saude, acessibilidade}; consentimento de uma não libera a outra
END FUNCTION

// Property: Fix Checking - Dado sensível
FOR ALL X WHERE isBugCondition_Saude(X) DO
  result ← montarVitrine'(X)
  ASSERT NOT (nome do serviço de origem IN result.itens[*].motivo, outros_motivos)
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_Persistencia(X)
            AND NOT isBugCondition_Eventos(X)
            AND NOT isBugCondition_Saude(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

## Fora do escopo

Os achados do `docs/tutorial.md` abaixo não fazem parte desta spec. Ficam registrados na spec `conecta-recife-personalizacao`, que é a dona da lógica de recomendação:

- regra de Cadastro Único que nunca dispara (regra morta);
- uso da demanda de `uso_semanal`;
- peso das visitas sem login.

Também ficam de fora: a classificação de serviços sensíveis além do que `regras.js` já cobre (risco residual descrito no design) e qualquer mudança de pontuação da vitrine.

## Verificação prevista

Os testes ficam em `backend/test/` e rodam com `node --test` em `backend/`. Cobrem a recarga do estado após restart (consentimento, jornada e evento), o limite de eventos, o texto genérico do motivo com origem sensível sem o consentimento da categoria, a independência entre saúde e acessibilidade, a manutenção do nome com consentimento e a ausência do nome em `outros_motivos`.
