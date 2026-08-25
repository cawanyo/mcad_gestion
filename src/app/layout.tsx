import type { Metadata } from 'next';
import './globals.css';
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server';
import ConvexClientProvider from '@/components/ConvexClientProvider';

export const metadata: Metadata = {
  title: 'MCAD - Plateforme de Gestion de Département',
  description: 'Gestion centralisée des membres, pôles, calendriers, affectations, checklists et validations de service.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="fr">
        <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
