-- Rollback da Central de Decisoes operacional
-- Remove a tabela de alertas criada na migration anterior, mantendo o historico do Prisma consistente.

DROP TABLE IF EXISTS "alertas_operacionais";

DROP TYPE IF EXISTS "TipoAlertaOperacional";
DROP TYPE IF EXISTS "SeveridadeAlerta";
DROP TYPE IF EXISTS "StatusAlerta";
DROP TYPE IF EXISTS "AcaoRecomendada";
