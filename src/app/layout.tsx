import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap", weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Borrowly — Own less. Access more.", template: "%s · Borrowly" },
  description: "Rent or buy pre-owned items from verified individuals and small businesses in Coimbatore.",
  icons: { icon: "/images/branding/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#245C46", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-center" toastOptions={{ classNames: { toast: "!rounded-xl !border-line !font-sans" } }} />
      </body>
    </html>
  );
}
