import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const isClerkConfigured = clerkKey.startsWith("pk_") && !clerkKey.includes("placeholder");

export default async function middleware(req: NextRequest) {
  // Skip Clerk middleware if not configured
  if (!isClerkConfigured) {
    return NextResponse.next();
  }

  // Dynamically import Clerk middleware only when configured
  const { clerkMiddleware, createRouteMatcher } = await import(
    "@clerk/nextjs/server"
  );
  const isProtectedRoute = createRouteMatcher(["/account(.*)"]);

  return clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) {
      await auth.protect();
    }
  })(req, {} as never);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
