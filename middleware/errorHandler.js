function errorHandler(err, req, res, next) {
    console.error(err);

    if (err.status) {
        return res.status(err.status).json({
            erro: err.message || 'Erro na requisição.'
        });
    }

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
            erro: 'Registro duplicado.'
        });
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            erro: 'Registro relacionado não encontrado.'
        });
    }

    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({
            erro: 'Não é possível excluir este registro porque ele está sendo utilizado por outro registro.'
        });
    }

    return res.status(500).json({
        erro: 'Erro interno do servidor.'
    });
}

module.exports = errorHandler;