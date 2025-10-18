import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

export default async function middleware(req: NextRequest) {
  // Mirror previous authorized() logic using Better Auth session
  const url = req.nextUrl;
  const isApiAuthRoute = url.pathname.startsWith('/api/auth');
  if (isApiAuthRoute) return;

  const isMetadataRoute =
    url.pathname === '/sitemap.xml' ||
    url.pathname === '/robots.txt' ||
    url.pathname === '/manifest.webmanifest';
  if (isMetadataRoute) return;

  const isTrpcApi = url.pathname.startsWith('/api/trpc');
  if (isTrpcApi) return;

  const isChatApiRoute = url.pathname === '/api/chat';
  if (isChatApiRoute) return;

  const session = await auth.api.getSession({ headers: req.headers });
  const isLoggedIn = !!session?.user;

  const isOnChat = url.pathname.startsWith('/');
  const isOnModels = url.pathname.startsWith('/models');
  const isOnCompare = url.pathname.startsWith('/compare');
  const isOnLoginPage = url.pathname.startsWith('/login');
  const isOnRegisterPage = url.pathname.startsWith('/register');
  const isOnSharePage = url.pathname.startsWith('/share/');

  if (isLoggedIn && (isOnLoginPage || isOnRegisterPage)) {
    return NextResponse.redirect(new URL('/', url));
  }
  if (isOnRegisterPage || isOnLoginPage) return;
  if (isOnSharePage) return;
  if (isOnModels || isOnCompare) return;

  if (isOnChat) {
    if (url.pathname === '/') return;
    if (isLoggedIn) return;
    return NextResponse.redirect(new URL('/login', url));
  }

  if (isLoggedIn) {
    return NextResponse.redirect(new URL('/', url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, opengraph-image (favicon and og image)
     * - manifest files (.json, .webmanifest)
     * - Images and other static assets (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     * - models
     * - compare
     */
    '/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|manifest|models|compare|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest)$).*)',
  ],
};
