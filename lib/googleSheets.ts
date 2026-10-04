/**
 * Utility to sync verified orders to the Florist's Google Sheet via Apps Script Webhook
 */

export interface GoogleSheetOrderPayload {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: string;
  totalAmount: number | string;
  paymentMethod: string;
  deliverySlot?: string | null;
  deliveryAddress?: string | null;
  cardMessage?: string | null;
  status?: string;
  verifiedBy?: string | null;
  timestamp?: string;
}

export async function syncOrderToGoogleSheet(
  order: GoogleSheetOrderPayload
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("GOOGLE_SHEET_WEBHOOK_URL is not configured in .env. Skipping Google Sheet sync.");
    return { success: false, error: "Google Sheet webhook URL is not configured." };
  }

  try {
    const payload = {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod || "DuitNow QR",
      deliverySlot: order.deliverySlot || "Standard",
      deliveryAddress: order.deliveryAddress || "Self-Pickup",
      cardMessage: order.cardMessage || "-",
      status: order.status || "PAID",
      verifiedBy: order.verifiedBy || "Staff",
      timestamp:
        order.timestamp ||
        new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }),
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Sheet webhook error response:", response.status, errorText);
      return {
        success: false,
        error: `Webhook returned status ${response.status}`,
      };
    }

    const responseText = await response.text();
    try {
      const json = JSON.parse(responseText);
      if (json && json.result === "error") {
        console.error("Google Sheet webhook script error:", json.error);
        return {
          success: false,
          error: json.error || "Google Apps Script encountered an execution error.",
        };
      }
    } catch {
      // If response is not JSON, but status was 200, treat as success
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error syncing to Google Sheet:", error);
    const message =
      error instanceof Error ? error.message : "Failed to sync to Google Sheet.";
    return { success: false, error: message };
  }
}
