import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Goldak Welding Thermal Simulator',
  description: 'Educational mechanical engineering simulation tool for studying transient heat transfer during welding using the Goldak Double-Ellipsoid Heat Source Model.',
  openGraph: {
    title: 'Goldak Welding Thermal Simulator',
    description: 'Educational mechanical engineering simulation tool for studying transient heat transfer during welding using the Goldak Double-Ellipsoid Heat Source Model.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Goldak Welding Thermal Simulator',
    description: 'Educational mechanical engineering simulation tool for studying transient heat transfer during welding using the Goldak Double-Ellipsoid Heat Source Model.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js" async></script>
      </head>
      <body className="w-screen h-screen overflow-hidden bg-slate-50 text-slate-900 antialiased font-sans flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

