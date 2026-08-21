import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MCAD - Plateforme de Gestion de Département',
  description: 'Gestion centralisée des membres, pôles, calendriers, affectations, checklists et validations de service.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
