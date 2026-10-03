function validarCampos(campos) {
    return (req, res, next) => {
        for (const campo of campos) {
            const valor = req.body[campo];

            if (
                valor === undefined ||
                valor === null ||
                (typeof valor === 'string' && valor.trim() === '')
            ) {
                return res.status(400).json({
                    erro: `O campo '${campo}' é obrigatório.`
                });
            }
        }

        next();
    };
}

function validarId(req, res, next) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'ID inválido.'
        });
    }

    next();
}

module.exports = {
    validarCampos,
    validarId
};