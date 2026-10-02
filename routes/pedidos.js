const express = require('express');
const router = express.Router();

const db = require('../config/database');

const { validarCampos, validarId } = require('../middleware/validar');

// Criar pedido
router.post(
    '/',
    validarCampos(['cliente_id']),
    async (req, res, next) => {
        try {
            const { cliente_id } = req.body;

            if (!Number.isInteger(Number(cliente_id)) || Number(cliente_id) <= 0) {
                return res.status(400).json({
                    erro: 'cliente_id inválido.'
                });
            }

            const [clientes] = await db.query(
                'SELECT id FROM clientes WHERE id = ?',
                [cliente_id]
            );

            if (clientes.length === 0) {
                return res.status(404).json({
                    erro: 'Cliente não encontrado.'
                });
            }

            const [resultado] = await db.query(
                `INSERT INTO pedidos (cliente_id)
                 VALUES (?)`,
                [cliente_id]
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

        const statusPermitidos = [
            'pendente',
            'pago',
            'cancelado'
        ];

        if (!statusPermitidos.includes(status)) {
            return res.status(400).json({
                erro: 'Status inválido. Use: pendente, pago ou cancelado.'
            });
        }

        const [resultado] = await db.query(
            `UPDATE pedidos
             SET status = ?
             WHERE id = ?`,
            [status, req.params.id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Pedido não encontrado.'
            });
        }

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
        const connection = await db.getConnection();

        try {
            const { produto_id, quantidade } = req.body;

            if (
                !Number.isInteger(Number(produto_id)) ||
                Number(produto_id) <= 0
            ) {
                return res.status(400).json({
                    erro: 'produto_id inválido.'
                });
            }

            if (
                !Number.isInteger(Number(quantidade)) ||
                Number(quantidade) <= 0
            ) {
                return res.status(400).json({
                    erro: 'A quantidade deve ser um número inteiro maior que zero.'
                });
            }

            const [pedidos] = await connection.query(
                'SELECT id, status FROM pedidos WHERE id = ?',
                [req.params.id]
            );

            if (pedidos.length === 0) {
                return res.status(404).json({
                    erro: 'Pedido não encontrado.'
                });
            }

            if (pedidos[0].status === 'cancelado') {
                return res.status(400).json({
                    erro: 'Não é possível adicionar itens a um pedido cancelado.'
                });
            }

            const [produtos] = await connection.query(
                `SELECT id, preco, estoque
                 FROM produtos
                 WHERE id = ?`,
                [produto_id]
            );

            if (produtos.length === 0) {
                return res.status(404).json({
                    erro: 'Produto não encontrado.'
                });
            }

            const produto = produtos[0];

            if (produto.estoque < Number(quantidade)) {
                return res.status(400).json({
                    erro: 'Estoque insuficiente.'
                });
            }

            await connection.beginTransaction();

            await connection.query(
                `INSERT INTO itens_pedido
                 (pedido_id, produto_id, quantidade, preco_unitario)
                 VALUES (?, ?, ?, ?)`,
                [
                    req.params.id,
                    produto_id,
                    quantidade,
                    produto.preco
                ]
            );

            await connection.query(
                `UPDATE produtos
                 SET estoque = estoque - ?
                 WHERE id = ?`,
                [quantidade, produto_id]
            );

            const [total] = await connection.query(
                `SELECT COALESCE(
                    SUM(quantidade * preco_unitario),
                    0
                 ) AS valor_total
                 FROM itens_pedido
                 WHERE pedido_id = ?`,
                [req.params.id]
            );

            await connection.query(
                `UPDATE pedidos
                 SET valor_total = ?
                 WHERE id = ?`,
                [total[0].valor_total, req.params.id]
            );

            await connection.commit();

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
                [req.params.id]
            );

            res.status(201).json({
                mensagem: 'Item adicionado ao pedido com sucesso.',
                valor_total: total[0].valor_total,
                itens
            });
        } catch (err) {
            await connection.rollback();
            next(err);
        } finally {
            connection.release();
        }
    }
);

// Remover item do pedido
router.delete(
    '/:id_pedido/itens/:id_item',
    async (req, res, next) => {
        const connection = await db.getConnection();

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

            const [itens] = await connection.query(
                `SELECT
                    id,
                    pedido_id,
                    produto_id,
                    quantidade
                 FROM itens_pedido
                 WHERE id = ? AND pedido_id = ?`,
                [itemId, pedidoId]
            );

            if (itens.length === 0) {
                return res.status(404).json({
                    erro: 'Item não encontrado nesse pedido.'
                });
            }

            const item = itens[0];

            await connection.beginTransaction();

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

            res.status(200).json({
                mensagem: 'Item removido do pedido com sucesso.',
                valor_total: total[0].valor_total
            });
        } catch (err) {
            await connection.rollback();
            next(err);
        } finally {
            connection.release();
        }
    }
);

module.exports = router;