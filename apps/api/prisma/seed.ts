import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_MIGRATION_URL'] });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Tenant demo
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'clinica-demo' },
    update: {},
    create: {
      slug: 'clinica-demo',
      name: 'Clínica Demo Renalfy',
      status: 'ACTIVE',
    },
  });

  // Branding
  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      primaryColor: '#0ea5e9',
      secondaryColor: '#64748b',
      tagline: 'Cuidando tu salud renal con tecnología',
      description: 'Clínica especializada en hemodiálisis con más de 10 años de experiencia.',
      phone: '33 1234 5678',
      email: 'contacto@clinica-demo.com',
      address: 'Av. López Mateos 1234, Guadalajara, Jalisco',
    },
  });

  // Sucursal
  const location = await prisma.location.upsert({
    where: { id: 'seed-location-001' },
    update: {},
    create: {
      id: 'seed-location-001',
      tenantId: tenant.id,
      name: 'Sucursal Centro',
      address: 'Av. López Mateos 1234, Guadalajara, Jalisco',
      phone: '33 1234 5678',
    },
  });

  // Usuario OWNER
  const password = await bcrypt.hash('Admin1234!', 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'owner@clinica-demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin Demo',
      email: 'owner@clinica-demo.com',
      password,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  console.log('✓ Tenant:', tenant.slug);
  console.log('✓ Location:', location.name);
  console.log('✓ OWNER: owner@clinica-demo.com / Admin1234!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
