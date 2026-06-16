import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

// Figtree — a clean geometric sans, the closest freely-licensed match to
// Google Sans. Used for both body and headings.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "My Tasks",
  description: "A clean, high-performance to-do list app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My Tasks",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} h-full antialiased`}
    >
      {/* Inline script prevents dark-mode flash before React hydrates */}
      <head>
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var s = localStorage.getItem('todo-dark-mode');
            var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (s === 'true' || (s === null && sys)) document.documentElement.classList.add('dark');
          } catch(e) {}
        `}} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
