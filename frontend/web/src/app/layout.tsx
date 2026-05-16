import type { Metadata } from 'next';
import { QueryProvider } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sillage Bleu — Blue Economy Verification',
  description: 'Marine sustainability and fisheries verification on Stellar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
