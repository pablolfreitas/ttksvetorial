-- ============================================================
--  Execute este SQL no Supabase
--  Acesse: seu projeto → SQL Editor → New query → cole e execute
-- ============================================================

-- Cria a tabela de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id             BIGSERIAL PRIMARY KEY,
  ttk            TEXT NOT NULL,
  id_servico     TEXT,
  sp             INTEGER,
  regiao         TEXT,         -- campo que será editado com frequência
  grupo_regiao   TEXT DEFAULT 'SUL', -- NORTE, SUL, SERRA, TAQUARI etc.
  data_inicio    TIMESTAMPTZ,
  cidade         TEXT,
  sigla          TEXT,
  tag            TEXT,
  tecnico        TEXT,
  atualizado_em  TIMESTAMPTZ DEFAULT NOW(),
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

-- Permite leitura e escrita sem autenticação (anon key)
-- (ideal para uso interno de equipe sem login)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura_publica" ON tickets
  FOR SELECT USING (true);

CREATE POLICY "insercao_publica" ON tickets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "atualizacao_publica" ON tickets
  FOR UPDATE USING (true);

CREATE POLICY "exclusao_publica" ON tickets
  FOR DELETE USING (true);
