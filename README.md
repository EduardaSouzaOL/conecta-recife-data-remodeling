# Kodiak Agent Kit

Kit para usar o **Kodiak** (plataforma low code de telas mobile) com **qualquer assistente de IA** que suporte MCP: editor, CLI ou app de chat. Ele reúne tudo o que o agente precisa para criar e editar telas no Kodiak a partir de uma conversa.

```
Seu assistente de IA ⇄ kodiak-mcp (MCP via stdio) ⇄ WebSocket :4097 ⇄ Kodiak aberto no navegador
```

O `kodiak-mcp` é só uma ponte. Quem de fato cria e altera as telas é o site do Kodiak aberto no seu navegador.

---

## O que tem aqui dentro

```
kodiak-agent-kit/
├── README.md              ← este guia
├── AGENTS.md              ← instruções do agente (persona "Astro", regras, fluxo de criação de telas)
├── mcp/
│   ├── kodiak-mcp.tgz     ← pacote do servidor MCP (Node.js)
│   └── mcp.example.json   ← exemplo genérico de registro do servidor MCP
└── skills/                ← conhecimento especializado, carregado sob demanda
    ├── using-kodiak-templates/    escolher e montar telas (inclui referências por template)
    ├── using-kodiak-actions/      o que acontece ao tocar (navegação, alerta, link, etc.)
    ├── using-kodiak-requests/     buscar dados de APIs externas
    ├── using-kodiak-iterables/    preencher listas dinamicamente
    └── using-kodiak-expressions/  expressões JavaScript inline com ${}
```

| Item | Para que serve |
|---|---|
| `AGENTS.md` | Define o comportamento do agente: fala em português, usa termos do produto em vez de termos técnicos, valida toda tela antes de criar e segue o fluxo de criação passo a passo. **Sem ele, o agente funciona, mas sem essas regras.** |
| `mcp/kodiak-mcp.tgz` | Servidor MCP que expõe as tools `kodiak_*`: listar projetos, fluxos, telas e templates, baixar estruturas de template, criar e atualizar telas, criar entradas, etc. |
| `skills/` | Cada pasta tem um `SKILL.md` (com cabeçalho `name` e `description`) e, às vezes, material de referência. O agente consulta a skill certa conforme o assunto. |

---

## O que o seu assistente de IA precisa suportar

| Capacidade | Obrigatória? | Por quê |
|---|---|---|
| **Servidor MCP local (stdio)** | Sim | É por ele que o agente fala com o Kodiak. |
| **Executar comandos no terminal** | Sim | O fluxo usa `jq` para ler as estruturas dos templates e `ajv` para validar as telas antes de criar. |
| **Ler e escrever arquivos em `~/.plk-astro/`** | Sim | As tools salvam e leem as telas e as estruturas dessa pasta. |
| **Instruções de projeto / prompt de sistema** | Recomendada | Para carregar o `AGENTS.md`. |
| **Skills** (ou regras / arquivos de contexto) | Recomendada | Para carregar as pastas de `skills/`. Sem suporte nativo, dá para anexar os `SKILL.md` como contexto. |

---

## Setup

### 1. Pré-requisitos na máquina

- **Node.js ≥ 18.20** (confira com `node -v`).
- **jq** (opcional). Se não estiver instalado, o agente usa `npx -y node-jq` no lugar.
- **ajv-cli** (opcional). Se não estiver instalado, o agente usa `npx -y ajv-cli` no lugar.
- Acesso ao site do Kodiak, **https://kodiak.bbts.com.br**, com login.

### 2. Instalar o servidor MCP

De dentro desta pasta:

```bash
npm install -g ./mcp/kodiak-mcp.tgz
```

Confira se o comando ficou disponível e **anote o caminho completo**:

```bash
which kodiak-mcp      # macOS / Linux
where kodiak-mcp      # Windows
```

### 3. Registrar o MCP no seu assistente

Adicione um servidor MCP do tipo **stdio** com o comando `kodiak-mcp`. O formato do arquivo de configuração muda de ferramenta para ferramenta, mas o conteúdo é sempre o mesmo. Veja `mcp/mcp.example.json`:

```json
{
  "mcpServers": {
    "kodiak-mcp": {
      "type": "stdio",
      "command": "kodiak-mcp",
      "args": []
    }
  }
}
```

- **Se o assistente não achar o comando:** muitos apps não herdam o PATH do terminal. Nesse caso, troque `"command"` pelo caminho completo anotado no passo 2. Outra opção é usar `"command": "node"` com `"args": ["<caminho>/kodiak-mcp/index.js"]`.
- **Aprovação automática (opcional):** se a ferramenta permitir, aprove automaticamente as tools `kodiak_*` de leitura. As de criação e atualização alteram telas reais, então decida se quer confirmar cada uma.

### 4. Disponibilizar as skills

Faça as pastas de `skills/` chegarem ao lugar onde o seu assistente procura skills ou regras:

- **Ferramentas com suporte a skills:** copie ou crie um link de cada pasta de `skills/` para o diretório de skills da ferramenta, mantendo o nome da pasta e o `SKILL.md` dentro dela.
- **Ferramentas sem skills, mas com regras ou arquivos de contexto:** aponte para os `SKILL.md`, ou cole o conteúdo deles como regras do projeto.
- Um link simbólico mantém uma única cópia. No Windows, prefira copiar as pastas.

### 5. Carregar as instruções do agente

Use o `AGENTS.md` como instrução de projeto ou prompt de sistema:

- Muitas ferramentas leem automaticamente um `AGENTS.md` na raiz da pasta aberta. Abrir esta pasta como projeto já pode bastar.
- Se não for o caso, aponte o arquivo nas configurações de instruções ou cole o conteúdo como prompt de sistema.

### 6. Conectar o navegador

1. Abra **https://kodiak.bbts.com.br** e faça login.
2. Clique na **bolinha do Astro**, no canto inferior direito. É isso que abre a conexão com o `kodiak-mcp` na porta **4097**.
3. Mantenha **apenas um** `kodiak-mcp` rodando por vez, porque a porta aceita uma única conexão.

### 7. Testar

No chat do seu assistente, peça:

> "Quais projetos existem no Kodiak?"
> "Liste os templates disponíveis."

Se ele responder com dados reais, a cadeia **assistente → MCP → navegador → Kodiak** está funcionando.

---

## Pasta de trabalho `~/.plk-astro/`

Criada automaticamente pelo servidor MCP:

```
~/.plk-astro/
├── configs/<projeto>/<fluxo>/<versão>/<tela>.json   ← telas baixadas
├── schemas/<versão>/<template>.json                  ← estrutura de cada template
└── temp/                                             ← rascunhos das telas antes de validar e criar
```

As tools de criação e atualização só aceitam arquivos dentro dessa pasta.

---

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| O assistente não inicia o `kodiak-mcp` | Comando fora do PATH do app | Use o caminho absoluto no registro do MCP (passo 3). |
| O agente diz que não conseguiu falar com o navegador | Kodiak fechado ou bolinha do Astro não clicada | Abra o Kodiak, clique na bolinha e tente de novo. |
| Tool demora cerca de 2 minutos e falha | Navegador desconectado da porta 4097 | Mesmo caso acima. Confira se só um navegador e um MCP estão ativos. |
| Erro de "porta em uso" | Outro `kodiak-mcp` já está rodando | macOS/Linux: `lsof -i :4097` e `kill -9 <PID>`. Windows: `netstat -ano \| findstr :4097` e `taskkill /PID <PID> /F`. |
| Atualizar tela falha pedindo `_id` | O arquivo enviado não veio da tela existente | Baixe a tela antes (`kodiak_get_config`) e edite a partir desse arquivo. |
| Não dá para apagar ou renomear tela ou entrada pelo agente | O MCP não tem essas operações | Faça pelo site do Kodiak. |
| `npm install -g` falha | Node antigo ou falta de permissão | Atualize o Node. Prefira um gerenciador de versões (nvm, fnm) a usar `sudo`. |
