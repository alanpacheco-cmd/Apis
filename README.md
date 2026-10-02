# Sistema de Gerenciamento de Vendas

API desenvolvida em Node.js, Express e MySQL para gerenciamento de clientes, produtos, usuários e pedidos.

## Tecnologias utilizadas

- Node.js
- Express
- MySQL
- mysql2
- dotenv
- bcryptjs

## Estrutura do projeto

```text
APIS/
├── config/
│   └── database.js
├── middleware/
│   ├── errorHandler.js
│   └── validar.js
├── routes/
│   ├── clientes.js
│   ├── produtos.js
│   ├── usuarios.js
│   └── pedidos.js
├── postman/
│   └── Sistema-Clientes.postman_collection.json
├── .env
├── .env.example
├── .gitignore
├── index.js
├── package.json
├── package-lock.json
├── README.md
└── script_banco.sql