-- Rode este arquivo no phpMyAdmin do alwaysdata (aba "SQL"), com o banco do projeto selecionado.
-- A API usa synchronize: false, ou seja, ela NUNCA cria nem altera tabelas sozinha.

CREATE TABLE IF NOT EXISTS produtos (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nome    VARCHAR(120)   NOT NULL,
  preco   DECIMAL(10, 2) NOT NULL DEFAULT 0,
  estoque INT            NOT NULL DEFAULT 0
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Pastas para organizar as pesquisas (ex.: "Clientes", "RH", "Eventos 2026")
CREATE TABLE IF NOT EXISTS pastas (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(60) NOT NULL,
  cor       VARCHAR(7)  NOT NULL DEFAULT '#6d28d9',
  criado_em DATETIME    NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Cada pesquisa. "perguntas", "tema" e "etiquetas" guardam JSON (tipo simple-json do TypeORM).
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
  pasta_id             INT          NULL,
  etiquetas            LONGTEXT     NULL,
  arquivado            TINYINT(1)   NOT NULL DEFAULT 0,
  favorito             TINYINT(1)   NOT NULL DEFAULT 0,
  segmentos            LONGTEXT     NULL,
  criado_em            DATETIME     NOT NULL,
  atualizado_em        DATETIME     NOT NULL,
  INDEX idx_formularios_pasta (pasta_id),
  -- Excluir uma pasta não exclui as pesquisas: elas ficam "sem pasta"
  CONSTRAINT fk_formularios_pasta FOREIGN KEY (pasta_id)
    REFERENCES pastas (id) ON DELETE SET NULL
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

-- Cada visita ao link público (funil de abandono). Guarda só QUAIS perguntas a pessoa
-- já respondeu (ids), nunca as respostas em si. "concluida" = enviou a resposta no fim.
CREATE TABLE IF NOT EXISTS sessoes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  formulario_id INT         NOT NULL,
  sessao        VARCHAR(36) NOT NULL,
  perguntas     LONGTEXT    NOT NULL,
  concluida     TINYINT(1)  NOT NULL DEFAULT 0,
  criado_em     DATETIME    NOT NULL,
  atualizado_em DATETIME    NOT NULL,
  UNIQUE KEY uq_sessoes_formulario_sessao (formulario_id, sessao),
  CONSTRAINT fk_sessoes_formulario FOREIGN KEY (formulario_id)
    REFERENCES formularios (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Temas salvos pela empresa ("Meus temas"), reaproveitados em várias pesquisas
CREATE TABLE IF NOT EXISTS temas (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(80) NOT NULL,
  tema      LONGTEXT    NOT NULL,
  criado_em DATETIME    NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Alguns produtos de exemplo (só entram se a tabela estiver vazia)
INSERT INTO produtos (nome, preco, estoque)
SELECT * FROM (SELECT 'Teclado' AS nome, 149.90 AS preco, 12 AS estoque) AS t
WHERE NOT EXISTS (SELECT 1 FROM produtos);
