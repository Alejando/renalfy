import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Las migraciones usan el superusuario para tener BYPASSRLS y permisos completos.
// El runtime usa renalfy_app, que está sujeto a Row-Level Security.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --experimental-vm-modules dist/prisma/seed.js',
  },
  datasource: {
    url: process.env['DATABASE_MIGRATION_URL'] ?? process.env['DATABASE_URL'],
  },
});
