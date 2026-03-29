"use client";

import { useEffect, useState } from "react";
import { supabase, type Order } from "@/lib/supabase";

interface OrderHistoryProps {
  userId: string;
}

const statusColors: Record<string, string> = {
  pending: "text-text-muted",
  confirmed: "text-accent",
  shipped: "text-accent",
  delivered: "text-accent",
  cancelled: "text-error",
};

export function OrderHistory({ userId }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch orders:", error);
      } else {
        setOrders(data ?? []);
      }
      setLoading(false);
    }
    fetchOrders();
  }, [userId]);

  if (loading) {
    return (
      <section>
        <h2 className="font-pixel text-xs text-accent mb-4">&gt; orders</h2>
        <p className="text-text-muted text-sm">Loading...</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-pixel text-xs text-accent mb-4">&gt; orders</h2>

      {orders.length === 0 ? (
        <div className="border border-border p-6 text-center">
          <p className="text-text-muted text-sm mb-4">No orders yet.</p>
          <a href="/shop" className="btn-terminal text-xs">
            [ browse products ]
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <span className="text-text-muted text-xs">
                    #{order.shopify_order_number}
                  </span>
                  <span className={`text-xs uppercase ${statusColors[order.status] ?? "text-text-muted"}`}>
                    {order.status === "delivered" || order.status === "shipped"
                      ? `● ${order.status}`
                      : `○ ${order.status}`}
                  </span>
                </div>
                <span className="font-mono text-sm tabular-nums">
                  ${order.total.toFixed(2)} {order.currency}
                </span>
              </div>

              <div className="text-xs text-text-muted space-y-1">
                {order.items.map((item, i) => (
                  <p key={i}>
                    {item.title} × {item.quantity}
                  </p>
                ))}
              </div>

              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent text-xs hover-accent mt-2 inline-block"
                >
                  track shipment →
                </a>
              )}

              <p className="text-xs text-text-muted mt-2">
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
