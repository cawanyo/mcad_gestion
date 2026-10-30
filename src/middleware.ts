import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server';

const isPublicRoute = createRouteMatcher(['/login', '/register', '/equipment(.*)']);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isAuth = await convexAuth.isAuthenticated();
  const url = new URL(request.url);

  // Redirection immédiate pour la racine / et l'ancienne /landing :
  // soit /dashboard si connecté, soit /login si non connecté
  if (url.pathname === '/' || url.pathname === '/landing') {
    if (isAuth) {
      return nextjsMiddlewareRedirect(request, '/dashboard');
    } else {
      return nextjsMiddlewareRedirect(request, '/login');
    }
  }

  // Si l'utilisateur est déjà connecté et tente d'aller sur login ou register
  if (isAuth && (url.pathname === '/login' || url.pathname === '/register')) {
    return nextjsMiddlewareRedirect(request, '/dashboard');
  }

  // Les routes publiques (/login, /register, /equipment) restent accessibles
  if (isPublicRoute(request)) return;

  // Toute autre route protégée redirige vers /login si non authentifié
  if (!isAuth) {
    return nextjsMiddlewareRedirect(request, '/login');
  }
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)', '/', '/api/auth'],
};
