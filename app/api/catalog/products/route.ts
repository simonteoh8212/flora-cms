import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        isAvailable: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: Number(p.price),
      category: p.category || "Fresh Bouquets",
      image: p.imageUrl,
      inStock: p.isAvailable,
    }));

    return NextResponse.json(formatted, {
      headers: corsHeaders,
    });
  } catch (error: unknown) {
    console.error("Error fetching catalog products:", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500, headers: corsHeaders }
    );
  }
}
