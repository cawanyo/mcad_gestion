import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server';

// Everything else — every (app)/* page (dashboard, calendar, poles, ...) —
// is protected. Route groups like (app) don't appear in the actual URL, so
// this is an allowlist of public paths rather than a match on "/(app)/*".
const isPublicRoute = createRouteMatcher(['/', '/landing', '/login', '/register']);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isPublicRoute(request)) return;

  if (!(await convexAuth.isAuthenticated())) {
    // Mirrors the existing client-side fallback in (app)/layout.tsx, which
    // sends anonymous visitors to the public landing page rather than
    // straight to /login — keeping one redirect target instead of two.
    return nextjsMiddlewareRedirect(request, '/landing');
  }
});

export const config = {
  // Excludes /api/* in general — those still run the old Postgres/cookie
  // auth in this transitional phase (see (app)/layout.tsx's comments) and
  // aren't part of Convex Auth's session at all — except the exact
  // `/api/auth` path, which Convex Auth's own client posts signIn/signOut
  // actions to (proxied straight through by convexAuthNextjsMiddleware
  // before this file's handler ever runs, so it doesn't collide with our
  // existing /api/auth/login, /api/auth/register, etc. routes — none of
  // those live at the bare /api/auth path itself).
  matcher: ['/((?!api|_next|.*\\..*).*)', '/', '/api/auth'],
};
