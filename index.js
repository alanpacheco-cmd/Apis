const express = require('express');
require('dotenv').config();

const clientesRoutes = require('./routes/clientes');
const produtosRoutes = require('./routes/produtos');
const usuariosRoutes = require('./routes/usuarios');
const pedidosRoutes = require('./routes/pedidos');

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.use('/clientes', clientesRoutes);
app.use('/produtos', produtosRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/pedidos', pedidosRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});