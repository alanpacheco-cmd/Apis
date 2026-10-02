const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

const db = require('../config/database');

const { validarCampos, validarId } = require('../middleware/validar');

// Listar usuários
router.get('/', async (req, res, next) => {
    try {
        const [usuarios] = await db.query(
            `SELECT id, nome, email, perfil, status, criado_em
             FROM usuarios
             ORDER BY id`
        );

        res.status(200).json(usuarios);
    } catch (err) {
        next(err);
    }
});

// Buscar usuário pelo ID
router.get('/:id', validarId, async (req, res, next) => {
    try {
        const [usuarios] = await db.query(
            `SELECT id, nome, email, perfil, status, criado_em
             FROM usuarios
             WHERE id = ?`,
            [req.params.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                erro: 'Usuário não encontrado.'
            });
        }

        res.status(200).json(usuarios[0]);
    } catch (err) {
        next(err);
    }
});

// Cadastrar usuário
router.post(
    '/',
    validarCampos(['nome', 'email', 'senha']),
    async (req, res, next) => {
        try {
            const {
                nome,
                email,
                senha,
                perfil,
                status
            } = req.body;

            if (senha.length < 6) {
                return res.status(400).json({
                    erro: 'A senha deve possuir pelo menos 6 caracteres.'
                });
            }

            const senhaHash = await bcrypt.hash(senha, 10);

            const [resultado] = await db.query(
                `INSERT INTO usuarios
                (nome, email, senha, perfil, status)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    nome,
                    email,
                    senhaHash,
                    perfil || 'operador',
                    status || 'ativo'
                ]
            );

            const [usuarios] = await db.query(
                `SELECT id, nome, email, perfil, status, criado_em
                 FROM usuarios
                 WHERE id = ?`,
                [resultado.insertId]
            );

            res.status(201).json(usuarios[0]);
        } catch (err) {
            next(err);
        }
    }
);

// Atualizar usuário
router.put(
    '/:id',
    validarId,
    validarCampos(['nome', 'email', 'senha']),
    async (req, res, next) => {
        try {
            const {
                nome,
                email,
                senha,
                perfil,
                status
            } = req.body;

            if (senha.length < 6) {
                return res.status(400).json({
                    erro: 'A senha deve possuir pelo menos 6 caracteres.'
                });
            }

            const senhaHash = await bcrypt.hash(senha, 10);

            const [resultado] = await db.query(
                `UPDATE usuarios
                 SET nome = ?, email = ?, senha = ?, perfil = ?, status = ?
                 WHERE id = ?`,
                [
                    nome,
                    email,
                    senhaHash,
                    perfil || 'operador',
                    status || 'ativo',
                    req.params.id
                ]
            );

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    erro: 'Usuário não encontrado.'
                });
            }

            const [usuarios] = await db.query(
                `SELECT id, nome, email, perfil, status, criado_em
                 FROM usuarios
                 WHERE id = ?`,
                [req.params.id]
            );

            res.status(200).json(usuarios[0]);
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
            'senha',
            'perfil',
            'status'
        ];

        const campos = [];
        const valores = [];

        for (const campo of camposPermitidos) {
            if (req.body[campo] !== undefined) {
                campos.push(`${campo} = ?`);

                if (campo === 'senha') {
                    if (req.body[campo].length < 6) {
                        return res.status(400).json({
                            erro: 'A senha deve possuir pelo menos 6 caracteres.'
                        });
                    }

                    const senhaHash = await bcrypt.hash(
                        req.body[campo],
                        10
                    );

                    valores.push(senhaHash);
                } else {
                    valores.push(req.body[campo]);
                }
            }
        }

        if (campos.length === 0) {
            return res.status(400).json({
                erro: 'Informe pelo menos um campo para atualizar.'
            });
        }

        valores.push(req.params.id);

        const [resultado] = await db.query(
            `UPDATE usuarios
             SET ${campos.join(', ')}
             WHERE id = ?`,
            valores
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Usuário não encontrado.'
            });
        }

        const [usuarios] = await db.query(
            `SELECT id, nome, email, perfil, status, criado_em
             FROM usuarios
             WHERE id = ?`,
            [req.params.id]
        );

        res.status(200).json(usuarios[0]);
    } catch (err) {
        next(err);
    }
});

// Excluir usuário
router.delete('/:id', validarId, async (req, res, next) => {
    try {
        const [resultado] = await db.query(
            'DELETE FROM usuarios WHERE id = ?',
            [req.params.id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Usuário não encontrado.'
            });
        }

        res.status(200).json({
            mensagem: 'Usuário excluído com sucesso.'
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;