const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const staffRole = await prisma.role.findFirst({
    where: { name: { equals: "Staff", mode: "insensitive" } },
  });

  if (!staffRole) {
    console.error("Staff role not found!");
    return;
  }

  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { role: "ADMIN" },
        { role: "admin" },
        { role: "STAFF" },
        { role: "staff" },
      ],
      username: { not: "superadmin" },
    },
    data: {
      role: "Staff",
      roleId: staffRole.id,
    },
  });

  console.log("Migrated records count:", result.count);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      roleId: true,
      roleRef: { select: { name: true } },
    },
  });

  console.log("Updated users in database:");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
