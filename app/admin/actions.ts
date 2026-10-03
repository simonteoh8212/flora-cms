"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { getCurrentUserPermissions } from "@/app/roles/actions";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Creates a new product with image uploaded to Cloudinary
 */
export async function createProduct(formData: FormData): Promise<ActionResult> {
  try {
    const perms = await getCurrentUserPermissions();
    if (!perms.canAdd) {
      return {
        success: false,
        error: "Permission denied: Your role does not have permission to add new products.",
      };
    }

    const name = formData.get("name")?.toString().trim();
    const description = formData.get("description")?.toString().trim() || null;
    const priceStr = formData.get("price")?.toString().trim();
    const category = formData.get("category")?.toString().trim() || "Bouquet";
    const isAvailable = formData.get("isAvailable") === "true" || formData.get("isAvailable") === "on";
    const imageFile = formData.get("image") as File | null;
    const existingImageUrl = formData.get("imageUrl")?.toString().trim();

    if (!name) {
      return { success: false, error: "Product name is required." };
    }

    if (!priceStr || isNaN(parseFloat(priceStr))) {
      return { success: false, error: "A valid price is required." };
    }

    const price = new Prisma.Decimal(parseFloat(priceStr).toFixed(2));

    let imageUrl = existingImageUrl || "";

    // If an image file was provided, upload to Cloudinary
    if (imageFile && imageFile.size > 0) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageUrl = await uploadToCloudinary(buffer, "flora-catalog");
    }

    if (!imageUrl) {
      return {
        success: false,
        error: "Please select an image photo from your phone or library.",
      };
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        imageUrl,
        category,
        isAvailable,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/api/catalog/products");

    return {
      success: true,
      data: {
        ...product,
        price: product.price.toString(),
      },
    };
  } catch (error: unknown) {
    console.error("Error creating product:", error);
    const message = error instanceof Error ? error.message : "Failed to create product.";
    return { success: false, error: message };
  }
}

/**
 * Updates an existing product
 */
export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const perms = await getCurrentUserPermissions();
    if (!perms.canEdit) {
      return {
        success: false,
        error: "Permission denied: Your role does not have permission to edit products.",
      };
    }

    const name = formData.get("name")?.toString().trim();
    const description = formData.get("description")?.toString().trim() || null;
    const priceStr = formData.get("price")?.toString().trim();
    const category = formData.get("category")?.toString().trim() || "Bouquet";
    const isAvailable = formData.get("isAvailable") === "true" || formData.get("isAvailable") === "on";
    const imageFile = formData.get("image") as File | null;
    let imageUrl = formData.get("imageUrl")?.toString().trim();

    if (!id) {
      return { success: false, error: "Product ID is missing." };
    }

    if (!name) {
      return { success: false, error: "Product name is required." };
    }

    if (!priceStr || isNaN(parseFloat(priceStr))) {
      return { success: false, error: "A valid price is required." };
    }

    const price = new Prisma.Decimal(parseFloat(priceStr).toFixed(2));

    // Upload new image if provided
    if (imageFile && imageFile.size > 0) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageUrl = await uploadToCloudinary(buffer, "flora-catalog");
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price,
        category,
        isAvailable,
        ...(imageUrl ? { imageUrl } : {}),
      },
    });

    revalidatePath("/admin");
    revalidatePath("/api/catalog/products");

    return {
      success: true,
      data: {
        ...product,
        price: product.price.toString(),
      },
    };
  } catch (error: unknown) {
    console.error("Error updating product:", error);
    const message = error instanceof Error ? error.message : "Failed to update product.";
    return { success: false, error: message };
  }
}

/**
 * Fast toggle for In Stock / Out of Stock
 */
export async function toggleProductAvailability(
  id: string,
  isAvailable: boolean
): Promise<ActionResult> {
  try {
    const perms = await getCurrentUserPermissions();
    if (!perms.canEdit) {
      return {
        success: false,
        error: "Permission denied: Your role does not have permission to change stock availability.",
      };
    }

    const product = await prisma.product.update({
      where: { id },
      data: { isAvailable },
    });

    revalidatePath("/admin");
    revalidatePath("/api/catalog/products");

    return {
      success: true,
      data: {
        id: product.id,
        isAvailable: product.isAvailable,
      },
    };
  } catch (error: unknown) {
    console.error("Error toggling availability:", error);
    const message = error instanceof Error ? error.message : "Failed to update status.";
    return { success: false, error: message };
  }
}

/**
 * Delete a product from catalog
 */
export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const perms = await getCurrentUserPermissions();
    if (!perms.canDelete) {
      return {
        success: false,
        error: "Permission denied: Your role does not have permission to delete products.",
      };
    }

    await prisma.product.delete({
      where: { id },
    });

    revalidatePath("/admin");
    revalidatePath("/api/catalog/products");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting product:", error);
    const message = error instanceof Error ? error.message : "Failed to delete product.";
    return { success: false, error: message };
  }
}

/**
 * Seed initial catalog with starter items for demo purposes
 */
export async function seedDemoProducts(): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (session?.role !== "SUPER_ADMIN" && session?.role !== "MASTER_ADMIN") {
      return {
        success: false,
        error: "Permission denied: Only Super Admin and Master Admin can seed demo products.",
      };
    }

    const count = await prisma.product.count();
    if (count > 0) {
      return { success: false, error: "Catalog already has products." };
    }

    const demoItems = [
      {
        name: "Emerald Garden Rose Deluxe",
        description: "Freshly cut Ecuadorian white roses, eucalyptus sprigs, and emerald foliage in signature wrap.",
        price: new Prisma.Decimal("78.00"),
        imageUrl: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80",
        category: "Bouquet",
        isAvailable: true,
      },
      {
        name: "Blushing Peony Sunset",
        description: "Soft pink seasonal peonies complemented by lavender statice and silver dollar eucalyptus.",
        price: new Prisma.Decimal("85.00"),
        imageUrl: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80",
        category: "Bouquet",
        isAvailable: true,
      },
      {
        name: "Minimalist Ceramic Vase Set",
        description: "Fresh white calla lilies and chamomile blooms presented in a handcrafted ivory vase.",
        price: new Prisma.Decimal("65.00"),
        imageUrl: "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=800&q=80",
        category: "Vase",
        isAvailable: true,
      },
      {
        name: "Artisan Velvet Bloom Box",
        description: "Luxury round gift box packed with premium hydrangeas, spray roses, and gold ribbon accent.",
        price: new Prisma.Decimal("110.00"),
        imageUrl: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=800&q=80",
        category: "Box",
        isAvailable: false,
      },
      {
        name: "Rustic Meadow Basket",
        description: "Charming woven basket brimming with sunny sunflowers, baby's breath, and wild wheat.",
        price: new Prisma.Decimal("58.00"),
        imageUrl: "https://images.unsplash.com/photo-1533616688419-b7a585564566?auto=format&fit=crop&w=800&q=80",
        category: "Basket",
        isAvailable: true,
      },
      {
        name: "Everlasting Pampas & Dried Flora",
        description: "Sustainably preserved bunny tails, pampas grass, and dried eucalyptus that lasts over a year.",
        price: new Prisma.Decimal("49.00"),
        imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
        category: "Dried",
        isAvailable: true,
      },
    ];

    await prisma.product.createMany({
      data: demoItems,
    });

    revalidatePath("/admin");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error seeding products:", error);
    const message = error instanceof Error ? error.message : "Failed to seed catalog.";
    return { success: false, error: message };
  }
}

export interface PaginatedProductItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  stock?: "ALL" | "IN_STOCK" | "OUT_OF_STOCK";
}

export interface PaginatedProductsResult {
  products: PaginatedProductItem[];
  totalCount: number;
  inStockCount: number;
  outOfStockCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetches products page by page from the database with Prisma skip & take
 */
export async function getPaginatedProductsAction(
  params: GetProductsParams
): Promise<ActionResult<PaginatedProductsResult>> {
  try {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.pageSize || 10);
    const search = params.search?.trim() || "";
    const category = params.category || "All";
    const stock = params.stock || "ALL";

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category && category !== "All") {
      where.category = { equals: category, mode: "insensitive" };
    }

    if (stock === "IN_STOCK") {
      where.isAvailable = true;
    } else if (stock === "OUT_OF_STOCK") {
      where.isAvailable = false;
    }

    const [rawProducts, totalCount, inStockCount, outOfStockCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
      prisma.product.count({ where: { isAvailable: true } }),
      prisma.product.count({ where: { isAvailable: false } }),
    ]);

    const products: PaginatedProductItem[] = rawProducts.map((p) => ({
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

    return {
      success: true,
      data: {
        products,
        totalCount,
        inStockCount,
        outOfStockCount,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      },
    };
  } catch (error: unknown) {
    console.error("Error fetching paginated products:", error);
    const message = error instanceof Error ? error.message : "Failed to load products.";
    return { success: false, error: message };
  }
}

