import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching catalog products:", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500, headers: corsHeaders }
    );
  }
}
