"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

function dotFill(label: string, amount: string, width: number = 50) {
  const contentLen = label.length + amount.length;
  const dots = Math.max(2, width - contentLen);
  return `${label} ${"·".repeat(dots)} ${amount}`;
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice } = useCart();

  return (
    <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
      <p className="text-text-muted text-sm mb-8 animate-fade-in">~/cart</p>

      <div className="font-mono text-sm animate-fade-in-delay">
        <p className="text-accent mb-4">cart@sudo.supply ~&gt;</p>

        {items.length === 0 ? (
          <div className="text-text-muted py-8">
            <p className="mb-4">cart is empty.</p>
            <Link href="/shop" className="btn-terminal text-xs">
              [ browse products ]
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {items.map((item, i) => (
                <div key={item.product.slug} className="flex items-center gap-4">
                  <span className="text-text-muted flex-shrink-0">
                    item_{i + 1}:
                  </span>
                  <span className="flex-1 overflow-hidden">
                    <span className="whitespace-pre">
                      {dotFill(
                        `${item.product.name} × ${item.quantity}`,
                        `$${(item.product.price * item.quantity).toFixed(2)}`
                      )}
                    </span>
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        updateQuantity(item.product.slug, item.quantity - 1)
                      }
                      className="text-text-muted hover:text-accent text-xs"
                    >
                      [-]
                    </button>
                    <button
                      onClick={() =>
                        updateQuantity(item.product.slug, item.quantity + 1)
                      }
                      className="text-text-muted hover:text-accent text-xs"
                    >
                      [+]
                    </button>
                    <button
                      onClick={() => removeItem(item.product.slug)}
                      className="text-text-muted hover:text-error text-xs"
                    >
                      [×]
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border my-4" />

            <div className="whitespace-pre text-base mb-8">
              {dotFill("total:", `$${totalPrice.toFixed(2)}`)}
            </div>

            <button className="btn-terminal-accent w-full text-center">
              [ CHECKOUT ]
            </button>
          </>
        )}
      </div>
    </div>
  );
}
