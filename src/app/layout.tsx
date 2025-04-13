import { Poppins } from 'next/font/google';
import './globals.css';
import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import { ThemeToggle } from '@/components/ThemeToggle';
import Script from 'next/script';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
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
    <html lang="en" className={`${poppins.variable} font-sans antialiased`} suppressHydrationWarning>
      <Script id="theme-checker" strategy="beforeInteractive">
        {`
          try {
            const isDarkMode = localStorage.getItem('theme') === 'dark';
            console.log("Theme script running, dark mode:", isDarkMode);
            if (isDarkMode) {
              document.documentElement.classList.add('dark');
              document.documentElement.style.backgroundColor = '#59192b';
              document.body.style.backgroundColor = '#59192b';
              document.body.style.color = 'white';
            } else {
              document.documentElement.classList.remove('dark');
              document.documentElement.style.backgroundColor = '';
              document.body.style.backgroundColor = '';
              document.body.style.color = '';
            }
          } catch (e) {
            console.error("Error setting dark mode:", e);
          }
        `}
      </Script>
      <body className="bg-white dark:bg-[#59192b] text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Providers>
          <div className="fixed bottom-4 right-4 z-50">
            <ThemeToggle />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
} 