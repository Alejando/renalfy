#!/bin/bash
# Setup test database for automated testing
# This script creates the renalfy_test database if it doesn't exist

set -e

echo "Setting up test database..."

# Create role renalfy if it doesn't exist
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -tc "SELECT 1 FROM pg_roles WHERE rolname = 'renalfy'" | grep -q 1 || \
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -c "CREATE ROLE renalfy WITH PASSWORD 'renalfy_dev' LOGIN;"

# Create test database if it doesn't exist
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -tc "SELECT 1 FROM pg_database WHERE datname = 'renalfy_test'" | grep -q 1 || \
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -c "CREATE DATABASE renalfy_test OWNER renalfy;"

echo "✓ Test database created or already exists"

# Run migrations on test database
echo "Running migrations on test database..."
DATABASE_MIGRATION_URL="postgresql://postgres:postgres@localhost:5434/renalfy_test" npx prisma migrate deploy

echo "✓ Test database setup complete"
