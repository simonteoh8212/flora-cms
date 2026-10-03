import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      customerName,
      customerPhone,
      items,
      totalAmount,
      deliveryFee = 0,
      paymentMethod = "DuitNow QR",
      deliverySlot,
      deliveryAddress,
      cardMessage,
    } = body;

    if (!customerName || !customerPhone || !items || totalAmount === undefined) {
      return NextResponse.json(
        { error: "Missing required order fields." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate readable order number: e.g. "FL-1001"
    const count = await prisma.order.count();
    const orderNumber = `FL-${1000 + count + 1}`;

    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: typeof items === "string" ? items : JSON.stringify(items),
        totalAmount: new Prisma.Decimal(parseFloat(totalAmount).toFixed(2)),
        deliveryFee: new Prisma.Decimal(parseFloat(deliveryFee || 0).toFixed(2)),
        paymentMethod: paymentMethod || "DuitNow QR",
        deliverySlot: deliverySlot || null,
        deliveryAddress: deliveryAddress || null,
        cardMessage: cardMessage || null,
        status: "PENDING_PAYMENT",
      },
    });

    return NextResponse.json(
      {
        success: true,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    console.error("Error creating incoming catalog order:", error);
    const message = error instanceof Error ? error.message : "Failed to record order.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: corsHeaders }
    );
  }
}
