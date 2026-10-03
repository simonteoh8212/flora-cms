const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting clean database reset and migration seeding...");

  // 1. Delete all existing records (clean slate)
  console.log("🗑️  Removing all existing records from User, Role, and Product tables...");
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.product.deleteMany({});
  console.log("✓ All table rows cleared.");

  // 2. Create Default Roles
  console.log("🛡️  Creating default system and custom roles...");
  
  const superAdminRole = await prisma.role.create({
    data: {
      name: "SUPER_ADMIN",
      description: "Root developer role with full unrestricted access to system, roles, and settings.",
      isSystem: true,
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: true,
    },
  });

  const masterAdminRole = await prisma.role.create({
    data: {
      name: "MASTER_ADMIN",
      description: "Florist shop owner role with full catalog management and staff user provisioning.",
      isSystem: true,
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: true,
    },
  });

  const staffRole = await prisma.role.create({
    data: {
      name: "Staff",
      description: "Florist team member: can view, add, and edit bouquets, but cannot delete.",
      isSystem: false,
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: false, // Staff has View, Add, Edit, NO Delete
    },
  });

  console.log(`✓ Roles created: SUPER_ADMIN (${superAdminRole.id}), MASTER_ADMIN (${masterAdminRole.id}), Staff (${staffRole.id})`);

  // 3. Create Root Super Admin Account
  console.log("👤 Creating root superadmin account (username: superadmin, password: superadmin)...");
  const hashedPassword = await bcrypt.hash("superadmin", 10);

  const superAdminUser = await prisma.user.create({
    data: {
      username: "superadmin",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      roleId: superAdminRole.id,
    },
  });

  console.log(`✓ Superadmin account created! ID: ${superAdminUser.id}`);

  // 4. Seed initial bouquet catalog items
  console.log("🌸 Seeding starter bouquet catalog items...");
  const starterProducts = [
    {
      name: "Emerald Garden Rose Deluxe",
      description: "Freshly cut Ecuadorian white roses, eucalyptus sprigs, and emerald foliage in signature wrap.",
      price: "78.00",
      imageUrl: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80",
      category: "Bouquet",
      isAvailable: true,
    },
    {
      name: "Blushing Peony Sunset",
      description: "Soft pink seasonal peonies complemented by lavender statice and silver dollar eucalyptus.",
      price: "85.00",
      imageUrl: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80",
      category: "Bouquet",
      isAvailable: true,
    },
    {
      name: "Minimalist Ceramic Vase Set",
      description: "Fresh white calla lilies and chamomile blooms presented in a handcrafted ivory vase.",
      price: "65.00",
      imageUrl: "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=800&q=80",
      category: "Vase",
      isAvailable: true,
    },
    {
      name: "Artisan Velvet Bloom Box",
      description: "Luxury round gift box packed with premium hydrangeas, spray roses, and gold ribbon accent.",
      price: "110.00",
      imageUrl: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=800&q=80",
      category: "Box",
      isAvailable: false,
    },
    {
      name: "Rustic Meadow Basket",
      description: "Charming woven basket brimming with sunny sunflowers, baby's breath, and wild wheat.",
      price: "58.00",
      imageUrl: "https://images.unsplash.com/photo-1533616688419-b7a585564566?auto=format&fit=crop&w=800&q=80",
      category: "Basket",
      isAvailable: true,
    },
    {
      name: "Everlasting Pampas & Dried Flora",
      description: "Sustainably preserved bunny tails, pampas grass, and dried eucalyptus that lasts over a year.",
      price: "49.00",
      imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
      category: "Dried",
      isAvailable: true,
    },
  ];

  await prisma.product.createMany({
    data: starterProducts,
  });

  console.log("✓ Starter bouquet catalog items created.");
  console.log("\n🎉 Database successfully reset and seeded!");
  console.log("🔑 Default credentials: username = 'superadmin', password = 'superadmin'");
}

main()
  .catch((e) => {
    console.error("❌ Reset error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
