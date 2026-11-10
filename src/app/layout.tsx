import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Editorial serif for headings gives Borrowly a warm, local character; Inter keeps the UI legible.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["SOFT", "opsz"] });

export const metadata: Metadata = {
  title: { default: "Borrowly — Own less. Access more.", template: "%s · Borrowly" },
  description: "Rent or buy pre-owned items from verified individuals and small businesses in Coimbatore.",
  icons: { icon: "/images/branding/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#B5482A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-center" toastOptions={{ classNames: { toast: "!rounded-xl !border-line !font-sans" } }} />
      </body>
    </html>
  );
}
