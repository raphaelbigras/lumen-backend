-- Raw-SQL indexes not representable in schema.prisma.
-- Re-apply after `prisma db push` on a fresh DB.
-- Safe to run multiple times (idempotent).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Backs ILIKE '%needle%' searches on ticket titles.
-- Without this, TicketsRepository.findAll with a `search` filter does a
-- sequential scan on the whole tickets table.
CREATE INDEX IF NOT EXISTS tickets_title_trgm_idx
  ON tickets USING GIN (title gin_trgm_ops);
