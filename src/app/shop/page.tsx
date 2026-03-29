import { products } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

export const metadata = {
  title: "shop — sudo.supply",
};

export default function ShopPage() {
  return (
    <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
      <h1 className="text-text-muted text-sm mb-8 animate-fade-in">~/shop</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-delay">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </div>
  );
}
