const express = require('express');
const router = express.Router();

const db = require('../config/database');

const { validarCampos, validarId } = require('../middleware/validar');

// Listar todos os produtos
router.get('/', async (req, res, next) => {
    try {
        const [produtos] = await db.query(
            'SELECT id, nome, descricao, preco, estoque, criado_em FROM produtos ORDER BY id'
        );

        res.status(200).json(produtos);
    } catch (err) {
        next(err);
    }
});

// Buscar produto pelo ID
router.get('/:id', validarId, async (req, res, next) => {
    try {
        const [produtos] = await db.query(
            `SELECT id, nome, descricao, preco, estoque, criado_em
             FROM produtos
             WHERE id = ?`,
            [req.params.id]
        );

        if (produtos.length === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado.'
            });
        }

        res.status(200).json(produtos[0]);
    } catch (err) {
        next(err);
    }
});

// Cadastrar produto
router.post(
    '/',
    validarCampos(['nome', 'preco', 'estoque']),
    async (req, res, next) => {
        try {
            const { nome, descricao, preco, estoque } = req.body;

            const precoNumero = Number(preco);
            const estoqueNumero = Number(estoque);

            if (
                !Number.isFinite(precoNumero) ||
                precoNumero < 0
            ) {
                return res.status(400).json({
                    erro: 'O preço deve ser um número válido maior ou igual a zero.'
                });
            }

            if (
                !Number.isInteger(estoqueNumero) ||
                estoqueNumero < 0
            ) {
                return res.status(400).json({
                    erro: 'O estoque deve ser um número inteiro maior ou igual a zero.'
                });
            }

            const [resultado] = await db.query(
                `INSERT INTO produtos
                (nome, descricao, preco, estoque)
                VALUES (?, ?, ?, ?)`,
                [
                    nome,
                    descricao || null,
                    precoNumero,
                    estoqueNumero
                ]
            );

            const [produtos] = await db.query(
                `SELECT id, nome, descricao, preco, estoque, criado_em
                 FROM produtos
                 WHERE id = ?`,
                [resultado.insertId]
            );

            res.status(201).json(produtos[0]);
        } catch (err) {
            next(err);
        }
    }
);

// Atualizar produto
router.put(
    '/:id',
    validarId,
    validarCampos(['nome', 'preco', 'estoque']),
    async (req, res, next) => {
        try {
            const { nome, descricao, preco, estoque } = req.body;

            const precoNumero = Number(preco);
            const estoqueNumero = Number(estoque);

            if (
                !Number.isFinite(precoNumero) ||
                precoNumero < 0
            ) {
                return res.status(400).json({
                    erro: 'O preço deve ser um número válido maior ou igual a zero.'
                });
            }

            if (
                !Number.isInteger(estoqueNumero) ||
                estoqueNumero < 0
            ) {
                return res.status(400).json({
                    erro: 'O estoque deve ser um número inteiro maior ou igual a zero.'
                });
            }

            const [resultado] = await db.query(
                `UPDATE produtos
                 SET nome = ?, descricao = ?, preco = ?, estoque = ?
                 WHERE id = ?`,
                [
                    nome,
                    descricao || null,
                    precoNumero,
                    estoqueNumero,
                    req.params.id
                ]
            );

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    erro: 'Produto não encontrado.'
                });
            }

            const [produtos] = await db.query(
                `SELECT id, nome, descricao, preco, estoque, criado_em
                 FROM produtos
                 WHERE id = ?`,
                [req.params.id]
            );

            res.status(200).json(produtos[0]);
        } catch (err) {
            next(err);
        }
    }
);

// Atualização parcial
router.patch('/:id', validarId, async (req, res, next) => {
    try {
        const camposPermitidos = [
            'nome',
            'descricao',
            'preco',
            'estoque'
        ];

        const campos = [];
        const valores = [];

        for (const campo of camposPermitidos) {
            if (req.body[campo] !== undefined) {
                campos.push(`${campo} = ?`);
                valores.push(req.body[campo]);
            }
        }

        if (campos.length === 0) {
            return res.status(400).json({
                erro: 'Informe pelo menos um campo para atualizar.'
            });
        }

        if (req.body.preco !== undefined) {
            const precoNumero = Number(req.body.preco);

            if (
                !Number.isFinite(precoNumero) ||
                precoNumero < 0
            ) {
                return res.status(400).json({
                    erro: 'O preço deve ser um número válido maior ou igual a zero.'
                });
            }

            valores[
                campos.indexOf('preco = ?')
            ] = precoNumero;
        }

        if (req.body.estoque !== undefined) {
            const estoqueNumero = Number(req.body.estoque);

            if (
                !Number.isInteger(estoqueNumero) ||
                estoqueNumero < 0
            ) {
                return res.status(400).json({
                    erro: 'O estoque deve ser um número inteiro maior ou igual a zero.'
                });
            }

            valores[
                campos.indexOf('estoque = ?')
            ] = estoqueNumero;
        }

        valores.push(req.params.id);

        const [resultado] = await db.query(
            `UPDATE produtos
             SET ${campos.join(', ')}
             WHERE id = ?`,
            valores
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado.'
            });
        }

        const [produtos] = await db.query(
            `SELECT id, nome, descricao, preco, estoque, criado_em
             FROM produtos
             WHERE id = ?`,
            [req.params.id]
        );

        res.status(200).json(produtos[0]);
    } catch (err) {
        next(err);
    }
});

// Excluir produto
router.delete('/:id', validarId, async (req, res, next) => {
    try {
        const [resultado] = await db.query(
            'DELETE FROM produtos WHERE id = ?',
            [req.params.id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado.'
            });
        }

        res.status(200).json({
            mensagem: 'Produto excluído com sucesso.'
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;