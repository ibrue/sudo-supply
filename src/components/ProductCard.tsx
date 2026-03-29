import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="block border border-border p-4 hover:border-accent transition-colors group"
    >
      <div className="relative aspect-square bg-bg-secondary mb-4 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-6 rounded-lg"
        />
      </div>
      <h3 className="font-pixel text-xs mb-2 group-hover:text-accent transition-colors">
        {product.name}
      </h3>
      <div className="flex items-center justify-between">
        <span className="text-xs">
          {product.inStock ? (
            <span className="text-accent">&#9679; IN STOCK</span>
          ) : (
            <span className="text-text-muted">&#9675; OUT OF STOCK</span>
          )}
        </span>
        <span className="font-mono text-sm text-text tabular-nums">
          ${product.price.toFixed(2)}
        </span>
      </div>
    </Link>
  );
}
