import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import { PwaProvider } from '@/components/pwa/PwaProvider';

export const metadata: Metadata = {
  title: 'MCAD — Plateforme de Gestion',
  description: 'Gestion sobre et centralisée des membres, pôles, cultes, affectations et checklists.',
  applicationName: 'MCAD',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MCAD',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="fr" className="bg-white">
        <head>
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
          <meta name="mobile-web-app-capable" content="yes" />
        </head>
        <body className="bg-white text-zinc-900 antialiased min-h-screen selection:bg-blue-600 selection:text-white">
          <PwaProvider>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </PwaProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
