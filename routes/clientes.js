const express = require('express');
const router = express.Router();

const db = require('../config/database');

const { validarCampos, validarId } = require('../middleware/validar');

// Listar todos os clientes
router.get('/', async (req, res, next) => {
    try {
        const [clientes] = await db.query(
            `SELECT id, nome, email, telefone, criado_em
             FROM clientes
             ORDER BY id`
        );

        res.status(200).json(clientes);
    } catch (err) {
        next(err);
    }
});

// Buscar cliente pelo ID
router.get('/:id', validarId, async (req, res, next) => {
    try {
        const [clientes] = await db.query(
            `SELECT id, nome, email, telefone, criado_em
             FROM clientes
             WHERE id = ?`,
            [req.params.id]
        );

        if (clientes.length === 0) {
            return res.status(404).json({
                erro: 'Cliente não encontrado.'
            });
        }

        res.status(200).json(clientes[0]);
    } catch (err) {
        next(err);
    }
});

// Cadastrar cliente
router.post(
    '/',
    validarCampos(['nome', 'email']),
    async (req, res, next) => {
        try {
            const { nome, email, telefone } = req.body;

            const [resultado] = await db.query(
                `INSERT INTO clientes
                (nome, email, telefone)
                VALUES (?, ?, ?)`,
                [
                    nome.trim(),
                    email.trim(),
                    telefone ? telefone.trim() : null
                ]
            );

            const [clientes] = await db.query(
                `SELECT id, nome, email, telefone, criado_em
                 FROM clientes
                 WHERE id = ?`,
                [resultado.insertId]
            );

            res.status(201).json(clientes[0]);
        } catch (err) {
            next(err);
        }
    }
);

// Atualizar cliente
router.put(
    '/:id',
    validarId,
    validarCampos(['nome', 'email']),
    async (req, res, next) => {
        try {
            const { nome, email, telefone } = req.body;

            const [resultado] = await db.query(
                `UPDATE clientes
                 SET nome = ?, email = ?, telefone = ?
                 WHERE id = ?`,
                [
                    nome.trim(),
                    email.trim(),
                    telefone ? telefone.trim() : null,
                    req.params.id
                ]
            );

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    erro: 'Cliente não encontrado.'
                });
            }

            const [clientes] = await db.query(
                `SELECT id, nome, email, telefone, criado_em
                 FROM clientes
                 WHERE id = ?`,
                [req.params.id]
            );

            res.status(200).json(clientes[0]);
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
            'email',
            'telefone'
        ];

        const campos = [];
        const valores = [];

        for (const campo of camposPermitidos) {
            if (req.body[campo] !== undefined) {
                let valor = req.body[campo];

                if (
                    typeof valor === 'string' &&
                    valor.trim() === ''
                ) {
                    return res.status(400).json({
                        erro: `O campo '${campo}' não pode ficar vazio.`
                    });
                }

                if (typeof valor === 'string') {
                    valor = valor.trim();
                }

                campos.push(`${campo} = ?`);
                valores.push(valor);
            }
        }

        if (campos.length === 0) {
            return res.status(400).json({
                erro: 'Informe pelo menos um campo para atualizar.'
            });
        }

        valores.push(req.params.id);

        const [resultado] = await db.query(
            `UPDATE clientes
             SET ${campos.join(', ')}
             WHERE id = ?`,
            valores
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Cliente não encontrado.'
            });
        }

        const [clientes] = await db.query(
            `SELECT id, nome, email, telefone, criado_em
             FROM clientes
             WHERE id = ?`,
            [req.params.id]
        );

        res.status(200).json(clientes[0]);
    } catch (err) {
        next(err);
    }
});

// Excluir cliente
router.delete('/:id', validarId, async (req, res, next) => {
    try {
        const [resultado] = await db.query(
            'DELETE FROM clientes WHERE id = ?',
            [req.params.id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Cliente não encontrado.'
            });
        }

        res.status(200).json({
            mensagem: 'Cliente excluído com sucesso.'
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;