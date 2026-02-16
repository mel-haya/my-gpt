import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Protect admin routes - check if user is authenticated first
  if (isAdminRoute(req)) {
    if (!userId) {
      const url = new URL("/access-denied", req.url);
      url.searchParams.set("reason", "not_signed_in");
      url.searchParams.set("redirectTo", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // For admin routes, we'll do the DB role check in the page/layout
    // Middleware can't access the database directly in Edge runtime
    // The actual admin check happens in the admin layout
  }

  // Protect dashboard routes
  if (isDashboardRoute(req)) {
    if (!userId) {
      const url = new URL("/access-denied", req.url);
      url.searchParams.set("reason", "not_signed_in");
      url.searchParams.set("redirectTo", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }
});
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
