# GoLedger Challenge Web - React/Next.js

Este repositório contém a solução para o desafio front-end da GoLedger, implementando um catálogo de séries integrado à rede blockchain fornecida.

## 🏗️ Decisões de Arquitetura

Para garantir a segurança das credenciais (Basic Auth) e lidar com os tempos de resposta da blockchain, optei por não fazer chamadas diretas do navegador.
Utilizei o **Next.js (App Router)** para construir um **BFF (Backend For Frontend)**.

- O frontend (React Client Components) utiliza **SWR** para chamadas otimistas, cache state e revalidação.
- O backend (`app/api/...`) lida com a injeção do Basic Auth, mascara os dados sensíveis e gerencia o tratamento de erros profundos (erros lógicos da blockchain disfarçados de HTTP 200).
- **Tailwind CSS** para estilização utilitária e responsiva sem dependências pesadas de UI.

## 🚀 Como Executar Localmente

1. Instale as dependências:
   \`\`\`bash
   npm install
   \`\`\`

2. **Crucial:** Crie um arquivo `.env.local` na raiz do projeto e insira as credenciais fornecidas por e-mail:
   \`\`\`env
   GOLEDGER_USER=seu_usuario_aqui
   GOLEDGER_PASS=sua_senha_aqui
   \`\`\`

3. Inicie o servidor de desenvolvimento:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Acesse `http://localhost:3000` no seu navegador.
