-- Índice para a coluna de convênio na tabela pacientes
-- Ajuste os nomes das tabelas/colunas se o seu banco usar outra convenção.

CREATE INDEX idx_pacientes_convenio_id
ON pacientes (convenio_id);

-- Se ainda não existir a chave estrangeira, use também:
-- ALTER TABLE pacientes
-- ADD CONSTRAINT fk_pacientes_convenios
-- FOREIGN KEY (convenio_id) REFERENCES convenios(id);
