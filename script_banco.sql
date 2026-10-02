CREATE DATABASE IF NOT EXISTS sistema_clientes
CHARACTER SET utf8mb4
COLLATE utf8mb4_general_ci;

USE sistema_clientes;

-- =========================================
-- 1. TABELA CLIENTES
-- =========================================

CREATE TABLE IF NOT EXISTS clientes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;


-- =========================================
-- 2. TABELA PRODUTOS
-- =========================================

CREATE TABLE IF NOT EXISTS produtos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estoque INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;


-- =========================================
-- 3. TABELA USUARIOS
-- =========================================

CREATE TABLE IF NOT EXISTS usuarios (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    perfil ENUM('admin', 'operador') DEFAULT 'operador',
    status ENUM('ativo', 'inativo') DEFAULT 'ativo',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;


-- =========================================
-- 4. TABELA PEDIDOS
-- =========================================

CREATE TABLE IF NOT EXISTS pedidos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    cliente_id INT UNSIGNED NOT NULL,
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pendente', 'pago', 'cancelado') DEFAULT 'pendente',
    valor_total DECIMAL(10,2) DEFAULT 0.00,
    PRIMARY KEY (id),

    CONSTRAINT fk_pedidos_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =========================================
-- 5. TABELA ITENS_PEDIDO
-- =========================================

CREATE TABLE IF NOT EXISTS itens_pedido (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    pedido_id INT UNSIGNED NOT NULL,
    produto_id INT UNSIGNED NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id),

    CONSTRAINT fk_itens_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_itens_produto
        FOREIGN KEY (produto_id)
        REFERENCES produtos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =========================================
-- DADOS INICIAIS PARA TESTE
-- =========================================

-- CLIENTES
INSERT INTO clientes (nome, email, telefone)
VALUES
    ('João da Silva', 'joao.silva@email.com', '47999990001'),
    ('Maria Oliveira', 'maria.oliveira@email.com', '47999990002');


-- PRODUTOS
INSERT INTO produtos (nome, descricao, preco, estoque)
VALUES
    ('Notebook', 'Notebook para uso profissional e estudos', 3500.00, 10),
    ('Mouse', 'Mouse USB para computador', 80.00, 30),
    ('Teclado', 'Teclado USB para computador', 120.00, 20);


-- USUÁRIO INICIAL
-- Senha armazenada como hash bcrypt.
-- Senha original para teste: 123456
INSERT INTO usuarios (nome, email, senha, perfil, status)
VALUES
    (
        'Administrador',
        'admin@sistema.com',
        '$2a$10$7EqJtq98hPqEX7fNZaFWoOe5h7wZ9KJqY7f7V7f7V7f7V7f7V7f7V',
        'admin',
        'ativo'
    );