-- Rode este arquivo no phpMyAdmin do alwaysdata (aba "SQL"), com o banco do projeto selecionado.
-- A API usa synchronize: false, ou seja, ela NUNCA cria nem altera tabelas sozinha.

CREATE TABLE IF NOT EXISTS produtos (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nome    VARCHAR(120)   NOT NULL,
  preco   DECIMAL(10, 2) NOT NULL DEFAULT 0,
  estoque INT            NOT NULL DEFAULT 0
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Cada pesquisa. "perguntas" e "tema" guardam JSON (tipo simple-json do TypeORM).
CREATE TABLE IF NOT EXISTS formularios (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  titulo               VARCHAR(200) NOT NULL,
  descricao            TEXT         NULL,
  perguntas            LONGTEXT     NOT NULL,
  tema                 LONGTEXT     NOT NULL,
  modo                 VARCHAR(20)  NOT NULL DEFAULT 'classico',
  pergunta_ramificacao VARCHAR(50)  NULL,
  mensagem_final       VARCHAR(500) NULL,
  ativo                TINYINT(1)   NOT NULL DEFAULT 1,
  visualizacoes        INT          NOT NULL DEFAULT 0,
  criado_em            DATETIME     NOT NULL,
  atualizado_em        DATETIME     NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Cada resposta enviada. "dados" guarda o JSON { idDaPergunta: valor }.
CREATE TABLE IF NOT EXISTS respostas (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  formulario_id    INT      NOT NULL,
  dados            LONGTEXT NOT NULL,
  duracao_segundos INT      NULL,
  criado_em        DATETIME NOT NULL,
  INDEX idx_respostas_formulario (formulario_id),
  CONSTRAINT fk_respostas_formulario FOREIGN KEY (formulario_id)
    REFERENCES formularios (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Alguns produtos de exemplo (só entram se a tabela estiver vazia)
INSERT INTO produtos (nome, preco, estoque)
SELECT * FROM (SELECT 'Teclado' AS nome, 149.90 AS preco, 12 AS estoque) AS t
WHERE NOT EXISTS (SELECT 1 FROM produtos);
