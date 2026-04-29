#!/bin/bash
# Setup development database permissions
# This script grants necessary permissions to renalfy_app user

set -e

echo "Setting up development database permissions..."

# Create role renalfy_app if it doesn't exist
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -tc "SELECT 1 FROM pg_roles WHERE rolname = 'renalfy_app'" | grep -q 1 || \
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -c "CREATE ROLE renalfy_app WITH PASSWORD 'renalfy_app_dev' LOGIN;"

# Create role renalfy if it doesn't exist
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -tc "SELECT 1 FROM pg_roles WHERE rolname = 'renalfy'" | grep -q 1 || \
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -c "CREATE ROLE renalfy WITH PASSWORD 'renalfy_dev' LOGIN;"

# Create development database if it doesn't exist
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -tc "SELECT 1 FROM pg_database WHERE datname = 'renalfy'" | grep -q 1 || \
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -c "CREATE DATABASE renalfy OWNER renalfy;"

echo "✓ Development database created or already exists"

# Grant permissions to renalfy_app on development database
echo "Granting permissions to renalfy_app..."
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 renalfy -c "
GRANT USAGE ON SCHEMA public TO renalfy_app;
GRANT CREATE ON SCHEMA public TO renalfy_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO renalfy_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO renalfy_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO renalfy_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO renalfy_app;
"

echo "✓ Development database setup complete"
