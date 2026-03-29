import { createClient } from "@supabase/supabase-js";

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  user_id: string;
  shopify_order_id: string;
  shopify_order_number: string;
  status: OrderStatus;
  total: number;
  currency: string;
  items: OrderItem[];
  shipping_address: ShippingAddress | null;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  title: string;
  quantity: number;
  price: number;
  variant_id: string;
}

export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
}

export interface UserProfile {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string | null;
  created_at: string;
}

// Client-side Supabase client (uses anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side Supabase client (uses service role key for admin operations)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
