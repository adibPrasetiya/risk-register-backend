import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Regular user role with basic permissions'
    }
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMINISTRATOR' },
    update: {},
    create: {
      name: 'ADMINISTRATOR',
      description: 'Administrator role with full system access'
    }
  });

  console.log('✅ Roles seeded:', {
    user: userRole.name,
    admin: adminRole.name
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
