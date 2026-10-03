import prisma from "@/lib/prisma";
import StorefrontCatalog from "@/components/StorefrontCatalog";
import { SerializedProduct } from "@/components/ProductFormModal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Flora Studio | Artisan Flowers & Handcrafted Bouquets",
  description: "Order fresh handcrafted floral arrangements directly via WhatsApp.",
};

const FALLBACK_DEMO_PRODUCTS: SerializedProduct[] = [
  {
    id: "demo-1",
    name: "Emerald Garden Rose Deluxe",
    description: "Freshly cut Ecuadorian white roses, eucalyptus sprigs, and emerald foliage in signature wrap.",
    price: "78.00",
    imageUrl: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80",
    category: "Bouquet",
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    name: "Blushing Peony Sunset",
    description: "Soft pink seasonal peonies complemented by lavender statice and silver dollar eucalyptus.",
    price: "85.00",
    imageUrl: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80",
    category: "Bouquet",
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    name: "Minimalist Ceramic Vase Set",
    description: "Fresh white calla lilies and chamomile blooms presented in a handcrafted ivory vase.",
    price: "65.00",
    imageUrl: "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=800&q=80",
    category: "Vase",
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-4",
    name: "Artisan Velvet Bloom Box",
    description: "Luxury round gift box packed with premium hydrangeas, spray roses, and gold ribbon accent.",
    price: "110.00",
    imageUrl: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=800&q=80",
    category: "Box",
    isAvailable: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default async function HomePage() {
  let products: SerializedProduct[] = [];

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
      // Catalog empty fallback for instant preview
      products = FALLBACK_DEMO_PRODUCTS;
    }
  } catch (error: unknown) {
    console.warn("Database notice for homepage:", error);
    // Use fallback demo catalog if database not yet migrated
    products = FALLBACK_DEMO_PRODUCTS;
  }

  return <StorefrontCatalog products={products} />;
}
