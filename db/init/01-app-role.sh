#!/usr/bin/env bash
set -euo pipefail

# Provisions a least-privilege application role, separate from the POSTGRES_USER
# superuser/owner role that runs migrations. The app connects at runtime as
# APP_DB_USER, which can only CRUD rows -- it cannot CREATE/ALTER/DROP objects.
# See ARCHITECTURE.md ADR "Least-privilege application database role".

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${APP_DB_USER}') THEN
            CREATE ROLE "${APP_DB_USER}" LOGIN PASSWORD '${APP_DB_PASSWORD}';
        END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE "${POSTGRES_DB}" TO "${APP_DB_USER}";
    GRANT USAGE ON SCHEMA public TO "${APP_DB_USER}";

    -- Applies to tables that already exist at init time (none, on first boot).
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${APP_DB_USER}";
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${APP_DB_USER}";

    -- Applies to tables/sequences created later by migrations run as POSTGRES_USER,
    -- so APP_DB_USER never needs elevated (CREATE/ALTER/DROP) rights.
    ALTER DEFAULT PRIVILEGES FOR ROLE "${POSTGRES_USER}" IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${APP_DB_USER}";
    ALTER DEFAULT PRIVILEGES FOR ROLE "${POSTGRES_USER}" IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO "${APP_DB_USER}";
EOSQL
