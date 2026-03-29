import { notFound } from "next/navigation";
import Image from "next/image";
import { products, getProduct } from "@/lib/products";
import { AddToCartButton } from "./AddToCartButton";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const product = getProduct(params.slug);
  if (!product) return { title: "not found — sudo.supply" };
  return { title: `${product.name} — sudo.supply` };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProduct(params.slug);
  if (!product) notFound();

  return (
    <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
      <p className="text-text-muted text-sm mb-8 animate-fade-in">
        ~/shop/{product.slug}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-fade-in-delay">
        {/* Image */}
        <div className="relative aspect-square bg-bg-secondary border border-border overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-8 rounded-lg"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <h1 className="font-pixel text-lg sm:text-xl mb-4">{product.name}</h1>

          <div className="flex items-center gap-4 mb-6">
            <span className="text-2xl font-mono tabular-nums">
              ${product.price.toFixed(2)}
            </span>
            <span className="text-xs">
              {product.inStock ? (
                <span className="text-accent">&#9679; IN STOCK</span>
              ) : (
                <span className="text-text-muted">&#9675; OUT OF STOCK</span>
              )}
            </span>
          </div>

          <p className="text-text-muted text-sm leading-relaxed mb-8">
            {product.longDescription}
          </p>

          {/* Specs */}
          <div className="border border-border mb-8">
            <div className="px-4 py-2 border-b border-border text-text-muted text-xs uppercase tracking-wider">
              specifications
            </div>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(product.specs).map(([key, value]) => (
                  <tr key={key} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text-muted whitespace-nowrap">
                      {key.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add to cart */}
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
