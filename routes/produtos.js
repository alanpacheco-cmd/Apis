const express = require('express');
const router = express.Router();

const db = require('../config/database');

const { validarCampos, validarId } = require('../middleware/validar');

function validarDadosProduto(nome, preco, estoque) {
    if (
        typeof nome !== 'string' ||
        nome.trim() === ''
    ) {
        return 'O nome do produto é obrigatório.';
    }

    const precoNumero = Number(preco);
    const estoqueNumero = Number(estoque);

    if (
        preco === '' ||
        !Number.isFinite(precoNumero) ||
        precoNumero < 0
    ) {
        return 'O preço deve ser um número válido maior ou igual a zero.';
    }

    if (
        estoque === '' ||
        !Number.isInteger(estoqueNumero) ||
        estoqueNumero < 0
    ) {
        return 'O estoque deve ser um número inteiro maior ou igual a zero.';
    }

    return null;
}

// Listar todos os produtos
router.get('/', async (req, res, next) => {
    try {
        const [produtos] = await db.query(
            `SELECT id, nome, descricao, preco, estoque, criado_em
             FROM produtos
             ORDER BY id`
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
            const {
                nome,
                descricao,
                preco,
                estoque
            } = req.body;

            const erro = validarDadosProduto(
                nome,
                preco,
                estoque
            );

            if (erro) {
                return res.status(400).json({
                    erro
                });
            }

            const precoNumero = Number(preco);
            const estoqueNumero = Number(estoque);

            const [resultado] = await db.query(
                `INSERT INTO produtos
                (nome, descricao, preco, estoque)
                VALUES (?, ?, ?, ?)`,
                [
                    nome.trim(),
                    typeof descricao === 'string'
                        ? descricao.trim() || null
                        : null,
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
            const {
                nome,
                descricao,
                preco,
                estoque
            } = req.body;

            const erro = validarDadosProduto(
                nome,
                preco,
                estoque
            );

            if (erro) {
                return res.status(400).json({
                    erro
                });
            }

            const [existente] = await db.query(
                'SELECT id FROM produtos WHERE id = ?',
                [req.params.id]
            );

            if (existente.length === 0) {
                return res.status(404).json({
                    erro: 'Produto não encontrado.'
                });
            }

            const precoNumero = Number(preco);
            const estoqueNumero = Number(estoque);

            await db.query(
                `UPDATE produtos
                 SET nome = ?, descricao = ?, preco = ?, estoque = ?
                 WHERE id = ?`,
                [
                    nome.trim(),
                    typeof descricao === 'string'
                        ? descricao.trim() || null
                        : null,
                    precoNumero,
                    estoqueNumero,
                    req.params.id
                ]
            );

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
                let valor = req.body[campo];

                if (
                    typeof valor === 'string' &&
                    valor.trim() === '' &&
                    campo !== 'descricao'
                ) {
                    return res.status(400).json({
                        erro: `O campo '${campo}' não pode ficar vazio.`
                    });
                }

                if (campo === 'nome') {
                    valor = valor.trim();
                }

                if (campo === 'descricao') {
                    valor = typeof valor === 'string'
                        ? valor.trim() || null
                        : valor;
                }

                if (campo === 'preco') {
                    const precoNumero = Number(valor);

                    if (
                        valor === '' ||
                        !Number.isFinite(precoNumero) ||
                        precoNumero < 0
                    ) {
                        return res.status(400).json({
                            erro: 'O preço deve ser um número válido maior ou igual a zero.'
                        });
                    }

                    valor = precoNumero;
                }

                if (campo === 'estoque') {
                    const estoqueNumero = Number(valor);

                    if (
                        valor === '' ||
                        !Number.isInteger(estoqueNumero) ||
                        estoqueNumero < 0
                    ) {
                        return res.status(400).json({
                            erro: 'O estoque deve ser um número inteiro maior ou igual a zero.'
                        });
                    }

                    valor = estoqueNumero;
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

        const [existente] = await db.query(
            'SELECT id FROM produtos WHERE id = ?',
            [req.params.id]
        );

        if (existente.length === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado.'
            });
        }

        valores.push(req.params.id);

        await db.query(
            `UPDATE produtos
             SET ${campos.join(', ')}
             WHERE id = ?`,
            valores
        );

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