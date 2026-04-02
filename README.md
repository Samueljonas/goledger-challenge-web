# GoLedger Challenge Web 🎬🔗

Uma interface web moderna e descentralizada para um catálogo de obras cinematográficas (Séries, Temporadas, Episódios e Watchlists), integrada diretamente a uma rede Blockchain Hyperledger Fabric.

## 🧠 Decisões de Arquitetura e Engenharia

Este projeto não é apenas um front-end que faz requisições cegas. Ele foi arquitetado para ser seguro, resiliente e lidar com as peculiaridades de uma API de Blockchain.

### 1. Padrão BFF (Backend For Frontend) com Next.js Route Handlers

O navegador do cliente **nunca** fala diretamente com a rede GoLedger.

- **Segurança:** As credenciais de `Basic Auth` vivem exclusivamente no servidor (via variáveis de ambiente) e são injetadas dinamicamente, garantindo que chaves privadas nunca vazem no bundle do cliente.
- **Tradução de Contratos:** Os Route Handlers (`/app/api/...`) formatam os payloads exatos exigidos pelo _chaincode_ (ex: envolver o body em `{ asset: [...] }` ou `{ update: { ... } }`).

### 2. Deep Error Handling (Prevenção de Falsos Positivos)

APIs de blockchain baseadas em Hyperledger frequentemente retornam **HTTP 200 (OK)** apenas para confirmar o recebimento da transação, mesmo que ela falhe na validação do bloco (ex: Conflito de Chave Primária).

- Foi implementado um motor de fetch customizado (`lib/auth.ts`) que intercepta o corpo da resposta, lê ativamente o `responseData.error` e faz o parse seguro (evitando travamentos por retornos JSON vazios). O cliente só recebe "Sucesso" se o bloco foi realmente gravado.

### 3. SWR & Cache State (Client-Side)

O estado do front-end é gerenciado pela biblioteca **SWR**.

- Permite validação em tempo real e re-fetch automático ao focar na tela.
- Mutações otimistas e sincronização instantânea com a UI após interações de CRUD (Create, Read, Update, Delete) bem-sucedidas.

### 4. UI/UX: Vanilla CSS Otimizado

Para garantir a máxima leveza e compatibilidade (zero riscos de quebra de build por dependências de terceiros), o design foi construído em **CSS Puro (Vanilla)** inspirado em padrões Dark Mode de plataformas como GitHub e Vercel. Responsivo, limpo e focado no conteúdo.

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js (App Router)
- **Linguagem:** TypeScript (Tipagem Estrita Ativada)
- **Data Fetching:** SWR (Client) + Fetch API nativa (Server)
- **Estilização:** Vanilla CSS (`globals.css`)
- **Linter:** ESLint (Zero warnings/errors)

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- Node.js (v18 ou superior recomendado)
- NPM ou Yarn

### Passo a Passo

1. **Clone o repositório e entre na pasta:**
   git clone <URL_DO_SEU_FORK>
   cd goledger-challenge-web

2. **Instale as dependências:**
   npm install

3. **Configure as Variáveis de Ambiente:**
   Crie um arquivo chamado `.env.local` na raiz do projeto. **(Obrigatório)**
   Insira as credenciais fornecidas para acesso à rede de testes:
   GOLEDGER_USER=seu_usuario_aqui
   GOLEDGER_PASS=sua_senha_aqui

4. **Inicie o servidor de desenvolvimento:**
   npm run dev

5. **Acesse a aplicação:**
   Abra `http://localhost:3000` no seu navegador.

---

## 📂 Estrutura de Diretórios Principal
- `app/`
  - `api/` (Route Handlers / BFF)
  - `components/`
  - `episodes/`
  - `seasons/`
  - `watchlists/`
  - `globals.css`
  - `layout.tsx`
  - `page.tsx`
- `lib/`
  - `auth.ts`
  - `fetcher.ts`
- `src/`
  - `types/`
    - `index.ts`
---

## 📝 Regras de Negócio e Limitações da Rede (Anotações do Desenvolvedor)

- **Chaves Primárias (isKey):** Em recursos como `tvShows`, o campo `title` atua como ID do ledger. Por arquitetura, ele é imutável após a criação. A interface bloqueia (desabilita) a edição desse campo em operações de `PUT`.
- **Invokes vs Queries:** A leitura de dados na rede usa o endpoint de `/query`, mas todas as mutações (incluindo Deleção e Edição) utilizam `method: 'POST'` apontando para o endpoint de `/invoke`, conforme padrão da Hyperledger Fabric.

---

_Desenvolvido como solução para o desafio técnico GoLedger._
