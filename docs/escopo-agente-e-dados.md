# Escopo do agente e modelo de dados


## 1. O que os dados mostram (verificado nos CSVs)

| Arquivo | Linhas reais | Chave | Observações |
|---|---|---|---|
| `cidadaos.csv` | 89.046 | `cidadao_id` (único) | 5.778 não têm histórico (6,5%). `situacao_renda` vazio em 67.873. `criancas_na_familia` vazio em 45.357 (desconhecido, diferente de `nenhuma`) |
| `historico.csv` | 593.056 | `cidadao_id` + `sessao_id` + `ordem_na_sessao` | 83.268 cidadãos, 420.969 sessões, 3 jun a 27 set 2026. Mediana de 3 registros por pessoa. Sem órfãos |
| `servicos.csv` | 843 | `servico_id` (único) | Textos multilinha. 558 têm histórico, 285 não. A coluna `canal_app` está suja (mistura nome de serviço, URL e sigla), então não é confiável |
| `visitas_sem_login.csv` | 3,56 mi | `visitante_id` + `sessao_id` + `ordem_na_sessao` | 356.308 visitantes, jun/2025 a set/2026. Sem ligação com `cidadao_id` |
| `uso_semanal.csv` | 11.587 | `semana` + `servico_id` + `login` | Série semanal com e sem login |

Integridade: todo `servico_id` de historico, visitas e uso existe em `servicos`. Todo `cidadao_id` do histórico existe em `cidadaos`. Valores de `situacao_renda`: `pobreza`, `extrema_pobreza`, vazio. Valores de `criancas_na_familia`: `primeira_infancia`, `crianca`, `adolescente`, `nenhuma`, vazio.

Atenção: `pessoa_com_deficiencia` é verdadeiro em apenas 1.618 cidadãos e `gestante` em 1.252. `hipertensao`, `diabetes` e `saude_mental` têm taxas altas (23 mil, 8 mil e 20 mil). Esses três são sensíveis e só entram com consentimento.

## 2. Escopo do agente

### Dentro do escopo
1. **Entrar como** qualquer `cidadao_id` e carregar perfil e histórico.
2. **Vitrine personalizada** com motivo em cada item (perfil, momento de vida, histórico, popularidade).
3. **Previsão de próximo serviço** a partir de sequências de sessões (com login e sem login).
4. **Previsão de demanda** por serviço e semana (`uso_semanal`), para destacar serviços com pico.
5. **Consentimento por finalidade**: saúde (`saude_personalizacao`) e acessibilidade/deficiência (`acessibilidade_personalizacao`), separados. Pedir, registrar, respeitar a recusa e permitir revogar.
6. **Jornada até a conclusão** de pelo menos um serviço (protocolo fictício), por toque.
7. **Serviços solicitados**: acompanhamento por etapa em 2 serviços, com telas puladas quando o dado vem do perfil.
8. **Eventos** de uso para medir o protótipo.

### Fora do escopo
- Enviar solicitações reais a sistemas da Prefeitura.
- CPF, nome completo ou endereço.
- Inferir saúde a partir de comportamento (por exemplo, "visitou serviço de diabetes, logo tem diabetes").
- Pressionar o cidadão a concluir ou a consentir.

### Decisões do agente
| Situação | Comportamento |
|---|---|
| Há histórico | Combina histórico + perfil + próximo serviço previsto |
| Sem histórico | Perfil + momento de vida + serviços populares para perfis parecidos, e diz isso ao cidadão |
| Campo `criancas_na_familia` vazio | Trata como desconhecido: não assume `nenhuma` |
| Saúde sem consentimento | Não lê nem usa campos de saúde |
| Deficiência sem consentimento de acessibilidade | Não lê nem usa `pessoa_com_deficiencia`; o consentimento de saúde não a libera |
| Consentimento recusado | Vitrine segue normal; nada de saúde é salvo |
| Falta algum dado | Diz que não sabe e oferece alternativa |
| Ação final | Só executa após "confirmar" |

## 3. Modelo de relações

```
cidadaos 1 ───< historico >─── 1 servicos
   │  (cidadao_id)              (servico_id)
   │
   ├──< consentimentos        (cidadao_id, finalidade, status, data)
   └──< jornadas ───> servicos (cidadao_id, servico_id, estado, campos, protocolo)

servicos 1 ───< uso_semanal   (servico_id, semana, login)
servicos 1 ───< jornada_config (servico_id → telas e campos)
servicos >───< servicos       proximo_servico (servico_origem → servico_destino, peso)
visitas_sem_login             (visitante_id, sessao_id; sem ligação com cidadaos)
eventos                       (cidadao_id, tipo, ts)
```

Pontos importantes:
- `cidadaos` nunca é alterado. O que o cidadão faz no protótipo vai para o estado separado.
- **Visitas sem login não têm `cidadao_id`**. Elas servem só para estatística global (próximo serviço, demanda). Nunca se tenta ligar um visitante a um cidadão.
- **Consentimento é por finalidade** (`saude_personalizacao` e `acessibilidade_personalizacao`) e tem histórico de mudanças (concedido, recusado, revogado).

## 4. Tabelas no DynamoDB

| Tabela | PK | SK | Conteúdo | Acesso |
|---|---|---|---|---|
| `cidadaos` | `cidadao_id` | – | Perfil completo, com campos de saúde em atributo separado (`saude`) | Entrar como (1 leitura) |
| `historico` | `cidadao_id` | `data#hora#sessao#ordem` | `servico_id` | Últimos N serviços do cidadão (query invertida) |
| `servicos` | `servico_id` | – | Nome, órgão, temas, públicos, palavras-chave, natureza, requisitos, passos, nota, cliques | Detalhe e busca (cache em memória na Lambda: 843 itens cabem) |
| `proximo_servico` | `servico_origem` | `peso#servico_destino` | Peso (contagem de pares consecutivos em sessões, com e sem login) | Top-K próximos |
| `demanda_semanal` | `servico_id` | `semana#login` | Cliques, visitas, visitantes, previsão | Destaque de pico |
| `popular_por_perfil` | `faixa_etaria#flags` (chave de segmento) | `ranking#servico_id` | Serviços mais acessados por perfil parecido | Histórico vazio |
| `consentimentos` | `cidadao_id` | `finalidade#ts` | status (concedido, recusado, revogado) | Verificar antes de usar saúde |
| `jornada_config` | `servico_id` | – | `telas:[{id,campos}]`, listas de opções | Telas do pedido |
| `jornadas` | `cidadao_id` | `jornada#ts` | Estado, campos preenchidos, protocolo | Retomar e concluir |
| `eventos` | `cidadao_id` | `ts#tipo` | `tela_pulada`, `jornada_concluida`, eventos da Home e da solicitação | Métricas (com TTL) |

Notas:
- `cidadaos` (89 mil) e `historico` (593 mil) cabem tranquilamente no DynamoDB sob demanda; carga única por script.
- `proximo_servico`, `demanda_semanal` e `popular_por_perfil` são **pré-calculados** (script offline), para a vitrine responder rápido.
- `servicos` e `jornada_config` ficam em cache na Lambda.
- Dados de saúde (`saude`) e de deficiência (`acessibilidade`) ficam em atributos separados, e a API só lê cada um quando há consentimento `concedido` da respectiva finalidade.

## 5. Fluxo de uma chamada de vitrine

1. `GET /vitrine/{id}` lê `cidadaos`.
2. Lê `consentimentos`: se não houver `concedido`, remove o atributo `saude` da memória.
3. Lê os últimos itens de `historico`.
4. Gera candidatos: afinidade com perfil (regras sobre `servicos`), `proximo_servico` do último serviço visto, `popular_por_perfil` (se histórico vazio) e `demanda_semanal`.
5. Pontua, aplica diversidade (máx. 2 por órgão nos 5 primeiros) e monta o motivo de cada item.
6. Retorna a lista e `base_da_personalizacao` ("histórico" ou "perfil"), usada na explicação.

## 6. Pendências e riscos nos dados

| Item | Impacto | Ação |
|---|---|---|
| `canal_app` suja | Não dá para filtrar por canal digital | Usar `nivel_digital_atual` e `canal_web`; validar |
| Valores vazios em `situacao_renda` e `criancas_na_familia` | Podem ser "não se aplica" ou "desconhecido" | Confirmar com a organização do hackathon |
| Sem ligação entre `visitante_id` e `cidadao_id` | Não há como unir histórico com e sem login | Usar só como sinal agregado |
| Histórico curto (mediana 3) | Previsão individual é fraca | Combinar com perfil e populares por segmento |
| 285 serviços sem histórico | Nunca seriam sugeridos só por popularidade | Incluí-los via afinidade de perfil |
| Jornadas com telas configuradas | Só existem para os serviços escolhidos | Definir os 2 serviços e suas telas (352 e 942) |
