# Kodiak: Visão Geral, Consumo de APIs e Templates

Resumo de consulta do documento "Kodiak: Visão Geral, Consumo de APIs e Templates" (12/11/2026, @Duda).

## 1. Visão geral

Plataforma para criar e evoluir funcionalidades mobile com agilidade, padronização e governança. O app executa jornadas parametrizadas, padronizadas e observáveis, sem concentrar a evolução no código do aplicativo.

- O app embarca a capacidade de executar experiências Kodiak (runtime).
- A funcionalidade é montada a partir de templates e configuração.
- O backend (Engine) decide a navegação, integra APIs e devolve os dados.
- A operação acontece fora do ciclo de publicação do app, quando o tipo de mudança permite.

### Problema resolvido
Muitos times no app, alto volume de mudanças semanais, custo de nova versão, aprovação nas lojas e lentidão de atualização por parte dos clientes.

### Quatro frentes para quem implementa
1. Capacidade embarcada no app (runtime Kodiak).
2. Estrutura visual reutilizável (template suportado).
3. Configuração do fluxo (navegação, conteúdo, integrações).
4. Integração com serviços de negócio (Engine orquestra chamadas).

### Princípios
- Templates parametrizáveis.
- Configuração dinâmica (navegação, APIs, conteúdo).
- Padronização visual e de acessibilidade (biblioteca de componentes e DLS).
- Orquestração centralizada no backend.
- Separação entre runtime e gerenciamento.
- Observabilidade integrada.

## 2. Arquitetura

Cinco componentes: **SDK (no app) → Engine → Configurações de telas / APIs de negócio**, com a **Plataforma Lowcode** alimentando as configurações.

| Componente | Papel |
|---|---|
| SDK / Rocket / runtime | Recebe a definição da tela, escolhe o template, renderiza e executa actions. Pacotes: `plk-rocket-core-react-native`, `plk-rocket-react-native`, `plm-react-native-sdk` (empacotamento iOS/Android). |
| Engine | Recebe a navegação do app, identifica a próxima tela, lê a configuração, faz as integrações e devolve a definição executável. Uma instância por app e por ambiente. |
| Configurações de telas | Documentos JSON com template, parâmetros, navegação e integrações. |
| Plataforma Lowcode (Launchpad e Launchpad API) | Autoria, versionamento, build, promoção entre ambientes, publicação e rollback. |
| APIs de negócio | Fonte dos dados do produto. |
| Launcher | Apoio ao desenvolvimento local (ambiente, emulador, testes). |
| Monitor | Observabilidade: volume de navegação, tempo de resposta, taxa de sucesso e erros por fluxo/integração. |

### Execução
1. Cliente navega no app.
2. Runtime pede ao Engine a próxima tela.
3. Engine consulta a configuração do fluxo.
4. Engine consome as APIs necessárias.
5. Engine devolve JSON com template e dados.
6. Runtime instancia o template.
7. Monitor observa navegação e métricas.

### Desenvolvimento
1. Definir Projeto e Fluxo.
2. Selecionar versão do SDK/runtime (define templates disponíveis).
3. Modelar telas: template, identificador, APIs, componentes, navegação (formulário web, salvo como JSON).
4. Validar no ambiente de desenvolvimento (emulador, entrypoints, Launcher).
5. Publicar e promover (build, versão, ambientes).

### Build e deploy
Build é um pacote de configurações do fluxo, com versão. Promover = mover configurações entre bases. Ambientes: desenvolvimento, homologação e produção, isolados.

### Benefícios
Entregas rápidas sem nova versão do app, menos implementação repetitiva, menor exposição das APIs, rollback rápido, observabilidade por padrão, tráfego enxuto, autonomia para devs não mobile.

## 3. Ciclo de vida dos templates
1. Identificação do caso de uso (cenário real).
2. Especificação pelo UX (só componentes do Design System/BBDS).
3. Disponibilização na plataforma (equivalência com Figma).
4. Configuração para uso (não é obrigatório usar todos os componentes do template).

## 4. Consumindo APIs

A chamada é feita pela própria plataforma Kodiak, não pelo front-end.

**Pré-requisito:** o backend precisa ser liberado pela equipe de suporte Kodiak ("Liberação de backends").

### Seção Requisições (templates visuais e Switch)

| Campo | Descrição |
|---|---|
| Endereço da API | URL acessada. Prefira variáveis a URL fixa. |
| Tipo da chamada | GET, POST, DELETE ou PUT. |
| Nome do resultado | Alias do retorno, reutilizável no fluxo. |
| Proteger informações sensíveis | Oculta parâmetros de logs, analytics e outras saídas. |

### Acesso ao retorno
Com Nome do resultado = `resultado` e retorno `{"cliente":{"nome":"Chuck Norris","idade":84}}`:

```
${resultado.response.cliente}
```

### Parâmetros e headers
- Parâmetros são pares chave/valor e aceitam expressões resolvidas antes do envio.
- Headers não são configuráveis na interface (segurança). O Kodiak envia os necessários (tokens e dados técnicos do app). Header extra: abrir issue para o time Kodiak.

### Variáveis por ambiente
- Globais: `#server{}`; de parceiro: `#partner{}`.

```
#server{meu_backend}/api/v1/recurso
```

### Múltiplas requisições
Executam em **paralelo** (assíncrono), sem ordem garantida. Não dependa do retorno de uma para outra. Para chamadas dependentes, use **Switch**.

### Tratamento de erros
- Padrão: tela genérica de erro.
- Para controlar no fluxo: marcar **Utilizar tratamento de erro Customizado** e usar:

```
${requestAlias.response.error}
${requestAlias.response.info}
```

### Regra prática

| Situação | O que fazer |
|---|---|
| API simples para abastecer tela | Configurar a requisição no próprio template |
| Endpoint por ambiente | `#server{}` ou `#partner{}` |
| Reutilizar o retorno | Alias claro + expressão |
| Chamadas dependentes | Switch |
| Controlar falha | Tratamento de erro customizado |

### Checklist de sucesso
- Requisição retorna dados no alias esperado.
- A tela exibe/reutiliza os dados por expressão.
- Fluxo correto em sucesso e falha.
- Sem dependência indevida entre requisições paralelas.

### FAQ (títulos do documento, sem respostas)
- Por que a API funciona em desenvolvimento e falha em homologação?
- Posso chamar mais de uma API na mesma tela?
- Como acesso um campo do retorno?
- O que acontece se a API retornar erro?

## 5. Templates disponíveis

| Template | Para que serve |
|---|---|
| Card Info Resumed | Imagem de destaque com item de lista, link, botão; repete até 3 vezes. |
| Card Detail | Imagem/gráfico de destaque e caixa de texto com até 2 links; seções de listas, radio buttons e accordions. |
| Cart | Lista de compras com imagem, descrição, quantidade e remoção. |
| Central | Centrais de fluxo; requer ao menos um widget. |
| Central 2 | Telas iniciais com cards, listas e banners. |
| Comprovante | Comprovantes de transações; visualizar, salvar, compartilhar. |
| Formulário | Captura de dados via inputs em seções. |
| Catálogo | Conteúdos em cartão de imagem. |
| Item Details | Apresentação e detalhamento de produtos/itens. |
| Item Picker | Textos, listas, expansíveis, radio e filtros. |
| List Card Details | Filtros em carrossel e conteúdo com CardIcon e listas. |
| Lista | Listas de itens, com seções opcionais. |
| Onboarding | Proposta de valor no primeiro acesso. |
| Intro | Resultados de ações, confirmações e alertas. |
| Statement | Saldo e listas filtráveis por seleção, inputs e Bottom Sheet. |
| Texto | Informações e notificações gerais. |
| Tracking | Lista simples com descrição, valores opcionais, ícones, imagens e subdescrição. |

### Áreas comuns
- **Inner Header:** área abaixo da barra de navegação com informações, orientação e progresso.
- **Footer:** área fixa na base com ações, informações e conteúdos para concluir a jornada.

Cada template na documentação oficial traz: Exemplos, Definições Gerais, Anatomia, Propriedades e Boas Práticas.

## 6. Pendências (HACKA/TS 2026)
- Texto recebido não detalha "Liberação de backends", "Trabalhando com variáveis" nem "Tratamento de erros customizado".
- Item 8.7 do edital (plataforma de desenvolvimento) ainda não recebido.
- Nossa API deve ter URL pública, estável e HTTPS para a liberação do backend.
