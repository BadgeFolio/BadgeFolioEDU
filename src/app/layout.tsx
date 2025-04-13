import '@fontsource/inter/variable.css';
import { Inter } from 'next/font/google';
import './globals.css';
import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'BadgeFolio',
  description: 'A system for managing and awarding portfolio badges',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      }
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <ThemeProvider>
          <Providers>
            <div className="fixed bottom-4 right-4 z-50">
              <ThemeToggle />
            </div>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
} 