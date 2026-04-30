#!/bin/bash
# Setup test database for automated testing
# This script creates the renalfy_test database if it doesn't exist

set -e

echo "Setting up test database..."

# Create role renalfy_app if it doesn't exist (for RLS enforcement)
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -tc "SELECT 1 FROM pg_roles WHERE rolname = 'renalfy_app'" | grep -q 1 || \
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -c "CREATE ROLE renalfy_app WITH PASSWORD 'renalfy_app_dev' LOGIN;"

# Create role renalfy if it doesn't exist (for migrations and cleanup — needs SUPERUSER for RLS bypass)
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -tc "SELECT 1 FROM pg_roles WHERE rolname = 'renalfy'" | grep -q 1 || \
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -c "CREATE ROLE renalfy WITH PASSWORD 'renalfy_dev' LOGIN SUPERUSER;"

# Create test database if it doesn't exist
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -tc "SELECT 1 FROM pg_database WHERE datname = 'renalfy_test'" | grep -q 1 || \
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -c "CREATE DATABASE renalfy_test OWNER renalfy;"

echo "✓ Test database created or already exists"

# Grant permissions to renalfy_app on test database
echo "Granting permissions to renalfy_app..."
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 renalfy_test -c "
GRANT USAGE ON SCHEMA public TO renalfy_app;
GRANT CREATE ON SCHEMA public TO renalfy_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO renalfy_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO renalfy_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO renalfy_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO renalfy_app;
"

# Run migrations on test database
echo "Running migrations on test database..."
DATABASE_MIGRATION_URL="postgresql://postgres:postgres@localhost:5434/renalfy_test" npx prisma migrate deploy

echo "✓ Test database setup complete"
