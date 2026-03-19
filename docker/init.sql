-- ─────────────────────────────────────────────────────────────────────────────
-- init.sql — Ejecutado automáticamente por PostgreSQL al crear el contenedor
--
-- Crea el usuario de aplicación (renalfy_app) que es el único que la API usa
-- en runtime. Este usuario NO es superusuario, por lo tanto las políticas de
-- Row-Level Security se aplican a todas sus queries.
--
-- El usuario 'renalfy' (POSTGRES_USER) sigue siendo superusuario y se usa
-- exclusivamente para ejecutar migraciones de Prisma (BYPASSRLS implícito).
-- ─────────────────────────────────────────────────────────────────────────────

-- Usuario de aplicación: sujeto a RLS
CREATE USER renalfy_app WITH PASSWORD 'renalfy_app_dev';

-- Permisos sobre la base de datos y el schema public
GRANT CONNECT ON DATABASE renalfy TO renalfy_app;
GRANT USAGE ON SCHEMA public TO renalfy_app;

-- Permisos sobre tablas actuales y futuras
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO renalfy_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO renalfy_app;

-- Permisos sobre secuencias (para ids autogenerados)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO renalfy_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO renalfy_app;
