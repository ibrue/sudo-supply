"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export function Nav() {
  const { totalItems } = useCart();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-pixel text-sm text-accent hover-accent">
          [sudo]
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/shop" className="hover-accent text-text-muted hover:text-text transition-colors">
            ~/shop
          </Link>
          <Link href="/about" className="hover-accent text-text-muted hover:text-text transition-colors">
            ~/about
          </Link>
          <Link href="/cart" className="hover-accent text-text-muted hover:text-text transition-colors">
            ~/cart{totalItems > 0 && <span className="text-accent ml-1">[{totalItems}]</span>}
          </Link>
        </div>
      </div>
    </nav>
  );
}
