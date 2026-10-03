const express = require('express');
require('dotenv').config();

const clientesRoutes = require('./routes/clientes');
const produtosRoutes = require('./routes/produtos');
const usuariosRoutes = require('./routes/usuarios');
const pedidosRoutes = require('./routes/pedidos');

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

// Rota inicial
app.get('/', (req, res) => {
    res.status(200).json({
        mensagem: 'API Sistema de Gerenciamento de Vendas funcionando.'
    });
});

// Rotas da API
app.use('/clientes', clientesRoutes);
app.use('/produtos', produtosRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/pedidos', pedidosRoutes);

// Tratamento de JSON inválido
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            erro: 'JSON inválido.'
        });
    }

    next(err);
});

// Tratamento geral de erros
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});