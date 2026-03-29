import type { Metadata } from "next";
import localFont from "next/font/local";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${mono.variable} ${pixel.variable} font-mono antialiased`}>
        <CartProvider>
          <Nav />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
