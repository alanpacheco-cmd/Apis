const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

const db = require('../config/database');

const { validarCampos, validarId } = require('../middleware/validar');

const perfisPermitidos = [
    'admin',
    'operador'
];

const statusPermitidos = [
    'ativo',
    'inativo'
];

function validarDadosUsuario(nome, email, senha, perfil, status) {
    if (
        typeof nome !== 'string' ||
        nome.trim() === ''
    ) {
        return 'O nome do usuário é obrigatório.';
    }

    if (
        typeof email !== 'string' ||
        email.trim() === ''
    ) {
        return 'O e-mail do usuário é obrigatório.';
    }

    if (
        senha !== undefined &&
        (
            typeof senha !== 'string' ||
            senha.length < 6
        )
    ) {
        return 'A senha deve possuir pelo menos 6 caracteres.';
    }

    if (
        perfil !== undefined &&
        !perfisPermitidos.includes(perfil)
    ) {
        return 'Perfil inválido. Use: admin ou operador.';
    }

    if (
        status !== undefined &&
        !statusPermitidos.includes(status)
    ) {
        return 'Status inválido. Use: ativo ou inativo.';
    }

    return null;
}

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
            let {
                nome,
                email,
                senha,
                perfil,
                status
            } = req.body;

            perfil = perfil || 'operador';
            status = status || 'ativo';

            const erro = validarDadosUsuario(
                nome,
                email,
                senha,
                perfil,
                status
            );

            if (erro) {
                return res.status(400).json({
                    erro
                });
            }

            nome = nome.trim();
            email = email.trim();

            const senhaHash = await bcrypt.hash(senha, 10);

            const [resultado] = await db.query(
                `INSERT INTO usuarios
                (nome, email, senha, perfil, status)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    nome,
                    email,
                    senhaHash,
                    perfil,
                    status
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
            let {
                nome,
                email,
                senha,
                perfil,
                status
            } = req.body;

            perfil = perfil || 'operador';
            status = status || 'ativo';

            const erro = validarDadosUsuario(
                nome,
                email,
                senha,
                perfil,
                status
            );

            if (erro) {
                return res.status(400).json({
                    erro
                });
            }

            const [existente] = await db.query(
                'SELECT id FROM usuarios WHERE id = ?',
                [req.params.id]
            );

            if (existente.length === 0) {
                return res.status(404).json({
                    erro: 'Usuário não encontrado.'
                });
            }

            nome = nome.trim();
            email = email.trim();

            const senhaHash = await bcrypt.hash(senha, 10);

            await db.query(
                `UPDATE usuarios
                 SET nome = ?, email = ?, senha = ?, perfil = ?, status = ?
                 WHERE id = ?`,
                [
                    nome,
                    email,
                    senhaHash,
                    perfil,
                    status,
                    req.params.id
                ]
            );

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

        const [existente] = await db.query(
            'SELECT id FROM usuarios WHERE id = ?',
            [req.params.id]
        );

        if (existente.length === 0) {
            return res.status(404).json({
                erro: 'Usuário não encontrado.'
            });
        }

        for (const campo of camposPermitidos) {
            if (req.body[campo] !== undefined) {
                let valor = req.body[campo];

                if (
                    (campo === 'nome' || campo === 'email') &&
                    (
                        typeof valor !== 'string' ||
                        valor.trim() === ''
                    )
                ) {
                    return res.status(400).json({
                        erro: `O campo '${campo}' não pode ficar vazio.`
                    });
                }

                if (campo === 'senha') {
                    if (
                        typeof valor !== 'string' ||
                        valor.length < 6
                    ) {
                        return res.status(400).json({
                            erro: 'A senha deve possuir pelo menos 6 caracteres.'
                        });
                    }

                    valor = await bcrypt.hash(valor, 10);
                }

                if (
                    campo === 'perfil' &&
                    !perfisPermitidos.includes(valor)
                ) {
                    return res.status(400).json({
                        erro: 'Perfil inválido. Use: admin ou operador.'
                    });
                }

                if (
                    campo === 'status' &&
                    !statusPermitidos.includes(valor)
                ) {
                    return res.status(400).json({
                        erro: 'Status inválido. Use: ativo ou inativo.'
                    });
                }

                if (
                    campo === 'nome' ||
                    campo === 'email'
                ) {
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

        await db.query(
            `UPDATE usuarios
             SET ${campos.join(', ')}
             WHERE id = ?`,
            valores
        );

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