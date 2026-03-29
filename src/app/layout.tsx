import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const mono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
});

const pixel = localFont({
  src: "./fonts/Silkscreen-Regular.woff",
  variable: "--font-pixel",
  weight: "400",
});

export const metadata: Metadata = {
  title: "sudo.supply — macro pads for the terminal-minded",
  description:
    "Mechanical keyboard macro pads. Approve AI agent actions across Claude, ChatGPT, and Grok.",
};

const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#00ff41",
    colorBackground: "#0a0a0a",
    colorInputBackground: "#111111",
    colorInputText: "#f0f0f0",
    borderRadius: "0px",
    fontFamily: "var(--font-mono), monospace",
  },
  elements: {
    card: "border border-[#1e1e1e] shadow-none",
    formButtonPrimary:
      "bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#0a0a0a] uppercase tracking-wider rounded-none",
    footerActionLink: "text-[#00ff41] hover:text-[#00ff41]",
    headerTitle: "font-mono",
    headerSubtitle: "text-[#666666]",
    socialButtonsBlockButton: "border-[#1e1e1e] rounded-none",
    formFieldInput: "border-[#1e1e1e] rounded-none bg-[#111111]",
  },
};

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const isClerkConfigured = clerkKey.startsWith("pk_") && !clerkKey.includes("placeholder");

function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured) return <>{children}</>;
  return <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="en">
        <body className={`${mono.variable} ${pixel.variable} font-mono antialiased`}>
          <CartProvider>
            <Nav />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </CartProvider>
        </body>
      </html>
    </AuthProvider>
  );
}
