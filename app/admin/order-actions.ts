"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { getCurrentUserPermissions } from "@/app/roles/actions";
import { syncOrderToGoogleSheet } from "@/lib/googleSheets";
import { Prisma } from "@prisma/client";

export interface SerializedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: string;
  totalAmount: string;
  deliveryFee: string;
  paymentMethod: string;
  deliverySlot: string | null;
  deliveryAddress: string | null;
  cardMessage: string | null;
  status: string;
  googleSheetSynced: boolean;
  syncedAt: string | null;
  verifiedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface SalesAnalytics {
  todayRevenue: number;
  todayOrdersCount: number;
  monthRevenue: number;
  monthOrdersCount: number;
  pendingVerificationCount: number;
  totalPaidRevenue: number;
}

/**
 * Fetches sales metrics (Today, This Month, Pending Verifications)
 */
export async function getSalesAnalyticsAction(): Promise<OrderActionResult<SalesAnalytics>> {
  try {
    const now = new Date();
    
    // Start of Today (KL / local time)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of This Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayPaidOrders, monthPaidOrders, pendingCount, allPaidOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: "PAID",
          createdAt: { gte: startOfToday },
        },
        select: { totalAmount: true },
      }),
      prisma.order.findMany({
        where: {
          status: "PAID",
          createdAt: { gte: startOfMonth },
        },
        select: { totalAmount: true },
      }),
      prisma.order.count({
        where: { status: "PENDING_PAYMENT" },
      }),
      prisma.order.findMany({
        where: { status: "PAID" },
        select: { totalAmount: true },
      }),
    ]);

    const todayRevenue = todayPaidOrders.reduce(
      (sum, o) => sum + parseFloat(o.totalAmount.toString()),
      0
    );

    const monthRevenue = monthPaidOrders.reduce(
      (sum, o) => sum + parseFloat(o.totalAmount.toString()),
      0
    );

    const totalPaidRevenue = allPaidOrders.reduce(
      (sum, o) => sum + parseFloat(o.totalAmount.toString()),
      0
    );

    return {
      success: true,
      data: {
        todayRevenue,
        todayOrdersCount: todayPaidOrders.length,
        monthRevenue,
        monthOrdersCount: monthPaidOrders.length,
        pendingVerificationCount: pendingCount,
        totalPaidRevenue,
      },
    };
  } catch (error: unknown) {
    console.error("Error calculating sales analytics:", error);
    return {
      success: false,
      error: "Failed to calculate sales analytics.",
      data: {
        todayRevenue: 0,
        todayOrdersCount: 0,
        monthRevenue: 0,
        monthOrdersCount: 0,
        pendingVerificationCount: 0,
        totalPaidRevenue: 0,
      },
    };
  }
}

/**
 * Fetches paginated orders with search and status filtering
 */
export async function getOrdersAction(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}): Promise<
  OrderActionResult<{
    orders: SerializedOrder[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>
> {
  try {
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.max(1, params?.pageSize || 10);
    const status = params?.status || "ALL";
    const search = params?.search?.trim() || "";

    const where: Prisma.OrderWhereInput = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        { items: { contains: search, mode: "insensitive" } },
      ];
    }

    const [rawOrders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    const orders: SerializedOrder[] = rawOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      items: o.items,
      totalAmount: o.totalAmount.toString(),
      deliveryFee: o.deliveryFee.toString(),
      paymentMethod: o.paymentMethod,
      deliverySlot: o.deliverySlot,
      deliveryAddress: o.deliveryAddress,
      cardMessage: o.cardMessage,
      status: o.status,
      googleSheetSynced: o.googleSheetSynced,
      syncedAt: o.syncedAt ? o.syncedAt.toISOString() : null,
      verifiedBy: o.verifiedBy,
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        orders,
        totalCount,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      },
    };
  } catch (error: unknown) {
    console.error("Error fetching orders:", error);
    const message = error instanceof Error ? error.message : "Failed to load orders.";
    return { success: false, error: message };
  }
}

/**
 * Creates a new order (from WhatsApp dispatch or manual staff entry)
 */
export async function createOrderAction(data: {
  customerName: string;
  customerPhone: string;
  items: string;
  totalAmount: number | string;
  deliveryFee?: number | string;
  paymentMethod?: string;
  deliverySlot?: string;
  deliveryAddress?: string;
  cardMessage?: string;
  status?: "PENDING_PAYMENT" | "PAID";
  notes?: string;
}): Promise<OrderActionResult<SerializedOrder>> {
  try {
    const session = await getSession();
    const verifiedBy = session?.username || "Web Customer";

    // Generate unique order number: FL-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `FL-${randomSuffix}`;

    const totalAmount = new Prisma.Decimal(parseFloat(data.totalAmount.toString()).toFixed(2));
    const deliveryFee = new Prisma.Decimal(
      parseFloat((data.deliveryFee || 0).toString()).toFixed(2)
    );

    const isPaid = data.status === "PAID";

    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        items: data.items.trim(),
        totalAmount,
        deliveryFee,
        paymentMethod: data.paymentMethod || "DuitNow QR",
        deliverySlot: data.deliverySlot?.trim() || null,
        deliveryAddress: data.deliveryAddress?.trim() || null,
        cardMessage: data.cardMessage?.trim() || null,
        status: data.status || "PENDING_PAYMENT",
        googleSheetSynced: false,
        verifiedBy: isPaid ? verifiedBy : null,
        notes: data.notes?.trim() || null,
      },
    });

    // If created directly as PAID, immediately sync to Google Sheet
    if (isPaid) {
      const syncRes = await syncOrderToGoogleSheet({
        orderNumber: newOrder.orderNumber,
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone,
        items: newOrder.items,
        totalAmount: newOrder.totalAmount.toString(),
        paymentMethod: newOrder.paymentMethod,
        deliverySlot: newOrder.deliverySlot,
        deliveryAddress: newOrder.deliveryAddress,
        cardMessage: newOrder.cardMessage,
        status: "PAID",
        verifiedBy: verifiedBy,
      });

      if (syncRes.success) {
        await prisma.order.update({
          where: { id: newOrder.id },
          data: {
            googleSheetSynced: true,
            syncedAt: new Date(),
          },
        });
      }
    }

    revalidatePath("/admin");

    return {
      success: true,
      data: {
        ...newOrder,
        totalAmount: newOrder.totalAmount.toString(),
        deliveryFee: newOrder.deliveryFee.toString(),
        syncedAt: newOrder.syncedAt ? newOrder.syncedAt.toISOString() : null,
        createdAt: newOrder.createdAt.toISOString(),
        updatedAt: newOrder.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Error creating order:", error);
    const message = error instanceof Error ? error.message : "Failed to create order.";
    return { success: false, error: message };
  }
}

/**
 * Marks an order as PAID and immediately syncs it to Google Sheets
 */
export async function markOrderAsPaidAction(
  orderId: string
): Promise<OrderActionResult<SerializedOrder>> {
  try {
    const session = await getSession();
    const verifiedBy = session?.username || "Staff";

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return { success: false, error: "Order not found." };
    }

    // Sync to Google Sheet first
    const syncRes = await syncOrderToGoogleSheet({
      orderNumber: existingOrder.orderNumber,
      customerName: existingOrder.customerName,
      customerPhone: existingOrder.customerPhone,
      items: existingOrder.items,
      totalAmount: existingOrder.totalAmount.toString(),
      paymentMethod: existingOrder.paymentMethod,
      deliverySlot: existingOrder.deliverySlot,
      deliveryAddress: existingOrder.deliveryAddress,
      cardMessage: existingOrder.cardMessage,
      status: "PAID",
      verifiedBy: verifiedBy,
    });

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        verifiedBy: verifiedBy,
        googleSheetSynced: syncRes.success,
        syncedAt: syncRes.success ? new Date() : null,
      },
    });

    revalidatePath("/admin");

    return {
      success: true,
      data: {
        ...updatedOrder,
        totalAmount: updatedOrder.totalAmount.toString(),
        deliveryFee: updatedOrder.deliveryFee.toString(),
        syncedAt: updatedOrder.syncedAt ? updatedOrder.syncedAt.toISOString() : null,
        createdAt: updatedOrder.createdAt.toISOString(),
        updatedAt: updatedOrder.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Error marking order as paid:", error);
    const message = error instanceof Error ? error.message : "Failed to verify payment.";
    return { success: false, error: message };
  }
}

/**
 * Deletes an order (Staff / Admin)
 */
export async function deleteOrderAction(orderId: string): Promise<OrderActionResult> {
  try {
    const perms = await getCurrentUserPermissions();
    if (!perms.canDelete) {
      return {
        success: false,
        error: "Permission denied: Your role cannot delete sales records.",
      };
    }

    await prisma.order.delete({
      where: { id: orderId },
    });

    revalidatePath("/admin");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting order:", error);
    const message = error instanceof Error ? error.message : "Failed to delete order.";
    return { success: false, error: message };
  }
}
