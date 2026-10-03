const express = require('express');

const router = express.Router();

const db = require('../config/database');

const { validarCampos, validarId } = require('../middleware/validar');

const statusPermitidos = [
    'pendente',
    'pago',
    'cancelado'
];

// Criar pedido
router.post(
    '/',
    validarCampos(['cliente_id']),
    async (req, res, next) => {
        try {
            const clienteId = Number(req.body.cliente_id);

            if (
                !Number.isInteger(clienteId) ||
                clienteId <= 0
            ) {
                return res.status(400).json({
                    erro: 'cliente_id inválido.'
                });
            }

            const [clientes] = await db.query(
                'SELECT id FROM clientes WHERE id = ?',
                [clienteId]
            );

            if (clientes.length === 0) {
                return res.status(404).json({
                    erro: 'Cliente não encontrado.'
                });
            }

            const [resultado] = await db.query(
                `INSERT INTO pedidos
                 (cliente_id)
                 VALUES (?)`,
                [clienteId]
            );

            const [pedidos] = await db.query(
                `SELECT
                    p.id,
                    p.cliente_id,
                    c.nome AS cliente,
                    p.data_pedido,
                    p.status,
                    p.valor_total
                 FROM pedidos p
                 INNER JOIN clientes c ON c.id = p.cliente_id
                 WHERE p.id = ?`,
                [resultado.insertId]
            );

            res.status(201).json(pedidos[0]);
        } catch (err) {
            next(err);
        }
    }
);

// Listar pedidos
router.get('/', async (req, res, next) => {
    try {
        const [pedidos] = await db.query(
            `SELECT
                p.id,
                p.cliente_id,
                c.nome AS cliente,
                p.data_pedido,
                p.status,
                p.valor_total
             FROM pedidos p
             INNER JOIN clientes c ON c.id = p.cliente_id
             ORDER BY p.id`
        );

        res.status(200).json(pedidos);
    } catch (err) {
        next(err);
    }
});

// Buscar pedido pelo ID com seus itens
router.get('/:id', validarId, async (req, res, next) => {
    try {
        const [pedidos] = await db.query(
            `SELECT
                p.id,
                p.cliente_id,
                c.nome AS cliente,
                p.data_pedido,
                p.status,
                p.valor_total
             FROM pedidos p
             INNER JOIN clientes c ON c.id = p.cliente_id
             WHERE p.id = ?`,
            [req.params.id]
        );

        if (pedidos.length === 0) {
            return res.status(404).json({
                erro: 'Pedido não encontrado.'
            });
        }

        const [itens] = await db.query(
            `SELECT
                i.id,
                i.pedido_id,
                i.produto_id,
                pr.nome AS produto,
                i.quantidade,
                i.preco_unitario,
                (i.quantidade * i.preco_unitario) AS subtotal
             FROM itens_pedido i
             INNER JOIN produtos pr ON pr.id = i.produto_id
             WHERE i.pedido_id = ?
             ORDER BY i.id`,
            [req.params.id]
        );

        res.status(200).json({
            ...pedidos[0],
            itens
        });
    } catch (err) {
        next(err);
    }
});

// Alterar status do pedido
router.patch('/:id/status', validarId, async (req, res, next) => {
    try {
        const { status } = req.body;

        if (!statusPermitidos.includes(status)) {
            return res.status(400).json({
                erro: 'Status inválido. Use: pendente, pago ou cancelado.'
            });
        }

        const [existente] = await db.query(
            'SELECT id FROM pedidos WHERE id = ?',
            [req.params.id]
        );

        if (existente.length === 0) {
            return res.status(404).json({
                erro: 'Pedido não encontrado.'
            });
        }

        await db.query(
            `UPDATE pedidos
             SET status = ?
             WHERE id = ?`,
            [status, req.params.id]
        );

        const [pedidos] = await db.query(
            `SELECT
                p.id,
                p.cliente_id,
                c.nome AS cliente,
                p.data_pedido,
                p.status,
                p.valor_total
             FROM pedidos p
             INNER JOIN clientes c ON c.id = p.cliente_id
             WHERE p.id = ?`,
            [req.params.id]
        );

        res.status(200).json(pedidos[0]);
    } catch (err) {
        next(err);
    }
});

// Adicionar item ao pedido
router.post(
    '/:id/itens',
    validarId,
    validarCampos(['produto_id', 'quantidade']),
    async (req, res, next) => {
        let connection;
        let transactionStarted = false;

        try {
            const pedidoId = Number(req.params.id);
            const produtoId = Number(req.body.produto_id);
            const quantidade = Number(req.body.quantidade);

            if (
                !Number.isInteger(produtoId) ||
                produtoId <= 0
            ) {
                return res.status(400).json({
                    erro: 'produto_id inválido.'
                });
            }

            if (
                !Number.isInteger(quantidade) ||
                quantidade <= 0
            ) {
                return res.status(400).json({
                    erro: 'A quantidade deve ser um número inteiro maior que zero.'
                });
            }

            connection = await db.getConnection();

            await connection.beginTransaction();
            transactionStarted = true;

            const [pedidos] = await connection.query(
                `SELECT id, status
                 FROM pedidos
                 WHERE id = ?
                 FOR UPDATE`,
                [pedidoId]
            );

            if (pedidos.length === 0) {
                await connection.rollback();
                transactionStarted = false;

                return res.status(404).json({
                    erro: 'Pedido não encontrado.'
                });
            }

            if (pedidos[0].status === 'cancelado') {
                await connection.rollback();
                transactionStarted = false;

                return res.status(400).json({
                    erro: 'Não é possível adicionar itens a um pedido cancelado.'
                });
            }

            const [produtos] = await connection.query(
                `SELECT id, preco, estoque
                 FROM produtos
                 WHERE id = ?
                 FOR UPDATE`,
                [produtoId]
            );

            if (produtos.length === 0) {
                await connection.rollback();
                transactionStarted = false;

                return res.status(404).json({
                    erro: 'Produto não encontrado.'
                });
            }

            const produto = produtos[0];

            if (produto.estoque < quantidade) {
                await connection.rollback();
                transactionStarted = false;

                return res.status(400).json({
                    erro: 'Estoque insuficiente.'
                });
            }

            await connection.query(
                `INSERT INTO itens_pedido
                 (pedido_id, produto_id, quantidade, preco_unitario)
                 VALUES (?, ?, ?, ?)`,
                [
                    pedidoId,
                    produtoId,
                    quantidade,
                    produto.preco
                ]
            );

            await connection.query(
                `UPDATE produtos
                 SET estoque = estoque - ?
                 WHERE id = ?`,
                [quantidade, produtoId]
            );

            const [total] = await connection.query(
                `SELECT COALESCE(
                    SUM(quantidade * preco_unitario),
                    0
                 ) AS valor_total
                 FROM itens_pedido
                 WHERE pedido_id = ?`,
                [pedidoId]
            );

            await connection.query(
                `UPDATE pedidos
                 SET valor_total = ?
                 WHERE id = ?`,
                [total[0].valor_total, pedidoId]
            );

            await connection.commit();
            transactionStarted = false;

            const [itens] = await connection.query(
                `SELECT
                    i.id,
                    i.pedido_id,
                    i.produto_id,
                    pr.nome AS produto,
                    i.quantidade,
                    i.preco_unitario,
                    (i.quantidade * i.preco_unitario) AS subtotal
                 FROM itens_pedido i
                 INNER JOIN produtos pr ON pr.id = i.produto_id
                 WHERE i.pedido_id = ?
                 ORDER BY i.id`,
                [pedidoId]
            );

            res.status(201).json({
                mensagem: 'Item adicionado ao pedido com sucesso.',
                valor_total: total[0].valor_total,
                itens
            });
        } catch (err) {
            if (connection && transactionStarted) {
                await connection.rollback();
            }

            next(err);
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
);

// Remover item do pedido
router.delete(
    '/:id_pedido/itens/:id_item',
    async (req, res, next) => {
        let connection;
        let transactionStarted = false;

        try {
            const pedidoId = Number(req.params.id_pedido);
            const itemId = Number(req.params.id_item);

            if (
                !Number.isInteger(pedidoId) ||
                pedidoId <= 0 ||
                !Number.isInteger(itemId) ||
                itemId <= 0
            ) {
                return res.status(400).json({
                    erro: 'ID do pedido ou do item inválido.'
                });
            }

            connection = await db.getConnection();

            await connection.beginTransaction();
            transactionStarted = true;

            const [pedidos] = await connection.query(
                `SELECT id, status
                 FROM pedidos
                 WHERE id = ?
                 FOR UPDATE`,
                [pedidoId]
            );

            if (pedidos.length === 0) {
                await connection.rollback();
                transactionStarted = false;

                return res.status(404).json({
                    erro: 'Pedido não encontrado.'
                });
            }

            const [itens] = await connection.query(
                `SELECT
                    id,
                    pedido_id,
                    produto_id,
                    quantidade
                 FROM itens_pedido
                 WHERE id = ? AND pedido_id = ?
                 FOR UPDATE`,
                [itemId, pedidoId]
            );

            if (itens.length === 0) {
                await connection.rollback();
                transactionStarted = false;

                return res.status(404).json({
                    erro: 'Item não encontrado nesse pedido.'
                });
            }

            const item = itens[0];

            const [produtos] = await connection.query(
                `SELECT id
                 FROM produtos
                 WHERE id = ?
                 FOR UPDATE`,
                [item.produto_id]
            );

            if (produtos.length === 0) {
                await connection.rollback();
                transactionStarted = false;

                return res.status(404).json({
                    erro: 'Produto relacionado ao item não encontrado.'
                });
            }

            await connection.query(
                `UPDATE produtos
                 SET estoque = estoque + ?
                 WHERE id = ?`,
                [item.quantidade, item.produto_id]
            );

            await connection.query(
                `DELETE FROM itens_pedido
                 WHERE id = ? AND pedido_id = ?`,
                [itemId, pedidoId]
            );

            const [total] = await connection.query(
                `SELECT COALESCE(
                    SUM(quantidade * preco_unitario),
                    0
                 ) AS valor_total
                 FROM itens_pedido
                 WHERE pedido_id = ?`,
                [pedidoId]
            );

            await connection.query(
                `UPDATE pedidos
                 SET valor_total = ?
                 WHERE id = ?`,
                [total[0].valor_total, pedidoId]
            );

            await connection.commit();
            transactionStarted = false;

            res.status(200).json({
                mensagem: 'Item removido do pedido com sucesso.',
                valor_total: total[0].valor_total
            });
        } catch (err) {
            if (connection && transactionStarted) {
                await connection.rollback();
            }

            next(err);
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
);

module.exports = router;