import Link from "next/link";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="scanline-overlay" />
        <div className="relative z-20 text-center animate-scanline-in">
          <h1 className="font-pixel text-4xl sm:text-6xl md:text-7xl text-accent mb-6">
            [sudo]<span className="animate-blink">&#9608;</span>
          </h1>
          <p className="font-mono text-text-muted text-sm sm:text-base tracking-wider">
            approve. reject. repeat.
          </p>
          <div className="mt-12">
            <Link href="/shop" className="btn-terminal">
              [ browse products ]
            </Link>
          </div>
        </div>
      </section>

      {/* Products preview */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-text-muted text-sm mb-8 animate-fade-in">
          &gt; products
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-delay">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
    </>
  );
}
