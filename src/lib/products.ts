export interface Product {
  slug: string;
  name: string;
  price: number;
  description: string;
  longDescription: string;
  inStock: boolean;
  image: string;
  specs: Record<string, string>;
}

export const products: Product[] = [
  {
    slug: "sudo-macro-pad-v1",
    name: "sudo macro pad v1",
    price: 29.0,
    description:
      "4-button MX hot-swap macro pad. Approve AI agent actions across Claude, ChatGPT, and Grok.",
    longDescription:
      "The sudo macro pad v1 is a 4-button mechanical macro pad designed for developers who work with AI agents daily. Each key is MX hot-swap compatible, so you can use your favorite switches. Map the four keys to approve, reject, continue, or cancel — and take physical control of your AI workflow. Open-source hardware and firmware.",
    inStock: true,
    image: "/images/macro-pad-placeholder.svg",
    specs: {
      keys: "4× MX hot-swap",
      interface: "USB-C",
      firmware: "QMK / VIA",
      case: "matte black aluminum",
      pcb: "open-source (KiCad)",
      dimensions: "68 × 68 × 22 mm",
      weight: "~120g",
      compatibility: "Windows / macOS / Linux",
    },
  },
  {
    slug: "sudo-keycaps",
    name: "sudo keycaps",
    price: 12.0,
    description: "Custom PBT keycaps for the sudo macro pad. Terminal-inspired legends.",
    longDescription:
      "A set of custom PBT dye-sub keycaps designed for the sudo macro pad. Each cap features terminal-inspired legends: [Y], [N], [→], [×]. Cherry-profile, compatible with any MX-style switch.",
    inStock: false,
    image: "/images/keycaps-placeholder.svg",
    specs: {
      material: "PBT",
      legends: "dye-sublimated",
      profile: "Cherry",
      compatibility: "MX-style switches",
      set_contents: "4 keycaps",
    },
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
