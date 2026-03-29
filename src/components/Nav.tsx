"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";

// Dynamically import Clerk hooks — they throw if ClerkProvider is missing
let useAuthHook: (() => { isSignedIn: boolean | undefined }) | null = null;
let UserButtonComponent: React.ComponentType<{ appearance?: unknown }> | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clerk = require("@clerk/nextjs");
  useAuthHook = clerk.useAuth;
  UserButtonComponent = clerk.UserButton;
} catch {
  // Clerk not available
}

// Wrapper that always calls the hook (satisfies rules-of-hooks)
// but returns a safe default when Clerk isn't available
const noopAuth = () => ({ isSignedIn: undefined as boolean | undefined });
const useAuthSafe = useAuthHook ?? noopAuth;

export function Nav() {
  const { totalItems } = useCart();
  const { isSignedIn } = useAuthSafe();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="hover-accent flex items-center">
          <Image
            src="/images/logo.svg"
            alt="[sudo]"
            width={100}
            height={22}
            className="invert"
            priority
          />
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/shop" className="hover-accent text-text-muted hover:text-text transition-colors">
            ~/shop
          </Link>
          <Link href="/download" className="hover-accent text-text-muted hover:text-text transition-colors">
            ~/app
          </Link>
          <Link href="/about" className="hover-accent text-text-muted hover:text-text transition-colors">
            ~/about
          </Link>
          <Link href="/cart" className="hover-accent text-text-muted hover:text-text transition-colors">
            ~/cart{totalItems > 0 && <span className="text-accent ml-1">[{totalItems}]</span>}
          </Link>

          {isSignedIn === true ? (
            <>
              <Link href="/account" className="hover-accent text-text-muted hover:text-text transition-colors">
                ~/account
              </Link>
              {UserButtonComponent && (
                <UserButtonComponent
                  appearance={{
                    elements: {
                      avatarBox: "w-7 h-7 border border-[#1e1e1e]",
                    },
                  }}
                />
              )}
            </>
          ) : isSignedIn === false ? (
            <Link href="/sign-in" className="hover-accent text-accent transition-colors">
              [ login ]
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
