require('dotenv').config(); // Load the .env file
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const bcrypt = require('bcrypt');

// Prisma 7 uses the mariadb adapter for both MySQL and MariaDB
const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding the Ypsyl-own database...');

  // Hash the default password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('Ypsylon2026!', saltRounds);

  // Upsert ensures we don't accidentally create duplicates
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ypsylon.hu' },
    update: {},
    create: {
      email: 'admin@ypsylon.hu',
      name: 'System Admin',
      passwordHash: passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log(`Email: ${admin.email}`);
  console.log('Password: Ypsylon2026!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });