import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const publicPaths = ["/login", "/api/auth/login", "/api/auth/verify"];
  
  // Check if the path is public
  const isPublicPath = publicPaths.some((publicPath) =>
    path.startsWith(publicPath)
  );

  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check for authentication token in cookies
  const token = request.cookies.get("auth_token")?.value;

  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token exists, allow the request
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)",
  ],
};
