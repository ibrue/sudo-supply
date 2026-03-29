import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase";

/**
 * Shopify webhook handler — receives order events and syncs to Supabase.
 *
 * Set up in Shopify Admin → Settings → Notifications → Webhooks:
 *   - Event: Order creation (orders/create)
 *   - Event: Order update (orders/updated)
 *   - URL: https://sudo.supply/api/webhooks/shopify
 *   - Format: JSON
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify webhook signature
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmac || !secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const computedHmac = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(computedHmac))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic");
  const payload = JSON.parse(body);

  const supabase = createServiceClient();

  try {
    if (topic === "orders/create" || topic === "orders/updated") {
      await handleOrderEvent(supabase, payload);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook] Error processing Shopify event:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handleOrderEvent(
  supabase: ReturnType<typeof createServiceClient>,
  order: ShopifyOrderPayload
) {
  const items = order.line_items.map((item) => ({
    title: item.title,
    quantity: item.quantity,
    price: parseFloat(item.price),
    variant_id: String(item.variant_id),
  }));

  const shippingAddress = order.shipping_address
    ? {
        name: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
        address1: order.shipping_address.address1,
        address2: order.shipping_address.address2 || undefined,
        city: order.shipping_address.city,
        province: order.shipping_address.province,
        country: order.shipping_address.country,
        zip: order.shipping_address.zip,
      }
    : null;

  // Map Shopify fulfillment status to our order status
  let status: string = "pending";
  if (order.cancelled_at) {
    status = "cancelled";
  } else if (order.fulfillment_status === "fulfilled") {
    status = "delivered";
  } else if (order.fulfillment_status === "partial") {
    status = "shipped";
  } else if (order.financial_status === "paid") {
    status = "confirmed";
  }

  // Get tracking info from fulfillments
  const fulfillment = order.fulfillments?.[0];
  const trackingNumber = fulfillment?.tracking_number || null;
  const trackingUrl = fulfillment?.tracking_url || null;

  // Try to match customer email to a Clerk user via profiles table
  let userId: string | null = null;
  if (order.customer?.email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("clerk_user_id")
      .eq("email", order.customer.email)
      .single();

    userId = profile?.clerk_user_id ?? null;
  }

  const orderData = {
    shopify_order_id: String(order.id),
    shopify_order_number: String(order.order_number),
    user_id: userId,
    status,
    total: parseFloat(order.total_price),
    currency: order.currency,
    items,
    shipping_address: shippingAddress,
    tracking_number: trackingNumber,
    tracking_url: trackingUrl,
    updated_at: new Date().toISOString(),
  };

  // Upsert by shopify_order_id
  const { error } = await supabase
    .from("orders")
    .upsert(orderData, { onConflict: "shopify_order_id" });

  if (error) {
    console.error("[webhook] Supabase upsert error:", error);
    throw error;
  }

  console.log(`[webhook] Order #${order.order_number} synced (${status})`);
}

// Shopify webhook payload types (subset)
interface ShopifyOrderPayload {
  id: number;
  order_number: number;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  cancelled_at: string | null;
  customer: { email: string } | null;
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  } | null;
  line_items: {
    title: string;
    quantity: number;
    price: string;
    variant_id: number;
  }[];
  fulfillments?: {
    tracking_number: string | null;
    tracking_url: string | null;
  }[];
}
