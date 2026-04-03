# Mini Controle de Ponto (Time Tracking System)

Bem-vindo ao **Mini Controle de Ponto**, uma aplicação web focada em agilizar o seu controle de horas trabalhadas de forma intuitiva, robusta e com um visual moderno e "Cyber/Hacker". O sistema substitui as antigas planilhas de Excel por uma interface rica, mantendo a capacidade de importar e exportar os dados facilmente.

## 🚀 Tecnologias Utilizadas

O projeto possui uma arquitetura moderna dividida em back-end e front-end, tudo containerizado com Docker.

- **Front-end**: React 19, Vite, Recharts (para gráficos e relatórios anuais), Date-fns e componentes modernos de UI.
- **Back-end**: Node.js com Express, Multer e ExcelJS (para leitura e criação de planilhas).
- **Banco de Dados**: PostgreSQL.
- **Infraestrutura**: Docker & Docker Compose.

---

## 🛠️ Passo a Passo para Instalar e Rodar o Projeto

A maneira mais fácil e recomendada de rodar a aplicação em qualquer computador é usando o Docker. Dessa forma, você não precisa instalar o PostgreSQL ou o Node.js manualmente.

### Pré-requisitos
- Ter o **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** instalado na sua máquina.
- Ter o **[Git](https://git-scm.com/downloads)** instalado.

### 1. Clonando o repositório
Primeiro, baixe o projeto para a sua máquina:
```bash
git clone https://github.com/WillyWonca/MiniControlePonto.git
cd MiniControlePonto
```

### 2. Rodando tudo com Docker (Recomendado)
Com o Docker aberto no seu computador, rode este comando na raiz do projeto:

```bash
docker-compose up --build
```
> **Nota**: Na primeira vez, este comando pode demorar um pouquinho, pois ele vai baixar as imagens do Banco de Dados, do Node.js e instalar todas as dependências automaticamente.

### 3. Acessando a Aplicação
Pronto! Quando o terminal parar de carregar os logs, o sistema estará rodando. Basta acessar as seguintes URLs no seu navegador:

- **Interface da Aplicação (Front-end):** [http://localhost:5173](http://localhost:5173)
- **API (Back-end) operando na porta:** [http://localhost:3001](http://localhost:3001)

---

## 💻 Como rodar o projeto manualmente (Sem Docker)

Caso queira rodar o projeto de forma manual (ideal se você for trabalhar ativamente desenvolvendo o código):

**1. Suba apenas o Banco de Dados:**
```bash
docker-compose up postgres -d
```

**2. Rode o Back-end (API):**
```bash
cd backend
npm install
node index.js
```

**3. Em outro terminal, rode o Front-end:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Visão Geral e Estrutura de Pastas

- `/frontend` - Todo o código visual (Páginas, Gráficos, Inputs). Rodando em porta `5173`.
- `/backend` - Lógica de API, processamento de relatórios em Excel, banco de dados.
- `docker-compose.yml` - Arquivo de configuração que orquestra e inicializa o nosso ambiente perfeitamente sincronizado.
- `init.sql` - Arquivo que inicializa a estrutura (tabelas) do banco de dados na primeira execução.

## ✨ Principais Funcionalidades

- Registro visual de horas de trabalho.
- Relatórios avançados mensais/anuais.
- Importação rápida de planilhas Excel para dentro do sistema.
- Tema escuro e profissional imersivo.

---
_Desenvolvido por **Willy Wonca** para otimizar controles de horas de forma prática!_
