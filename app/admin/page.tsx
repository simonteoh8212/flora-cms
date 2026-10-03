import prisma from "@/lib/prisma";
import AdminProductList from "@/components/AdminProductList";
import { SerializedProduct } from "@/components/ProductFormModal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Flora Studio | Mobile Catalog Admin",
  description: "Manage floral catalog, stock availability, and flower photos on the go.",
};

const DEMO_FALLBACK_PRODUCTS: SerializedProduct[] = [
  {
    id: "sample-1",
    name: "Emerald Garden Rose Deluxe",
    description: "Freshly cut Ecuadorian white roses, eucalyptus sprigs, and emerald foliage.",
    price: "78.00",
    imageUrl: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80",
    category: "Bouquet",
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sample-2",
    name: "Blushing Peony Sunset",
    description: "Soft pink seasonal peonies complemented by lavender statice.",
    price: "85.00",
    imageUrl: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80",
    category: "Bouquet",
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sample-3",
    name: "Minimalist Ceramic Vase Set",
    description: "Fresh white calla lilies and chamomile blooms in a handcrafted ivory vase.",
    price: "65.00",
    imageUrl: "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=800&q=80",
    category: "Vase",
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sample-4",
    name: "Artisan Velvet Bloom Box",
    description: "Luxury round gift box packed with premium hydrangeas and spray roses.",
    price: "110.00",
    imageUrl: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=800&q=80",
    category: "Box",
    isAvailable: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sample-5",
    name: "Rustic Meadow Basket",
    description: "Charming woven basket brimming with sunny sunflowers and baby's breath.",
    price: "58.00",
    imageUrl: "https://images.unsplash.com/photo-1533616688419-b7a585564566?auto=format&fit=crop&w=800&q=80",
    category: "Basket",
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sample-6",
    name: "Everlasting Preserved Pampas",
    description: "Sustainably preserved bunny tails and dried eucalyptus that lasts over a year.",
    price: "49.00",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
    category: "Dried",
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default async function AdminPage() {
  let products: SerializedProduct[] = [];
  let isDemoFallback = false;

  try {
    const rawProducts = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (rawProducts && rawProducts.length > 0) {
      products = rawProducts.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        imageUrl: p.imageUrl,
        isAvailable: p.isAvailable,
        category: p.category,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }));
    } else {
      products = [];
    }
  } catch (error: unknown) {
    console.warn("Database connection notice:", error);
    // Provide sample bouquets so the admin UI is instantly testable on mobile even before database provisioning
    products = DEMO_FALLBACK_PRODUCTS;
    isDemoFallback = true;
  }

  return (
    <div>
      {isDemoFallback && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-4 py-2.5 text-xs text-center font-medium flex items-center justify-center gap-2">
          <span>✨ <strong>Demo Mode:</strong> Displaying sample florist items. Connect Vercel Postgres to save live changes permanently.</span>
        </div>
      )}
      <AdminProductList initialProducts={products} />
    </div>
  );
}
